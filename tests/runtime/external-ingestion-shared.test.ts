import { describe, expect, it } from 'vitest';

import {
  extractClaimCandidates,
  normalizeCuratedManifestRecord,
  normalizeEuropePmcWork,
  optionFlag,
  optionNumber,
  optionValue,
  parseScriptOptions,
} from '../../packages/database/scripts/external-ingestion-shared.mjs';
import { loadCuratedManifestRecords } from '../../packages/database/scripts/ingest-curated-manifest';

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
