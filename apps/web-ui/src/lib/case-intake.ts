import type {
  ExternalEvidenceCatalogItemSummary,
  RawCaseInput,
  ResearchDecisionIngestionPreview,
} from '@metrev/domain-contracts';

type EvidenceRecordInput = NonNullable<
  RawCaseInput['evidence_records']
>[number];

type ParameterStateInput = NonNullable<RawCaseInput['parameter_state']>[string];

export type CaseIntakeParameterFieldId =
  | 'reactorArchitectureType'
  | 'reactorSolidsTolerance'
  | 'reactorServiceabilityLevel'
  | 'operatingRegime'
  | 'influentType'
  | 'substrateProfile'
  | 'temperature'
  | 'ph'
  | 'conductivity'
  | 'hydraulicRetentionTime'
  | 'membranePresence'
  | 'anodeMaterialFamily'
  | 'anodeSurfaceTreatment'
  | 'anodeBiofilmSupportLevel'
  | 'cathodeReactionTarget'
  | 'cathodeCatalystFamily'
  | 'cathodeMassTransportLimitationRisk'
  | 'cathodeGasHandlingInterface'
  | 'membraneSeparatorType'
  | 'membraneFoulingRisk'
  | 'membraneCrossoverControlLevel'
  | 'electricalCurrentCollectionStrategy'
  | 'electricalSealingStrategy'
  | 'electricalCorrosionProtectionLevel'
  | 'balanceFlowControl'
  | 'balanceGasHandlingReadiness'
  | 'balanceDosingCapability'
  | 'balanceSummary'
  | 'sensorsDataQuality'
  | 'sensorsVoltageCurrentLogging'
  | 'sensorsWaterQualityCoverage'
  | 'biologyBiofilmMaturity'
  | 'biologyContaminationRisk'
  | 'biologyInoculumSource'
  | 'biologyStartupProtocol';

export type CaseIntakeParameterMode = 'client' | 'system_default' | 'exclude';

export type CaseIntakeParameterModeMap = Partial<
  Record<CaseIntakeParameterFieldId, CaseIntakeParameterMode>
>;

interface CaseIntakeParameterConfig {
  confidenceImpact: NonNullable<ParameterStateInput['confidence_impact']>;
  defaultRationale?: string;
  defaultValue?: string | number | boolean | null;
  field: CaseIntakeParameterFieldId;
  getPayloadValue: (
    input: RawCaseInput,
  ) => string | number | boolean | null | undefined;
  clearPayloadValue: (input: RawCaseInput) => void;
  label: string;
  parameterKey: string;
  setPayloadValue: (
    input: RawCaseInput,
    value: string | number | boolean | null | undefined,
  ) => void;
  unit?: string;
}

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
  mechanisticModelJson: string;
  componentModelParametersJson: string;
  biosensorConfigurationJson: string;
  wastewaterQualityJson: string;
  parameterModes?: CaseIntakeParameterModeMap;
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
  mechanisticModelJson: '',
  componentModelParametersJson: '',
  biosensorConfigurationJson: '',
  wastewaterQualityJson: '',
  parameterModes: {},
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

export type AdvancedInputJsonField =
  | 'mechanisticModelJson'
  | 'componentModelParametersJson'
  | 'biosensorConfigurationJson'
  | 'wastewaterQualityJson';

export function validateAdvancedInputJson(
  values: Partial<Pick<CaseIntakeFormValues, AdvancedInputJsonField>>,
): Partial<Record<AdvancedInputJsonField, string>> {
  const errors: Partial<Record<AdvancedInputJsonField, string>> = {};
  for (const field of [
    'mechanisticModelJson',
    'componentModelParametersJson',
    'biosensorConfigurationJson',
    'wastewaterQualityJson',
  ] as const) {
    const text = (values[field] ?? '').trim();
    if (!text) continue;
    try {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        errors[field] = 'Enter a JSON object.';
      }
    } catch {
      errors[field] = 'JSON is incomplete or invalid.';
    }
  }
  return errors;
}

