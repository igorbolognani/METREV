import { randomUUID } from 'node:crypto';

import {
  compactObject,
  dedupeStrings,
  isNonEmptyString,
  toNumberOrUndefined,
  toStringArray,
} from '@metrev/utils';

import { loadContractDefaultsPolicy, loadDomainCaseTemplate } from './loaders';
import {
  evidenceRecordSchema,
  normalizedCaseInputSchema,
  primaryObjectiveSchema,
  rawCaseInputSchema,
  technologyFamilySchema,
  type EvidenceRecord,
  type NormalizedCaseInput,
  type RawCaseInput,
} from './schemas';

type LooseRecord = Record<string, unknown>;

const defaultsPolicy = loadContractDefaultsPolicy().defaults_policy;
const defaultTrl = Number(
  defaultsPolicy.defaults['case.cross_cutting_layers.risk_and_maturity.trl']
    ?.default ?? 3,
);
const defaultDataQuality = String(
  defaultsPolicy.defaults[
    'case.stack_blocks.sensors_and_analytics.data_quality'
  ]?.default ?? 'medium',
);
const defaultBiofilmMaturity = String(
  defaultsPolicy.defaults[
    'case.stack_blocks.operational_biology.biofilm_maturity'
  ]?.default ?? 'unknown',
);
const defaultMaintenanceBurden = String(
  defaultsPolicy.defaults[
    'case.cross_cutting_layers.technoeconomics.maintenance_burden'
  ]?.default ?? 'medium',
);

const technologyFamilyAliases: Record<
  string,
  NormalizedCaseInput['technology_family']
> = {
  hybrid_or_other_met: 'microbial_electrochemical_technology',
};

const trlAliases: Record<string, number> = {
  research: 2,
  bench: 3,
  laboratory: 3,
  lab: 3,
  pilot: 5,
  demonstration: 7,
  demo: 7,
  full_scale: 8,
  commercial: 9,
};

function sanitizeNulls<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeNulls(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        entry === null ? undefined : sanitizeNulls(entry),
      ]),
    ) as T;
  }

  return value;
}

function ensureRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as LooseRecord)
    : {};
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeTechnologyFamily(
  value: unknown,
  defaultsUsed: string[],
  missingData: string[],
): NormalizedCaseInput['technology_family'] {
  const candidate = firstNonEmptyString(value) ?? 'microbial_fuel_cell';
  const parsed = technologyFamilySchema.safeParse(
    technologyFamilyAliases[candidate] ?? candidate,
  );

  if (parsed.success) {
    return parsed.data;
  }

  defaultsUsed.push('technology_family:invalid_input_fallback');
  missingData.push('technology_family');
  return 'microbial_electrochemical_technology';
}

function normalizePrimaryObjective(
  value: unknown,
  defaultsUsed: string[],
  missingData: string[],
): NormalizedCaseInput['primary_objective'] {
  const candidate = firstNonEmptyString(value) ?? 'wastewater_treatment';
  const parsed = primaryObjectiveSchema.safeParse(candidate);

  if (parsed.success) {
    return parsed.data;
  }

  defaultsUsed.push('primary_objective:invalid_input_fallback');
  missingData.push('primary_objective');
  return 'other';
}

function mergeStackBlock(
  rawBlock: unknown,
  templateBlock: unknown,
): LooseRecord {
  return compactObject({
    ...ensureRecord(templateBlock),
    ...ensureRecord(rawBlock),
  });
}

function normalizeMembranePresence(
  value: unknown,
): 'present' | 'absent' | 'unknown' {
  if (!isNonEmptyString(value)) {
    return 'unknown';
  }

  const lowered = value.toLowerCase();
  if (['present', 'yes', 'true', 'with_membrane'].includes(lowered)) {
    return 'present';
  }

  if (['absent', 'no', 'false', 'membraneless'].includes(lowered)) {
    return 'absent';
  }

  return 'unknown';
}

function inferScaleContext(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const lowered = value.toLowerCase();
  if (trlAliases[lowered]) {
    return lowered;
  }

  return value;
}

