import { describe, expect, it } from 'vitest';

import {
  assessSolverEvidenceCoverage,
  SOLVER_EVIDENCE_TARGETS,
  summarizeSolverEvidenceCoverage,
} from '../../packages/database/scripts/solver-evidence-coverage';

describe('solver-oriented evidence coverage', () => {
  it('maps only normalized keys available on scientific facts and benchmark rows', () => {
    expect(Object.keys(SOLVER_EVIDENCE_TARGETS)).toEqual([
      'mfc_wastewater',
      'mec',
      'anode',
      'membrane',
      'cathode',
      'biofilm',
      'hydraulics',
    ]);
    expect(
      SOLVER_EVIDENCE_TARGETS.mfc_wastewater.variables.map(
        (variable) => variable.id,
      ),
    ).toContain('influent_cod');
    expect(
      SOLVER_EVIDENCE_TARGETS.mfc_wastewater.unknownVariables,
    ).toContainEqual({
      id: 'spatial_observations',
      label: 'spatial observations',
    });
    expect(SOLVER_EVIDENCE_TARGETS.biofilm.variables).toEqual([]);
    expect(
      SOLVER_EVIDENCE_TARGETS.biofilm.unknownVariables.map(
        (variable) => variable.id,
      ),
    ).toContain('thickness');
    const fieldsSelectedFromNormalizedRows = new Set([
      'canonicalKey',
      'componentType',
      'fieldKey',
      'metricType',
      'operatingConditionKey',
      'systemType',
    ]);
    for (const target of Object.values(SOLVER_EVIDENCE_TARGETS)) {
      for (const variable of target.variables) {
        for (const key of variable.keys) {
          expect(fieldsSelectedFromNormalizedRows.has(key.split(':')[0]!)).toBe(
            true,
          );
        }
      }
    }
  });

  it('reports a normalized measurement as present only for an applicable target', () => {
    const coverage = assessSolverEvidenceCoverage({
      canonicalFacts: [
        {
          canonicalKey: 'system_type:MFC',
          decisionReady: true,
          fieldKey: 'system_type',
          normalizedUnit: null,
          normalizedValue: null,
          systemType: 'MFC',
        },
        {
          canonicalKey: 'cod_mg_l',
          decisionReady: true,
          fieldKey: 'cod',
          metricType: 'cod',
          normalizedUnit: 'mg/L',
          normalizedValue: 420,
          operatingConditionKey: 'influent_cod_mg_l',
          systemType: 'MFC',
        },
      ],
      benchmarkRecords: [],
    });
    const target = coverage.targets.mfc_wastewater;

    expect(target.applicability).toBe('applicable');
    expect(target.present_variables).toContain('influent_cod');
    expect(
      target.variables.find((variable) => variable.id === 'influent_cod'),
    ).toMatchObject({
      status: 'present',
      normalized_keys: [
        'canonicalKey:cod_mg_l',
        'fieldKey:cod',
        'metricType:cod',
        'operatingConditionKey:influent_cod_mg_l',
      ],
      complete_normalized_value_count: 1,
    });
    expect(target.present_variables).not.toContain('hydrogen_production');
  });

  it('distinguishes not captured from unmapped or unclassified information', () => {
    const applicable = assessSolverEvidenceCoverage({
      canonicalFacts: [
        { decisionReady: true, systemType: 'MFC' },
        {
          canonicalKey: 'cod_mg_l',
          decisionReady: true,
          fieldKey: 'cod',
          metricType: 'cod',
          normalizedValue: null,
          normalizedUnit: null,
          systemType: 'MFC',
        },
      ],
      benchmarkRecords: [],
    }).targets.mfc_wastewater;

    expect(applicable.not_captured_variables).toContain('current_density');
    expect(applicable.unknown_variables).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'influent_cod', status: 'unknown' }),
        expect.objectContaining({ id: 'geometry', status: 'unknown' }),
      ]),
    );
    expect(
      applicable.variables.find((variable) => variable.id === 'influent_cod'),
    ).toMatchObject({
      status: 'unknown',
      supporting_record_count: 1,
      complete_normalized_value_count: 0,
    });
  });

  it('does not count component classification as an explicit anode material', () => {
    const coverage = assessSolverEvidenceCoverage({
      canonicalFacts: [{ componentType: 'anode', decisionReady: true }],
      benchmarkRecords: [],
    }).targets.anode;

    expect(coverage.applicability).toBe('applicable');
    expect(
      coverage.variables.find((variable) => variable.id === 'anode_material'),
    ).toMatchObject({
      status: 'unknown',
      normalized_keys: ['componentType:anode'],
      complete_normalized_value_count: 0,
    });
    expect(coverage.present_variables).not.toContain('anode_material');
    expect(coverage.unknown_variables).toContainEqual(
      expect.objectContaining({ id: 'anode_material', status: 'unknown' }),
    );
  });

  it('does not infer target applicability from non-decision-ready facts', () => {
    const coverage = assessSolverEvidenceCoverage({
      canonicalFacts: [
        {
          decisionReady: false,
          fieldKey: 'system_type',
          systemType: 'MFC',
        },
        {
          decisionReady: false,
          fieldKey: 'cod',
          metricType: 'cod',
          normalizedUnit: 'mg/L',
          normalizedValue: 420,
          systemType: 'MFC',
        },
      ],
      benchmarkRecords: [],
    });

    expect(coverage.targets.mfc_wastewater.applicability).toBe('unknown');
    expect(
      coverage.targets.mfc_wastewater.variables.find(
        (variable) => variable.id === 'influent_cod',
      )?.status,
    ).toBe('unknown');
  });

  it('keeps a normalized metric unknown for MFC when its technology class is not explicit', () => {
    const coverage = assessSolverEvidenceCoverage({
      canonicalFacts: [
        {
          canonicalKey: 'cod_mg_l',
          decisionReady: true,
          fieldKey: 'cod',
          metricType: 'cod',
          normalizedUnit: 'mg/L',
          normalizedValue: 420,
        },
      ],
      benchmarkRecords: [],
    });

    expect(coverage.targets.mfc_wastewater.applicability).toBe('unknown');
    expect(
      coverage.targets.mfc_wastewater.variables.find(
        (variable) => variable.id === 'influent_cod',
      )?.status,
    ).toBe('unknown');
    expect(
      coverage.targets.mfc_wastewater.variables.find(
        (variable) => variable.id === 'influent_cod',
      )?.normalized_keys,
    ).toContain('canonicalKey:cod_mg_l');
  });

  it('summarizes record-level coverage without promoting it to solver validation', () => {
    const coverage = assessSolverEvidenceCoverage({
      canonicalFacts: [{ decisionReady: true, systemType: 'MEC' }],
      benchmarkRecords: [],
    });
    const summary = summarizeSolverEvidenceCoverage([coverage]);

    expect(summary.mec.applicable_record_count).toBe(1);
    expect(
      summary.mec.variables.find((variable) => variable.id === 'influent_cod'),
    ).toMatchObject({ not_captured_record_count: 1 });
    expect(coverage.scope).toContain(
      'title, summary, abstract, tags, and free text',
    );
    expect(coverage.targets.mec.note).toContain('not solver validation');
  });
});
