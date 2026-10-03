"""Prescribed-flow mathematical verification, not empirical hydraulic evidence."""
import copy
import json
from pathlib import Path
import sys
import unittest
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, topology, validate

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'


def sourced(value, unit):
    return {'value': value, 'unit': unit, 'source_kind': 'test_fixture',
            'source_ref': 'synthetic:steady-prescribed-advection-diffusion-loss'}


def advective_fixture(dimension=2, cells=4, velocity=1e-6, axis=1):
    inp = json.loads(FIXTURE.read_text())
    if dimension == 3:
        inp['dimension'] = 3
        inp['geometry']['lengths_m'].append(inp['geometry'].pop('out_of_plane_depth'))
        inp['geometry']['transverse_cells'].append(2)
    inp['geometry']['transverse_cells'][axis - 1] = cells
    inp['geometry']['layers'][1]['kind'] = 'separator'
    mesh = topology(inp)
    inlet = 'xyz'[axis] + ('_min' if velocity > 0 else '_max')
    inp['advection'] = {
        'version': 'structured-cell-prescribed-flow-v1',
        'face_normal_velocity': [sourced(velocity if f[2] == axis else 0, 'm/s') for f in mesh['faces']],
        'boundary_normal_velocity': [sourced(f[2]*velocity if f[1] == axis else 0, 'm/s') for f in mesh['boundary']],
        'inlet_concentrations': {inlet: {
            s['id']: copy.deepcopy(s['reservoir_concentration']) for s in inp['species']
        }} if velocity != 0 else {},
    }
    return inp


def loss_fixture(dimension=2, cells=4, velocity=1e-6, axis=1, diffusivity=1e-9, loss=1e-3):
    inp = advective_fixture(dimension, cells, velocity, axis)
    inlet = 'xyz'[axis] + ('_min' if velocity > 0 else '_max')
    inp['reservoir_faces'] = [inlet]
    inp['electrodes'][1]['equilibrium_potential']['value'] = 0
    for electrode in inp['electrodes']:
        electrode['forward_orders'] = {}; electrode['reverse_orders'] = {}
    for name, initial in [('substrate', 1), ('product', 0)]:
        species = copy.deepcopy(inp['species'][0]); species['id'] = name
        species['initial_concentration'] = sourced(initial, 'mol/m3')
        species['reservoir_concentration'] = sourced(initial, 'mol/m3')
        inp['species'].append(species)
        inp['advection']['inlet_concentrations'][inlet][name] = sourced(initial, 'mol/m3')
        for layer in inp['geometry']['layers']:
            layer['diffusivity'][name] = sourced(diffusivity, 'm2/s')
    inp['reactions'] = [{
        'id': 'conversion_'+layer['tag'], 'domain_tag': layer['tag'],
        'equation_ref': 'synthetic:first-order-conservative-conversion',
        'stoichiometry': {'substrate': sourced(-1, '1'), 'product': sourced(1, '1')},
        'law': {'kind': 'mass_action', 'rate': sourced(loss, 'mol/(m3*s)'),
                'orders': {'substrate': sourced(1, '1')}},
    } for layer in inp['geometry']['layers']]
    inp['numerics']['nonlinear_tolerance'] = 1e-9
    inp['numerics']['species_rate_scale'] = sourced(max(loss, 1e-4), 'mol/(m3*s)')
    return inp


def analytic_loss(position, length, velocity, diffusivity, loss):
    # Stable form for C(0)=1 and C'(L)=0, including large advective Peclet.
    root = np.sqrt(velocity**2 + 4*diffusivity*loss)
    minus = -2*loss/(velocity + root)
    plus = (velocity + root)/(2*diffusivity)
    ratio = minus/plus
    return (np.exp(minus*position) - ratio*np.exp(minus*length + plus*(position-length))) / (
        1 - ratio*np.exp((minus-plus)*length))


