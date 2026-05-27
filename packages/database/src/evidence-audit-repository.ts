import { Prisma, type PrismaClient } from '../generated/prisma/client';

import {
  acceptedEvidenceReadinessCandidateSchema,
  acquisitionAttemptSchema,
  discoveryTargetSchema,
  evidenceFunnelGroupSchema,
  evidenceQualityReportSchema,
  funnelStageCountSchema,
  type AcceptedEvidenceReadinessCandidate,
  type AcquisitionAttempt,
  type DiscoveryTarget,
  type EvidenceFunnelGroup,
  type EvidenceQualityReport,
  type FunnelStageCount,
} from '@metrev/domain-contracts';

import { getPrismaClient } from './prisma-client';

const CANONICAL_FACT_LAYER = 'canonical_scientific_fact_v1';

export interface RawCoverageRow {
  systemType: string | null;
  componentType: string | null;
  material: string | null;
  metricType: string;
  scale: string | null;
  trl: number | null;
  decisionReadyCount: number;
  newestYear: number | null;
}

export interface OutlierCandidateRow {
  factId: string;
  canonicalKey: string | null;
  metricType: string;
  normalizedValue: number;
  aggregateMedian: number;
  zScore: number;
  sourceDocumentId: string;
  title: string;
}

export interface SourceRecordForAcquisition {
  source_record_id: string;
  title: string;
  doi: string | null;
  source_url: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  access_status: string;
  license: string | null;
  has_traceable_full_text: boolean;
}

export interface DiscoveryStatusSummary {
  active_targets: number;
  queued_targets: number;
  completed_targets: number;
  failed_targets: number;
  total_records_staged: number;
  targets: DiscoveryTarget[];
}

export interface AcquisitionStatusSummary {
  queued_attempts: number;
  running_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
  skipped_attempts: number;
  attempts: AcquisitionAttempt[];
}

export interface EvidenceAuditRepository {
  createEvidenceQualityAuditReport(
    report: EvidenceQualityReport,
  ): Promise<string>;
  getLatestEvidenceQualityAuditReport(): Promise<EvidenceQualityReport | null>;
  getEvidenceQualityAuditReport(
    reportId: string,
  ): Promise<EvidenceQualityReport | null>;
  listEvidenceQualityAuditReports(
    limit?: number,
  ): Promise<EvidenceQualityReport[]>;
  getBenchmarkCoverageMatrix(): Promise<RawCoverageRow[]>;
  getCanonicalFactOutlierCandidates(
    limit?: number,
  ): Promise<OutlierCandidateRow[]>;
  getEvidenceFunnelCounts(): Promise<FunnelStageCount[]>;
  getEvidenceFunnels(): Promise<EvidenceFunnelGroup>;
  getAcceptedEvidenceReadinessCandidates(
    limit?: number,
  ): Promise<AcceptedEvidenceReadinessCandidate[]>;
  createDiscoveryTargets(targets: DiscoveryTarget[]): Promise<string[]>;
  getQueuedDiscoveryTargets(limit?: number): Promise<DiscoveryTarget[]>;
  listDiscoveryTargets(limit?: number): Promise<DiscoveryTarget[]>;
  updateDiscoveryTargetStatus(
    targetId: string,
    update: Partial<
      Pick<
        DiscoveryTarget,
        'status' | 'records_found' | 'records_staged' | 'failure_detail'
      >
    >,
  ): Promise<void>;
  getDiscoveryStatusSummary(limit?: number): Promise<DiscoveryStatusSummary>;
  createAcquisitionAttempt(attempt: AcquisitionAttempt): Promise<string>;
  getQueuedAcquisitionAttempts(limit?: number): Promise<AcquisitionAttempt[]>;
  listAcquisitionAttempts(limit?: number): Promise<AcquisitionAttempt[]>;
  updateAcquisitionAttemptStatus(
    attemptId: string,
    update: Partial<
      Pick<
        AcquisitionAttempt,
        'status' | 'found_url' | 'found_access_status' | 'failure_reason'
      >
    >,
  ): Promise<void>;
  getAcquisitionStatusSummary(
    limit?: number,
  ): Promise<AcquisitionStatusSummary>;
  getNeedsFullTextSourceRecords(
    limit?: number,
  ): Promise<SourceRecordForAcquisition[]>;
  markSourceRecordFullTextResolved(input: {
    sourceRecordId: string;
    foundUrl: string;
    accessStatus?: string | null;
    strategy: AcquisitionAttempt['strategy'];
  }): Promise<void>;
}

