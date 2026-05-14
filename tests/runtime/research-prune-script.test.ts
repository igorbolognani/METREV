import { describe, expect, it } from 'vitest';

import { buildTableReadyExpansionPlan } from '../../packages/database/scripts/expand-table-ready-corpus';
import { shouldKeepResearchSourceForPrune } from '../../packages/database/scripts/prune-research-warehouse';
import { evaluateTechnicalCompleteness } from '../../packages/database/scripts/table-ready-completeness';

function completeTechnicalCandidate() {
  return {
    abstractAvailable: true,
    benchmarkRecords: [
      {
        application: 'wastewater treatment',
        componentType: 'anode',
        decisionReady: true,
        material: 'carbon felt',
        metricType: 'power_density',
        normalizedUnit: 'mW/m2',
        normalizedValue: 1240,
        systemType: 'MFC',
      },
      {
        application: 'wastewater treatment',
        componentType: 'anode',
        decisionReady: true,
        material: 'carbon felt',
        metricType: 'coulombic_efficiency',
        normalizedUnit: '%',
        normalizedValue: 71,
        systemType: 'MFC',
      },
    ],
    canonicalFacts: [
      {
        canonicalKey: 'mfc.reactor_type',
        componentType: 'reactor',
        decisionReady: true,
        factType: 'reactor_type',
        fieldKey: 'reactor_type',
        material: null,
        metricType: null,
        normalizedUnit: null,
        normalizedValue: null,
        reactorType: 'dual chamber microbial fuel cell',
        systemType: 'MFC',
      },
      {
        canonicalKey: 'mfc.anode.material',
        componentType: 'anode',
        decisionReady: true,
        factType: 'electrode_material',
        fieldKey: 'anode_material',
        material: 'carbon felt',
        metricType: null,
        normalizedUnit: null,
        normalizedValue: null,
        reactorType: null,
        systemType: 'MFC',
      },
    ],
    catalogItemId: 'catalog-001',
    claimCount: 4,
    doiAvailable: true,
    evidenceQuality: 'high',
    extractionStatus: 'completed',
    fullTextAvailable: true,
    sourceArtifactCount: 1,
    sourceCategory: 'peer_reviewed_article',
    sourceRecordId: 'source-001',
    sourceTextChunkCount: 8,
    sourceType: 'openalex',
    sourceUrlAvailable: true,
    summary:
      'Experimental wastewater microbial fuel cell study reporting COD removal, electrode material, and power density.',
    tags: ['MFC', 'wastewater', 'experimental'],
    title:
      'Microbial fuel cell wastewater treatment with carbon felt anode and measured power density',
  };
}

describe('research hard-prune source selection', () => {
  it('keeps eligible MFC/MEC/MET sources in broad warehouse mode', () => {
    expect(
      shouldKeepResearchSourceForPrune({
        eligibilityStatus: 'eligible',
        sourceDocumentId: 'source-001',
        tableReadyOnly: false,
        tableReadySourceIds: new Set(),
        technologyClasses: ['MFC'],
      }),
    ).toBe(true);
  });

  it('requires strict table readiness when table-ready mode is enabled', () => {
    const tableReadySourceIds = new Set(['source-ready']);

    expect(
      shouldKeepResearchSourceForPrune({
        eligibilityStatus: 'eligible',
        sourceDocumentId: 'source-not-ready',
        tableReadyOnly: true,
        tableReadySourceIds,
        technologyClasses: ['MFC'],
      }),
    ).toBe(false);
    expect(
      shouldKeepResearchSourceForPrune({
        eligibilityStatus: 'eligible',
        sourceDocumentId: 'source-ready',
        tableReadyOnly: true,
        tableReadySourceIds,
        technologyClasses: [],
      }),
    ).toBe(true);
  });

  it('excludes ineligible and out-of-scope sources', () => {
    expect(
      shouldKeepResearchSourceForPrune({
        eligibilityStatus: 'excluded',
        sourceDocumentId: 'source-ready',
        tableReadyOnly: false,
        tableReadySourceIds: new Set(['source-ready']),
        technologyClasses: ['MFC'],
      }),
    ).toBe(false);
    expect(
      shouldKeepResearchSourceForPrune({
        eligibilityStatus: 'eligible',
        sourceDocumentId: 'source-ready',
        tableReadyOnly: false,
        tableReadySourceIds: new Set(['source-ready']),
        technologyClasses: ['algae'],
      }),
    ).toBe(false);
  });
});

describe('strict table-ready technical completeness', () => {
  it('keeps experimental technical papers with identity, chunks, facts, benchmarks, and group coverage', () => {
    const assessment = evaluateTechnicalCompleteness(
      completeTechnicalCandidate(),
    );

    expect(assessment.strictTableReady).toBe(true);
    expect(assessment.recommendedAction).toBe('keep');
    expect(assessment.missingRequirements).toEqual([]);
    expect(assessment.coverage).toEqual({
      decisionMetadata: true,
      metricsOutputs: true,
      overview: true,
      reactorMaterials: true,
    });
  });

  it('rejects broad review-like records without experimental signals', () => {
    const assessment = evaluateTechnicalCompleteness({
      ...completeTechnicalCandidate(),
      benchmarkRecords: [],
      canonicalFacts: [],
      sourceCategory: 'review',
      summary: 'Broad overview of microbial fuel cell wastewater literature.',
      tags: ['review', 'microbial fuel cell'],
      title: 'Review of microbial fuel cell wastewater treatment',
    });

    expect(assessment.strictTableReady).toBe(false);
    expect(assessment.recommendedAction).toBe('reject_from_intake');
    expect(assessment.flags).toContain('broad_without_experimental_signal');
  });

  it('requests lawful reacquisition when source chunks are missing', () => {
    const assessment = evaluateTechnicalCompleteness({
      ...completeTechnicalCandidate(),
      fullTextAvailable: false,
      sourceArtifactCount: 0,
      sourceTextChunkCount: 0,
    });

    expect(assessment.strictTableReady).toBe(false);
    expect(assessment.recommendedAction).toBe('reacquire_full_text');
    expect(assessment.missingRequirements).toContain('traceable_source_chunks');
  });

  it('does not count unclassified metrics as strict normalized metric coverage', () => {
    const assessment = evaluateTechnicalCompleteness({
      ...completeTechnicalCandidate(),
      benchmarkRecords: [
        {
          application: 'wastewater treatment',
          componentType: 'anode',
          decisionReady: true,
          material: 'carbon felt',
          metricType: 'unclassified_metric',
          normalizedUnit: 'raw',
          normalizedValue: 1,
          systemType: 'MFC',
        },
      ],
    });

    expect(assessment.strictTableReady).toBe(false);
    expect(assessment.flags).toContain('unclassified_metric_present');
    expect(assessment.missingRequirements).toContain(
      'performance_or_output_metric_signal',
    );
  });
});

describe('lawful table-ready expansion plan', () => {
  it('defaults to a dry-run campaign with the strict readiness reporting stage', () => {
    const plan = buildTableReadyExpansionPlan();

    expect(plan.dry_run).toBe(true);
    expect(plan.config).toBe('../data/table-ready-expansion.config.json');
    expect(plan.stages).toContain('emit strict article-level readiness report');
    expect(plan.lawful_acquisition_policy).toContain(
      'Paywall bypass sources are out of scope',
    );
  });
});
