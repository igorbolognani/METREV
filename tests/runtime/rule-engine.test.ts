import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  decisionOutputSchema,
  evidenceDecisionContextSchema,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';

function buildAcceptedEvidenceInput(evidenceId: string) {
  return {
    evidence_id: evidenceId,
    evidence_type: 'literature_evidence' as const,
    title: `Reviewed benchmark evidence ${evidenceId}`,
    summary:
      'A reviewed source with complete metadata supports deterministic benchmarking.',
    applicability_scope: {
      source_document_id: `${evidenceId}-source-document`,
    },
    strength_level: 'strong' as const,
    provenance_note: 'Accepted catalog evidence with complete metadata.',
    review_status: 'accepted' as const,
    metadata_quality: {
      score: 0.9,
      level: 'high' as const,
      present_fields: ['source_document_id', 'doi', 'license'],
      missing_fields: [],
      categories: {},
      notes: [],
    },
    veracity_score: {
      score: 0.84,
      level: 'high' as const,
      components: {
        source_rigor: 0.82,
        metadata_completeness: 0.9,
        measurement_quality: 0.72,
        extraction_method: 0.82,
        trace_quality: 0.88,
        normalization_support: 0.58,
        review_status: 1,
        relevance: 0.84,
        recency_context_fit: 0.76,
        corroboration_conflict: 0.8,
      },
      confidence_penalties: [],
      notes: [],
    },
  };
}

function buildHighConfidenceNormalizedCase() {
  const normalized = normalizeCaseInput(
    rawCaseInputSchema.parse({
      ...fixture,
      case_id: 'CASE-RULE-EVIDENCE-HIGH-CONFIDENCE-001',
      evidence_records: [
        buildAcceptedEvidenceInput('catalog:accepted-evidence-001'),
        buildAcceptedEvidenceInput('catalog:accepted-evidence-002'),
        buildAcceptedEvidenceInput('catalog:accepted-evidence-003'),
      ],
    }),
  );
  const boosted = structuredClone(normalized);

  boosted.missing_data = [];
  boosted.defaults_used = [];
  boosted.stack_blocks.sensors_and_analytics.data_quality = 'high';
  boosted.stack_blocks.operational_biology.biofilm_maturity = 'mature';
  boosted.cross_cutting_layers.evidence_and_provenance.supplier_claim_fraction =
    'none';

  return boosted;
}

