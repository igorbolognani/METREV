import type {
  ExternalEvidenceCatalogItemSummary,
  RawCaseInput,
  ResearchDecisionIngestionPreview,
} from '@metrev/domain-contracts';

type EvidenceRecordInput = NonNullable<
  RawCaseInput['evidence_records']
>[number];

export interface CaseIntakeFormValues {
  caseId: string;
  technologyFamily: string;
  architectureFamily: string;
  reactorArchitectureType?: string;
  reactorSolidsTolerance?: string;
  reactorServiceabilityLevel?: string;
  primaryObjective: string;
  deploymentContext: string;
  decisionHorizon: string;
  currentTrl: string;
  operatingRegime?: string;
  painPoints: string;
  influentType: string;
  substrateProfile: string;
  temperature: string;
  ph: string;
  conductivity: string;
  hydraulicRetentionTime: string;
  anodeMaterialFamily?: string;
  anodeSurfaceTreatment?: string;
  anodeBiofilmSupportLevel?: string;
  cathodeReactionTarget?: string;
  cathodeCatalystFamily?: string;
  cathodeMassTransportLimitationRisk?: string;
  cathodeGasHandlingInterface?: string;
  membraneSeparatorType?: string;
  membraneFoulingRisk?: string;
  membraneCrossoverControlLevel?: string;
  electricalCurrentCollectionStrategy?: string;
  electricalSealingStrategy?: string;
  electricalCorrosionProtectionLevel?: string;
  balanceFlowControl?: string;
  balanceGasHandlingReadiness?: string;
  balanceDosingCapability?: string;
  balanceSummary?: string;
  sensorsDataQuality?: string;
  sensorsVoltageCurrentLogging?: string;
  sensorsWaterQualityCoverage?: string;
  biologyBiofilmMaturity?: string;
  biologyContaminationRisk?: string;
  biologyInoculumSource?: string;
  biologyStartupProtocol?: string;
  preferredSuppliers: string;
  currentSuppliers: string;
  excludedSuppliers?: string;
  supplierPreferenceNotes?: string;
  hardConstraints?: string;
  membranePresence: string;
  assumptionsNote: string;
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
  reactorArchitectureType: '',
  reactorSolidsTolerance: '',
  reactorServiceabilityLevel: '',
  primaryObjective: 'wastewater_treatment',
  deploymentContext: '',
  decisionHorizon: '',
  currentTrl: '',
  operatingRegime: '',
  painPoints: '',
  influentType: '',
  substrateProfile: '',
  temperature: '',
  ph: '',
  conductivity: '',
  hydraulicRetentionTime: '',
  anodeMaterialFamily: '',
  anodeSurfaceTreatment: '',
  anodeBiofilmSupportLevel: '',
  cathodeReactionTarget: '',
  cathodeCatalystFamily: '',
  cathodeMassTransportLimitationRisk: '',
  cathodeGasHandlingInterface: '',
  membraneSeparatorType: '',
  membraneFoulingRisk: '',
  membraneCrossoverControlLevel: '',
  electricalCurrentCollectionStrategy: '',
  electricalSealingStrategy: '',
  electricalCorrosionProtectionLevel: '',
  balanceFlowControl: '',
  balanceGasHandlingReadiness: '',
  balanceDosingCapability: '',
  balanceSummary: '',
  sensorsDataQuality: '',
  sensorsVoltageCurrentLogging: '',
  sensorsWaterQualityCoverage: '',
  biologyBiofilmMaturity: '',
  biologyContaminationRisk: '',
  biologyInoculumSource: '',
  biologyStartupProtocol: '',
  preferredSuppliers: '',
  currentSuppliers: '',
  excludedSuppliers: '',
  supplierPreferenceNotes: '',
  hardConstraints: '',
  membranePresence: '',
  assumptionsNote: '',
  evidenceType: 'internal_benchmark',
  evidenceTitle: '',
  evidenceSummary: '',
  evidenceStrength: 'moderate',
};

const runtimeIntakeProvenanceNote =
  'Captured directly during runtime intake and preserved as typed evidence.';
const reviewedCatalogEvidenceNote =
  'Reviewed and accepted into the external evidence catalog before intake selection.';

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

function trimToUndefined(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === 'string' && entry.trim().length > 0,
  );
}

function resolveOptionalFormText(
  value: string | undefined,
  presetValue: unknown,
): string | undefined {
  if (typeof value === 'undefined') {
    return trimToUndefined(readStringValue(presetValue));
  }

  return trimToUndefined(value);
}

export function normalizeCaseIntakeFormValues(
  values?: Partial<CaseIntakeFormValues>,
): CaseIntakeFormValues {
  return {
    ...defaultCaseIntakeFormValues,
    ...values,
  };
}

