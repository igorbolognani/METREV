"""Prescribed Darcy face coupling verification; not a hydraulic pressure solve."""
import copy
import json
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, prescribed_darcy_flow, topology, validate

FIXTURE = Path(__file__).resolve().parents[1] / 'fixtures/structured-cell.json'


def sourced(value, unit):
    return {'value': value, 'unit': unit, 'source_kind': 'test_fixture',
            'source_ref': 'synthetic:prescribed-darcy-linear-pressure'}


def darcy_fixture(dimension=2, gradient=1000.):
    value = json.loads(FIXTURE.read_text())
    value['geometry']['layers'][1]['kind'] = 'separator'
    if dimension == 3:
        value['dimension'] = 3
        value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
        value['geometry']['transverse_cells'].append(2)
    mesh = topology(value)
    pressure = lambda y: 10. - gradient*y
    value['hydraulics'] = {
        'version': 'structured-cell-prescribed-darcy-v1',
        'dynamic_viscosity': sourced(1e-3, 'Pa*s'),
        'permeability_by_region': {
            layer['tag']: sourced(1e-12, 'm2') for layer in value['geometry']['layers']
        },
        'cell_pressure': [sourced(pressure(center[1]), 'Pa') for center in mesh['centers']],
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
    return value


class PrescribedDarcyCouplingTests(unittest.TestCase):
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

    def test_darcy_flow_drives_cell_and_exports_pressure_velocity_fields(self):
        output = Cell(darcy_fixture()).solve()
        self.assertEqual(output['status'], 'converged')
        fields = {field['id']: field for field in output['fields']}
        self.assertIn('darcy_pressure', fields)
        self.assertIn('darcy_velocity_x', fields)
        self.assertIn('darcy_velocity_y', fields)
        np.testing.assert_allclose(fields['darcy_velocity_x']['values'], 0., atol=1e-15)
        np.testing.assert_allclose(fields['darcy_velocity_y']['values'], 1e-6, atol=1e-15)
        volume = [r for r in output['residuals'] if r['kind'] == 'fluid_volume']
        self.assertEqual(len(volume), 1)
        self.assertTrue(volume[0]['passed'])

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
