import type {
  ExternalEvidenceCatalogItemSummary,
  RawCaseInput,
} from '@metrev/domain-contracts';

type EvidenceRecordInput = NonNullable<
  RawCaseInput['evidence_records']
>[number];

export interface CaseIntakeFormValues {
  caseId: string;
  technologyFamily: string;
  architectureFamily: string;
  primaryObjective: string;
  deploymentContext: string;
  painPoints: string;
  influentType: string;
  temperature: string;
  ph: string;
  preferredSuppliers: string;
  evidenceType: EvidenceRecordInput['evidence_type'];
  evidenceTitle: string;
  evidenceSummary: string;
  evidenceStrength: EvidenceRecordInput['strength_level'];
}

export interface CaseIntakePreset {
  id: string;
  label: string;
  description: string;
  sourceReference: string;
  focusAreas: string[];
  expectedRecommendationIds: string[];
  formValues: CaseIntakeFormValues;
  payload: RawCaseInput;
}

export const defaultCaseIntakeFormValues: CaseIntakeFormValues = {
  caseId: '',
  technologyFamily: 'microbial_fuel_cell',
  architectureFamily: '',
  primaryObjective: 'wastewater_treatment',
  deploymentContext: '',
  painPoints: '',
  influentType: '',
  temperature: '',
  ph: '',
  preferredSuppliers: '',
  evidenceType: 'internal_benchmark',
  evidenceTitle: '',
  evidenceSummary: '',
  evidenceStrength: 'moderate',
};

const runtimeIntakeProvenanceNote =
  'Captured directly during runtime intake and preserved as typed evidence.';

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function splitCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function buildEvidenceRecords(
  values: CaseIntakeFormValues,
  preset?: CaseIntakePreset,
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[] = [],
): RawCaseInput['evidence_records'] {
  const catalogEvidence = selectedCatalogEvidence.map((item) => ({
    evidence_id: `catalog:${item.id}`,
    evidence_type: item.evidence_type,
    title: item.title,
    summary: item.summary,
    applicability_scope: item.applicability_scope,
    strength_level: item.strength_level,
    provenance_note: `${item.provenance_note} Reviewed and accepted into the external evidence catalog before intake selection.`,
    quantitative_metrics: {},
    operating_conditions: {},
    block_mapping: [],
    limitations: [],
    contradiction_notes: [],
    benchmark_context: `${item.source_type}${item.publisher ? ` via ${item.publisher}` : ''}`,
    tags: dedupeStrings([
      ...item.tags,
      'reviewed-catalog',
      `source:${item.source_type}`,
    ]),
  }));

  if (!values.evidenceTitle.trim() || !values.evidenceSummary.trim()) {
    return catalogEvidence.length > 0 ? catalogEvidence : undefined;
  }

  const presetEvidence = preset?.payload.evidence_records?.[0];

  return [
    {
      evidence_type: values.evidenceType,
      title: values.evidenceTitle.trim(),
      summary: values.evidenceSummary.trim(),
      applicability_scope: {
        architecture_family: values.architectureFamily.trim() || 'unspecified',
        primary_objective: values.primaryObjective,
        deployment_context: values.deploymentContext.trim() || undefined,
      },
      strength_level: values.evidenceStrength,
      provenance_note:
        presetEvidence?.provenance_note ?? runtimeIntakeProvenanceNote,
      quantitative_metrics: presetEvidence?.quantitative_metrics ?? {},
      operating_conditions: presetEvidence?.operating_conditions ?? {},
      block_mapping: presetEvidence?.block_mapping ?? [],
      limitations: presetEvidence?.limitations ?? [],
      contradiction_notes: presetEvidence?.contradiction_notes ?? [],
      supplier_name: presetEvidence?.supplier_name,
      benchmark_context: presetEvidence?.benchmark_context,
      tags: dedupeStrings([...(presetEvidence?.tags ?? []), 'runtime-intake']),
    },
    ...catalogEvidence,
  ];
}

