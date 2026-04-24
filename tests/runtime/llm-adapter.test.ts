import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DecisionOutput } from '@metrev/domain-contracts';
import { rawCaseInputSchema } from '@metrev/domain-contracts';

import {
  generateEvidenceAssistantBrief,
  generateNarrative,
} from '../../packages/llm-adapter/src/index';
import rawFixture from '../fixtures/raw-case-input.json';

const originalMode = process.env.METREV_LLM_MODE;
const originalModel = process.env.METREV_LLM_MODEL;
const originalBaseUrl = process.env.METREV_LLM_BASE_URL;
const originalTimeout = process.env.METREV_LLM_TIMEOUT_MS;

function buildDecisionOutput(): DecisionOutput {
  return {
    current_stack_diagnosis: {
      summary: 'Baseline summary',
      bottlenecks: [],
      evidence_trace: [],
      operating_envelope: [],
    },
    prioritized_improvement_options: [
      {
        recommendation_id: 'rec-1',
        title: 'Recommendation',
        rationale: 'Improve the monitored operating envelope.',
        expected_impact: 'Better operating range clarity.',
        trade_offs: [],
        prerequisites: [],
        evidence_links: [],
        confidence_modifier: 'neutral',
        priority_score: 0.6,
        phase_assignment: 'immediate',
      },
    ],
    impact_map: [],
    supplier_shortlist: [],
    phased_roadmap: [],
    assumptions_and_defaults_audit: {
      defaults_used: [],
      missing_critical_data: [],
      assumptions: [],
      evidence_gaps: [],
    },
    confidence_and_uncertainty_summary: {
      confidence_level: 'medium',
      primary_uncertainties: [],
      sensitivity_notes: [],
      next_measurements: [],
    },
  };
}

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

  if (originalTimeout === undefined) {
    delete process.env.METREV_LLM_TIMEOUT_MS;
  } else {
    process.env.METREV_LLM_TIMEOUT_MS = originalTimeout;
  }
});

describe('llm adapter', () => {
  it('uses the Ollama-compatible endpoint for case narratives when configured', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'llama3.1';
    process.env.METREV_LLM_BASE_URL = 'http://127.0.0.1:11434/v1';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Local Ollama narrative.',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const rawInput = rawCaseInputSchema.parse(rawFixture);
    const result = await generateNarrative({
      normalizedCase: rawInput,
      decisionOutput: buildDecisionOutput(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual({
      narrative: 'Local Ollama narrative.',
      narrativeMetadata: expect.objectContaining({
        mode: 'ollama',
        provider: 'ollama',
        model: 'llama3.1',
        status: 'generated',
        fallback_used: false,
      }),
    });
  });

  it('falls back to the deterministic evidence stub when the Ollama request fails', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'llama3.1';

    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error('connection refused'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateEvidenceAssistantBrief({
      reviewStatus: 'accepted',
      searchQuery: 'benchmark',
      sourceType: 'crossref',
      warehouseSnapshot: {
        filtered_item_count: 2,
        returned_item_count: 1,
        claim_count: 3,
        reviewed_claim_count: 1,
        doi_count: 2,
        linked_source_count: 2,
        publisher_count: 1,
      },
      spotlight: [
        {
          id: 'catalog-item-001',
          title: 'Pilot wastewater instrumentation study',
          summary: 'Summary',
          evidence_type: 'literature_evidence',
          strength_level: 'moderate',
          review_status: 'accepted',
          source_state: 'reviewed',
          source_type: 'crossref',
          source_category: 'scholarly_work',
          source_url: 'https://doi.org/10.1000/example',
          doi: '10.1000/example',
          publisher: 'Journal of Wastewater Systems',
          published_at: '2025-05-10T00:00:00.000Z',
          provenance_note: 'Imported from Crossref.',
          claim_count: 1,
          reviewed_claim_count: 1,
          applicability_scope: {},
          extracted_claims: [],
          tags: ['crossref'],
          created_at: '2026-04-14T12:00:00.000Z',
          updated_at: '2026-04-14T12:00:00.000Z',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.narrative).toContain(
      'The active explorer view matches 2 warehouse records',
    );
    expect(result.narrativeMetadata).toMatchObject({
      mode: 'stub',
      provider: 'internal',
      model: 'deterministic-summary',
      status: 'fallback',
      fallback_used: true,
    });
    expect(result.narrativeMetadata.error_message).toContain(
      'METREV_LLM_MODE "ollama" failed',
    );
  });
});
