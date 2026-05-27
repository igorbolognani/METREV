import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_INTELLIGENCE_VERSION,
  documentIntelligenceResultSchema,
  isDocumentIntelligenceEnabled,
  runDocumentIntelligence,
} from '@metrev/document-intelligence';

// Spec 037 / Phase 5 — scaffold-level invariants for the new package.

describe('document-intelligence scaffold (spec 037 Phase 5)', () => {
  const fixedNow = '2026-05-14T00:00:00.000Z';

  it('exposes a stable version constant matching the contract', () => {
    expect(DOCUMENT_INTELLIGENCE_VERSION).toBe('docintel-v1');
  });

  it('is disabled by default unless METREV_DOCINTEL_ENABLED is set', () => {
    expect(isDocumentIntelligenceEnabled({})).toBe(false);
    expect(
      isDocumentIntelligenceEnabled({ METREV_DOCINTEL_ENABLED: '1' }),
    ).toBe(true);
    expect(
      isDocumentIntelligenceEnabled({ METREV_DOCINTEL_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('returns parse_failed with disabled reason when flag is off', () => {
    const result = runDocumentIntelligence(
      {
        sourceDocumentId: 'doc-1',
        mediaType: 'application/pdf',
        rawText: 'Some text.',
      },
      { env: {}, now: () => fixedNow },
    );
    expect(result.status).toBe('parse_failed');
    expect(result.parse_error).toBe('document_intelligence_disabled');
    expect(result.blocks).toHaveLength(0);
    expect(result.generated_at).toBe(fixedNow);
  });

  it('splits raw text into paragraph blocks when enabled', () => {
    const result = runDocumentIntelligence(
      {
        sourceDocumentId: 'doc-2',
        mediaType: 'application/pdf',
        rawText: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
      },
      {
        env: { METREV_DOCINTEL_ENABLED: '1' },
        now: () => fixedNow,
      },
    );
    expect(result.status).toBe('parsed');
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0].kind).toBe('paragraph');
    expect(result.blocks[0].text).toBe('First paragraph.');
    expect(result.blocks[0].block_id).toBe('doc-2:p1');
  });

  it('round-trips through documentIntelligenceResultSchema', () => {
    const result = runDocumentIntelligence(
      {
        sourceDocumentId: 'doc-3',
        mediaType: 'text/html',
        rawText: 'Hello world.',
      },
      { env: { METREV_DOCINTEL_ENABLED: '1' }, now: () => fixedNow },
    );
    const reparsed = documentIntelligenceResultSchema.safeParse(result);
    expect(reparsed.success).toBe(true);
  });
});
