// Spec 037 / Phase 5 — Document Intelligence v1 scaffold.
//
// This package is the home for layout-aware document parsing
// (block + table + caption + page provenance). The first iteration ships a
// deterministic, dependency-free scaffold so that the rest of the runtime can
// wire feature-flagged extraction paths and tests without committing to a
// specific PDF parser (decision deferred to the ADR 0006 spike).
//
// Hard rules respected here:
// - Additive only: legacy `source-content.ts` parsing stays the default.
// - No new infrastructure dependency yet (pdfjs-dist / unpdf land in T5.2).
// - Zod boundary + explicit version so downstream consumers can audit drift.

import { z } from 'zod';

export const DOCUMENT_INTELLIGENCE_VERSION = 'docintel-v1' as const;

export const documentBlockKindSchema = z.enum([
  'paragraph',
  'heading',
  'list_item',
  'table',
  'table_caption',
  'figure_caption',
  'footnote',
  'reference',
  'unknown',
]);

export const documentBlockSchema = z.object({
  block_id: z.string().min(1),
  kind: documentBlockKindSchema,
  page_number: z.number().int().positive().nullable().default(null),
  section_label: z.string().min(1).nullable().default(null),
  text: z.string().min(1),
  char_start: z.number().int().nonnegative().nullable().default(null),
  char_end: z.number().int().nonnegative().nullable().default(null),
});

export const documentTableCellSchema = z.object({
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  text: z.string(),
});

export const documentTableSchema = z.object({
  table_id: z.string().min(1),
  page_number: z.number().int().positive().nullable().default(null),
  caption: z.string().min(1).nullable().default(null),
  header: z.array(z.string()).default([]),
  cells: z.array(documentTableCellSchema).default([]),
});

export const documentIntelligenceResultSchema = z.object({
  source_document_id: z.string().min(1),
  parser_version: z.literal(DOCUMENT_INTELLIGENCE_VERSION),
  status: z.enum(['parsed', 'parse_failed', 'unsupported_media_type']),
  parse_error: z.string().nullable().default(null),
  page_count: z.number().int().nonnegative().default(0),
  blocks: z.array(documentBlockSchema).default([]),
  tables: z.array(documentTableSchema).default([]),
  generated_at: z.string().min(1),
});

export type DocumentBlockKind = z.infer<typeof documentBlockKindSchema>;
export type DocumentBlock = z.infer<typeof documentBlockSchema>;
export type DocumentTable = z.infer<typeof documentTableSchema>;
export type DocumentIntelligenceResult = z.infer<
  typeof documentIntelligenceResultSchema
>;

export interface DocumentIntelligenceInput {
  sourceDocumentId: string;
  mediaType: 'application/pdf' | 'text/html' | 'application/xml' | 'text/plain';
  /** Raw text already extracted by the legacy parser, when available. */
  rawText?: string;
}

/**
 * Returns whether document intelligence is enabled by the runtime flag.
 * Defaults to off so the new path is opt-in until ADR 0006 lands.
 */
export function isDocumentIntelligenceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.METREV_DOCINTEL_ENABLED;
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true';
}

/**
 * Minimal deterministic implementation. When the flag is off we return a
 * `parse_failed` result so callers can branch transparently without crashing.
 * The real layout-aware path will land in T5.2 / T5.3.
 */
export function runDocumentIntelligence(
  input: DocumentIntelligenceInput,
  options: { env?: NodeJS.ProcessEnv; now?: () => string } = {},
): DocumentIntelligenceResult {
  const env = options.env ?? process.env;
  const now = options.now ?? (() => new Date().toISOString());

  if (!isDocumentIntelligenceEnabled(env)) {
    return documentIntelligenceResultSchema.parse({
      source_document_id: input.sourceDocumentId,
      parser_version: DOCUMENT_INTELLIGENCE_VERSION,
      status: 'parse_failed',
      parse_error: 'document_intelligence_disabled',
      page_count: 0,
      blocks: [],
      tables: [],
      generated_at: now(),
    });
  }

  if (
    input.mediaType !== 'application/pdf' &&
    input.mediaType !== 'text/html' &&
    input.mediaType !== 'application/xml' &&
    input.mediaType !== 'text/plain'
  ) {
    return documentIntelligenceResultSchema.parse({
      source_document_id: input.sourceDocumentId,
      parser_version: DOCUMENT_INTELLIGENCE_VERSION,
      status: 'unsupported_media_type',
      parse_error: `unsupported_media_type:${input.mediaType}`,
      page_count: 0,
      blocks: [],
      tables: [],
      generated_at: now(),
    });
  }

  // Phase 5 scaffold: split rawText into paragraph blocks. Layout-aware
  // parsing (pdfjs-dist / unpdf / cheerio) lands in T5.2 / T5.3.
  const text = input.rawText?.trim() ?? '';
  if (!text) {
    return documentIntelligenceResultSchema.parse({
      source_document_id: input.sourceDocumentId,
      parser_version: DOCUMENT_INTELLIGENCE_VERSION,
      status: 'parse_failed',
      parse_error: 'empty_input',
      page_count: 0,
      blocks: [],
      tables: [],
      generated_at: now(),
    });
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const blocks = paragraphs.map((paragraph, index) => ({
    block_id: `${input.sourceDocumentId}:p${index + 1}`,
    kind: 'paragraph' as const,
    page_number: null,
    section_label: null,
    text: paragraph,
    char_start: null,
    char_end: null,
  }));

  return documentIntelligenceResultSchema.parse({
    source_document_id: input.sourceDocumentId,
    parser_version: DOCUMENT_INTELLIGENCE_VERSION,
    status: 'parsed',
    parse_error: null,
    page_count: 0,
    blocks,
    tables: [],
    generated_at: now(),
  });
}
