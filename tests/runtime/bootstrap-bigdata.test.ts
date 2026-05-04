import { describe, expect, it, vi } from 'vitest';

import { runBigDataBootstrap } from '../../packages/database/scripts/bootstrap-bigdata';
import { planResearchBackfillPreset } from '../../packages/database/src/research-backfill-presets';

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

  it('derives warehouse-scale overrides from a target record count', async () => {
    const openalexRunner = vi.fn().mockResolvedValue({
      claimsStored: 0,
      recordsFetched: 10,
      recordsStored: 10,
      sourceType: 'OPENALEX',
      supplierDocumentsStored: 0,
    });
    const crossrefRunner = vi.fn().mockResolvedValue({
      claimsStored: 0,
      recordsFetched: 10,
      recordsStored: 10,
      sourceType: 'CROSSREF',
      supplierDocumentsStored: 0,
    });
    const collectInventory = vi.fn().mockResolvedValue({
      catalogItems: 40,
      claims: 0,
      products: 0,
      runs: 4,
      sourceRecords: 40,
      supplierDocuments: 0,
      suppliers: 0,
    });

    const result = await runBigDataBootstrap(
      {
        sources: 'openalex,crossref',
        targetRecords: 5000,
      },
      {
        collectInventory,
        configData: {
          defaults: {
            maxPages: 1,
            pageSize: 25,
            perQueryLimit: 25,
          },
          queries: ['microbial fuel cell wastewater', 'electroactive biofilm'],
          sources: {
            openalex: {
              enabled: true,
              maxPages: 1,
              pageSize: 25,
              perQueryLimit: 25,
            },
            crossref: {
              enabled: true,
              maxPages: 1,
              pageSize: 25,
              perQueryLimit: 25,
            },
          },
        },
        prisma: {
          ingestionRun: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
        runners: {
          openalex: openalexRunner,
          crossref: crossrefRunner,
        },
      },
    );

    expect(openalexRunner).toHaveBeenCalledTimes(2);
    expect(crossrefRunner).toHaveBeenCalledTimes(2);
    expect(openalexRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1250,
        maxPages: 7,
        pageSize: 200,
      }),
    );
    expect(crossrefRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 1250,
        maxPages: 7,
        pageSize: 200,
      }),
    );
    expect(result).toMatchObject({
      executedRuns: 4,
      resumedRuns: 0,
      scalePlan: {
        maxPages: 7,
        pageSize: 200,
        perQueryLimit: 1250,
        queryCount: 2,
        runSlots: 4,
        targetRecords: 5000,
      },
      skippedRuns: 0,
    });
    expect(collectInventory).toHaveBeenCalledTimes(1);
  });

  it('plans the 30000 MFC/MEC preset as query-scoped queued backfills', () => {
    const result = planResearchBackfillPreset({
      targetRecords: 30000,
    });

    expect(result.presetId).toBe('mfc_mec_30000');
    expect(result.queryCount).toBeGreaterThanOrEqual(20);
    expect(result.targetRecords).toBe(30000);
    expect(result.plannedBackfills[0]).toMatchObject({
      max_pages: 1,
      per_provider_limit: 1000,
      target_records: 1000,
    });
  });
});
