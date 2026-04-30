import {
    evidenceVeracityScoreSchema,
    metadataQualityProfileSchema,
    researchEvidencePackSchema,
    type ConfidenceLevel,
    type EvidenceVeracityScore,
    type MetadataQualityProfile,
    type RawEvidenceRecord,
    type ResearchEvidencePack,
    type ResearchEvidenceTrace,
    type ResearchExtractionResult,
    type ResearchMetricMeasurement,
    type ResearchPaperMetadata,
    type ResearchReviewDetail,
} from '@metrev/domain-contracts';

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readMetadataQuality(
  metadata: Record<string, unknown> | null,
): MetadataQualityProfile | undefined {
  const parsed = metadataQualityProfileSchema.safeParse(
    metadata?.metadata_quality,
  );

  return parsed.success ? parsed.data : undefined;
}

function readVeracityScore(
  metadata: Record<string, unknown> | null,
): EvidenceVeracityScore | undefined {
  const parsed = evidenceVeracityScoreSchema.safeParse(
    metadata?.veracity_score,
  );

  return parsed.success ? parsed.data : undefined;
}

function readSourceArtifactId(
  metadata: Record<string, unknown> | null,
): string | undefined {
  return (
    readString(metadata?.local_source_artifact_id) ??
    readString(metadata?.source_artifact_id) ??
    undefined
  );
}

function confidenceFromResults(
  results: ResearchExtractionResult[],
): ConfidenceLevel {
  if (results.some((result) => result.confidence === 'high')) {
    return 'high';
  }

  if (results.some((result) => result.confidence === 'medium')) {
    return 'medium';
  }

  return 'low';
}

function strengthFromConfidence(confidence: ConfidenceLevel) {
  switch (confidence) {
    case 'high':
      return 'strong' as const;
    case 'medium':
      return 'moderate' as const;
    default:
      return 'weak' as const;
  }
}

function normalizedMetricsFromResults(
  results: ResearchExtractionResult[],
): ResearchMetricMeasurement[] {
  return results.flatMap((result) => {
    const metrics = (result.normalized_payload as { metrics?: unknown })
      .metrics;
    return Array.isArray(metrics)
      ? metrics.filter(
          (metric): metric is ResearchMetricMeasurement =>
            Boolean(metric) && typeof metric === 'object',
        )
      : [];
  });
}

function traceReferenceKey(input: {
  columnId: string;
  trace: ResearchEvidenceTrace;
}) {
  return [
    input.columnId,
    input.trace.source,
    input.trace.source_document_id ?? '',
    input.trace.claim_id ?? '',
    input.trace.source_locator ?? '',
    input.trace.page_number ?? '',
  ].join('|');
}

function evidenceTraceReferences(results: ResearchExtractionResult[]): Array<{
  claim_id: string | null;
  column_id: string;
  page_number: number | null;
  source: ResearchEvidenceTrace['source'];
  source_document_id: string | null;
  source_locator: string | null;
}> {
  const references = new Map<
    string,
    {
      claim_id: string | null;
      column_id: string;
      page_number: number | null;
      source: ResearchEvidenceTrace['source'];
      source_document_id: string | null;
      source_locator: string | null;
    }
  >();

  for (const result of results) {
    for (const trace of result.evidence_trace) {
      references.set(traceReferenceKey({ columnId: result.column_id, trace }), {
        claim_id: trace.claim_id ?? null,
        column_id: result.column_id,
        page_number: trace.page_number ?? null,
        source: trace.source,
        source_document_id: trace.source_document_id ?? null,
        source_locator: trace.source_locator ?? null,
      });
    }
  }

  return [...references.values()];
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }

  return [];
}

function isLimitationKey(key: string): boolean {
  return /(limitation|issue|barrier|risk|fouling|scaling|gap|dependency|challenge)/i.test(
    key,
  );
}

function limitationsFromAnswer(answer: unknown): string[] {
  if (!answer || typeof answer !== 'object') {
    return [];
  }

  return Object.entries(answer as Record<string, unknown>).flatMap(
    ([key, value]) => (isLimitationKey(key) ? collectStringValues(value) : []),
  );
}

function genericLimitationItems(answer: unknown): string[] {
  if (!answer || typeof answer !== 'object') {
    return [];
  }

  return collectStringValues((answer as { items?: unknown }).items);
}

function stringifyAnswer(answer: unknown): string {
  if (typeof answer === 'string') {
    return answer;
  }

  if (answer && typeof answer === 'object') {
    const record = answer as Record<string, unknown>;
    if (typeof record.summary === 'string') {
      return record.summary;
    }
    if (Array.isArray(record.items)) {
      return record.items.join(' ');
    }
  }

  return JSON.stringify(answer);
}

