import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  DecisionOutput,
  EvidenceDecisionContext,
  ResearchColumnDefinition,
  ResearchPaperMetadata,
} from '@metrev/domain-contracts';
import { rawCaseInputSchema } from '@metrev/domain-contracts';

import {
  generateCanonicalEvidenceMeasurementCandidates,
  generateEvidenceAssistantBrief,
  generateNarrative,
  generateReportConversationAnswer,
  generateStructuredResearchExtraction,
  type ReportConversationContextPackage,
} from '../../packages/llm-adapter/src/index';
import rawFixture from '../fixtures/raw-case-input.json';

const originalMode = process.env.METREV_LLM_MODE;
const originalModel = process.env.METREV_LLM_MODEL;
const originalBaseUrl = process.env.METREV_LLM_BASE_URL;
const originalApiKey = process.env.METREV_LLM_API_KEY;
const originalOllamaApiKey = process.env.OLLAMA_API_KEY;
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

function buildEvidenceDecisionContext(): EvidenceDecisionContext {
  return {
    case_id: 'CASE-001',
    technology_family: 'microbial_fuel_cell',
    system_type: 'MFC',
    primary_objective: 'wastewater_treatment',
    query: {
      system_type: 'MFC',
      application: 'wastewater_treatment',
      component_types: ['anode'],
      materials: ['carbon_felt'],
      metric_types: ['power_density'],
      limit: 12,
      decision_ready_only: true,
    },
    benchmark_ranges: [
      {
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_unit: 'W/m2',
        system_type: 'MFC',
        application: 'wastewater_treatment',
        component_type: 'anode',
        material: 'carbon_felt',
        publication_year: 2026,
        evidence_quality: 'high',
        record_count: 4,
        min_value: 0.8,
        p25_value: 0.9,
        median_value: 1,
        p75_value: 1.1,
        p90_value: 1.2,
        max_value: 1.3,
        mean_value: 1,
        confidence_coverage: 0.9,
      },
    ],
    matched_evidence: [
      {
        catalog_item_id: 'catalog-accepted-001',
        source_record_id: 'source-accepted-001',
        title: 'Accepted benchmark evidence',
        review_status: 'accepted',
        source_state: 'reviewed',
        access_status: 'green',
        doi: '10.5555/context-summary',
        source_url: 'https://example.test/context-summary',
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_value: 1,
        normalized_unit: 'W/m2',
        material: 'carbon_felt',
        component_type: 'anode',
        evidence_quality: 'high',
        confidence: 0.84,
        source_text_hash: 'hash-context-summary',
        source_locator: 'page:4:table:2',
        publication_year: 2026,
      },
    ],
    material_comparisons: [],
    operating_window_signals: [],
    failure_mode_signals: [],
    cost_signals: [],
    supplier_signals: [],
    regulatory_social_signals: [],
    uncertainty_summary: {
      confidence_level: 'medium',
      summary: 'Accepted benchmark context is available.',
      missing_dependencies: ['cathode comparison coverage'],
      excluded_evidence_reasons: ['supplier-only evidence excluded'],
    },
    excluded_evidence_summary: [],
    provenance_note: 'Fixture context for narrative prompt summary.',
    source_refs: ['catalog:catalog-accepted-001'],
    builder_version: 'evidence_decision_context_builder.v1',
  };
}

