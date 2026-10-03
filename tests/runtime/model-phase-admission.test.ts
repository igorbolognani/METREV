import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { evaluateModelPhaseAdmission } from '../../scripts/lib/model-phase-admission.mjs';
import { buildDoctorReport } from '../../scripts/lib/research-diagnostics.mjs';

const scope = {
  model_id: 'structured-cell-supporting-electrolyte-v1',
  dimension: 2,
  system: 'MFC',
  input_sha256: 'a'.repeat(64),
  mesh_sha256: 'b'.repeat(64),
  solver_version: 'structured-cell-fv-v1',
  runtime_version: 'structured-cell-process-v3',
  runtime_source_sha256: createHash('sha256')
    .update(
      readFileSync(
        resolve('apps/spatial-sidecar/metrev_spatial/structured_cell.py'),
      ),
    )
    .digest('hex'),
  time_mode: 'steady',
  advection: false,
};
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function bundle() {
  return {
    version: 'model-verification-evidence-v1',
    scopes: [scope],
    evidence: [] as ReturnType<typeof record>[],
  };
}

function record(gate: string, category = 'numerical') {
  return {
    gate,
    category,
    scope: { ...scope },
    status: 'passed',
    method: 'Execute native regression and inspect measured residual.',
    data_role: 'test_fixture',
    run_id: 'regression-1',
    executed_at: '2026-10-03T13:00:00Z',
    assertions: [
      {
        name: 'measured_residual',
        actual: 1e-8,
        expected: 0,
        tolerance: 1e-6,
        unit: '1',
      },
    ],
    related_runs: [1, 2, 4].map((factor) => ({
      ...scope,
      status: 'converged',
      time_step_s: undefined as number | undefined,
      input_sha256: String(factor).repeat(64),
      mesh_sha256: String(factor + 1).repeat(64),
      cell_count: 18 * factor ** 2,
    })),
    dataset_id: 'holdout-independent',
    dataset_sha256: 'c'.repeat(64),
    condition_matched: true,
    review_state: 'accepted',
    used_for_calibration: false,
  };
}

