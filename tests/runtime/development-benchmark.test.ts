import { createHash } from 'node:crypto';
import { readFile, mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDevelopmentBenchmark } from '../../packages/database/scripts/export-development-benchmark.mjs';
import {
  assessBenchmarkEvidenceUse,
  classifyBenchmarkEvidence,
} from '../../packages/database/scripts/benchmark-validation-strata.mjs';

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

describe('provisional multi-source development benchmark export', () => {
  it('preserves all measured pairs and source identities without filling gaps', async () => {
    const a = await buildDevelopmentBenchmark();
    const b = await buildDevelopmentBenchmark();
    expect(a).toEqual(b);
    expect(a.manifest.exports).toMatchObject([
      { row_count: 39540, sha256: hash(a.observations) },
      { row_count: 290, sha256: hash(a.eisPairs) },
      { row_count: 26, sha256: hash(a.literatureClaims) },
    ]);
    expect(
      a.manifest.exclusions.time_series_missing_cells_not_interpolated,
    ).toBe(504);
    expect(a.manifest.independent_validation).toBe(false);
    expect(a.manifest.decision_eligible).toBe(false);
    expect(a.manifest.schema_version).toBe('metrev-development-benchmark-v2');
    expect(a.manifest.evidence_strata).toMatchObject([
      { tier: 'A', id: 'mathematical_manufactured', status: 'not_present' },
      { tier: 'B', id: 'published_model_reproduction', status: 'not_present' },
      {
        tier: 'C',
        id: 'component_experiment',
        status: 'source_traced_candidate_not_validated',
        record_count: 39830,
        record_count_basis:
          'exported_observation_rows_and_eis_pairs_not_study_count',
        validated: false,
      },
      {
        tier: 'D',
        id: 'condition_matched_full_cell_experiment',
        status: 'not_present',
      },
      {
        tier: 'E',
        id: 'independent_held_out_validation',
        status: 'not_present',
      },
    ]);
    expect(a.manifest.unclassified_aggregate_claim_count).toBe(26);
    expect(a.manifest.validation_gates.no_lower_stratum_substitution).toBe(
      true,
    );
    const incompleteRows = a.observations
      .split('\n')
      .filter(
        (line: string) =>
          line.includes('Cloth Ni76Fe16Mo8') &&
          line.includes('current_density'),
      );
    expect(incompleteRows).toHaveLength(3169);
    expect(
      incompleteRows.every((line: string) => line.includes('Hoja1!D')),
    ).toBe(true);
    expect(a.eisPairs).toContain('not_supplied');
    expect(a.observations).toContain('not_reported,pending');
    expect(a.observations).toContain('Hoja1!D2,Hoja1!A2');
    expect(a.observations).toContain(
      'component_experiment,source_traced_candidate_not_validated,component_comparison_after_condition_match_and_review',
    );
    const claims = a.literatureClaims
      .trimEnd()
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(
      new Set(claims.map((claim: { source_doi: string }) => claim.source_doi))
        .size,
    ).toBe(3);
    expect(
      claims.every(
        (claim: {
          independent_validation: boolean;
          decision_eligible: boolean;
        }) => !claim.independent_validation && !claim.decision_eligible,
      ),
    ).toBe(true);
    expect(
      claims.every(
        (claim: { evidence_stratum: string; eligible_use: string }) =>
          claim.evidence_stratum === 'unclassified_aggregate_claim' &&
          claim.eligible_use === 'context_only',
      ),
    ).toBe(true);
    expect(a.literatureClaims).not.toContain('"normalized_value":null');
  });

  it('rejects tampering with a registered numeric extract', async () => {
    const temp = await mkdtemp(resolve(tmpdir(), 'metrev-cora-export-'));
    try {
      await cp(
        resolve('packages/database/data/research-candidates'),
        resolve(temp, 'packages/database/data/research-candidates'),
        { recursive: true },
      );
      const file = resolve(
        temp,
        'packages/database/data/research-candidates/10.34810-DATA2866/eis-observed-pairs.json',
      );
      await writeFile(
        file,
        (await readFile(file, 'utf8')).replace('Cloth Ni', 'Cloth Fe'),
      );
      await expect(buildDevelopmentBenchmark(temp)).rejects.toThrow(
        /extract hash mismatch/,
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it('blocks lower strata from supporting higher-tier validation claims', () => {
    const component = {
      evidence_stratum: 'component_experiment',
      source_kind: 'literature',
      review_status: 'approved',
      reviewed_by: 'reviewer-id',
      reviewed_at: '2026-10-02T10:00:00.000Z',
      condition_match_status: 'matched',
    };
    expect(
      assessBenchmarkEvidenceUse(component, 'component_comparison'),
    ).toEqual({
      allowed: true,
      reason_codes: [],
    });
    expect(
      assessBenchmarkEvidenceUse(component, 'full_cell_comparison'),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
    expect(
      assessBenchmarkEvidenceUse(component, 'independent_validation'),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
    expect(
      assessBenchmarkEvidenceUse(
        {
          evidence_stratum: 'condition_matched_full_cell_experiment',
          source_kind: 'measured',
          review_status: 'approved',
          reviewed_by: 'reviewer-id',
          reviewed_at: '2026-10-02T10:00:00.000Z',
          condition_match_status: 'matched',
          dataset_role: 'independent_validation',
        },
        'independent_validation',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
    expect(
      assessBenchmarkEvidenceUse(
        { ...component, evidence_stratum: 'mathematical_manufactured' },
        'component_comparison',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
  });

  it('classifies declared component data and fails closed on unknown roles', () => {
    expect(
      classifyBenchmarkEvidence({ dataset_role: 'component_characterization' }),
    ).toBe('component_experiment');
    expect(
      classifyBenchmarkEvidence({ dataset_role: 'electrode_characterization' }),
    ).toBe('component_experiment');
    expect(() =>
      classifyBenchmarkEvidence({ dataset_role: 'independent_validation' }),
    ).toThrow(/Unknown benchmark evidence role/);
    expect(
      classifyBenchmarkEvidence({
        record_kind: 'published_aggregate_or_qualitative_claim',
      }),
    ).toBe('unclassified_aggregate_claim');
  });

  it('requires a reviewed matched holdout for independent validation', () => {
    const holdout = {
      evidence_stratum: 'independent_held_out_validation',
      source_kind: 'measured',
      dataset_role: 'independent_validation',
      split: 'held_out',
      condition_match_status: 'matched',
      review_status: 'approved',
      reviewed_by: 'reviewer-id',
      reviewed_at: '2026-10-02T10:00:00.000Z',
    };
    expect(
      assessBenchmarkEvidenceUse(holdout, 'independent_validation'),
    ).toEqual({
      allowed: true,
      reason_codes: [],
    });
    expect(
      assessBenchmarkEvidenceUse(
        { ...holdout, split: 'development_candidate' },
        'independent_validation',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['independent_holdout_requirements_missing'],
    });
    expect(
      assessBenchmarkEvidenceUse(
        { ...holdout, source_kind: 'test_fixture' },
        'independent_validation',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['test_fixture_is_not_benchmark_evidence'],
    });
  });

  it('allows a reviewed matched cell comparison without promoting it to independent validation', () => {
    const fullCell = {
      evidence_stratum: 'condition_matched_full_cell_experiment',
      source_kind: 'measured',
      dataset_role: 'development_candidate',
      condition_match_status: 'matched',
      review_status: 'approved',
      reviewed_by: 'reviewer-id',
      reviewed_at: '2026-10-02T10:00:00.000Z',
    };
    expect(
      assessBenchmarkEvidenceUse(fullCell, 'full_cell_comparison'),
    ).toEqual({
      allowed: true,
      reason_codes: [],
    });
    expect(
      assessBenchmarkEvidenceUse(
        { ...fullCell, dataset_role: 'calibration' },
        'full_cell_comparison',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['development_data_cannot_validate'],
    });
    expect(
      assessBenchmarkEvidenceUse(fullCell, 'independent_validation'),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
  });

  it('keeps analytical verification and model reproduction in their own tiers', () => {
    expect(
      assessBenchmarkEvidenceUse(
        {
          evidence_stratum: 'mathematical_manufactured',
          source_kind: 'test_fixture',
          verification_case_kind: 'manufactured',
        },
        'numerical_verification',
      ),
    ).toEqual({ allowed: true, reason_codes: [] });
    expect(
      assessBenchmarkEvidenceUse(
        {
          evidence_stratum: 'mathematical_manufactured',
          source_kind: 'measured',
          verification_case_kind: 'manufactured',
        },
        'independent_validation',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['evidence_stratum_below_claim'],
    });
    expect(
      assessBenchmarkEvidenceUse(
        {
          evidence_stratum: 'published_model_reproduction',
          source_kind: 'literature',
          review_status: 'approved',
          reviewed_by: 'reviewer-id',
          reviewed_at: '2026-10-02T10:00:00.000Z',
        },
        'published_model_reproduction',
      ),
    ).toEqual({ allowed: true, reason_codes: [] });
    expect(
      assessBenchmarkEvidenceUse(
        {
          evidence_stratum: 'mathematical_manufactured',
          source_kind: 'test_fixture',
          verification_case_kind: 'manufactured',
        },
        'independent_validation',
      ),
    ).toMatchObject({
      allowed: false,
      reason_codes: ['test_fixture_is_not_benchmark_evidence'],
    });
  });
});