function readJsonObject(text: string): Record<string, unknown> | undefined {
  if (!text.trim()) return undefined;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function compactOptionalObjects(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(compactOptionalObjects)
      .filter((entry) => entry !== undefined);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => [key, compactOptionalObjects(entry)] as const)
    .filter(([, entry]) => entry !== undefined);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function mapWastewaterQualityToMechanisticInput(
  input: RawCaseInput,
  quality: Record<string, unknown>,
  technologyFamily: string,
): void {
  const systemType =
    technologyFamily === 'microbial_electrolysis_cell' ? 'MEC' : 'MFC';
  if (
    technologyFamily !== 'microbial_fuel_cell' &&
    technologyFamily !== 'microbial_electrolysis_cell'
  ) {
    return;
  }

  const currentModel = input.mechanistic_model as
    | (Record<string, unknown> & { operation?: Record<string, unknown> })
    | undefined;
  const operation = { ...(currentModel?.operation ?? {}) };
  const mappings = [
    {
      sourceField: 'cod_mg_cod_l',
      acceptedUnits: ['mgCOD/L'],
      targetField: 'influent_cod_kg_m3',
      targetUnit: 'kgCOD/m3',
      normalize: (value: number) => value * 0.001,
      rule: 'wastewater.cod.mg_cod_l_to_kg_cod_m3.v1',
    },
    {
      sourceField: 'temperature_c',
      acceptedUnits: ['C', '°C'],
      targetField: 'temperature_k',
      targetUnit: 'K',
      normalize: (value: number) => value + 273.15,
      rule: 'wastewater.temperature.c_to_k.v1',
    },
    {
      sourceField: 'ph',
      acceptedUnits: ['pH'],
      targetField: 'influent_ph',
      targetUnit: 'pH',
      normalize: (value: number) => value,
      rule: 'wastewater.ph.identity.v1',
    },
    {
      sourceField: 'conductivity_ms_per_cm',
      acceptedUnits: ['mS/cm'],
      targetField: 'electrolyte_conductivity_s_m',
      targetUnit: 'S/m',
      normalize: (value: number) => value * 0.1,
      rule: 'wastewater.conductivity.ms_cm_to_s_m.v1',
    },
  ];
  let mappedAny = false;

  for (const mapping of mappings) {
    if (operation[mapping.targetField]) continue;
    const rawValue = quality[mapping.sourceField];
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
      continue;
    }
    const source = rawValue as Record<string, unknown>;
    if (
      typeof source.value !== 'number' ||
      !Number.isFinite(source.value) ||
      typeof source.unit !== 'string' ||
      !mapping.acceptedUnits.includes(source.unit) ||
      typeof source.source_kind !== 'string' ||
      typeof source.source_ref !== 'string' ||
      source.source_ref.trim().length === 0
    ) {
      continue;
    }
    operation[mapping.targetField] = {
      ...source,
      value: Number(mapping.normalize(source.value).toPrecision(12)),
      unit: mapping.targetUnit,
      original_value: source.value,
      original_unit: source.unit,
      normalization_rule_id: mapping.rule,
      ...(typeof source.uncertainty === 'number'
        ? {
            uncertainty: Number(
              Math.abs(
                mapping.normalize(source.uncertainty) - mapping.normalize(0),
              ).toPrecision(12),
            ),
            uncertainty_unit: mapping.targetUnit,
          }
        : {}),
    };
    mappedAny = true;
  }

  if (mappedAny) {
    input.mechanistic_model = {
      ...currentModel,
      model_version: currentModel?.model_version ?? 'coupled-0d-dae-v1',
      system_type: currentModel?.system_type ?? systemType,
      operation,
    } as NonNullable<RawCaseInput['mechanistic_model']>;
  }
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

function formatParameterAuditValue(
  value: string | number | boolean | null | undefined,
  unit?: string,
): string {
  if (value === null || typeof value === 'undefined') {
    return unit ? `unset ${unit}` : 'unset';
  }

  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }

  return unit ? `${value} ${unit}` : String(value);
}