export class MemoryEvidenceAuditRepository implements EvidenceAuditRepository {
  private readonly reports: EvidenceQualityReport[] = [];
  private readonly targets: DiscoveryTarget[] = [];
  private readonly attempts: AcquisitionAttempt[] = [];

  async createEvidenceQualityAuditReport(
    report: EvidenceQualityReport,
  ): Promise<string> {
    const parsed = evidenceQualityReportSchema.parse(report);
    this.reports.unshift(parsed);
    return parsed.report_id;
  }

  async getLatestEvidenceQualityAuditReport(): Promise<EvidenceQualityReport | null> {
    return this.reports[0] ?? null;
  }

  async getEvidenceQualityAuditReport(
    reportId: string,
  ): Promise<EvidenceQualityReport | null> {
    return this.reports.find((report) => report.report_id === reportId) ?? null;
  }

  async listEvidenceQualityAuditReports(
    limit = 20,
  ): Promise<EvidenceQualityReport[]> {
    return this.reports.slice(0, limit);
  }

  async getBenchmarkCoverageMatrix(): Promise<RawCoverageRow[]> {
    return [];
  }

  async getCanonicalFactOutlierCandidates(): Promise<OutlierCandidateRow[]> {
    return [];
  }

  async getEvidenceFunnelCounts(): Promise<FunnelStageCount[]> {
    return [
      'ingested',
      'accepted',
      'canonicalized',
      'decision_ready',
      'benchmark_aggregated',
    ].map((stage) =>
      funnelStageCountSchema.parse({ stage, count: 0, conversion_rate: null }),
    );
  }

  async getEvidenceFunnels(): Promise<EvidenceFunnelGroup> {
    return evidenceFunnelGroupSchema.parse({
      article: [],
      document: [],
      fact: [],
      benchmark: [],
      research_cell: [],
    });
  }

  async getAcceptedEvidenceReadinessCandidates(): Promise<
    AcceptedEvidenceReadinessCandidate[]
  > {
    return [];
  }

  async createDiscoveryTargets(targets: DiscoveryTarget[]): Promise<string[]> {
    const parsed = targets.map((target) => discoveryTargetSchema.parse(target));
    this.targets.unshift(...parsed);
    return parsed.map((target) => target.target_id);
  }

  async getQueuedDiscoveryTargets(limit = 10): Promise<DiscoveryTarget[]> {
    return this.targets
      .filter((target) => target.status === 'queued')
      .slice(0, limit);
  }

  async listDiscoveryTargets(limit = 50): Promise<DiscoveryTarget[]> {
    return this.targets.slice(0, limit);
  }

  async updateDiscoveryTargetStatus(
    targetId: string,
    update: Partial<
      Pick<
        DiscoveryTarget,
        'status' | 'records_found' | 'records_staged' | 'failure_detail'
      >
    >,
  ): Promise<void> {
    const index = this.targets.findIndex(
      (target) => target.target_id === targetId,
    );
    if (index === -1) {
      return;
    }

    this.targets[index] = discoveryTargetSchema.parse({
      ...this.targets[index],
      status: update.status ?? this.targets[index].status,
      records_found: update.records_found ?? this.targets[index].records_found,
      records_staged:
        update.records_staged ?? this.targets[index].records_staged,
      failure_detail:
        update.failure_detail ?? this.targets[index].failure_detail,
      updated_at: new Date().toISOString(),
      completed_at:
        update.status === 'completed' || update.status === 'failed'
          ? new Date().toISOString()
          : this.targets[index].completed_at,
    });
  }

  async getDiscoveryStatusSummary(limit = 25): Promise<DiscoveryStatusSummary> {
    return {
      active_targets: this.targets.filter(
        (target) => target.status === 'running',
      ).length,
      queued_targets: this.targets.filter(
        (target) => target.status === 'queued',
      ).length,
      completed_targets: this.targets.filter(
        (target) => target.status === 'completed',
      ).length,
      failed_targets: this.targets.filter(
        (target) => target.status === 'failed',
      ).length,
      total_records_staged: this.targets.reduce(
        (sum, target) => sum + target.records_staged,
        0,
      ),
      targets: this.targets.slice(0, limit),
    };
  }