export function hydrateCaseIntakeFormValues(
  values?: Partial<CaseIntakeFormValues>,
  presetPayload?: RawCaseInput,
): CaseIntakeFormValues {
  const normalized = normalizeCaseIntakeFormValues(values);

  if (!presetPayload) {
    return normalized;
  }

  return {
    ...normalized,
    reactorArchitectureType:
      normalized.reactorArchitectureType ||
      readStringValue(
        presetPayload.stack_blocks?.reactor_architecture?.architecture_type,
      ) ||
      normalized.architectureFamily,
    reactorSolidsTolerance:
      normalized.reactorSolidsTolerance ||
      readStringValue(
        presetPayload.stack_blocks?.reactor_architecture?.solids_tolerance,
      ),
    reactorServiceabilityLevel:
      normalized.reactorServiceabilityLevel ||
      readStringValue(
        presetPayload.stack_blocks?.reactor_architecture?.serviceability_level,
      ),
    operatingRegime:
      normalized.operatingRegime ||
      readStringValue(presetPayload.feed_and_operation?.operating_regime),
    anodeMaterialFamily:
      normalized.anodeMaterialFamily ||
      readStringValue(
        presetPayload.stack_blocks?.anode_biofilm_support?.material_family,
      ),
    anodeSurfaceTreatment:
      normalized.anodeSurfaceTreatment ||
      readStringValue(
        presetPayload.stack_blocks?.anode_biofilm_support?.surface_treatment,
      ),
    anodeBiofilmSupportLevel:
      normalized.anodeBiofilmSupportLevel ||
      readStringValue(
        presetPayload.stack_blocks?.anode_biofilm_support
          ?.biofilm_support_level,
      ),
    cathodeReactionTarget:
      normalized.cathodeReactionTarget ||
      readStringValue(
        presetPayload.stack_blocks?.cathode_catalyst_support?.reaction_target,
      ),
    cathodeCatalystFamily:
      normalized.cathodeCatalystFamily ||
      readStringValue(
        presetPayload.stack_blocks?.cathode_catalyst_support?.catalyst_family,
      ),
    cathodeMassTransportLimitationRisk:
      normalized.cathodeMassTransportLimitationRisk ||
      readStringValue(
        presetPayload.stack_blocks?.cathode_catalyst_support
          ?.mass_transport_limitation_risk,
      ),
    cathodeGasHandlingInterface:
      normalized.cathodeGasHandlingInterface ||
      readStringValue(
        presetPayload.stack_blocks?.cathode_catalyst_support
          ?.gas_handling_interface,
      ),
    membraneSeparatorType:
      normalized.membraneSeparatorType ||
      readStringValue(presetPayload.stack_blocks?.membrane_or_separator?.type),
    membraneFoulingRisk:
      normalized.membraneFoulingRisk ||
      readStringValue(
        presetPayload.stack_blocks?.membrane_or_separator?.fouling_risk,
      ),
    membraneCrossoverControlLevel:
      normalized.membraneCrossoverControlLevel ||
      readStringValue(
        presetPayload.stack_blocks?.membrane_or_separator
          ?.crossover_control_level,
      ),
    electricalCurrentCollectionStrategy:
      normalized.electricalCurrentCollectionStrategy ||
      readStringValue(
        presetPayload.stack_blocks?.electrical_interconnect_and_sealing
          ?.current_collection_strategy,
      ),
    electricalSealingStrategy:
      normalized.electricalSealingStrategy ||
      readStringValue(
        presetPayload.stack_blocks?.electrical_interconnect_and_sealing
          ?.sealing_strategy,
      ),
    electricalCorrosionProtectionLevel:
      normalized.electricalCorrosionProtectionLevel ||
      readStringValue(
        presetPayload.stack_blocks?.electrical_interconnect_and_sealing
          ?.corrosion_protection_level,
      ),
    balanceFlowControl:
      normalized.balanceFlowControl ||
      readStringValue(
        presetPayload.stack_blocks?.balance_of_plant?.flow_control,
      ),
    balanceGasHandlingReadiness:
      normalized.balanceGasHandlingReadiness ||
      readStringValue(
        presetPayload.stack_blocks?.balance_of_plant?.gas_handling_readiness,
      ),
    balanceDosingCapability:
      normalized.balanceDosingCapability ||
      readStringValue(
        presetPayload.stack_blocks?.balance_of_plant?.dosing_capability,
      ),
    balanceSummary:
      normalized.balanceSummary ||
      readStringValue(
        presetPayload.stack_blocks?.balance_of_plant?.bop_summary,
      ),
    sensorsDataQuality:
      normalized.sensorsDataQuality ||
      readStringValue(
        presetPayload.stack_blocks?.sensors_and_analytics?.data_quality,
      ),
    sensorsVoltageCurrentLogging:
      normalized.sensorsVoltageCurrentLogging ||
      readStringValue(
        presetPayload.stack_blocks?.sensors_and_analytics
          ?.voltage_current_logging,
      ),
    sensorsWaterQualityCoverage:
      normalized.sensorsWaterQualityCoverage ||
      readStringValue(
        presetPayload.stack_blocks?.sensors_and_analytics
          ?.water_quality_coverage,
      ),
    biologyBiofilmMaturity:
      normalized.biologyBiofilmMaturity ||
      readStringValue(
        presetPayload.stack_blocks?.operational_biology?.biofilm_maturity,
      ),
    biologyContaminationRisk:
      normalized.biologyContaminationRisk ||
      readStringValue(
        presetPayload.stack_blocks?.operational_biology?.contamination_risk,
      ),
    biologyInoculumSource:
      normalized.biologyInoculumSource ||
      readStringValue(
        presetPayload.stack_blocks?.operational_biology?.inoculum_source,
      ),
    biologyStartupProtocol:
      normalized.biologyStartupProtocol ||
      readStringValue(
        presetPayload.stack_blocks?.operational_biology?.startup_protocol,
      ),
    excludedSuppliers:
      normalized.excludedSuppliers ||
      readStringArray(presetPayload.supplier_context?.excluded_suppliers).join(
        ', ',
      ),
    supplierPreferenceNotes:
      normalized.supplierPreferenceNotes ||
      readStringValue(
        presetPayload.supplier_context?.supplier_preference_notes,
      ),
    hardConstraints:
      normalized.hardConstraints ||
      readStringArray(presetPayload.business_context?.hard_constraints).join(
        ', ',
      ),
    membranePresence:
      normalized.membranePresence ||
      readStringValue(
        presetPayload.stack_blocks?.reactor_architecture?.membrane_presence,
      ) ||
      readStringValue(presetPayload.technology_context?.membrane_presence),
  };
}

function buildEvidenceRecords(
  values: CaseIntakeFormValues,
  preset?: CaseIntakePreset,
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[] = [],
  researchDecisionInput?: ResearchDecisionIngestionPreview | null,
): RawCaseInput['evidence_records'] {
  const catalogEvidence = selectedCatalogEvidence.map((item) => ({
    evidence_id: `catalog:${item.id}`,
    evidence_type: item.evidence_type,
    title: item.title,
    summary: item.summary,
    applicability_scope: item.applicability_scope,
    strength_level: item.strength_level,
    provenance_note: `${item.provenance_note} ${reviewedCatalogEvidenceNote}`,
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
    catalog_item_id: item.id,
    review_status: item.review_status,
    source_state: item.source_state,
    source_type: item.source_type,
    source_category: item.source_category,
    source_url: item.source_url,
    doi: item.doi,
    publisher: item.publisher,
    published_at: item.published_at,
    claim_count: item.claim_count,
    reviewed_claim_count: item.reviewed_claim_count,
    metadata_quality: item.metadata_quality,
    veracity_score: item.veracity_score,
  }));
  const researchEvidence = (researchDecisionInput?.evidence_records ?? []).map(
    (record) => ({
      ...record,
      tags: dedupeStrings([...(record.tags ?? []), 'research-pack']),
    }),
  );

  if (!values.evidenceTitle.trim() || !values.evidenceSummary.trim()) {
    const attachedEvidence = [...researchEvidence, ...catalogEvidence];
    return attachedEvidence.length > 0 ? attachedEvidence : undefined;
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
    ...researchEvidence,
    ...catalogEvidence,
  ];
}