describe('measured model phase admission', () => {
  it('rejects unregistered model policies and unsupported dimensions without downgrade', () => {
    expect(() =>
      evaluateModelPhaseAdmission(bundle(), {
        ...scope,
        model_id: 'unregistered-cell',
      }),
    ).toThrow();
    expect(() =>
      evaluateModelPhaseAdmission(bundle(), { ...scope, dimension: 1 }),
    ).toThrow();
  });
  it('returns actionable gaps and no promotions from declarations without executions', () => {
    const result = evaluateModelPhaseAdmission(bundle(), scope);
    expect(
      Object.values(result.admission).every((value) => value === false),
    ).toBe(true);
    expect(result.groups.numerical.gaps).toContainEqual(
      expect.objectContaining({
        gate: 'mass_conservation',
        reason: 'evidence_missing',
      }),
    );
    expect(
      result.groups.product.gaps.find((gap) => gap.gate === 'case_runner')
        ?.action,
    ).toContain('2D MFC');
    expect(result.decision_eligible).toBe(false);
  });

  it.each([
    'dimension',
    'system',
    'model_id',
    'input_sha256',
    'mesh_sha256',
    'solver_version',
    'runtime_version',
    'runtime_source_sha256',
    'time_mode',
    'advection',
  ])('rejects evidence belonging to another %s', (key) => {
    const evidence = record('mass_conservation');
    evidence.scope[key] =
      key === 'dimension' ? 3 : key === 'advection' ? true : 'other';
    const input = bundle();
    input.evidence.push(evidence);
    const result = evaluateModelPhaseAdmission(input, scope);
    expect(result.groups.numerical.passed).not.toContain('mass_conservation');
    expect(
      result.groups.numerical.gaps.find(
        (gap) => gap.gate === 'mass_conservation',
      )?.reason,
    ).toBe('evidence_scope_mismatch');
  });

  it('recomputes numerical acceptance even if a record declares PASS', () => {
    for (const invalid of [1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const evidence = record('mass_conservation');
      evidence.assertions[0].actual = invalid;
      const input = bundle();
      input.evidence.push(evidence);
      expect(
        evaluateModelPhaseAdmission(input, scope).groups.numerical.passed,
      ).not.toContain('mass_conservation');
    }
  });

  it('keeps a failing execution visible alongside older successful evidence', () => {
    const input = bundle();
    const failed = record('mass_conservation');
    failed.status = 'failed';
    input.evidence.push(record('mass_conservation'), failed);
    const result = evaluateModelPhaseAdmission(input, scope);
    expect(
      result.groups.numerical.gaps.find(
        (gap) => gap.gate === 'mass_conservation',
      )?.reason,
    ).toBe('executed_check_failed');
  });

  it('requires three distinct measured meshes for refinement', () => {
    const evidence = record('mesh_refinement');
    evidence.related_runs[1].mesh_sha256 = evidence.related_runs[0].mesh_sha256;
    const input = bundle();
    input.evidence.push(evidence);
    expect(
      evaluateModelPhaseAdmission(input, scope).groups.numerical.gaps.find(
        (gap) => gap.gate === 'mesh_refinement',
      )?.reason,
    ).toBe('three_distinct_refinement_runs_required');
  });

  it('requires timestep and advection verification only for an explicitly matching regime', () => {
    const transient = { ...scope, time_mode: 'transient', advection: true };
    const result = evaluateModelPhaseAdmission(bundle(), transient);
    expect(result.groups.numerical.gaps.map((gap) => gap.gate)).toEqual(
      expect.arrayContaining([
        'time_refinement',
        'analytical_advection_diffusion',
      ]),
    );
    expect(
      evaluateModelPhaseAdmission(bundle(), scope).groups.numerical.gaps.map(
        (gap) => gap.gate,
      ),
    ).not.toContain('time_refinement');
  });

  it('rejects timestep evidence with changed spatial mesh or repeated steps', () => {
    const transient = { ...scope, time_mode: 'transient' };
    const input = bundle();
    const time = record('time_refinement');
    time.scope = transient;
    time.related_runs = [1, 2, 4].map((factor) => ({
      ...transient,
      status: 'converged',
      input_sha256: String(factor).repeat(64),
      mesh_sha256: scope.mesh_sha256,
      cell_count: 18,
      time_step_s: 1 / factor,
    }));
    input.evidence.push(time);
    expect(
      evaluateModelPhaseAdmission(input, transient).groups.numerical.passed,
    ).toContain('time_refinement');
    time.related_runs[1].mesh_sha256 = 'e'.repeat(64);
    expect(
      evaluateModelPhaseAdmission(input, transient).groups.numerical.passed,
    ).not.toContain('time_refinement');
    time.related_runs[1].mesh_sha256 = scope.mesh_sha256;
    time.related_runs[1].time_step_s = 1;
    expect(
      evaluateModelPhaseAdmission(input, transient).groups.numerical.passed,
    ).not.toContain('time_refinement');
  });

  it('separates numerical maturity from product integration and independent validation', () => {
    const input = bundle();
    const required = evaluateModelPhaseAdmission(input, scope).groups.numerical
      .gaps;
    input.evidence.push(...required.map((gap) => record(gap.gate)));
    const result = evaluateModelPhaseAdmission(input, scope);
    expect(result.admission.numerically_verified).toBe(true);
    expect(result.admission.development_integrated).toBe(false);
    expect(result.admission.phase2_functional).toBe(false);
    expect(result.admission.independently_validated).toBe(false);
    expect(result.admission.production_eligible).toBe(false);
  });

  it('rejects synthetic experimental records and calibration data masquerading as holdout', () => {
    const input = bundle();
    input.evidence.push(record('experimental_comparison', 'experimental'));
    expect(
      evaluateModelPhaseAdmission(input, scope).groups.experimental.gaps[0]
        .reason,
    ).toBe('synthetic_data_cannot_establish_experimental_maturity');
    const held = record('independent_holdout', 'independent');
    held.data_role = 'development_case';
    held.used_for_calibration = true;
    input.evidence.push(held);
    expect(
      evaluateModelPhaseAdmission(input, scope).groups.independent.gaps.find(
        (gap) => gap.gate === 'independent_holdout',
      )?.reason,
    ).toBe('independent_holdout_missing');
  });

  it('keeps 3D production closed when Phase 3 architecture/refinement/performance gates are missing', () => {
    const spatial = { ...scope, dimension: 3 };
    const input = bundle();
    const required = evaluateModelPhaseAdmission(input, spatial).groups;
    for (const [category, group] of Object.entries(required)) {
      for (const gap of group.gaps) {
        const evidence = record(gap.gate, category);
        evidence.scope = spatial;
        evidence.related_runs = evidence.related_runs.map((level) => ({
          ...level,
          dimension: 3,
        }));
        if (category === 'product' || category === 'experimental')
          evidence.data_role = 'development_case';
        if (category === 'independent')
          evidence.data_role = 'independent_observation';
        input.evidence.push(evidence);
      }
    }
    const result = evaluateModelPhaseAdmission(input, spatial);
    expect(result.admission.development_integrated).toBe(true);
    expect(result.admission.independently_validated).toBe(true);
    expect(result.admission.phase3_functional).toBe(false);
    expect(result.admission.production_eligible).toBe(false);
    expect(result.decision_eligible).toBe(false);
  });

  it('prevents fixture-only case integration from admitting the product pathway', () => {
    const input = bundle();
    input.evidence.push(record('case_runner', 'product'));
    expect(
      evaluateModelPhaseAdmission(input, scope).groups.product.gaps.find(
        (gap) => gap.gate === 'case_runner',
      )?.reason,
    ).toBe('real_normalized_case_required');
  });

  it('integrates scoped admission into the offline doctor and rejects stale solver evidence', async () => {
    const directory = await mkdtemp(
      resolve(tmpdir(), 'metrev-phase-evidence-'),
    );
    directories.push(directory);
    const path = resolve(directory, 'evidence.json');
    await writeFile(path, JSON.stringify(bundle()));
    let report = await buildDoctorReport(process.cwd(), {
      env: {},
      verificationEvidence: path,
    });
    const check = report.checks.find(
      (entry) => entry.label === 'model-phase-admission',
    );
    expect(check?.status).toBe('WARN');
    expect(check?.payload.admissions[0].admission.production_eligible).toBe(
      false,
    );
    const corrupt = bundle();
    corrupt.evidence.push(record('mass_conservation'));
    corrupt.evidence[0].assertions[0].actual = 1;
    await writeFile(path, JSON.stringify(corrupt));
    report = await buildDoctorReport(process.cwd(), {
      env: {},
      verificationEvidence: path,
    });
    expect(
      report.checks.find((entry) => entry.label === 'model-phase-admission')
        ?.status,
    ).toBe('FAIL');
    const stale = bundle();
    stale.scopes = [{ ...scope, runtime_source_sha256: 'd'.repeat(64) }];
    await writeFile(path, JSON.stringify(stale));
    report = await buildDoctorReport(process.cwd(), {
      env: {},
      verificationEvidence: path,
    });
    expect(
      report.checks.find((entry) => entry.label === 'model-phase-admission')
        ?.status,
    ).toBe('FAIL');
  });
});