function isBlankParameterValue(
  value: string | number | boolean | null | undefined,
): boolean {
  return (
    value === null ||
    typeof value === 'undefined' ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

export const caseIntakeParameterConfigs: Record<
  CaseIntakeParameterFieldId,
  CaseIntakeParameterConfig
> = {
  reactorArchitectureType: {
    confidenceImpact: 'medium',
    field: 'reactorArchitectureType',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.reactor_architecture?.architecture_type,
      ),
    clearPayloadValue: (input) => {
      const reactorArchitecture = input.stack_blocks?.reactor_architecture;
      if (reactorArchitecture) {
        delete reactorArchitecture.architecture_type;
      }
    },
    label: 'Reactor architecture type',
    parameterKey: 'architecture_type',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const reactorArchitecture = (stackBlocks.reactor_architecture ??= {});
      reactorArchitecture.architecture_type =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  reactorSolidsTolerance: {
    confidenceImpact: 'medium',
    field: 'reactorSolidsTolerance',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.reactor_architecture?.solids_tolerance,
      ),
    clearPayloadValue: (input) => {
      const reactorArchitecture = input.stack_blocks?.reactor_architecture;
      if (reactorArchitecture) {
        delete reactorArchitecture.solids_tolerance;
      }
    },
    label: 'Solids tolerance',
    parameterKey: 'solids_tolerance',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const reactorArchitecture = (stackBlocks.reactor_architecture ??= {});
      reactorArchitecture.solids_tolerance =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  reactorServiceabilityLevel: {
    confidenceImpact: 'medium',
    field: 'reactorServiceabilityLevel',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.reactor_architecture?.serviceability_level,
      ),
    clearPayloadValue: (input) => {
      const reactorArchitecture = input.stack_blocks?.reactor_architecture;
      if (reactorArchitecture) {
        delete reactorArchitecture.serviceability_level;
      }
    },
    label: 'Serviceability level',
    parameterKey: 'serviceability_level',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const reactorArchitecture = (stackBlocks.reactor_architecture ??= {});
      reactorArchitecture.serviceability_level =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  operatingRegime: {
    confidenceImpact: 'medium',
    field: 'operatingRegime',
    getPayloadValue: (input) =>
      readStringValue(input.feed_and_operation?.operating_regime),
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.operating_regime;
      }
    },
    label: 'Operating regime',
    parameterKey: 'operating_regime',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.operating_regime =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  influentType: {
    confidenceImpact: 'medium',
    field: 'influentType',
    getPayloadValue: (input) =>
      readStringValue(input.feed_and_operation?.influent_type),
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.influent_type;
      }
    },
    label: 'Influent type',
    parameterKey: 'influent_type',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.influent_type =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  substrateProfile: {
    confidenceImpact: 'medium',
    field: 'substrateProfile',
    getPayloadValue: (input) =>
      readStringValue(input.feed_and_operation?.substrate_profile),
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.substrate_profile;
      }
    },
    label: 'Substrate profile',
    parameterKey: 'substrate_profile',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.substrate_profile =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  temperature: {
    confidenceImpact: 'medium',
    field: 'temperature',
    getPayloadValue: (input) => input.feed_and_operation?.temperature_c,
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.temperature_c;
      }
    },
    label: 'Temperature',
    parameterKey: 'temperature_c',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.temperature_c =
        typeof value === 'number'
          ? value
          : parseOptionalNumber(String(value ?? ''));
    },
    unit: 'C',
  },
  ph: {
    confidenceImpact: 'medium',
    field: 'ph',
    getPayloadValue: (input) => input.feed_and_operation?.pH,
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.pH;
      }
    },
    label: 'pH',
    parameterKey: 'pH',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.pH =
        typeof value === 'number'
          ? value
          : parseOptionalNumber(String(value ?? ''));
    },
    unit: 'unitless',
  },
  conductivity: {
    confidenceImpact: 'medium',
    field: 'conductivity',
    getPayloadValue: (input) =>
      input.feed_and_operation?.conductivity_ms_per_cm,
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.conductivity_ms_per_cm;
      }
    },
    label: 'Conductivity',
    parameterKey: 'conductivity_ms_per_cm',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.conductivity_ms_per_cm =
        typeof value === 'number'
          ? value
          : parseOptionalNumber(String(value ?? ''));
    },
    unit: 'mS/cm',
  },
  hydraulicRetentionTime: {
    confidenceImpact: 'medium',
    field: 'hydraulicRetentionTime',
    getPayloadValue: (input) =>
      input.feed_and_operation?.hydraulic_retention_time_h,
    clearPayloadValue: (input) => {
      if (input.feed_and_operation) {
        delete input.feed_and_operation.hydraulic_retention_time_h;
      }
    },
    label: 'Hydraulic retention time',
    parameterKey: 'hydraulic_retention_time_h',
    setPayloadValue: (input, value) => {
      const feedAndOperation = (input.feed_and_operation ??= {});
      feedAndOperation.hydraulic_retention_time_h =
        typeof value === 'number'
          ? value
          : parseOptionalNumber(String(value ?? ''));
    },
    unit: 'h',
  },
  membranePresence: {
    confidenceImpact: 'medium',
    defaultRationale:
      'Absence of clear membrane information should not be collapsed into present or absent.',
    defaultValue: 'unknown',
    field: 'membranePresence',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.reactor_architecture?.membrane_presence,
      ) || readStringValue(input.technology_context?.membrane_presence),
    clearPayloadValue: (input) => {
      if (input.technology_context) {
        delete input.technology_context.membrane_presence;
      }

      const reactorArchitecture = input.stack_blocks?.reactor_architecture;
      if (reactorArchitecture) {
        delete reactorArchitecture.membrane_presence;
      }
    },
    label: 'Membrane presence',
    parameterKey: 'membrane_presence',
    setPayloadValue: (input, value) => {
      const nextValue = typeof value === 'string' ? value : undefined;
      const technologyContext = (input.technology_context ??= {});
      technologyContext.membrane_presence = nextValue;
      const stackBlocks = (input.stack_blocks ??= {});
      const reactorArchitecture = (stackBlocks.reactor_architecture ??= {});
      reactorArchitecture.membrane_presence = nextValue;
    },
  },
  anodeMaterialFamily: {
    confidenceImpact: 'medium',
    field: 'anodeMaterialFamily',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.anode_biofilm_support?.material_family,
      ),
    clearPayloadValue: (input) => {
      const anodeBiofilmSupport = input.stack_blocks?.anode_biofilm_support;
      if (anodeBiofilmSupport) {
        delete anodeBiofilmSupport.material_family;
      }
    },
    label: 'Anode material family',
    parameterKey: 'anode_material_family',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const anodeBiofilmSupport = (stackBlocks.anode_biofilm_support ??= {});
      anodeBiofilmSupport.material_family =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  anodeSurfaceTreatment: {
    confidenceImpact: 'medium',
    field: 'anodeSurfaceTreatment',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.anode_biofilm_support?.surface_treatment,
      ),
    clearPayloadValue: (input) => {
      const anodeBiofilmSupport = input.stack_blocks?.anode_biofilm_support;
      if (anodeBiofilmSupport) {
        delete anodeBiofilmSupport.surface_treatment;
      }
    },
    label: 'Surface treatment',
    parameterKey: 'surface_treatment',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const anodeBiofilmSupport = (stackBlocks.anode_biofilm_support ??= {});
      anodeBiofilmSupport.surface_treatment =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  anodeBiofilmSupportLevel: {
    confidenceImpact: 'medium',
    field: 'anodeBiofilmSupportLevel',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.anode_biofilm_support?.biofilm_support_level,
      ),
    clearPayloadValue: (input) => {
      const anodeBiofilmSupport = input.stack_blocks?.anode_biofilm_support;
      if (anodeBiofilmSupport) {
        delete anodeBiofilmSupport.biofilm_support_level;
      }
    },
    label: 'Biofilm support level',
    parameterKey: 'biofilm_support_level',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const anodeBiofilmSupport = (stackBlocks.anode_biofilm_support ??= {});
      anodeBiofilmSupport.biofilm_support_level =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  cathodeReactionTarget: {
    confidenceImpact: 'medium',
    field: 'cathodeReactionTarget',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.cathode_catalyst_support?.reaction_target,
      ),
    clearPayloadValue: (input) => {
      const cathodeCatalystSupport =
        input.stack_blocks?.cathode_catalyst_support;
      if (cathodeCatalystSupport) {
        delete cathodeCatalystSupport.reaction_target;
      }
    },
    label: 'Reaction target',
    parameterKey: 'reaction_target',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const cathodeCatalystSupport = (stackBlocks.cathode_catalyst_support ??=
        {});
      cathodeCatalystSupport.reaction_target =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  cathodeCatalystFamily: {
    confidenceImpact: 'medium',
    field: 'cathodeCatalystFamily',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.cathode_catalyst_support?.catalyst_family,
      ),
    clearPayloadValue: (input) => {
      const cathodeCatalystSupport =
        input.stack_blocks?.cathode_catalyst_support;
      if (cathodeCatalystSupport) {
        delete cathodeCatalystSupport.catalyst_family;
      }
    },
    label: 'Cathode catalyst family',
    parameterKey: 'cathode_material_family',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const cathodeCatalystSupport = (stackBlocks.cathode_catalyst_support ??=
        {});
      cathodeCatalystSupport.catalyst_family =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  cathodeMassTransportLimitationRisk: {
    confidenceImpact: 'medium',
    field: 'cathodeMassTransportLimitationRisk',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.cathode_catalyst_support
          ?.mass_transport_limitation_risk,
      ),
    clearPayloadValue: (input) => {
      const cathodeCatalystSupport =
        input.stack_blocks?.cathode_catalyst_support;
      if (cathodeCatalystSupport) {
        delete cathodeCatalystSupport.mass_transport_limitation_risk;
      }
    },
    label: 'Mass-transport limitation risk',
    parameterKey: 'mass_transport_limitation_risk',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const cathodeCatalystSupport = (stackBlocks.cathode_catalyst_support ??=
        {});
      cathodeCatalystSupport.mass_transport_limitation_risk =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  cathodeGasHandlingInterface: {
    confidenceImpact: 'medium',
    field: 'cathodeGasHandlingInterface',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.cathode_catalyst_support?.gas_handling_interface,
      ),
    clearPayloadValue: (input) => {
      const cathodeCatalystSupport =
        input.stack_blocks?.cathode_catalyst_support;
      if (cathodeCatalystSupport) {
        delete cathodeCatalystSupport.gas_handling_interface;
      }
    },
    label: 'Gas-handling interface',
    parameterKey: 'gas_handling_interface',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const cathodeCatalystSupport = (stackBlocks.cathode_catalyst_support ??=
        {});
      cathodeCatalystSupport.gas_handling_interface =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  membraneSeparatorType: {
    confidenceImpact: 'medium',
    field: 'membraneSeparatorType',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.membrane_or_separator?.type),
    clearPayloadValue: (input) => {
      const membraneOrSeparator = input.stack_blocks?.membrane_or_separator;
      if (membraneOrSeparator) {
        delete membraneOrSeparator.type;
      }
    },
    label: 'Separator or membrane type',
    parameterKey: 'separator_family',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const membraneOrSeparator = (stackBlocks.membrane_or_separator ??= {});
      membraneOrSeparator.type =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  membraneFoulingRisk: {
    confidenceImpact: 'medium',
    field: 'membraneFoulingRisk',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.membrane_or_separator?.fouling_risk),
    clearPayloadValue: (input) => {
      const membraneOrSeparator = input.stack_blocks?.membrane_or_separator;
      if (membraneOrSeparator) {
        delete membraneOrSeparator.fouling_risk;
      }
    },
    label: 'Fouling risk',
    parameterKey: 'fouling_risk',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const membraneOrSeparator = (stackBlocks.membrane_or_separator ??= {});
      membraneOrSeparator.fouling_risk =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  membraneCrossoverControlLevel: {
    confidenceImpact: 'medium',
    field: 'membraneCrossoverControlLevel',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.membrane_or_separator?.crossover_control_level,
      ),
    clearPayloadValue: (input) => {
      const membraneOrSeparator = input.stack_blocks?.membrane_or_separator;
      if (membraneOrSeparator) {
        delete membraneOrSeparator.crossover_control_level;
      }
    },
    label: 'Crossover control level',
    parameterKey: 'crossover_control_level',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const membraneOrSeparator = (stackBlocks.membrane_or_separator ??= {});
      membraneOrSeparator.crossover_control_level =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  electricalCurrentCollectionStrategy: {
    confidenceImpact: 'medium',
    field: 'electricalCurrentCollectionStrategy',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.electrical_interconnect_and_sealing
          ?.current_collection_strategy,
      ),
    clearPayloadValue: (input) => {
      const electricalInterconnect =
        input.stack_blocks?.electrical_interconnect_and_sealing;
      if (electricalInterconnect) {
        delete electricalInterconnect.current_collection_strategy;
      }
    },
    label: 'Current collection strategy',
    parameterKey: 'current_collection_strategy',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const electricalInterconnect =
        (stackBlocks.electrical_interconnect_and_sealing ??= {});
      electricalInterconnect.current_collection_strategy =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  electricalSealingStrategy: {
    confidenceImpact: 'medium',
    field: 'electricalSealingStrategy',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.electrical_interconnect_and_sealing
          ?.sealing_strategy,
      ),
    clearPayloadValue: (input) => {
      const electricalInterconnect =
        input.stack_blocks?.electrical_interconnect_and_sealing;
      if (electricalInterconnect) {
        delete electricalInterconnect.sealing_strategy;
      }
    },
    label: 'Sealing strategy',
    parameterKey: 'sealing_strategy',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const electricalInterconnect =
        (stackBlocks.electrical_interconnect_and_sealing ??= {});
      electricalInterconnect.sealing_strategy =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  electricalCorrosionProtectionLevel: {
    confidenceImpact: 'medium',
    field: 'electricalCorrosionProtectionLevel',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.electrical_interconnect_and_sealing
          ?.corrosion_protection_level,
      ),
    clearPayloadValue: (input) => {
      const electricalInterconnect =
        input.stack_blocks?.electrical_interconnect_and_sealing;
      if (electricalInterconnect) {
        delete electricalInterconnect.corrosion_protection_level;
      }
    },
    label: 'Corrosion protection level',
    parameterKey: 'corrosion_protection_level',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const electricalInterconnect =
        (stackBlocks.electrical_interconnect_and_sealing ??= {});
      electricalInterconnect.corrosion_protection_level =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  balanceFlowControl: {
    confidenceImpact: 'medium',
    field: 'balanceFlowControl',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.balance_of_plant?.flow_control),
    clearPayloadValue: (input) => {
      const balanceOfPlant = input.stack_blocks?.balance_of_plant;
      if (balanceOfPlant) {
        delete balanceOfPlant.flow_control;
      }
    },
    label: 'Flow control',
    parameterKey: 'flow_control',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const balanceOfPlant = (stackBlocks.balance_of_plant ??= {});
      balanceOfPlant.flow_control =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  balanceGasHandlingReadiness: {
    confidenceImpact: 'medium',
    field: 'balanceGasHandlingReadiness',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.balance_of_plant?.gas_handling_readiness,
      ),
    clearPayloadValue: (input) => {
      const balanceOfPlant = input.stack_blocks?.balance_of_plant;
      if (balanceOfPlant) {
        delete balanceOfPlant.gas_handling_readiness;
      }
    },
    label: 'Gas-handling readiness',
    parameterKey: 'gas_handling_readiness',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const balanceOfPlant = (stackBlocks.balance_of_plant ??= {});
      balanceOfPlant.gas_handling_readiness =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  balanceDosingCapability: {
    confidenceImpact: 'medium',
    field: 'balanceDosingCapability',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.balance_of_plant?.dosing_capability),
    clearPayloadValue: (input) => {
      const balanceOfPlant = input.stack_blocks?.balance_of_plant;
      if (balanceOfPlant) {
        delete balanceOfPlant.dosing_capability;
      }
    },
    label: 'Dosing capability',
    parameterKey: 'dosing_capability',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const balanceOfPlant = (stackBlocks.balance_of_plant ??= {});
      balanceOfPlant.dosing_capability =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  balanceSummary: {
    confidenceImpact: 'medium',
    field: 'balanceSummary',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.balance_of_plant?.bop_summary),
    clearPayloadValue: (input) => {
      const balanceOfPlant = input.stack_blocks?.balance_of_plant;
      if (balanceOfPlant) {
        delete balanceOfPlant.bop_summary;
      }
    },
    label: 'Balance-of-plant summary',
    parameterKey: 'bop_summary',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const balanceOfPlant = (stackBlocks.balance_of_plant ??= {});
      balanceOfPlant.bop_summary =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  sensorsDataQuality: {
    confidenceImpact: 'medium',
    field: 'sensorsDataQuality',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.sensors_and_analytics?.data_quality),
    clearPayloadValue: (input) => {
      const sensorsAndAnalytics = input.stack_blocks?.sensors_and_analytics;
      if (sensorsAndAnalytics) {
        delete sensorsAndAnalytics.data_quality;
      }
    },
    label: 'Data quality',
    parameterKey: 'data_quality',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const sensorsAndAnalytics = (stackBlocks.sensors_and_analytics ??= {});
      sensorsAndAnalytics.data_quality =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  sensorsVoltageCurrentLogging: {
    confidenceImpact: 'medium',
    field: 'sensorsVoltageCurrentLogging',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.sensors_and_analytics?.voltage_current_logging,
      ),
    clearPayloadValue: (input) => {
      const sensorsAndAnalytics = input.stack_blocks?.sensors_and_analytics;
      if (sensorsAndAnalytics) {
        delete sensorsAndAnalytics.voltage_current_logging;
      }
    },
    label: 'Voltage / current logging',
    parameterKey: 'voltage_current_logging',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const sensorsAndAnalytics = (stackBlocks.sensors_and_analytics ??= {});
      sensorsAndAnalytics.voltage_current_logging =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  sensorsWaterQualityCoverage: {
    confidenceImpact: 'medium',
    field: 'sensorsWaterQualityCoverage',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.sensors_and_analytics?.water_quality_coverage,
      ),
    clearPayloadValue: (input) => {
      const sensorsAndAnalytics = input.stack_blocks?.sensors_and_analytics;
      if (sensorsAndAnalytics) {
        delete sensorsAndAnalytics.water_quality_coverage;
      }
    },
    label: 'Water-quality coverage',
    parameterKey: 'water_quality_coverage',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const sensorsAndAnalytics = (stackBlocks.sensors_and_analytics ??= {});
      sensorsAndAnalytics.water_quality_coverage =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  biologyBiofilmMaturity: {
    confidenceImpact: 'medium',
    field: 'biologyBiofilmMaturity',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.operational_biology?.biofilm_maturity,
      ),
    clearPayloadValue: (input) => {
      const operationalBiology = input.stack_blocks?.operational_biology;
      if (operationalBiology) {
        delete operationalBiology.biofilm_maturity;
      }
    },
    label: 'Biofilm maturity',
    parameterKey: 'biofilm_maturity',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const operationalBiology = (stackBlocks.operational_biology ??= {});
      operationalBiology.biofilm_maturity =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  biologyContaminationRisk: {
    confidenceImpact: 'medium',
    field: 'biologyContaminationRisk',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.operational_biology?.contamination_risk,
      ),
    clearPayloadValue: (input) => {
      const operationalBiology = input.stack_blocks?.operational_biology;
      if (operationalBiology) {
        delete operationalBiology.contamination_risk;
      }
    },
    label: 'Contamination risk',
    parameterKey: 'contamination_risk',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const operationalBiology = (stackBlocks.operational_biology ??= {});
      operationalBiology.contamination_risk =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  biologyInoculumSource: {
    confidenceImpact: 'medium',
    field: 'biologyInoculumSource',
    getPayloadValue: (input) =>
      readStringValue(input.stack_blocks?.operational_biology?.inoculum_source),
    clearPayloadValue: (input) => {
      const operationalBiology = input.stack_blocks?.operational_biology;
      if (operationalBiology) {
        delete operationalBiology.inoculum_source;
      }
    },
    label: 'Inoculum source',
    parameterKey: 'inoculum_source',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const operationalBiology = (stackBlocks.operational_biology ??= {});
      operationalBiology.inoculum_source =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
  biologyStartupProtocol: {
    confidenceImpact: 'medium',
    field: 'biologyStartupProtocol',
    getPayloadValue: (input) =>
      readStringValue(
        input.stack_blocks?.operational_biology?.startup_protocol,
      ),
    clearPayloadValue: (input) => {
      const operationalBiology = input.stack_blocks?.operational_biology;
      if (operationalBiology) {
        delete operationalBiology.startup_protocol;
      }
    },
    label: 'Startup protocol',
    parameterKey: 'startup_protocol',
    setPayloadValue: (input, value) => {
      const stackBlocks = (input.stack_blocks ??= {});
      const operationalBiology = (stackBlocks.operational_biology ??= {});
      operationalBiology.startup_protocol =
        typeof value === 'string' ? trimToUndefined(value) : undefined;
    },
  },
};

