import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';

import { Prisma } from '../generated/prisma/client';
import { disconnectPrismaClient, getPrismaClient } from '../src/prisma-client';
import {
  buildEvidenceVeracityScore,
  buildMetadataQualityProfile,
  chunkTextPages,
  mapAccessStatusToDatabase,
} from '../src/source-artifacts';

import {
  researchPaperMetadataSchema,
  type ExternalEvidenceAccessStatus,
  type ResearchPaperMetadata,
} from '@metrev/domain-contracts';
import type {
  CanonicalEvidenceMeasurementCandidate,
  CanonicalEvidenceQualitativeCandidate,
} from '@metrev/llm-adapter';
import {
  generateCanonicalEvidenceMeasurementCandidates,
  generateCanonicalEvidenceQualitativeCandidates,
} from '@metrev/llm-adapter';
import {
  hydrateResearchPaperText,
  type HydratedResearchPaperText,
} from '@metrev/research-intelligence';

import {
  CANONICAL_FACT_LAYER,
  CANONICALIZATION_STATUSES,
  canonicalizeMaterial,
  canonicalizeScientificEvidenceRecord,
  normalizeScientificMeasurement,
} from './canonical-scientific-evidence.mjs';
import {
  optionFlag,
  optionNumber,
  optionValue,
  parseScriptOptions,
} from './external-ingestion-shared.mjs';
import { loadWorkspaceEnv } from './load-workspace-env.mjs';

loadWorkspaceEnv(import.meta.url);

const CANONICALIZATION_TRIGGER_MODE = 'bulk_canonicalization';
const DEFAULT_BATCH_SIZE = 1000;
const DEFAULT_FULL_TEXT_CONCURRENCY = 4;
const HYDRATED_FULL_TEXT_EXTRACTOR_VERSION = 'canonical-hydrated-fulltext-v1';
const LLM_SCHEMA_VALIDATED_EXTRACTOR_VERSION =
  'canonical-llm-schema-validated-v1';
const PERMISSIVE_LICENSE_PATTERN =
  /(creative\s+commons|cc[-\s]?by|cc[-\s]?0|public\s+domain|open\s+data|mit|apache)/i;
const ALLOWED_LLM_MEASUREMENT_FIELDS = new Map<string, string>([
  ['power_density', 'power_density_w_m2'],
  ['current_density', 'current_density_a_m2'],
  ['cod', 'cod_mg_l'],
  ['hrt', 'hydraulic_retention_time_h'],
  ['conductivity', 'conductivity_ms_cm'],
  ['temperature', 'temperature_c'],
  ['ph', 'ph'],
  ['coulombic_efficiency', 'coulombic_efficiency_pct'],
  ['hydrogen_production', 'hydrogen_production_ml_l_d'],
  ['contaminant_removal_efficiency', 'contaminant_removal_efficiency_pct'],
  ['energy_input', 'energy_input_kwh_m3'],
  ['methane_biogas_relationship', 'methane_biogas_relationship'],
  ['trl_maturity', 'trl'],
  ['cost_indicators', 'cost_indicator_usd'],
]);
const ALLOWED_LLM_SYSTEM_TYPES = new Set([
  'MFC',
  'MEC',
  'MET',
  'MDC',
  'BES',
  'bioelectrochemical_system',
]);
const ALLOWED_LLM_REACTOR_TYPES = new Set([
  'single_chamber',
  'two_chamber',
  'air_cathode',
  'membrane_less',
  'tubular',
  'upflow',
  'stacked',
]);
const ALLOWED_LLM_MATERIAL_FIELD_COMPONENTS = new Map<string, string>([
  ['anode_material', 'anode'],
  ['cathode_material', 'cathode'],
  ['membrane_separator', 'membrane_separator'],
  ['catalyst_material', 'catalyst'],
  ['current_collector_material', 'current_collector'],
  ['material', 'material_unspecified'],
]);
const ALLOWED_LLM_LIMITATION_FIELDS = new Set([
  'reported_limitations',
  'operating_constraints',
  'failure_modes',
  'reported_tradeoffs',
]);
const ALLOWED_LLM_THEORY_FIELDS = new Set([
  'electron_transfer_mechanism',
  'biofilm_mechanism',
  'microbial_metabolism',
  'ion_transport_mechanism',
  'anode_reaction_mechanism',
  'cathode_reaction_mechanism',
  'mass_transport_mechanism',
  'redox_mediator_mechanism',
  'resource_recovery_mechanism',
  'electrochemical_model',
]);

type PrismaClientLike = ReturnType<typeof getPrismaClient>;

export function stripPostgresNullBytes(value: string): string {
  return value.includes('\u0000') ? value.replace(/\u0000/g, '') : value;
}

function sanitizePostgresText<T>(value: T): T {
  if (typeof value === 'string') {
    return stripPostgresNullBytes(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizePostgresText(entry)) as T;
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizePostgresText(entry),
      ]),
    ) as T;
  }

  return value;
}

interface CanonicalizationCliConfig {
  batchSize: number;
  limit: number | null;
  resume: boolean;
  replacePlaceholders: boolean;
  fullTextMode: 'existing' | 'none' | 'hydrate';
  fullTextConcurrency: number;
  llmMode: 'disabled' | 'schema_validated';
  dryRun: boolean;
}

interface CanonicalizationHydrationPersistence {
  accessStatus: 'GOLD' | 'GREEN' | 'HYBRID' | 'BRONZE' | 'CLOSED' | 'UNKNOWN';
  chunks: Array<{
    charEnd: number | null;
    charStart: number | null;
    chunkIndex: number;
    metadata: Prisma.InputJsonObject;
    pageNumber: number | null;
    sourceLocator: string;
    text: string;
  }>;
  contentType: string | null;
  extractionMethod: string;
  fetchedFrom: string;
  fileHash: string;
  fileName: string;
  fileSizeBytes: number;
  importedAt: Date;
  license: string | null;
  metadataQuality: Prisma.InputJsonObject;
  mimeType: string;
  pageCount: number | null;
  source: 'xml' | 'html' | 'pdf';
  veracityScore: Prisma.InputJsonObject;
}

interface CanonicalizationHydrationOutcome {
  attempted: boolean;
  blockedReason: string | null;
  chunkCount: number;
  contentType: string | null;
  fetched: boolean;
  fetchedFrom: string | null;
  persistence: CanonicalizationHydrationPersistence | null;
  persisted: boolean;
  policy:
    | 'not_requested'
    | 'allowed'
    | 'blocked'
    | 'fetch_failed'
    | 'fetched_no_signal';
  source: 'xml' | 'html' | 'pdf' | null;
}

interface CanonicalizationRecordResult {
  record: any;
  status: string;
  facts: any[];
  missingFields: string[];
  qualityFlags: string[];
  usedSegments: number;
  sourceTextHashes: string[];
  extractorVersion: string;
  hydration: CanonicalizationHydrationOutcome;
  error?: string;
}

type MeasurementCandidateGenerator = (input: {
  maxCandidates?: number;
  paper: ResearchPaperMetadata;
  sourceText: string;
}) => Promise<CanonicalEvidenceMeasurementCandidate[] | null>;

type QualitativeCandidateGenerator = (input: {
  maxCandidates?: number;
  paper: ResearchPaperMetadata;
  sourceText: string;
}) => Promise<CanonicalEvidenceQualitativeCandidate[] | null>;

interface CanonicalizationCounters {
  processed: number;
  canonicalExtracted: number;
  insufficientSource: number;
  needsFullText: number;
  needsReview: number;
  failed: number;
  skipped: number;
  canonicalFacts: number;
  benchmarkRecords: number;
}

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return typeof value === 'string' ? stripPostgresNullBytes(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry === undefined ? null : toPrismaJsonValue(entry),
    ) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object' && value !== undefined) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).flatMap(
        ([key, entry]) =>
          entry === undefined ? [] : [[key, toPrismaJsonValue(entry)]],
      ),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonObject(
  value: Record<string, unknown>,
): Prisma.InputJsonObject {
  return toPrismaJsonValue(value) as Prisma.InputJsonObject;
}