export function buildCaseInputFromFormValues(
  values: CaseIntakeFormValues,
  preset?: CaseIntakePreset,
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[] = [],
  researchDecisionInput?: ResearchDecisionIngestionPreview | null,
): RawCaseInput {
  const assumptions = dedupeStrings([
    ...(preset?.payload.assumptions ?? []),
    ...splitCommaSeparated(values.assumptionsNote),
    ...(researchDecisionInput?.assumptions ?? []),
  ]);
  const missingData = dedupeStrings([
    ...(preset?.payload.missing_data ?? []),
    ...(researchDecisionInput?.missing_data ?? []),
  ]);
  const currentSuppliers = splitCommaSeparated(values.currentSuppliers);
  const preferredSuppliers = splitCommaSeparated(values.preferredSuppliers);
  const excludedSuppliers = splitCommaSeparated(values.excludedSuppliers ?? '');
  const hardConstraints = splitCommaSeparated(values.hardConstraints ?? '');
  const painPoints = splitCommaSeparated(values.painPoints);
  const presetPayload = preset?.payload;
  const presetStackBlocks = presetPayload?.stack_blocks;

  return {
    ...presetPayload,
    case_id: values.caseId.trim() || undefined,
    technology_family: values.technologyFamily,
    architecture_family: values.architectureFamily.trim() || undefined,
    primary_objective: values.primaryObjective,
    business_context: {
      ...presetPayload?.business_context,
      decision_horizon:
        values.decisionHorizon.trim() ||
        presetPayload?.business_context?.decision_horizon,
      deployment_context: values.deploymentContext.trim() || undefined,
      hard_constraints:
        typeof values.hardConstraints === 'undefined'
          ? (presetPayload?.business_context?.hard_constraints ?? [])
          : hardConstraints,
    },
    technology_context: {
      ...presetPayload?.technology_context,
      current_trl:
        values.currentTrl.trim() ||
        presetPayload?.technology_context?.current_trl,
      membrane_presence:
        values.membranePresence.trim() ||
        presetPayload?.technology_context?.membrane_presence,
      current_pain_points: painPoints,
    },
    feed_and_operation: {
      ...presetPayload?.feed_and_operation,
      influent_type: values.influentType.trim() || undefined,
      substrate_profile:
        values.substrateProfile.trim() ||
        presetPayload?.feed_and_operation?.substrate_profile,
      temperature_c: parseOptionalNumber(values.temperature),
      pH: parseOptionalNumber(values.ph),
      conductivity_ms_per_cm: parseOptionalNumber(values.conductivity),
      hydraulic_retention_time_h: parseOptionalNumber(
        values.hydraulicRetentionTime,
      ),
      operating_regime:
        resolveOptionalFormText(
          values.operatingRegime,
          presetPayload?.feed_and_operation?.operating_regime,
        ) ?? undefined,
    },
    stack_blocks: {
      ...presetStackBlocks,
      reactor_architecture: {
        ...presetStackBlocks?.reactor_architecture,
        architecture_type:
          resolveOptionalFormText(
            values.reactorArchitectureType,
            presetStackBlocks?.reactor_architecture?.architecture_type,
          ) ||
          values.architectureFamily.trim() ||
          undefined,
        solids_tolerance:
          resolveOptionalFormText(
            values.reactorSolidsTolerance,
            presetStackBlocks?.reactor_architecture?.solids_tolerance,
          ) ?? undefined,
        serviceability_level:
          resolveOptionalFormText(
            values.reactorServiceabilityLevel,
            presetStackBlocks?.reactor_architecture?.serviceability_level,
          ) ?? undefined,
        membrane_presence:
          values.membranePresence.trim() ||
          readStringValue(
            presetStackBlocks?.reactor_architecture?.membrane_presence,
          ) ||
          readStringValue(
            presetPayload?.technology_context?.membrane_presence,
          ) ||
          undefined,
      },
      anode_biofilm_support: {
        ...presetStackBlocks?.anode_biofilm_support,
        material_family:
          resolveOptionalFormText(
            values.anodeMaterialFamily,
            presetStackBlocks?.anode_biofilm_support?.material_family,
          ) ?? undefined,
        surface_treatment:
          resolveOptionalFormText(
            values.anodeSurfaceTreatment,
            presetStackBlocks?.anode_biofilm_support?.surface_treatment,
          ) ?? undefined,
        biofilm_support_level:
          resolveOptionalFormText(
            values.anodeBiofilmSupportLevel,
            presetStackBlocks?.anode_biofilm_support?.biofilm_support_level,
          ) ?? undefined,
      },
      cathode_catalyst_support: {
        ...presetStackBlocks?.cathode_catalyst_support,
        reaction_target:
          resolveOptionalFormText(
            values.cathodeReactionTarget,
            presetStackBlocks?.cathode_catalyst_support?.reaction_target,
          ) ?? undefined,
        catalyst_family:
          resolveOptionalFormText(
            values.cathodeCatalystFamily,
            presetStackBlocks?.cathode_catalyst_support?.catalyst_family,
          ) ?? undefined,
        mass_transport_limitation_risk:
          resolveOptionalFormText(
            values.cathodeMassTransportLimitationRisk,
            presetStackBlocks?.cathode_catalyst_support
              ?.mass_transport_limitation_risk,
          ) ?? undefined,
        gas_handling_interface:
          resolveOptionalFormText(
            values.cathodeGasHandlingInterface,
            presetStackBlocks?.cathode_catalyst_support?.gas_handling_interface,
          ) ?? undefined,
      },
      membrane_or_separator: {
        ...presetStackBlocks?.membrane_or_separator,
        type:
          resolveOptionalFormText(
            values.membraneSeparatorType,
            presetStackBlocks?.membrane_or_separator?.type,
          ) ?? undefined,
        fouling_risk:
          resolveOptionalFormText(
            values.membraneFoulingRisk,
            presetStackBlocks?.membrane_or_separator?.fouling_risk,
          ) ?? undefined,
        crossover_control_level:
          resolveOptionalFormText(
            values.membraneCrossoverControlLevel,
            presetStackBlocks?.membrane_or_separator?.crossover_control_level,
          ) ?? undefined,
      },
      electrical_interconnect_and_sealing: {
        ...presetStackBlocks?.electrical_interconnect_and_sealing,
        current_collection_strategy:
          resolveOptionalFormText(
            values.electricalCurrentCollectionStrategy,
            presetStackBlocks?.electrical_interconnect_and_sealing
              ?.current_collection_strategy,
          ) ?? undefined,
        sealing_strategy:
          resolveOptionalFormText(
            values.electricalSealingStrategy,
            presetStackBlocks?.electrical_interconnect_and_sealing
              ?.sealing_strategy,
          ) ?? undefined,
        corrosion_protection_level:
          resolveOptionalFormText(
            values.electricalCorrosionProtectionLevel,
            presetStackBlocks?.electrical_interconnect_and_sealing
              ?.corrosion_protection_level,
          ) ?? undefined,
      },
      balance_of_plant: {
        ...presetStackBlocks?.balance_of_plant,
        flow_control:
          resolveOptionalFormText(
            values.balanceFlowControl,
            presetStackBlocks?.balance_of_plant?.flow_control,
          ) ?? undefined,
        gas_handling_readiness:
          resolveOptionalFormText(
            values.balanceGasHandlingReadiness,
            presetStackBlocks?.balance_of_plant?.gas_handling_readiness,
          ) ?? undefined,
        dosing_capability:
          resolveOptionalFormText(
            values.balanceDosingCapability,
            presetStackBlocks?.balance_of_plant?.dosing_capability,
          ) ?? undefined,
        bop_summary:
          resolveOptionalFormText(
            values.balanceSummary,
            presetStackBlocks?.balance_of_plant?.bop_summary,
          ) ?? undefined,
      },
      sensors_and_analytics: {
        ...presetStackBlocks?.sensors_and_analytics,
        data_quality:
          resolveOptionalFormText(
            values.sensorsDataQuality,
            presetStackBlocks?.sensors_and_analytics?.data_quality,
          ) ?? undefined,
        voltage_current_logging:
          resolveOptionalFormText(
            values.sensorsVoltageCurrentLogging,
            presetStackBlocks?.sensors_and_analytics?.voltage_current_logging,
          ) ?? undefined,
        water_quality_coverage:
          resolveOptionalFormText(
            values.sensorsWaterQualityCoverage,
            presetStackBlocks?.sensors_and_analytics?.water_quality_coverage,
          ) ?? undefined,
      },
      operational_biology: {
        ...presetStackBlocks?.operational_biology,
        biofilm_maturity:
          resolveOptionalFormText(
            values.biologyBiofilmMaturity,
            presetStackBlocks?.operational_biology?.biofilm_maturity,
          ) ?? undefined,
        contamination_risk:
          resolveOptionalFormText(
            values.biologyContaminationRisk,
            presetStackBlocks?.operational_biology?.contamination_risk,
          ) ?? undefined,
        inoculum_source:
          resolveOptionalFormText(
            values.biologyInoculumSource,
            presetStackBlocks?.operational_biology?.inoculum_source,
          ) ?? undefined,
        startup_protocol:
          resolveOptionalFormText(
            values.biologyStartupProtocol,
            presetStackBlocks?.operational_biology?.startup_protocol,
          ) ?? undefined,
      },
    },
    supplier_context: {
      ...presetPayload?.supplier_context,
      current_suppliers:
        currentSuppliers.length > 0
          ? currentSuppliers
          : (presetPayload?.supplier_context?.current_suppliers ?? []),
      preferred_suppliers: preferredSuppliers,
      excluded_suppliers:
        typeof values.excludedSuppliers === 'undefined'
          ? (presetPayload?.supplier_context?.excluded_suppliers ?? [])
          : excludedSuppliers,
      supplier_preference_notes:
        resolveOptionalFormText(
          values.supplierPreferenceNotes,
          presetPayload?.supplier_context?.supplier_preference_notes,
        ) ?? undefined,
    },
    evidence_records: buildEvidenceRecords(
      values,
      preset,
      selectedCatalogEvidence,
      researchDecisionInput,
    ),
    assumptions: assumptions.length > 0 ? assumptions : undefined,
    missing_data: missingData.length > 0 ? missingData : undefined,
  };
}