export function buildCaseInputFromFormValues(
  values: CaseIntakeFormValues,
  preset?: CaseIntakePreset,
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[] = [],
): RawCaseInput {
  const preferredSuppliers = splitCommaSeparated(values.preferredSuppliers);
  const painPoints = splitCommaSeparated(values.painPoints);
  const presetPayload = preset?.payload;

  return {
    ...presetPayload,
    case_id: values.caseId.trim() || undefined,
    technology_family: values.technologyFamily,
    architecture_family: values.architectureFamily.trim() || undefined,
    primary_objective: values.primaryObjective,
    business_context: {
      ...presetPayload?.business_context,
      deployment_context: values.deploymentContext.trim() || undefined,
    },
    technology_context: {
      ...presetPayload?.technology_context,
      current_pain_points: painPoints,
    },
    feed_and_operation: {
      ...presetPayload?.feed_and_operation,
      influent_type: values.influentType.trim() || undefined,
      temperature_c: parseOptionalNumber(values.temperature),
      pH: parseOptionalNumber(values.ph),
    },
    supplier_context: {
      ...presetPayload?.supplier_context,
      current_suppliers:
        presetPayload?.supplier_context?.current_suppliers ?? [],
      preferred_suppliers: preferredSuppliers,
      excluded_suppliers:
        presetPayload?.supplier_context?.excluded_suppliers ?? [],
    },
    evidence_records: buildEvidenceRecords(
      values,
      preset,
      selectedCatalogEvidence,
    ),
  };
}

const wastewaterEvidenceTitle = 'Wastewater pilot baseline 2026-Q1';
const wastewaterEvidenceSummary =
  'Four-week baseline showed unstable startup, low power density, elevated internal resistance, and weak observability during sidestream treatment.';

const nitrogenRecoveryEvidenceTitle =
  'Digester sidestream nitrogen recovery concept review';
const nitrogenRecoveryEvidenceSummary =
  'Concept review shows membrane durability risk, unresolved gas handling details, and product-quality validation needs before scale-up decisions.';