export function parseCanonicalizationCliConfig(
  argv = process.argv.slice(2),
): CanonicalizationCliConfig {
  const options = parseScriptOptions(argv);
  const fullText = String(optionValue(options, 'full-text', 'existing')).trim();
  const llmMode = String(optionValue(options, 'llm-mode', 'disabled')).trim();
  const rawLimit = optionValue(options, 'limit', null);

  return {
    batchSize: optionNumber(
      options,
      'batch-size',
      Number(process.env.EVIDENCE_BATCH_SIZE ?? DEFAULT_BATCH_SIZE),
    ),
    limit:
      rawLimit === null || rawLimit === undefined
        ? null
        : optionNumber(options, 'limit', 1),
    resume: optionFlag(options, 'resume', true),
    replacePlaceholders: optionFlag(options, 'replace-placeholders', true),
    fullTextMode:
      fullText === 'none'
        ? 'none'
        : fullText === 'hydrate'
          ? 'hydrate'
          : 'existing',
    fullTextConcurrency: Math.max(
      1,
      optionNumber(
        options,
        'full-text-concurrency',
        Number(
          process.env.EVIDENCE_FULL_TEXT_CONCURRENCY ??
            DEFAULT_FULL_TEXT_CONCURRENCY,
        ),
      ),
    ),
    llmMode: llmMode === 'schema_validated' ? 'schema_validated' : 'disabled',
    dryRun: optionFlag(options, 'dry-run', false),
  };
}

function databaseAccessStatusToContractStatus(
  value: string | null | undefined,
): ExternalEvidenceAccessStatus {
  switch ((value ?? 'UNKNOWN').toUpperCase()) {
    case 'GOLD':
      return 'gold';
    case 'GREEN':
      return 'green';
    case 'HYBRID':
      return 'hybrid';
    case 'BRONZE':
      return 'bronze';
    case 'CLOSED':
      return 'closed';
    default:
      return 'unknown';
  }
}

function sourceTypeToResearchSourceType(value: string | null | undefined) {
  switch ((value ?? 'MANUAL').toUpperCase()) {
    case 'OPENALEX':
      return 'openalex' as const;
    case 'CROSSREF':
      return 'crossref' as const;
    case 'EUROPE_PMC':
      return 'europe_pmc' as const;
    case 'SUPPLIER_PROFILE':
      return 'supplier_profile' as const;
    case 'MARKET_SNAPSHOT':
      return 'market_snapshot' as const;
    case 'CURATED_MANIFEST':
      return 'curated_manifest' as const;
    default:
      return 'manual' as const;
  }
}

export function canPersistHydratedSourceText(record: any): {
  accessStatus: ExternalEvidenceAccessStatus;
  allowed: boolean;
  reason: string | null;
} {
  const sourceRecord = record.sourceRecord ?? {};
  const accessStatus = databaseAccessStatusToContractStatus(
    typeof sourceRecord.accessStatus === 'string'
      ? sourceRecord.accessStatus
      : null,
  );
  const license =
    typeof sourceRecord.license === 'string' ? sourceRecord.license.trim() : '';
  const hasTrackedUrl = [
    sourceRecord.sourceUrl,
    sourceRecord.pdfUrl,
    sourceRecord.xmlUrl,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);

  if (!hasTrackedUrl) {
    return {
      accessStatus,
      allowed: false,
      reason: 'missing_tracked_full_text_url',
    };
  }

  if (
    (accessStatus === 'closed' || accessStatus === 'unknown') &&
    !PERMISSIVE_LICENSE_PATTERN.test(license)
  ) {
    return {
      accessStatus,
      allowed: false,
      reason: 'access_or_license_policy_blocked',
    };
  }

  return { accessStatus, allowed: true, reason: null };
}

function buildResearchPaperMetadataForCanonicalization(
  record: any,
): ResearchPaperMetadata {
  const sourceRecord = record.sourceRecord ?? {};
  const publishedYear =
    typeof sourceRecord.publicationYear === 'number'
      ? sourceRecord.publicationYear
      : sourceRecord.publishedAt instanceof Date
        ? sourceRecord.publishedAt.getUTCFullYear()
        : null;

  return researchPaperMetadataSchema.parse({
    paper_id: `catalog:${record.id}`,
    source_document_id: sourceRecord.id ?? record.sourceRecordId,
    title: sourceRecord.title ?? record.title,
    authors: Array.isArray(sourceRecord.authors) ? sourceRecord.authors : [],
    year: publishedYear,
    doi: sourceRecord.doi ?? null,
    journal: sourceRecord.journal ?? null,
    publisher: sourceRecord.publisher ?? null,
    source_type: sourceTypeToResearchSourceType(sourceRecord.sourceType),
    source_url: sourceRecord.sourceUrl ?? null,
    pdf_url: sourceRecord.pdfUrl ?? null,
    xml_url: sourceRecord.xmlUrl ?? null,
    abstract_text: sourceRecord.abstractText ?? record.summary ?? null,
    citation_count: null,
    metadata:
      sourceRecord.rawPayload && typeof sourceRecord.rawPayload === 'object'
        ? (sourceRecord.rawPayload as Record<string, unknown>)
        : {},
  });
}

function buildHydratedSourceChunks(hydrated: HydratedResearchPaperText) {
  if ((hydrated.blocks?.length ?? 0) > 0) {
    return hydrated.blocks!.map((block, chunkIndex) => {
      const blockTrace =
        hydrated.trace.find(
          (trace) => trace.source_locator === block.sourceLocator,
        ) ?? null;

      return {
        charEnd: block.text.length,
        charStart: 0,
        chunkIndex,
        metadata: toPrismaJsonObject({
          caption: blockTrace?.caption ?? block.caption,
          cell_locator: blockTrace?.cell_locator ?? block.cellLocator,
          content_type: hydrated.contentType,
          extraction_method: HYDRATED_FULL_TEXT_EXTRACTOR_VERSION,
          fetched_from: hydrated.fetchedFrom,
          page_number: blockTrace?.page_number ?? block.pageNumber,
          section_label: blockTrace?.section_label ?? block.sectionLabel,
          source: hydrated.source,
          source_locator: blockTrace?.source_locator ?? block.sourceLocator,
          table_label: blockTrace?.table_label ?? block.tableLabel,
          text_span: block.text,
          trace: blockTrace ? [blockTrace] : hydrated.trace,
        }),
        pageNumber: blockTrace?.page_number ?? block.pageNumber,
        sourceLocator: blockTrace?.source_locator ?? block.sourceLocator,
        text: block.text,
      };
    });
  }

  const trace = hydrated.trace[0] ?? null;

  return chunkTextPages([hydrated.text]).map((chunk) => {
    const pageNumber =
      hydrated.source === 'pdf'
        ? (trace?.page_number ?? chunk.pageNumber)
        : (trace?.page_number ?? null);
    const sourceLocator =
      hydrated.source === 'pdf'
        ? `${hydrated.source}:${chunk.sourceLocator}`
        : `${hydrated.source}:${hydrated.fetchedFrom}:chunk:${chunk.chunkIndex}`;

    return {
      charEnd: chunk.charEnd,
      charStart: chunk.charStart,
      chunkIndex: chunk.chunkIndex,
      metadata: toPrismaJsonObject({
        caption: trace?.caption ?? chunk.caption,
        cell_locator: trace?.cell_locator ?? chunk.cellLocator,
        content_type: hydrated.contentType,
        extraction_method: HYDRATED_FULL_TEXT_EXTRACTOR_VERSION,
        fetched_from: hydrated.fetchedFrom,
        page_number: pageNumber,
        section_label: trace?.section_label ?? chunk.sectionLabel,
        source: hydrated.source,
        source_locator: trace?.source_locator ?? sourceLocator,
        table_label: trace?.table_label ?? chunk.tableLabel,
        text_span: chunk.text,
        trace: hydrated.trace,
      }),
      pageNumber,
      sourceLocator,
      text: chunk.text,
    };
  });
}