function buildReportConversationContext(
  selectedSection: string | null = null,
): ReportConversationContextPackage {
  return {
    report: {
      title: 'Wastewater retrofit report',
      subtitle: 'Deterministic client report',
      evaluation: {
        evaluation_id: 'eval-report-001',
        case_id: 'CASE-001',
        created_at: '2026-04-15T12:00:00.000Z',
        confidence_level: 'medium',
        technology_family: 'microbial_fuel_cell',
        primary_objective: 'wastewater_treatment',
        summary: 'Deterministic report summary.',
        narrative_available: true,
      },
      evaluation_lineage: {
        source_usages: [{ id: 'source-1' }],
        claim_usages: [{ id: 'claim-1' }],
        workspace_snapshots: [{ id: 'snapshot-1' }],
      },
      sections: {
        stack_diagnosis: {
          summary: 'The present stack is limited by separator fouling risk.',
          block_findings: [],
          main_weaknesses_or_blind_spots: [],
        },
        prioritized_improvements: [
          {
            recommendation_id: 'rec-1',
            linked_diagnosis: 'separator-fouling',
            rationale: 'separator fouling is constraining stable operation',
            expected_benefit:
              'reduced separator fouling risk during continuous operation',
            implementation_effort: 'medium',
            economic_plausibility: 'medium',
            risk_level: 'medium',
            maturity_level: 'medium',
            evidence_strength_summary: 'moderate',
            assumptions: [],
            missing_data_dependencies: [],
            confidence_level: 'medium',
          },
        ],
        impact_map: [],
        supplier_shortlist: [],
        phased_roadmap: [],
        assumptions_and_defaults_audit: {
          assumptions: [
            'Influent conductivity remains within the observed band.',
          ],
          defaults_used: ['Separator porosity estimated from a similar pilot.'],
          missing_data: ['Current-density sweep is missing.'],
        },
        confidence_and_uncertainty_summary: {
          confidence_level: 'medium',
          summary:
            'Confidence remains bounded by missing current-density and fouling verification data.',
          next_tests: [
            'Run a current-density sweep',
            'Inspect separator fouling after one operating cycle',
          ],
          provenance_notes: [],
        },
      },
    } as unknown as ReportConversationContextPackage['report'],
    normalizedCase: rawCaseInputSchema.parse(rawFixture) as never,
    decisionOutput: buildDecisionOutput(),
    grounding: {
      evaluation_id: 'eval-report-001',
      report_title: 'Wastewater retrofit report',
      selected_section: selectedSection,
      used_sections: [
        'stack_diagnosis',
        'prioritized_improvements',
        'confidence_and_uncertainty_summary',
      ],
      source_usage_count: 1,
      claim_usage_count: 1,
      snapshot_count: 1,
    },
    citations: [
      {
        citation_id: 'source:1',
        label: 'Source 1',
        section: 'stack_diagnosis',
        source_document_id: 'source-doc-1',
        claim_id: null,
        note: 'Separator benchmark source.',
      },
    ],
    selectedSection,
    recentTurns: [
      {
        actor: 'user',
        message: 'Explain the lead recommendation and confidence posture.',
        selectedSection,
      },
    ],
    boundedSummary: {
      normalizedCase: {
        caseId: 'CASE-001',
        technologyFamily: 'microbial_fuel_cell',
        architectureFamily: 'single_chamber',
        primaryObjective: 'wastewater_treatment',
        evidenceRefs: ['source-doc-1'],
      },
      decisionOutput: {
        stackDiagnosis: 'Baseline summary',
        topRecommendations: ['rec-1: Better operating range clarity.'],
        confidenceLevel: 'medium',
      },
      defaultsAndMissingData: {
        defaultsUsed: ['Separator porosity estimated from a similar pilot.'],
        missingData: ['Current-density sweep is missing.'],
        assumptions: [
          'Influent conductivity remains within the observed band.',
        ],
        nextTests: [
          'Run a current-density sweep',
          'Inspect separator fouling after one operating cycle',
        ],
      },
      simulation: {
        status: 'not_available',
        modelVersion: null,
        confidenceLevel: null,
        derivedObservationCount: 0,
        assumptionCount: 0,
      },
      suppliers: [],
      lineageCounts: {
        sourceUsageCount: 1,
        claimUsageCount: 1,
        snapshotCount: 1,
      },
    },
  };
}

