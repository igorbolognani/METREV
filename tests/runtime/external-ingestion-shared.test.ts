import { describe, expect, it, vi } from 'vitest';

import {
    deduplicateEntries,
    extractClaimCandidates,
    getEvidenceIngestionConfig,
    normalizeCuratedManifestRecord,
    normalizeEuropePmcWork,
    optionFlag,
    optionNumber,
    optionValue,
    parseScriptOptions,
} from '../../packages/database/scripts/external-ingestion-shared.mjs';
import { loadCuratedManifestRecords } from '../../packages/database/scripts/ingest-curated-manifest';
import {
    findOrCreateBulkRun,
    recordBulkIngestionFailure,
    resolveBulkRunFinalState,
    runScientificEvidenceIngestion,
    shouldTreatProviderHttpFailureAsExhaustedCursor,
} from '../../packages/database/scripts/ingest-scientific-evidence';

describe('external ingestion shared helpers', () => {
  it('parses CLI options with values and flags', () => {
    const options = parseScriptOptions([
      '--query=microbial fuel cell',
      '--limit',
      '25',
      '--dryRun',
      '--pageSize=10',
    ]);

    expect(optionValue(options, 'query', null)).toBe('microbial fuel cell');
    expect(optionNumber(options, 'limit', 0)).toBe(25);
    expect(optionNumber(options, 'pageSize', 0)).toBe(10);
    expect(optionFlag(options, 'dryRun', false)).toBe(true);
  });

  it('normalizes Europe PMC results with claims and access status', () => {
    const entry = normalizeEuropePmcWork(
      {
        id: '41775299',
        source: 'MED',
        doi: '10.1016/j.biortech.2026.134330',
        title:
          'Long-term bioelectricity generation in microbial fuel cell exposed to perfluorooctanoic acid.',
        authorString: 'Joksimović K, Lješević M, Bryan C',
        journalTitle: 'Bioresource Technology',
        pubType: 'journal article',
        firstPublicationDate: '2026-03-01',
        isOpenAccess: 'Y',
        abstractText:
          'Current density reached 1.8 A/m2 after startup. Wastewater toxicity caused a gradual decline after day 40.',
        fullTextUrlList: {
          fullTextUrl: [
            {
              availability: 'Open access',
              documentStyle: 'pdf',
              url: 'https://example.org/fulltext.pdf',
            },
          ],
        },
      },
      'microbial fuel cell wastewater',
      '2026-04-22T20:00:00.000Z',
    );

    expect(entry?.sourceRecord.sourceType).toBe('EUROPE_PMC');
    expect(entry?.sourceRecord.accessStatus).toBe('GREEN');
    expect(entry?.sourceRecord.authors).toEqual([
      { name: 'Joksimović K' },
      { name: 'Lješević M' },
      { name: 'Bryan C' },
    ]);
    expect(entry?.claims.some((claim) => claim.claimType === 'METRIC')).toBe(
      true,
    );
    expect(
      entry?.claims.some((claim) => claim.claimType === 'LIMITATION'),
    ).toBe(true);
  });

  it('normalizes curated manifest supplier records with product linkage', () => {
    const entry = normalizeCuratedManifestRecord(
      {
        sourceKey: 'supplier-test-001',
        title: 'Curated supplier profile for carbon felt',
        sourceType: 'SUPPLIER_PROFILE',
        summary:
          'Commercial carbon felt sheets are offered for pilot electrode retrofits in wastewater systems.',
        tags: ['supplier', 'carbon-felt'],
        supplierDocument: {
          supplierName: 'Example Supplier',
          documentType: 'PROFILE',
          productKey: 'carbon-felt-sheet',
          productDisplayName: 'Carbon felt sheet',
          productCategory: 'anode_material',
          trl: 9,
        },
        claims: [
          {
            content:
              'Commercial carbon felt sheets can accelerate pilot electrode procurement.',
            claimType: 'SUPPLIER_CLAIM',
            confidence: 0.72,
          },
        ],
      },
      '2026-04-22T20:00:00.000Z',
      'manifest.json',
    );

    expect(entry?.sourceRecord.sourceType).toBe('SUPPLIER_PROFILE');
    expect(entry?.supplierDocuments).toHaveLength(1);
    expect(entry?.supplierDocuments[0]).toMatchObject({
      supplierName: 'Example Supplier',
      productKey: 'carbon-felt-sheet',
      documentType: 'PROFILE',
    });
    expect(entry?.catalogItem.evidenceType).toBe('supplier_claim');
    expect(entry?.claims[0]).toMatchObject({
      claimType: 'SUPPLIER_CLAIM',
      confidence: 0.72,
    });
  });

  it('maps curated manifest defaults onto contract-safe evidence types', () => {
    const entry = normalizeCuratedManifestRecord(
      {
        sourceKey: 'curated-manifest-test-001',
        title: 'Curated literature digest for wastewater pilots',
        sourceType: 'CURATED_MANIFEST',
        summary:
          'Analyst-curated literature digest for wastewater pilot evidence review.',
      },
      '2026-04-22T20:00:00.000Z',
      'manifest.json',
    );

    expect(entry?.catalogItem.evidenceType).toBe('literature_evidence');
  });

  it('loads sharded curated manifests through the committed snapshot index', () => {
    const manifest = loadCuratedManifestRecords(
      '../../packages/database/data/curated-bigdata-manifest.json',
      import.meta.url,
    );

    expect(manifest.shardCount).toBe(3);
    expect(manifest.records).toHaveLength(12);
    expect(manifest.records[0]).toMatchObject({
      sourceCategory: 'supplier_profile',
    });
    expect(
      manifest.records.some(
        (record) => record.sourceCategory === 'market_snapshot',
      ),
    ).toBe(true);
    expect(
      manifest.records.some(
        (record) => record.sourceCategory === 'analyst_brief',
      ),
    ).toBe(true);
  });

  it('extracts heuristic claims from abstract sentences', () => {
    const claims = extractClaimCandidates({
      title: 'Wastewater BES performance summary',
      abstractText:
        'Current density reached 2.1 A/m2 at neutral pH. Membrane fouling remained the main limitation during industrial wastewater operation.',
      sourceType: 'OPENALEX',
      importQuery: 'industrial wastewater BES',
    });

    expect(claims).toHaveLength(2);
    expect(claims[0]).toMatchObject({
      claimType: 'METRIC',
      extractedValue: '2.1',
      unit: 'A/m2',
    });
    expect(claims[1].claimType).toBe('LIMITATION');
  });

  it('deduplicates entries by normalized DOI before falling back to source keys', () => {
    const firstEntry = {
      sourceRecord: {
        sourceType: 'OPENALEX',
        sourceKey: 'https://openalex.org/W-FIRST',
        doi: 'https://doi.org/10.1000/test-doi',
        hashDedup: 'hash-first',
        title: 'Electrochemical wastewater diagnosis',
      },
    };
    const duplicateEntry = {
      sourceRecord: {
        sourceType: 'CROSSREF',
        sourceKey: '10.1000/test-doi',
        doi: '10.1000/test-doi',
        hashDedup: 'hash-second',
        title: 'Electrochemical wastewater diagnosis updated',
      },
    };

    const deduplicated = deduplicateEntries([firstEntry, duplicateEntry]);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]).toBe(firstEntry);
  });

  it('deduplicates entries by normalized title, year, and first author when DOI is absent', () => {
    const firstEntry = normalizeEuropePmcWork(
      {
        id: 'title-dedupe-1',
        source: 'MED',
        title: 'Microbial fuel cell power density in wastewater',
        authorString: 'A. Researcher, B. Reviewer',
        firstPublicationDate: '2024-01-01',
        abstractText:
          'Microbial fuel cell power density reached 2.1 W/m2 in wastewater operation.',
      },
      'microbial fuel cell wastewater',
      '2026-05-03T12:00:00.000Z',
    );
    const duplicateEntry = normalizeEuropePmcWork(
      {
        id: 'title-dedupe-2',
        source: 'MED',
        title: 'Microbial fuel cell: power density in wastewater',
        authorString: 'A. Researcher, C. Analyst',
        firstPublicationDate: '2024-09-01',
        abstractText:
          'Microbial fuel cell power density reached 2.1 W/m2 in wastewater operation.',
      },
      'microbial fuel cell wastewater',
      '2026-05-03T12:00:00.000Z',
    );

    const deduplicated = deduplicateEntries([firstEntry, duplicateEntry]);

    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0]).toBe(firstEntry);
  });

  it('system-accepts valid trusted scientific corpus records when auto accept is enabled', () => {
    const normalized = normalizeEuropePmcWork(
      {
        id: 'auto-accept-001',
        source: 'MED',
        doi: '10.1000/auto-accept',
        title: 'Microbial electrolysis cell hydrogen production benchmark',
        authorString: 'A. Researcher, B. Reviewer',
        journalTitle: 'Bioelectrochemical Systems',
        firstPublicationDate: '2025-06-01',
        abstractText:
          'Microbial electrolysis cell hydrogen production improved at neutral pH and current density reached 1.4 A/m2.',
      },
      'microbial electrolysis hydrogen',
      '2026-05-03T12:00:00.000Z',
      {
        autoAcceptTrustedCorpus: true,
        ingestionMode: 'bulk',
        ingestionBatchId: 'test-batch-001',
      },
    );

    expect(normalized?.catalogItem).toMatchObject({
      reviewStatus: 'ACCEPTED',
      acceptedBy: 'system',
      acceptancePolicy: 'auto_accept_trusted_scientific_corpus_v1',
      reviewRequired: false,
      ingestionMode: 'bulk',
      ingestionBatchId: 'test-batch-001',
      extractionStatus: 'heuristic_extracted',
      normalizationStatus: 'normalized',
    });
  });

  it('keeps malformed or low-provenance records in the exception queue even when auto accept is enabled', () => {
    const normalized = normalizeCuratedManifestRecord(
      {
        sourceKey: 'supplier-auto-accept-blocked',
        title: 'Supplier-only market claim',
        sourceType: 'SUPPLIER_PROFILE',
        summary:
          'Supplier-only claims remain review exceptions unless separately validated.',
      },
      '2026-05-03T12:00:00.000Z',
      'manifest.json',
      { autoAcceptTrustedCorpus: true },
    );

    expect(normalized?.catalogItem.reviewStatus).toBe('PENDING');
    expect(normalized?.catalogItem.reviewRequired).toBe(true);
  });

  it('reads the production-scale evidence ingestion defaults from CLI-style options', () => {
    const config = getEvidenceIngestionConfig({
      'target-total': '500000',
      'batch-size': '1000',
      'auto-accept': 'true',
      'review-only-exceptions': 'true',
    });

    expect(config).toMatchObject({
      targetTotal: 500000,
      batchSize: 1000,
      autoAcceptTrustedCorpus: true,
      reviewOnlyExceptions: true,
    });
  });

  it('plans the production-scale evidence ingestion command without mutating data in dry-run mode', async () => {
    const result = await runScientificEvidenceIngestion({
      dryRun: true,
      'target-total': '500000',
      'batch-size': '1000',
      'auto-accept': 'true',
      queryLimit: '1',
    });

    expect(result).toMatchObject({
      dryRun: true,
      command: 'evidence:ingest',
      targetTotal: 500000,
      batchSize: 1000,
      autoAcceptTrustedCorpus: true,
      acceptancePolicy: 'auto_accept_trusted_scientific_corpus_v1',
    });
  });

  it('resumes an explicit bulk ingestion run by id instead of creating a duplicate run', async () => {
    const existingRun = {
      id: 'bulk-run-001',
      triggerMode: 'bulk_scientific_corpus',
      status: 'STARTED',
    };
    const prisma = {
      ingestionRun: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue(existingRun),
      },
    };

    const run = await findOrCreateBulkRun({
      autoAccept: true,
      batchSize: 1000,
      prisma: prisma as never,
      resume: true,
      resumeRunId: 'bulk-run-001',
      targetTotal: 500000,
    });

    expect(run).toBe(existingRun);
    expect(prisma.ingestionRun.findUnique).toHaveBeenCalledWith({
      where: { id: 'bulk-run-001' },
    });
    expect(prisma.ingestionRun.findFirst).not.toHaveBeenCalled();
    expect(prisma.ingestionRun.create).not.toHaveBeenCalled();
  });

  it('rejects explicit resume for a completed bulk ingestion run', async () => {
    const prisma = {
      ingestionRun: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bulk-run-completed',
          triggerMode: 'bulk_scientific_corpus',
          status: 'COMPLETED',
        }),
      },
    };

    await expect(
      findOrCreateBulkRun({
        autoAccept: true,
        batchSize: 1000,
        prisma: prisma as never,
        resume: true,
        resumeRunId: 'bulk-run-completed',
        targetTotal: 500000,
      }),
    ).rejects.toThrow(
      'Bulk ingestion run bulk-run-completed has status COMPLETED; only STARTED runs can be resumed.',
    );
  });

  it('keeps a bulk run resumable when the operator page limit pauses before target', () => {
    const finalState = resolveBulkRunFinalState({
      catalogTotal: 32564,
      exhaustedWithoutTarget: false,
      maxProviderPages: 1,
      pagesProcessed: 1,
      targetTotal: 500000,
    });

    expect(finalState).toMatchObject({
      pausedAfterPageLimit: true,
      status: 'STARTED',
    });
    expect(finalState.warning).toContain('Resume the same run id to continue.');
  });

  it('records provider failures on the active bulk run instead of creating a duplicate failed run', async () => {
    const prisma = {
      ingestionRun: {
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'bulk-run-001' }),
      },
    };

    await recordBulkIngestionFailure({
      activeRunId: 'bulk-run-001',
      config: {
        autoAcceptTrustedCorpus: true,
        batchSize: 1000,
        targetTotal: 500000,
      },
      message: 'Crossref request failed with status 404',
      prisma: prisma as never,
      query: 'microbial fuel cell wastewater treatment',
      sourceType: 'CROSSREF',
    });

    expect(prisma.ingestionRun.update).toHaveBeenCalledWith({
      where: { id: 'bulk-run-001' },
      data: expect.objectContaining({
        query: 'microbial fuel cell wastewater treatment',
        sourceType: 'CROSSREF',
        recordsFailed: { increment: 1 },
        failureDetail: expect.objectContaining({
          message: 'Crossref request failed with status 404',
          recoverable: true,
          run_status_preserved: 'STARTED',
        }),
      }),
    });
    expect(prisma.ingestionRun.create).not.toHaveBeenCalled();
  });

  it('classifies stale Crossref cursor misses without hiding first-page failures', () => {
    expect(
      shouldTreatProviderHttpFailureAsExhaustedCursor({
        cursor: 'DnF1ZXJ5VGhlbkZldGNoJAAAAAEJ_Gmf',
        source: 'crossref',
        status: 404,
      }),
    ).toBe(true);
    expect(
      shouldTreatProviderHttpFailureAsExhaustedCursor({
        cursor: '*',
        source: 'crossref',
        status: 404,
      }),
    ).toBe(false);
    expect(
      shouldTreatProviderHttpFailureAsExhaustedCursor({
        cursor: 'cursor',
        source: 'openalex',
        status: 404,
      }),
    ).toBe(false);
  });
});

