import { describe, expect, it, vi } from 'vitest';

import { CANONICALIZATION_STATUSES } from '../../packages/database/scripts/canonical-scientific-evidence.mjs';
import {
    canPersistHydratedSourceText,
    canonicalizeCatalogRecordWithRuntime,
} from '../../packages/database/scripts/canonicalize-scientific-evidence';

function buildSourceRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'source-runtime-001',
    sourceType: 'OPENALEX',
    title: 'Editorial note',
    abstractText: '',
    publicationYear: 2025,
    sourceUrl: 'https://example.org/editorial',
    pdfUrl: 'https://example.org/editorial.pdf',
    xmlUrl: null,
    accessStatus: 'GREEN',
    license: 'CC-BY-4.0',
    doi: '10.1000/example',
    journal: 'Example Journal',
    publisher: 'Example Publisher',
    authors: [{ name: 'Example Author' }],
    sourceCategory: 'literature_evidence',
    rawPayload: { provider: 'openalex' },
    sourceTextChunks: [],
    ...overrides,
  };
}

function buildCatalogRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'catalog-runtime-001',
    sourceRecordId: 'source-runtime-001',
    title: 'Editorial note on research collaboration',
    summary: 'This article discusses collaboration trends.',
    reviewStatus: 'ACCEPTED',
    evidenceQuality: 'high',
    sourceRecord: buildSourceRecord(),
    claims: [],
    ...overrides,
  };
}

