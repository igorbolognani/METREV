import mfcPaperFixture from '../fixtures/research/mfc-paper.json';

import { describe, expect, it } from 'vitest';

import {
  researchCellSchema,
  researchPaperMetadataSchema,
} from '@metrev/domain-contracts';
import {
  findDefaultResearchColumn,
  runDeterministicResearchExtraction,
} from '@metrev/research-intelligence';

// Spec 037 / Phase 4: contract invariants for the additive cells[] payload
// emitted by the deterministic extractor.

describe('researchCellSchema invariants (spec 037 Phase 4)', () => {
  const base = {
    paper_id: 'paper-1',
    review_id: 'review-1',
    column_id: 'summary',
    output_schema_key: 'research_summary',
    confidence: 0.6,
    extractor_version: 'research-deterministic-v1',
  };

  it('accepts a filled_with_trace cell when at least one trace is present', () => {
    const parsed = researchCellSchema.safeParse({
      ...base,
      status: 'filled_with_trace',
      missing_reason: null,
      evidence_trace: [
        {
          source: 'abstract',
          text_span: 'observed result',
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a filled_with_trace cell without any evidence_trace entries', () => {
    const parsed = researchCellSchema.safeParse({
      ...base,
      status: 'filled_with_trace',
      missing_reason: null,
      evidence_trace: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a non-filled cell with a null missing_reason', () => {
    const parsed = researchCellSchema.safeParse({
      ...base,
      status: 'not_reported_by_paper',
      missing_reason: null,
      evidence_trace: [],
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a non-filled cell when a missing_reason is provided', () => {
    const parsed = researchCellSchema.safeParse({
      ...base,
      status: 'extraction_failed',
      missing_reason: 'extraction_failed',
      evidence_trace: [],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('deterministic extractor emits honest cells[] (spec 037 Phase 4)', () => {
  it('emits a cell with status filled_with_trace when the extractor produces evidence', () => {
    const paper = researchPaperMetadataSchema.parse(mfcPaperFixture);
    const column = findDefaultResearchColumn('performance_metrics');
    if (!column) {
      throw new Error('performance_metrics default column not registered');
    }

    const result = runDeterministicResearchExtraction({
      reviewId: 'review-fixture-001',
      paper,
      column,
      claims: [],
    });

    const cells = (result.normalized_payload as Record<string, unknown>)
      .cells as Array<Record<string, unknown>>;
    expect(Array.isArray(cells)).toBe(true);
    expect(cells).toHaveLength(1);
    const cell = cells[0];
    expect(cell.status).toBe('filled_with_trace');
    expect(cell.missing_reason).toBeNull();
    expect(cell.column_id).toBe('performance_metrics');
    expect(cell.extractor_version).toBe('research-deterministic-v1');
    expect(Array.isArray(cell.evidence_trace)).toBe(true);
    expect((cell.evidence_trace as unknown[]).length).toBeGreaterThan(0);

    // The emitted cell must itself round-trip through researchCellSchema.
    const reparsed = researchCellSchema.safeParse(cell);
    expect(reparsed.success).toBe(true);
  });
});