import {
    expandOpenAlexAbstract,
    normalizeCrossrefWork,
    normalizeOpenAlexWork,
} from '../../packages/database/scripts/external-ingestion-shared.mjs';

describe('external ingestion normalization', () => {
  it('reconstructs OpenAlex abstracts from the inverted index', () => {
    expect(
      expandOpenAlexAbstract({
        electrochemical: [0],
        nitrogen: [1],
        recovery: [2],
      }),
    ).toBe('electrochemical nitrogen recovery');
  });

  it('normalizes OpenAlex works into pending literature catalog entries', () => {
    const normalized = normalizeOpenAlexWork(
      {
        id: 'https://openalex.org/W123',
        display_name:
          'Electrochemical nitrogen recovery under pilot conditions',
        doi: 'https://doi.org/10.1000/test-doi',
        publication_date: '2025-04-01',
        abstract_inverted_index: {
          Electrochemical: [0],
          nitrogen: [1],
          recovery: [2],
        },
        primary_location: {
          landing_page_url: 'https://example.org/paper',
          source: {
            display_name: 'Journal of Pilot Recovery',
          },
        },
      },
      'nitrogen recovery',
      '2026-04-14T12:00:00.000Z',
    );

    expect(normalized?.sourceRecord.sourceType).toBe('OPENALEX');
    expect(normalized?.sourceRecord.doi).toBe('10.1000/test-doi');
    expect(normalized?.catalogItem.reviewStatus).toBe('PENDING');
    expect(normalized?.catalogItem.tags).toEqual(
      expect.arrayContaining(['external-ingestion', 'openalex']),
    );
  });

  it('normalizes Crossref works and strips abstract markup', () => {
    const normalized = normalizeCrossrefWork(
      {
        DOI: '10.1000/crossref-doi',
        URL: 'https://doi.org/10.1000/crossref-doi',
        title: ['Wastewater treatment instrumentation for microbial systems'],
        publisher: 'Crossref Test Publisher',
        abstract:
          '<jats:p>Instrumentation quality matters for robust diagnosis.</jats:p>',
        issued: {
          'date-parts': [[2024, 10, 15]],
        },
      },
      'wastewater instrumentation',
      '2026-04-14T12:00:00.000Z',
    );

    expect(normalized?.sourceRecord.sourceType).toBe('CROSSREF');
    expect(normalized?.catalogItem.summary).toContain(
      'Instrumentation quality matters',
    );
    expect(normalized?.catalogItem.provenanceNote).toContain(
      'wastewater instrumentation',
    );
  });
});