const wastewaterGoldenCaseSourcePath =
  'bioelectrochem_agent_kit/domain/cases/golden/case-001-high-strength-industrial-wastewater.yml';
const nitrogenRecoveryGoldenCaseSourcePath =
  'bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml';
const hydrogenRecoveryGoldenCaseSourcePath =
  'bioelectrochem_agent_kit/domain/cases/golden/case-003-brewery-sidestream-hydrogen-recovery.yml';
const sensingGoldenCaseSourcePath =
  'bioelectrochem_agent_kit/domain/cases/golden/case-004-remote-effluent-sensing-node.yml';
const biogasSynergyGoldenCaseSourcePath =
  'bioelectrochem_agent_kit/domain/cases/golden/case-005-digester-polishing-biogas-synergy.yml';

const wastewaterEvidenceTitle =
  'Industrial wastewater stabilization baseline 2026-Q2';
const wastewaterEvidenceSummary =
  'Stabilization baseline showed immature startup, cathode flooding risk, elevated internal resistance, and low observability during sidestream treatment.';

const nitrogenRecoveryEvidenceTitle =
  'Digester sidestream nitrogen recovery hardening review';
const nitrogenRecoveryEvidenceSummary =
  'Nitrogen recovery review shows separator fouling risk, unresolved gas handling details, and membrane durability validation needs before scale-up decisions.';

const hydrogenRecoveryEvidenceTitle =
  'Brewery sidestream hydrogen recovery pilot review';
const hydrogenRecoveryEvidenceSummary =
  'Hydrogen recovery review highlights cathode transport bottlenecks, low gas-side observability, and missing purity validation under the intended applied-voltage window.';

const sensingEvidenceTitle = 'Remote effluent sensing node calibration review';
const sensingEvidenceSummary =
  'Field sensing review highlights signal drift, sparse calibration evidence, and early biofilm maturity that weaken remote alert defensibility.';

const biogasSynergyEvidenceTitle =
  'Digester polishing biogas synergy integration review';
const biogasSynergyEvidenceSummary =
  'Hybrid polishing review highlights acclimation lag, missing methane-slip closure, and uncertain upset recovery behavior before integration decisions.';

export const wastewaterGoldenCasePreset: CaseIntakePreset = {
  id: 'wastewater-treatment-stabilization-case',
  label: 'Autofill industrial wastewater stabilization case',
  description:
    'Loads an industrial wastewater stabilization scenario with structured stack details, measured metrics, supplier context, and typed evidence so the intake deck exercises the full deterministic wastewater path.',
  sourceReference: `Mapped from ${wastewaterGoldenCaseSourcePath}.`,
  focusAreas: [
    'observability uplift',
    'cathode flooding control',
    'stabilization-gate readiness',
  ],
  expectedRecommendationIds: [
    'rec-data-closure',
    'imp_001',
    'imp_002',
    'imp_003',
    'imp_004',
  ],
  formValues: {
    caseId: 'WWT-STAB-001',
    technologyFamily: 'microbial_fuel_cell',
    architectureFamily: 'single_chamber_air_cathode',
    primaryObjective: 'wastewater_treatment',
    deploymentContext:
      'industrial sidestream retrofit with a 90-day stabilization gate',
    decisionHorizon: '90-day stabilization and go/no-go retrofit review',
    currentTrl: 'pilot',
    painPoints:
      'weak monitoring, unstable startup, high internal resistance, cathode flooding risk',
    influentType: 'high-strength food-processing sidestream',
    substrateProfile:
      'readily biodegradable organics with intermittent solids carryover',
    temperature: '29',
    ph: '7.1',
    conductivity: '7.2',
    hydraulicRetentionTime: '18',
    preferredSuppliers: 'Econic, OpenCell Systems, BioVolt Process',
    currentSuppliers: 'Legacy carbon felt integrator',
    membranePresence: 'absent',
    assumptionsNote:
      'Skid footprint must remain unchanged during stabilization.',
    evidenceType: 'internal_benchmark',
    evidenceTitle: wastewaterEvidenceTitle,
    evidenceSummary: wastewaterEvidenceSummary,
    evidenceStrength: 'strong',
  },
  payload: {
    case_id: 'WWT-STAB-001',
    case_metadata: {
      preset_id: 'wastewater-treatment-stabilization-case',
      source_domain_case: wastewaterGoldenCaseSourcePath,
      preset_note:
        'Five-case runtime catalog entry aligned to the canonical industrial wastewater stabilization reference.',
    },
    technology_family: 'microbial_fuel_cell',
    architecture_family: 'single_chamber_air_cathode',
    primary_objective: 'wastewater_treatment',
    business_context: {
      decision_horizon: '90-day stabilization and go/no-go retrofit review',
      deployment_context:
        'industrial sidestream retrofit with a 90-day stabilization gate',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'high',
      retrofit_priority: 'high',
      serviceability_priority: 'high',
      priorities: [
        'COD removal stability',
        'audit-ready monitoring',
        'operator simplicity',
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
        'optimization-driven COD removal uplift without membrane retrofit',
        'stable low-maintenance cathode operation',
      ],
      target_maturity_window: 'stabilization_gate',
      membrane_presence: 'absent',
    },
    feed_and_operation: {
      influent_type: 'high-strength food-processing sidestream',
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
        type: 'ceramic_spacer',
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
    missing_data: [
      'cleaning_trigger_definition',
      'long_run_cathode_durability',
      'high_frequency_logging',
    ],
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
          'Stabilization baseline covers only the early operating window.',
          'Cleaning triggers and cathode durability are not yet closed.',
        ],
        contradiction_notes: [
          'Short periods of improved COD removal were observed after manual cleaning, but the gain was not sustained.',
        ],
        supplier_name: 'Internal pilot program',
        benchmark_context:
          'Industrial sidestream stabilization baseline used for deterministic evaluation demos',
        tags: ['golden-case', 'wastewater-treatment', 'stabilization-gate'],
      },
    ],
    assumptions: [
      'Skid footprint remains fixed during the stabilization phase.',
    ],
    supplier_context: {
      current_suppliers: ['Legacy carbon felt integrator'],
      preferred_suppliers: ['Econic', 'OpenCell Systems', 'BioVolt Process'],
      excluded_suppliers: ['Unvalidated low-cost import'],
      supplier_preference_notes:
        'Prefer retrofit-friendly vendors with documented wastewater references and maintainable cathode assemblies.',
    },
    normalization_status: {
      defaults_used: [],
      missing_data: [
        'cleaning_trigger_definition',
        'long_run_cathode_durability',
        'high_frequency_logging',
      ],
      assumptions: [
        'Skid footprint remains fixed during the stabilization phase.',
      ],
    },
  },
};

