import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import {
  decisionOutputSchema,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';

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
});