  async createAcquisitionAttempt(attempt: AcquisitionAttempt): Promise<string> {
    const parsed = acquisitionAttemptSchema.parse(attempt);
    this.attempts.unshift(parsed);
    return parsed.attempt_id;
  }

  async getQueuedAcquisitionAttempts(
    limit = 10,
  ): Promise<AcquisitionAttempt[]> {
    return this.attempts
      .filter((attempt) => attempt.status === 'queued')
      .slice(0, limit);
  }

  async listAcquisitionAttempts(limit = 50): Promise<AcquisitionAttempt[]> {
    return this.attempts.slice(0, limit);
  }

  async updateAcquisitionAttemptStatus(
    attemptId: string,
    update: Partial<
      Pick<
        AcquisitionAttempt,
        'status' | 'found_url' | 'found_access_status' | 'failure_reason'
      >
    >,
  ): Promise<void> {
    const index = this.attempts.findIndex(
      (attempt) => attempt.attempt_id === attemptId,
    );
    if (index === -1) {
      return;
    }

    this.attempts[index] = acquisitionAttemptSchema.parse({
      ...this.attempts[index],
      status: update.status ?? this.attempts[index].status,
      found_url: update.found_url ?? this.attempts[index].found_url,
      found_access_status:
        update.found_access_status ?? this.attempts[index].found_access_status,
      failure_reason:
        update.failure_reason ?? this.attempts[index].failure_reason,
      updated_at: new Date().toISOString(),
    });
  }

  async getAcquisitionStatusSummary(
    limit = 25,
  ): Promise<AcquisitionStatusSummary> {
    return {
      queued_attempts: this.attempts.filter(
        (attempt) => attempt.status === 'queued',
      ).length,
      running_attempts: this.attempts.filter(
        (attempt) => attempt.status === 'running',
      ).length,
      successful_attempts: this.attempts.filter(
        (attempt) => attempt.status === 'success',
      ).length,
      failed_attempts: this.attempts.filter(
        (attempt) => attempt.status === 'failed',
      ).length,
      skipped_attempts: this.attempts.filter(
        (attempt) => attempt.status === 'skipped',
      ).length,
      attempts: this.attempts.slice(0, limit),
    };
  }

  async getNeedsFullTextSourceRecords(): Promise<SourceRecordForAcquisition[]> {
    return [];
  }

