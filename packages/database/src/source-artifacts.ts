import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';

import { Prisma, PrismaClient } from '../generated/prisma/client';

import {
  externalEvidenceAccessStatusSchema,
  localSourceImportResponseSchema,
  metadataQualityProfileSchema,
  evidenceVeracityScoreSchema,
  researchPaperMetadataSchema,
  sourceArtifactSchema,
  type ExternalEvidenceAccessStatus,
  type LocalSourceImportRequest,
  type LocalSourceImportResponse,
  type MetadataQualityProfile,
  type EvidenceVeracityScore,
  type ResearchPaperMetadata,
  type SourceArtifact,
} from '@metrev/domain-contracts';

const execFileAsync = promisify(execFile);
const LOCAL_PDF_EXTRACTOR_VERSION = 'local-pdf-v1';
const MAX_CHUNK_LENGTH = 4500;
const MAX_CLAIM_CANDIDATES = 8;

const claimKeywords = [
  'metadata',
  'data quality',
  'veracity',
  'sensor',
  'calibration',
  'validation',
  'microbial fuel cell',
  'microbial electrolysis',
  'hydrogen',
  'ammonia',
  'recovery',
  'fouling',
  'scale-up',
  'cost',
  'industrial adoption',
];

export interface LocalPdfImportFile {
  accessStatus?: ExternalEvidenceAccessStatus;
  filePath: string;
  license?: string;
  reviewStatus?: 'pending' | 'accepted';
}

export interface LocalPdfImportInput {
  accessStatus?: ExternalEvidenceAccessStatus;
  files: LocalPdfImportFile[];
  license?: string;
  reviewStatus?: 'pending' | 'accepted';
}

interface PdfInfo {
  author: string | null;
  creationDate: string | null;
  doi: string | null;
  modDate: string | null;
  pageCount: number | null;
  title: string | null;
}

function toPrismaNestedJsonValue(value: unknown): Prisma.InputJsonValue | null {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry === undefined ? null : toPrismaNestedJsonValue(entry),
    ) as Prisma.InputJsonArray;
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) =>
        entry === undefined ? [] : [[key, toPrismaNestedJsonValue(entry)]],
      ),
    ) as Prisma.InputJsonObject;
  }

  return String(value);
}

function toPrismaJsonValue(
  value: unknown,
): Prisma.JsonNullValueInput | Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : toPrismaNestedJsonValue(value)!;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function levelFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 0.75) {
    return 'high';
  }

  if (score >= 0.5) {
    return 'medium';
  }

  return 'low';
}

function metadataQualityFromFields(input: {
  accessStatus: ExternalEvidenceAccessStatus;
  doi: string | null;
  extractionMethod: string;
  fileHash: string;
  license: string | null;
  pageCount: number | null;
  title: string | null;
}): MetadataQualityProfile {
  const fieldChecks = {
    source_identity: Boolean(input.title),
    file_hash: Boolean(input.fileHash),
    page_count: Boolean(input.pageCount),
    doi: Boolean(input.doi),
    license: Boolean(input.license),
    access_status: input.accessStatus !== 'unknown',
    extraction_method: Boolean(input.extractionMethod),
    source_locator: Boolean(input.pageCount),
  };
  const presentFields = Object.entries(fieldChecks)
    .filter(([, present]) => present)
    .map(([field]) => field);
  const missingFields = Object.entries(fieldChecks)
    .filter(([, present]) => !present)
    .map(([field]) => field);
  const score = presentFields.length / Object.keys(fieldChecks).length;

  return metadataQualityProfileSchema.parse({
    score,
    level: levelFromScore(score),
    present_fields: presentFields,
    missing_fields: missingFields,
    categories: {
      signal_generation: {
        title: Boolean(input.title),
      },
      data_lineage: {
        file_hash: Boolean(input.fileHash),
        extraction_method: input.extractionMethod,
      },
      access_and_licensing: {
        access_status: input.accessStatus,
        license_present: Boolean(input.license),
      },
    },
    notes:
      missingFields.length > 0
        ? ['Missing metadata lowers downstream confidence until reviewed.']
        : [],
  });
}

