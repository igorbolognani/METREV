import { describe, expect, it, vi } from 'vitest';

import { researchPaperSearchResultSchema } from '@metrev/domain-contracts';

import { stageResearchPapers } from '../../packages/database/src/research-paper-search';

function buildPaper(input: {
  doi: string;
  sourceKey: string;
  sourceType: 'openalex' | 'crossref';
  sourceUrl: string;
  title: string;
}) {
  return researchPaperSearchResultSchema.parse({
    source_type: input.sourceType,
    source_key: input.sourceKey,
    title: input.title,
    authors: [{ name: 'Batch Test Author' }],
    year: 2026,
    doi: input.doi,
    journal: 'Batch Import Journal',
    publisher: 'METREV Test Harness',
    source_url: input.sourceUrl,
    pdf_url: null,
    xml_url: null,
    abstract_text: 'Batch import regression fixture.',
    citation_count: 3,
    access_status: 'green',
    metadata: {
      fixture: true,
    },
  });
}

describe('research paper staging', () => {
  it('stages a batch of unique papers inside one transaction-scoped write pass', async () => {
    const transaction = {
      externalSourceRecord: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: 'source-001' })
          .mockResolvedValueOnce({ id: 'source-002' }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      externalEvidenceCatalogItem: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue(undefined),
      },
    };
    const prisma = {
      $transaction: vi.fn(
        async (callback: (value: typeof transaction) => unknown) =>
          callback(transaction),
      ),
    };

    const result = await stageResearchPapers(prisma as never, {
      query: 'batch write regression',
      items: [
        buildPaper({
          doi: '10.5555/batch-write-001',
          sourceKey: 'https://openalex.org/W-batch-write-001',
          sourceType: 'openalex',
          sourceUrl: 'https://openalex.org/W-batch-write-001',
          title: 'Batch write staging fixture one',
        }),
        buildPaper({
          doi: '10.5555/batch-write-002',
          sourceKey: '10.5555/batch-write-002',
          sourceType: 'crossref',
          sourceUrl: 'https://doi.org/10.5555/batch-write-002',
          title: 'Batch write staging fixture two',
        }),
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.externalSourceRecord.findMany).toHaveBeenCalledTimes(3);
    expect(
      transaction.externalEvidenceCatalogItem.findMany,
    ).toHaveBeenCalledTimes(1);
    expect(transaction.externalSourceRecord.create).toHaveBeenCalledTimes(2);
    expect(
      transaction.externalEvidenceCatalogItem.upsert,
    ).toHaveBeenCalledTimes(2);
    expect(result.sourceDocumentIds).toEqual(['source-001', 'source-002']);
    expect(result.papers).toHaveLength(2);
  });
});