class PrescribedFlowTests(unittest.TestCase):
    def test_zero_velocity_recovers_existing_coupled_equations_exactly(self):
        for dimension in (2, 3):
            inp = advective_fixture(dimension, velocity=0)
            inp['geometry']['layers'][1]['kind'] = 'membrane'
            baseline = copy.deepcopy(inp); baseline.pop('advection')
            a, b = [Cell(v).solve() for v in (baseline, inp)]
            self.assertEqual(a, b)

    def test_constant_state_and_real_charge_coupling_both_dimensions(self):
        for dimension in (2, 3):
            value = advective_fixture(dimension)
            output = Cell(value).solve()
            self.assertEqual(output['status'], 'converged')
            self.assertTrue(all(v['passed'] for v in output['residuals']))
            self.assertGreater(output['circuit']['anodic_current_A'], 0)
            value['electrodes'][1]['equilibrium_potential']['value'] = 0
            equilibrium = Cell(value).solve()
            self.assertEqual(equilibrium['status'], 'converged')
            for field in equilibrium['fields']:
                if field['unit'] == 'mol/m3':
                    np.testing.assert_allclose(field['values'], 1, atol=1e-14)

    def test_analytic_conversion_refines_and_conserves_each_species_in_2d_3d(self):
        for dimension, axis, sign in [(2, 1, 1), (2, 1, -1), (3, 1, 1), (3, 2, 1)]:
            errors = []
            for cells in (4, 8, 16):
                inp = loss_fixture(dimension, cells, sign*1e-6, axis)
                output = Cell(inp).solve()
                self.assertEqual(output['status'], 'converged')
                self.assertTrue(all(r['passed'] for r in output['residuals']))
                fields = {f['id']: np.array(f['values']) for f in output['fields']}
                positions = np.array(output['mesh']['centers_m'])[:, axis]
                length = inp['geometry']['lengths_m'][axis]['value']
                if sign < 0: positions = length - positions
                expected = analytic_loss(positions, length, 1e-6, 1e-9, 1e-3)
                errors.append(np.max(np.abs(fields['concentration_substrate'] - expected)))
                np.testing.assert_allclose(fields['concentration_substrate'] + fields['concentration_product'], 1, atol=2e-12)
            self.assertLess(errors[1], .75*errors[0])
            self.assertLess(errors[2], .75*errors[1])
            self.assertLess(errors[2], .012)

    def test_high_peclet_remains_positive_without_clipping(self):
        output = Cell(loss_fixture(cells=16, velocity=1e-3, diffusivity=1e-12, loss=1)).solve()
        self.assertEqual(output['status'], 'converged')
        fields = {f['id']: np.array(f['values']) for f in output['fields']}
        self.assertGreater(fields['concentration_substrate'].min(), 0)
        self.assertLess(fields['concentration_substrate'].max(), 1)
        np.testing.assert_allclose(fields['concentration_substrate'] + fields['concentration_product'], 1, atol=1e-12)

    def test_shared_interface_advection_in_closed_circulation_is_conservative(self):
        inp = advective_fixture(cells=2, velocity=0)
        mesh = topology(inp)
        # A declared closed four-cell cycle crosses the anode/separator face.
        cycle = {(2, 4): 1e-13, (4, 5): 1e-13,
                 (3, 5): -1e-13, (2, 3): -1e-13}
        for index, (i, j, _, area, *_) in enumerate(mesh['faces']):
            inp['advection']['face_normal_velocity'][index]['value'] = cycle.get((i, j), 0)/area
        output = Cell(inp).solve()
        self.assertEqual(output['status'], 'converged')
        self.assertTrue(all(v['passed'] for v in output['residuals']))
        self.assertIn('interface:anode:membrane', output['interface_species_flux_mol_s'])

    def test_flowing_extruded_2d_3d_preserves_total_physical_current(self):
        planar, spatial = [Cell(advective_fixture(d)).solve() for d in (2, 3)]
        self.assertEqual(planar['status'], 'converged')
        self.assertEqual(spatial['status'], 'converged')
        np.testing.assert_allclose(planar['circuit']['anodic_current_A'],
                                   spatial['circuit']['anodic_current_A'], rtol=1e-6)

    def test_advective_sparse_jacobian_matches_directional_difference(self):
        for velocity in (1e-6, -1e-6):
            cell = Cell(loss_fixture(3, cells=3, velocity=velocity))
            out = cell.solve(); fields = {f['id']: f for f in out['fields']}
            x = np.concatenate([
                *[np.array(fields['concentration_'+s['id']]['values'])/cell.cs for s in cell.input['species']],
                np.array(fields['liquid_potential']['values'])/cell.ps,
                *[np.array(fields['solid_potential_'+e['role']]['values'])/cell.ps for e in cell.input['electrodes']],
                [out['circuit']['collector_voltage_V']/cell.ps],
            ])
            direction = np.random.default_rng(32).normal(size=cell.size)
            h = 1e-7
            numeric = (cell.residual(x+h*direction) - cell.residual(x-h*direction))/(2*h)
            np.testing.assert_allclose(cell.jacobian(x)@direction, numeric, rtol=3e-6, atol=1e-4)

    def test_flow_must_be_complete_sourced_incompressible_and_membrane_impermeable(self):
        mutations = [
            lambda v: v['advection']['face_normal_velocity'].pop(),
            lambda v: v['advection']['boundary_normal_velocity'][0].update(value=1e-6),
            lambda v: v['advection']['face_normal_velocity'][0].update(unit='m3/s'),
            lambda v: v['advection']['face_normal_velocity'][0].pop('source_ref'),
            lambda v: v['advection']['inlet_concentrations'].clear(),
            lambda v: v['advection']['inlet_concentrations']['y_min'].pop('reduced'),
            lambda v: v['geometry']['layers'][1].update(kind='membrane'),
            lambda v: v['advection']['face_normal_velocity'][1].update(value=2e-6),
        ]
        for mutation in mutations:
            value = advective_fixture(); mutation(value)
            with self.assertRaises(ValueError): validate(value)

    def test_faradic_field_is_actual_current_source_and_nonconvergence_survives(self):
        inp = advective_fixture(); output = Cell(inp).solve()
        field = next(f for f in output['fields'] if f['id'] == 'faradaic_current_density')
        values = np.array(field['values']); volumes = np.array(output['mesh']['volumes_m3'])
        regions = np.array(output['mesh']['region_index'])
        self.assertEqual(field['unit'], 'A/m3')
        np.testing.assert_equal(values[regions == 1], 0)
        self.assertAlmostEqual(np.sum(values[regions == 0]*volumes[regions == 0]), output['circuit']['anodic_current_A'], delta=1e-16)
        self.assertAlmostEqual(np.sum(values*volumes), 0, delta=1e-16)
        inp['numerics']['max_evaluations'] = 1
        failed = Cell(inp).solve()
        self.assertEqual(failed['status'], 'not_converged')
        self.assertEqual(failed['termination_reason'], 'maximum_evaluations')
        self.assertEqual(len(failed['fields']), 6)


if __name__ == '__main__':
    unittest.main()