export const wastewaterGoldenCasePreset: CaseIntakePreset = {
  id: 'wastewater-treatment-golden-case',
  label: 'Autofill wastewater golden case',
  description:
    'Loads a wastewater-treatment pilot retrofit scenario with structured stack details, measured metrics, supplier context, and typed evidence so the minimal intake form can still exercise the richer deterministic path.',
  sourceReference:
    'Runtime golden case derived from the validated wastewater-treatment demo scenario.',
  focusAreas: [
    'observability uplift',
    'cathode bottleneck review',
    'fouling risk control',
  ],
  expectedRecommendationIds: ['imp_001', 'imp_002', 'imp_003', 'imp_004'],
  formValues: {
    caseId: 'WWT-GOLDEN-001',
    technologyFamily: 'microbial_fuel_cell',
    architectureFamily: 'single_chamber_air_cathode',
    primaryObjective: 'wastewater_treatment',
    deploymentContext:
      'industrial pilot retrofit at the equalization-tank sidestream',
    painPoints:
      'weak monitoring, unstable startup, high internal resistance, cathode flooding risk',
    influentType: 'high-strength food-processing wastewater',
    temperature: '29',
    ph: '7.1',
    preferredSuppliers: 'Econic, OpenCell Systems, BioVolt Process',
    evidenceType: 'internal_benchmark',
    evidenceTitle: wastewaterEvidenceTitle,
    evidenceSummary: wastewaterEvidenceSummary,
    evidenceStrength: 'strong',
  },
  payload: {
    case_id: 'WWT-GOLDEN-001',
    case_metadata: {
      preset_id: 'wastewater-treatment-golden-case',
      preset_note:
        'Validated golden-case preset used to exercise deterministic wastewater-treatment evaluation.',
    },
    technology_family: 'microbial_fuel_cell',
    architecture_family: 'single_chamber_air_cathode',
    primary_objective: 'wastewater_treatment',
    business_context: {
      decision_horizon: '12-month retrofit validation window',
      deployment_context:
        'industrial pilot retrofit at the equalization-tank sidestream',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'high',
      retrofit_priority: 'high',
      serviceability_priority: 'high',
      priorities: [
        'COD removal stability',
        'operator simplicity',
        'audit-ready monitoring',
      ],
      hard_constraints: [
        'retrofit must fit the current skid envelope',
        'no chlorinated catalyst handling on site',
      ],
      local_energy_cost_note:
        'Grid electricity remains expensive during peak tariff windows.',
    },
    technology_context: {
      current_trl: 'pilot',
      scale_context: 'pilot',
      current_pain_points: [
        'weak monitoring',
        'unstable startup',
        'high internal resistance',
        'cathode flooding risk',
      ],
      performance_claims_under_review: [
        '>70% COD removal without membrane retrofit',
        'stable low-maintenance cathode operation',
      ],
      target_maturity_window: '6-9 months to go/no-go decision',
      membrane_presence: 'absent',
    },
    feed_and_operation: {
      influent_type: 'high-strength food-processing wastewater',
      substrate_profile:
        'readily biodegradable organics with intermittent solids carryover',
      influent_cod_mg_per_l: 2200,
      pH: 7.1,
      temperature_c: 29,
      conductivity_ms_per_cm: 7.2,
      hydraulic_retention_time_h: 18,
      salinity_or_conductivity_context:
        'Conductivity is workable for the current MFC skid, but seasonal swings remain.',
      operating_regime: 'continuous recirculation with batch cleaning stopouts',
    },
    stack_blocks: {
      reactor_architecture: {
        architecture_type: 'single_chamber_air_cathode',
        solids_tolerance: 'medium',
        serviceability_level: 'medium',
        membrane_presence: 'absent',
      },
      anode_biofilm_support: {
        material_family: 'carbon felt',
        surface_treatment: 'heat-treated',
        biofilm_support_level: 'medium',
      },
      cathode_catalyst_support: {
        reaction_target: 'ORR',
        catalyst_family: 'activated carbon',
        mass_transport_limitation_risk: 'high',
        gas_handling_interface: 'passive air cathode with intermittent fouling',
      },
      membrane_or_separator: {
        type: 'ceramic spacer',
        fouling_risk: 'high',
        crossover_control_level: 'low',
      },
      electrical_interconnect_and_sealing: {
        current_collection_strategy: 'stainless steel mesh',
        sealing_strategy: 'manual gasket compression',
        corrosion_protection_level: 'medium',
      },
      balance_of_plant: {
        flow_control: 'manual recirculation balancing',
        gas_handling_readiness: 'low',
        dosing_capability: 'manual',
        bop_summary:
          'recirculation loop with manual nutrient and antifoam dosing',
      },
      sensors_and_analytics: {
        data_quality: 'low',
        voltage_current_logging: 'manual spot checks',
        water_quality_coverage: 'weekly COD only',
      },
      operational_biology: {
        biofilm_maturity: 'early',
        contamination_risk: 'medium',
        inoculum_source: 'anaerobic digester sludge',
        startup_protocol: 'single-pass startup with limited acclimation',
      },
    },
    measured_metrics: {
      current_density_a_m2: 55,
      power_density_w_m2: 18,
      internal_resistance_ohm: 62,
      cod_removal_pct: 54,
    },
    evidence_refs: ['internal:wwt-pilot-baseline-2026q1'],
    evidence_records: [
      {
        evidence_type: 'internal_benchmark',
        title: wastewaterEvidenceTitle,
        summary: wastewaterEvidenceSummary,
        applicability_scope: {
          architecture_family: 'single_chamber_air_cathode',
          primary_objective: 'wastewater_treatment',
          deployment_context:
            'industrial pilot retrofit at the equalization-tank sidestream',
        },
        strength_level: 'strong',
        provenance_note:
          'Captured from the audited internal wastewater pilot baseline and attached as typed evidence for the deterministic intake preset.',
        quantitative_metrics: {
          current_density_a_m2: 55,
          power_density_w_m2: 18,
          internal_resistance_ohm: 62,
          cod_removal_pct: 54,
        },
        operating_conditions: {
          temperature_c: 29,
          pH: 7.1,
          influent_cod_mg_per_l: 2200,
          hydraulic_retention_time_h: 18,
        },
        block_mapping: [
          'anode_biofilm_support',
          'cathode_catalyst_support',
          'membrane_or_separator',
          'sensors_and_analytics',
          'operational_biology',
        ],
        limitations: [
          'Pilot baseline covers only four weeks of operation.',
          'Seasonal wastewater variability is not yet captured.',
        ],
        contradiction_notes: [
          'Short periods of improved COD removal were observed after manual cleaning, but the gain was not sustained.',
        ],
        supplier_name: 'Internal pilot program',
        benchmark_context:
          'Industrial sidestream pilot baseline used for deterministic evaluation demos',
        tags: ['golden-case', 'wastewater-treatment', 'pilot-baseline'],
      },
    ],
    assumptions: ['Pilot skid footprint remains fixed for the current phase.'],
    supplier_context: {
      current_suppliers: ['Legacy carbon felt integrator'],
      preferred_suppliers: ['Econic', 'OpenCell Systems', 'BioVolt Process'],
      excluded_suppliers: ['Unvalidated low-cost import'],
      supplier_preference_notes:
        'Prefer retrofit-friendly vendors with documented wastewater references and maintainable cathode assemblies.',
    },
  },
};