function normalizeTrl(
  value: unknown,
  defaultsUsed: string[],
  missingData: string[],
): number {
  const numeric = toNumberOrUndefined(value);
  if (numeric) {
    return Math.min(9, Math.max(1, Math.round(numeric)));
  }

  if (isNonEmptyString(value)) {
    const mapped = trlAliases[value.toLowerCase()];
    if (mapped) {
      return mapped;
    }

    defaultsUsed.push('technology_context.current_trl:invalid_input_fallback');
    missingData.push('technology_context.current_trl');
    return defaultTrl;
  }

  defaultsUsed.push(
    'cross_cutting_layers.risk_and_maturity.trl:contract_default',
  );
  return defaultTrl;
}

function inferEvidenceProfile(typedEvidence: EvidenceRecord[]): string {
  if (typedEvidence.length === 0) {
    return 'evidence_sparse';
  }

  const strongCount = typedEvidence.filter(
    (record) => record.strength_level === 'strong',
  ).length;

  if (strongCount >= 2) {
    return 'corroborated';
  }

  if (typedEvidence.length >= 2) {
    return 'mixed';
  }

  return 'single_source';
}

function inferSupplierClaimFraction(typedEvidence: EvidenceRecord[]): string {
  if (typedEvidence.length === 0) {
    return 'none';
  }

  const supplierClaims = typedEvidence.filter(
    (record) => record.evidence_type === 'supplier_claim',
  ).length;
  const ratio = supplierClaims / typedEvidence.length;

  if (ratio === 0) {
    return 'none';
  }

  if (ratio <= 0.34) {
    return 'low';
  }

  if (ratio <= 0.67) {
    return 'medium';
  }

  return 'high';
}

function normalizeEvidenceRecords(
  input: unknown,
  caseId: string,
  defaultsUsed: string[],
): EvidenceRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((entry, index) => {
    const rawRecord = ensureRecord(entry);
    const evidenceId =
      firstNonEmptyString(rawRecord.evidence_id) ??
      `${caseId}-evidence-${index + 1}`;

    if (!isNonEmptyString(rawRecord.evidence_id)) {
      defaultsUsed.push(`evidence_records[${index}].evidence_id:generated`);
    }

    return evidenceRecordSchema.parse({
      ...rawRecord,
      evidence_id: evidenceId,
      applicability_scope: ensureRecord(rawRecord.applicability_scope),
      quantitative_metrics: ensureRecord(rawRecord.quantitative_metrics),
      operating_conditions: ensureRecord(rawRecord.operating_conditions),
      block_mapping: toStringArray(rawRecord.block_mapping),
      limitations: toStringArray(rawRecord.limitations),
      contradiction_notes: toStringArray(rawRecord.contradiction_notes),
      tags: toStringArray(rawRecord.tags),
    });
  });
}

function inferFlowControl(summary: unknown): string {
  const text = firstNonEmptyString(summary)?.toLowerCase();

  if (!text) {
    return 'unknown';
  }

  if (text.includes('manual')) {
    return 'manual';
  }

  if (text.includes('recirculation')) {
    return 'recirculation_loop';
  }

  if (text.includes('pump')) {
    return 'pump_controlled';
  }

  return 'documented';
}

function inferDosingCapability(summary: unknown): string {
  const text = firstNonEmptyString(summary)?.toLowerCase();

  if (!text) {
    return 'unknown';
  }

  return text.includes('dosing') ? 'present' : 'documented';
}

function inferBiofilmMaturity(
  rawBlock: LooseRecord,
  painPoints: string[],
): string {
  const explicit = firstNonEmptyString(
    rawBlock.biofilm_maturity,
    rawBlock.biology_summary,
  );
  if (explicit) {
    return explicit;
  }

  const unstableStartup = painPoints.some((point) =>
    point.toLowerCase().includes('startup'),
  );

  return unstableStartup ? 'early' : defaultBiofilmMaturity;
}

