import { describe, expect, it } from 'vitest';

import { buildEvidenceVeracityScore } from '@metrev/database';
import { metadataQualityProfileSchema } from '@metrev/domain-contracts';
import { chunkTextPages } from '../../packages/database/src/source-artifacts';

describe('source artifact metadata and veracity scoring', () => {
  it('keeps metadata completeness separate from generic context-reference penalties', () => {
    const metadataQuality = metadataQualityProfileSchema.parse({
      score: 0.5,
      level: 'medium',
      present_fields: ['source_identity', 'file_hash', 'extraction_method'],
      missing_fields: ['doi', 'license', 'page_count'],
      categories: {
        data_lineage: {
          extractor_version: 'fixture-v1',
        },
      },
      notes: ['Fixture metadata quality profile.'],
    });

    const score = buildEvidenceVeracityScore({
      extractionMethod: 'pdftotext',
      metadataQuality,
      normalizedMetricCount: 0,
      reviewStatus: 'pending',
      sourceCategory: 'metadata_reference_pdf',
      traceCount: 2,
    });

    expect(score.level).toBe('medium');
    expect(score.components.metadata_completeness).toBe(0.5);
    expect(score.confidence_penalties).toEqual(
      expect.arrayContaining([
        'pending_or_unaccepted_review',
        'context_reference_not_validated_performance_evidence',
        'no_supported_normalized_metrics',
      ]),
    );
  });

  it('preserves page, section, table, caption, and cell locator context for chunks', () => {
    const chunks = chunkTextPages([
      'Results\nTable 1. Power density by anode material\ncarbon felt | 1200 mW/m2 | stable operation',
    ]);

    expect(chunks[0]).toEqual(
      expect.objectContaining({
        caption: 'Table 1. Power density by anode material',
        cellLocator: 'Table 1:chunk:0',
        pageNumber: 1,
        sectionLabel: 'Results',
        sourceLocator: 'page:1:chunk:0',
        tableLabel: 'Table 1',
      }),
    );
  });
});