export function buildEvidenceVeracityScore(input: {
  extractionMethod: string;
  metadataQuality: MetadataQualityProfile;
  normalizedMetricCount?: number;
  reviewStatus?: 'pending' | 'accepted' | 'rejected';
  sourceCategory?: string | null;
  traceCount?: number;
}): EvidenceVeracityScore {
  const isProjectContext =
    input.sourceCategory?.includes('trampoline') ||
    input.sourceCategory?.includes('project_scope');
  const reviewComponent =
    input.reviewStatus === 'accepted'
      ? 0.95
      : input.reviewStatus === 'rejected'
        ? 0.1
        : 0.45;
  const extractionComponent = input.extractionMethod.includes('pdftotext')
    ? 0.72
    : input.extractionMethod.includes('manual')
      ? 0.85
      : 0.55;
  const traceQuality = (input.traceCount ?? 0) > 0 ? 0.82 : 0.35;
  const normalizationSupport =
    (input.normalizedMetricCount ?? 0) > 0 ? 0.78 : 0.45;
  const components = {
    source_rigor: isProjectContext ? 0.55 : 0.7,
    metadata_completeness: input.metadataQuality.score,
    measurement_quality: isProjectContext ? 0.35 : 0.55,
    extraction_method: extractionComponent,
    trace_quality: traceQuality,
    normalization_support: normalizationSupport,
    review_status: reviewComponent,
    relevance: 0.72,
    recency_context_fit: 0.68,
    corroboration_conflict: 0.5,
  };
  const score =
    Object.values(components).reduce((sum, value) => sum + value, 0) /
    Object.values(components).length;
  const confidencePenalties = [
    input.metadataQuality.level === 'low' ? 'low_metadata_quality' : null,
    input.reviewStatus !== 'accepted' ? 'pending_or_unaccepted_review' : null,
    isProjectContext ? 'ecosystem_context_not_performance_evidence' : null,
    (input.normalizedMetricCount ?? 0) === 0
      ? 'no_supported_normalized_metrics'
      : null,
  ].filter((value): value is string => Boolean(value));

  return evidenceVeracityScoreSchema.parse({
    score,
    level: levelFromScore(score),
    components,
    confidence_penalties: confidencePenalties,
    notes:
      confidencePenalties.length > 0
        ? ['Veracity components should be reviewed before downstream use.']
        : [],
  });
}

function parsePdfInfoOutput(stdout: string): PdfInfo {
  const lines = stdout.split(/\r?\n/);
  const values = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      values.set(match[1].trim().toLowerCase(), match[2].trim());
    }
  }

  const pageCount = Number.parseInt(values.get('pages') ?? '', 10);
  const title = values.get('title') || null;

  return {
    author: values.get('author') || null,
    creationDate: values.get('creationdate') || null,
    doi: title?.match(/10\.\d{4,9}\/\S+/)?.[0] ?? null,
    modDate: values.get('moddate') || null,
    pageCount: Number.isFinite(pageCount) ? pageCount : null,
    title,
  };
}

async function extractPdfInfo(filePath: string): Promise<PdfInfo> {
  try {
    const { stdout } = await execFileAsync('pdfinfo', [filePath], {
      maxBuffer: 2_000_000,
    });
    return parsePdfInfoOutput(stdout);
  } catch {
    return {
      author: null,
      creationDate: null,
      doi: null,
      modDate: null,
      pageCount: null,
      title: null,
    };
  }
}

async function extractText(filePath: string): Promise<{
  extractionMethod: string;
  pages: string[];
}> {
  try {
    const { stdout } = await execFileAsync('pdftotext', [filePath, '-'], {
      maxBuffer: 80_000_000,
    });
    return {
      extractionMethod: 'pdftotext',
      pages: stdout
        .split('\f')
        .map(normalizeWhitespace)
        .filter((page) => page.length > 0),
    };
  } catch {
    const fallback = await readFile(filePath, 'utf8').catch(() => '');
    return {
      extractionMethod: 'text-fallback',
      pages: [normalizeWhitespace(fallback)].filter((page) => page.length > 0),
    };
  }
}

