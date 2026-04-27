import {
    researchExtractionResultSchema,
    type ResearchExtractionResult,
    type ResearchPaperMetadata,
} from '@metrev/domain-contracts';
import { generateStructuredResearchExtraction } from '@metrev/llm-adapter';

import {
    hydrateResearchPaperText,
    type HydratedResearchPaperText,
} from '../fulltext/source-content';
import {
    DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
    runDeterministicResearchExtraction,
    type DeterministicExtractionInput,
} from './deterministic-extractor';

export const RESEARCH_RUNTIME_EXTRACTOR_VERSION = 'research-runtime-v1';

export interface ExecuteResearchExtractionInput extends DeterministicExtractionInput {
  fetchPaperText?: (
    paper: ResearchPaperMetadata,
  ) => Promise<HydratedResearchPaperText | null>;
}

function buildSupplementalText(
  source: HydratedResearchPaperText | null,
): string[] {
  return source ? [source.text] : [];
}

function fullTextSummary(source: HydratedResearchPaperText | null) {
  if (!source) {
    return null;
  }

  return {
    content_type: source.contentType,
    fetched_from: source.fetchedFrom,
    length: source.text.length,
    source: source.source,
  };
}

export async function executeResearchExtraction(
  input: ExecuteResearchExtractionInput,
): Promise<ResearchExtractionResult> {
  const hydrated = await (input.fetchPaperText ?? hydrateResearchPaperText)(
    input.paper,
  ).catch(() => null);
  const supplementalText = buildSupplementalText(hydrated);
  const supplementalTrace = hydrated?.trace ?? [];

  if (input.column.type === 'llm_extracted') {
    const structured = await generateStructuredResearchExtraction({
      column: input.column,
      paper: input.paper,
      sourceText: [
        input.paper.title,
        input.paper.abstract_text ?? '',
        ...supplementalText,
        ...input.claims.map((claim) => claim.content),
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    if (structured) {
      return researchExtractionResultSchema.parse({
        review_id: input.reviewId,
        paper_id: input.paper.paper_id,
        column_id: input.column.column_id,
        status: 'valid',
        answer: structured.answer,
        evidence_trace: structured.evidenceTrace,
        confidence: structured.confidence,
        missing_fields: structured.missingFields,
        validation_errors: [],
        normalized_payload: {
          full_text: fullTextSummary(hydrated),
          llm_runtime: structured.metadata,
        },
        extractor_version: RESEARCH_RUNTIME_EXTRACTOR_VERSION,
      });
    }
  }

  const deterministic = runDeterministicResearchExtraction({
    ...input,
    supplementalText,
    supplementalTrace,
  });

  return researchExtractionResultSchema.parse({
    ...deterministic,
    normalized_payload: {
      ...deterministic.normalized_payload,
      full_text: fullTextSummary(hydrated),
    },
    extractor_version:
      hydrated || input.column.type === 'llm_extracted'
        ? RESEARCH_RUNTIME_EXTRACTOR_VERSION
        : DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  });
}
