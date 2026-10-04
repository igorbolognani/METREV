#!/usr/bin/env python3
"""Execute bounded synthetic solves and persist measured, scope-bound gate evidence.

Fast executes 2D/3D MFC/MEC. Full adds three-mesh refinement/tolerance/performance.
These are mathematical/software checks, never empirical validation.
"""
import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import sys
import time

import numpy as np
import scipy

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'apps/spatial-sidecar'))
from metrev_spatial.structured_cell import Cell, PROCESS_PROTOCOL_VERSION, SOLVER_VERSION, topology


def digest(value):
    return hashlib.sha256(json.dumps(value, allow_nan=False, sort_keys=True,
                                   separators=(',', ':')).encode()).hexdigest()


def fixture(dimension, system, factor=1):
    value = json.loads((ROOT / 'tests/fixtures/structured-cell.json').read_text())
    value['reservoir_faces'] = ['y_min']
    value['geometry']['lengths_m'][1]['value'] = .0003
    value['geometry']['transverse_cells'] = [3 * factor]
    for index, layer in enumerate(value['geometry']['layers']):
        layer['cells'] = 2 * factor
        layer['electrolyte_conductivity']['value'] = [.7, .15, 1.1][index]
        for parameter in layer['diffusivity'].values():
            parameter['value'] *= [1, .25, 1.7][index]
    value['numerics']['max_evaluations'] = 1000
    if dimension == 3:
        value['dimension'] = 3
        value['geometry']['lengths_m'].append(value['geometry'].pop('out_of_plane_depth'))
        value['geometry']['transverse_cells'].append(2)
    if system == 'MEC':
        value['system'] = system
        value['circuit'] = {'kind': 'applied_voltage',
                            'voltage': dict(value['electrodes'][1]['equilibrium_potential'], value=.1)}
    return value


def assertion(name, actual, expected=0., tolerance=1e-6, unit='1'):
    return dict(name=name, actual=float(actual), expected=float(expected),
                tolerance=float(tolerance), unit=unit)


