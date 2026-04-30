import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  decisionOutputSchema,
  type ExternalEvidenceCatalogItemSummary,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { runCaseEvaluation } from '@metrev/rule-engine';

import {
  biogasSynergyGoldenCasePreset,
  buildCaseInputFromFormValues,
  caseIntakePresets,
  hydrogenRecoveryGoldenCasePreset,
  nitrogenRecoveryGoldenCasePreset,
  sensingGoldenCasePreset,
  wastewaterGoldenCasePreset,
} from '../../apps/web-ui/src/lib/case-intake';

const goldenCasePresets = [
  wastewaterGoldenCasePreset,
  nitrogenRecoveryGoldenCasePreset,
  hydrogenRecoveryGoldenCasePreset,
  sensingGoldenCasePreset,
  biogasSynergyGoldenCasePreset,
];

function sourceDomainCasePath(preset: (typeof goldenCasePresets)[number]) {
  const caseMetadata = (preset.payload.case_metadata ?? {}) as {
    source_domain_case?: string;
  };

  return caseMetadata.source_domain_case;
}

describe('case intake preset catalog', () => {
  it('registers the five validated presets for the intake UI', () => {
    expect(caseIntakePresets.map((preset) => preset.id)).toEqual(
      goldenCasePresets.map((preset) => preset.id),
    );
  });

  it('keeps each runtime preset tied to a canonical domain source path', () => {
    for (const preset of goldenCasePresets) {
      const sourcePath = sourceDomainCasePath(preset);

      expect(sourcePath).toBeTruthy();
      expect(preset.sourceReference).toContain(sourcePath!);
      expect(existsSync(resolve(process.cwd(), sourcePath!))).toBe(true);
    }
  });

  it.each(goldenCasePresets)(
    'builds a valid raw case input for $label that exercises the deterministic rule path',
    (preset) => {
      const payload = buildCaseInputFromFormValues(preset.formValues, preset);

      expect(() => rawCaseInputSchema.parse(payload)).not.toThrow();
      expect(payload.evidence_records).toHaveLength(1);

      const normalized = normalizeCaseInput(payload);
      const decisionOutput = decisionOutputSchema.parse(
        runCaseEvaluation(normalized),
      );
      const recommendationIds =
        decisionOutput.prioritized_improvement_options.map(
          (record) => record.recommendation_id,
        );

      expect(recommendationIds).toEqual(
        expect.arrayContaining(preset.expectedRecommendationIds),
      );
      expect(decisionOutput.impact_map.length).toBeGreaterThanOrEqual(3);
      expect(decisionOutput.phased_roadmap.length).toBeGreaterThan(0);
      expect(
        decisionOutput.confidence_and_uncertainty_summary.provenance_notes.join(
          ' ',
        ),
      ).toContain('typed evidence');
    },
  );

  it('keeps the nitrogen-recovery preset explicit about its missing-data boundary', () => {
    const payload = buildCaseInputFromFormValues(
      nitrogenRecoveryGoldenCasePreset.formValues,
      nitrogenRecoveryGoldenCasePreset,
    );

    expect(() => rawCaseInputSchema.parse(payload)).not.toThrow();
    expect(payload.primary_objective).toBe('nitrogen_recovery');
    expect(payload.stack_blocks?.membrane_or_separator?.fouling_risk).toBe(
      'high',
    );

    const normalized = normalizeCaseInput(payload);
    const decisionOutput = decisionOutputSchema.parse(
      runCaseEvaluation(normalized),
    );
    const recommendationIds =
      decisionOutput.prioritized_improvement_options.map(
        (record) => record.recommendation_id,
      );

    expect(recommendationIds).toEqual(
      expect.arrayContaining(
        nitrogenRecoveryGoldenCasePreset.expectedRecommendationIds,
      ),
    );
    expect(decisionOutput.assumptions_and_defaults_audit.missing_data).toEqual(
      expect.arrayContaining([
        'cathode_material_exact_family',
        'membrane_durability_validation',
        'gas_handling_detail',
      ]),
    );
  });

  it('lets visible inputs clear preset-backed evidence and list fields before submission', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...wastewaterGoldenCasePreset.formValues,
        painPoints: '',
        preferredSuppliers: '',
        evidenceTitle: '',
        evidenceSummary: '',
      },
      wastewaterGoldenCasePreset,
    );

    expect(payload.technology_context?.current_pain_points).toEqual([]);
    expect(payload.supplier_context?.preferred_suppliers).toEqual([]);
    expect(payload.evidence_records).toBeUndefined();
    expect(
      payload.stack_blocks?.cathode_catalyst_support
        ?.mass_transport_limitation_risk,
    ).toBe('high');
  });

  it('merges accepted catalog evidence into the outgoing typed-evidence bundle without replacing visible intake evidence', () => {
    const acceptedCatalogEvidence: ExternalEvidenceCatalogItemSummary = {
      id: 'catalog-item-accepted-001',
      title: 'Reviewed wastewater instrumentation benchmark',
      summary:
        'Accepted external evidence confirms instrumentation quality as a determinant for stable wastewater pilot diagnosis.',
      evidence_type: 'literature_evidence',
      strength_level: 'moderate',
      review_status: 'accepted',
      source_state: 'reviewed',
      source_type: 'crossref',
      source_category: 'scholarly_work',
      source_url: 'https://doi.org/10.1000/reviewed',
      doi: '10.1000/reviewed',
      publisher: 'Journal of Wastewater Systems',
      published_at: '2025-05-10T00:00:00.000Z',
      provenance_note:
        'Imported and accepted by an analyst before intake attachment.',
      claim_count: 0,
      reviewed_claim_count: 0,
      applicability_scope: {
        import_query: 'wastewater instrumentation',
      },
      extracted_claims: [],
      tags: ['external-ingestion', 'crossref'],
      metadata_quality: {
        score: 0.78,
        level: 'high',
        present_fields: ['doi', 'review_status'],
        missing_fields: [],
        categories: {},
        notes: ['Accepted summary keeps metadata posture visible in intake.'],
      },
      veracity_score: {
        score: 0.74,
        level: 'medium',
        components: {
          source_rigor: 0.8,
          metadata_completeness: 0.78,
          measurement_quality: 0.68,
          extraction_method: 0.75,
          trace_quality: 0.82,
          normalization_support: 0.4,
          review_status: 1,
          relevance: 0.79,
          recency_context_fit: 0.71,
          corroboration_conflict: 0.69,
        },
        confidence_penalties: [],
        notes: ['Accepted summary still carries trace-quality limits.'],
      },
      created_at: '2026-04-14T12:00:00.000Z',
      updated_at: '2026-04-14T12:00:00.000Z',
    };

    const payload = buildCaseInputFromFormValues(
      wastewaterGoldenCasePreset.formValues,
      wastewaterGoldenCasePreset,
      [acceptedCatalogEvidence],
    );

    expect(payload.evidence_records).toHaveLength(2);
    expect(payload.evidence_records?.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        wastewaterGoldenCasePreset.formValues.evidenceTitle,
        acceptedCatalogEvidence.title,
      ]),
    );
    expect(payload.evidence_records?.[1]?.evidence_id).toBe(
      'catalog:catalog-item-accepted-001',
    );
    expect(payload.evidence_records?.[1]?.tags).toEqual(
      expect.arrayContaining(['reviewed-catalog', 'source:crossref']),
    );
    expect(payload.evidence_records?.[1]).toEqual(
      expect.objectContaining({
        catalog_item_id: acceptedCatalogEvidence.id,
        review_status: acceptedCatalogEvidence.review_status,
        source_state: acceptedCatalogEvidence.source_state,
        metadata_quality: expect.objectContaining({
          level: 'high',
        }),
        veracity_score: expect.objectContaining({
          level: 'medium',
        }),
      }),
    );
  });

  it('appends research-pack evidence, assumptions, and missing-data flags into the outgoing intake payload', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...wastewaterGoldenCasePreset.formValues,
        evidenceTitle: '',
        evidenceSummary: '',
      },
      wastewaterGoldenCasePreset,
      [],
      {
        pack_id: 'pack-001',
        review_id: 'review-001',
        evidence_records: [
          {
            evidence_id: 'research:review-001:paper-001',
            evidence_type: 'literature_evidence',
            title: 'Research pack paper',
            summary: 'Validated extraction result for wastewater MFC scale-up.',
            applicability_scope: {
              review_id: 'review-001',
              source_document_id: 'source-001',
            },
            strength_level: 'moderate',
            provenance_note: 'Built from a research evidence pack.',
            quantitative_metrics: {},
            operating_conditions: {},
            block_mapping: [],
            limitations: [],
            contradiction_notes: [],
            tags: ['research-review'],
          },
        ],
        measured_metric_candidates: {
          power_density_w_m2: 0.95,
        },
        missing_data: ['pilot_duration'],
        assumptions: [
          'Literature-derived values still require site fit review.',
        ],
      },
    );

    expect(payload.evidence_records).toHaveLength(1);
    expect(payload.evidence_records?.[0]?.evidence_id).toBe(
      'research:review-001:paper-001',
    );
    expect(payload.evidence_records?.[0]?.tags).toEqual(
      expect.arrayContaining(['research-pack']),
    );
    expect(payload.assumptions).toEqual(
      expect.arrayContaining([
        'Literature-derived values still require site fit review.',
      ]),
    );
    expect(payload.missing_data).toEqual(
      expect.arrayContaining(['pilot_duration']),
    );
  });
});
