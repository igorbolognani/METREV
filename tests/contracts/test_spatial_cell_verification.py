"""Synthetic coupled-cell verification. No experimental accuracy claim."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'

def transverse_fixture(factor=1):
    value = json.loads(FIXTURE.read_text())
    value['reservoir_faces'] = ['y_min']
    value['geometry']['lengths_m'][1]['value'] = .0003
    value['geometry']['transverse_cells'] = [3*factor]
    for index, layer in enumerate(value['geometry']['layers']):
        layer['cells'] = 2*factor
        layer['electrolyte_conductivity']['value'] = [.7, .15, 1.1][index]
        for parameter in layer['diffusivity'].values():
            parameter['value'] *= [1, .25, 1.7][index]
    value['numerics']['max_evaluations'] = 1000
    return value

class CoupledCellVerificationTests(unittest.TestCase):
    def test_three_meshes_nonuniform_fields_and_conservative_observables(self):
        record = json.loads(FIXTURE.with_name('structured-cell-refinement-verification.json').read_text())
        runtime = FIXTURE.parents[1].parent / 'apps/spatial-sidecar/metrev_spatial/structured_cell.py'
        self.assertEqual(record['source_input_fixture_sha256'], hashlib.sha256(FIXTURE.read_bytes()).hexdigest())
        self.assertEqual(record['runtime_source_sha256'], hashlib.sha256(runtime.read_bytes()).hexdigest())
        outputs = [Cell(transverse_fixture(f)).solve() for f in (1, 2, 4)]
        observables = []
        for output in outputs:
            self.assertEqual(output['status'], 'converged')
            self.assertEqual(output['termination_reason'], 'nonlinear_and_conservation_passed')
            self.assertTrue(all(r['passed'] for r in output['residuals']))
            for field in output['fields']:
                self.assertTrue(np.isfinite(field['values']).all())
                if field['unit'] == 'mol/m3': self.assertGreaterEqual(min(field['values']), 0)
            volume = np.array(output['mesh']['volumes_m3'])
            concentrations = np.array(output['fields'][0]['values'])
            self.assertGreater(np.ptp(concentrations), .004)
            current = output['circuit']['anodic_current_A']
            voltage = output['circuit']['collector_voltage_V']
            self.assertAlmostEqual(voltage, current*1e7, delta=1e-7)
            observables.append([current, voltage, np.average(concentrations, weights=volume)])
        np.testing.assert_allclose([v[0] for v in observables], [v['circuit']['anodic_current_A'] for v in record['levels']], rtol=1e-6)
        np.testing.assert_allclose([v[2] for v in observables], [v['volume_weighted_reduced_mean_mol_m3'] for v in record['levels']], rtol=1e-8)
        observables = np.array(observables)
        changes = np.abs(np.diff(observables, axis=0))
        # Successive differences reduce; no manufactured exact cell solution is claimed.
        self.assertTrue((changes[1] < .4*changes[0]).all())
        self.assertLess(changes[1, 0]/abs(observables[2, 0]), 2e-5)
        self.assertLess(changes[1, 2], 1e-5)  # mol/m3

    def test_nonlinear_tolerance_sensitivity(self):
        loose = transverse_fixture(); tight = copy.deepcopy(loose)
        tight['numerics']['nonlinear_tolerance'] = 1e-9
        a, b = [Cell(v).solve() for v in (loose, tight)]
        self.assertEqual(b['status'], 'converged')
        np.testing.assert_allclose(a['circuit']['anodic_current_A'], b['circuit']['anodic_current_A'], rtol=2e-6)

    def test_reuse_resets_history_and_does_not_mutate_previous_result(self):
        cell = Cell(transverse_fixture())
        first = cell.solve(); saved = first['history'].copy(); second = cell.solve()
        self.assertEqual(first['history'], saved)
        self.assertEqual(second['history'], saved)

    def test_termination_matrix_retains_finite_unclipped_fields(self):
        for mode in ('budget', 'linear', 'nonfinite', 'positivity', 'line_search'):
            with self.subTest(mode=mode):
                value = transverse_fixture()
                if mode == 'budget': value['numerics']['max_evaluations'] = 1
                cell = Cell(value)
                expected = {'budget':'maximum_evaluations', 'linear':'linear_solve_failed',
                            'nonfinite':'nonfinite_newton_step', 'positivity':'positivity_step_blocked',
                            'line_search':'line_search_failed'}[mode]
                if mode == 'budget': output = cell.solve()
                else:
                    if mode == 'linear': options = {'side_effect': RuntimeError('synthetic failure')}
                    else:
                        step = np.zeros(cell.size)
                        if mode == 'nonfinite': step[0] = np.nan
                        if mode == 'positivity': step[0] = -1e15
                        options = {'return_value':step}
                    with patch('metrev_spatial.structured_cell.spsolve', **options): output = cell.solve()
                self.assertEqual(output['status'], 'not_converged')
                self.assertEqual(output['termination_reason'], expected)
                for field in output['fields']:
                    self.assertTrue(np.isfinite(field['values']).all())
                    if field['unit'] == 'mol/m3':
                        # No clipping, fabricated accepted state or misleading completed run.
                        np.testing.assert_equal(field['values'], np.ones(len(field['values'])))

if __name__ == '__main__': unittest.main()
