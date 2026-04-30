import { afterEach, describe, expect, it, vi } from 'vitest';

import { researchPaperMetadataSchema } from '@metrev/domain-contracts';
import {
    executeResearchExtraction,
    findDefaultResearchColumn,
} from '@metrev/research-intelligence';

import incompletePaperFixture from '../fixtures/research/incomplete-paper.json';

const originalMode = process.env.METREV_LLM_MODE;
const originalModel = process.env.METREV_LLM_MODEL;
const originalBaseUrl = process.env.METREV_LLM_BASE_URL;
const originalApiKey = process.env.METREV_LLM_API_KEY;

afterEach(() => {
  vi.unstubAllGlobals();

  if (originalMode === undefined) {
    delete process.env.METREV_LLM_MODE;
  } else {
    process.env.METREV_LLM_MODE = originalMode;
  }

  if (originalModel === undefined) {
    delete process.env.METREV_LLM_MODEL;
  } else {
    process.env.METREV_LLM_MODEL = originalModel;
  }

  if (originalBaseUrl === undefined) {
    delete process.env.METREV_LLM_BASE_URL;
  } else {
    process.env.METREV_LLM_BASE_URL = originalBaseUrl;
  }

  if (originalApiKey === undefined) {
    delete process.env.METREV_LLM_API_KEY;
  } else {
    process.env.METREV_LLM_API_KEY = originalApiKey;
  }
});

describe('research runtime extractor', () => {
  it('uses hydrated full text to improve deterministic extraction when abstracts are incomplete', async () => {
    const column = findDefaultResearchColumn('performance_metrics');
    if (!column) {
      throw new Error('performance_metrics default column not registered');
    }

    const result = await executeResearchExtraction({
      reviewId: 'review-runtime-001',
      paper: researchPaperMetadataSchema.parse(incompletePaperFixture),
      column,
      claims: [],
      fetchPaperText: async (paper) => ({
        contentType: 'text/html',
        fetchedFrom: `${paper.source_url ?? 'https://example.org'}/full-text`,
        source: 'html',
        text: 'The reactor used carbon felt anodes, activated carbon cathodes, and achieved power density of 950 mW/m2 with COD removal of 76%.',
        trace: [
          {
            source: 'full_text',
            source_document_id: paper.source_document_id,
            text_span:
              'The reactor used carbon felt anodes, activated carbon cathodes, and achieved power density of 950 mW/m2 with COD removal of 76%.',
            source_locator: 'html:https://example.org/full-text',
            page_number: null,
          },
        ],
      }),
    });

    expect(result.status).toBe('valid');
    expect(result.missing_fields).not.toEqual(
      expect.arrayContaining(['metrics']),
    );
    expect(result.normalized_payload).toEqual(
      expect.objectContaining({
        full_text: expect.objectContaining({
          source: 'html',
        }),
      }),
    );
    const metrics = (
      result.normalized_payload as {
        metrics?: Array<{
          metric_key: string;
          normalized_value: number | null;
        }>;
      }
    ).metrics;
    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric_key: 'power_density_w_m2',
        }),
      ]),
    );
    expect(
      metrics?.find((metric) => metric.metric_key === 'power_density_w_m2')
        ?.normalized_value,
    ).toBeCloseTo(0.95, 6);
  });

  it('falls back to deterministic extraction for llm_extracted research columns when openai mode is requested', async () => {
    process.env.METREV_LLM_MODE = 'openai';
    process.env.METREV_LLM_MODEL = 'gpt-4o-mini';
    process.env.METREV_LLM_BASE_URL = 'https://example-openai.test/v1';
    process.env.METREV_LLM_API_KEY = 'test-key';

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const column = findDefaultResearchColumn('research_gaps');
    if (!column) {
      throw new Error('research_gaps default column not registered');
    }

    const paper = researchPaperMetadataSchema.parse(incompletePaperFixture);
    const result = await executeResearchExtraction({
      reviewId: 'review-runtime-001',
      paper,
      column,
      claims: [],
      fetchPaperText: async () => ({
        contentType: 'text/html',
        fetchedFrom: 'https://example.org/full-text',
        source: 'html',
        text: 'Long-duration fouling evidence remains limited. Scale-up durability remains unresolved.',
        trace: [
          {
            source: 'full_text',
            source_document_id: paper.source_document_id,
            text_span:
              'Long-duration fouling evidence remains limited. Scale-up durability remains unresolved.',
            source_locator: 'html:https://example.org/full-text',
            page_number: null,
          },
        ],
      }),
    });

    expect(result.status).toBe('valid');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.answer).toEqual(
      expect.objectContaining({
        gaps: expect.arrayContaining([
          'Scale-up durability remains unresolved.',
        ]),
        confidence: 'low',
      }),
    );
    expect(result.normalized_payload).toEqual(
      expect.objectContaining({
        full_text: expect.objectContaining({
          source: 'html',
        }),
      }),
    );
    expect(
      (result.normalized_payload as { llm_runtime?: unknown }).llm_runtime,
    ).toBeUndefined();
  });

  it('uses hydrated full text to improve data and metadata readiness extraction when abstracts are incomplete', async () => {
    const column = findDefaultResearchColumn('data_metadata_readiness');
    if (!column) {
      throw new Error('data_metadata_readiness default column not registered');
    }

    const paper = researchPaperMetadataSchema.parse(incompletePaperFixture);
    const result = await executeResearchExtraction({
      reviewId: 'review-runtime-001',
      paper,
      column,
      claims: [],
      fetchPaperText: async () => ({
        contentType: 'text/html',
        fetchedFrom: 'https://example.org/readiness-full-text',
        source: 'html',
        text: 'The installation documented timestamp origin, temporal resolution, calibration curves, validation results, rain events, and a data pipeline used for analytics and automation review.',
        trace: [
          {
            source: 'full_text',
            source_document_id: paper.source_document_id,
            text_span:
              'The installation documented timestamp origin, temporal resolution, calibration curves, validation results, rain events, and a data pipeline used for analytics and automation review.',
            source_locator: 'html:https://example.org/readiness-full-text',
            page_number: null,
          },
        ],
      }),
    });

    expect(result.status).toBe('valid');
    expect(result.missing_fields).not.toEqual(
      expect.arrayContaining(['signal_generation_metadata']),
    );
    expect(result.answer).toEqual(
      expect.objectContaining({
        decision_use_readiness: 'ready_with_review',
        metadata_categories: expect.objectContaining({
          signal_generation: expect.arrayContaining(['timestamp_origin']),
          signal_quality: expect.arrayContaining(['calibration_context']),
          data_lineage: expect.arrayContaining(['data_pipeline']),
        }),
      }),
    );
    expect(result.normalized_payload).toEqual(
      expect.objectContaining({
        full_text: expect.objectContaining({
          source: 'html',
        }),
      }),
    );
  });
});
