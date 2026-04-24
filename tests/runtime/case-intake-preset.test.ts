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
  });
});