def run(mode):
    evidence = []
    scopes = []
    elapsed = []
    source_hash = hashlib.sha256((ROOT / 'apps/spatial-sidecar/metrev_spatial/structured_cell.py').read_bytes()).hexdigest()
    executed_at = datetime.now(timezone.utc).isoformat()
    run_id = 'synthetic-verification-' + executed_at
    for dimension in (2, 3):
        for system in ('MFC', 'MEC'):
            inp = fixture(dimension, system)
            start = time.perf_counter()
            output = Cell(inp).solve()
            elapsed.append(time.perf_counter() - start)
            scope = dict(model_id=inp['model_id'], dimension=dimension, system=system,
                         input_sha256=digest(inp), mesh_sha256=digest(output['mesh']),
                         solver_version=SOLVER_VERSION, runtime_version=PROCESS_PROTOCOL_VERSION,
                         runtime_source_sha256=source_hash, time_mode='steady', advection=False)
            scopes.append(scope)

            def record(gate, assertions, method, related_runs=None):
                valid = all(np.isfinite(a['actual']) and abs(a['actual'] - a['expected']) <= a['tolerance'] for a in assertions)
                entry = dict(gate=gate, category='numerical', scope=scope,
                             status='passed' if valid else 'failed', assertions=assertions,
                             method=method, data_role='test_fixture', run_id=run_id,
                             executed_at=executed_at)
                if related_runs is not None:
                    entry['related_runs'] = related_runs
                evidence.append(entry)

            for gate, kinds in [('mass_conservation', ['species_mass']),
                                ('charge_conservation', ['ionic_charge', 'solid_charge', 'circuit_closure'])]:
                residuals = [r for r in output['residuals'] if r['kind'] in kinds]
                checks = [assertion(r['balance_id'], r['relative_residual'], tolerance=r['tolerance']) for r in residuals]
                checks.append(assertion('required_balance_classes_present', int(all(any(r['kind'] == kind for r in residuals) for kind in kinds)), expected=1, tolerance=0))
                checks.append(assertion('converged', int(output['status'] == 'converged'), expected=1, tolerance=0))
                record(gate, checks, 'Measured local/global finite-volume balance residuals from native solve.')
            concentration = [v for field in output['fields'] if field['unit'] == 'mol/m3' for v in field['values']]
            finite = all(np.isfinite(field['values']).all() for field in output['fields'])
            record('positivity', [assertion('negative_concentrations', sum(v < 0 for v in concentration), tolerance=0),
                                  assertion('all_fields_finite', int(finite), expected=1, tolerance=0)],
                   'Inspect all native concentration and potential arrays without clipping.')
            record('nonlinear_convergence', [assertion('final_scaled_residual', output['history'][-1], tolerance=inp['numerics']['nonlinear_tolerance'])],
                   'Inspect actual sparse Newton termination history.')
            circuit = output['circuit']
            power = circuit['anodic_current_A'] * circuit['collector_voltage_V']
            accounting = [assertion('signed_power_identity', circuit['signed_electrical_power_W'] - power, tolerance=1e-20, unit='W')]
            if system == 'MFC':
                accounting += [assertion('generated_power_identity', circuit['mfc_generated_power_W'] - power, tolerance=1e-20, unit='W'),
                               assertion('generation_sign', int(power >= 0), expected=1, tolerance=0)]
            else:
                accounting += [assertion('input_power_identity', circuit['mec_electrical_input_W'] + power, tolerance=1e-20, unit='W'),
                               assertion('consumption_sign', int(circuit['mec_electrical_input_W'] > 0), expected=1, tolerance=0)]
            record('electrical_accounting', accounting, 'Evaluate I×V and separate MFC generation from MEC electrical input.')
            equilibrium = copy.deepcopy(inp)
            equilibrium['electrodes'][1]['equilibrium_potential']['value'] = 0
            if system == 'MEC':
                equilibrium['electrodes'][1]['equilibrium_potential']['value'] = -equilibrium['circuit']['voltage']['value']
            zero = Cell(equilibrium).solve()
            record('zero_current', [assertion('equilibrium_current', zero['circuit']['anodic_current_A'], tolerance=1e-18, unit='A'),
                                    assertion('equilibrium_converged', int(zero['status'] == 'converged'), expected=1, tolerance=0)],
                   'Execute equilibrium potentials matched to the collector/load boundary, eliminating electrochemical driving force.')
            equilibrium_concentration_error = max(
                np.max(np.abs(np.array(field['values']) - species['reservoir_concentration']['value']))
                for field, species in zip(zero['fields'], equilibrium['species']))
            record('zero_reaction', [assertion('equilibrium_uniform_concentration_error', equilibrium_concentration_error, tolerance=1e-12, unit='mol/m3'),
                                     assertion('equilibrium_current', zero['circuit']['anodic_current_A'], tolerance=1e-18, unit='A')],
                   'No homogeneous reaction is selected; execute zero net Faradaic drive and verify the uniform, source-free concentration solution.')
            if PROCESS_PROTOCOL_VERSION in ['structured-cell-process-v4', 'structured-cell-process-v5', 'structured-cell-process-v6']:
                no_flow = copy.deepcopy(inp)
                mesh = topology(no_flow)
                velocity = dict(value=0, unit='m/s', source_kind='test_fixture', source_ref='synthetic:zero-prescribed-flow-limit')
                no_flow['advection'] = dict(version='structured-cell-prescribed-flow-v1',
                                            face_normal_velocity=[copy.deepcopy(velocity) for _ in mesh['faces']],
                                            boundary_normal_velocity=[copy.deepcopy(velocity) for _ in mesh['boundary']],
                                            inlet_concentrations={})
                zero_flow = Cell(no_flow).solve()
                difference = max(np.max(np.abs(np.array(a['values']) - np.array(b['values'])))
                                 for a, b in zip(output['fields'], zero_flow['fields']))
                record('zero_flow', [assertion('zero_velocity_field_difference', difference, tolerance=1e-12),
                                     assertion('zero_velocity_converged', int(zero_flow['status'] == 'converged'), expected=1, tolerance=0)],
                       'Execute explicitly sourced all-zero face/boundary velocities and compare every field with the no-advection formulation.')
            replay = Cell(inp).solve()
            replay_error = max(np.max(np.abs(np.array(a['values']) - np.array(b['values']))) for a, b in zip(output['fields'], replay['fields']))
            record('restart_reproducibility', [assertion('same_runtime_replay_maximum_field_difference', replay_error, tolerance=1e-12)],
                   'Fresh native Cell replay from identical sourced input; this does not establish checkpoint restart.')
            limited = copy.deepcopy(inp)
            limited['numerics']['max_evaluations'] = 1
            failed = Cell(limited).solve()
            record('nonconvergence_visibility', [assertion('failure_reported', int(failed['status'] == 'not_converged'), expected=1, tolerance=0),
                                                 assertion('failed_fields_retained', int(len(failed['fields']) >= 5), expected=1, tolerance=0),
                                                 assertion('failure_diagnostics_retained', int(bool(failed['history']) and bool(failed['residuals'])), expected=1, tolerance=0)],
                   'Execute intentionally exhausted evaluation budget and inspect diagnostic/field retention.')
            reduced = Cell(fixture(2, system)).solve()
            record('dimension_reduction', [assertion('extruded_relative_current_difference',
                                                     (circuit['anodic_current_A'] - reduced['circuit']['anodic_current_A']) / max(abs(reduced['circuit']['anodic_current_A']), 1e-30), tolerance=1e-5)],
                   'Compare physical current for equivalent planar and extruded geometry; not a general 2D-versus-1D validation.')
            if mode == 'full':
                levels = [output] + [Cell(fixture(dimension, system, factor)).solve() for factor in (2, 4)]
                means = [np.average(level['fields'][0]['values'], weights=level['mesh']['volumes_m3']) for level in levels]
                currents = [level['circuit']['anodic_current_A'] for level in levels]
                changes = np.abs(np.diff(currents))
                related = [dict(scope, input_sha256=digest(fixture(dimension, system, factor)), mesh_sha256=digest(level['mesh']), status=level['status'],
                                cell_count=len(level['mesh']['volumes_m3'])) for factor, level in zip((1, 2, 4), levels)]
                record('mesh_refinement', [assertion('three_levels_converged', sum(level['status'] == 'converged' for level in levels), expected=3, tolerance=0),
                                            assertion('current_successive_difference_ratio', changes[1] / max(changes[0], 1e-30), expected=0, tolerance=.4),
                                            assertion('medium_fine_current_relative_change', changes[1] / max(abs(currents[2]), 1e-30), tolerance=2e-5 if system == 'MFC' else 1e-4),
                                            assertion('medium_fine_concentration_mean_change', abs(means[2] - means[1]), tolerance=1e-5 if system == 'MFC' else 2e-5, unit='mol/m3')],
                       'Execute coarse/medium/fine native x/y meshes and compare conserved circuit/concentration observables. Extruded z resolution stays fixed; this is not full 3D refinement.', related)
                tight = copy.deepcopy(inp)
                # Both systems tighten by at least 10x. MEC's scaled residual
                # floor is ~1.12e-9 in this fixture; 1e-9 honestly fails line search.
                tight['numerics']['nonlinear_tolerance'] = 1e-9 if system == 'MFC' else 1e-8
                tight_output = Cell(tight).solve()
                record('nonlinear_tolerance_sensitivity', [assertion('tight_converged', int(tight_output['status'] == 'converged'), expected=1, tolerance=0),
                                                           assertion('relative_current_change', (tight_output['circuit']['anodic_current_A'] - circuit['anodic_current_A']) / max(abs(circuit['anodic_current_A']), 1e-30), tolerance=2e-6)],
                       'Execute tighter nonlinear tolerance and compare circuit current.')
    return dict(version='model-verification-evidence-v1', mode=mode,
                generated_at=executed_at, scopes=scopes, evidence=evidence,
                environment=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__),
                performance=dict(coarse_solve_seconds=elapsed, role='diagnostic_only_no_portable_performance_claim'),
                status='passed' if all(record['status'] == 'passed' for record in evidence) else 'failed',
                decision_eligible=False, independent_validation=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode', choices=['fast', 'full'], default='fast')
    parser.add_argument('--output', type=Path, default=ROOT / 'test-results/numerical-verification/evidence.json')
    args = parser.parse_args()
    result = run(args.mode)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, allow_nan=False, indent=2) + '\n')
    failed = [f"{record['scope']['dimension']}D {record['scope']['system']} {record['gate']}" for record in result['evidence'] if record['status'] == 'failed']
    print(json.dumps(dict(status=result['status'], mode=args.mode, scoped_runs=len(result['scopes']),
                          executed_checks=len(result['evidence']), failed=failed, output=str(args.output))))
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
