"""Mathematical verification only, never an experimental MFC benchmark."""
import copy
import json
from pathlib import Path
import sys
import unittest
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, derive_field_extrema, validate

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'

class StructuredCellTests(unittest.TestCase):
    def fixture(self, dimension=2):
        value = json.loads(FIXTURE.read_text())
        if dimension == 3:
            value['dimension'] = 3
            value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
            value['geometry']['transverse_cells'].append(2)
        return value

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
        solid = np.concatenate([np.array(f['values']) for f in output['fields'][3:]]) / cell.ps
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

    def test_budget_exhaustion_retains_diagnostics_and_fields(self):
        value=self.fixture(); value['numerics']['max_evaluations']=1
        output=Cell(value).solve()
        self.assertEqual(output['status'],'not_converged')
        self.assertEqual(len(output['fields']),5)
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
