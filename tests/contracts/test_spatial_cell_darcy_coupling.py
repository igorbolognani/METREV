"""Restricted Darcy face coupling and boundary-driven pressure verification."""
import copy
import json
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, darcy_flow, prescribed_darcy_flow, topology, validate

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'


def sourced(value, unit):
    return {'value': value, 'unit': unit, 'source_kind': 'test_fixture',
            'source_ref': 'synthetic:prescribed-darcy-linear-pressure'}


def darcy_fixture(dimension=2, gradient=1000., solve_pressure=False, pressure_offset=10.):
    value = json.loads(FIXTURE.read_text())
    value['geometry']['layers'][1]['kind'] = 'separator'
    if dimension == 3:
        value['dimension'] = 3
        value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
        value['geometry']['transverse_cells'].append(2)
    mesh = topology(value)
    pressure = lambda y: pressure_offset - gradient*y
    value['hydraulics'] = {
        'version': ('structured-cell-darcy-pressure-solve-v1' if solve_pressure
                    else 'structured-cell-prescribed-darcy-v1'),
        'dynamic_viscosity': sourced(1e-3, 'Pa*s'),
        'permeability_by_region': {
            layer['tag']: sourced(
                (1e-12 if index == 0 else 2e-12 if index == 1 else 0.5e-12)
                if solve_pressure else 1e-12,
                'm2',
            )
            for index, layer in enumerate(value['geometry']['layers'])
        },
        'boundary_pressure': {
            'y_min': sourced(pressure(0), 'Pa'),
            'y_max': sourced(pressure(value['geometry']['lengths_m'][1]['value']), 'Pa'),
        },
        'impermeable_faces': ['z_min', 'z_max'] if dimension == 3 else [],
        'inlet_concentrations': {'y_min': {
            species['id']: copy.deepcopy(species['reservoir_concentration'])
            for species in value['species']
        }},
    }
    if not solve_pressure:
        value['hydraulics']['cell_pressure'] = [
            sourced(pressure(center[1]), 'Pa') for center in mesh['centers']
        ]
    return value


class DarcyCouplingTests(unittest.TestCase):
    def test_linear_pressure_generates_exact_conservative_face_velocity(self):
        for dimension in (2, 3):
            value = darcy_fixture(dimension)
            mesh = topology(value)
            interior, boundary, diagnostic = prescribed_darcy_flow(value, mesh)
            expected = 1e-6
            for velocity, face in zip(interior, mesh['faces']):
                self.assertAlmostEqual(velocity, expected if face[2] == 1 else 0., delta=1e-15)
            for velocity, face in zip(boundary, mesh['boundary']):
                target = face[2]*expected if face[1] == 1 else 0.
                self.assertAlmostEqual(velocity, target, delta=1e-15)
            np.testing.assert_allclose(diagnostic['divergence'], 0., atol=1e-24)

    def test_prescribed_darcy_exports_velocity_without_claiming_input_pressure(self):
        output = Cell(darcy_fixture()).solve()
        self.assertEqual(output['status'], 'converged')
        fields = {field['id']: field for field in output['fields']}
        self.assertNotIn('darcy_pressure', fields)
        self.assertIn('darcy_velocity_x', fields)
        self.assertIn('darcy_velocity_y', fields)
        np.testing.assert_allclose(fields['darcy_velocity_x']['values'], 0., atol=1e-15)
        np.testing.assert_allclose(fields['darcy_velocity_y']['values'], 1e-6, atol=1e-15)
        volume = [r for r in output['residuals'] if r['kind'] == 'fluid_volume']
        self.assertEqual(len(volume), 1)
        self.assertTrue(volume[0]['passed'])

    def test_boundary_pressure_solve_reconstructs_2d_and_3d_flow(self):
        for dimension in (2, 3):
            value = darcy_fixture(
                dimension, solve_pressure=True, pressure_offset=100.
            )
            mesh = topology(value)
            interior, boundary, diagnostic = darcy_flow(value, mesh)
            permeability = value['hydraulics']['permeability_by_region']
            np.testing.assert_allclose(
                diagnostic['pressure'],
                [100. - 1000. * center[1] for center in mesh['centers']],
                rtol=1e-12,
                atol=1e-12,
            )
            self.assertEqual(
                diagnostic['pressure_mode'],
                'structured-cell-darcy-pressure-solve-v1',
            )
            for velocity, face in zip(interior, mesh['faces']):
                expected = 1e3 * permeability[value['geometry']['layers'][mesh['regions'][face[0]]]['tag']]['value'] / 1e-3
                self.assertAlmostEqual(velocity, expected if face[2] == 1 else 0., delta=1e-15)
            for velocity, face in zip(boundary, mesh['boundary']):
                region = value['geometry']['layers'][mesh['regions'][face[0]]]['tag']
                expected = 1e3 * permeability[region]['value'] / 1e-3
                target = face[2]*expected if face[1] == 1 else 0.
                self.assertAlmostEqual(velocity, target, delta=1e-15)
            np.testing.assert_allclose(diagnostic['divergence'], 0., atol=1e-24)
            output = Cell(value).solve()
            self.assertEqual(output['status'], 'converged')
            fields = {field['id']: field for field in output['fields']}
            self.assertIn('darcy_pressure', fields)
            self.assertTrue(all(row['passed'] for row in output['residuals']))

    def test_boundary_pressure_solve_rejects_an_unanchored_domain(self):
        value = darcy_fixture(solve_pressure=True)
        value['hydraulics']['boundary_pressure'] = {}
        value['hydraulics']['impermeable_faces'] = ['y_min', 'y_max']
        value['hydraulics']['inlet_concentrations'] = {}
        with self.assertRaisesRegex(ValueError, 'requires a pressure boundary'):
            validate(value)

    def test_invalid_pressure_contracts_fail_closed(self):
        mutations = [
            lambda value: value['hydraulics']['cell_pressure'].pop(),
            lambda value: value['hydraulics']['cell_pressure'][0].update(value=12.),
            lambda value: value['hydraulics']['permeability_by_region'].pop('anode'),
            lambda value: value['hydraulics']['impermeable_faces'].append('y_min'),
            lambda value: value['hydraulics'].update(inlet_concentrations={}),
            lambda value: value.update(advection={'version': 'invalid'}),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                value = darcy_fixture(); mutate(value)
                with self.assertRaises(ValueError): validate(value)


if __name__ == '__main__':
    unittest.main()
