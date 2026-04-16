import { describe, expect, it } from 'vitest';

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