export const nitrogenRecoveryGoldenCasePreset: CaseIntakePreset = {
  id: 'nitrogen-recovery-hardening-case',
  label: 'Autofill nitrogen recovery hardening case',
  description:
    'Loads a digester-sidestream nitrogen-recovery scenario with separator durability, gas handling, and product-quality uncertainties so analysts can inspect a materially different deterministic path.',
  sourceReference: `Mapped from ${nitrogenRecoveryGoldenCaseSourcePath}.`,
  focusAreas: [
    'membrane durability',
    'gas-side handling',
    'recovery-quality defensibility',
  ],
  expectedRecommendationIds: ['rec-data-closure', 'imp_003'],
  formValues: {
    caseId: 'NREC-HARDEN-002',
    technologyFamily: 'microbial_electrolysis_cell',
    architectureFamily: 'dual_chamber',
    primaryObjective: 'nitrogen_recovery',
    deploymentContext: 'digester sidestream pilot-to-scale validation',
    decisionHorizon: 'pilot_to_scale_path',
    currentTrl: 'pilot',
    painPoints:
      'membrane durability uncertainty, gas handling detail incomplete, product quality needs validation',
    influentType: 'digester sidestream concentrate',
    substrateProfile: '',
    temperature: '32',
    ph: '8.2',
    conductivity: '18',
    hydraulicRetentionTime: '12',
    preferredSuppliers:
      'DuPont Water Solutions, Veolia Water Technologies, Evoqua Water Technologies',
    currentSuppliers: '',
    membranePresence: 'present',
    assumptionsNote: 'Separator strategy is central to recovery credibility.',
    evidenceType: 'literature_evidence',
    evidenceTitle: nitrogenRecoveryEvidenceTitle,
    evidenceSummary: nitrogenRecoveryEvidenceSummary,
    evidenceStrength: 'moderate',
  },
  payload: {
    case_id: 'NREC-HARDEN-002',
    case_metadata: {
      preset_id: 'nitrogen-recovery-hardening-case',
      source_domain_case: nitrogenRecoveryGoldenCaseSourcePath,
    },
    technology_family: 'microbial_electrolysis_cell',
    architecture_family: 'dual_chamber',
    primary_objective: 'nitrogen_recovery',
    business_context: {
      decision_horizon: 'pilot_to_scale_path',
      deployment_context: 'digester sidestream pilot-to-scale validation',
      priorities: ['recovery_value', 'low_energy', 'phased_deployment'],
      hard_constraints: [
        'product_quality_must_be_defensible',
        'gas_side_safety_review_required',
      ],
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
          'Nitrogen-recovery hardening review derived from the domain golden case',
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

export const hydrogenRecoveryGoldenCasePreset: CaseIntakePreset = {
  id: 'hydrogen-recovery-brewery-case',
  label: 'Autofill brewery hydrogen recovery case',
  description:
    'Loads a brewery-sidestream hydrogen-recovery scenario with cathode transport, gas-side observability, and purity-validation uncertainty so the deterministic path covers a real MEC recovery workflow.',
  sourceReference: `Mapped from ${hydrogenRecoveryGoldenCaseSourcePath}.`,
  focusAreas: [
    'hydrogen purity closure',
    'cathode transport bottlenecks',
    'gas-side observability',
  ],
  expectedRecommendationIds: ['rec-data-closure', 'imp_002', 'imp_004'],
  formValues: {
    caseId: 'H2-BREW-003',
    technologyFamily: 'microbial_electrolysis_cell',
    architectureFamily: 'dual_chamber',
    primaryObjective: 'hydrogen_recovery',
    deploymentContext:
      'brewery sidestream pilot with gas-side quality validation',
    decisionHorizon: 'pilot expansion review',
    currentTrl: 'pilot',
    painPoints:
      'partial gas monitoring, cathode transport bottleneck, hydrogen purity not yet defended',
    influentType: 'brewery sidestream concentrate',
    substrateProfile:
      'acetate-rich fermentation sidestream with yeast carryover risk',
    temperature: '31',
    ph: '6.9',
    conductivity: '11',
    hydraulicRetentionTime: '10',
    preferredSuppliers: 'Giner, DuPont Water Solutions, De Nora',
    currentSuppliers: '',
    membranePresence: 'present',
    assumptionsNote:
      'Applied-voltage control must remain operator-safe during the pilot phase.',
    evidenceType: 'literature_evidence',
    evidenceTitle: hydrogenRecoveryEvidenceTitle,
    evidenceSummary: hydrogenRecoveryEvidenceSummary,
    evidenceStrength: 'moderate',
  },
  payload: {
    case_id: 'H2-BREW-003',
    case_metadata: {
      preset_id: 'hydrogen-recovery-brewery-case',
      source_domain_case: hydrogenRecoveryGoldenCaseSourcePath,
    },
    technology_family: 'microbial_electrolysis_cell',
    architecture_family: 'dual_chamber',
    primary_objective: 'hydrogen_recovery',
    business_context: {
      decision_horizon: 'pilot expansion review',
      deployment_context:
        'brewery sidestream pilot with gas-side quality validation',
      priorities: [
        'recover_hydrogen_stream',
        'reduce_aeration_load',
        'phased_deployment',
      ],
      hard_constraints: [
        'food_safety_boundary_must_remain_clear',
        'applied_voltage_window_must_remain_operator_safe',
      ],
      local_energy_cost_note:
        'Hydrogen value matters only if purity can be defended continuously.',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'medium',
      serviceability_priority: 'high',
    },
    technology_context: {
      current_trl: 'pilot',
      scale_context: 'pilot',
      current_pain_points: [
        'partial gas monitoring',
        'cathode transport bottleneck',
        'hydrogen purity not yet defended',
      ],
      performance_claims_under_review: [
        'hydrogen recovery optimization under partial gas monitoring',
      ],
      target_maturity_window: 'pilot_expansion_review',
      membrane_presence: 'present',
    },
    feed_and_operation: {
      influent_type: 'brewery sidestream concentrate',
      substrate_profile:
        'acetate-rich fermentation sidestream with yeast carryover risk',
      influent_cod_mg_per_l: 3200,
      pH: 6.9,
      temperature_c: 31,
      conductivity_ms_per_cm: 11,
      hydraulic_retention_time_h: 10,
      salinity_or_conductivity_context:
        'Gas-side performance claims remain sensitive to conductivity swings and cleaning cycles.',
      operating_regime:
        'recirculation with controlled applied voltage and partial gas handling automation',
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
        surface_treatment: 'baseline carbon felt retained for comparability',
        biofilm_support_level: 'medium',
      },
      cathode_catalyst_support: {
        reaction_target: 'HER',
        catalyst_family: 'hydrogen_evolution_cathode',
        mass_transport_limitation_risk: 'high',
        gas_handling_interface:
          'partial gas handling automation without continuous purity tracking',
      },
      membrane_or_separator: {
        type: 'AEM',
        fouling_risk: 'medium',
        crossover_control_level: 'medium',
      },
      electrical_interconnect_and_sealing: {
        current_collection_strategy: 'nickel mesh current collection',
        sealing_strategy: 'gas-side compression detail partially standardized',
        corrosion_protection_level: 'medium',
      },
      balance_of_plant: {
        flow_control: 'recirculation_loop',
        gas_handling_readiness: 'medium',
        dosing_capability: 'present',
        bop_summary:
          'recirculation plus controlled applied voltage with partial gas handling automation',
      },
      sensors_and_analytics: {
        data_quality: 'low',
        voltage_current_logging: 'continuous electrical logging only',
        water_quality_coverage: 'manual COD and batch gas purity checks',
      },
      operational_biology: {
        biofilm_maturity: 'managed',
        contamination_risk: 'medium',
        inoculum_source: 'acclimated brewery sludge blend',
        startup_protocol:
          'repeatable if applied voltage stays inside the tested window',
      },
    },
    measured_metrics: {
      current_density_a_m2: 96,
      power_density_w_m2: 14,
      internal_resistance_ohm: 34,
      cod_removal_pct: 39,
    },
    missing_data: [
      'hydrogen_purity_validation',
      'gas_composition_logging',
      'applied_voltage_operating_window',
    ],
    evidence_refs: ['literature:brewery-hydrogen-recovery-pilot-review'],
    evidence_records: [
      {
        evidence_type: 'literature_evidence',
        title: hydrogenRecoveryEvidenceTitle,
        summary: hydrogenRecoveryEvidenceSummary,
        applicability_scope: {
          architecture_family: 'dual_chamber',
          primary_objective: 'hydrogen_recovery',
          deployment_context:
            'brewery sidestream pilot with gas-side quality validation',
        },
        strength_level: 'moderate',
        provenance_note:
          'Curated from the brewery hydrogen-recovery golden reference and attached as typed evidence for the intake preset.',
        quantitative_metrics: {
          current_density_a_m2: 96,
          power_density_w_m2: 14,
          cod_removal_pct: 39,
        },
        operating_conditions: {
          temperature_c: 31,
          pH: 6.9,
          conductivity_ms_per_cm: 11,
          hydraulic_retention_time_h: 10,
        },
        block_mapping: [
          'cathode_catalyst_support',
          'membrane_or_separator',
          'sensors_and_analytics',
        ],
        limitations: [
          'Hydrogen purity is not yet logged continuously.',
          'Gas composition checks remain batch-based.',
        ],
        contradiction_notes: [
          'Recovery optimism remains sensitive to missing purity and applied-voltage evidence.',
        ],
        benchmark_context:
          'Brewery sidestream pilot review derived from the canonical hydrogen-recovery reference',
        tags: ['golden-case', 'hydrogen-recovery', 'brewery-sidestream'],
      },
    ],
    assumptions: [
      'Applied-voltage control must remain operator-safe during the pilot phase.',
    ],
    supplier_context: {
      current_suppliers: [],
      preferred_suppliers: ['Giner', 'DuPont Water Solutions', 'De Nora'],
      excluded_suppliers: [],
      supplier_preference_notes:
        'Prefer suppliers with operator-safe HER packages and membrane support.',
    },
    normalization_status: {
      defaults_used: [],
      missing_data: [
        'hydrogen_purity_validation',
        'gas_composition_logging',
        'applied_voltage_operating_window',
      ],
      assumptions: [
        'Applied-voltage control must remain operator-safe during the pilot phase.',
      ],
    },
  },
};

export const sensingGoldenCasePreset: CaseIntakePreset = {
  id: 'remote-effluent-sensing-node-case',
  label: 'Autofill remote sensing node case',
  description:
    'Loads a remote effluent sensing scenario with drift, calibration, and early-field biology concerns so the deterministic path covers the sensing objective end to end.',
  sourceReference: `Mapped from ${sensingGoldenCaseSourcePath}.`,
  focusAreas: [
    'calibration stability',
    'false-alarm defensibility',
    'remote maintenance cadence',
  ],
  expectedRecommendationIds: ['rec-data-closure', 'imp_001', 'imp_004'],
  formValues: {
    caseId: 'SENSE-NODE-004',
    technologyFamily: 'microbial_fuel_cell',
    architectureFamily: 'miniaturized_single_chamber',
    primaryObjective: 'sensing',
    deploymentContext:
      'remote effluent bypass loop with weekly maintenance visits',
    decisionHorizon: 'field validation sprint',
    currentTrl: 'field',
    painPoints:
      'signal drift, sparse calibration records, biofilm startup inconsistency',
    influentType: 'municipal secondary effluent',
    substrateProfile:
      'low-strength effluent with intermittent nitrate and cleaning chemical interference',
    temperature: '22',
    ph: '7.4',
    conductivity: '3.1',
    hydraulicRetentionTime: '6',
    preferredSuppliers: 'Hach, Xylem Analytics, OpenCell Systems',
    currentSuppliers: '',
    membranePresence: 'absent',
    assumptionsNote:
      'Weekly maintenance visits remain available during the validation sprint.',
    evidenceType: 'internal_benchmark',
    evidenceTitle: sensingEvidenceTitle,
    evidenceSummary: sensingEvidenceSummary,
    evidenceStrength: 'moderate',
  },
  payload: {
    case_id: 'SENSE-NODE-004',
    case_metadata: {
      preset_id: 'remote-effluent-sensing-node-case',
      source_domain_case: sensingGoldenCaseSourcePath,
    },
    technology_family: 'microbial_fuel_cell',
    architecture_family: 'miniaturized_single_chamber',
    primary_objective: 'sensing',
    business_context: {
      decision_horizon: 'field validation sprint',
      deployment_context:
        'remote effluent bypass loop with weekly maintenance visits',
      priorities: [
        'calibration_stability',
        'false_alarm_control',
        'remote_maintenance',
      ],
      hard_constraints: [
        'no_daily_operator_intervention',
        'sensor_node_must_fit_existing_cabinet_envelope',
      ],
      local_energy_cost_note:
        'Low-power operation matters more than peak energy offset.',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'medium',
      serviceability_priority: 'high',
    },
    technology_context: {
      current_trl: 'field',
      scale_context: 'field',
      current_pain_points: [
        'signal drift',
        'sparse calibration records',
        'biofilm startup inconsistency',
      ],
      performance_claims_under_review: ['continuous nitrate spike detection'],
      target_maturity_window: 'field_validation_sprint',
      membrane_presence: 'absent',
    },
    feed_and_operation: {
      influent_type: 'municipal secondary effluent',
      substrate_profile:
        'low-strength effluent with intermittent nitrate and cleaning chemical interference',
      influent_cod_mg_per_l: 120,
      pH: 7.4,
      temperature_c: 22,
      conductivity_ms_per_cm: 3.1,
      hydraulic_retention_time_h: 6,
      salinity_or_conductivity_context:
        'Signal defensibility remains sensitive to low-conductivity swings and cleaning events.',
      operating_regime:
        'remote bypass loop with intermittent maintenance visits',
    },
    stack_blocks: {
      reactor_architecture: {
        architecture_type: 'miniaturized_single_chamber',
        solids_tolerance: 'low',
        serviceability_level: 'medium',
        membrane_presence: 'absent',
      },
      anode_biofilm_support: {
        material_family: 'carbon cloth',
        surface_treatment:
          'compact enclosure fit prioritized over excess surface reserve',
        biofilm_support_level: 'medium',
      },
      cathode_catalyst_support: {
        reaction_target: 'ORR',
        catalyst_family: 'air cathode',
        mass_transport_limitation_risk: 'low',
        gas_handling_interface:
          'signal stability matters more than power export',
      },
      membrane_or_separator: {
        type: 'spacer_only',
        fouling_risk: 'low',
        crossover_control_level: 'low',
      },
      electrical_interconnect_and_sealing: {
        current_collection_strategy: 'compact board-level interconnect',
        sealing_strategy: 'cabinet moisture control remains important',
        corrosion_protection_level: 'medium',
      },
      balance_of_plant: {
        flow_control: 'manual',
        gas_handling_readiness: 'low',
        dosing_capability: 'unknown',
        bop_summary:
          'passive bypass loop with periodic manual calibration checks',
      },
      sensors_and_analytics: {
        data_quality: 'low',
        voltage_current_logging: 'manual drift checks only',
        water_quality_coverage:
          'sparse field checks without locked calibration windows',
      },
      operational_biology: {
        biofilm_maturity: 'early',
        contamination_risk: 'medium',
        inoculum_source: 'municipal sludge seed retained between site visits',
        startup_protocol:
          'field startup repeatability remains sensitive to storage and cleaning intervals',
      },
    },
    measured_metrics: {
      current_density_a_m2: 28,
      power_density_w_m2: 9,
      internal_resistance_ohm: 18,
    },
    missing_data: [
      'calibration_interval_reference',
      'interference_screening',
      'baseline_noise_window',
    ],
    evidence_refs: ['internal:remote-effluent-sensing-calibration-review'],
    evidence_records: [
      {
        evidence_type: 'internal_benchmark',
        title: sensingEvidenceTitle,
        summary: sensingEvidenceSummary,
        applicability_scope: {
          architecture_family: 'miniaturized_single_chamber',
          primary_objective: 'sensing',
          deployment_context:
            'remote effluent bypass loop with weekly maintenance visits',
        },
        strength_level: 'moderate',
        provenance_note:
          'Captured from the remote sensing-node golden reference and attached as typed evidence for the intake preset.',
        quantitative_metrics: {
          current_density_a_m2: 28,
          power_density_w_m2: 9,
        },
        operating_conditions: {
          temperature_c: 22,
          pH: 7.4,
          conductivity_ms_per_cm: 3.1,
          hydraulic_retention_time_h: 6,
        },
        block_mapping: [
          'anode_biofilm_support',
          'sensors_and_analytics',
          'operational_biology',
        ],
        limitations: [
          'Calibration cadence is not yet locked.',
          'Interference screening across cleaning events is incomplete.',
        ],
        contradiction_notes: [
          'Remote alert claims remain sensitive to low data quality and early-field biology.',
        ],
        benchmark_context:
          'Remote effluent sensing review derived from the canonical field-node reference',
        tags: ['golden-case', 'sensing', 'remote-node'],
      },
    ],
    assumptions: [
      'Weekly maintenance visits remain available during the validation sprint.',
    ],
    supplier_context: {
      current_suppliers: [],
      preferred_suppliers: ['Hach', 'Xylem Analytics', 'OpenCell Systems'],
      excluded_suppliers: [],
      supplier_preference_notes:
        'Prefer serviceable field instrumentation with clear calibration support.',
    },
    normalization_status: {
      defaults_used: [],
      missing_data: [
        'calibration_interval_reference',
        'interference_screening',
        'baseline_noise_window',
      ],
      assumptions: [
        'Weekly maintenance visits remain available during the validation sprint.',
      ],
    },
  },
};

export const biogasSynergyGoldenCasePreset: CaseIntakePreset = {
  id: 'biogas-synergy-polishing-case',
  label: 'Autofill biogas synergy polishing case',
  description:
    'Loads a hybrid digester-polishing scenario with acclimation lag, methane-slip closure, and integration-risk uncertainty so the deterministic path covers the biogas synergy objective.',
  sourceReference: `Mapped from ${biogasSynergyGoldenCaseSourcePath}.`,
  focusAreas: [
    'methane-slip closure',
    'polishing-loop integration',
    'upset recovery behavior',
  ],
  expectedRecommendationIds: ['rec-data-closure', 'imp_001'],
  formValues: {
    caseId: 'BIOGAS-SYN-005',
    technologyFamily: 'microbial_electrochemical_technology',
    architectureFamily: 'hybrid_digester_polishing_loop',
    primaryObjective: 'biogas_synergy',
    deploymentContext:
      'digestate polishing loop coupled to digester recirculation windows',
    decisionHorizon: 'polishing integration review',
    currentTrl: 'pilot',
    painPoints:
      'biofilm acclimation lag, methane-slip attribution unclear, polishing control windows not closed',
    influentType: 'digestate polishing sidestream',
    substrateProfile:
      'partially stabilized digestate with sulfide excursions during upset recovery',
    temperature: '34',
    ph: '7.8',
    conductivity: '14',
    hydraulicRetentionTime: '14',
    preferredSuppliers:
      'Veolia Water Technologies, Evoqua Water Technologies, BioVolt Process',
    currentSuppliers: '',
    membranePresence: 'present',
    assumptionsNote:
      'Polishing value remains subordinate to digester stability during early integration.',
    evidenceType: 'internal_benchmark',
    evidenceTitle: biogasSynergyEvidenceTitle,
    evidenceSummary: biogasSynergyEvidenceSummary,
    evidenceStrength: 'moderate',
  },
  payload: {
    case_id: 'BIOGAS-SYN-005',
    case_metadata: {
      preset_id: 'biogas-synergy-polishing-case',
      source_domain_case: biogasSynergyGoldenCaseSourcePath,
    },
    technology_family: 'microbial_electrochemical_technology',
    architecture_family: 'hybrid_digester_polishing_loop',
    primary_objective: 'biogas_synergy',
    business_context: {
      decision_horizon: 'polishing integration review',
      deployment_context:
        'digestate polishing loop coupled to digester recirculation windows',
      priorities: [
        'methane_slip_control',
        'polishing_value',
        'phased_integration',
      ],
      hard_constraints: [
        'digester_uptime_must_not_be_compromised',
        'polishing_loop_must_fit_existing_gas_handling_plan',
      ],
      local_energy_cost_note:
        'Synergy value depends on avoiding new parasitic load peaks.',
      capex_constraint_level: 'medium',
      opex_sensitivity_level: 'medium',
      serviceability_priority: 'high',
    },
    technology_context: {
      current_trl: 'pilot',
      scale_context: 'pilot',
      current_pain_points: [
        'biofilm acclimation lag',
        'methane-slip attribution unclear',
        'polishing control windows not closed',
      ],
      performance_claims_under_review: [
        'hybrid polishing value without compromising digester uptime',
      ],
      target_maturity_window: 'polishing_integration_review',
      membrane_presence: 'present',
    },
    feed_and_operation: {
      influent_type: 'digestate polishing sidestream',
      substrate_profile:
        'partially stabilized digestate with sulfide excursions during upset recovery',
      influent_cod_mg_per_l: 1400,
      pH: 7.8,
      temperature_c: 34,
      conductivity_ms_per_cm: 14,
      hydraulic_retention_time_h: 14,
      salinity_or_conductivity_context:
        'Polishing value remains sensitive to sulfide swings and integration timing.',
      operating_regime:
        'hybrid polishing loop with digestate recirculation windows',
    },
    stack_blocks: {
      reactor_architecture: {
        architecture_type: 'hybrid_digester_polishing_loop',
        solids_tolerance: 'medium',
        serviceability_level: 'medium',
        membrane_presence: 'present',
      },
      anode_biofilm_support: {
        material_family: 'granular_carbon_composite',
        surface_treatment:
          'robust packing prioritized over aggressive specific surface area targets',
        biofilm_support_level: 'medium',
      },
      cathode_catalyst_support: {
        reaction_target: 'ORR',
        catalyst_family: 'oxygen_reduction_cathode',
        mass_transport_limitation_risk: 'medium',
        gas_handling_interface:
          'synergy objective is tied to stable polishing more than peak power',
      },
      membrane_or_separator: {
        type: 'cation_exchange_membrane',
        fouling_risk: 'medium',
        crossover_control_level: 'medium',
      },
      electrical_interconnect_and_sealing: {
        current_collection_strategy: 'stainless bus with service disconnects',
        sealing_strategy:
          'maintenance plan exists but not stress-tested under upset frequency',
        corrosion_protection_level: 'medium',
      },
      balance_of_plant: {
        flow_control: 'recirculation_loop',
        gas_handling_readiness: 'medium',
        dosing_capability: 'present',
        bop_summary:
          'hybrid polishing loop with digestate recirculation, staged gas handling, and periodic nutrient trim',
      },
      sensors_and_analytics: {
        data_quality: 'medium',
        voltage_current_logging: 'periodic electrical logging',
        water_quality_coverage:
          'polishing performance visible but methane-slip attribution remains indirect',
      },
      operational_biology: {
        biofilm_maturity: 'unknown',
        contamination_risk: 'medium',
        inoculum_source:
          'digester-adjacent biomass with slow recovery after sulfide shocks',
        startup_protocol:
          'acclimation lag remains material after process restarts',
      },
    },
    measured_metrics: {
      current_density_a_m2: 46,
      power_density_w_m2: 32,
      internal_resistance_ohm: 31,
      cod_removal_pct: 47,
    },
    missing_data: [
      'methane_slip_mass_balance',
      'polishing_energy_baseline',
      'sulfide_upset_response',
    ],
    evidence_refs: ['internal:digester-polishing-biogas-synergy-review'],
    evidence_records: [
      {
        evidence_type: 'internal_benchmark',
        title: biogasSynergyEvidenceTitle,
        summary: biogasSynergyEvidenceSummary,
        applicability_scope: {
          architecture_family: 'hybrid_digester_polishing_loop',
          primary_objective: 'biogas_synergy',
          deployment_context:
            'digestate polishing loop coupled to digester recirculation windows',
        },
        strength_level: 'moderate',
        provenance_note:
          'Captured from the biogas-synergy golden reference and attached as typed evidence for the intake preset.',
        quantitative_metrics: {
          current_density_a_m2: 46,
          power_density_w_m2: 32,
          cod_removal_pct: 47,
        },
        operating_conditions: {
          temperature_c: 34,
          pH: 7.8,
          conductivity_ms_per_cm: 14,
          hydraulic_retention_time_h: 14,
        },
        block_mapping: [
          'anode_biofilm_support',
          'balance_of_plant',
          'operational_biology',
        ],
        limitations: [
          'Methane-slip attribution is not yet closed.',
          'Upset recovery remains assumption-sensitive.',
        ],
        contradiction_notes: [
          'Polishing value remains subordinate to digester stability during early integration.',
        ],
        benchmark_context:
          'Hybrid polishing review derived from the canonical biogas-synergy reference',
        tags: ['golden-case', 'biogas-synergy', 'hybrid-polishing'],
      },
    ],
    assumptions: [
      'Polishing value remains subordinate to digester stability during early integration.',
    ],
    supplier_context: {
      current_suppliers: [],
      preferred_suppliers: [
        'Veolia Water Technologies',
        'Evoqua Water Technologies',
        'BioVolt Process',
      ],
      excluded_suppliers: [],
      supplier_preference_notes:
        'Prefer integration partners that can support digester uptime and polishing serviceability.',
    },
    normalization_status: {
      defaults_used: [],
      missing_data: [
        'methane_slip_mass_balance',
        'polishing_energy_baseline',
        'sulfide_upset_response',
      ],
      assumptions: [
        'Polishing value remains subordinate to digester stability during early integration.',
      ],
    },
  },
};

export const caseIntakePresets: CaseIntakePreset[] = [
  wastewaterGoldenCasePreset,
  nitrogenRecoveryGoldenCasePreset,
  hydrogenRecoveryGoldenCasePreset,
  sensingGoldenCasePreset,
  biogasSynergyGoldenCasePreset,
];

export function findCaseIntakePreset(
  presetId: string | null | undefined,
): CaseIntakePreset | undefined {
  if (!presetId) {
    return undefined;
  }

  return caseIntakePresets.find((preset) => preset.id === presetId);
}