function inferSensorCoverage(rawBlock: LooseRecord): string {
  if (
    firstNonEmptyString(
      rawBlock.water_quality_coverage,
      rawBlock.sensing_summary,
      rawBlock.diagnostics_summary,
    )
  ) {
    return 'documented';
  }

  return 'unknown';
}

function normalizeSupplierContext(input: unknown): LooseRecord {
  const rawContext = ensureRecord(input);

  return {
    current_suppliers: toStringArray(rawContext.current_suppliers),
    preferred_suppliers: toStringArray(rawContext.preferred_suppliers),
    excluded_suppliers: toStringArray(rawContext.excluded_suppliers),
    supplier_preference_notes: firstNonEmptyString(
      rawContext.supplier_preference_notes,
    ),
  };
}

function inferScaleUpRisk(
  scaleContext: string | undefined,
  flowControl: string,
): string {
  if (
    ['pilot', 'demo', 'demonstration', 'full_scale'].includes(
      scaleContext ?? '',
    )
  ) {
    return flowControl === 'unknown' ? 'high' : 'medium';
  }

  return 'medium';
}

function inferServiceabilityRisk(serviceabilityLevel: string): string {
  if (serviceabilityLevel === 'unknown') {
    return 'medium';
  }

  if (serviceabilityLevel === 'low') {
    return 'high';
  }

  return 'low';
}

export function createRawInputFromDomainTemplate(): RawCaseInput {
  return rawCaseInputSchema.parse(sanitizeNulls(loadDomainCaseTemplate()));
}