function chunkPages(pages: string[]) {
  const chunks: Array<{
    charEnd: number;
    charStart: number;
    chunkIndex: number;
    pageNumber: number;
    sourceLocator: string;
    text: string;
  }> = [];

  pages.forEach((pageText, pageIndex) => {
    let offset = 0;
    while (offset < pageText.length) {
      const text = pageText.slice(offset, offset + MAX_CHUNK_LENGTH).trim();
      if (text) {
        chunks.push({
          charEnd: offset + text.length,
          charStart: offset,
          chunkIndex: chunks.length,
          pageNumber: pageIndex + 1,
          sourceLocator: `page:${pageIndex + 1}:chunk:${chunks.length}`,
          text,
        });
      }
      offset += MAX_CHUNK_LENGTH;
    }
  });

  return chunks;
}

function inferClaimType(sentence: string) {
  const lower = sentence.toLowerCase();
  if (/(cost|capex|opex|economic|commercial|market)/.test(lower)) {
    return 'ECONOMIC' as const;
  }
  if (/(fouling|challenge|limitation|barrier|risk|missing|gap)/.test(lower)) {
    return 'LIMITATION' as const;
  }
  if (/(sensor|calibration|validation|quality|pH|temperature|conductivity)/.test(lower)) {
    return 'CONDITION' as const;
  }
  if (/(anode|cathode|electrode|membrane|reactor|stack)/.test(lower)) {
    return 'ARCHITECTURE' as const;
  }
  if (/(mW\/m2|A\/m2|%|hydrogen|ammonia|recovery)/i.test(sentence)) {
    return 'METRIC' as const;
  }
  return 'APPLICABILITY' as const;
}

function extractClaimCandidates(chunks: ReturnType<typeof chunkPages>) {
  const seen = new Set<string>();
  const sentences = chunks.flatMap((chunk) =>
    chunk.text
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => ({
        chunk,
        sentence: normalizeWhitespace(sentence),
      })),
  );

  return sentences
    .filter(({ sentence }) => sentence.length >= 80 && sentence.length <= 420)
    .filter(({ sentence }) =>
      claimKeywords.some((keyword) =>
        sentence.toLowerCase().includes(keyword.toLowerCase()),
      ),
    )
    .filter(({ sentence }) => {
      const key = sentence.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_CLAIM_CANDIDATES)
    .map(({ chunk, sentence }) => ({
      claimType: inferClaimType(sentence),
      content: sentence,
      sourceSnippet: truncate(sentence, 320),
      sourceLocator: chunk.sourceLocator,
      pageNumber: chunk.pageNumber,
    }));
}

function mapAccessStatusToDatabase(value: ExternalEvidenceAccessStatus) {
  return value.toUpperCase() as
    | 'GOLD'
    | 'GREEN'
    | 'HYBRID'
    | 'BRONZE'
    | 'CLOSED'
    | 'UNKNOWN';
}

function mapReviewStatusToDatabase(value: 'pending' | 'accepted') {
  return value === 'accepted' ? 'ACCEPTED' : 'PENDING';
}

function sourceCategoryForTitle(title: string): string {
  return /metadata|metadatos|digital transformation|signal data/i.test(title)
    ? 'metadata_reference_pdf'
    : 'local_pdf_source';
}

function toResearchPaperFromSource(input: {
  artifact: SourceArtifact;
  sourceRecord: {
    abstractText: string | null;
    authors: unknown;
    doi: string | null;
    id: string;
    journal: string | null;
    pdfUrl: string | null;
    publishedAt: Date | null;
    publisher: string | null;
    rawPayload: unknown;
    sourceUrl: string | null;
    title: string;
  };
}): ResearchPaperMetadata {
  return researchPaperMetadataSchema.parse({
    paper_id: `source:${input.sourceRecord.id}`,
    source_document_id: input.sourceRecord.id,
    title: input.sourceRecord.title,
    authors: Array.isArray(input.sourceRecord.authors)
      ? input.sourceRecord.authors
      : [],
    year: input.sourceRecord.publishedAt?.getUTCFullYear() ?? null,
    doi: input.sourceRecord.doi,
    journal: input.sourceRecord.journal,
    publisher: input.sourceRecord.publisher,
    source_type: 'manual',
    source_url: input.sourceRecord.sourceUrl,
    pdf_url: input.sourceRecord.pdfUrl,
    xml_url: null,
    abstract_text: input.sourceRecord.abstractText,
    citation_count: null,
    metadata: {
      local_source_artifact_id: input.artifact.artifact_id,
      metadata_quality: input.artifact.metadata_quality,
      veracity_score: input.artifact.veracity_score,
    },
  });
}

