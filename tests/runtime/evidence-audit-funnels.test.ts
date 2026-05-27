import { describe, expect, it } from 'vitest';

import {
  evidenceFunnelGroupSchema,
  evidenceQualityReportSchema,
  funnelStageCountSchema,
  type AcceptedEvidenceReadinessCandidate,
  type EvidenceFunnelGroup,
  type EvidenceQualityReport,
  type FunnelStageCount,
} from '@metrev/domain-contracts';
import {
  runEvidenceQualityAudit,
  type EvidenceAuditRepositoryLike,
} from '@metrev/evidence-audit';

function stage(name: string, count: number): FunnelStageCount {
  return funnelStageCountSchema.parse({
    stage: name,
    count,
    conversion_rate: null,
  });
}

function fiveFunnels(): EvidenceFunnelGroup {
  return evidenceFunnelGroupSchema.parse({
    article: [
      stage('discovered', 100),
      stage('cataloged', 90),
      stage('accepted', 80),
      stage('has_stable_identifier', 75),
      stage('has_abstract', 78),
      stage('has_full_text_artifact', 60),
      stage('has_source_text_chunks', 55),
      stage('technical_domain_match', 0),
      stage('strict_table_ready', 0),
      stage('has_research_review', 12),
    ],
    document: [
      stage('artifact_present', 60),
      stage('pdf_xml_html_detected', 58),
      stage('parse_attempted', 58),
      stage('pages_parsed', 0),
      stage('text_blocks_parsed', 50),
      stage('tables_parsed', 0),
      stage('parse_warnings', 0),
      stage('parse_failures', 2),
    ],
    fact: [
      stage('scientific_facts', 200),
      stage('canonical_facts', 180),
      stage('normalized_facts', 180),
      stage('decision_ready_facts', 150),
      stage('low_confidence_facts', 30),
      stage('invalid_facts', 0),
    ],
    benchmark: [
      stage('benchmark_records', 120),
      stage('normalized_benchmark_records', 120),
      stage('decision_ready_benchmark_records', 100),
      stage('benchmark_aggregates', 24),
      stage('unit_normalization_failures', 0),
    ],
    research_cell: [
      stage('total_extraction_results', 40),
      stage('valid_results', 35),
      stage('invalid_results', 5),
    ],
  });
}

class FunnelsFakeRepository implements EvidenceAuditRepositoryLike {
  readonly reports: EvidenceQualityReport[] = [];

  constructor(private readonly funnels?: EvidenceFunnelGroup) {}

  async getBenchmarkCoverageMatrix() {
    return [] as Awaited<
      ReturnType<EvidenceAuditRepositoryLike['getBenchmarkCoverageMatrix']>
    >;
  }

  async getCanonicalFactOutlierCandidates() {
    return [];
  }

  async getEvidenceFunnelCounts(): Promise<FunnelStageCount[]> {
    return [
      stage('ingested', 100),
      stage('accepted', 80),
      stage('canonicalized', 60),
      stage('decision_ready', 50),
      stage('benchmark_aggregated', 24),
    ];
  }

  async getEvidenceFunnels(): Promise<EvidenceFunnelGroup> {
    if (!this.funnels) {
      throw new Error('not configured');
    }
    return this.funnels;
  }

  async getAcceptedEvidenceReadinessCandidates(): Promise<
    AcceptedEvidenceReadinessCandidate[]
  > {
    return [];
  }

  async createEvidenceQualityAuditReport(report: EvidenceQualityReport) {
    this.reports.push(report);
    return report.report_id;
  }
}

describe('evidence quality audit — 5-funnel split (spec 037)', () => {
  it('accepts an EvidenceFunnelGroup with all five funnels', () => {
    const parsed = evidenceFunnelGroupSchema.parse({
      article: [],
      document: [],
      fact: [],
      benchmark: [],
      research_cell: [],
    });
    expect(parsed).toEqual({
      article: [],
      document: [],
      fact: [],
      benchmark: [],
      research_cell: [],
    });
  });

  it('keeps `funnels` optional on the report schema (additive change)', () => {
    const minimal = evidenceQualityReportSchema.safeParse({
      report_id: '00000000-0000-0000-0000-000000000001',
      trigger_mode: 'manual',
      coverage_matrix: [],
      gaps: [],
      outliers: [],
      readiness_scores: [],
      accepted_record_readiness: [],
      accepted_record_summary: {
        total_accepted_records: 0,
        table_ready_records: 0,
        keep_count: 0,
        reacquire_full_text_count: 0,
        rerun_extraction_count: 0,
        quarantine_for_review_count: 0,
        reject_from_intake_count: 0,
        delete_record_count: 0,
      },
      funnel_metrics: [],
      summary: {
        total_benchmark_records: 0,
        decision_ready_records: 0,
        coverage_ratio: 0,
        critical_gap_count: 0,
        stale_metric_count: 0,
        outlier_count: 0,
      },
      created_at: new Date().toISOString(),
    });
    expect(minimal.success).toBe(true);
  });

  it('emits `funnels` when the repository implements getEvidenceFunnels', async () => {
    const repo = new FunnelsFakeRepository(fiveFunnels());
    const report = await runEvidenceQualityAudit({
      repository: repo,
      triggerMode: 'manual',
    });
    expect(report.funnels).toBeDefined();
    expect(report.funnels?.article.length).toBeGreaterThan(0);
    expect(report.funnels?.research_cell.length).toBeGreaterThan(0);
    // Legacy field still present.
    expect(report.funnel_metrics.length).toBe(5);
  });

  it('omits `funnels` when METREV_AUDIT_FUNNELS_V2=0', async () => {
    const originalFlag = process.env.METREV_AUDIT_FUNNELS_V2;
    process.env.METREV_AUDIT_FUNNELS_V2 = '0';
    try {
      const repo = new FunnelsFakeRepository(fiveFunnels());
      const report = await runEvidenceQualityAudit({
        repository: repo,
        triggerMode: 'manual',
      });
      expect(report.funnels).toBeUndefined();
    } finally {
      if (originalFlag === undefined) {
        delete process.env.METREV_AUDIT_FUNNELS_V2;
      } else {
        process.env.METREV_AUDIT_FUNNELS_V2 = originalFlag;
      }
    }
  });

  it('omits `funnels` when repository does not implement the new method', async () => {
    const legacy: EvidenceAuditRepositoryLike = {
      getBenchmarkCoverageMatrix: async () => [],
      getCanonicalFactOutlierCandidates: async () => [],
      getEvidenceFunnelCounts: async () => [
        stage('ingested', 0),
        stage('accepted', 0),
        stage('canonicalized', 0),
        stage('decision_ready', 0),
        stage('benchmark_aggregated', 0),
      ],
      getAcceptedEvidenceReadinessCandidates: async () => [],
      createEvidenceQualityAuditReport: async (report) => report.report_id,
    };
    const report = await runEvidenceQualityAudit({
      repository: legacy,
      triggerMode: 'manual',
    });
    expect(report.funnels).toBeUndefined();
  });
});