  async markSourceRecordFullTextResolved(): Promise<void> {
    return;
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapAuditReport(record: {
  id: string;
  triggerMode: string;
  coverageMatrix: Prisma.JsonValue;
  gaps: Prisma.JsonValue;
  outliers: Prisma.JsonValue;
  readinessScores: Prisma.JsonValue;
  funnelMetrics: Prisma.JsonValue;
  summary: Prisma.JsonValue;
  createdAt: Date;
}): EvidenceQualityReport {
  return evidenceQualityReportSchema.parse({
    report_id: record.id,
    trigger_mode: record.triggerMode,
    coverage_matrix: record.coverageMatrix,
    gaps: record.gaps,
    outliers: record.outliers,
    readiness_scores: record.readinessScores,
    funnel_metrics: record.funnelMetrics,
    summary: record.summary,
    created_at: toIso(record.createdAt),
  });
}

function mapAcceptedEvidenceReadinessCandidate(record: {
  id: string;
  sourceRecordId: string;
  title: string;
  extractionStatus: string;
  normalizationStatus: string;
  evidenceQuality: string | null;
  claimCount: number;
  sourceRecord: {
    sourceType: string;
    publishedAt: Date | null;
    doi: string | null;
    sourceUrl: string | null;
    pdfUrl: string | null;
    xmlUrl: string | null;
    abstractText: string | null;
    _count: {
      sourceArtifacts: number;
      sourceTextChunks: number;
    };
  };
  scientificFacts: Array<{
    decisionReady: boolean;
  }>;
  benchmarkRecords: Array<{
    decisionReady: boolean;
  }>;
}): AcceptedEvidenceReadinessCandidate {
  return acceptedEvidenceReadinessCandidateSchema.parse({
    catalog_item_id: record.id,
    source_record_id: record.sourceRecordId,
    title: record.title,
    source_type: record.sourceRecord.sourceType.toLowerCase(),
    published_at: record.sourceRecord.publishedAt
      ? toIso(record.sourceRecord.publishedAt)
      : null,
    extraction_status: record.extractionStatus,
    normalization_status: record.normalizationStatus,
    evidence_quality: record.evidenceQuality,
    claim_count: record.claimCount,
    canonical_fact_count: record.scientificFacts.length,
    decision_ready_fact_count: record.scientificFacts.filter(
      (fact) => fact.decisionReady,
    ).length,
    benchmark_record_count: record.benchmarkRecords.length,
    decision_ready_benchmark_count: record.benchmarkRecords.filter(
      (benchmark) => benchmark.decisionReady,
    ).length,
    abstract_available: Boolean(record.sourceRecord.abstractText?.trim()),
    full_text_available: Boolean(
      record.sourceRecord._count.sourceArtifacts > 0 ||
      record.sourceRecord.pdfUrl ||
      record.sourceRecord.xmlUrl,
    ),
    source_artifact_count: record.sourceRecord._count.sourceArtifacts,
    source_text_chunk_count: record.sourceRecord._count.sourceTextChunks,
    doi_available: Boolean(record.sourceRecord.doi),
    source_url_available: Boolean(record.sourceRecord.sourceUrl),
    pdf_url_available: Boolean(record.sourceRecord.pdfUrl),
    xml_url_available: Boolean(record.sourceRecord.xmlUrl),
  });
}

function mapDiscoveryTarget(record: {
  id: string;
  auditReportId: string | null;
  gapId: string;
  query: string;
  providers: string[];
  priority: number;
  status: string;
  recordsFound: number;
  recordsStaged: number;
  failureDetail: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}): DiscoveryTarget {
  return discoveryTargetSchema.parse({
    target_id: record.id,
    audit_report_id: record.auditReportId,
    gap_id: record.gapId,
    query: record.query,
    providers: record.providers,
    priority: record.priority,
    status: record.status,
    records_found: record.recordsFound,
    records_staged: record.recordsStaged,
    failure_detail: record.failureDetail,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt),
    completed_at: record.completedAt ? toIso(record.completedAt) : null,
  });
}

function mapAcquisitionAttempt(record: {
  id: string;
  sourceRecordId: string;
  strategy: string;
  status: string;
  foundUrl: string | null;
  foundAccessStatus: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AcquisitionAttempt {
  return acquisitionAttemptSchema.parse({
    attempt_id: record.id,
    source_record_id: record.sourceRecordId,
    strategy: record.strategy,
    status: record.status,
    found_url: record.foundUrl,
    found_access_status: record.foundAccessStatus?.toLowerCase() ?? null,
    failure_reason: record.failureReason,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt),
  });
}

function conversionRate(count: number, previous: number | null): number | null {
  if (previous === null) {
    return null;
  }

  if (previous === 0) {
    return count === 0 ? 1 : 0;
  }

  return Math.max(0, Math.min(1, count / previous));
}

export function createEvidenceAuditRepository(
  prisma: PrismaClient = getPrismaClient(),
): EvidenceAuditRepository {
  return {
    async createEvidenceQualityAuditReport(report) {
      const parsed = evidenceQualityReportSchema.parse(report);
      const created = await prisma.evidenceQualityAuditReport.create({
        data: {
          id: parsed.report_id,
          triggerMode: parsed.trigger_mode,
          coverageMatrix: toInputJson(parsed.coverage_matrix),
          gaps: toInputJson(parsed.gaps),
          outliers: toInputJson(parsed.outliers),
          readinessScores: toInputJson(parsed.readiness_scores),
          funnelMetrics: toInputJson(parsed.funnel_metrics),
          summary: toInputJson(parsed.summary),
        },
        select: { id: true },
      });

      return created.id;
    },

    async getLatestEvidenceQualityAuditReport() {
      const record = await prisma.evidenceQualityAuditReport.findFirst({
        orderBy: { createdAt: 'desc' },
      });

      return record ? mapAuditReport(record) : null;
    },

    async getEvidenceQualityAuditReport(reportId) {
      const record = await prisma.evidenceQualityAuditReport.findUnique({
        where: { id: reportId },
      });

      return record ? mapAuditReport(record) : null;
    },

    async listEvidenceQualityAuditReports(limit = 20) {
      const records = await prisma.evidenceQualityAuditReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records.map(mapAuditReport);
    },

    async getBenchmarkCoverageMatrix() {
      const rows = await prisma.evidenceBenchmarkRecord.groupBy({
        by: [
          'systemType',
          'componentType',
          'material',
          'metricType',
          'scale',
          'trl',
        ],
        where: {
          decisionReady: true,
          metricType: { not: null },
        },
        _count: { _all: true },
        _max: { publicationYear: true },
      });

      return rows.map((row) => ({
        systemType: row.systemType,
        componentType: row.componentType,
        material: row.material,
        metricType: row.metricType ?? 'unknown_metric',
        scale: row.scale,
        trl: row.trl,
        decisionReadyCount: row._count._all,
        newestYear: row._max.publicationYear,
      }));
    },

    async getCanonicalFactOutlierCandidates(limit = 5000) {
      const facts = await prisma.scientificEvidenceFact.findMany({
        where: {
          decisionReady: true,
          normalizedValue: { not: null },
          metricType: { not: null },
        },
        include: {
          sourceRecord: {
            select: { title: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      const candidates: OutlierCandidateRow[] = [];
      for (const fact of facts) {
        if (!fact.metricType || fact.normalizedValue === null) {
          continue;
        }

        const aggregate = await prisma.evidenceBenchmarkAggregate.findFirst({
          where: {
            canonicalKey: fact.canonicalKey ?? undefined,
            metricType: fact.metricType,
            systemType: fact.systemType,
            componentType: fact.componentType,
            material: fact.material,
            medianValue: { not: null },
            p25Value: { not: null },
            p75Value: { not: null },
          },
          orderBy: { recordCount: 'desc' },
        });

        if (
          !aggregate ||
          aggregate.medianValue === null ||
          aggregate.p25Value === null ||
          aggregate.p75Value === null
        ) {
          continue;
        }

        const estimatedStdDev =
          (aggregate.p75Value - aggregate.p25Value) / 1.35;
        if (estimatedStdDev <= 0) {
          continue;
        }

        candidates.push({
          factId: fact.id,
          canonicalKey: fact.canonicalKey,
          metricType: fact.metricType,
          normalizedValue: fact.normalizedValue,
          aggregateMedian: aggregate.medianValue,
          zScore:
            Math.abs(fact.normalizedValue - aggregate.medianValue) /
            estimatedStdDev,
          sourceDocumentId: fact.sourceRecordId,
          title: fact.sourceRecord.title,
        });
      }

      return candidates;
    },

    async getEvidenceFunnelCounts() {
      const [
        ingested,
        accepted,
        canonicalized,
        decisionReady,
        benchmarkAggregated,
      ] = await prisma.$transaction([
        prisma.externalSourceRecord.count(),
        prisma.externalEvidenceCatalogItem.count({
          where: { reviewStatus: 'ACCEPTED' },
        }),
        prisma.scientificEvidenceFact.count({
          where: { factLayer: CANONICAL_FACT_LAYER },
        }),
        prisma.scientificEvidenceFact.count({
          where: { factLayer: CANONICAL_FACT_LAYER, decisionReady: true },
        }),
        prisma.evidenceBenchmarkAggregate.count(),
      ]);

      const rows = [
        { stage: 'ingested', count: ingested, previous: null },
        { stage: 'accepted', count: accepted, previous: ingested },
        { stage: 'canonicalized', count: canonicalized, previous: accepted },
        {
          stage: 'decision_ready',
          count: decisionReady,
          previous: canonicalized,
        },
        {
          stage: 'benchmark_aggregated',
          count: benchmarkAggregated,
          previous: decisionReady,
        },
      ];

      return rows.map((row) =>
        funnelStageCountSchema.parse({
          stage: row.stage,
          count: row.count,
          conversion_rate: conversionRate(row.count, row.previous),
        }),
      );
    },

    async getEvidenceFunnels(): Promise<EvidenceFunnelGroup> {
      // Phase 3 / spec 037: deterministic 5-funnel split.
      // Each funnel reports only stages we can query against the current
      // schema; stages that depend on not-yet-implemented signals are
      // surfaced with count=0 so downstream consumers can render an
      // explicit "not yet captured" rather than silently dropping them.
      const [
        articleDiscovered,
        articleCataloged,
        articleAccepted,
        articleStableId,
        articleAbstract,
        articleHasArtifact,
        articleHasChunks,
        articleHasResearchReview,
        documentArtifacts,
        documentParseable,
        documentParsed,
        documentParseFailures,
        factScientific,
        factCanonical,
        factDecisionReady,
        factLowConfidence,
        benchmarkRecords,
        benchmarkDecisionReady,
        benchmarkAggregates,
        researchTotal,
        researchValid,
        researchInvalid,
      ] = await prisma.$transaction([
        prisma.externalSourceRecord.count(),
        prisma.externalEvidenceCatalogItem.count(),
        prisma.externalEvidenceCatalogItem.count({
          where: { reviewStatus: 'ACCEPTED' },
        }),
        prisma.externalSourceRecord.count({ where: { doi: { not: null } } }),
        prisma.externalSourceRecord.count({
          where: { abstractText: { not: null } },
        }),
        prisma.externalSourceRecord.count({
          where: { sourceArtifacts: { some: {} } },
        }),
        prisma.externalSourceRecord.count({
          where: { sourceTextChunks: { some: {} } },
        }),
        prisma.externalSourceRecord.count({
          where: { researchReviewPapers: { some: {} } },
        }),
        prisma.sourceArtifactRecord.count(),
        prisma.sourceArtifactRecord.count({
          where: {
            mimeType: {
              in: ['application/pdf', 'application/xml', 'text/html'],
            },
          },
        }),
        prisma.sourceArtifactRecord.count({
          where: { chunks: { some: {} } },
        }),
        prisma.sourceArtifactRecord.count({
          where: { failureMessage: { not: null } },
        }),
        prisma.scientificEvidenceFact.count(),
        prisma.scientificEvidenceFact.count({
          where: { factLayer: CANONICAL_FACT_LAYER },
        }),
        prisma.scientificEvidenceFact.count({
          where: { factLayer: CANONICAL_FACT_LAYER, decisionReady: true },
        }),
        prisma.scientificEvidenceFact.count({
          where: { factLayer: CANONICAL_FACT_LAYER, decisionReady: false },
        }),
        prisma.evidenceBenchmarkRecord.count(),
        prisma.evidenceBenchmarkRecord.count({
          where: { decisionReady: true },
        }),
        prisma.evidenceBenchmarkAggregate.count(),
        prisma.researchExtractionResult.count(),
        prisma.researchExtractionResult.count({ where: { status: 'VALID' } }),
        prisma.researchExtractionResult.count({ where: { status: 'INVALID' } }),
      ]);

      const stage = (
        stageName: string,
        count: number,
        previous: number | null,
      ) =>
        funnelStageCountSchema.parse({
          stage: stageName,
          count,
          conversion_rate: conversionRate(count, previous),
        });

      return evidenceFunnelGroupSchema.parse({
        article: [
          stage('discovered', articleDiscovered, null),
          stage('cataloged', articleCataloged, articleDiscovered),
          stage('accepted', articleAccepted, articleCataloged),
          stage('has_stable_identifier', articleStableId, articleAccepted),
          stage('has_abstract', articleAbstract, articleAccepted),
          stage('has_full_text_artifact', articleHasArtifact, articleAccepted),
          stage('has_source_text_chunks', articleHasChunks, articleHasArtifact),
          // technical_domain_match + strict_table_ready not yet captured deterministically
          stage('technical_domain_match', 0, articleHasChunks),
          stage('strict_table_ready', 0, articleHasChunks),
          stage(
            'has_research_review',
            articleHasResearchReview,
            articleAccepted,
          ),
        ],
        document: [
          stage('artifact_present', documentArtifacts, null),
          stage('pdf_xml_html_detected', documentParseable, documentArtifacts),
          stage('parse_attempted', documentParseable, documentArtifacts),
          // pages_parsed/text_blocks_parsed/tables_parsed not yet captured
          stage('pages_parsed', 0, documentParseable),
          stage('text_blocks_parsed', documentParsed, documentParseable),
          stage('tables_parsed', 0, documentParseable),
          stage('parse_warnings', 0, documentParseable),
          stage('parse_failures', documentParseFailures, documentParseable),
        ],
        fact: [
          stage('scientific_facts', factScientific, null),
          stage('canonical_facts', factCanonical, factScientific),
          // normalized_facts not yet distinct from canonical_facts in current schema
          stage('normalized_facts', factCanonical, factCanonical),
          stage('decision_ready_facts', factDecisionReady, factCanonical),
          stage('low_confidence_facts', factLowConfidence, factCanonical),
          stage('invalid_facts', 0, factScientific),
        ],
        benchmark: [
          stage('benchmark_records', benchmarkRecords, null),
          // normalized_benchmark_records not yet distinct in current schema
          stage(
            'normalized_benchmark_records',
            benchmarkRecords,
            benchmarkRecords,
          ),
          stage(
            'decision_ready_benchmark_records',
            benchmarkDecisionReady,
            benchmarkRecords,
          ),
          stage(
            'benchmark_aggregates',
            benchmarkAggregates,
            benchmarkDecisionReady,
          ),
          stage('unit_normalization_failures', 0, benchmarkRecords),
        ],
        research_cell: [
          // Cell-level statuses come in Phase 4; for now expose extraction-result
          // level coverage so the UI has a non-empty research_cell funnel.
          stage('total_extraction_results', researchTotal, null),
          stage('valid_results', researchValid, researchTotal),
          stage('invalid_results', researchInvalid, researchTotal),
        ],
      });
    },

    async getAcceptedEvidenceReadinessCandidates(limit = 500) {
      const records = await prisma.externalEvidenceCatalogItem.findMany({
        where: {
          reviewStatus: 'ACCEPTED',
        },
        select: {
          id: true,
          sourceRecordId: true,
          title: true,
          extractionStatus: true,
          normalizationStatus: true,
          evidenceQuality: true,
          claimCount: true,
          sourceRecord: {
            select: {
              sourceType: true,
              publishedAt: true,
              doi: true,
              sourceUrl: true,
              pdfUrl: true,
              xmlUrl: true,
              abstractText: true,
              _count: {
                select: {
                  sourceArtifacts: true,
                  sourceTextChunks: true,
                },
              },
            },
          },
          scientificFacts: {
            where: {
              factLayer: CANONICAL_FACT_LAYER,
            },
            select: {
              decisionReady: true,
            },
          },
          benchmarkRecords: {
            select: {
              decisionReady: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      });

      return records.map((record) =>
        mapAcceptedEvidenceReadinessCandidate(record),
      );
    },

    async createDiscoveryTargets(targets) {
      const parsedTargets = targets.map((target) =>
        discoveryTargetSchema.parse(target),
      );
      await prisma.evidenceDiscoveryTarget.createMany({
        data: parsedTargets.map((target) => ({
          id: target.target_id,
          auditReportId: target.audit_report_id,
          gapId: target.gap_id,
          query: target.query,
          providers: target.providers,
          priority: target.priority,
          status: target.status,
          recordsFound: target.records_found,
          recordsStaged: target.records_staged,
          failureDetail: target.failure_detail
            ? toInputJson(target.failure_detail)
            : Prisma.JsonNull,
          completedAt: target.completed_at
            ? new Date(target.completed_at)
            : null,
        })),
      });

      return parsedTargets.map((target) => target.target_id);
    },

    async getQueuedDiscoveryTargets(limit = 10) {
      const records = await prisma.evidenceDiscoveryTarget.findMany({
        where: { status: 'queued' },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        take: limit,
      });

      return records.map(mapDiscoveryTarget);
    },

    async listDiscoveryTargets(limit = 50) {
      const records = await prisma.evidenceDiscoveryTarget.findMany({
        orderBy: [
          { status: 'asc' },
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
      });

      return records.map(mapDiscoveryTarget);
    },

    async updateDiscoveryTargetStatus(targetId, update) {
      await prisma.evidenceDiscoveryTarget.update({
        where: { id: targetId },
        data: {
          status: update.status,
          recordsFound: update.records_found,
          recordsStaged: update.records_staged,
          failureDetail: update.failure_detail
            ? toInputJson(update.failure_detail)
            : undefined,
          completedAt:
            update.status === 'completed' || update.status === 'failed'
              ? new Date()
              : undefined,
        },
      });
    },

    async getDiscoveryStatusSummary(limit = 25) {
      const [
        activeTargets,
        queuedTargets,
        completedTargets,
        failedTargets,
        aggregate,
        targets,
      ] = await prisma.$transaction([
        prisma.evidenceDiscoveryTarget.count({ where: { status: 'running' } }),
        prisma.evidenceDiscoveryTarget.count({ where: { status: 'queued' } }),
        prisma.evidenceDiscoveryTarget.count({
          where: { status: 'completed' },
        }),
        prisma.evidenceDiscoveryTarget.count({ where: { status: 'failed' } }),
        prisma.evidenceDiscoveryTarget.aggregate({
          _sum: { recordsStaged: true },
        }),
        prisma.evidenceDiscoveryTarget.findMany({
          orderBy: [
            { status: 'asc' },
            { priority: 'asc' },
            { createdAt: 'desc' },
          ],
          take: limit,
        }),
      ]);

      return {
        active_targets: activeTargets,
        queued_targets: queuedTargets,
        completed_targets: completedTargets,
        failed_targets: failedTargets,
        total_records_staged: aggregate._sum.recordsStaged ?? 0,
        targets: targets.map(mapDiscoveryTarget),
      };
    },

    async createAcquisitionAttempt(attempt) {
      const parsed = acquisitionAttemptSchema.parse(attempt);
      const created = await prisma.evidenceAcquisitionAttempt.create({
        data: {
          id: parsed.attempt_id,
          sourceRecordId: parsed.source_record_id,
          strategy: parsed.strategy,
          status: parsed.status,
          foundUrl: parsed.found_url,
          foundAccessStatus: parsed.found_access_status?.toUpperCase() ?? null,
          failureReason: parsed.failure_reason,
        },
        select: { id: true },
      });

      return created.id;
    },

    async getQueuedAcquisitionAttempts(limit = 10) {
      const records = await prisma.evidenceAcquisitionAttempt.findMany({
        where: { status: 'queued' },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return records.map(mapAcquisitionAttempt);
    },

    async listAcquisitionAttempts(limit = 50) {
      const records = await prisma.evidenceAcquisitionAttempt.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records.map(mapAcquisitionAttempt);
    },

    async updateAcquisitionAttemptStatus(attemptId, update) {
      await prisma.evidenceAcquisitionAttempt.update({
        where: { id: attemptId },
        data: {
          status: update.status,
          foundUrl: update.found_url,
          foundAccessStatus: update.found_access_status?.toUpperCase(),
          failureReason: update.failure_reason,
        },
      });
    },

    async getAcquisitionStatusSummary(limit = 25) {
      const [queued, running, successful, failed, skipped, attempts] =
        await prisma.$transaction([
          prisma.evidenceAcquisitionAttempt.count({
            where: { status: 'queued' },
          }),
          prisma.evidenceAcquisitionAttempt.count({
            where: { status: 'running' },
          }),
          prisma.evidenceAcquisitionAttempt.count({
            where: { status: 'success' },
          }),
          prisma.evidenceAcquisitionAttempt.count({
            where: { status: 'failed' },
          }),
          prisma.evidenceAcquisitionAttempt.count({
            where: { status: 'skipped' },
          }),
          prisma.evidenceAcquisitionAttempt.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
        ]);

      return {
        queued_attempts: queued,
        running_attempts: running,
        successful_attempts: successful,
        failed_attempts: failed,
        skipped_attempts: skipped,
        attempts: attempts.map(mapAcquisitionAttempt),
      };
    },

    async getNeedsFullTextSourceRecords(limit = 50) {
      const records = await prisma.externalSourceRecord.findMany({
        where: {
          catalogEvidenceItems: {
            some: {
              reviewStatus: 'ACCEPTED',
              extractionStatus: {
                in: ['needs_full_text', 'insufficient_source'],
              },
            },
          },
          sourceArtifacts: { none: {} },
          sourceTextChunks: { none: {} },
          acquisitionAttempts: { none: {} },
        },
        select: {
          id: true,
          title: true,
          doi: true,
          sourceUrl: true,
          pdfUrl: true,
          xmlUrl: true,
          accessStatus: true,
          license: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return records.map((record) => ({
        source_record_id: record.id,
        title: record.title,
        doi: record.doi,
        source_url: record.sourceUrl,
        pdf_url: record.pdfUrl,
        xml_url: record.xmlUrl,
        access_status: record.accessStatus.toLowerCase(),
        license: record.license,
        has_traceable_full_text: false,
      }));
    },

    async markSourceRecordFullTextResolved(input) {
      const urlField = input.strategy === 'direct_xml' ? 'xmlUrl' : 'pdfUrl';
      await prisma.externalSourceRecord.update({
        where: { id: input.sourceRecordId },
        data: {
          [urlField]: input.foundUrl,
          accessStatus: input.accessStatus
            ? (input.accessStatus.toUpperCase() as never)
            : undefined,
        },
      });
    },
  };
}
