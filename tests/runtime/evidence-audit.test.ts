import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  normalizeCaseInput,
  rawCaseInputSchema,
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

describe('evidence quality audit', () => {
  it('scores a covered golden case as ready and stores the report', async () => {
    const goldenCase = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const repository = new FakeAuditRepository([
      coveredRow('power_density_w_m2', 'carbon_cloth'),
      coveredRow('cod_removal_pct', 'carbon_felt'),
      coveredRow('coulombic_efficiency_pct', 'graphite_felt'),
      coveredRow('internal_resistance_ohm', 'activated_carbon'),
    ]);

    const report = await runEvidenceQualityAudit({
      repository,
      triggerMode: 'manual',
      goldenCases: [goldenCase],
      currentYear: 2026,
    });

    expect(report.readiness_scores[0]?.readiness_level).toBe('ready');
    expect(report.summary.coverage_ratio).toBe(1);
    expect(report.outliers[0]?.action).toBe('flag_for_review');
    expect(repository.reports[0]?.report_id).toBe(report.report_id);
  });

  it('marks a golden case insufficient when primary metric coverage is absent', async () => {
    const goldenCase = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const repository = new FakeAuditRepository([]);

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
  });
});