export function normalizeCaseInput(input: RawCaseInput): NormalizedCaseInput {
  const raw = rawCaseInputSchema.parse(input);
  const template = createRawInputFromDomainTemplate() as RawCaseInput;

  const businessContext = ensureRecord(
    raw.business_context ?? template.business_context,
  );
  const technologyContext = ensureRecord(
    raw.technology_context ?? template.technology_context,
  );
  const feedAndOperation = ensureRecord(
    raw.feed_and_operation ?? template.feed_and_operation,
  );
  const rawStackBlocks = ensureRecord(
    raw.stack_blocks ?? template.stack_blocks,
  );
  const templateStackBlocks = ensureRecord(template.stack_blocks);
  const normalizationStatus = ensureRecord(raw.normalization_status);
  const crossCuttingLayers = ensureRecord(raw.cross_cutting_layers);
  const supplierContext = normalizeSupplierContext(
    raw.supplier_context ??
      ensureRecord(crossCuttingLayers.risk_and_maturity).supplier_context ??
      template.supplier_context,
  );

  const defaultsUsed = toStringArray(raw.defaults_used).concat(
    toStringArray(normalizationStatus.defaults_used),
  );
  const assumptions = toStringArray(raw.assumptions).concat(
    toStringArray(normalizationStatus.assumptions),
  );
  const missingData = toStringArray(raw.missing_data).concat(
    toStringArray(normalizationStatus.missing_data),
  );

  const caseId = isNonEmptyString(raw.case_id) ? raw.case_id : randomUUID();
  if (!isNonEmptyString(raw.case_id)) {
    defaultsUsed.push('case_id:generated_uuid');
  }

  const typedEvidence = normalizeEvidenceRecords(
    raw.evidence_records,
    caseId,
    defaultsUsed,
  );

  const technologyFamilyInput =
    raw.technology_family ?? technologyContext.technology_family;
  const technologyFamily = normalizeTechnologyFamily(
    technologyFamilyInput ?? template.technology_context?.technology_family,
    defaultsUsed,
    missingData,
  );
  if (
    !isNonEmptyString(raw.technology_family) &&
    !isNonEmptyString(technologyContext.technology_family)
  ) {
    defaultsUsed.push('technology_family:domain_template_default');
  }

  const architectureFamilyInput =
    raw.architecture_family ??
    technologyContext.architecture_family ??
    template.technology_context?.architecture_family;
  const architectureFamily = isNonEmptyString(architectureFamilyInput)
    ? architectureFamilyInput
    : 'needs_classification';
  if (!isNonEmptyString(architectureFamilyInput)) {
    defaultsUsed.push('architecture_family:needs_classification');
    missingData.push('architecture_family');
  }

  const primaryObjectiveInput =
    raw.primary_objective ??
    businessContext.primary_objective ??
    template.business_context?.primary_objective;
  const primaryObjective = normalizePrimaryObjective(
    primaryObjectiveInput,
    defaultsUsed,
    missingData,
  );
  if (
    !isNonEmptyString(raw.primary_objective) &&
    !isNonEmptyString(businessContext.primary_objective)
  ) {
    defaultsUsed.push('primary_objective:domain_template_default');
  }

  const normalizedBusinessContext = compactObject({
    ...businessContext,
    primary_objective: primaryObjective,
    priorities: toStringArray(businessContext.priorities),
    hard_constraints: toStringArray(businessContext.hard_constraints),
  });

  const scaleContext =
    firstNonEmptyString(
      technologyContext.scale_context,
      inferScaleContext(technologyContext.current_trl),
    ) ?? undefined;
  if (!isNonEmptyString(technologyContext.scale_context) && scaleContext) {
    defaultsUsed.push('technology_context.scale_context:inferred_from_trl');
  }

  const normalizedTechnologyContext = compactObject({
    ...technologyContext,
    technology_family: technologyFamily,
    architecture_family: architectureFamily,
    scale_context: scaleContext,
    current_pain_points: toStringArray(technologyContext.current_pain_points),
    performance_claims_under_review: toStringArray(
      technologyContext.performance_claims_under_review,
    ),
  });

  const normalizedFeedAndOperation = compactObject({
    ...feedAndOperation,
    influent_cod_mg_per_l: toNumberOrUndefined(
      feedAndOperation.influent_cod_mg_per_l,
    ),
    pH: toNumberOrUndefined(feedAndOperation.pH),
    temperature_c: toNumberOrUndefined(feedAndOperation.temperature_c),
    conductivity_ms_per_cm: toNumberOrUndefined(
      feedAndOperation.conductivity_ms_per_cm,
    ),
    hydraulic_retention_time_h: toNumberOrUndefined(
      feedAndOperation.hydraulic_retention_time_h,
    ),
  });

  if (!isNonEmptyString(feedAndOperation.influent_type)) {
    missingData.push('feed_and_operation.influent_type');
    missingData.push('missing_operating_condition');
  }

  const rawReactorArchitecture = mergeStackBlock(
    rawStackBlocks.reactor_architecture,
    templateStackBlocks.reactor_architecture,
  );
  const rawAnodeBlock = mergeStackBlock(
    rawStackBlocks.anode_biofilm_support,
    templateStackBlocks.anode_biofilm_support,
  );
  const rawCathodeBlock = mergeStackBlock(
    rawStackBlocks.cathode_catalyst_support,
    templateStackBlocks.cathode_catalyst_support,
  );
  const rawMembraneBlock = mergeStackBlock(
    rawStackBlocks.membrane_or_separator,
    templateStackBlocks.membrane_or_separator,
  );
  const rawElectricalBlock = mergeStackBlock(
    rawStackBlocks.electrical_interconnect_and_sealing,
    templateStackBlocks.electrical_interconnect_and_sealing,
  );
  const rawBalanceBlock = mergeStackBlock(
    rawStackBlocks.balance_of_plant,
    templateStackBlocks.balance_of_plant,
  );
  const rawSensorsBlock = mergeStackBlock(
    rawStackBlocks.sensors_and_analytics,
    templateStackBlocks.sensors_and_analytics,
  );
  const rawBiologyBlock = mergeStackBlock(
    rawStackBlocks.operational_biology,
    templateStackBlocks.operational_biology,
  );

  const sensorDataQuality =
    firstNonEmptyString(rawSensorsBlock.data_quality) ?? defaultDataQuality;
  if (!isNonEmptyString(rawSensorsBlock.data_quality)) {
    defaultsUsed.push(
      'stack_blocks.sensors_and_analytics.data_quality:contract_default',
    );
    missingData.push('missing_sensor_coverage');
  }

  const biofilmMaturity = inferBiofilmMaturity(
    rawBiologyBlock,
    toStringArray(technologyContext.current_pain_points),
  );
  if (!isNonEmptyString(rawBiologyBlock.biofilm_maturity)) {
    defaultsUsed.push(
      'stack_blocks.operational_biology.biofilm_maturity:inferred_or_defaulted',
    );
  }

  const membranePresence = normalizeMembranePresence(
    technologyContext.membrane_presence ??
      rawReactorArchitecture.membrane_presence,
  );
  const flowControl =
    firstNonEmptyString(rawBalanceBlock.flow_control) ??
    inferFlowControl(rawBalanceBlock.bop_summary);
  const serviceabilityLevel =
    firstNonEmptyString(
      rawReactorArchitecture.serviceability_level,
      businessContext.serviceability_priority,
    ) ?? 'unknown';

  const normalizedStackBlocks = {
    reactor_architecture: compactObject({
      ...rawReactorArchitecture,
      architecture_type:
        firstNonEmptyString(
          rawReactorArchitecture.architecture_type,
          rawReactorArchitecture.family,
        ) ?? architectureFamily,
      solids_tolerance:
        firstNonEmptyString(rawReactorArchitecture.solids_tolerance) ??
        'unknown',
      serviceability_level: serviceabilityLevel,
      membrane_presence: membranePresence,
    }),
    anode_biofilm_support: compactObject({
      ...rawAnodeBlock,
      material_family:
        firstNonEmptyString(rawAnodeBlock.material_family) ?? 'unknown',
      surface_treatment:
        firstNonEmptyString(
          rawAnodeBlock.surface_treatment,
          rawAnodeBlock.surface_note,
        ) ?? 'unknown',
      biofilm_support_level:
        firstNonEmptyString(rawAnodeBlock.biofilm_support_level) ?? 'unknown',
    }),
    cathode_catalyst_support: compactObject({
      ...rawCathodeBlock,
      reaction_target:
        firstNonEmptyString(rawCathodeBlock.reaction_target) ??
        (primaryObjective === 'hydrogen_recovery' ? 'HER' : 'ORR'),
      catalyst_family:
        firstNonEmptyString(
          rawCathodeBlock.catalyst_family,
          rawCathodeBlock.material_family,
          rawCathodeBlock.catalyst_note,
        ) ?? 'unknown',
      mass_transport_limitation_risk:
        firstNonEmptyString(rawCathodeBlock.mass_transport_limitation_risk) ??
        'medium',
      gas_handling_interface:
        firstNonEmptyString(
          rawCathodeBlock.gas_handling_interface,
          rawCathodeBlock.product_side_note,
        ) ?? 'unknown',
    }),
    membrane_or_separator: compactObject({
      ...rawMembraneBlock,
      type:
        firstNonEmptyString(rawMembraneBlock.type, rawMembraneBlock.family) ??
        'unknown',
      fouling_risk:
        firstNonEmptyString(rawMembraneBlock.fouling_risk) ?? 'unknown',
      crossover_control_level:
        firstNonEmptyString(rawMembraneBlock.crossover_control_level) ??
        'unknown',
    }),
    electrical_interconnect_and_sealing: compactObject({
      ...rawElectricalBlock,
      current_collection_strategy:
        firstNonEmptyString(rawElectricalBlock.current_collection_strategy) ??
        'unknown',
      sealing_strategy:
        firstNonEmptyString(
          rawElectricalBlock.sealing_strategy,
          rawElectricalBlock.sealing_note,
        ) ?? 'unknown',
      corrosion_protection_level:
        firstNonEmptyString(rawElectricalBlock.corrosion_protection_level) ??
        'unknown',
    }),
    balance_of_plant: compactObject({
      ...rawBalanceBlock,
      flow_control: flowControl,
      gas_handling_readiness:
        firstNonEmptyString(rawBalanceBlock.gas_handling_readiness) ??
        'unknown',
      dosing_capability:
        firstNonEmptyString(rawBalanceBlock.dosing_capability) ??
        inferDosingCapability(rawBalanceBlock.bop_summary),
    }),
    sensors_and_analytics: compactObject({
      ...rawSensorsBlock,
      data_quality: sensorDataQuality,
      voltage_current_logging:
        firstNonEmptyString(rawSensorsBlock.voltage_current_logging) ??
        'unknown',
      water_quality_coverage:
        firstNonEmptyString(rawSensorsBlock.water_quality_coverage) ??
        inferSensorCoverage(rawSensorsBlock),
    }),
    operational_biology: compactObject({
      ...rawBiologyBlock,
      biofilm_maturity: biofilmMaturity,
      contamination_risk:
        firstNonEmptyString(rawBiologyBlock.contamination_risk) ?? 'unknown',
      inoculum_source:
        firstNonEmptyString(
          rawBiologyBlock.inoculum_source,
          rawBiologyBlock.inoculum_note,
        ) ?? 'unknown',
      startup_protocol:
        firstNonEmptyString(
          rawBiologyBlock.startup_protocol,
          rawBiologyBlock.startup_note,
        ) ?? 'unknown',
    }),
  };

  const normalizedTrl = normalizeTrl(
    technologyContext.current_trl,
    defaultsUsed,
    missingData,
  );
  const maintenanceBurden =
    firstNonEmptyString(
      ensureRecord(crossCuttingLayers.technoeconomics).maintenance_burden,
    ) ?? defaultMaintenanceBurden;
  if (
    !isNonEmptyString(
      ensureRecord(crossCuttingLayers.technoeconomics).maintenance_burden,
    )
  ) {
    defaultsUsed.push(
      'cross_cutting_layers.technoeconomics.maintenance_burden:contract_default',
    );
  }

  const normalizedCrossCuttingLayers = {
    technoeconomics: compactObject({
      ...ensureRecord(crossCuttingLayers.technoeconomics),
      maintenance_burden: maintenanceBurden,
      capex_constraint_level: businessContext.capex_constraint_level,
      opex_sensitivity_level: businessContext.opex_sensitivity_level,
      priorities: toStringArray(businessContext.priorities),
      hard_constraints: toStringArray(businessContext.hard_constraints),
      local_energy_cost_note: businessContext.local_energy_cost_note,
    }),
    evidence_and_provenance: compactObject({
      ...ensureRecord(crossCuttingLayers.evidence_and_provenance),
      evidence_profile: inferEvidenceProfile(typedEvidence),
      supplier_claim_fraction: inferSupplierClaimFraction(typedEvidence),
      typed_evidence: typedEvidence,
      evidence_refs: dedupeStrings([
        ...toStringArray(raw.evidence_refs),
        ...typedEvidence.map((record) => record.evidence_id),
      ]),
    }),
    risk_and_maturity: compactObject({
      ...ensureRecord(crossCuttingLayers.risk_and_maturity),
      trl: normalizedTrl,
      scale_up_risk: inferScaleUpRisk(scaleContext, flowControl),
      serviceability_risk: inferServiceabilityRisk(serviceabilityLevel),
      target_maturity_window: technologyContext.target_maturity_window,
      supplier_context: supplierContext,
    }),
  };

  if (typedEvidence.length === 0) {
    assumptions.push(
      'No typed evidence records were supplied; recommendations rely on intake structure, defaults, and deterministic rules only.',
    );
  }

  const normalized = normalizedCaseInputSchema.parse({
    case_id: caseId,
    technology_family: technologyFamily,
    architecture_family: architectureFamily,
    primary_objective: primaryObjective,
    business_context: normalizedBusinessContext,
    technology_context: normalizedTechnologyContext,
    feed_and_operation: normalizedFeedAndOperation,
    stack_blocks: normalizedStackBlocks,
    cross_cutting_layers: normalizedCrossCuttingLayers,
    measured_metrics: raw.measured_metrics ?? {},
    evidence_refs:
      normalizedCrossCuttingLayers.evidence_and_provenance.evidence_refs,
    assumptions: dedupeStrings(assumptions),
    missing_data: dedupeStrings(missingData),
    defaults_used: dedupeStrings(defaultsUsed),
  });

  return normalized;
}