function buildHydratedSourcePersistence(input: {
  hydrated: HydratedResearchPaperText;
  record: any;
}): CanonicalizationHydrationPersistence {
  const { record } = input;
  const hydrated = sanitizePostgresText(input.hydrated);
  const sourceRecord = record.sourceRecord ?? {};
  const { accessStatus } = canPersistHydratedSourceText(record);
  const extractionMethod = `${HYDRATED_FULL_TEXT_EXTRACTOR_VERSION}:${hydrated.source}`;
  const fileHash = createHash('sha256')
    .update(
      [
        sourceRecord.id ?? record.sourceRecordId,
        hydrated.fetchedFrom,
        hydrated.text,
      ].join('\n'),
    )
    .digest('hex');
  const reviewStatus =
    record.reviewStatus === 'ACCEPTED' ? 'accepted' : 'pending';
  const derivedPageCount = new Set(
    (hydrated.blocks ?? [])
      .map((block) => block.pageNumber)
      .filter((pageNumber): pageNumber is number =>
        Number.isFinite(pageNumber),
      ),
  ).size;
  const metadataQuality = buildMetadataQualityProfile({
    accessStatus,
    doi: sourceRecord.doi ?? null,
    extractionMethod,
    fileHash,
    license: sourceRecord.license ?? null,
    pageCount:
      hydrated.source === 'pdf'
        ? Math.max(derivedPageCount, 1)
        : derivedPageCount || null,
    reviewStatus,
    title: sourceRecord.title ?? record.title ?? null,
  });
  const veracityScore = buildEvidenceVeracityScore({
    extractionMethod,
    metadataQuality,
    normalizedMetricCount: 0,
    reviewStatus,
    sourceCategory:
      typeof sourceRecord.sourceCategory === 'string'
        ? sourceRecord.sourceCategory
        : null,
    traceCount: hydrated.trace.length,
  });

  return {
    accessStatus: mapAccessStatusToDatabase(accessStatus),
    chunks: buildHydratedSourceChunks(hydrated),
    contentType: hydrated.contentType,
    extractionMethod,
    fetchedFrom: hydrated.fetchedFrom,
    fileHash,
    fileName: `${sourceRecord.id ?? record.sourceRecordId}-${hydrated.source}-hydrated.txt`,
    fileSizeBytes: Buffer.byteLength(hydrated.text, 'utf8'),
    importedAt: new Date(),
    license: sourceRecord.license ?? null,
    metadataQuality: toPrismaJsonObject(metadataQuality),
    mimeType:
      hydrated.contentType ??
      (hydrated.source === 'xml'
        ? 'application/xml'
        : hydrated.source === 'pdf'
          ? 'application/pdf'
          : 'text/html'),
    pageCount:
      hydrated.source === 'pdf'
        ? Math.max(derivedPageCount, 1)
        : derivedPageCount || null,
    source: hydrated.source,
    veracityScore: toPrismaJsonObject(veracityScore),
  };
}

function appendUniqueValues(values: string[], additions: Array<string | null>) {
  return [
    ...new Set([
      ...values,
      ...additions.filter((value): value is string => Boolean(value)),
    ]),
  ];
}

function normalizeSegmentText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function hashSegmentText(value: string) {
  return createHash('sha256').update(normalizeSegmentText(value)).digest('hex');
}

function optionalLocatorText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function optionalLocatorNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function candidateLocatorDetails(input: {
  pageNumber?: number | null;
  sectionLabel?: string | null;
  sourceLocator?: string | null;
  tableLabel?: string | null;
  cellLocator?: string | null;
  caption?: string | null;
  textSpan: string;
}) {
  return {
    source_locator: optionalLocatorText(input.sourceLocator),
    page_number: optionalLocatorNumber(input.pageNumber),
    section_label: optionalLocatorText(input.sectionLabel),
    table_label: optionalLocatorText(input.tableLabel),
    cell_locator: optionalLocatorText(input.cellLocator),
    caption: optionalLocatorText(input.caption),
    text_span: input.textSpan,
  };
}

function hasTraceableCandidateLocator(input: {
  sourceLocator?: string | null;
  textSpan: string;
}) {
  return Boolean(
    optionalLocatorText(input.sourceLocator) &&
    input.textSpan.trim().length >= 8,
  );
}

function currentSystemTypeFromFacts(facts: any[]) {
  const systemFact = facts.find(
    (fact) => fact.fieldKey === 'system_type' && fact.normalizedText,
  );
  return systemFact?.normalizedText ?? null;
}