function buildResearchColumn(): ResearchColumnDefinition {
  return {
    column_id: 'research_gaps',
    name: 'Research Gaps',
    group: 'limitations',
    type: 'llm_extracted',
    answer_structure: 'specified',
    instructions: 'Extract unresolved research gaps explicitly stated.',
    output_schema_key: 'generic_list',
    output_schema: {
      items: ['string'],
      evidence_span: 'string | null',
      confidence: 'low | medium | high',
    },
    visible: true,
    position: 12,
  };
}

function buildResearchPaper(): ResearchPaperMetadata {
  return {
    paper_id: 'paper-001',
    source_document_id: 'source-001',
    title: 'Pilot wastewater microbial fuel cell study',
    authors: [{ name: 'Jane Doe' }],
    year: 2025,
    doi: '10.1000/example',
    journal: 'Journal of MET Studies',
    publisher: 'METREV Press',
    source_type: 'openalex',
    source_url: 'https://example.org/paper-001',
    pdf_url: null,
    abstract_text:
      'The study identifies unresolved scaling questions and conductivity sensitivity.',
    citation_count: 12,
    metadata: {},
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

  if (originalApiKey === undefined) {
    delete process.env.METREV_LLM_API_KEY;
  } else {
    process.env.METREV_LLM_API_KEY = originalApiKey;
  }

  if (originalOllamaApiKey === undefined) {
    delete process.env.OLLAMA_API_KEY;
  } else {
    process.env.OLLAMA_API_KEY = originalOllamaApiKey;
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

  it('adds a bearer token for authenticated Ollama-compatible endpoints', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'gemma3:4b';
    process.env.METREV_LLM_BASE_URL = 'https://ollama.com/v1';
    process.env.METREV_LLM_API_KEY = 'test-api-key';
    process.env.METREV_LLM_TIMEOUT_MS = '45000';
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Authenticated Ollama narrative.',
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
      'https://ollama.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-api-key',
        }),
      }),
    );
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 45000);
    expect(result.narrative).toBe('Authenticated Ollama narrative.');
    setTimeoutSpy.mockRestore();
  });

  it('passes a bounded evidence decision context summary to case narrative prompts', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'llama3.1';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Context-aware Ollama narrative.',
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
      evidenceContext: buildEvidenceDecisionContext(),
    });
    const requestBody = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    ) as { messages: Array<{ role: string; content: string }> };
    const userPayload = JSON.parse(requestBody.messages[1].content) as {
      evidence_decision_context: unknown;
    };

    expect(result.narrative).toBe('Context-aware Ollama narrative.');
    expect(userPayload.evidence_decision_context).toEqual(
      expect.objectContaining({
        system_type: 'MFC',
        builder_version: 'evidence_decision_context_builder.v1',
        benchmark_range_count: 1,
        matched_evidence_count: 1,
        confidence_level: 'medium',
        source_refs: ['catalog:catalog-accepted-001'],
        missing_dependencies: ['cathode comparison coverage'],
        excluded_evidence_reasons: ['supplier-only evidence excluded'],
      }),
    );
  });

  it('retries canonical evidence extraction with strict JSON instructions', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'gpt-oss:20b';
    process.env.METREV_LLM_BASE_URL = 'https://ollama.com/v1';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '' } }] }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    measurements: [
                      {
                        field_key: 'power_density',
                        canonical_key: 'power_density_w_m2',
                        raw_value: '900',
                        raw_unit: 'mW/m2',
                        text_span: 'power density of 900 mW/m2',
                        source_locator: 'source:chunk:0',
                        confidence: 0.9,
                      },
                    ],
                  }),
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

    const candidates = await generateCanonicalEvidenceMeasurementCandidates({
      maxCandidates: 2,
      paper: {
        paper_id: 'paper-001',
        source_document_id: 'source-001',
        title: 'Validation paper',
        doi: null,
        year: 2026,
        source_type: 'manual_validation',
      },
      sourceText:
        'The microbial fuel cell reached a power density of 900 mW/m2.',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: expect.stringContaining(
          'Return exactly one JSON object with a measurements array',
        ),
      }),
    );
    expect(candidates).toEqual([
      expect.objectContaining({
        fieldKey: 'power_density',
        canonicalKey: 'power_density_w_m2',
      }),
    ]);
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

  it('returns a stubbed report answer without misclassifying uncertainty prompts as certainty requests', async () => {
    process.env.METREV_LLM_MODE = 'stub';

    const result = await generateReportConversationAnswer({
      message: 'Summarize the uncertainty posture for this report.',
      context: buildReportConversationContext(
        'confidence_and_uncertainty_summary',
      ),
    });

    expect(result.refusalReason).toBeNull();
    expect(result.narrative).toContain(
      'confidence_and_uncertainty_summary section',
    );
    expect(result.narrative).not.toContain(
      'cannot provide guarantees or supplier purchase certainty',
    );
    expect(result.narrativeMetadata).toMatchObject({
      mode: 'stub',
      provider: 'internal',
      status: 'generated',
      prompt_version: 'report-conversation-stub-v1',
    });
  });

  it('returns a no-answer posture for report conversations when disabled', async () => {
    process.env.METREV_LLM_MODE = 'disabled';

    const result = await generateReportConversationAnswer({
      message: 'Summarize the report uncertainty posture.',
      context: buildReportConversationContext(),
    });

    expect(result).toEqual({
      narrative: null,
      refusalReason: null,
      narrativeMetadata: expect.objectContaining({
        mode: 'disabled',
        provider: null,
        status: 'disabled',
        fallback_used: false,
        prompt_version: 'report-conversation-disabled-v1',
      }),
    });
  });

  it('uses the Ollama-compatible endpoint for report conversations when configured', async () => {
    process.env.METREV_LLM_MODE = 'ollama';
    process.env.METREV_LLM_MODEL = 'llama3.1';
    process.env.METREV_LLM_BASE_URL = 'http://127.0.0.1:11434/v1';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Local Ollama report answer.',
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

    const result = await generateReportConversationAnswer({
      message: 'Explain the lead recommendation in this report.',
      context: buildReportConversationContext(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result).toEqual({
      narrative: 'Local Ollama report answer.',
      refusalReason: null,
      narrativeMetadata: expect.objectContaining({
        mode: 'ollama',
        provider: 'ollama',
        model: 'llama3.1',
        status: 'generated',
        fallback_used: false,
        prompt_version: 'report-conversation-ollama-v1',
      }),
    });
  });

  it('falls back to the deterministic stub narrative when openai mode is requested', async () => {
    process.env.METREV_LLM_MODE = 'openai';
    process.env.METREV_LLM_MODEL = 'gpt-4o-mini';
    process.env.METREV_LLM_BASE_URL = 'https://example-openai.test/v1';
    process.env.METREV_LLM_API_KEY = 'test-key';

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const rawInput = rawCaseInputSchema.parse(rawFixture);
    const result = await generateNarrative({
      normalizedCase: rawInput,
      decisionOutput: buildDecisionOutput(),
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      narrative: expect.stringContaining('Case CASE-001'),
      narrativeMetadata: expect.objectContaining({
        mode: 'stub',
        provider: 'internal',
        model: 'deterministic-summary',
        status: 'fallback',
        fallback_used: true,
        prompt_version: 'stub-v1',
      }),
    });
    expect(result.narrativeMetadata.error_message).toContain(
      'Unsupported METREV_LLM_MODE "openai" requested',
    );
  });

  it('does not call a remote provider for structured extraction when openai mode is requested', async () => {
    process.env.METREV_LLM_MODE = 'openai';
    process.env.METREV_LLM_MODEL = 'gpt-4o-mini';
    process.env.METREV_LLM_BASE_URL = 'https://example-openai.test/v1';
    process.env.METREV_LLM_API_KEY = 'test-key';

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateStructuredResearchExtraction({
      column: buildResearchColumn(),
      paper: buildResearchPaper(),
      sourceText:
        'Scale-up durability remains unresolved. Conductivity sensitivity is also unresolved.',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