function buildEvidenceRecord(input: {
  limitationColumnIds: Set<string>;
  packStatus: ResearchEvidencePack['status'];
  paper: ResearchPaperMetadata;
  results: ResearchExtractionResult[];
  reviewId: string;
}): RawEvidenceRecord {
  const confidence = confidenceFromResults(input.results);
  const metrics = normalizedMetricsFromResults(input.results);
  const metadata = asRecord(input.paper.metadata);
  const metadataQuality = readMetadataQuality(metadata);
  const veracityScore = readVeracityScore(metadata);
  const sourceArtifactId = readSourceArtifactId(metadata);
  const traceReferences = evidenceTraceReferences(input.results);
  const sourceLocatorRefs = uniqueStrings(
    traceReferences.map((trace) => trace.source_locator),
  );
  const pageLocatorRefs = uniqueStrings(
    traceReferences.map((trace) =>
      trace.page_number === null ? null : `page:${trace.page_number}`,
    ),
  );
  const reviewedClaimIds = uniqueStrings(
    traceReferences.map((trace) => trace.claim_id),
  );
  const resultIds = uniqueStrings(
    input.results.map((result) => result.result_id ?? null),
  );
  const limitations = uniqueStrings([
    ...input.results.flatMap((result) => limitationsFromAnswer(result.answer)),
    ...input.results.flatMap((result) =>
      input.limitationColumnIds.has(result.column_id)
        ? genericLimitationItems(result.answer)
        : [],
    ),
  ]);

  return {
    evidence_id: `research:${input.reviewId}:${input.paper.paper_id}`,
    evidence_type: 'literature_evidence',
    title: input.paper.title,
    summary: input.results
      .slice(0, 3)
      .map((result) => stringifyAnswer(result.answer))
      .join(' ')
      .slice(0, 900),
    applicability_scope: {
      review_id: input.reviewId,
      source_document_id: input.paper.source_document_id,
      doi: input.paper.doi,
      journal: input.paper.journal,
    },
    strength_level: strengthFromConfidence(confidence),
    provenance_note: `Built from validated research extraction results for source document ${input.paper.source_document_id}.`,
    quantitative_metrics: Object.fromEntries(
      metrics.map((metric) => [
        metric.metric_key,
        {
          original_value: metric.original_value,
          original_unit: metric.original_unit,
          normalized_value: metric.normalized_value,
          normalized_unit: metric.normalized_unit,
          normalization_rule_id: metric.normalization_rule_id,
        },
      ]),
    ),
    operating_conditions: {},
    block_mapping: uniqueStrings(
      input.results.map((result) => result.column_id),
    ),
    limitations,
    contradiction_notes: [],
    benchmark_context:
      input.paper.journal ?? input.paper.publisher ?? undefined,
    review_status: input.packStatus === 'reviewed' ? 'accepted' : 'pending',
    source_document_id: input.paper.source_document_id,
    source_locator_refs: [...sourceLocatorRefs, ...pageLocatorRefs],
    reviewed_claim_ids: reviewedClaimIds,
    source_artifact_ids: uniqueStrings([sourceArtifactId]),
    evidence_trace_refs: traceReferences,
    extraction_result_ids: resultIds,
    ...(sourceArtifactId ? { source_artifact_id: sourceArtifactId } : {}),
    ...(metadataQuality ? { metadata_quality: metadataQuality } : {}),
    ...(veracityScore ? { veracity_score: veracityScore } : {}),
    tags: uniqueStrings([
      'research-review',
      `review:${input.reviewId}`,
      input.paper.source_type,
      metadataQuality ? `metadata-quality:${metadataQuality.level}` : null,
      veracityScore ? `veracity:${veracityScore.level}` : null,
      sourceArtifactId ? 'local-source-artifact' : null,
    ]),
  };
}

export function buildResearchEvidencePack(input: {
  now?: string;
  packId: string;
  review: ResearchReviewDetail;
  status: ResearchEvidencePack['status'];
  title?: string;
}): ResearchEvidencePack {
  const substantiveColumnIds = new Set(
    input.review.columns
      .filter((column) => column.type !== 'metadata')
      .map((column) => column.column_id),
  );
  const validResults = input.review.extraction_results.filter(
    (result) =>
      result.status === 'valid' && substantiveColumnIds.has(result.column_id),
  );
  const limitationColumnIds = new Set(
    input.review.columns
      .filter(
        (column) =>
          column.group === 'limitations' ||
          column.column_id === 'implementation_factors',
      )
      .map((column) => column.column_id),
  );
  const resultsByPaper = new Map<string, ResearchExtractionResult[]>();

  for (const result of validResults) {
    const existing = resultsByPaper.get(result.paper_id) ?? [];
    existing.push(result);
    resultsByPaper.set(result.paper_id, existing);
  }

  const evidenceItems = input.review.papers.flatMap((paper) => {
    const results = resultsByPaper.get(paper.paper_id) ?? [];
    return results.length > 0
      ? [
          buildEvidenceRecord({
            limitationColumnIds,
            packStatus: input.status,
            paper,
            results,
            reviewId: input.review.review_id,
          }),
        ]
      : [];
  });
  const metrics = normalizedMetricsFromResults(validResults);
  const missingFields = uniqueStrings(
    validResults.flatMap((result) => result.missing_fields),
  );
  const now = input.now ?? new Date().toISOString();

  return researchEvidencePackSchema.parse({
    pack_id: input.packId,
    review_id: input.review.review_id,
    title: input.title ?? `${input.review.title} evidence pack`,
    status: input.status,
    source_result_ids: validResults.flatMap((result) =>
      result.result_id ? [result.result_id] : [],
    ),
    evidence_items: evidenceItems,
    metrics,
    missing_fields: missingFields,
    confidence: confidenceFromResults(validResults),
    payload: {
      review_query: input.review.query,
      valid_result_count: validResults.length,
      paper_count: input.review.papers.length,
    },
    created_at: now,
    updated_at: now,
  });
}
