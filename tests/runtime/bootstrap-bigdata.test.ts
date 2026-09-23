import { describe, expect, it, vi } from 'vitest';

import { runBigDataBootstrap } from '../../packages/database/scripts/bootstrap-bigdata';
import { runQueueResearchBackfillTarget } from '../../packages/database/scripts/queue-research-backfill-target';
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
        maxPages: 1,
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

  it('plans a bounded MFC/MEC, wastewater, and biosensor literature preset', () => {
    const result = planResearchBackfillPreset({
      targetRecords: 500,
    });

    expect(result.presetId).toBe('mfc_mec_wastewater_biosensors');
    expect(result.queryCount).toBe(20);
    expect(result.targetRecords).toBe(500);
    expect(result.estimatedMaxRecords).toBeLessThanOrEqual(500);
    expect(result.plannedBackfills[0]).toMatchObject({
      max_pages: 1,
      per_provider_limit: 8,
      target_records: 24,
    });
  });

  it('plans the focused provider bootstrap without contacting providers or opening a database', async () => {
    const runner = vi.fn();
    const findFirst = vi.fn();
    const collectInventory = vi.fn();
    const result = await runBigDataBootstrap(
      {
        planOnly: true,
        sources: 'openalex,crossref',
        targetRecords: 500,
      },
      {
        collectInventory,
        configData: {
          queries: ['MFC wastewater', 'wastewater biosensor'],
          sources: {
            openalex: { enabled: true },
            crossref: { enabled: true },
          },
        },
        prisma: { ingestionRun: { findFirst } },
        runners: { openalex: runner, crossref: runner },
      },
    );

    expect(result).toMatchObject({
      planOnly: true,
      targetRecords: 500,
      estimatedMaxRecords: 500,
      queryCount: 2,
      providerQueryCount: 4,
    });
    expect(result.plannedRuns).toHaveLength(4);
    expect(runner).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
    expect(collectInventory).not.toHaveBeenCalled();
  });

  it('dry-runs the focused queue without initializing Prisma or enqueuing work', async () => {
    const result = await runQueueResearchBackfillTarget({
      preset: 'mfc_mec_wastewater_biosensors',
      targetRecords: 500,
      dryRun: true,
    });

    expect(result).toMatchObject({
      dry_run: true,
      target_records: 500,
      estimated_max_records: 480,
      query_count: 20,
      queued_runs: 0,
      backfills: [],
      planned_backfills: expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('biosensor'),
          providers: ['openalex', 'crossref', 'europe_pmc'],
          max_pages: 1,
        }),
      ]),
    });
  });
});