export const nitrogenRecoveryGoldenCasePreset: CaseIntakePreset = {
  id: 'nitrogen-recovery-golden-case',
  label: 'Autofill nitrogen recovery case',
  description:
    'Loads a digester-sidestream nitrogen-recovery scenario with membrane durability, gas handling, and product-quality uncertainties so analysts can inspect a materially different deterministic path.',
  sourceReference:
    'Mapped from bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml.',
  focusAreas: [
    'membrane durability',
    'gas-side handling',
    'recovery-quality defensibility',
  ],
  expectedRecommendationIds: ['rec-data-closure', 'imp_003'],
  formValues: {
    caseId: 'NREC-GOLDEN-002',
    technologyFamily: 'microbial_electrolysis_cell',
    architectureFamily: 'dual_chamber',
    primaryObjective: 'nitrogen_recovery',
    deploymentContext: 'digester sidestream pilot-to-scale validation',
    painPoints:
      'membrane durability uncertainty, gas handling detail incomplete, product quality needs validation',
    influentType: 'digester sidestream concentrate',
    temperature: '32',
    ph: '8.2',
    preferredSuppliers:
      'DuPont Water Solutions, Veolia Water Technologies, Evoqua Water Technologies',
    evidenceType: 'literature_evidence',
    evidenceTitle: nitrogenRecoveryEvidenceTitle,
    evidenceSummary: nitrogenRecoveryEvidenceSummary,
    evidenceStrength: 'moderate',
  },
  payload: {
    case_id: 'NREC-GOLDEN-002',
    case_metadata: {
      preset_id: 'nitrogen-recovery-golden-case',
      source_domain_case:
        'bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml',
    },
    technology_family: 'microbial_electrolysis_cell',
    architecture_family: 'dual_chamber',
    primary_objective: 'nitrogen_recovery',
    business_context: {
      decision_horizon: 'pilot_to_scale_path',
      deployment_context: 'digester sidestream pilot-to-scale validation',
      priorities: ['recovery_value', 'low_energy', 'phased_deployment'],
      hard_constraints: ['product_quality_must_be_defensible'],
      local_energy_cost_note: 'relevant but not fully specified',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'medium',
      serviceability_priority: 'high',
    },
    technology_context: {
      current_trl: 'pilot',
      scale_context: 'pilot',
      current_pain_points: [
        'membrane durability uncertainty',
        'gas handling detail incomplete',
        'product quality needs validation',
      ],
      performance_claims_under_review: [
        'recoverable nitrogen stream with staged deployment potential',
      ],
      target_maturity_window: 'pilot_to_scale_path',
      membrane_presence: 'present',
    },
    feed_and_operation: {
      influent_type: 'digester sidestream concentrate',
      influent_cod_mg_per_l: 2500,
      pH: 8.2,
      temperature_c: 32,
      conductivity_ms_per_cm: 18,
      hydraulic_retention_time_h: 12,
      salinity_or_conductivity_context:
        'High-conductivity sidestream supports electrochemical operation but membrane durability remains uncertain.',
      operating_regime: 'controlled sidestream validation',
    },
    stack_blocks: {
      reactor_architecture: {
        architecture_type: 'dual_chamber',
        solids_tolerance: 'medium',
        serviceability_level: 'medium',
        membrane_presence: 'present',
      },
      anode_biofilm_support: {
        material_family: 'carbon felt',
        surface_treatment: 'startup expected to be manageable',
        biofilm_support_level: 'medium',
      },
      cathode_catalyst_support: {
        reaction_target: 'HER',
        catalyst_family: 'hydrogen_evolution_cathode',
        mass_transport_limitation_risk: 'medium',
        gas_handling_interface: 'product purity is critical',
      },
      membrane_or_separator: {
        type: 'cation_exchange_membrane',
        fouling_risk: 'high',
        crossover_control_level: 'medium',
      },
      electrical_interconnect_and_sealing: {
        current_collection_strategy: 'defined_at_concept_level_only',
        sealing_strategy: 'scale-up detail incomplete',
        corrosion_protection_level: 'medium',
      },
      balance_of_plant: {
        flow_control: 'recirculation control planned',
        gas_handling_readiness: 'medium',
        dosing_capability: 'planned',
        bop_summary:
          'recirculation, gas handling, and dosing expected to be important',
      },
      sensors_and_analytics: {
        data_quality: 'medium',
        voltage_current_logging: 'partial process monitoring planned',
        water_quality_coverage: 'moderate visibility',
      },
      operational_biology: {
        biofilm_maturity: 'managed',
        contamination_risk: 'medium',
        inoculum_source: 'startup plan exists',
        startup_protocol: 'pilot data still needed',
      },
    },
    measured_metrics: {
      internal_resistance_ohm: 48,
      cod_removal_pct: 41,
    },
    evidence_refs: ['literature:nitrogen-recovery-concept-review'],
    evidence_records: [
      {
        evidence_type: 'literature_evidence',
        title: nitrogenRecoveryEvidenceTitle,
        summary: nitrogenRecoveryEvidenceSummary,
        applicability_scope: {
          architecture_family: 'dual_chamber',
          primary_objective: 'nitrogen_recovery',
          deployment_context: 'digester sidestream pilot-to-scale validation',
        },
        strength_level: 'moderate',
        provenance_note:
          'Curated from the nitrogen-recovery golden reference and attached as typed evidence for the intake preset.',
        quantitative_metrics: {
          internal_resistance_ohm: 48,
          cod_removal_pct: 41,
        },
        operating_conditions: {
          temperature_c: 32,
          pH: 8.2,
          conductivity_ms_per_cm: 18,
          hydraulic_retention_time_h: 12,
        },
        block_mapping: [
          'membrane_or_separator',
          'balance_of_plant',
          'cathode_catalyst_support',
        ],
        limitations: [
          'Membrane durability data is incomplete at the intended scale.',
          'Gas-side handling details remain concept-level only.',
        ],
        contradiction_notes: [
          'Recovery value is promising, but product-quality defensibility is still assumption-sensitive.',
        ],
        benchmark_context:
          'Nitrogen-recovery concept review derived from the domain golden case',
        tags: ['golden-case', 'nitrogen-recovery', 'concept-review'],
      },
    ],
    assumptions: ['Separator strategy is central to recovery credibility.'],
    missing_data: [
      'cathode_material_exact_family',
      'membrane_durability_validation',
      'gas_handling_detail',
    ],
    supplier_context: {
      current_suppliers: [],
      preferred_suppliers: [
        'DuPont Water Solutions',
        'Veolia Water Technologies',
        'Evoqua Water Technologies',
      ],
      excluded_suppliers: [],
      supplier_preference_notes:
        'Avoid highly bespoke supply chains where possible.',
    },
    normalization_status: {
      defaults_used: [],
      missing_data: [
        'cathode_material_exact_family',
        'membrane_durability_validation',
        'gas_handling_detail',
      ],
      assumptions: ['Separator strategy is central to recovery credibility.'],
    },
  },
};

export const caseIntakePresets: CaseIntakePreset[] = [
  wastewaterGoldenCasePreset,
  nitrogenRecoveryGoldenCasePreset,
];

export function findCaseIntakePreset(
  presetId: string | null | undefined,
): CaseIntakePreset | undefined {
  if (!presetId) {
    return undefined;
  }

  return caseIntakePresets.find((preset) => preset.id === presetId);
}