describe('rule engine', () => {
  it('produces a structured decision output for a normalized case', () => {
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const decisionOutput = runCaseEvaluation(normalized);

    expect(decisionOutputSchema.parse(decisionOutput)).toEqual(decisionOutput);
    expect(
      decisionOutput.prioritized_improvement_options.length,
    ).toBeGreaterThan(0);
    expect(
      decisionOutput.confidence_and_uncertainty_summary.next_tests.length,
    ).toBeGreaterThan(0);
  });

  it('down-weights confidence when evidence carries trace and review penalties', () => {
    const cleanNormalized = normalizeCaseInput(
      rawCaseInputSchema.parse({
        ...fixture,
        case_id: 'CASE-RULE-EVIDENCE-CLEAN-001',
        evidence_records: [
          {
            evidence_id: 'catalog:clean-evidence-001',
            evidence_type: 'literature_evidence',
            title: 'Reviewed benchmark evidence',
            summary:
              'A reviewed source with complete metadata supports deterministic benchmarking.',
            applicability_scope: {
              source_document_id: 'source-doc-clean-001',
            },
            strength_level: 'strong',
            provenance_note:
              'Accepted catalog evidence with complete metadata.',
            review_status: 'accepted',
            metadata_quality: {
              score: 0.9,
              level: 'high',
              present_fields: ['source_document_id', 'doi', 'license'],
              missing_fields: [],
              categories: {},
              notes: [],
            },
            veracity_score: {
              score: 0.84,
              level: 'high',
              components: {
                source_rigor: 0.82,
                metadata_completeness: 0.9,
                measurement_quality: 0.72,
                extraction_method: 0.82,
                trace_quality: 0.88,
                normalization_support: 0.58,
                review_status: 1,
                relevance: 0.84,
                recency_context_fit: 0.76,
                corroboration_conflict: 0.8,
              },
              confidence_penalties: [],
              notes: [],
            },
          },
        ],
      }),
    );
    const penalizedNormalized = normalizeCaseInput(
      rawCaseInputSchema.parse({
        ...fixture,
        case_id: 'CASE-RULE-EVIDENCE-PENALIZED-001',
        evidence_records: [
          {
            evidence_id: 'catalog:penalized-evidence-001',
            evidence_type: 'literature_evidence',
            title: 'Pending benchmark evidence',
            summary:
              'A relevant source is attached, but it still lacks metadata and review closure.',
            applicability_scope: {
              source_document_id: 'source-doc-penalized-001',
            },
            strength_level: 'strong',
            provenance_note:
              'Pending catalog evidence with incomplete metadata.',
            review_status: 'pending',
            metadata_quality: {
              score: 0.32,
              level: 'low',
              present_fields: ['source_document_id'],
              missing_fields: ['doi', 'license', 'page_count'],
              categories: {},
              notes: ['Artifact metadata is incomplete.'],
            },
            veracity_score: {
              score: 0.46,
              level: 'medium',
              components: {
                source_rigor: 0.78,
                metadata_completeness: 0.32,
                measurement_quality: 0.6,
                extraction_method: 0.74,
                trace_quality: 0.38,
                normalization_support: 0.22,
                review_status: 0.3,
                relevance: 0.82,
                recency_context_fit: 0.72,
                corroboration_conflict: 0.5,
              },
              confidence_penalties: [
                'pending_or_unaccepted_review',
                'low_metadata_quality',
              ],
              notes: [
                'Needs review and better metadata before high-confidence use.',
              ],
            },
          },
        ],
      }),
    );

    const cleanDecision = runCaseEvaluation(cleanNormalized);
    const penalizedDecision = runCaseEvaluation(penalizedNormalized);
    const confidenceRank = {
      low: 0,
      medium: 1,
      high: 2,
    } as const;

    expect(
      confidenceRank[
        penalizedDecision.confidence_and_uncertainty_summary.confidence_level
      ],
    ).toBeLessThanOrEqual(
      confidenceRank[
        cleanDecision.confidence_and_uncertainty_summary.confidence_level
      ],
    );
    expect(
      penalizedDecision.confidence_and_uncertainty_summary.provenance_notes.join(
        ' ',
      ),
    ).toContain('metadata or veracity penalties');
    expect(penalizedDecision.current_stack_diagnosis.summary).toContain(
      'single_source_with_trace_penalties',
    );
  });

  it('surfaces missing benchmark coverage from the evidence decision context', () => {
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const evidenceContext = evidenceDecisionContextSchema.parse({
      case_id: normalized.case_id,
      technology_family: normalized.technology_family,
      system_type: 'MFC',
      primary_objective: normalized.primary_objective,
      query: {
        system_type: 'MFC',
        application: normalized.primary_objective,
        component_types: ['anode'],
        materials: ['carbon_felt'],
        metric_types: ['power_density'],
        limit: 12,
        decision_ready_only: true,
      },
      benchmark_ranges: [],
      matched_evidence: [],
      material_comparisons: [],
      operating_window_signals: [],
      failure_mode_signals: [],
      cost_signals: [],
      supplier_signals: [],
      regulatory_social_signals: [],
      uncertainty_summary: {
        confidence_level: 'low',
        summary:
          'No decision-ready benchmark aggregates matched the current case filters.',
        missing_dependencies: ['canonical decision-ready benchmark aggregates'],
        excluded_evidence_reasons: [
          'Pending, rejected, supplier-only, or non-decision-ready evidence was excluded from this decision context.',
        ],
      },
      excluded_evidence_summary: [],
      provenance_note:
        'EvidenceDecisionContext was built from decision-ready benchmark aggregates and accepted catalog evidence only.',
      source_refs: [],
      builder_version: 'initial_benchmark_slice_v1',
    });

    const decisionOutput = runCaseEvaluation(normalized, {
      evidenceContext,
    });

    expect(
      decisionOutput.confidence_and_uncertainty_summary.provenance_notes.join(
        ' ',
      ),
    ).toContain('found no decision-ready benchmark ranges');
    expect(
      decisionOutput.confidence_and_uncertainty_summary.next_tests,
    ).toContain(
      'Expand decision-ready benchmark coverage for comparable materials, components, and operating windows before committing to a benchmark-backed redesign.',
    );
  });

  it('uses admissible benchmark context to add a material recommendation and score it', () => {
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const evidenceContext = evidenceDecisionContextSchema.parse({
      case_id: normalized.case_id,
      technology_family: normalized.technology_family,
      system_type: 'MFC',
      primary_objective: normalized.primary_objective,
      query: {
        system_type: 'MFC',
        application: normalized.primary_objective,
        component_types: ['anode'],
        materials: ['carbon_felt', 'carbon_cloth'],
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
          application: normalized.primary_objective,
          component_type: 'anode',
          material: 'carbon_felt',
          evidence_quality: 'high',
          record_count: 4,
          median_value: 1,
        },
        {
          canonical_key: 'power_density_w_m2',
          metric_type: 'power_density',
          normalized_unit: 'W/m2',
          system_type: 'MFC',
          application: normalized.primary_objective,
          component_type: 'anode',
          material: 'carbon_cloth',
          evidence_quality: 'high',
          record_count: 3,
          median_value: 1.25,
        },
      ],
      matched_evidence: [
        {
          catalog_item_id: 'benchmark-carbon-cloth-001',
          source_record_id: 'source-benchmark-carbon-cloth-001',
          title: 'Carbon cloth anode benchmark',
          canonical_key: 'power_density_w_m2',
          metric_type: 'power_density',
          normalized_value: 1.25,
          normalized_unit: 'W/m2',
          material: 'carbon_cloth',
          component_type: 'anode',
          confidence: 0.82,
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
        summary: 'Benchmark context has admissible comparable records.',
        missing_dependencies: [],
        excluded_evidence_reasons: [],
      },
      excluded_evidence_summary: [],
      provenance_note: 'Fixture benchmark context.',
      source_refs: ['catalog:benchmark-carbon-cloth-001'],
      builder_version: 'evidence_decision_context_builder.v1',
    });

    const decisionOutput = runCaseEvaluation(normalized, { evidenceContext });
    const evidenceRecommendation =
      decisionOutput.prioritized_improvement_options.find((recommendation) =>
        recommendation.recommendation_id.includes('carbon_cloth'),
      );

    expect(evidenceRecommendation).toEqual(
      expect.objectContaining({
        linked_diagnosis: 'Benchmark-backed material optimization',
        evidence_refs: ['catalog:benchmark-carbon-cloth-001'],
        priority_score: expect.any(Number),
        rule_refs: [
          'evidence_decision_context.material_alternative_recommendation',
        ],
      }),
    );
    expect(evidenceRecommendation?.expected_benefit).toContain('25%');
  });

  it('does not let weak benchmark context influence material recommendations', () => {
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(fixture));
    const evidenceContext = evidenceDecisionContextSchema.parse({
      case_id: normalized.case_id,
      technology_family: normalized.technology_family,
      system_type: 'MFC',
      primary_objective: normalized.primary_objective,
      query: {
        system_type: 'MFC',
        application: normalized.primary_objective,
        component_types: ['anode'],
        materials: ['carbon_felt', 'carbon_cloth'],
        metric_types: ['power_density'],
        limit: 12,
        decision_ready_only: true,
      },
      benchmark_ranges: [
        {
          canonical_key: 'power_density_w_m2',
          metric_type: 'power_density',
          normalized_unit: 'W/m2',
          component_type: 'anode',
          material: 'carbon_felt',
          evidence_quality: 'high',
          record_count: 4,
          median_value: 1,
        },
        {
          canonical_key: 'power_density_w_m2',
          metric_type: 'power_density',
          normalized_unit: 'W/m2',
          component_type: 'anode',
          material: 'carbon_cloth',
          evidence_quality: 'low',
          record_count: 2,
          median_value: 1.5,
        },
      ],
      matched_evidence: [],
      material_comparisons: [],
      operating_window_signals: [],
      failure_mode_signals: [],
      cost_signals: [],
      supplier_signals: [],
      regulatory_social_signals: [],
      uncertainty_summary: {
        confidence_level: 'low',
        summary: 'Benchmark context is sparse and weak.',
        missing_dependencies: ['replicated accepted records'],
        excluded_evidence_reasons: ['low evidence quality'],
      },
      excluded_evidence_summary: [],
      provenance_note: 'Fixture weak benchmark context.',
      source_refs: [],
      builder_version: 'evidence_decision_context_builder.v1',
    });

    const decisionOutput = runCaseEvaluation(normalized, { evidenceContext });

    expect(
      decisionOutput.prioritized_improvement_options.some((recommendation) =>
        recommendation.recommendation_id.includes('carbon_cloth'),
      ),
    ).toBe(false);
  });

  it('reduces confidence when low-confidence benchmark context still has unresolved evidence gaps', () => {
    const normalized = buildHighConfidenceNormalizedCase();
    const baselineDecision = runCaseEvaluation(normalized);
    const evidenceContext = evidenceDecisionContextSchema.parse({
      case_id: normalized.case_id,
      technology_family: normalized.technology_family,
      system_type: 'MFC',
      primary_objective: normalized.primary_objective,
      query: {
        system_type: 'MFC',
        application: normalized.primary_objective,
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
          application: normalized.primary_objective,
          component_type: 'anode',
          material: 'carbon_felt',
          evidence_quality: 'medium',
          record_count: 3,
          median_value: 1,
        },
      ],
      matched_evidence: [
        {
          catalog_item_id: 'benchmark-carbon-felt-001',
          source_record_id: 'source-benchmark-carbon-felt-001',
          title: 'Carbon felt benchmark coverage is still partial',
          canonical_key: 'power_density_w_m2',
          metric_type: 'power_density',
          normalized_value: 1,
          normalized_unit: 'W/m2',
          material: 'carbon_felt',
          component_type: 'anode',
          confidence: 0.64,
        },
      ],
      material_comparisons: [],
      operating_window_signals: [],
      failure_mode_signals: [],
      cost_signals: [],
      supplier_signals: [],
      regulatory_social_signals: [],
      uncertainty_summary: {
        confidence_level: 'low',
        summary:
          'Benchmark coverage is partial and still excludes unresolved evidence classes.',
        missing_dependencies: ['replicated cathode coverage'],
        excluded_evidence_reasons: [
          'supplier-only claims remain uncorroborated',
        ],
      },
      excluded_evidence_summary: [],
      provenance_note: 'Fixture partial benchmark context.',
      source_refs: ['catalog:benchmark-carbon-felt-001'],
      builder_version: 'evidence_decision_context_builder.v1',
    });

    const decisionOutput = runCaseEvaluation(normalized, { evidenceContext });

    expect(
      baselineDecision.confidence_and_uncertainty_summary.confidence_level,
    ).toBe('high');
    expect(
      decisionOutput.confidence_and_uncertainty_summary.confidence_level,
    ).toBe('medium');
    expect(
      decisionOutput.confidence_and_uncertainty_summary.provenance_notes.join(
        ' ',
      ),
    ).toContain(
      'Evidence decision context remained low-confidence due to replicated cathode coverage; supplier-only claims remain uncorroborated.',
    );
    expect(
      decisionOutput.confidence_and_uncertainty_summary.next_tests,
    ).toContain(
      'Close evidence-context gaps before treating benchmark deltas as decision-grade: replicated cathode coverage; supplier-only claims remain uncorroborated.',
    );
  });
});