async function importOneLocalPdf(
  prisma: PrismaClient,
  file: LocalPdfImportFile,
  defaults: {
    accessStatus: ExternalEvidenceAccessStatus;
    license?: string;
    reviewStatus: 'pending' | 'accepted';
  },
): Promise<{
  artifact: SourceArtifact;
  paper: ResearchPaperMetadata;
  sourceDocumentId: string;
}> {
  const filePath = resolve(file.filePath);
  const fileBuffer = await readFile(filePath);
  const fileHash = createHash('sha256').update(fileBuffer).digest('hex');
  const pdfInfo = await extractPdfInfo(filePath);
  const extracted = await extractText(filePath);
  const title = pdfInfo.title ?? basename(filePath);
  const chunks = chunkPages(extracted.pages);
  const accessStatus = file.accessStatus ?? defaults.accessStatus;
  const license = file.license ?? defaults.license ?? null;
  const reviewStatus = file.reviewStatus ?? defaults.reviewStatus;
  const pageCount =
    pdfInfo.pageCount ?? (extracted.pages.length > 0 ? extracted.pages.length : null);
  const metadataQuality = metadataQualityFromFields({
    accessStatus,
    doi: pdfInfo.doi,
    extractionMethod: extracted.extractionMethod,
    fileHash,
    license,
    pageCount,
    title,
  });
  const veracityScore = buildEvidenceVeracityScore({
    extractionMethod: extracted.extractionMethod,
    metadataQuality,
    normalizedMetricCount: 0,
    reviewStatus,
    sourceCategory: sourceCategoryForTitle(title),
    traceCount: chunks.length,
  });
  const now = new Date();
  const abstractText = truncate(extracted.pages.slice(0, 2).join(' '), 1800);
  const sourceKey = `local-pdf:${fileHash}`;
  const sourceCategory = sourceCategoryForTitle(title);
  const result = await prisma.$transaction(async (tx) => {
    const sourceRecord = await tx.externalSourceRecord.upsert({
      where: {
        sourceType_sourceKey: {
          sourceType: 'MANUAL',
          sourceKey,
        },
      },
      update: {
        title,
        sourceCategory,
        doi: pdfInfo.doi,
        publisher: pdfInfo.author ?? 'Local PDF import',
        language: null,
        license,
        accessStatus: mapAccessStatusToDatabase(accessStatus),
        asOf: now,
        hashDedup: fileHash,
        abstractText,
        rawPayload: toPrismaJsonValue({
          local_path: filePath,
          file_name: basename(filePath),
          file_hash: fileHash,
          pdf_info: pdfInfo,
          metadata_quality: metadataQuality,
          veracity_score: veracityScore,
        }),
      },
      create: {
        sourceType: 'MANUAL',
        sourceKey,
        sourceUrl: null,
        title,
        sourceCategory,
        doi: pdfInfo.doi,
        publisher: pdfInfo.author ?? 'Local PDF import',
        journal: null,
        authors: pdfInfo.author ? [{ name: pdfInfo.author }] : [],
        language: null,
        license,
        accessStatus: mapAccessStatusToDatabase(accessStatus),
        publishedAt: null,
        asOf: now,
        pdfUrl: null,
        xmlUrl: null,
        hashDedup: fileHash,
        abstractText,
        rawPayload: toPrismaJsonValue({
          local_path: filePath,
          file_name: basename(filePath),
          file_hash: fileHash,
          pdf_info: pdfInfo,
          metadata_quality: metadataQuality,
          veracity_score: veracityScore,
        }),
      },
    });

    const artifact = await tx.sourceArtifactRecord.upsert({
      where: { fileHash },
      update: {
        sourceRecordId: sourceRecord.id,
        localPath: filePath,
        fileName: basename(filePath),
        mimeType: 'application/pdf',
        fileSizeBytes: fileBuffer.byteLength,
        pageCount,
        extractionMethod: extracted.extractionMethod,
        ingestionStatus: 'parsed',
        title,
        doi: pdfInfo.doi,
        license,
        accessStatus: mapAccessStatusToDatabase(accessStatus),
        metadataQuality: toPrismaJsonValue(metadataQuality),
        veracityScore: toPrismaJsonValue(veracityScore),
        failureMessage: null,
        importedAt: now,
      },
      create: {
        sourceRecordId: sourceRecord.id,
        localPath: filePath,
        fileName: basename(filePath),
        fileHash,
        mimeType: 'application/pdf',
        fileSizeBytes: fileBuffer.byteLength,
        pageCount,
        extractionMethod: extracted.extractionMethod,
        ingestionStatus: 'parsed',
        title,
        doi: pdfInfo.doi,
        license,
        accessStatus: mapAccessStatusToDatabase(accessStatus),
        metadataQuality: toPrismaJsonValue(metadataQuality),
        veracityScore: toPrismaJsonValue(veracityScore),
        failureMessage: null,
        importedAt: now,
      },
    });

    await tx.sourceTextChunkRecord.deleteMany({
      where: { artifactId: artifact.id },
    });
    if (chunks.length > 0) {
      await tx.sourceTextChunkRecord.createMany({
        data: chunks.map((chunk) => ({
          artifactId: artifact.id,
          sourceRecordId: sourceRecord.id,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          text: chunk.text,
          sourceLocator: chunk.sourceLocator,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          metadata: toPrismaJsonValue({
            extraction_method: extracted.extractionMethod,
          }) as Prisma.InputJsonObject,
        })),
      });
    }

    const catalogItem = await tx.externalEvidenceCatalogItem.upsert({
      where: {
        sourceRecordId_evidenceType_title: {
          sourceRecordId: sourceRecord.id,
          evidenceType: 'literature_evidence',
          title,
        },
      },
      update: {
        summary: abstractText || `Local PDF source imported from ${basename(filePath)}.`,
        strengthLevel: reviewStatus === 'accepted' ? 'moderate' : 'weak',
        provenanceNote:
          'Imported from local PDF. Full extracted text is stored locally with page/chunk locators; analyst review remains required before downstream use.',
        reviewStatus: mapReviewStatusToDatabase(reviewStatus),
        sourceState: 'PARSED',
        applicabilityScope: toPrismaJsonValue({
          source_artifact_id: artifact.id,
          metadata_quality_level: metadataQuality.level,
          veracity_level: veracityScore.level,
        }),
        payload: toPrismaJsonValue({
          metadata_quality: metadataQuality,
          veracity_score: veracityScore,
          source_artifact_id: artifact.id,
        }),
        tags: [
          'local-pdf',
          sourceCategory,
          metadataQuality.level,
          veracityScore.level,
        ],
      },
      create: {
        sourceRecordId: sourceRecord.id,
        evidenceType: 'literature_evidence',
        title,
        summary: abstractText || `Local PDF source imported from ${basename(filePath)}.`,
        strengthLevel: reviewStatus === 'accepted' ? 'moderate' : 'weak',
        provenanceNote:
          'Imported from local PDF. Full extracted text is stored locally with page/chunk locators; analyst review remains required before downstream use.',
        reviewStatus: mapReviewStatusToDatabase(reviewStatus),
        sourceState: 'PARSED',
        applicabilityScope: toPrismaJsonValue({
          source_artifact_id: artifact.id,
          metadata_quality_level: metadataQuality.level,
          veracity_level: veracityScore.level,
        }),
        extractedClaims: [],
        tags: [
          'local-pdf',
          sourceCategory,
          metadataQuality.level,
          veracityScore.level,
        ],
        payload: toPrismaJsonValue({
          metadata_quality: metadataQuality,
          veracity_score: veracityScore,
          source_artifact_id: artifact.id,
        }),
      },
    });

    await tx.evidenceClaim.deleteMany({
      where: {
        sourceRecordId: sourceRecord.id,
        extractorVersion: LOCAL_PDF_EXTRACTOR_VERSION,
      },
    });

    const claims = extractClaimCandidates(chunks);
    if (claims.length > 0) {
      await tx.evidenceClaim.createMany({
        data: claims.map((claim) => ({
          sourceRecordId: sourceRecord.id,
          catalogItemId: catalogItem.id,
          claimType: claim.claimType,
          content: claim.content,
          extractedValue: null,
          unit: null,
          confidence:
            reviewStatus === 'accepted'
              ? Math.min(0.82, veracityScore.score)
              : Math.min(0.62, veracityScore.score),
          extractionMethod: 'REGEX',
          extractorVersion: LOCAL_PDF_EXTRACTOR_VERSION,
          sourceSnippet: claim.sourceSnippet,
          sourceLocator: claim.sourceLocator,
          pageNumber: claim.pageNumber,
          metadata: toPrismaJsonValue({
            metadata_quality: metadataQuality,
            veracity_score: veracityScore,
            source_artifact_id: artifact.id,
          }) as Prisma.InputJsonObject,
        })),
      });
    }

    await tx.externalEvidenceCatalogItem.update({
      where: { id: catalogItem.id },
      data: {
        claimCount: claims.length,
        extractedClaims: toPrismaJsonValue(
          claims.map((claim) => ({
            content: claim.content,
            claim_type: claim.claimType.toLowerCase(),
            source_locator: claim.sourceLocator,
          })),
        ),
      },
    });

    return {
      artifact,
      sourceRecord,
    };
  });

  const artifact =
    (await getSourceArtifactForSourceDocument(prisma, result.sourceRecord.id)) ??
    sourceArtifactSchema.parse({
      artifact_id: result.artifact.id,
      source_document_id: result.sourceRecord.id,
      local_path: result.artifact.localPath,
      file_name: result.artifact.fileName,
      file_hash: result.artifact.fileHash,
      mime_type: result.artifact.mimeType,
      file_size_bytes: result.artifact.fileSizeBytes,
      page_count: result.artifact.pageCount,
      extraction_method: result.artifact.extractionMethod,
      ingestion_status: 'parsed',
      title: result.artifact.title,
      doi: result.artifact.doi,
      license: result.artifact.license,
      access_status: accessStatus,
      metadata_quality: metadataQuality,
      veracity_score: veracityScore,
      failure_message: null,
      imported_at: result.artifact.importedAt.toISOString(),
      chunks: [],
    });

  return {
    artifact,
    paper: toResearchPaperFromSource({
      artifact,
      sourceRecord: result.sourceRecord,
    }),
    sourceDocumentId: result.sourceRecord.id,
  };
}

