import { describe, expect, it } from 'vitest';

import { buildEvidenceVeracityScore } from '@metrev/database';
import { metadataQualityProfileSchema } from '@metrev/domain-contracts';

describe('source artifact metadata and veracity scoring', () => {
  it('keeps metadata completeness separate from evidence veracity penalties', () => {
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
      sourceCategory: 'trampoline_project_scope',
      traceCount: 2,
    });

    expect(score.level).toBe('medium');
    expect(score.components.metadata_completeness).toBe(0.5);
    expect(score.confidence_penalties).toEqual(
      expect.arrayContaining([
        'pending_or_unaccepted_review',
        'ecosystem_context_not_performance_evidence',
        'no_supported_normalized_metrics',
      ]),
    );
  });
});