export function getCaseIntakeParameterMode(
  values: CaseIntakeFormValues,
  field: CaseIntakeParameterFieldId,
): CaseIntakeParameterMode {
  return values.parameterModes?.[field] ?? 'client';
}

function applyParameterStateToPayload(
  input: RawCaseInput,
  values: CaseIntakeFormValues,
): void {
  const parameterState: NonNullable<RawCaseInput['parameter_state']> = {};
  const assumptions = [...(input.assumptions ?? [])];
  const defaultsUsed = [...(input.defaults_used ?? [])];

  for (const config of Object.values(caseIntakeParameterConfigs)) {
    const mode = getCaseIntakeParameterMode(values, config.field);
    const currentValue = config.getPayloadValue(input);

    if (mode === 'client') {
      if (isBlankParameterValue(currentValue)) {
        continue;
      }

      parameterState[config.parameterKey] = {
        included: true,
        value_source: 'client',
        value: currentValue,
        ...(config.unit ? { unit: config.unit } : {}),
        confidence_impact: config.confidenceImpact,
        evidence_refs: [],
        audit_note: `${config.label} provided directly in client intake.`,
      };
      continue;
    }

    if (
      mode === 'system_default' &&
      typeof config.defaultValue !== 'undefined'
    ) {
      config.setPayloadValue(input, config.defaultValue);
      const defaultValue = config.getPayloadValue(input);

      parameterState[config.parameterKey] = {
        included: true,
        value_source: 'system_default',
        ...(typeof defaultValue !== 'undefined' ? { value: defaultValue } : {}),
        ...(config.unit ? { unit: config.unit } : {}),
        ...(config.defaultRationale
          ? { default_rationale: config.defaultRationale }
          : {}),
        confidence_impact: config.confidenceImpact,
        evidence_refs: [],
        audit_note: `${config.label} uses the system default for this run.`,
      };
      defaultsUsed.push(
        `${config.parameterKey}=${formatParameterAuditValue(defaultValue, config.unit)} (system default)`,
      );
      if (config.defaultRationale) {
        assumptions.push(`${config.label}: ${config.defaultRationale}`);
      }
      continue;
    }

    config.clearPayloadValue(input);
    parameterState[config.parameterKey] = {
      included: false,
      value_source: 'unset',
      ...(config.unit ? { unit: config.unit } : {}),
      ...(config.defaultRationale
        ? { default_rationale: config.defaultRationale }
        : {}),
      confidence_impact: config.confidenceImpact,
      evidence_refs: [],
      audit_note: `${config.label} was explicitly excluded from the current run input.`,
    };
    assumptions.push(
      `${config.label} was explicitly excluded from the current run input.`,
    );
  }

  input.parameter_state =
    Object.keys(parameterState).length > 0 ? parameterState : undefined;
  input.assumptions = dedupeStrings(assumptions);
  input.defaults_used = dedupeStrings(defaultsUsed);
}