export async function importLocalPdfSources(
  prisma: PrismaClient,
  input: LocalPdfImportInput,
): Promise<LocalSourceImportResponse> {
  const artifacts: SourceArtifact[] = [];
  const papers: ResearchPaperMetadata[] = [];
  const sourceDocumentIds: string[] = [];
  const failed: LocalSourceImportResponse['failed'] = [];

  for (const file of input.files) {
    try {
      const imported = await importOneLocalPdf(prisma, file, {
        accessStatus: input.accessStatus ?? 'unknown',
        license: input.license,
        reviewStatus: input.reviewStatus ?? 'pending',
      });
      artifacts.push(imported.artifact);
      papers.push(imported.paper);
      sourceDocumentIds.push(imported.sourceDocumentId);
    } catch (error) {
      failed.push({
        path: file.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return localSourceImportResponseSchema.parse({
    imported_count: artifacts.length,
    source_document_ids: sourceDocumentIds,
    papers,
    artifacts,
    failed,
  });
}

function mapSourceArtifactRecord(record: {
  accessStatus: 'GOLD' | 'GREEN' | 'HYBRID' | 'BRONZE' | 'CLOSED' | 'UNKNOWN';
  chunks?: Array<{
    artifactId: string;
    charEnd: number | null;
    charStart: number | null;
    chunkIndex: number;
    createdAt: Date;
    id: string;
    metadata: unknown;
    pageNumber: number | null;
    sourceLocator: string;
    sourceRecordId: string;
    text: string;
  }>;
  doi: string | null;
  extractionMethod: string;
  failureMessage: string | null;
  fileHash: string;
  fileName: string;
  fileSizeBytes: number | null;
  id: string;
  importedAt: Date;
  ingestionStatus: string;
  license: string | null;
  localPath: string | null;
  metadataQuality: unknown;
  mimeType: string;
  pageCount: number | null;
  sourceRecordId: string;
  title: string | null;
  veracityScore: unknown;
}): SourceArtifact {
  return sourceArtifactSchema.parse({
    artifact_id: record.id,
    source_document_id: record.sourceRecordId,
    local_path: record.localPath,
    file_name: record.fileName,
    file_hash: record.fileHash,
    mime_type: record.mimeType,
    file_size_bytes: record.fileSizeBytes,
    page_count: record.pageCount,
    extraction_method: record.extractionMethod,
    ingestion_status: record.ingestionStatus === 'failed' ? 'failed' : 'parsed',
    title: record.title,
    doi: record.doi,
    license: record.license,
    access_status: externalEvidenceAccessStatusSchema.parse(
      record.accessStatus.toLowerCase(),
    ),
    metadata_quality: record.metadataQuality,
    veracity_score: record.veracityScore,
    failure_message: record.failureMessage,
    imported_at: record.importedAt.toISOString(),
    chunks: (record.chunks ?? []).map((chunk) => ({
      chunk_id: chunk.id,
      artifact_id: chunk.artifactId,
      source_document_id: chunk.sourceRecordId,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      text: chunk.text,
      source_locator: chunk.sourceLocator,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      metadata:
        chunk.metadata && typeof chunk.metadata === 'object'
          ? chunk.metadata
          : {},
      created_at: chunk.createdAt.toISOString(),
    })),
  });
}

export async function getSourceArtifactForSourceDocument(
  prisma: PrismaClient,
  sourceDocumentId: string,
): Promise<SourceArtifact | null> {
  const artifact = await prisma.sourceArtifactRecord.findFirst({
    where: { sourceRecordId: sourceDocumentId },
    include: {
      chunks: {
        orderBy: [{ chunkIndex: 'asc' }],
        take: 12,
      },
    },
    orderBy: [{ importedAt: 'desc' }],
  });

  return artifact ? mapSourceArtifactRecord(artifact) : null;
}

export function localSourceImportRequestToInput(
  request: LocalSourceImportRequest,
): LocalPdfImportInput {
  return {
    accessStatus: request.access_status,
    license: request.license,
    reviewStatus: request.review_status,
    files: request.files.map((filePath) => ({
      filePath,
      accessStatus: request.access_status,
      license: request.license,
      reviewStatus: request.review_status,
    })),
  };
}

function manifestFilePath(entry: unknown): string | null {
  if (typeof entry === 'string') {
    return entry;
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const candidate = entry as Record<string, unknown>;
  return typeof candidate.path === 'string'
    ? candidate.path
    : typeof candidate.filePath === 'string'
      ? candidate.filePath
      : typeof candidate.file === 'string'
        ? candidate.file
        : null;
}

function manifestFileOptions(entry: unknown): Partial<LocalPdfImportFile> {
  if (!entry || typeof entry !== 'object') {
    return {};
  }

  const candidate = entry as Record<string, unknown>;
  const accessStatus = externalEvidenceAccessStatusSchema.safeParse(
    candidate.access_status ?? candidate.accessStatus,
  );
  const reviewStatus =
    candidate.review_status === 'accepted' || candidate.reviewStatus === 'accepted'
      ? 'accepted'
      : candidate.review_status === 'pending' ||
          candidate.reviewStatus === 'pending'
        ? 'pending'
        : undefined;

  return {
    accessStatus: accessStatus.success ? accessStatus.data : undefined,
    license:
      typeof candidate.license === 'string' && candidate.license.trim()
        ? candidate.license.trim()
        : undefined,
    reviewStatus,
  };
}

async function loadManifestFiles(
  manifestPath: string | undefined,
): Promise<LocalPdfImportFile[]> {
  if (!manifestPath) {
    return [];
  }

  const raw = await readFile(resolve(manifestPath), 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const entries = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>).files
      : [];

  if (!Array.isArray(entries)) {
    throw new Error('Local PDF manifest must be an array or contain a files array.');
  }

  return entries.flatMap((entry) => {
    const filePath = manifestFilePath(entry);
    return filePath
      ? [
          {
            filePath,
            ...manifestFileOptions(entry),
          },
        ]
      : [];
  });
}

export async function resolveLocalSourceImportRequestToInput(
  request: LocalSourceImportRequest,
): Promise<LocalPdfImportInput> {
  const direct = localSourceImportRequestToInput(request).files;
  const manifestFiles = await loadManifestFiles(request.manifest_path);

  return {
    accessStatus: request.access_status,
    license: request.license,
    reviewStatus: request.review_status,
    files: [...direct, ...manifestFiles],
  };
}

export function normalizeCliFiles(files: string[]): LocalPdfImportFile[] {
  return files
    .map((filePath) => filePath.trim())
    .filter(Boolean)
    .map((filePath) => ({ filePath }));
}

export { LOCAL_PDF_EXTRACTOR_VERSION };
