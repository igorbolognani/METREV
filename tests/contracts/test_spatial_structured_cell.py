"""Mathematical verification only, never an experimental MFC benchmark."""
import hashlib
import copy
import json
from pathlib import Path
import sys
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, derive_field_extrema, solve_ideal_donnan_interface, validate

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'

class StructuredCellTests(unittest.TestCase):
    def fixture(self, dimension=2):
        value = json.loads(FIXTURE.read_text())
        if dimension == 3:
            value['dimension'] = 3
            value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
            value['geometry']['transverse_cells'].append(2)
        return value

    def donnan_fixture(self, dimension=2):
        value = json.loads(FIXTURE.with_name('structured-cell-donnan.json').read_text())
        if dimension == 3:
            value['dimension'] = 3
            value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
            value['geometry']['transverse_cells'].append(2)
        return value

    def test_recorded_donnan_refinement_preserves_input_identity_and_data_role(self):
        record=json.loads(FIXTURE.with_name('structured-cell-donnan-verification.json').read_text())
        self.assertEqual(record['source_base_fixture_sha256'],hashlib.sha256(FIXTURE.read_bytes()).hexdigest())
        self.assertEqual(record['source_donnan_fixture_sha256'],hashlib.sha256(FIXTURE.with_name('structured-cell-donnan.json').read_bytes()).hexdigest())
        self.assertFalse(record['decision_eligible'])
        self.assertFalse(record['independent_validation'])
        self.assertEqual(record['data_role'],'test_fixture')
        self.assertEqual({(r['input']['dimension'],r['input']['system']) for r in record['series']},{(2,'MFC'),(2,'MEC'),(3,'MFC'),(3,'MEC')})
        for series in record['series']:
            digest=hashlib.sha256(json.dumps(series['input'],allow_nan=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            self.assertEqual(series['related_runs'][0]['input_sha256'],digest)
            self.assertEqual(len({r['input_sha256'] for r in series['related_runs']}),3)
            self.assertTrue(all(r['status']=='converged' for r in series['related_runs']))
            for check in series['checks']:
                self.assertLessEqual(abs(check['actual']-check['expected']),check['tolerance'])

    def test_ideal_donnan_root_matches_analytic_monovalent_fixed_charge_limit(self):
        psi, derivative, residual, _ = solve_ideal_donnan_interface(
            np.array([100.0, 100.0]),
            np.array([1.0, -1.0]),
            np.array([1.0, 1.0]),
            -50.0,
        )
        self.assertAlmostEqual(psi, -np.arcsinh(0.25), places=12)
        self.assertLess(abs(residual), 1e-11)
        step = 1e-4
        plus = solve_ideal_donnan_interface(
            np.array([100.0 + step, 100.0]), np.array([1.0, -1.0]),
            np.array([1.0, 1.0]), -50.0,
        )[0]
        minus = solve_ideal_donnan_interface(
            np.array([100.0 - step, 100.0]), np.array([1.0, -1.0]),
            np.array([1.0, 1.0]), -50.0,
        )[0]
        self.assertAlmostEqual(derivative[0], (plus - minus) / (2 * step), places=9)

    def test_donnan_partition_couples_charge_species_and_jacobian_in_2d_3d(self):
        for dimension in (2, 3):
            value = self.donnan_fixture(dimension)
            cell = Cell(value)
            output = cell.solve()
            self.assertEqual(output['status'], 'converged')
            self.assertEqual(len(output['donnan_interfaces']), 2)
            self.assertEqual(
                [entry['orientation'] for entry in output['donnan_interfaces']],
                ['membrane_right', 'membrane_left'],
            )
            for entry in output['donnan_interfaces']:
                self.assertEqual(entry['face_count'], int(np.prod(value['geometry']['transverse_cells'])))
                summaries = entry['species']
                self.assertEqual([row['species_id'] for row in summaries], [item['id'] for item in value['species']])
                flux = output['interface_species_flux_mol_s']['interface:'+entry['interface_id']]
                np.testing.assert_allclose([row['positive_x_flux_mol_s'] for row in summaries], flux, rtol=0, atol=0)
                equilibrium_charge = entry['fixed_charge_density_mol_m3'] + sum(row['valence']*row['mean_equilibrium_membrane_concentration_mol_m3'] for row in summaries)
                self.assertLess(abs(equilibrium_charge), 1e-9)
                for row in summaries:
                    self.assertGreater(row['mean_effective_partition_factor'], 0)
                    self.assertLessEqual(row['minimum_equilibrium_membrane_concentration_mol_m3'], row['mean_equilibrium_membrane_concentration_mol_m3'])
                    self.assertLessEqual(row['mean_equilibrium_membrane_concentration_mol_m3'], row['maximum_equilibrium_membrane_concentration_mol_m3'])
                self.assertLess(entry['maximum_absolute_charge_residual_mol_m3'], 1e-9)
                self.assertLess(entry['relative_charge_residual'], value['numerics']['conservation_tolerance'])
            charge_gates = [
                row for row in output['residuals']
                if row['kind'] == 'interface_charge'
            ]
            self.assertEqual(len(charge_gates), 2)
            self.assertTrue(all(row['passed'] for row in charge_gates))
            self.assertTrue(all(row['unit'] == 'mol/m3' for row in charge_gates))
            self.assertTrue(all(row['passed'] for row in output['residuals']))

            concentrations = np.concatenate([
                np.array(field['values']) for field in output['fields']
                if field['id'].startswith('concentration_')
            ]) / cell.cs
            liquid = np.array(next(field['values'] for field in output['fields'] if field['id'] == 'liquid_potential')) / cell.ps
            solid = np.concatenate([
                np.array(field['values']) for field in output['fields']
                if field['id'].startswith('solid_potential_')
            ]) / cell.ps
            state = np.concatenate([
                concentrations, liquid, solid,
                [output['circuit']['collector_voltage_V'] / cell.ps],
            ])
            direction = np.random.default_rng(37 + dimension).normal(size=len(state))
            step = 1e-7
            numeric = (cell.residual(state + step * direction) - cell.residual(state - step * direction)) / (2 * step)
            np.testing.assert_allclose(cell.jacobian(state) @ direction, numeric, rtol=2e-6, atol=1e-4)

            # A zero fixed-charge, unit-partition interface recovers the continuous
            # concentration/potential law for an electroneutral 1:1 electrolyte.
            limit = solve_ideal_donnan_interface(
                np.array([100.0, 100.0]), np.array([1.0, -1.0]),
                np.array([1.0, 1.0]), 0.0,
            )
            self.assertAlmostEqual(limit[0], 0.0, places=12)
            self.assertLess(abs(limit[2]), 1e-12)

    def test_donnan_equilibrium_does_not_drive_supporting_electrolyte_current(self):
        value = self.donnan_fixture()
        first = value['interface_partition']['interfaces'][0]
        value['interface_partition']['interfaces'][1]['species'] = copy.deepcopy(first['species'])
        value['electrodes'][1]['equilibrium_potential']['value'] = 0.0
        for species in value['species']:
            species['reference_concentration']['value'] = 100.0
        cell = Cell(value)
        c = np.full((cell.ns, cell.n), 100.0)
        partition = np.array([
            first['species'].get(species['id'], {'value': 1.0})['value']
            for species in value['species']
        ])
        donnan, _, _, _ = solve_ideal_donnan_interface(
            np.full(cell.ns, 100.0), cell.valence, partition,
            first['fixed_charge_density']['value'],
        )
        membrane = cell.mesh['regions'] == 1
        c[:, membrane] = (
            partition * 100.0 * np.exp(-cell.valence * donnan)
        )[:, None]
        state = np.concatenate([
            c.ravel() / cell.cs,
            np.zeros(cell.n),
            np.zeros(len(cell.active)),
            [0.0],
        ])

        _, ionic, electronic, _, _, _, faradaic, interfaces = cell.balances(state)

        self.assertLess(np.max(np.abs(interfaces['interface:anode:membrane'])), 1e-10)
        self.assertLess(np.max(np.abs(interfaces['interface:membrane:cathode'])), 1e-10)
        self.assertLess(np.max(np.abs(ionic)), 1e-12)
        self.assertLess(np.max(np.abs(electronic)), 1e-12)
        self.assertLess(np.max(np.abs(faradaic)), 1e-12)

    def test_donnan_multivalent_mixture_matches_independent_brent_root(self):
        from scipy.optimize import brentq
        for charge in (-500.0, 0.0, 500.0):
            c=np.array([20.0, 40.0, 80.0, 3.0]); z=np.array([2., 1., -1., 0.]); k=np.array([.7, 1.2, .9, 1.5])
            oracle=brentq(lambda psi: charge+np.sum(z*k*c*np.exp(-z*psi)), -10, 10, xtol=1e-14)
            psi, derivative, residual, _=solve_ideal_donnan_interface(c,z,k,charge)
            self.assertAlmostEqual(psi,oracle,places=12)
            self.assertLess(abs(residual),1e-9)
            self.assertEqual(derivative[-1],0)
        with self.assertRaises(ValueError):
            solve_ideal_donnan_interface(c,np.array([np.nan,1,-1,0]),k,0)

    def test_donnan_analytic_equilibrium_species_outputs_both_dimensions(self):
        for dimension in (2,3):
            value=self.donnan_fixture(dimension)
            for entry in value['interface_partition']['interfaces']:
                for parameter in entry['species'].values(): parameter['value']=1.0
            value['electrodes'][1]['equilibrium_potential']['value']=0.0
            cell=Cell(value)
            c=np.full((cell.ns,cell.n),100.0)
            psi=-np.arcsinh(.25)
            c[:,cell.mesh['regions']==1]=(100*np.exp(-cell.valence*psi))[:,None]
            state=np.concatenate([c.ravel()/cell.cs,np.zeros(cell.n),np.zeros(len(cell.active)),[0.]])
            for entry in cell.donnan_diagnostics(state):
                by_id={row['species_id']:row for row in entry['species']}
                self.assertAlmostEqual(by_id['oxidized']['mean_equilibrium_membrane_concentration_mol_m3'],(np.sqrt(42500)+50)/2,places=10)
                self.assertAlmostEqual(by_id['chloride']['mean_equilibrium_membrane_concentration_mol_m3'],(np.sqrt(42500)-50)/2,places=10)
                self.assertAlmostEqual(by_id['oxidized']['mean_effective_partition_factor']*by_id['chloride']['mean_effective_partition_factor'],1.,places=12)
                self.assertTrue(all(abs(row['positive_x_flux_mol_s'])<1e-18 for row in entry['species']))

    def test_donnan_interfaces_reject_normal_convection_through_membrane(self):
        value = self.donnan_fixture()
        cell = Cell(value)
        velocity = [0.0] * len(cell.mesh['faces'])
        interface_face = next(
            index for index, (left, right, *_rest) in enumerate(cell.mesh['faces'])
            if {cell.mesh['regions'][left], cell.mesh['regions'][right]} == {0, 1}
        )
        velocity[interface_face] = 1e-6
        value['advection'] = {
            'version': 'structured-cell-prescribed-flow-v1',
            'face_normal_velocity': [
                {'value': item, 'unit': 'm/s', 'source_kind': 'test_fixture',
                 'source_ref': 'synthetic:membrane-flow-rejection'}
                for item in velocity
            ],
            'boundary_normal_velocity': [
                {'value': 0.0, 'unit': 'm/s', 'source_kind': 'test_fixture',
                 'source_ref': 'synthetic:membrane-flow-rejection'}
                for _ in cell.mesh['boundary']
            ],
            'inlet_concentrations': {},
        }
        with self.assertRaisesRegex(ValueError, 'Membrane convection/water transport'):
            validate(value)

    def test_equilibrium_and_charge_closure_both_dimensions(self):
        for dimension in (2, 3):
            value = self.fixture(dimension)
            value['electrodes'][1]['equilibrium_potential']['value'] = 0
            output = Cell(value).solve()
            self.assertEqual(output['status'], 'converged')
            self.assertEqual(output['circuit']['anodic_current_A'], 0)
            self.assertTrue(all(r['passed'] for r in output['residuals']))

    def test_analytic_jacobian_matches_directional_difference(self):
        cell = Cell(self.fixture())
        output = cell.solve()
        values = np.concatenate([np.array(f['values']) for f in output['fields'][:2]]) / cell.cs
        liquid = np.array(output['fields'][2]['values']) / cell.ps
        solid = np.concatenate([np.array(f['values']) for f in output['fields'] if f['id'].startswith('solid_potential_')]) / cell.ps
        x = np.concatenate([values, liquid, solid, [output['circuit']['collector_voltage_V']/cell.ps]])
        direction = np.random.default_rng(7).normal(size=len(x))
        h = 1e-7
        numeric = (cell.residual(x+h*direction)-cell.residual(x-h*direction))/(2*h)
        np.testing.assert_allclose(cell.jacobian(x)@direction, numeric, rtol=2e-6, atol=1e-4)

    def test_extruded_2d_and_3d_preserve_physical_current(self):
        planar, spatial = [Cell(self.fixture(d)).solve() for d in (2, 3)]
        self.assertEqual(planar['status'], 'converged')
        self.assertEqual(spatial['status'], 'converged')
        np.testing.assert_allclose(planar['circuit']['anodic_current_A'], spatial['circuit']['anodic_current_A'], rtol=1e-5)
        self.assertTrue(all(r['passed'] for r in spatial['residuals']))

    def test_homogeneous_mass_action_and_monod_with_heterogeneous_interface(self):
        for kind in ('mass_action', 'monod'):
            value=self.fixture()
            neutral=copy.deepcopy(value['species'][0]); neutral['id']='neutral'
            value['species'].append(neutral)
            for layer in value['geometry']['layers']:
                layer['diffusivity']['neutral']=copy.deepcopy(layer['diffusivity']['reduced'])
            value['geometry']['layers'][1]['diffusivity']['reduced']['value']=2e-10
            rate=dict(value['numerics']['species_rate_scale'],value=1e-6)
            law={'kind':kind,'rate':rate}
            if kind=='mass_action': law['orders']={'reduced':dict(neutral['valence'],value=1)}
            else: law.update(substrate='reduced',half_saturation=dict(neutral['reference_concentration'],value=.5))
            value['reactions']=[{'id':'neutral_conversion','domain_tag':'membrane','equation_ref':'synthetic:neutral-conversion','stoichiometry':{'reduced':dict(neutral['valence'],value=-1),'neutral':dict(neutral['valence'],value=1)},'law':law}]
            output=Cell(value).solve()
            self.assertEqual(output['status'],'converged')
            self.assertTrue(all(r['passed'] for r in output['residuals']))
            self.assertTrue(output['interface_species_flux_mol_s'])

    def test_neutral_membrane_partition_is_conservative_and_has_exact_jacobian(self):
        for dimension in (2, 3):
            value = self.fixture(dimension)
            neutral = copy.deepcopy(value['species'][0])
            neutral['id'] = 'neutral'
            value['species'].append(neutral)
            for layer in value['geometry']['layers']:
                layer['diffusivity']['neutral'] = copy.deepcopy(layer['diffusivity']['reduced'])
            coefficient = copy.deepcopy(neutral['valence'])
            coefficient.update(value=2.0, source_ref='synthetic:neutral-membrane-partition')
            value['interface_partition'] = {
                'version': 'structured-cell-neutral-membrane-partition-v1',
                'interfaces': [{
                    'left_domain': 'anode',
                    'right_domain': 'membrane',
                    'species': {'neutral': coefficient},
                }],
            }
            cell = Cell(value)
            species_index = cell.species_index['neutral']
            regions = cell.mesh['regions']
            concentrations = np.array([
                np.full(cell.n, species['initial_concentration']['value'])
                for species in value['species']
            ])
            concentrations[species_index, regions == 0] = 3.0
            concentrations[species_index, regions == 1] = 2.0
            state = np.concatenate([
                concentrations.ravel() / cell.cs,
                np.zeros(cell.n),
                np.zeros(len(cell.active)),
                [0.0],
            ])
            mass, _, _, _, _, _, _, interfaces = cell.balances(state)

            expected = 0.0
            for left, right, _, area, h_left, h_right in cell.mesh['faces']:
                if regions[left] == 0 and regions[right] == 1:
                    d_left = cell.D[species_index, left]
                    d_right = cell.D[species_index, right]
                    conductance = area / (h_left / d_left + h_right / (2.0 * d_right))
                    expected += conductance * (
                        concentrations[species_index, left]
                        - concentrations[species_index, right] / 2.0
                    )
            self.assertAlmostEqual(
                interfaces['interface:anode:membrane'][species_index],
                expected,
                places=15,
            )

            continuous_input = copy.deepcopy(value)
            del continuous_input['interface_partition']
            continuous_mass = Cell(continuous_input).balances(state)[0]
            self.assertAlmostEqual(
                float((mass[species_index] - continuous_mass[species_index]).sum()),
                0.0,
                places=15,
            )

            direction = np.random.default_rng(17).normal(size=cell.size)
            step = 1e-7
            numeric = (cell.residual(state + step * direction) - cell.residual(state - step * direction)) / (2 * step)
            np.testing.assert_allclose(cell.jacobian(state) @ direction, numeric, rtol=2e-6, atol=1e-4)

            concentrations[species_index, regions == 0] = 1.0
            concentrations[species_index, regions == 1] = 2.0
            equilibrium_state = np.concatenate([
                concentrations.ravel() / cell.cs,
                np.zeros(cell.n),
                np.zeros(len(cell.active)),
                [0.0],
            ])
            equilibrium_interfaces = cell.balances(equilibrium_state)[-1]
            self.assertAlmostEqual(
                equilibrium_interfaces['interface:anode:membrane'][species_index],
                0.0,
                places=15,
            )

    def test_neutral_membrane_partition_rejects_charged_or_unsourced_inputs(self):
        value = self.fixture()
        neutral = copy.deepcopy(value['species'][0])
        neutral['id'] = 'neutral'
        value['species'].append(neutral)
        for layer in value['geometry']['layers']:
            layer['diffusivity']['neutral'] = copy.deepcopy(layer['diffusivity']['reduced'])
        coefficient = copy.deepcopy(neutral['valence'])
        coefficient.update(value=2.0, source_ref='synthetic:neutral-membrane-partition')
        value['interface_partition'] = {
            'version': 'structured-cell-neutral-membrane-partition-v1',
            'interfaces': [{
                'left_domain': 'anode',
                'right_domain': 'membrane',
                'species': {'neutral': coefficient},
            }],
        }
        validate(value)
        charged = copy.deepcopy(value)
        charged['interface_partition']['interfaces'][0]['species']['oxidized'] = copy.deepcopy(coefficient)
        with self.assertRaises(ValueError):
            validate(charged)
        unsourced = copy.deepcopy(value)
        unsourced['interface_partition']['interfaces'][0]['species']['neutral']['source_ref'] = ''
        with self.assertRaises(ValueError):
            validate(unsourced)
        nonadjacent = copy.deepcopy(value)
        nonadjacent['interface_partition']['interfaces'][0]['right_domain'] = 'cathode'
        with self.assertRaises(ValueError):
            validate(nonadjacent)

    def test_budget_exhaustion_retains_diagnostics_and_fields(self):
        value=self.fixture(); value['numerics']['max_evaluations']=1
        output=Cell(value).solve()
        self.assertEqual(output['status'],'not_converged')
        self.assertEqual(len(output['fields']),6)
        self.assertTrue(any(not r['passed'] for r in output['residuals']))

    def test_mec_input_is_separate_from_generated_energy(self):
        value=self.fixture(); value['system']='MEC'
        value['circuit']={'kind':'applied_voltage','voltage':dict(value['electrodes'][1]['equilibrium_potential'], value=.1)}
        output=Cell(value).solve()
        self.assertEqual(output['status'],'converged')
        circuit=output['circuit']; self.assertIsNone(circuit['mfc_generated_power_W'])
        self.assertGreater(circuit['mec_electrical_input_W'],0)
        self.assertEqual(circuit['mec_electrical_input_W'],-circuit['signed_electrical_power_W'])

    def test_derived_extrema_use_global_cell_centers_and_stable_tie_break(self):
        fields = [{'id': 'solid_potential_anode', 'unit': 'V',
                   'values': [2.0, 1.0, 1.0, 4.0], 'cells': [3, 7, 2, 4]}]
        mesh = {
            'centers_m': [[0.1, 0.2], [0.2, 0.2], [0.3, 0.2],
                          [0.4, 0.2], [0.5, 0.2], [0.6, 0.2],
                          [0.7, 0.2], [0.8, 0.2]],
            'sizes_m': [[0.1, 0.2]] * 8,
            'region_index': [0, 0, 1, 1, 1, 1, 2, 2],
        }
        layers = [{'tag': 'anode'}, {'tag': 'membrane'}, {'tag': 'cathode'}]

        result = derive_field_extrema(fields, mesh, layers)

        self.assertEqual(result[0]['minimum'], {
            'value': 1.0, 'unit': 'V', 'cell_index': 2, 'cell_center_m': [0.3, 0.2],
            'cell_size_m': [0.1, 0.2], 'region_index': 1, 'domain_tag': 'membrane',
        })
        self.assertEqual(result[0]['maximum']['cell_index'], 4)
        invalid = copy.deepcopy(fields)
        invalid[0]['cells'][0] = len(mesh['centers_m'])
        with self.assertRaises(ValueError):
            derive_field_extrema(invalid, mesh, layers)

    def test_solve_extrema_match_each_persisted_field_and_mesh(self):
        output = Cell(self.fixture()).solve()
        self.assertEqual(len(output['field_extrema']), len(output['fields']))
        by_id = {field['id']: field for field in output['fields']}
        tags = [layer['tag'] for layer in self.fixture()['geometry']['layers']]
        for entry in output['field_extrema']:
            field = by_id[entry['field_id']]
            for statistic, sign in (('minimum', 1), ('maximum', -1)):
                point = entry[statistic]
                sample = min(
                    range(len(field['values'])),
                    key=lambda index: (
                        sign * field['values'][index], field['cells'][index],
                    ),
                )
                cell = field['cells'][sample]
                self.assertEqual(point['value'], field['values'][sample])
                self.assertEqual(point['cell_index'], cell)
                self.assertEqual(point['cell_center_m'], output['mesh']['centers_m'][cell])
                self.assertEqual(point['cell_size_m'], output['mesh']['sizes_m'][cell])
                self.assertEqual(point['region_index'], output['mesh']['region_index'][cell])
                self.assertEqual(point['domain_tag'], tags[point['region_index']])

    def test_units_provenance_stoichiometry_and_artifact_identity_fail_closed(self):
        for mutate in (lambda v:v['species'][0]['initial_concentration'].pop('source_ref'),
                       lambda v:v['species'][0]['initial_concentration'].update(unit='mg/L'),
                       lambda v:v['electrodes'][0]['stoichiometry']['oxidized'].update(value=2),
                       lambda v:v['species'][0].update(id='../../escape')):
            value=self.fixture(); mutate(value)
            with self.assertRaises(ValueError): validate(value)

    def test_case_context_identity_and_component_mapping_are_metadata_only(self):
        value=self.fixture()
        expected=Cell(value).solve()['circuit']
        value['case_context']={'version':'structured-cell-case-context-v1','case_id':'synthetic-case','evaluation_id':'synthetic-evaluation','normalized_case_sha256':'a'*64,'mapping_policy':'explicit_layer_to_case_stack_block_v1','architecture_family':'synthetic-planar','input_role':'source_traced_case_development_input','decision_eligible':False,'component_domains':[{'domain_tag':'anode','stack_block':'anode_biofilm_support'},{'domain_tag':'membrane','stack_block':'membrane_or_separator'},{'domain_tag':'cathode','stack_block':'cathode_catalyst_support'}]}
        self.assertEqual(Cell(value).solve()['circuit'],expected)
        for mutate in (lambda c:c.update(decision_eligible=True), lambda c:c.update(normalized_case_sha256='bad'), lambda c:c['component_domains'][1].update(stack_block='reactor_architecture')):
            invalid=copy.deepcopy(value); mutate(invalid['case_context'])
            with self.assertRaises(ValueError): validate(invalid)

if __name__ == '__main__': unittest.main()
