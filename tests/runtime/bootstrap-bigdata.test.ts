import { describe, expect, it, vi } from 'vitest';

import { runBigDataBootstrap } from '../../packages/database/scripts/bootstrap-bigdata';

describe('bigdata bootstrap', () => {
  it('resumes source/query runs from the latest bootstrap checkpoint', async () => {
    const runner = vi.fn().mockResolvedValue({
      claimsStored: 2,
      recordsFetched: 3,
      recordsStored: 3,
      sourceType: 'OPENALEX',
      supplierDocumentsStored: 0,
    });
    const collectInventory = vi.fn().mockResolvedValue({
      catalogItems: 3,
      claims: 2,
      products: 0,
      runs: 1,
      sourceRecords: 3,
      supplierDocuments: 0,
      suppliers: 0,
    });

    const result = await runBigDataBootstrap(
      {
        queryLimit: 1,
        resume: true,
        sources: 'openalex',
      },
      {
        collectInventory,
        configData: {
          defaults: {
            maxPages: 5,
            pageSize: 25,
            perQueryLimit: 25,
          },
          queries: ['microbial fuel cell wastewater'],
          sources: {
            openalex: {
              enabled: true,
              maxPages: 5,
              pageSize: 25,
              perQueryLimit: 25,
            },
          },
        },
        prisma: {
          ingestionRun: {
            findFirst: vi.fn().mockResolvedValue({
              checkpoint: {
                cursor: 'cursor:resume-from-page-3',
                pages_processed: 2,
              },
              status: 'FAILED',
            }),
          },
        },
        runners: {
          openalex: runner,
        },
      },
    );

    expect(runner).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: 'cursor:resume-from-page-3',
        maxPages: 3,
        query: 'microbial fuel cell wastewater',
        triggerMode: 'bigdata_bootstrap',
      }),
    );
    expect(result).toMatchObject({
      executedRuns: 1,
      resumedRuns: 1,
      skippedRuns: 0,
    });
    expect(collectInventory).toHaveBeenCalledTimes(1);
  });
});
