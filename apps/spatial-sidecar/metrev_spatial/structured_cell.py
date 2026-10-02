"""Restricted steady FV cell, shared by 2D/3D. See STRUCTURED_CELL.md.

Concentrations and liquid/solid potentials are solved simultaneously. A damped
sparse Newton solve retains nonconverged fields; solver termination alone
never establishes numerical closure. Face flux is evaluated once and added with
opposite signs to neighbors. Supporting electrolyte is a declared approximation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import sys

import numpy as np
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve, MatrixRankWarning
from types import SimpleNamespace
import warnings

F = 96485.33212
R = 8.31446261815324
SOLVER_VERSION = "structured-cell-fv-v1"
PROCESS_PROTOCOL_VERSION = "structured-cell-process-v3"


def number(v, unit, lower=None, strict=False):
    if not isinstance(v, dict) or not {'value','unit','source_kind','source_ref'} <= v.keys():
        raise ValueError('Scientific values require units and provenance')
    if v.keys() - {'value','unit','source_kind','source_ref','source_locator','conditions','uncertainty','uncertainty_unit'}:
        raise ValueError('Unknown scientific value property')
    x = v['value']
    if isinstance(x,bool) or not isinstance(x,(int,float)) or not math.isfinite(x) or v['unit'] != unit:
        raise ValueError(f'Expected a finite {unit} value')
    if v['source_kind'] not in ['measured','literature','default','assumption','test_fixture'] or not isinstance(v['source_ref'],str) or not v['source_ref'].strip():
        raise ValueError('Missing scientific provenance')
    if ('uncertainty' in v) != ('uncertainty_unit' in v) or ('uncertainty' in v and (v['uncertainty_unit']!=unit or not math.isfinite(v['uncertainty']) or v['uncertainty']<0)):
        raise ValueError('Invalid uncertainty')
    if lower is not None and (x < lower or (strict and x == lower)):
        raise ValueError('Scientific value outside supported range')
    return float(x)


def validate(inp):
    required = {'contract_version','model_id','system','dimension','coordinate_system','charge_model','geometry','temperature','reservoir_faces','species','reactions','electrodes','circuit','numerics'}
    if not isinstance(inp,dict) or set(inp) - {'case_context'} != required:
        raise ValueError('Invalid cell input properties')
    if (inp['contract_version']!='spatial-cell-input-v1' or inp['model_id']!='structured-cell-supporting-electrolyte-v1' or inp['dimension'] not in [2,3] or inp['coordinate_system']!='cartesian' or inp['charge_model']!='fixed-conductivity-supporting-electrolyte'):
        raise ValueError('Unsupported cell profile or fidelity')
    g=inp['geometry']; d=inp['dimension']; layers=g['layers']; species=inp['species']
    if 'case_context' in inp:
        context=inp['case_context']
        expected={'version','case_id','evaluation_id','normalized_case_sha256','mapping_policy','component_domains','architecture_family','input_role','decision_eligible'}
        if not isinstance(context,dict) or set(context)!=expected or context['version']!='structured-cell-case-context-v1' or context['mapping_policy']!='explicit_layer_to_case_stack_block_v1' or context['input_role']!='source_traced_case_development_input' or context['decision_eligible'] is not False:
            raise ValueError('Invalid case context')
        if any(not isinstance(context[key],str) or not context[key].strip() for key in ['case_id','evaluation_id','architecture_family']) or not isinstance(context['normalized_case_sha256'],str) or not re.fullmatch(r'[a-f0-9]{64}',context['normalized_case_sha256']):
            raise ValueError('Invalid case identity')
        blocks={'bulk_liquid':'reactor_architecture','anode':'anode_biofilm_support','biofilm':'anode_biofilm_support','membrane':'membrane_or_separator','separator':'membrane_or_separator','cathode':'cathode_catalyst_support'}
        maps=context['component_domains']
        if not isinstance(maps,list) or len(maps)!=len(layers) or any(not isinstance(m,dict) or set(m)!={'domain_tag','stack_block'} for m in maps) or len(set(m['domain_tag'] for m in maps))!=len(layers) or any(not any(m['domain_tag']==l['tag'] and m['stack_block']==blocks.get(l['kind']) for m in maps) for l in layers):
            raise ValueError('Case layer mapping mismatch')
    if g['geometry_version']!='structured-layers-v1' or len(g['lengths_m'])!=d or len(g['transverse_cells'])!=d-1:
        raise ValueError('Geometry rank mismatch')
    if set(g) != {'geometry_version','lengths_m','transverse_cells','layers'} | ({'out_of_plane_depth'} if d==2 else set()):
        raise ValueError('2D requires explicit depth; invalid geometry properties')
    lengths=[number(v,'m',0,True) for v in g['lengths_m']]
    if d==2: number(g['out_of_plane_depth'],'m',0,True)
    number(inp['temperature'],'K',0,True)
    if not 3<=len(layers)<=16 or not 1<=len(species)<=12:
        raise ValueError('Unsupported region/species count')
    ids=[s['id'] for s in species]; tags=[l['tag'] for l in layers]
    if any(not isinstance(key,str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,63}',key) for key in ids+tags): raise ValueError('Invalid identity')
    if len(set(ids))!=len(ids) or len(set(tags))!=len(tags): raise ValueError('Duplicate identity')
    for s in species:
        if set(s)!={'id','valence','elements','initial_concentration','reservoir_concentration','reference_concentration'}: raise ValueError('Invalid species properties')
        if not number(s['valence'],'1').is_integer(): raise ValueError('Valence must be integer')
        if not s['elements'] or any(not re.fullmatch(r'[A-Z][a-z]?',key) for key in s['elements']): raise ValueError('Invalid element identity')
        for atom in s['elements'].values():
            if not number(atom,'1',0).is_integer(): raise ValueError('Element count must be integer')
        number(s['initial_concentration'],'mol/m3',0); number(s['reservoir_concentration'],'mol/m3',0); number(s['reference_concentration'],'mol/m3',0,True)
    for l in layers:
        if set(l)!={'tag','kind','width_m','cells','electrolyte_conductivity','solid_conductivity','diffusivity'}: raise ValueError('Invalid region properties')
        if l['kind'] not in ['bulk_liquid','anode','biofilm','membrane','separator','cathode']: raise ValueError('Unsupported region kind')
        number(l['width_m'],'m',0,True); number(l['electrolyte_conductivity'],'S/m',0,True)
        sigma=number(l['solid_conductivity'],'S/m',0)
        if (l['kind'] in ['anode','cathode']) != (sigma>0): raise ValueError('Unsupported solid topology')
        if set(l['diffusivity'])!=set(ids): raise ValueError('Every region requires all diffusivities')
        for diffusivity in l['diffusivity'].values(): number(diffusivity,'m2/s',0,True)
        if type(l['cells']) is not int or not 1<=l['cells']<=128: raise ValueError('Invalid x cell count')
    if any(type(n) is not int or not 1<=n<=64 for n in g['transverse_cells']): raise ValueError('Invalid transverse cell count')
    if abs(sum(number(l['width_m'],'m') for l in layers)-lengths[0])>1e-12*lengths[0]: raise ValueError('Layer width mismatch')
    if layers[0]['kind']!='anode' or layers[-1]['kind']!='cathode' or any(l['kind'] in ['anode','cathode'] for l in layers[1:-1]): raise ValueError('Invalid electrode layout')
    n=sum(l['cells'] for l in layers)*math.prod(g['transverse_cells'])
    if n*(len(species)+2)+1>20000: raise ValueError('Development state limit exceeded')
    faces=inp['reservoir_faces']
    if not faces or len(set(faces))!=len(faces) or any(f not in (['y_min','y_max']+(['z_min','z_max'] if d==3 else [])) for f in faces): raise ValueError('Invalid reservoir faces')
    by_id={s['id']:s for s in species}
    def stoichiometry(nu,electrons):
        if len(nu)<2 or not any(v['value']<0 for v in nu.values()) or not any(v['value']>0 for v in nu.values()): raise ValueError('Reaction needs reactants and products')
        atoms={}; charge=0
        for key,v in nu.items():
            if key not in by_id: raise ValueError('Unknown reaction species')
            k=number(v,'1'); s=by_id[key]; charge+=k*number(s['valence'],'1')
            for atom,count in s['elements'].items(): atoms[atom]=atoms.get(atom,0)+k*number(count,'1')
        if any(abs(x)>1e-10 for x in atoms.values()) or abs(charge-electrons)>1e-10: raise ValueError('Reaction violates element/charge conservation')
    if len(inp['electrodes'])!=2: raise ValueError('Two electrodes required')
    for e,l,role in zip(inp['electrodes'],[layers[0],layers[-1]],['anode','cathode']):
        if set(e)!={'role','domain_tag','electron_count','equilibrium_potential','exchange_current','alpha','stoichiometry','forward_orders','reverse_orders'}: raise ValueError('Invalid electrode properties')
        if e['role']!=role or e['domain_tag']!=l['tag']: raise ValueError('Electrode identity mismatch')
        ne=number(e['electron_count'],'1',0,True)
        if not ne.is_integer(): raise ValueError('Electron count must be integer')
        stoichiometry(e['stoichiometry'],ne)
        number(e['equilibrium_potential'],'V'); number(e['exchange_current'],'A/m3',0,True)
        if number(e['alpha'],'1',0,True)>=1: raise ValueError('Invalid transfer coefficient')
        for order in [e['forward_orders'],e['reverse_orders']]:
            for key,v in order.items():
                if key not in ids: raise ValueError('Unknown kinetic species')
                if not number(v,'1',0).is_integer(): raise ValueError('Kinetic orders must be nonnegative integers')
    if len(inp['reactions'])>32 or len(set(r['id'] for r in inp['reactions']))!=len(inp['reactions']): raise ValueError('Invalid reaction IDs')
    for r in inp['reactions']:
        if set(r)!={'id','domain_tag','equation_ref','stoichiometry','law'} or r['domain_tag'] not in tags or not r['equation_ref'].strip(): raise ValueError('Invalid reaction properties')
        stoichiometry(r['stoichiometry'],0); law=r['law']; number(law['rate'],'mol/(m3*s)',0)
        if law['kind']=='monod':
            if set(law)!={'kind','rate','substrate','half_saturation'} or law['substrate'] not in ids or r['stoichiometry'].get(law['substrate'],{}).get('value',0)>=0: raise ValueError('Invalid Monod substrate')
            number(law['half_saturation'],'mol/m3',0,True)
        elif law['kind']=='mass_action':
            if set(law)!={'kind','rate','orders'}: raise ValueError('Invalid rate law')
            for key,v in law['orders'].items():
                if key not in ids: raise ValueError('Unknown kinetic species')
                if not number(v,'1',0).is_integer(): raise ValueError('Kinetic orders must be nonnegative integers')
        else: raise ValueError('Unsupported reaction law')
    c=inp['circuit']
    if inp['system']=='MFC' and set(c)=={'kind','resistance'} and c['kind']=='external_load': number(c['resistance'],'ohm',0,True)
    elif inp['system']=='MEC' and set(c)=={'kind','voltage'} and c['kind']=='applied_voltage': number(c['voltage'],'V',0,True)
    else: raise ValueError('Circuit/system mismatch')
    num=inp['numerics']
    if set(num)!={'max_evaluations','nonlinear_tolerance','conservation_tolerance','concentration_scale','potential_scale','species_rate_scale','charge_rate_scale'}: raise ValueError('Invalid numerics')
    if type(num['max_evaluations']) is not int or not 1<=num['max_evaluations']<=10000: raise ValueError('Invalid evaluation limit')
    for key in ['nonlinear_tolerance','conservation_tolerance']:
        if isinstance(num[key],bool) or not math.isfinite(num[key]) or not 0<num[key]<=1e-3: raise ValueError('Invalid tolerance')
    for key,unit in [('concentration_scale','mol/m3'),('potential_scale','V'),('species_rate_scale','mol/(m3*s)'),('charge_rate_scale','A/m3')]: number(num[key],unit,0,True)
    return inp


def topology(inp):
    g=inp['geometry']; dim=inp['dimension']; widths=[]; domains=[]
    for region,l in enumerate(g['layers']):
        widths += [l['width_m']['value']/l['cells']]*l['cells']; domains += [region]*l['cells']
    lengths=[v['value'] for v in g['lengths_m']]
    shape=[len(widths)]+g['transverse_cells']; n=math.prod(shape)
    coordinates=list(np.ndindex(tuple(shape))); indices={c:i for i,c in enumerate(coordinates)}
    edges_x=np.concatenate(([0.0],np.cumsum(widths)))
    centers=[]; sizes=[]; regions=[]
    for c in coordinates:
        size=[widths[c[0]]]+[lengths[a]/shape[a] for a in range(1,dim)]
        center=[(edges_x[c[0]]+edges_x[c[0]+1])/2]+[(c[a]+.5)*size[a] for a in range(1,dim)]
        centers.append(center); sizes.append(size); regions.append(domains[c[0]])
    sizes=np.array(sizes); depth=g['out_of_plane_depth']['value'] if dim==2 else 1.
    volumes=np.prod(sizes,axis=1)*depth; faces=[]; boundary=[]
    for i,c in enumerate(coordinates):
        for axis in range(dim):
            area=volumes[i]/sizes[i,axis]
            if c[axis]<shape[axis]-1:
                other=list(c); other[axis]+=1; j=indices[tuple(other)]
                faces.append((i,j,axis,area,sizes[i,axis]/2,sizes[j,axis]/2))
            for sign in [-1,1]:
                if c[axis]==(0 if sign<0 else shape[axis]-1): boundary.append((i,axis,sign,area,sizes[i,axis]/2))
    return {'shape':shape,'centers':np.array(centers),'sizes':sizes,'regions':np.array(regions),'volumes':volumes,'faces':faces,'boundary':boundary,'count':n}


def derive_field_extrema(fields, mesh, layers):
    """Return deterministic modeled extrema bound to global finite-volume cells."""
    centers = np.asarray(mesh['centers_m'], dtype=float)
    sizes = np.asarray(mesh['sizes_m'], dtype=float)
    regions = np.asarray(mesh['region_index'], dtype=int)
    if centers.ndim != 2 or sizes.shape != centers.shape or regions.shape != (len(centers),):
        raise ValueError('Invalid mesh for derived field extrema')
    layer_tags = [layer['tag'] for layer in layers]
    if np.any(regions < 0) or np.any(regions >= len(layer_tags)):
        raise ValueError('Invalid mesh region for derived field extrema')

    output = []
    for field in fields:
        values = np.asarray(field['values'], dtype=float)
        cells = np.asarray(field['cells'], dtype=int)
        if values.ndim != 1 or cells.shape != values.shape or len(values) == 0:
            raise ValueError('Invalid field samples for derived extrema')
        if not np.all(np.isfinite(values)) or np.any(cells < 0) or np.any(cells >= len(centers)):
            raise ValueError('Field samples exceed the declared mesh')
        if len(set(cells.tolist())) != len(cells):
            raise ValueError('Field cells must be unique')

        extrema = {}
        for statistic, sign in (('minimum', 1), ('maximum', -1)):
            sample_index = min(
                range(len(values)),
                key=lambda index: (sign * values[index], cells[index]),
            )
            cell_index = int(cells[sample_index])
            region_index = int(regions[cell_index])
            extrema[statistic] = {
                'value': float(values[sample_index]),
                'unit': field['unit'],
                'cell_index': cell_index,
                'cell_center_m': centers[cell_index].tolist(),
                'cell_size_m': sizes[cell_index].tolist(),
                'region_index': region_index,
                'domain_tag': layer_tags[region_index],
            }
        output.append({
            'field_id': field['id'],
            'unit': field['unit'],
            'minimum': extrema['minimum'],
            'maximum': extrema['maximum'],
        })
    return output


def bernoulli(x):
    # Stable exponential fitting, without limiting potentials or clipping states.
    x=np.asarray(x,dtype=float); result=np.empty_like(x); small=np.abs(x)<1e-5; high=x>50; low=x<-50
    result[small]=1-x[small]/2+x[small]**2/12
    result[high]=x[high]*np.exp(-x[high]); result[low]=-x[low]
    middle=~(small|high|low); result[middle]=x[middle]/np.expm1(x[middle])
    return result


def bernoulli_derivative(x):
    x=np.asarray(x,dtype=float); result=np.empty_like(x); small=np.abs(x)<1e-5; high=x>50; low=x<-50
    result[small]=-.5+x[small]/6-x[small]**3/180
    result[high]=(1-x[high])*np.exp(-x[high]); result[low]=-1
    mid=~(small|high|low); den=np.expm1(x[mid]); result[mid]=(den-x[mid]*np.exp(x[mid]))/den**2
    return result


class Cell:
    def __init__(self, inp):
        self.input=validate(inp); self.mesh=topology(inp); m=self.mesh; self.n=m['count']; self.ns=len(inp['species'])
        self.active=np.flatnonzero(np.isin(m['regions'],[0,len(inp['geometry']['layers'])-1])); self.solid_index={int(i):j for j,i in enumerate(self.active)}
        self.size=(self.ns+1)*self.n+len(self.active)+1
        self.species_index={s['id']:i for i,s in enumerate(inp['species'])}
        self.kappa=np.array([inp['geometry']['layers'][r]['electrolyte_conductivity']['value'] for r in m['regions']])
        self.sigma=np.array([inp['geometry']['layers'][r]['solid_conductivity']['value'] for r in m['regions']])
        self.D=np.array([[inp['geometry']['layers'][r]['diffusivity'][s['id']]['value'] for r in m['regions']] for s in inp['species']])
        self.valence=np.array([s['valence']['value'] for s in inp['species']]); self.refs=np.array([s['reference_concentration']['value'] for s in inp['species']])
        self.cs=inp['numerics']['concentration_scale']['value']; self.ps=inp['numerics']['potential_scale']['value']
        self.rs=inp['numerics']['species_rate_scale']['value']; self.js=inp['numerics']['charge_rate_scale']['value']; self.rt=R*inp['temperature']['value']
        self.history=[]

    def unpack(self,x):
        c=x[:self.ns*self.n].reshape((self.ns,self.n))*self.cs
        phi=x[self.ns*self.n:(self.ns+1)*self.n]*self.ps
        solid=np.zeros(self.n); solid[self.active]=x[(self.ns+1)*self.n:-1]*self.ps
        return c,phi,solid,x[-1]*self.ps

    def activity(self,c,orders):
        a=np.ones(self.n)
        for key,v in orders.items():
            k=self.species_index[key]; a*=np.power(c[k]/self.refs[k],v['value'])
        return a

    def balances(self,x):
        c,phi,solid,V=self.unpack(x); m=self.mesh; div=np.zeros_like(c); ionic=np.zeros(self.n); electronic=np.zeros(self.n)
        source=np.zeros_like(c); jr=np.zeros(self.n); boundary_species=np.zeros_like(c); collector=np.zeros(2); interface_flux={}
        for i,j,axis,area,hi,hj in m['faces']:
            conductance=area/(hi/self.D[:,i]+hj/self.D[:,j]); psi=self.valence*F*(phi[j]-phi[i])/self.rt
            flux=conductance*(bernoulli(psi)*c[:,i]-bernoulli(-psi)*c[:,j]); div[:,i]+=flux; div[:,j]-=flux
            il=area/(hi/self.kappa[i]+hj/self.kappa[j])*(phi[i]-phi[j]); ionic[i]+=il; ionic[j]-=il
            if self.sigma[i]>0 and self.sigma[j]>0:
                iss=area/(hi/self.sigma[i]+hj/self.sigma[j])*(solid[i]-solid[j]); electronic[i]+=iss; electronic[j]-=iss
            if m['regions'][i]!=m['regions'][j]:
                key=f"interface:{self.input['geometry']['layers'][m['regions'][i]]['tag']}:{self.input['geometry']['layers'][m['regions'][j]]['tag']}"
                interface_flux[key]=interface_flux.get(key,np.zeros(self.ns))+flux
        for i,axis,sign,area,h in m['boundary']:
            name='xyz'[axis]+('_min' if sign<0 else '_max')
            if name in self.input['reservoir_faces']:
                reservoir=np.array([s['reservoir_concentration']['value'] for s in self.input['species']])
                flux=self.D[:,i]*area/h*(c[:,i]-reservoir)
                div[:,i]+=flux; boundary_species[:,i]+=flux
            if axis==0 and self.sigma[i]>0:
                index=0 if sign<0 else 1; contact=0. if index==0 else V
                iss=self.sigma[i]*area/h*(solid[i]-contact); electronic[i]+=iss; collector[index]+=iss
        for reaction in self.input['reactions']:
            tag_index=next(r for r,l in enumerate(self.input['geometry']['layers']) if l['tag']==reaction['domain_tag']); mask=m['regions']==tag_index; law=reaction['law']
            if law['kind']=='mass_action': rate=law['rate']['value']*self.activity(c,law['orders'])
            else:
                substrate=c[self.species_index[law['substrate']]]; rate=law['rate']['value']*substrate/(law['half_saturation']['value']+substrate)
            for key,nu in reaction['stoichiometry'].items(): source[self.species_index[key],mask]+=nu['value']*rate[mask]*m['volumes'][mask]
        for e in self.input['electrodes']:
            r=next(r for r,l in enumerate(self.input['geometry']['layers']) if l['tag']==e['domain_tag']); mask=m['regions']==r; ne=e['electron_count']['value']
            eta=(solid[mask]-phi[mask]-e['equilibrium_potential']['value'])*ne*F/self.rt
            with np.errstate(over='raise',invalid='raise'):
                local=e['exchange_current']['value']*(self.activity(c,e['forward_orders'])[mask]*np.exp(e['alpha']['value']*eta)-self.activity(c,e['reverse_orders'])[mask]*np.exp(-(1-e['alpha']['value'])*eta))
            jr[mask]=local*m['volumes'][mask]
            for key,nu in e['stoichiometry'].items(): source[self.species_index[key],mask]+=nu['value']*jr[mask]/(ne*F)
        # div(i_l)=j_F, div(i_s)=-j_F; anodic j_F is positive.
        return div-source,ionic-jr,electronic+jr,boundary_species,source,collector,jr,interface_flux

    def residual(self,x):
        mass,ionic,solid,_,_,collector,_,_=self.balances(x); volume=self.mesh['volumes']; _,phi,_,V=self.unpack(x)
        # The anode collector at 0 V fixes the only global gauge. Imposing a
        # second liquid gauge would discard charge balance and overconstrain BV.
        ionic_scaled=ionic/(self.js*volume)
        circuit=self.input['circuit']; current=-collector[0]
        closure=(V-current*circuit['resistance']['value'])/self.ps if circuit['kind']=='external_load' else (V+circuit['voltage']['value'])/self.ps
        return np.concatenate([(mass/(self.rs*volume)).ravel(),ionic_scaled,solid[self.active]/(self.js*volume[self.active]),[closure]])

    def sparsity(self):
        # Graph-local blocks plus the collector/circuit row. No dense global Jacobian.
        matrix=lil_matrix((self.size,self.size),dtype=int); neighbors=[{i} for i in range(self.n)]
        for i,j,*_ in self.mesh['faces']: neighbors[i].add(j); neighbors[j].add(i)
        def columns(cell):
            cols=[s*self.n+cell for s in range(self.ns+1)]
            if cell in self.solid_index: cols.append((self.ns+1)*self.n+self.solid_index[cell])
            return cols
        for i in range(self.n):
            rows=columns(i); cols=[k for j in neighbors[i] for k in columns(j)]+[self.size-1]
            for row in rows: matrix[row,cols]=1
        collector_cells=[i for i,axis,sign,*_ in self.mesh['boundary'] if axis==0 and sign<0]
        matrix[-1,[self.size-1]+[(self.ns+1)*self.n+self.solid_index[i] for i in collector_cells]]=1
        return matrix.tocsr()

    def jacobian(self,x):
        c,phi,solid,_=self.unpack(x); n=self.n; m=self.mesh; vol=m['volumes']; J=lil_matrix((self.size,self.size))
        def row_scale(row):
            if row<self.ns*n: return self.rs*vol[row%n]
            if row<(self.ns+1)*n: return self.js*vol[row-self.ns*n]
            if row<self.size-1: return self.js*vol[self.active[row-(self.ns+1)*n]]
            return self.ps
        def add(row,col,val): J[row,col]+=val*(self.cs if col<self.ns*n else self.ps)/row_scale(row)
        def prow(i): return self.ns*n+i
        def srow(i): return (self.ns+1)*n+self.solid_index[i]
        for i,j,_,area,hi,hj in m['faces']:
            psi=self.valence*F*(phi[j]-phi[i])/self.rt; G=area/(hi/self.D[:,i]+hj/self.D[:,j])
            dphi=G*(bernoulli_derivative(psi)*c[:,i]+bernoulli_derivative(-psi)*c[:,j])*self.valence*F/self.rt
            for k in range(self.ns):
                for row,sign in [(k*n+i,1),(k*n+j,-1)]:
                    add(row,k*n+i,sign*G[k]*bernoulli(psi)[k]); add(row,k*n+j,-sign*G[k]*bernoulli(-psi)[k]); add(row,prow(i),-sign*dphi[k]); add(row,prow(j),sign*dphi[k])
            G=area/(hi/self.kappa[i]+hj/self.kappa[j])
            for row,sign in [(prow(i),1),(prow(j),-1)]: add(row,prow(i),sign*G); add(row,prow(j),-sign*G)
            if self.sigma[i]>0 and self.sigma[j]>0:
                G=area/(hi/self.sigma[i]+hj/self.sigma[j])
                for row,sign in [(srow(i),1),(srow(j),-1)]: add(row,srow(i),sign*G); add(row,srow(j),-sign*G)
        for i,axis,sign,area,h in m['boundary']:
            if 'xyz'[axis]+('_min' if sign<0 else '_max') in self.input['reservoir_faces']:
                for k in range(self.ns): add(k*n+i,k*n+i,self.D[k,i]*area/h)
            if axis==0 and self.sigma[i]>0:
                G=self.sigma[i]*area/h; add(srow(i),srow(i),G)
                if sign>0: add(srow(i),self.size-1,-G)
                elif self.input['circuit']['kind']=='external_load': add(self.size-1,srow(i),G*self.input['circuit']['resistance']['value'])
        def activity_derivative(i,orders,k):
            key=self.input['species'][k]['id']; order=orders.get(key,{}).get('value',0)
            if order==0:return 0.
            result=order/self.refs[k]
            for name,v in orders.items():
                s=self.species_index[name]; exponent=v['value']-(1 if s==k else 0)
                result*=(c[s,i]/self.refs[s])**exponent
            return result
        for reaction in self.input['reactions']:
            domain=next(r for r,l in enumerate(self.input['geometry']['layers']) if l['tag']==reaction['domain_tag']); law=reaction['law']
            for i in np.flatnonzero(m['regions']==domain):
                for k in range(self.ns):
                    if law['kind']=='mass_action': derivative=law['rate']['value']*activity_derivative(i,law['orders'],k)
                    else: derivative=law['rate']['value']*law['half_saturation']['value']/(law['half_saturation']['value']+c[k,i])**2 if k==self.species_index[law['substrate']] else 0
                    for name,nu in reaction['stoichiometry'].items(): add(self.species_index[name]*n+i,k*n+i,-nu['value']*derivative*vol[i])
        for e in self.input['electrodes']:
            domain=next(r for r,l in enumerate(self.input['geometry']['layers']) if l['tag']==e['domain_tag']); ne=e['electron_count']['value']; alpha=e['alpha']['value']; i0=e['exchange_current']['value']
            af=self.activity(c,e['forward_orders']); ar=self.activity(c,e['reverse_orders'])
            for i in np.flatnonzero(m['regions']==domain):
                eta=(solid[i]-phi[i]-e['equilibrium_potential']['value'])*ne*F/self.rt; ef=math.exp(alpha*eta); er=math.exp(-(1-alpha)*eta)
                dp=i0*ne*F/self.rt*(alpha*af[i]*ef+(1-alpha)*ar[i]*er)*vol[i]
                derivatives=[(prow(i),-dp),(srow(i),dp)]+[(k*n+i,i0*(activity_derivative(i,e['forward_orders'],k)*ef-activity_derivative(i,e['reverse_orders'],k)*er)*vol[i]) for k in range(self.ns)]
                for col,derivative in derivatives:
                    add(prow(i),col,-derivative); add(srow(i),col,derivative)
                    for name,nu in e['stoichiometry'].items(): add(self.species_index[name]*n+i,col,-nu['value']*derivative/(ne*F))
        add(self.size-1,self.size-1,1)
        return J.tocsr()

    def solve(self):
        # A Cell may be reused in verification; each solve owns its diagnostics.
        self.history=[]
        x=np.zeros(self.size)
        for k,s in enumerate(self.input['species']): x[k*self.n:(k+1)*self.n]=s['initial_concentration']['value']/self.cs
        cath=self.input['electrodes'][1]['equilibrium_potential']['value']; an=self.input['electrodes'][0]['equilibrium_potential']['value']
        V=cath-an if self.input['system']=='MFC' else -self.input['circuit']['voltage']['value']
        x[self.ns*self.n:(self.ns+1)*self.n]=-an/self.ps
        for i,k in self.solid_index.items(): x[(self.ns+1)*self.n+k]=0 if self.mesh['regions'][i]==0 else V/self.ps
        x[-1]=V/self.ps
        def residual(v):
            result=self.residual(v)
            if not np.isfinite(result).all(): raise ValueError('Nonfinite cell residual')
            return result
        f=residual(x); evaluations=1; reason=0; termination='maximum_evaluations'
        tolerance=self.input['numerics']['nonlinear_tolerance']; maximum=self.input['numerics']['max_evaluations']
        while evaluations<maximum:
            self.history.append(float(np.max(np.abs(f))))
            if self.history[-1]<=tolerance: reason=1; termination='nonlinear_tolerance'; break
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('error',MatrixRankWarning)
                    step=spsolve(self.jacobian(x),-f)
                if not np.isfinite(step).all(): termination='nonfinite_newton_step'; break
            except (MatrixRankWarning,ValueError,RuntimeError,OverflowError): termination='linear_solve_failed'; break
            alpha=1.; negative=step[:self.ns*self.n]<0
            if negative.any(): alpha=min(alpha,.99*float(np.min(-x[:self.ns*self.n][negative]/step[:self.ns*self.n][negative])))
            if alpha<1e-12: termination='positivity_step_blocked'; break
            accepted=False
            while alpha>=1e-12 and evaluations<maximum:
                candidate=x+alpha*step
                try:
                    trial=residual(candidate); evaluations+=1
                    if np.linalg.norm(trial)<=(1-1e-4*alpha)*np.linalg.norm(f):
                        x=candidate; f=trial; accepted=True; break
                except (FloatingPointError,OverflowError,ValueError): evaluations+=1
                alpha*=.5
            if not accepted:
                termination='maximum_evaluations' if evaluations>=maximum else 'line_search_failed'
                break
        final=float(np.max(np.abs(f)))
        if not self.history or final!=self.history[-1]: self.history.append(final)
        if final<=tolerance: reason=1; termination='nonlinear_tolerance'
        return self.output(SimpleNamespace(x=x,fun=f,nfev=evaluations,status=reason,success=reason>0,termination=termination))

    def output(self,result):
        c,phi,solid,V=self.unpack(result.x); mass,ionic,electronic,boundary,source,collectors,jr,interfaces=self.balances(result.x)
        n=self.mesh['count']; scale=self.input['numerics']['conservation_tolerance']; residuals=[]
        def diagnostic(key,kind,values,normalizer,unit):
            absolute=float(np.max(np.abs(values))); relative=absolute/max(float(normalizer),1e-30)
            residuals.append({'balance_id':key,'kind':kind,'scope':'global','absolute_residual':absolute,'unit':unit,'relative_residual':relative,'tolerance':scale,'passed':relative<=scale})
        for k,s in enumerate(self.input['species']):
            # Include a local residual: global cancellation alone can hide errors.
            normalization=max(np.max(np.abs(source[k])),np.max(np.abs(boundary[k])), self.rs*np.max(self.mesh['volumes']))
            diagnostic('species_local_'+s['id'],'species_mass',mass[k],normalization,'mol/s')
            diagnostic('species_global_'+s['id'],'species_mass',[np.sum(boundary[k])-np.sum(source[k])],max(np.sum(np.abs(source[k])),np.sum(np.abs(boundary[k])),normalization),'mol/s')
        charge_scale=max(np.max(np.abs(jr)),self.js*np.max(self.mesh['volumes']))
        diagnostic('liquid_charge','ionic_charge',ionic,charge_scale,'A'); diagnostic('solid_charge','solid_charge',electronic[self.active],charge_scale,'A')
        diagnostic('collector_current','circuit_closure',[collectors.sum()],max(np.max(np.abs(collectors)),charge_scale),'A')
        circuit_residual=float(abs(self.residual(result.x)[-1]))
        residuals.append({'balance_id':'load_voltage','kind':'circuit_closure','scope':'global','absolute_residual':circuit_residual*self.ps,'unit':'V','relative_residual':circuit_residual,'tolerance':scale,'passed':circuit_residual<=scale})
        converged=bool(result.success and self.history[-1]<=self.input['numerics']['nonlinear_tolerance'] and all(r['passed'] for r in residuals))
        termination='nonlinear_and_conservation_passed' if converged else ('conservation_gate_failed' if result.success else result.termination)
        fields=[{'id':'concentration_'+s['id'],'unit':'mol/m3','values':c[k].tolist(),'cells':list(range(n))} for k,s in enumerate(self.input['species'])]
        fields.append({'id':'liquid_potential','unit':'V','values':phi.tolist(),'cells':list(range(n))})
        for e in self.input['electrodes']:
            r=next(r for r,l in enumerate(self.input['geometry']['layers']) if l['tag']==e['domain_tag']); cells=np.flatnonzero(self.mesh['regions']==r)
            fields.append({'id':'solid_potential_'+e['role'],'unit':'V','values':solid[cells].tolist(),'cells':cells.tolist()})
        field_extrema = derive_field_extrema(
            fields,
            {
                'centers_m': self.mesh['centers'].tolist(),
                'sizes_m': self.mesh['sizes'].tolist(),
                'region_index': self.mesh['regions'].tolist(),
            },
            self.input['geometry']['layers'],
        )
        current=float(-collectors[0]); power=current*V
        return {'version':SOLVER_VERSION,'status':'converged' if converged else 'not_converged','dimension':self.input['dimension'],'evaluations':int(result.nfev),'optimizer_termination':int(result.status),'termination_reason':termination,'history':self.history.copy(),'residuals':residuals,'fields':fields,'field_extrema':field_extrema,'mesh':{'shape':self.mesh['shape'],'centers_m':self.mesh['centers'].tolist(),'sizes_m':self.mesh['sizes'].tolist(),'region_index':self.mesh['regions'].tolist(),'volumes_m3':self.mesh['volumes'].tolist()},'circuit':{'collector_voltage_V':float(V),'anodic_current_A':current,'signed_electrical_power_W':float(power),'mfc_generated_power_W':float(power) if self.input['system']=='MFC' else None,'mec_electrical_input_W':float(-power) if self.input['system']=='MEC' else None},'interface_species_flux_mol_s':{tag:flux.tolist() for tag,flux in interfaces.items()}}


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--output-dir',type=Path,required=True); args=parser.parse_args()
    raw=sys.stdin.buffer.read(2_000_001)
    if len(raw)>2_000_000: raise ValueError('Cell request too large')
    request=json.loads(raw)
    if set(request)!={'operation','request_id','input_json','input_sha256','geometry_json','geometry_sha256'} or request['operation'] not in ['prepare','solve']: raise ValueError('Invalid transport envelope')
    for key in ['input','geometry']:
        if hashlib.sha256(request[key+'_json'].encode()).hexdigest()!=request[key+'_sha256']: raise ValueError('Input hash mismatch')
    inp=validate(json.loads(request['input_json']))
    if json.loads(request['geometry_json'])!=inp['geometry']: raise ValueError('Geometry snapshot mismatch')
    if request['operation']=='prepare':
        m=topology(inp)
        output={'version':SOLVER_VERSION,'status':'prepared','dimension':inp['dimension'],'mesh':{'shape':m['shape'],'centers_m':m['centers'].tolist(),'sizes_m':m['sizes'].tolist(),'region_index':m['regions'].tolist(),'volumes_m3':m['volumes'].tolist()},'fields':[]}
    else:
        output=Cell(inp).solve()
    args.output_dir.mkdir(mode=0o700,parents=True,exist_ok=True)
    artifacts=[]
    for name,content in [('mesh',output.pop('mesh'))]+[(f['id'],f) for f in output.pop('fields')]:
        data=json.dumps(content,allow_nan=False,separators=(',',':')).encode(); filename=f'{name}.json'; path=args.output_dir/filename
        with path.open('xb') as file: file.write(data)
        artifacts.append({'id':name,'path':filename,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
    output.update({'protocol_version':PROCESS_PROTOCOL_VERSION,'request_id':request['request_id'],'input_sha256':request['input_sha256'],'geometry_sha256':request['geometry_sha256'],'artifacts':artifacts})
    print(json.dumps(output,allow_nan=False,separators=(',',':')))


if __name__=='__main__':
    main()
