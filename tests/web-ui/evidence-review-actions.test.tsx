import { afterEach, describe, expect, it, vi } from 'vitest';

const { reviewExternalEvidenceCatalogItems } = vi.hoisted(() => ({
  reviewExternalEvidenceCatalogItems: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  reviewExternalEvidenceCatalogItems,
}));

import { runBulkEvidenceReview } from '../../apps/web-ui/src/lib/evidence-review-actions';

afterEach(() => {
  vi.clearAllMocks();
});

describe('runBulkEvidenceReview', () => {
  it('aggregates settled review mutations and preserves partial failures', async () => {
    reviewExternalEvidenceCatalogItems.mockResolvedValue({
      action: 'accept',
      attempted_ids: ['evidence-1', 'evidence-2', 'evidence-3'],
      succeeded_ids: ['evidence-1', 'evidence-3'],
      failed: [{ id: 'evidence-2', message: 'Request timed out' }],
      note: 'reviewed in batch',
    });

    const result = await runBulkEvidenceReview({
      action: 'accept',
      ids: ['evidence-1', 'evidence-2', 'evidence-3'],
      note: '  reviewed in batch  ',
    });

    expect(reviewExternalEvidenceCatalogItems).toHaveBeenCalledTimes(1);
    expect(reviewExternalEvidenceCatalogItems).toHaveBeenCalledWith({
      ids: ['evidence-1', 'evidence-2', 'evidence-3'],
      action: 'accept',
      note: 'reviewed in batch',
    });
    expect(result.succeededIds).toEqual(['evidence-1', 'evidence-3']);
    expect(result.failed).toEqual([
      { id: 'evidence-2', message: 'Request timed out' },
    ]);
    expect(result.note).toBe('reviewed in batch');
  });
});
