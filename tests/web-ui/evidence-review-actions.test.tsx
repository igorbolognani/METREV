import { afterEach, describe, expect, it, vi } from 'vitest';

const { reviewExternalEvidenceCatalogItem } = vi.hoisted(() => ({
  reviewExternalEvidenceCatalogItem: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  reviewExternalEvidenceCatalogItem,
}));

import { runBulkEvidenceReview } from '../../apps/web-ui/src/lib/evidence-review-actions';

afterEach(() => {
  vi.clearAllMocks();
});

describe('runBulkEvidenceReview', () => {
  it('aggregates settled review mutations and preserves partial failures', async () => {
    reviewExternalEvidenceCatalogItem.mockImplementation((id: string) => {
      if (id === 'evidence-2') {
        return Promise.reject(new Error('Request timed out'));
      }

      return Promise.resolve({ id });
    });

    const result = await runBulkEvidenceReview({
      action: 'accept',
      ids: ['evidence-1', 'evidence-2', 'evidence-3'],
      note: '  reviewed in batch  ',
    });

    expect(reviewExternalEvidenceCatalogItem).toHaveBeenCalledTimes(3);
    expect(reviewExternalEvidenceCatalogItem).toHaveBeenNthCalledWith(
      1,
      'evidence-1',
      { action: 'accept', note: 'reviewed in batch' },
    );
    expect(result.succeededIds).toEqual(['evidence-1', 'evidence-3']);
    expect(result.failed).toEqual([
      { id: 'evidence-2', message: 'Request timed out' },
    ]);
    expect(result.note).toBe('reviewed in batch');
  });
});