export function normalizeCaseIntakeFormValues(
  values?: Partial<CaseIntakeFormValues>,
): CaseIntakeFormValues {
  return {
    ...defaultCaseIntakeFormValues,
    ...values,
    parameterModes: {
      ...defaultCaseIntakeFormValues.parameterModes,
      ...(values?.parameterModes ?? {}),
    },
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

  const parameterModes: CaseIntakeParameterModeMap = {
    ...(normalized.parameterModes ?? {}),
  };

  for (const config of Object.values(caseIntakeParameterConfigs)) {
    if (parameterModes[config.field]) {
      continue;
    }

    const presetState = presetPayload.parameter_state?.[config.parameterKey];
    if (presetState) {
      parameterModes[config.field] = !presetState.included
        ? 'exclude'
        : presetState.value_source === 'system_default'
          ? 'system_default'
          : 'client';
      continue;
    }

    if (!isBlankParameterValue(config.getPayloadValue(presetPayload))) {
      parameterModes[config.field] = 'client';
    }
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
    componentModelParametersJson:
      normalized.componentModelParametersJson ||
      (presetPayload.stack_blocks?.component_model_parameters
        ? JSON.stringify(
            presetPayload.stack_blocks.component_model_parameters,
            null,
            2,
          )
        : ''),
    parameterModes,
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

  const rawInput: RawCaseInput = {
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

  applyParameterStateToPayload(rawInput, values);

  const modelDraft = readJsonObject(values.mechanisticModelJson);
  if (modelDraft) {
    const inferredSystemType =
      values.technologyFamily === 'microbial_fuel_cell'
        ? 'MFC'
        : values.technologyFamily === 'microbial_electrolysis_cell'
          ? 'MEC'
          : undefined;
    rawInput.mechanistic_model = {
      ...rawInput.mechanistic_model,
      ...modelDraft,
      ...(!modelDraft.system_type &&
      !rawInput.mechanistic_model?.system_type &&
      inferredSystemType
        ? { system_type: inferredSystemType }
        : {}),
    } as NonNullable<RawCaseInput['mechanistic_model']>;
  }

  const componentModelParameters = readJsonObject(
    values.componentModelParametersJson,
  );
  if (componentModelParameters) {
    rawInput.stack_blocks = {
      ...(rawInput.stack_blocks ?? {}),
      component_model_parameters: componentModelParameters,
    };
  }

  const wastewaterQuality = readJsonObject(values.wastewaterQualityJson);
  if (wastewaterQuality) {
    rawInput.feed_and_operation = {
      ...(rawInput.feed_and_operation ?? {}),
      water_quality: {
        ...(rawInput.feed_and_operation?.water_quality ?? {}),
        ...wastewaterQuality,
      },
    };
    mapWastewaterQualityToMechanisticInput(
      rawInput,
      wastewaterQuality,
      values.technologyFamily,
    );
  }

  const biosensorDraft = readJsonObject(values.biosensorConfigurationJson);
  if (biosensorDraft) {
    const stackBlocks = (rawInput.stack_blocks ??= {});
    const sensors = (stackBlocks.sensors_and_analytics ??= {});
    sensors.biosensor = biosensorDraft as NonNullable<
      NonNullable<RawCaseInput['stack_blocks']>['sensors_and_analytics']
    >['biosensor'];
  }

  return compactOptionalObjects(rawInput) as RawCaseInput;
}

function focusedIntakeTemplate(input: {
  architecture: string;
  biosensor?: {
    deployment_mode: 'standalone' | 'mfc_integrated' | 'mec_integrated';
    power_source: 'external' | 'mfc_harvested' | 'mec_power_bus';
  };
  caseId: string;
  description: string;
  focusAreas: string[];
  id: string;
  label: string;
  objective: 'wastewater_treatment' | 'biosensing';
  technology: string;
}): CaseIntakePreset {
  const formValues: CaseIntakeFormValues = {
    ...defaultCaseIntakeFormValues,
    caseId: input.caseId,
    technologyFamily: input.technology,
    architectureFamily: input.architecture,
    primaryObjective: input.objective,
    deploymentContext: '',
    decisionHorizon: '',
    currentTrl: '',
    painPoints: '',
    influentType: '',
    substrateProfile: '',
    evidenceTitle: '',
    evidenceSummary: '',
  };
  const biosensor = input.biosensor
    ? {
        deployment_mode: input.biosensor.deployment_mode,
        power_source: input.biosensor.power_source,
      }
    : undefined;

  return {
    id: input.id,
    label: input.label,
    description: input.description,
    sourceReference:
      'Focused intake template only; it contains no measured or literature-derived performance values.',
    focusAreas: input.focusAreas,
    expectedRecommendationIds: [],
    formValues,
    payload: {
      case_id: input.caseId,
      case_metadata: {
        preset_id: input.id,
        template_scope: 'MFC_MEC_wastewater_electrochemical_biosensors',
      },
      technology_family: input.technology,
      architecture_family: input.architecture,
      primary_objective: input.objective,
      ...(biosensor
        ? {
            stack_blocks: {
              sensors_and_analytics: { biosensor },
            },
          }
        : {}),
      missing_data: input.biosensor
        ? [
            'biosensor.analyte_matrix_and_sampling_point',
            'biosensor.source_backed_calibration_and_performance',
            'biosensor.source_backed_power_budget',
            ...(input.biosensor.deployment_mode === 'standalone'
              ? []
              : ['mechanistic_model.complete_source_backed_MFC_or_MEC_inputs']),
          ]
        : [
            'wastewater.source_backed_influent_and_operating_conditions',
            'mechanistic_model.complete_source_backed_geometry_materials_kinetics_and_circuit',
          ],
    },
  };
}

export const focusedWastewaterMfcPreset = focusedIntakeTemplate({
  id: 'mfc-wastewater-model-inputs',
  label: 'MFC wastewater model inputs',
  description:
    'Starts an MFC wastewater-treatment case without fabricated measurements; supply wastewater samples, cell parameters, kinetics, and electrical boundaries.',
  caseId: 'MFC-WW-INPUT',
  technology: 'microbial_fuel_cell',
  objective: 'wastewater_treatment',
  architecture: 'MFC architecture to specify',
  focusAreas: [
    'influent characterization',
    'biofilm kinetics',
    'electrical output',
  ],
});

export const focusedWastewaterMecPreset = focusedIntakeTemplate({
  id: 'mec-wastewater-model-inputs',
  label: 'MEC wastewater model inputs',
  description:
    'Starts an MEC wastewater-treatment case; hydrogen is modeled as a secondary process output and requires separate Faradaic-yield and capture inputs.',
  caseId: 'MEC-WW-INPUT',
  technology: 'microbial_electrolysis_cell',
  objective: 'wastewater_treatment',
  architecture: 'MEC architecture to specify',
  focusAreas: [
    'influent characterization',
    'electrolysis boundary',
    'hydrogen capture',
  ],
});

export const standaloneWastewaterBiosensorPreset = focusedIntakeTemplate({
  id: 'standalone-wastewater-biosensor',
  label: 'Standalone wastewater biosensor',
  description:
    'Starts a separately powered electrochemical biosensor case for a stated wastewater analyte and matrix.',
  caseId: 'BIOSENSOR-STANDALONE',
  technology: 'electrochemical_biosensor',
  objective: 'biosensing',
  architecture: 'Standalone electrochemical biosensor',
  biosensor: { deployment_mode: 'standalone', power_source: 'external' },
  focusAreas: ['analyte and matrix', 'calibration', 'external power budget'],
});

export const mfcIntegratedWastewaterBiosensorPreset = focusedIntakeTemplate({
  id: 'mfc-integrated-wastewater-biosensor',
  label: 'MFC-integrated wastewater biosensor',
  description:
    'Starts an MFC wastewater-treatment case with an amperometric sensor powered from available MFC output.',
  caseId: 'MFC-WW-BIOSENSOR',
  technology: 'microbial_fuel_cell',
  objective: 'wastewater_treatment',
  architecture: 'MFC with integrated electrochemical biosensor',
  biosensor: {
    deployment_mode: 'mfc_integrated',
    power_source: 'mfc_harvested',
  },
  focusAreas: [
    'coupled wastewater process',
    'sensor calibration',
    'net power budget',
  ],
});

export const mecIntegratedWastewaterBiosensorPreset = focusedIntakeTemplate({
  id: 'mec-integrated-wastewater-biosensor',
  label: 'MEC-integrated wastewater biosensor',
  description:
    'Starts an MEC wastewater-treatment case with sensor demand accounted for on the externally powered MEC bus.',
  caseId: 'MEC-WW-BIOSENSOR',
  technology: 'microbial_electrolysis_cell',
  objective: 'wastewater_treatment',
  architecture: 'MEC with integrated electrochemical biosensor',
  biosensor: {
    deployment_mode: 'mec_integrated',
    power_source: 'mec_power_bus',
  },
  focusAreas: [
    'coupled wastewater process',
    'sensor calibration',
    'external bus budget',
  ],
});

export const caseIntakePresets: CaseIntakePreset[] = [
  focusedWastewaterMfcPreset,
  focusedWastewaterMecPreset,
  standaloneWastewaterBiosensorPreset,
  mfcIntegratedWastewaterBiosensorPreset,
  mecIntegratedWastewaterBiosensorPreset,
];

export function findCaseIntakePreset(
  presetId: string | null | undefined,
): CaseIntakePreset | undefined {
  if (!presetId) {
    return undefined;
  }

  return caseIntakePresets.find((preset) => preset.id === presetId);
}