function mergeCanonicalFacts(existingFacts: any[], candidateFacts: any[]) {
  const seen = new Set(
    existingFacts.map(
      (fact) =>
        `${fact.fieldKey}:${fact.canonicalKey ?? fact.fieldKey}:${fact.sourceTextHash}`,
    ),
  );
  const merged = [...existingFacts];

  for (const fact of candidateFacts) {
    const key = `${fact.fieldKey}:${fact.canonicalKey ?? fact.fieldKey}:${fact.sourceTextHash}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(fact);
  }

  return merged;
}

function buildSchemaValidatedMeasurementFacts(input: {
  currentFacts: any[];
  evidenceQuality: string;
  candidates: CanonicalEvidenceMeasurementCandidate[];
  record: any;
  sourceText: string;
}) {
  const systemType = currentSystemTypeFromFacts(input.currentFacts);
  const llmFacts: any[] = [];
  const llmHashes: string[] = [];

  for (const candidate of input.candidates) {
    const expectedCanonicalKey = ALLOWED_LLM_MEASUREMENT_FIELDS.get(
      candidate.fieldKey,
    );
    if (
      !expectedCanonicalKey ||
      expectedCanonicalKey !== candidate.canonicalKey
    ) {
      continue;
    }

    const normalizedSpan = normalizeSegmentText(candidate.textSpan);
    if (!normalizedSpan || !input.sourceText.includes(normalizedSpan)) {
      continue;
    }

    const normalized = normalizeScientificMeasurement({
      canonicalKey: candidate.canonicalKey,
      value: candidate.rawValue,
      unit: candidate.rawUnit,
    });

    if (
      normalized.normalizedValue === null ||
      normalized.normalizedUnit === null ||
      normalized.qualityFlags.includes('unsupported_unit') ||
      normalized.qualityFlags.includes('non_numeric_value')
    ) {
      continue;
    }

    const boundedConfidence = Math.max(
      0.55,
      Math.min(0.82, candidate.confidence || 0.62),
    );
    const sourceTextHash = hashSegmentText(normalizedSpan);
    const locatorDetails = candidateLocatorDetails({
      pageNumber: candidate.pageNumber,
      sectionLabel: candidate.sectionLabel,
      sourceLocator: candidate.sourceLocator,
      tableLabel: candidate.tableLabel,
      cellLocator: candidate.cellLocator,
      caption: candidate.caption,
      textSpan: normalizedSpan,
    });
    const traceableLocator = hasTraceableCandidateLocator({
      sourceLocator: candidate.sourceLocator,
      textSpan: normalizedSpan,
    });
    llmHashes.push(sourceTextHash);
    llmFacts.push({
      id: randomUUID(),
      sourceRecordId:
        input.record.sourceRecordId ?? input.record.sourceRecord?.id,
      catalogItemId: input.record.id,
      claimId: null,
      factLayer: CANONICAL_FACT_LAYER,
      factType: 'metric',
      fieldKey: candidate.fieldKey,
      canonicalKey: candidate.canonicalKey,
      normalizationRuleId: normalized.normalizationRuleId,
      decisionReady: traceableLocator,
      extractionSource: 'llm_schema_validated_measurement',
      missingFields: [],
      qualityFlags: [
        'llm_schema_validated_measurement',
        ...(traceableLocator ? [] : ['untraceable_source_span']),
      ],
      sourceTextHash,
      originalValue: candidate.rawValue,
      originalUnit: candidate.rawUnit,
      normalizedValue: normalized.normalizedValue,
      normalizedText: null,
      normalizedUnit: normalized.normalizedUnit,
      uncertainty: null,
      confidence: boundedConfidence,
      extractionStatus: 'canonical_extracted',
      normalizationStatus: 'normalized',
      systemType,
      reactorType: null,
      componentType: null,
      material: null,
      metricType: candidate.fieldKey,
      operatingConditionKey: null,
      evidenceQuality: input.evidenceQuality,
      payload: {
        source: CANONICAL_FACT_LAYER,
        extractor_version: LLM_SCHEMA_VALIDATED_EXTRACTOR_VERSION,
        extraction_source: 'llm_schema_validated_measurement',
        locator: candidate.sourceLocator,
        locator_details: locatorDetails,
        snippet: normalizedSpan.slice(0, 500),
        no_fabrication: true,
        llm_schema_validated: true,
      },
    });
  }

  return {
    facts: llmFacts,
    hashes: llmHashes,
  };
}

function resolvedRequiredFieldsFromFacts(facts: any[]) {
  const resolved = new Set<string>();

  for (const fact of facts) {
    if (typeof fact.fieldKey === 'string') {
      resolved.add(fact.fieldKey);
    }
    if (fact.componentType === 'anode') {
      resolved.add('anode_material');
    }
    if (fact.componentType === 'cathode') {
      resolved.add('cathode_material');
    }
    if (fact.componentType === 'membrane_separator') {
      resolved.add('membrane_separator');
    }
    if (fact.componentType === 'catalyst') {
      resolved.add('catalyst');
    }
    if (fact.componentType === 'current_collector') {
      resolved.add('current_collector');
    }
    if (fact.metricType === 'removal_efficiency') {
      resolved.add('contaminant_removal_efficiency');
    }
    if (fact.metricType === 'hydraulic_retention_time') {
      resolved.add('hrt');
    }
    if (fact.metricType === 'trl') {
      resolved.add('trl_maturity');
    }
  }

  return resolved;
}

function removeResolvedMissingFields(missingFields: string[], facts: any[]) {
  const resolved = resolvedRequiredFieldsFromFacts(facts);
  return missingFields.filter((field) => !resolved.has(field));
}

function buildSchemaValidatedQualitativeFacts(input: {
  currentFacts: any[];
  evidenceQuality: string;
  candidates: CanonicalEvidenceQualitativeCandidate[];
  record: any;
  sourceText: string;
}) {
  const systemType = currentSystemTypeFromFacts(input.currentFacts);
  const llmFacts: any[] = [];
  const llmHashes: string[] = [];

  for (const candidate of input.candidates) {
    const normalizedSpan = normalizeSegmentText(candidate.textSpan);
    if (!normalizedSpan || !input.sourceText.includes(normalizedSpan)) {
      continue;
    }

    const sourceTextHash = hashSegmentText(normalizedSpan);
    const locatorDetails = candidateLocatorDetails({
      pageNumber: candidate.pageNumber,
      sectionLabel: candidate.sectionLabel,
      sourceLocator: candidate.sourceLocator,
      tableLabel: candidate.tableLabel,
      cellLocator: candidate.cellLocator,
      caption: candidate.caption,
      textSpan: normalizedSpan,
    });
    const traceableLocator = hasTraceableCandidateLocator({
      sourceLocator: candidate.sourceLocator,
      textSpan: normalizedSpan,
    });
    const boundedConfidence = Math.max(
      0.55,
      Math.min(0.82, candidate.confidence || 0.62),
    );
    const baseFact = {
      id: randomUUID(),
      sourceRecordId:
        input.record.sourceRecordId ?? input.record.sourceRecord?.id,
      catalogItemId: input.record.id,
      claimId: null,
      factLayer: CANONICAL_FACT_LAYER,
      decisionReady: traceableLocator,
      extractionSource: 'llm_schema_validated_qualitative',
      missingFields: [],
      qualityFlags: [
        'llm_schema_validated_qualitative',
        ...(traceableLocator ? [] : ['untraceable_source_span']),
      ],
      sourceTextHash,
      originalValue: normalizedSpan,
      originalUnit: null,
      normalizedValue: null,
      normalizedUnit: null,
      uncertainty: null,
      confidence: boundedConfidence,
      extractionStatus: 'canonical_extracted',
      normalizationStatus: 'canonical_text',
      systemType,
      reactorType: null,
      componentType: null,
      material: null,
      metricType: null,
      operatingConditionKey: null,
      evidenceQuality: input.evidenceQuality,
      payload: {
        source: CANONICAL_FACT_LAYER,
        extractor_version: LLM_SCHEMA_VALIDATED_EXTRACTOR_VERSION,
        extraction_source: 'llm_schema_validated_qualitative',
        candidate_category: candidate.category,
        locator: candidate.sourceLocator,
        locator_details: locatorDetails,
        snippet: normalizedSpan.slice(0, 500),
        no_fabrication: true,
        llm_schema_validated: true,
      },
    };

    if (candidate.category === 'system_type') {
      const canonical = candidate.canonicalValue.trim();
      if (!ALLOWED_LLM_SYSTEM_TYPES.has(canonical)) {
        continue;
      }
      llmHashes.push(sourceTextHash);
      llmFacts.push({
        ...baseFact,
        factType: 'technical_field',
        fieldKey: 'system_type',
        canonicalKey: `system_type:${canonical}`,
        normalizationRuleId: 'ontology.system_type.bioelectrochemical_v1',
        normalizedText: canonical,
        systemType: canonical,
      });
      continue;
    }

    if (candidate.category === 'reactor_type') {
      const canonical = candidate.canonicalValue
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
      if (!ALLOWED_LLM_REACTOR_TYPES.has(canonical)) {
        continue;
      }
      llmHashes.push(sourceTextHash);
      llmFacts.push({
        ...baseFact,
        factType: 'technical_field',
        fieldKey: 'reactor_type',
        canonicalKey: `reactor_type:${canonical}`,
        normalizationRuleId: 'ontology.reactor_type.bioelectrochemical_v1',
        normalizedText: canonical,
        reactorType: canonical,
      });
      continue;
    }

    if (candidate.category === 'material') {
      const componentType = ALLOWED_LLM_MATERIAL_FIELD_COMPONENTS.get(
        candidate.fieldKey,
      );
      const material = canonicalizeMaterial(candidate.canonicalValue);
      if (!componentType || !material) {
        continue;
      }
      llmHashes.push(sourceTextHash);
      llmFacts.push({
        ...baseFact,
        factType: 'technical_field',
        fieldKey: candidate.fieldKey,
        canonicalKey: `material:${material}`,
        normalizationRuleId: 'ontology.material.bioelectrochemical_v1',
        normalizedText: material,
        componentType,
        material,
      });
      continue;
    }

    if (candidate.category === 'limitation') {
      if (!ALLOWED_LLM_LIMITATION_FIELDS.has(candidate.fieldKey)) {
        continue;
      }
      llmHashes.push(sourceTextHash);
      llmFacts.push({
        ...baseFact,
        factType: 'limitation',
        fieldKey: candidate.fieldKey,
        canonicalKey: `${candidate.fieldKey}:${sourceTextHash.slice(0, 16)}`,
        normalizationRuleId: `ontology.${candidate.fieldKey}.text_v1`,
        normalizedText: normalizedSpan,
      });
      continue;
    }

    if (candidate.category === 'scientific_theory') {
      if (!ALLOWED_LLM_THEORY_FIELDS.has(candidate.fieldKey)) {
        continue;
      }
      llmHashes.push(sourceTextHash);
      llmFacts.push({
        ...baseFact,
        factType: 'scientific_theory',
        fieldKey: candidate.fieldKey,
        canonicalKey: `scientific_theory:${candidate.fieldKey}:${sourceTextHash.slice(0, 16)}`,
        normalizationRuleId: `research_theory.${candidate.fieldKey}.span_v1`,
        normalizedText: normalizedSpan,
      });
    }
  }

  return {
    facts: llmFacts,
    hashes: llmHashes,
  };
}

async function applySchemaValidatedSupplement(input: {
  currentResult: CanonicalizationRecordResult;
  generateMeasurementCandidates?: MeasurementCandidateGenerator;
  generateQualitativeCandidates?: QualitativeCandidateGenerator;
  llmMode: CanonicalizationCliConfig['llmMode'];
  record: any;
  sourceText: string | null;
}) {
  const normalizedSourceText = input.sourceText
    ? normalizeSegmentText(input.sourceText)
    : null;

  if (
    input.llmMode !== 'schema_validated' ||
    !normalizedSourceText ||
    normalizedSourceText.length < 80
  ) {
    return input.currentResult;
  }

  const generator =
    input.generateMeasurementCandidates ??
    generateCanonicalEvidenceMeasurementCandidates;
  const qualitativeGenerator =
    input.generateQualitativeCandidates ??
    generateCanonicalEvidenceQualitativeCandidates;
  const paper = buildResearchPaperMetadataForCanonicalization(input.record);
  const [measurementCandidates, qualitativeCandidates] = await Promise.all([
    generator({
      maxCandidates: 8,
      paper,
      sourceText: normalizedSourceText,
    }).catch(() => null),
    qualitativeGenerator({
      maxCandidates: 12,
      paper,
      sourceText: normalizedSourceText,
    }).catch(() => null),
  ]);

  if (
    (!measurementCandidates || measurementCandidates.length === 0) &&
    (!qualitativeCandidates || qualitativeCandidates.length === 0)
  ) {
    return input.currentResult;
  }

  const measurementFacts = buildSchemaValidatedMeasurementFacts({
    currentFacts: input.currentResult.facts,
    evidenceQuality: input.record.evidenceQuality ?? 'unreviewed',
    candidates: measurementCandidates ?? [],
    record: input.record,
    sourceText: normalizedSourceText,
  });
  const qualitativeFacts = buildSchemaValidatedQualitativeFacts({
    currentFacts: input.currentResult.facts,
    evidenceQuality: input.record.evidenceQuality ?? 'unreviewed',
    candidates: qualitativeCandidates ?? [],
    record: input.record,
    sourceText: normalizedSourceText,
  });
  const llmFacts = {
    facts: [...measurementFacts.facts, ...qualitativeFacts.facts],
    hashes: [...measurementFacts.hashes, ...qualitativeFacts.hashes],
  };

  if (llmFacts.facts.length === 0) {
    return input.currentResult;
  }

  const mergedFacts = mergeCanonicalFacts(
    input.currentResult.facts,
    llmFacts.facts,
  );
  const qualityFlagAdditions = [
    measurementFacts.facts.length > 0
      ? 'llm_schema_validated_measurement'
      : null,
    qualitativeFacts.facts.length > 0
      ? 'llm_schema_validated_qualitative'
      : null,
  ];

  return {
    ...input.currentResult,
    facts: mergedFacts,
    missingFields: removeResolvedMissingFields(
      input.currentResult.missingFields,
      mergedFacts,
    ),
    qualityFlags: appendUniqueValues(
      input.currentResult.qualityFlags,
      qualityFlagAdditions,
    ),
    sourceTextHashes: appendUniqueValues(
      input.currentResult.sourceTextHashes,
      llmFacts.hashes,
    ),
    status: CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED,
  };
}

async function mapWithConcurrency<T, TResult>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }),
  );

  return results;
}

export async function canonicalizeCatalogRecordWithRuntime(
  record: any,
  input: {
    dryRun?: boolean;
    fullTextMode: CanonicalizationCliConfig['fullTextMode'];
    generateMeasurementCandidates?: MeasurementCandidateGenerator;
    generateQualitativeCandidates?: QualitativeCandidateGenerator;
    hydratePaperText?: (
      paper: ResearchPaperMetadata,
    ) => Promise<HydratedResearchPaperText | null>;
    llmMode: CanonicalizationCliConfig['llmMode'];
  },
): Promise<CanonicalizationRecordResult> {
  const baselineMode = input.fullTextMode === 'none' ? 'none' : 'existing';
  const baselineResult = canonicalizeScientificEvidenceRecord(record, {
    fullTextMode: baselineMode,
    llmMode: input.llmMode,
  });
  const hasExistingSourceTextChunks =
    Array.isArray(record.sourceRecord?.sourceTextChunks) &&
    record.sourceRecord.sourceTextChunks.length > 0;
  const shouldAttemptHydration =
    input.fullTextMode === 'hydrate' &&
    (baselineResult.status === CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT ||
      !hasExistingSourceTextChunks);

  if (!shouldAttemptHydration) {
    const result = {
      record,
      ...baselineResult,
      hydration: {
        attempted: false,
        blockedReason: null,
        chunkCount: 0,
        contentType: null,
        fetched: false,
        fetchedFrom: null,
        persistence: null,
        persisted: false,
        policy: 'not_requested',
        source: null,
      },
    };

    return applySchemaValidatedSupplement({
      currentResult: result,
      generateMeasurementCandidates: input.generateMeasurementCandidates,
      generateQualitativeCandidates: input.generateQualitativeCandidates,
      llmMode: input.llmMode,
      record,
      sourceText: Array.isArray(record.sourceRecord?.sourceTextChunks)
        ? record.sourceRecord.sourceTextChunks
            .map((chunk: { text?: unknown }) =>
              typeof chunk.text === 'string' ? chunk.text : null,
            )
            .filter((value: string | null): value is string => Boolean(value))
            .join('\n\n')
        : null,
    });
  }

  const policy = canPersistHydratedSourceText(record);
  if (!policy.allowed) {
    return {
      record,
      ...baselineResult,
      qualityFlags: appendUniqueValues(baselineResult.qualityFlags, [
        policy.reason,
      ]),
      hydration: {
        attempted: true,
        blockedReason: policy.reason,
        chunkCount: 0,
        contentType: null,
        fetched: false,
        fetchedFrom: null,
        persistence: null,
        persisted: false,
        policy: 'blocked',
        source: null,
      },
    };
  }

  const hydrated = await (input.hydratePaperText ?? hydrateResearchPaperText)(
    buildResearchPaperMetadataForCanonicalization(record),
  ).catch(() => null);

  if (!hydrated) {
    return {
      record,
      ...baselineResult,
      qualityFlags: appendUniqueValues(baselineResult.qualityFlags, [
        'full_text_fetch_failed',
      ]),
      hydration: {
        attempted: true,
        blockedReason: null,
        chunkCount: 0,
        contentType: null,
        fetched: false,
        fetchedFrom: null,
        persistence: null,
        persisted: false,
        policy: 'fetch_failed',
        source: null,
      },
    };
  }

  const persistence = buildHydratedSourcePersistence({ hydrated, record });
  const augmentedRecord = {
    ...record,
    sourceRecord: {
      ...(record.sourceRecord ?? {}),
      sourceTextChunks: [
        ...((record.sourceRecord?.sourceTextChunks as any[]) ?? []),
        ...persistence.chunks.map((chunk) => ({
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          sourceLocator: chunk.sourceLocator,
          text: chunk.text,
        })),
      ],
    },
  };
  const hydratedResult = canonicalizeScientificEvidenceRecord(augmentedRecord, {
    fullTextMode: 'existing',
    llmMode: input.llmMode,
  });
  const statusAfterHydration =
    hydratedResult.status === CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT
      ? CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE
      : hydratedResult.status;
  const hydrationPolicy =
    statusAfterHydration === CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE &&
    hydratedResult.facts.length === 0
      ? 'fetched_no_signal'
      : 'allowed';

  const hydratedCanonicalResult = {
    record: augmentedRecord,
    ...hydratedResult,
    status: statusAfterHydration,
    qualityFlags: appendUniqueValues(hydratedResult.qualityFlags, [
      hydrationPolicy === 'fetched_no_signal'
        ? 'hydrated_full_text_no_extractable_signal'
        : null,
    ]),
    hydration: {
      attempted: true,
      blockedReason: null,
      chunkCount: persistence.chunks.length,
      contentType: hydrated.contentType,
      fetched: true,
      fetchedFrom: hydrated.fetchedFrom,
      persistence,
      persisted: !input.dryRun,
      policy: hydrationPolicy,
      source: hydrated.source,
    },
  };

  return applySchemaValidatedSupplement({
    currentResult: hydratedCanonicalResult,
    generateMeasurementCandidates: input.generateMeasurementCandidates,
    generateQualitativeCandidates: input.generateQualitativeCandidates,
    llmMode: input.llmMode,
    record: augmentedRecord,
    sourceText: hydrated.text,
  });
}

function emptyCounters(): CanonicalizationCounters {
  return {
    processed: 0,
    canonicalExtracted: 0,
    insufficientSource: 0,
    needsFullText: 0,
    needsReview: 0,
    failed: 0,
    skipped: 0,
    canonicalFacts: 0,
    benchmarkRecords: 0,
  };
}

function addCounterForStatus(
  counters: CanonicalizationCounters,
  status: string,
) {
  switch (status) {
    case CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED:
      counters.canonicalExtracted += 1;
      break;
    case CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE:
      counters.insufficientSource += 1;
      break;
    case CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT:
      counters.needsFullText += 1;
      break;
    case CANONICALIZATION_STATUSES.NEEDS_REVIEW:
      counters.needsReview += 1;
      break;
    case CANONICALIZATION_STATUSES.EXTRACTION_FAILED:
      counters.failed += 1;
      break;
    default:
      counters.skipped += 1;
      break;
  }
}

function serializeRunSummary(config: CanonicalizationCliConfig) {
  return toPrismaJsonObject({
    trigger_mode: CANONICALIZATION_TRIGGER_MODE,
    extractor_mode: 'deterministic_first',
    extractor_version: 'canonical-deterministic-v1',
    llm_mode: config.llmMode,
    full_text_mode: config.fullTextMode,
    full_text_concurrency: config.fullTextConcurrency,
    replace_placeholders: config.replacePlaceholders,
    no_fabrication: true,
  });
}

function readCheckpointLastCatalogItemId(run: { checkpoint: unknown } | null) {
  if (!run?.checkpoint || typeof run.checkpoint !== 'object') {
    return null;
  }

  const checkpoint = run.checkpoint as Record<string, unknown>;
  return typeof checkpoint.last_catalog_item_id === 'string'
    ? checkpoint.last_catalog_item_id
    : null;
}

async function findOrCreateCanonicalizationRun(
  prisma: PrismaClientLike,
  config: CanonicalizationCliConfig,
) {
  if (config.dryRun) {
    return null;
  }

  if (config.resume) {
    const activeRun = await prisma.evidenceCanonicalizationRun.findFirst({
      where: {
        triggerMode: CANONICALIZATION_TRIGGER_MODE,
        status: 'STARTED',
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    if (activeRun) {
      return activeRun;
    }
  }

  const acceptedTotal = await prisma.externalEvidenceCatalogItem.count({
    where: { reviewStatus: 'ACCEPTED' },
  });
  const now = new Date();

  return prisma.evidenceCanonicalizationRun.create({
    data: {
      triggerMode: CANONICALIZATION_TRIGGER_MODE,
      status: 'STARTED',
      targetTotal: config.limit ?? acceptedTotal,
      batchSize: config.batchSize,
      startedAt: now,
      snapshotCutoff: now,
      checkpoint: toPrismaJsonObject({
        last_catalog_item_id: null,
        snapshot_cutoff: now.toISOString(),
      }),
      summary: serializeRunSummary(config),
    },
  });
}

function buildCatalogWhere(input: {
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
}): Prisma.ExternalEvidenceCatalogItemWhereInput {
  return {
    reviewStatus: 'ACCEPTED',
    updatedAt: { lte: input.snapshotCutoff },
    id: input.lastCatalogItemId ? { gt: input.lastCatalogItemId } : undefined,
  };
}

function inferApplication(record: any, fact: any) {
  const text = [
    record.title,
    record.summary,
    record.sourceRecord?.sourceCategory,
    ...(Array.isArray(record.tags) ? record.tags : []),
    fact.payload?.snippet,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/hydrogen|biohydrogen/.test(text)) {
    return 'hydrogen_recovery';
  }
  if (/nitrogen|ammonium|ammonia/.test(text)) {
    return 'nitrogen_recovery';
  }
  if (/sensor|sensing/.test(text)) {
    return 'sensing';
  }
  if (/biogas|methane/.test(text)) {
    return 'biogas_synergy';
  }
  if (/wastewater|cod|removal|treatment|effluent/.test(text)) {
    return 'wastewater_treatment';
  }
  if (/power|electricity|bioelectricity/.test(text)) {
    return 'low_power_generation';
  }
  return 'other';
}

function buildBenchmarkRecord(input: {
  record: any;
  fact: any;
  runId: string | null;
}) {
  const { record, fact, runId } = input;

  if (
    !fact.decisionReady ||
    (!fact.metricType && !fact.material && !fact.componentType)
  ) {
    return null;
  }

  const normalizedValue =
    typeof fact.normalizedValue === 'number' ? fact.normalizedValue : null;
  const scale =
    fact.fieldKey === 'scale' && fact.normalizedText
      ? fact.normalizedText
      : null;
  const trl =
    fact.metricType === 'trl' && typeof normalizedValue === 'number'
      ? Math.trunc(normalizedValue)
      : null;

  return sanitizePostgresText({
    id: randomUUID(),
    sourceRecordId: fact.sourceRecordId,
    catalogItemId: fact.catalogItemId,
    factId: fact.id,
    extractionRunId: runId,
    canonicalKey: fact.canonicalKey,
    normalizationRuleId: fact.normalizationRuleId,
    decisionReady: true,
    confidence: fact.confidence,
    sourceTextHash: fact.sourceTextHash,
    systemType: fact.systemType,
    application: inferApplication(record, fact),
    componentType: fact.componentType,
    material: fact.material,
    membraneSeparator:
      fact.componentType === 'membrane_separator' ? fact.material : null,
    operatingConditionKey: fact.operatingConditionKey,
    metricType: fact.metricType ?? fact.fieldKey,
    normalizedValue,
    normalizedUnit: fact.normalizedUnit,
    publicationYear: record.sourceRecord?.publicationYear ?? null,
    evidenceQuality: fact.evidenceQuality,
    scale,
    trl,
    costIndicator:
      fact.metricType === 'cost_indicator'
        ? (fact.normalizedText ?? fact.originalValue)
        : null,
    riskIndicator:
      fact.factType === 'limitation'
        ? (fact.normalizedText ?? 'reported')
        : null,
    payload: toPrismaJsonObject({
      source: CANONICAL_FACT_LAYER,
      extractor_version: 'canonical-deterministic-v1',
      canonical_key: fact.canonicalKey,
      snippet: fact.payload?.snippet,
      locator: fact.payload?.locator,
      no_fabrication: true,
    }),
  });
}

function toFactCreateInput(fact: any, runId: string | null) {
  return sanitizePostgresText({
    id: fact.id,
    sourceRecordId: fact.sourceRecordId,
    catalogItemId: fact.catalogItemId,
    claimId: fact.claimId,
    extractionRunId: runId,
    factLayer: fact.factLayer,
    factType: fact.factType,
    fieldKey: fact.fieldKey,
    canonicalKey: fact.canonicalKey,
    normalizationRuleId: fact.normalizationRuleId,
    decisionReady: fact.decisionReady,
    extractionSource: fact.extractionSource,
    missingFields: toPrismaJsonValue(fact.missingFields),
    qualityFlags: fact.qualityFlags,
    sourceTextHash: fact.sourceTextHash,
    originalValue: fact.originalValue,
    originalUnit: fact.originalUnit,
    normalizedValue: fact.normalizedValue,
    normalizedText: fact.normalizedText,
    normalizedUnit: fact.normalizedUnit,
    uncertainty: fact.uncertainty,
    confidence: fact.confidence,
    extractionStatus: fact.extractionStatus,
    normalizationStatus: fact.normalizationStatus,
    systemType: fact.systemType,
    reactorType: fact.reactorType,
    componentType: fact.componentType,
    material: fact.material,
    metricType: fact.metricType,
    operatingConditionKey: fact.operatingConditionKey,
    evidenceQuality: fact.evidenceQuality,
    payload: toPrismaJsonValue(fact.payload),
  });
}

async function persistCanonicalizationBatch(input: {
  prisma: PrismaClientLike;
  runId: string | null;
  records: any[];
  results: Array<{
    record: any;
    status: string;
    facts: any[];
    missingFields: string[];
    qualityFlags: string[];
    usedSegments: number;
    sourceTextHashes: string[];
    extractorVersion: string;
    hydration: CanonicalizationHydrationOutcome;
    error?: string;
  }>;
  counters: CanonicalizationCounters;
  config: CanonicalizationCliConfig;
}) {
  const { prisma, runId, records, results, counters, config } = input;
  const catalogItemIds = records.map((record) => record.id);
  const facts = results.flatMap((result) => result.facts);
  const factRows = facts.map((fact) => toFactCreateInput(fact, runId));
  const benchmarkRows = results
    .flatMap((result) =>
      result.facts.map((fact) =>
        buildBenchmarkRecord({
          record: result.record,
          fact,
          runId,
        }),
      ),
    )
    .filter(Boolean);
  const auditRows = results.map((result) => ({
    sourceRecordId: result.record.sourceRecordId,
    catalogItemId: result.record.id,
    eventType: `evidence_canonicalization_${result.status}`,
    decision: result.status,
    actor: 'system',
    reason:
      result.status === CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED
        ? 'Deterministic canonical extractor produced auditable facts.'
        : 'Canonicalization classified the source without inventing missing scientific facts.',
    payload: toPrismaJsonObject({
      extraction_run_id: runId,
      fact_count: result.facts.length,
      decision_ready_count: result.facts.filter((fact) => fact.decisionReady)
        .length,
      benchmark_record_count: result.facts.filter(
        (fact) =>
          fact.decisionReady &&
          (fact.metricType || fact.material || fact.componentType),
      ).length,
      missing_fields: result.missingFields,
      quality_flags: result.qualityFlags,
      source_text_hashes: result.sourceTextHashes,
      used_segments: result.usedSegments,
      hydration: result.hydration.attempted
        ? {
            blocked_reason: result.hydration.blockedReason,
            chunk_count: result.hydration.chunkCount,
            content_type: result.hydration.contentType,
            fetched: result.hydration.fetched,
            fetched_from: result.hydration.fetchedFrom,
            persisted: result.hydration.persisted,
            policy: result.hydration.policy,
            source: result.hydration.source,
          }
        : null,
      error: result.error,
      no_fabrication: true,
    }),
  }));

  counters.processed += records.length;
  counters.canonicalFacts += factRows.length;
  counters.benchmarkRecords += benchmarkRows.length;
  for (const result of results) {
    addCounterForStatus(counters, result.status);
  }

  if (config.dryRun) {
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.evidenceBenchmarkRecord.deleteMany({
        where: {
          catalogItemId: { in: catalogItemIds },
          OR: [
            { extractionRunId: { not: null } },
            { canonicalKey: { not: null } },
            { sourceTextHash: { not: null } },
          ],
        },
      });
      await tx.scientificEvidenceFact.deleteMany({
        where: {
          catalogItemId: { in: catalogItemIds },
          factLayer: CANONICAL_FACT_LAYER,
        },
      });

      if (config.replacePlaceholders) {
        await tx.scientificEvidenceFact.updateMany({
          where: {
            catalogItemId: { in: catalogItemIds },
            factLayer: 'ingestion_claim_placeholder',
          },
          data: {
            decisionReady: false,
            extractionSource: 'ingestion_claim_placeholder',
          },
        });
      }

      for (const result of results) {
        const persistence = result.hydration.persistence
          ? sanitizePostgresText(result.hydration.persistence)
          : null;
        if (!persistence) {
          continue;
        }
        const artifactTitle = sanitizePostgresText(
          result.record.sourceRecord?.title ?? result.record.title ?? null,
        );
        const artifactDoi = sanitizePostgresText(
          result.record.sourceRecord?.doi ?? null,
        );

        const artifact = await tx.sourceArtifactRecord.upsert({
          where: { fileHash: persistence.fileHash },
          update: {
            sourceRecordId: result.record.sourceRecordId,
            localPath: null,
            fileName: persistence.fileName,
            mimeType: persistence.mimeType,
            fileSizeBytes: persistence.fileSizeBytes,
            pageCount: persistence.pageCount,
            extractionMethod: persistence.extractionMethod,
            ingestionStatus: 'parsed',
            title: artifactTitle,
            doi: artifactDoi,
            license: persistence.license,
            accessStatus: persistence.accessStatus,
            metadataQuality: persistence.metadataQuality,
            veracityScore: persistence.veracityScore,
            failureMessage: null,
            importedAt: persistence.importedAt,
          },
          create: {
            sourceRecordId: result.record.sourceRecordId,
            localPath: null,
            fileName: persistence.fileName,
            fileHash: persistence.fileHash,
            mimeType: persistence.mimeType,
            fileSizeBytes: persistence.fileSizeBytes,
            pageCount: persistence.pageCount,
            extractionMethod: persistence.extractionMethod,
            ingestionStatus: 'parsed',
            title: artifactTitle,
            doi: artifactDoi,
            license: persistence.license,
            accessStatus: persistence.accessStatus,
            metadataQuality: persistence.metadataQuality,
            veracityScore: persistence.veracityScore,
            failureMessage: null,
            importedAt: persistence.importedAt,
          },
        });

        await tx.sourceTextChunkRecord.deleteMany({
          where: { artifactId: artifact.id },
        });

        if (persistence.chunks.length > 0) {
          await tx.sourceTextChunkRecord.createMany({
            data: persistence.chunks.map((chunk) => ({
              artifactId: artifact.id,
              sourceRecordId: result.record.sourceRecordId,
              chunkIndex: chunk.chunkIndex,
              pageNumber: chunk.pageNumber,
              text: chunk.text,
              sourceLocator: chunk.sourceLocator,
              charStart: chunk.charStart,
              charEnd: chunk.charEnd,
              metadata: chunk.metadata,
            })),
          });
        }
      }

      if (factRows.length > 0) {
        await tx.scientificEvidenceFact.createMany({ data: factRows });
      }
      if (benchmarkRows.length > 0) {
        await tx.evidenceBenchmarkRecord.createMany({
          data: benchmarkRows as Prisma.EvidenceBenchmarkRecordCreateManyInput[],
        });
      }

      await tx.evidenceIngestionAudit.createMany({ data: auditRows });

      const statuses = new Map<string, string[]>();
      for (const result of results) {
        const ids = statuses.get(result.status) ?? [];
        ids.push(result.record.id);
        statuses.set(result.status, ids);
      }

      for (const [status, ids] of statuses.entries()) {
        await tx.externalEvidenceCatalogItem.updateMany({
          where: { id: { in: ids } },
          data: {
            extractionStatus: status,
            normalizationStatus:
              status === CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED
                ? 'canonical_normalized'
                : 'canonical_pending',
            reviewRequired:
              status === CANONICALIZATION_STATUSES.NEEDS_REVIEW ||
              status === CANONICALIZATION_STATUSES.EXTRACTION_FAILED,
            reviewStatus:
              status === CANONICALIZATION_STATUSES.NEEDS_REVIEW ||
              status === CANONICALIZATION_STATUSES.EXTRACTION_FAILED
                ? 'PENDING'
                : undefined,
          },
        });
      }
    },
    { maxWait: 20_000, timeout: 120_000 },
  );
}

async function fetchAcceptedCatalogBatch(input: {
  prisma: PrismaClientLike;
  batchSize: number;
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
}) {
  return input.prisma.externalEvidenceCatalogItem.findMany({
    where: buildCatalogWhere({
      lastCatalogItemId: input.lastCatalogItemId,
      snapshotCutoff: input.snapshotCutoff,
    }),
    include: {
      sourceRecord: {
        include: {
          sourceTextChunks: {
            orderBy: [{ chunkIndex: 'asc' }],
            take: 8,
          },
        },
      },
      claims: {
        orderBy: [{ confidence: 'desc' }, { createdAt: 'asc' }],
        take: 16,
      },
    },
    orderBy: [{ id: 'asc' }],
    take: input.batchSize,
  });
}

async function updateRunProgress(input: {
  prisma: PrismaClientLike;
  runId: string | null;
  counters: CanonicalizationCounters;
  lastCatalogItemId: string | null;
  snapshotCutoff: Date;
  completed?: boolean;
}) {
  if (!input.runId) {
    return;
  }

  await input.prisma.evidenceCanonicalizationRun.update({
    where: { id: input.runId },
    data: {
      status: input.completed ? 'COMPLETED' : 'STARTED',
      recordsProcessed: { increment: input.counters.processed },
      recordsCanonicalExtracted: {
        increment: input.counters.canonicalExtracted,
      },
      recordsInsufficientSource: {
        increment: input.counters.insufficientSource,
      },
      recordsNeedsFullText: { increment: input.counters.needsFullText },
      recordsNeedsReview: { increment: input.counters.needsReview },
      recordsFailed: { increment: input.counters.failed },
      recordsSkipped: { increment: input.counters.skipped },
      canonicalFactsStored: { increment: input.counters.canonicalFacts },
      benchmarkRecordsStored: { increment: input.counters.benchmarkRecords },
      completedAt: input.completed ? new Date() : undefined,
      checkpoint: toPrismaJsonObject({
        last_catalog_item_id: input.lastCatalogItemId,
        snapshot_cutoff: input.snapshotCutoff.toISOString(),
      }),
    },
  });
}

export async function runCanonicalScientificEvidenceBackfill(
  config: CanonicalizationCliConfig,
  prisma = getPrismaClient(),
) {
  const run = await findOrCreateCanonicalizationRun(prisma, config);
  const snapshotCutoff = run?.snapshotCutoff ?? new Date(Date.now() + 1000);
  let lastCatalogItemId = readCheckpointLastCatalogItemId(run);
  let totalProcessed = 0;
  const runId = run?.id ?? null;
  const overallCounters = emptyCounters();

  console.log(
    JSON.stringify({
      event: 'canonicalization_started',
      run_id: runId,
      dry_run: config.dryRun,
      batch_size: config.batchSize,
      limit: config.limit,
      full_text_mode: config.fullTextMode,
      full_text_concurrency: config.fullTextConcurrency,
      llm_mode: config.llmMode,
      snapshot_cutoff: snapshotCutoff.toISOString(),
    }),
  );

  while (config.limit === null || totalProcessed < config.limit) {
    const remaining =
      config.limit === null ? config.batchSize : config.limit - totalProcessed;
    const batch = await fetchAcceptedCatalogBatch({
      prisma,
      batchSize: Math.min(config.batchSize, remaining),
      lastCatalogItemId,
      snapshotCutoff,
    });

    if (batch.length === 0) {
      break;
    }

    const useRuntimeCanonicalizer =
      config.fullTextMode === 'hydrate' ||
      config.llmMode === 'schema_validated';
    const results: CanonicalizationRecordResult[] = useRuntimeCanonicalizer
      ? await mapWithConcurrency(batch, config.fullTextConcurrency, (record) =>
          canonicalizeCatalogRecordWithRuntime(record, {
            dryRun: config.dryRun,
            fullTextMode: config.fullTextMode,
            llmMode: config.llmMode,
          }),
        )
      : batch.map((record) => ({
          record,
          ...canonicalizeScientificEvidenceRecord(record, {
            fullTextMode: config.fullTextMode,
            llmMode: config.llmMode,
          }),
          hydration: {
            attempted: false,
            blockedReason: null,
            chunkCount: 0,
            contentType: null,
            fetched: false,
            fetchedFrom: null,
            persistence: null,
            persisted: false,
            policy: 'not_requested',
            source: null,
          },
        }));
    const batchCounters = emptyCounters();
    await persistCanonicalizationBatch({
      prisma,
      runId,
      records: batch,
      results,
      counters: batchCounters,
      config,
    });

    overallCounters.processed += batchCounters.processed;
    overallCounters.canonicalExtracted += batchCounters.canonicalExtracted;
    overallCounters.insufficientSource += batchCounters.insufficientSource;
    overallCounters.needsFullText += batchCounters.needsFullText;
    overallCounters.needsReview += batchCounters.needsReview;
    overallCounters.failed += batchCounters.failed;
    overallCounters.skipped += batchCounters.skipped;
    overallCounters.canonicalFacts += batchCounters.canonicalFacts;
    overallCounters.benchmarkRecords += batchCounters.benchmarkRecords;

    lastCatalogItemId = batch[batch.length - 1]?.id ?? lastCatalogItemId;
    totalProcessed += batch.length;

    await updateRunProgress({
      prisma,
      runId,
      counters: batchCounters,
      lastCatalogItemId,
      snapshotCutoff,
    });

    console.log(
      JSON.stringify({
        event: 'canonicalization_batch_completed',
        run_id: runId,
        last_catalog_item_id: lastCatalogItemId,
        ...batchCounters,
      }),
    );
  }

  await updateRunProgress({
    prisma,
    runId,
    counters: emptyCounters(),
    lastCatalogItemId,
    snapshotCutoff,
    completed: true,
  });

  console.log(
    JSON.stringify({
      event: 'canonicalization_completed',
      run_id: runId,
      ...overallCounters,
    }),
  );

  return {
    runId,
    counters: overallCounters,
    lastCatalogItemId,
  };
}

async function main() {
  const config = parseCanonicalizationCliConfig();

  try {
    await runCanonicalScientificEvidenceBackfill(config);
  } finally {
    await disconnectPrismaClient();
  }
}

if (process.argv[1]?.endsWith('canonicalize-scientific-evidence.ts')) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'canonicalization_failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