describe('canonicalize scientific evidence runtime hydrate path', () => {
  it('allows persisted hydrate text to promote a needs_full_text record into canonical extracted facts', async () => {
    const result = await canonicalizeCatalogRecordWithRuntime(
      buildCatalogRecord(),
      {
        fullTextMode: 'hydrate',
        llmMode: 'disabled',
        hydratePaperText: async () => ({
          contentType: 'text/html',
          fetchedFrom: 'https://example.org/full-text',
          source: 'html',
          text: 'The microbial fuel cell used a carbon felt anode and achieved power density of 900 mW/m2 with COD removal of 81%.',
          trace: [
            {
              source: 'full_text',
              source_document_id: 'source-runtime-001',
              text_span:
                'The microbial fuel cell used a carbon felt anode and achieved power density of 900 mW/m2 with COD removal of 81%.',
              source_locator: 'html:https://example.org/full-text',
              page_number: null,
            },
          ],
        }),
      },
    );

    expect(result.status).toBe(CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED);
    expect(result.hydration.fetched).toBe(true);
    expect(result.hydration.persistence).not.toBeNull();
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'power_density',
          normalizedUnit: 'W/m2',
        }),
      ]),
    );
  });

  it('blocks hydrate persistence when access policy is not permissive', async () => {
    const hydratePaperText = vi.fn();
    const blockedRecord = buildCatalogRecord({
      sourceRecord: buildSourceRecord({
        accessStatus: 'CLOSED',
        license: null,
      }),
    });

    expect(canPersistHydratedSourceText(blockedRecord)).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'access_or_license_policy_blocked',
      }),
    );

    const result = await canonicalizeCatalogRecordWithRuntime(blockedRecord, {
      fullTextMode: 'hydrate',
      llmMode: 'disabled',
      hydratePaperText,
    });

    expect(result.status).toBe(CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT);
    expect(result.hydration.policy).toBe('blocked');
    expect(hydratePaperText).not.toHaveBeenCalled();
  });

  it('downgrades hydrated full text with no technical signal to insufficient source', async () => {
    const result = await canonicalizeCatalogRecordWithRuntime(
      buildCatalogRecord(),
      {
        fullTextMode: 'hydrate',
        llmMode: 'disabled',
        hydratePaperText: async () => ({
          contentType: 'text/html',
          fetchedFrom: 'https://example.org/full-text',
          source: 'html',
          text: 'This full text discusses collaboration, editorial direction, institutional partnerships, publication strategy, and community engagement without any quantitative findings.',
          trace: [
            {
              source: 'full_text',
              source_document_id: 'source-runtime-001',
              text_span:
                'This full text discusses collaboration, editorial direction, institutional partnerships, publication strategy, and community engagement without any quantitative findings.',
              source_locator: 'html:https://example.org/full-text',
              page_number: null,
            },
          ],
        }),
      },
    );

    expect(result.status).toBe(CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE);
    expect(result.hydration.policy).toBe('fetched_no_signal');
    expect(result.facts).toHaveLength(0);
  });

  it('uses schema-validated measurement candidates to supplement deterministic extraction', async () => {
    const record = buildCatalogRecord({
      sourceRecord: buildSourceRecord({
        sourceTextChunks: [
          {
            chunkIndex: 0,
            pageNumber: null,
            sourceLocator: 'chunk:0',
            text: 'The microbial fuel cell reached a power density of nine hundred milliwatts per square meter during stable operation.',
          },
        ],
      }),
    });

    const result = await canonicalizeCatalogRecordWithRuntime(record, {
      fullTextMode: 'existing',
      llmMode: 'schema_validated',
      generateMeasurementCandidates: async () => [
        {
          fieldKey: 'power_density',
          canonicalKey: 'power_density_w_m2',
          rawValue: '900',
          rawUnit: 'mW/m2',
          textSpan: 'power density of nine hundred milliwatts per square meter',
          sourceLocator: 'llm:measurement:0',
          confidence: 0.76,
        },
      ],
    });

    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'power_density',
          extractionSource: 'llm_schema_validated_measurement',
          normalizedValue: 0.9,
          normalizedUnit: 'W/m2',
        }),
      ]),
    );
    expect(result.qualityFlags).toContain('llm_schema_validated_measurement');
  });

  it('keeps schema-validated facts out of decision-ready use when the locator is missing', async () => {
    const record = buildCatalogRecord({
      sourceRecord: buildSourceRecord({
        sourceTextChunks: [
          {
            chunkIndex: 0,
            pageNumber: null,
            sourceLocator: 'chunk:0',
            text: 'The microbial fuel cell reached a power density of nine hundred milliwatts per square meter during stable operation.',
          },
        ],
      }),
    });

    const result = await canonicalizeCatalogRecordWithRuntime(record, {
      fullTextMode: 'existing',
      llmMode: 'schema_validated',
      generateMeasurementCandidates: async () => [
        {
          fieldKey: 'power_density',
          canonicalKey: 'power_density_w_m2',
          rawValue: '900',
          rawUnit: 'mW/m2',
          textSpan: 'power density of nine hundred milliwatts per square meter',
          sourceLocator: '',
          confidence: 0.76,
        },
      ],
    });

    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extractionSource: 'llm_schema_validated_measurement',
          decisionReady: false,
          qualityFlags: expect.arrayContaining(['untraceable_source_span']),
        }),
      ]),
    );
  });

  it('uses schema-validated qualitative candidates for materials, architecture, limitations, and theory', async () => {
    const record = buildCatalogRecord({
      sourceRecord: buildSourceRecord({
        sourceTextChunks: [
          {
            chunkIndex: 0,
            pageNumber: null,
            sourceLocator: 'chunk:0',
            text: 'The reactor was configured as a two-chamber microbial electrolysis cell. The anode used carbon cloth as the biofilm support. The authors reported membrane fouling as the main limitation. The study attributed current generation to direct extracellular electron transfer through a mature electroactive biofilm.',
          },
        ],
      }),
    });

    const result = await canonicalizeCatalogRecordWithRuntime(record, {
      fullTextMode: 'existing',
      llmMode: 'schema_validated',
      generateQualitativeCandidates: async () => [
        {
          category: 'reactor_type',
          fieldKey: 'reactor_type',
          canonicalValue: 'two_chamber',
          componentType: null,
          textSpan: 'two-chamber microbial electrolysis cell',
          sourceLocator: 'llm:qualitative:reactor',
          confidence: 0.74,
        },
        {
          category: 'material',
          fieldKey: 'anode_material',
          canonicalValue: 'carbon cloth',
          componentType: 'anode',
          textSpan: 'anode used carbon cloth as the biofilm support',
          sourceLocator: 'llm:qualitative:material',
          confidence: 0.78,
        },
        {
          category: 'limitation',
          fieldKey: 'reported_limitations',
          canonicalValue: 'membrane fouling',
          componentType: null,
          textSpan: 'membrane fouling as the main limitation',
          sourceLocator: 'llm:qualitative:limitation',
          confidence: 0.7,
        },
        {
          category: 'scientific_theory',
          fieldKey: 'electron_transfer_mechanism',
          canonicalValue: 'direct extracellular electron transfer',
          componentType: null,
          textSpan:
            'direct extracellular electron transfer through a mature electroactive biofilm',
          sourceLocator: 'llm:qualitative:theory',
          confidence: 0.72,
        },
      ],
    });

    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'reactor_type',
          extractionSource: 'llm_schema_validated_qualitative',
          normalizedText: 'two_chamber',
        }),
        expect.objectContaining({
          fieldKey: 'anode_material',
          extractionSource: 'llm_schema_validated_qualitative',
          material: 'carbon_cloth',
        }),
        expect.objectContaining({
          fieldKey: 'reported_limitations',
          extractionSource: 'llm_schema_validated_qualitative',
          factType: 'limitation',
        }),
        expect.objectContaining({
          fieldKey: 'electron_transfer_mechanism',
          extractionSource: 'llm_schema_validated_qualitative',
          factType: 'scientific_theory',
        }),
      ]),
    );
    expect(result.qualityFlags).toContain('llm_schema_validated_qualitative');
    expect(result.missingFields).not.toContain('anode_material');
  });

  it('rejects schema-validated qualitative candidates without an exact source span', async () => {
    const record = buildCatalogRecord({
      sourceRecord: buildSourceRecord({
        sourceTextChunks: [
          {
            chunkIndex: 0,
            pageNumber: null,
            sourceLocator: 'chunk:0',
            text: 'The microbial fuel cell used acetate substrate during stable operation.',
          },
        ],
      }),
    });

    const result = await canonicalizeCatalogRecordWithRuntime(record, {
      fullTextMode: 'existing',
      llmMode: 'schema_validated',
      generateQualitativeCandidates: async () => [
        {
          category: 'material',
          fieldKey: 'membrane_separator',
          canonicalValue: 'Nafion',
          componentType: 'membrane_separator',
          textSpan: 'Nafion membrane reduced oxygen crossover',
          sourceLocator: 'llm:qualitative:unverified',
          confidence: 0.8,
        },
      ],
    });

    expect(result.facts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          extractionSource: 'llm_schema_validated_qualitative',
        }),
      ]),
    );
    expect(result.qualityFlags).not.toContain(
      'llm_schema_validated_qualitative',
    );
  });
});
