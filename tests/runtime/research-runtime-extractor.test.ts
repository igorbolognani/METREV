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
        blocks: [
          {
            kind: 'section',
            text: 'Methods The reactor used carbon felt anodes with surface area of 1200 m2/g, a Nafion membrane thickness of 180 um, and biofilm startup of 12 days at pH 7, 30 C, and HRT 24 h.',
            sourceLocator: 'html:https://example.org/full-text:block:0',
            pageNumber: null,
            sectionLabel: 'Methods',
            tableLabel: null,
            cellLocator: null,
            caption: null,
          },
          {
            kind: 'table',
            text: 'Table 1 reports a Pt/C cathode catalyst loading of 0.5 mg/cm2 and power density of 950 mW/m2.',
            sourceLocator: 'html:https://example.org/full-text:block:1',
            pageNumber: null,
            sectionLabel: 'Results',
            tableLabel: 'Table 1',
            cellLocator: 'Table 1:block:1',
            caption:
              'Table 1 reports a Pt/C cathode catalyst loading of 0.5 mg/cm2 and power density of 950 mW/m2.',
          },
        ],
        contentType: 'text/html',
        fetchedFrom: `${paper.source_url ?? 'https://example.org'}/full-text`,
        source: 'html',
        text: 'The reactor used carbon felt anodes with surface area of 1200 m2/g, a Nafion membrane thickness of 180 um, and biofilm startup of 12 days at pH 7, 30 C, and HRT 24 h. Table 1 reports a Pt/C cathode catalyst loading of 0.5 mg/cm2 and power density of 950 mW/m2 with COD removal of 76%.',
        trace: [
          {
            source: 'full_text',
            source_document_id: paper.source_document_id,
            text_span:
              'The reactor used carbon felt anodes with surface area of 1200 m2/g, a Nafion membrane thickness of 180 um, and biofilm startup of 12 days at pH 7, 30 C, and HRT 24 h. Table 1 reports a Pt/C cathode catalyst loading of 0.5 mg/cm2 and power density of 950 mW/m2 with COD removal of 76%.',
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
          block_count: 2,
          caption_count: 1,
          section_count: 2,
          source: 'html',
          table_count: 1,
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
    const answer = result.answer as {
      component_parameters?: Array<{
        component_type: string;
        normalized_unit: string | null;
        normalized_value: number | null;
        parameter_key: string;
      }>;
      component_profiles?: Array<{ component_type: string }>;
      quality_gate?: { passed: boolean; table_count: number };
    };
    expect(answer.component_parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          component_type: 'anode',
          parameter_key: 'component_parameters.anode_material',
        }),
        expect.objectContaining({
          component_type: 'anode',
          parameter_key: 'component_parameters.anode_surface_area',
          normalized_unit: 'm2/g',
          normalized_value: 1200,
        }),
        expect.objectContaining({
          component_type: 'membrane_separator',
          parameter_key: 'component_parameters.membrane_separator_thickness',
          normalized_unit: 'm',
          normalized_value: 0.00018,
        }),
        expect.objectContaining({
          component_type: 'catalyst',
          parameter_key: 'component_parameters.catalyst_loading',
          normalized_unit: 'mg/cm2',
          normalized_value: 0.5,
        }),
        expect.objectContaining({
          component_type: 'biofilm',
          parameter_key: 'component_parameters.biofilm_startup_time',
          normalized_unit: 'd',
          normalized_value: 12,
        }),
        expect.objectContaining({
          component_type: 'reactor',
          parameter_key: 'component_parameters.reactor_temperature',
          normalized_unit: 'K',
          normalized_value: 303.15,
        }),
      ]),
    );
    expect(answer.component_profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ component_type: 'anode' }),
        expect.objectContaining({ component_type: 'membrane_separator' }),
        expect.objectContaining({ component_type: 'biofilm' }),
      ]),
    );
    expect(answer.quality_gate).toEqual(
      expect.objectContaining({
        passed: true,
        table_count: 1,
      }),
    );
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
