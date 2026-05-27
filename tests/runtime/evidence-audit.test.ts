import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
    normalizeCaseInput,
    rawCaseInputSchema,
    type AcceptedEvidenceReadinessCandidate,
    type EvidenceQualityReport,
    type FunnelStageCount,
} from '@metrev/domain-contracts';
import {
    runEvidenceQualityAudit,
    type EvidenceAuditRepositoryLike,
} from '@metrev/evidence-audit';

class FakeAuditRepository implements EvidenceAuditRepositoryLike {
  readonly reports: EvidenceQualityReport[] = [];

  constructor(
    private readonly rows: Awaited<
      ReturnType<EvidenceAuditRepositoryLike['getBenchmarkCoverageMatrix']>
    >,
    private readonly acceptedCandidates: AcceptedEvidenceReadinessCandidate[] = [],
  ) {}

  async getBenchmarkCoverageMatrix() {
    return this.rows;
  }

  async getCanonicalFactOutlierCandidates() {
    return [
      {
        factId: 'fact-outlier-001',
        canonicalKey: 'MFC:power_density_w_m2',
        metricType: 'power_density_w_m2',
        normalizedValue: 900,
        aggregateMedian: 120,
        zScore: 3.7,
        sourceDocumentId: 'source-doc-001',
        title: 'High-power wastewater MFC report',
      },
    ];
  }

  async getEvidenceFunnelCounts(): Promise<FunnelStageCount[]> {
    return [
      { stage: 'ingested', count: 10, conversion_rate: null },
      { stage: 'accepted', count: 8, conversion_rate: 0.8 },
      { stage: 'canonicalized', count: 6, conversion_rate: 0.75 },
      { stage: 'decision_ready', count: 5, conversion_rate: 0.83 },
      { stage: 'benchmark_aggregated', count: 4, conversion_rate: 0.8 },
    ];
  }

  async getAcceptedEvidenceReadinessCandidates() {
    return this.acceptedCandidates;
  }

  async createEvidenceQualityAuditReport(report: EvidenceQualityReport) {
    this.reports.push(report);
    return report.report_id;
  }
}

function coveredRow(metricType: string, material: string) {
  return {
    systemType: 'MFC',
    componentType: 'electrode',
    material,
    metricType,
    scale: 'pilot',
    trl: 5,
    decisionReadyCount: 8,
    newestYear: 2025,
  };
}

function acceptedCandidate(
  overrides: Partial<AcceptedEvidenceReadinessCandidate> = {},
): AcceptedEvidenceReadinessCandidate {
  return {
    catalog_item_id: 'catalog-item-accepted-001',
    source_record_id: 'source-record-accepted-001',
    title: 'Accepted benchmark source',
    source_type: 'crossref',
    published_at: '2025-05-10T00:00:00.000Z',
    extraction_status: 'canonical_extracted',
    normalization_status: 'normalized',
    evidence_quality: 'high',
    claim_count: 3,
    canonical_fact_count: 4,
    decision_ready_fact_count: 3,
    benchmark_record_count: 2,
    decision_ready_benchmark_count: 2,
    abstract_available: true,
    full_text_available: true,
    source_artifact_count: 1,
    source_text_chunk_count: 12,
    doi_available: true,
    source_url_available: true,
    pdf_url_available: false,
    xml_url_available: false,
    ...overrides,
  };
}

describe('evidence quality audit', () => {
  it('scores a covered golden case as ready and stores the report', async () => {
    const goldenCase = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const repository = new FakeAuditRepository(
      [
        coveredRow('power_density_w_m2', 'carbon_cloth'),
        coveredRow('cod_removal_pct', 'carbon_felt'),
        coveredRow('coulombic_efficiency_pct', 'graphite_felt'),
        coveredRow('internal_resistance_ohm', 'activated_carbon'),
      ],
      [acceptedCandidate()],
    );

    const report = await runEvidenceQualityAudit({
      repository,
      triggerMode: 'manual',
      goldenCases: [goldenCase],
      currentYear: 2026,
    });

    expect(report.readiness_scores[0]?.readiness_level).toBe('ready');
    expect(report.summary.coverage_ratio).toBe(1);
    expect(report.outliers[0]?.action).toBe('flag_for_review');
    expect(report.accepted_record_summary?.table_ready_records).toBe(1);
    expect(report.accepted_record_readiness?.[0]?.recommended_action).toBe(
      'keep',
    );
    expect(repository.reports[0]?.report_id).toBe(report.report_id);
  });

  it('marks a golden case insufficient when primary metric coverage is absent', async () => {
    const goldenCase = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const repository = new FakeAuditRepository(
      [],
      [
        acceptedCandidate({
          catalog_item_id: 'catalog-item-accepted-002',
          title: 'Accepted source missing full text',
          full_text_available: false,
          source_artifact_count: 0,
          source_text_chunk_count: 0,
          benchmark_record_count: 0,
          decision_ready_benchmark_count: 0,
          extraction_status: 'needs_full_text',
        }),
      ],
    );

    const report = await runEvidenceQualityAudit({
      repository,
      triggerMode: 'scheduled',
      goldenCases: [goldenCase],
      currentYear: 2026,
    });

    expect(report.summary.coverage_ratio).toBe(0);
    expect(report.readiness_scores[0]?.readiness_level).toBe('insufficient');
    expect(report.readiness_scores[0]?.critical_gaps).toContain(
      'power_density_w_m2',
    );
    expect(report.accepted_record_summary?.reacquire_full_text_count).toBe(1);
    expect(report.accepted_record_readiness?.[0]?.recommended_action).toBe(
      'reacquire_full_text',
    );
  });
});
