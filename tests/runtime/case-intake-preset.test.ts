import { describe, expect, it } from 'vitest';

import {
  type ExternalEvidenceCatalogItemSummary,
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import {
  buildCaseInputFromFormValues,
  caseIntakePresets,
  focusedWastewaterMfcPreset,
  focusedWastewaterMecPreset,
  standaloneWastewaterBiosensorPreset,
  mfcIntegratedWastewaterBiosensorPreset,
  mecIntegratedWastewaterBiosensorPreset,
  validateAdvancedInputJson,
} from '../../apps/web-ui/src/lib/case-intake';

const focusedPresets = [
  focusedWastewaterMfcPreset,
  focusedWastewaterMecPreset,
  standaloneWastewaterBiosensorPreset,
  mfcIntegratedWastewaterBiosensorPreset,
  mecIntegratedWastewaterBiosensorPreset,
];

describe('case intake preset catalog', () => {
  it('registers only the five focused MFC/MEC/wastewater/biosensor templates', () => {
    expect(caseIntakePresets.map((preset) => preset.id)).toEqual(
      focusedPresets.map((preset) => preset.id),
    );
    expect(
      caseIntakePresets.every(
        (preset) => preset.expectedRecommendationIds.length === 0,
      ),
    ).toBe(true);
  });

  it.each(focusedPresets)(
    'builds an honest empty raw case input for $label without fabricated evidence or model outputs',
    (preset) => {
      const payload = buildCaseInputFromFormValues(preset.formValues, preset);

      expect(() => rawCaseInputSchema.parse(payload)).not.toThrow();
      expect(payload.evidence_records).toBeUndefined();
      expect(payload.mechanistic_model).toBeUndefined();
      expect(payload.missing_data?.length).toBeGreaterThan(0);
      expect(preset.sourceReference).toContain('no measured');
      expect(() => normalizeCaseInput(payload)).not.toThrow();
    },
  );

  it('lets visible inputs clear preset-backed evidence and list fields before submission', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        painPoints: '',
        preferredSuppliers: '',
        evidenceTitle: '',
        evidenceSummary: '',
      },
      focusedWastewaterMfcPreset,
    );

    expect(payload.technology_context?.current_pain_points).toEqual([]);
    expect(payload.supplier_context?.preferred_suppliers).toEqual([]);
    expect(payload.evidence_records).toBeUndefined();
    expect(payload.stack_blocks?.cathode_catalyst_support).toBeUndefined();
  });

  it('converts source-backed influent COD into the mechanistic SI input and retains the original unit', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        wastewaterQualityJson: JSON.stringify({
          cod_mg_cod_l: {
            value: 850,
            unit: 'mgCOD/L',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
            uncertainty: 10,
          },
          temperature_c: {
            value: 25,
            unit: '°C',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
            uncertainty: 0.2,
          },
          ph: {
            value: 6.9,
            unit: 'pH',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
          },
          conductivity_ms_per_cm: {
            value: 12,
            unit: 'mS/cm',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
            uncertainty: 0.5,
          },
          sampling_point: 'influent',
        }),
        evidenceTitle: '',
        evidenceSummary: '',
      },
      focusedWastewaterMfcPreset,
    );

    expect(
      payload.feed_and_operation?.water_quality?.cod_mg_cod_l,
    ).toMatchObject({
      value: 850,
      unit: 'mgCOD/L',
      source_ref: 'lab-sample:WW-001',
    });
    expect(
      payload.mechanistic_model?.operation?.influent_cod_kg_m3,
    ).toMatchObject({
      value: 0.85,
      unit: 'kgCOD/m3',
      source_kind: 'measured',
      source_ref: 'lab-sample:WW-001',
      original_value: 850,
      original_unit: 'mgCOD/L',
      normalization_rule_id: 'wastewater.cod.mg_cod_l_to_kg_cod_m3.v1',
      uncertainty: 0.01,
      uncertainty_unit: 'kgCOD/m3',
    });
    expect(payload.mechanistic_model?.operation?.temperature_k).toMatchObject({
      value: 298.15,
      unit: 'K',
      source_ref: 'lab-sample:WW-001',
      original_value: 25,
      original_unit: '°C',
      normalization_rule_id: 'wastewater.temperature.c_to_k.v1',
      uncertainty: 0.2,
      uncertainty_unit: 'K',
    });
    expect(payload.mechanistic_model?.operation?.influent_ph).toMatchObject({
      value: 6.9,
      unit: 'pH',
      source_ref: 'lab-sample:WW-001',
      original_value: 6.9,
      normalization_rule_id: 'wastewater.ph.identity.v1',
    });
    expect(
      payload.mechanistic_model?.operation?.electrolyte_conductivity_s_m,
    ).toMatchObject({
      value: 1.2,
      unit: 'S/m',
      source_ref: 'lab-sample:WW-001',
      original_value: 12,
      original_unit: 'mS/cm',
      normalization_rule_id: 'wastewater.conductivity.ms_cm_to_s_m.v1',
      uncertainty: 0.05,
      uncertainty_unit: 'S/m',
    });
  });

  it('merges wastewater-derived parameters into a partial mechanistic model draft', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        mechanisticModelJson: JSON.stringify({
          operation: {
            auxiliary_power_w: {
              value: 0.002,
              unit: 'W',
              source_kind: 'measured',
              source_ref: 'lab-sample:WW-001',
            },
          },
        }),
        wastewaterQualityJson: JSON.stringify({
          cod_mg_cod_l: {
            value: 850,
            unit: 'mgCOD/L',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
          },
          temperature_c: {
            value: 25,
            unit: '°C',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
          },
          ph: {
            value: 6.9,
            unit: 'pH',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
          },
          conductivity_ms_per_cm: {
            value: 12,
            unit: 'mS/cm',
            source_kind: 'measured',
            source_ref: 'lab-sample:WW-001',
          },
        }),
        evidenceTitle: '',
        evidenceSummary: '',
      },
      focusedWastewaterMfcPreset,
    );

    expect(payload.mechanistic_model?.operation).toEqual(
      expect.objectContaining({
        auxiliary_power_w: expect.objectContaining({ value: 0.002 }),
        influent_cod_kg_m3: expect.objectContaining({ value: 0.85 }),
        temperature_k: expect.objectContaining({ value: 298.15 }),
        influent_ph: expect.objectContaining({ value: 6.9 }),
        electrolyte_conductivity_s_m: expect.objectContaining({ value: 1.2 }),
      }),
    );
  });

  it('serializes the requested spatial fidelity and component parameter provenance', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        mechanisticModelJson: JSON.stringify({
          model_fidelity_id: 'biofilm-1d-direct-transfer-research-v1',
        }),
        componentModelParametersJson: JSON.stringify({
          operational_biology: {
            biofilm_thickness_m: {
              value: 0.0002,
              unit: 'm',
              source_kind: 'assumption',
              source_ref: 'design-note:biofilm-thickness',
            },
          },
        }),
      },
      focusedWastewaterMfcPreset,
    );

    expect(payload.mechanistic_model).toMatchObject({
      system_type: 'MFC',
      model_fidelity_id: 'biofilm-1d-direct-transfer-research-v1',
    });
    expect(payload.stack_blocks?.component_model_parameters).toMatchObject({
      operational_biology: {
        biofilm_thickness_m: {
          value: 0.0002,
          unit: 'm',
          source_kind: 'assumption',
          source_ref: 'design-note:biofilm-thickness',
        },
      },
    });
    const normalized = normalizeCaseInput(rawCaseInputSchema.parse(payload));
    expect(
      normalized.stack_blocks.component_model_parameters?.operational_biology
        ?.biofilm_thickness_m,
    ).toMatchObject({
      value: 0.0002,
      source_ref: 'design-note:biofilm-thickness',
    });
  });

  it('rejects malformed advanced JSON before the review-submit step', () => {
    expect(
      validateAdvancedInputJson({
        mechanisticModelJson: '{"system_type":',
        biosensorConfigurationJson: '',
        wastewaterQualityJson: '[]',
      }),
    ).toEqual({
      mechanisticModelJson: 'JSON is incomplete or invalid.',
      wastewaterQualityJson: 'Enter a JSON object.',
    });
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

    const visibleEvidenceTitle = 'Measured wastewater sample note';
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        evidenceType: 'internal_benchmark',
        evidenceTitle: visibleEvidenceTitle,
        evidenceSummary: 'Sample metadata recorded by the site laboratory.',
        evidenceStrength: 'moderate',
      },
      focusedWastewaterMfcPreset,
      [acceptedCatalogEvidence],
    );

    expect(payload.evidence_records).toHaveLength(2);
    expect(payload.evidence_records?.map((entry) => entry.title)).toEqual(
      expect.arrayContaining([
        visibleEvidenceTitle,
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
        ...focusedWastewaterMfcPreset.formValues,
        evidenceTitle: '',
        evidenceSummary: '',
      },
      focusedWastewaterMfcPreset,
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

  it('maps explicit parameter controls into raw intake state and audit-visible defaults or exclusions', () => {
    const payload = buildCaseInputFromFormValues(
      {
        ...focusedWastewaterMfcPreset.formValues,
        conductivity: '7.2',
        cathodeGasHandlingInterface:
          'Passive air cathode with intermittent fouling risk',
        electricalCurrentCollectionStrategy: 'Bolted graphite plate contacts',
        electricalSealingStrategy: '',
        electricalCorrosionProtectionLevel: 'high',
        membranePresence: '',
        operatingRegime: '',
        sensorsVoltageCurrentLogging: 'Continuous stack-level logging',
        substrateProfile:
          'High-COD fermentation sidestream with suspended solids spikes',
        parameterModes: {
          cathodeGasHandlingInterface: 'client',
          operatingRegime: 'exclude',
          membranePresence: 'system_default',
          sensorsVoltageCurrentLogging: 'client',
          substrateProfile: 'client',
          temperature: 'exclude',
          conductivity: 'client',
          electricalCurrentCollectionStrategy: 'client',
          electricalSealingStrategy: 'exclude',
          electricalCorrosionProtectionLevel: 'client',
        },
      },
      focusedWastewaterMfcPreset,
    );

    expect(payload.parameter_state).toEqual(
      expect.objectContaining({
        membrane_presence: expect.objectContaining({
          included: true,
          value_source: 'system_default',
          value: 'unknown',
        }),
        temperature_c: expect.objectContaining({
          included: false,
          value_source: 'unset',
        }),
        conductivity_ms_per_cm: expect.objectContaining({
          included: true,
          value_source: 'client',
          value: 7.2,
        }),
        operating_regime: expect.objectContaining({
          included: false,
          value_source: 'unset',
        }),
        substrate_profile: expect.objectContaining({
          included: true,
          value_source: 'client',
          value:
            'High-COD fermentation sidestream with suspended solids spikes',
        }),
        gas_handling_interface: expect.objectContaining({
          included: true,
          value_source: 'client',
          value: 'Passive air cathode with intermittent fouling risk',
        }),
        voltage_current_logging: expect.objectContaining({
          included: true,
          value_source: 'client',
          value: 'Continuous stack-level logging',
        }),
        current_collection_strategy: expect.objectContaining({
          included: true,
          value_source: 'client',
          value: 'Bolted graphite plate contacts',
        }),
        sealing_strategy: expect.objectContaining({
          included: false,
          value_source: 'unset',
        }),
        corrosion_protection_level: expect.objectContaining({
          included: true,
          value_source: 'client',
          value: 'high',
        }),
      }),
    );
    expect(payload.feed_and_operation?.temperature_c).toBeUndefined();
    expect(payload.feed_and_operation?.operating_regime).toBeUndefined();
    expect(payload.stack_blocks?.reactor_architecture?.membrane_presence).toBe(
      'unknown',
    );
    expect(
      payload.stack_blocks?.electrical_interconnect_and_sealing
        ?.sealing_strategy,
    ).toBeUndefined();
    expect(payload.defaults_used).toEqual(
      expect.arrayContaining(['membrane_presence=unknown (system default)']),
    );
    expect(payload.assumptions).toEqual(
      expect.arrayContaining([
        'Membrane presence: Absence of clear membrane information should not be collapsed into present or absent.',
        'Temperature was explicitly excluded from the current run input.',
        'Operating regime was explicitly excluded from the current run input.',
        'Sealing strategy was explicitly excluded from the current run input.',
      ]),
    );
  });
});
