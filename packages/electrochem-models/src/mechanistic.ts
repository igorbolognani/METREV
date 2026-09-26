import type {
  BiosensorConfiguration,
  BiosensorConfigurationDraft,
  DerivedObservation,
  MechanisticModelInput,
  NormalizedCaseInput,
  SimulationSensitivityAnalysis,
  SimulationSeries,
  ScientificModelParameter,
} from '@metrev/domain-contracts';
import {
  biosensorConfigurationSchema,
  loadMechanisticModelDefinition,
  mechanisticModelInputSchema,
} from '@metrev/domain-contracts';

import { getBioelectrochemicalModelProfile } from './model-catalog';
import {
  getComponentModelParameterGroup,
  getModelFidelityProfile,
} from './model-fidelity-catalog';

const FARADAY = 96485.33212;
const GAS_CONSTANT = 8.314462618;
const OXYGEN_MOLAR_MASS_KG_MOL = 0.031998;
const COD_ELECTRON_EQUIVALENTS_C_KG = (4 * FARADAY) / 0.032;
const MODEL_VERSION = 'coupled-0d-dae-v1';
const MAX_INTEGRATION_STEPS = 2000;
const MAX_SERIES_POINTS = 200;

export interface MechanisticRun {
  status: 'completed' | 'insufficient_data';
  missingInputs: string[];
  note: string;
  inputSnapshot: Record<string, unknown>;
  observations: DerivedObservation[];
  series: SimulationSeries[];
  sensitivityAnalysis?: SimulationSensitivityAnalysis;
  assumptions: string[];
  sourceRefs: string[];
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

interface State {
  cod: number;
  biomass: number;
  oxygen: number;
  phAnode: number;
  phCathode: number;
}

interface Rates {
  uptake: number;
  current: number;
  cellVoltage: number;
  ohmicResistance: number;
  anodeActivationOverpotentialV: number;
  cathodeActivationOverpotentialV: number;
  ohmicVoltageDropV: number;
  supplyLimitationVoltageLoss: number;
}

interface Point {
  time_s: number;
  state: State;
  rates: Rates;
  cellElectricalEnergyJ: number;
  reversiblePotentialEnergyJ: number;
  anodeActivationWorkJ: number;
  cathodeActivationWorkJ: number;
  ohmicPolarizationWorkJ: number;
  boundaryResidualEnergyJ: number;
  codInfluentMassKg: number;
  codEffluentMassKg: number;
  codBiodegradedMassKg: number;
  biomassGrowthKg: number;
  biomassDecayKg: number;
  biomassWashoutKg: number;
  hydrogenGrossMol: number;
  hydrogenCapturedMol: number;
  hydrogenUncapturedMol: number;
}

interface ReactorRun {
  points: Point[];
  cellElectricalEnergyJ: number;
  reversiblePotentialEnergyJ: number;
  anodeActivationWorkJ: number;
  cathodeActivationWorkJ: number;
  ohmicPolarizationWorkJ: number;
  boundaryResidualEnergyJ: number;
  codInfluentMassKg: number;
  codEffluentMassKg: number;
  codBiodegradedMassKg: number;
  biomassGrowthKg: number;
  biomassDecayKg: number;
  biomassWashoutKg: number;
  hydrogenGrossMol: number;
  hydrogenCapturedMol: number;
  hydrogenUncapturedMol: number;
}

interface ReactorStep {
  state: State;
  cellElectricalEnergyJ: number;
  reversiblePotentialEnergyJ: number;
  anodeActivationWorkJ: number;
  cathodeActivationWorkJ: number;
  ohmicPolarizationWorkJ: number;
  boundaryResidualEnergyJ: number;
  codInfluentMassKg: number;
  codEffluentMassKg: number;
  codBiodegradedMassKg: number;
  biomassGrowthKg: number;
  biomassDecayKg: number;
  biomassWashoutKg: number;
  hydrogenGrossMol: number;
  hydrogenCapturedMol: number;
  hydrogenUncapturedMol: number;
}

const modelDefinition = loadMechanisticModelDefinition();
const unitByPath = Object.fromEntries(
  Object.entries(modelDefinition.input_parameters).map(([path, item]) => [
    path,
    item.unit,
  ]),
);

function atPath(input: MechanisticModelInput, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, input);
}

function parameter(
  input: MechanisticModelInput,
  path: string,
): ScientificModelParameter | undefined {
  const value = atPath(input, path);
  if (!value || typeof value !== 'object') return undefined;
  return value as ScientificModelParameter;
}

function collectInputIssues(input: MechanisticModelInput): string[] {
  const issues: string[] = [];
  for (const [path, metadata] of Object.entries(
    modelDefinition.input_parameters,
  )) {
    const required =
      metadata.required_when === 'always' ||
      (metadata.required_when === 'membrane_present' &&
        input.geometry.membrane_present) ||
      metadata.required_when === input.system_type;
    const candidate = parameter(input, path);
    if (!candidate) {
      if (required) issues.push(`mechanistic_model.${path}`);
      continue;
    }
    if (candidate.unit !== metadata.unit) {
      issues.push(`mechanistic_model.${path}.unit (expected ${metadata.unit})`);
    }
  }

  const expectedCathodeReaction =
    input.system_type === 'MFC' ? 'oxygen_reduction' : 'hydrogen_evolution';
  if (input.electrochemistry.cathode_reaction !== expectedCathodeReaction) {
    issues.push(
      `mechanistic_model.electrochemistry.cathode_reaction must be ${expectedCathodeReaction} for ${input.system_type}`,
    );
  }

  for (const [path, ref] of [
    [
      'materials.anode_material_source_ref',
      input.materials.anode_material_source_ref,
    ],
    [
      'materials.cathode_material_source_ref',
      input.materials.cathode_material_source_ref,
    ],
    ...(input.geometry.membrane_present
      ? [
          [
            'materials.separator_material_source_ref',
            input.materials.separator_material_source_ref,
          ] as const,
        ]
      : []),
  ] as const) {
    if (!ref?.trim()) issues.push(`mechanistic_model.${path}`);
  }
  if (
    input.geometry.membrane_present &&
    !input.materials.separator_material_family
  ) {
    issues.push('mechanistic_model.materials.separator_material_family');
  }

  const values = Object.entries(unitByPath).flatMap(([path]) => {
    const candidate = parameter(input, path);
    return candidate ? [[path, candidate.value] as const] : [];
  });
  for (const [path, value] of values) {
    if (!Number.isFinite(value)) issues.push(`mechanistic_model.${path}.value`);
  }

  const positivePaths = [
    'geometry.anode_chamber_volume_m3',
    'geometry.cathode_chamber_volume_m3',
    'geometry.anode_area_m2',
    'geometry.cathode_area_m2',
    'geometry.electrode_gap_m',
    'materials.anode_electroactive_area_factor',
    'materials.cathode_electroactive_area_factor',
    'operation.temperature_k',
    'operation.duration_s',
    'operation.time_step_s',
    'biology.max_specific_cod_uptake_kg_cod_kg_biomass_s',
    'biology.half_saturation_cod_kg_m3',
    'biology.biomass_yield_kg_biomass_kg_cod',
    'biology.ph_tolerance',
    'biology.reference_temperature_k',
    'biology.buffer_capacity_anode_mol_m3_ph',
    'biology.buffer_capacity_cathode_mol_m3_ph',
    'operation.electrolyte_conductivity_s_m',
    'electrochemistry.reversible_cell_voltage_v',
    'electrochemistry.anode_exchange_current_density_a_m2',
    'electrochemistry.cathode_exchange_current_density_a_m2',
    ...(input.geometry.membrane_present
      ? [
          'geometry.membrane_area_m2',
          'geometry.membrane_thickness_m',
          'geometry.membrane_conductivity_s_m',
        ]
      : []),
    ...(input.system_type === 'MFC'
      ? [
          'operation.oxygen_saturation_kg_m3',
          'electrochemistry.oxygen_mass_transfer_coefficient_m_s',
        ]
      : []),
    ...(input.system_type === 'MFC'
      ? ['electrochemistry.external_load_ohm']
      : ['electrochemistry.applied_voltage_v']),
  ];
  for (const path of positivePaths) {
    const candidate = parameter(input, path);
    if (candidate && candidate.value <= 0) {
      issues.push(`mechanistic_model.${path}.value must be > 0`);
    }
  }

  const flow = parameter(input, 'operation.flow_m3_s');
  const selectedProfile = input.model_profile_id
    ? getBioelectrochemicalModelProfile(input.model_profile_id)
    : undefined;
  const permitsBatch =
    selectedProfile?.status === 'executable' &&
    selectedProfile.operatingRegime === 'batch';
  if (flow && flow.value < 0) {
    issues.push('mechanistic_model.operation.flow_m3_s.value must be >= 0');
  } else if (flow?.value === 0 && !permitsBatch) {
    issues.push(
      'mechanistic_model.operation.flow_m3_s.value must be > 0 unless an executable batch model profile is selected',
    );
  }

  for (const path of [
    'operation.influent_cod_kg_m3',
    'operation.initial_cod_kg_m3',
    'operation.initial_biomass_kg_m3',
    'operation.initial_dissolved_oxygen_kg_m3',
    'operation.biomass_washout_rate_s_inv',
    'operation.auxiliary_power_w',
    'electrochemistry.contact_resistance_ohm',
    'biology.decay_rate_s_inv',
    'biology.activation_energy_j_mol',
    'biology.proton_transfer_coefficient_mol_s_ph',
  ]) {
    const candidate = parameter(input, path);
    if (candidate && candidate.value < 0) {
      issues.push(`mechanistic_model.${path}.value must be >= 0`);
    }
  }

  const alphaPaths = [
    'electrochemistry.anode_charge_transfer_coefficient',
    'electrochemistry.cathode_charge_transfer_coefficient',
  ];
  for (const path of alphaPaths) {
    const candidate = parameter(input, path);
    if (candidate && (candidate.value <= 0 || candidate.value >= 1)) {
      issues.push(`mechanistic_model.${path}.value must be between 0 and 1`);
    }
  }

  for (const path of [
    'biology.coulombic_efficiency',
    'materials.biofilm_electroactive_fraction',
    ...(input.system_type === 'MEC'
      ? [
          'electrochemistry.hydrogen_faraday_efficiency',
          'electrochemistry.hydrogen_capture_fraction',
        ]
      : []),
  ]) {
    const candidate = parameter(input, path);
    if (candidate && (candidate.value < 0 || candidate.value > 1)) {
      issues.push(`mechanistic_model.${path}.value must be in [0, 1]`);
    }
  }

  const duration = parameter(input, 'operation.duration_s')?.value ?? 0;
  const timeStep = parameter(input, 'operation.time_step_s')?.value ?? 0;
  if (duration > 0 && timeStep > 0) {
    const steps = Math.ceil(duration / timeStep);
    if (steps > MAX_INTEGRATION_STEPS) {
      issues.push(
        `mechanistic_model.operation.duration_s/time_step_s exceeds ${MAX_INTEGRATION_STEPS} integration steps`,
      );
    }
  }

  for (const path of [
    'operation.influent_ph',
    'operation.initial_ph_anode',
    'operation.initial_ph_cathode',
    'biology.ph_optimum',
  ]) {
    const candidate = parameter(input, path);
    if (candidate && (candidate.value < 0 || candidate.value > 14)) {
      issues.push(`mechanistic_model.${path}.value must be in [0, 14]`);
    }
  }

  return [...new Set(issues)];
}

function p(input: MechanisticModelInput, path: string): number {
  return parameter(input, path)?.value ?? Number.NaN;
}

function getOhmicResistance(input: MechanisticModelInput): number {
  const anodeArea = p(input, 'geometry.anode_area_m2');
  const cathodeArea = p(input, 'geometry.cathode_area_m2');
  const conductionArea = Math.min(anodeArea, cathodeArea);
  const electrolyteResistance =
    p(input, 'geometry.electrode_gap_m') /
    (p(input, 'operation.electrolyte_conductivity_s_m') * conductionArea);
  const membraneResistance = input.geometry.membrane_present
    ? p(input, 'geometry.membrane_thickness_m') /
      (p(input, 'geometry.membrane_conductivity_s_m') *
        p(input, 'geometry.membrane_area_m2'))
    : 0;
  return (
    electrolyteResistance +
    membraneResistance +
    p(input, 'electrochemistry.contact_resistance_ohm')
  );
}

function inverseButlerVolmer(
  currentDensity: number,
  exchangeCurrentDensity: number,
  transferCoefficient: number,
  temperatureK: number,
): number {
  if (currentDensity <= 0) return 0;
  const thermalVoltage = FARADAY / (GAS_CONSTANT * temperatureK);
  const currentAt = (overpotential: number) => {
    const anodicExponent = Math.min(
      50,
      transferCoefficient * thermalVoltage * overpotential,
    );
    const cathodicExponent = Math.min(
      50,
      -(1 - transferCoefficient) * thermalVoltage * overpotential,
    );
    return (
      exchangeCurrentDensity *
      (Math.exp(anodicExponent) - Math.exp(cathodicExponent))
    );
  };

  let low = 0;
  let high = 1.5;
  for (let iteration = 0; iteration < 36; iteration += 1) {
    const middle = (low + high) / 2;
    if (currentAt(middle) < currentDensity) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

function biologicalUptake(input: MechanisticModelInput, state: State): number {
  const concentration = Math.max(0, state.cod);
  const biomass = Math.max(0, state.biomass);
  const ks = p(input, 'biology.half_saturation_cod_kg_m3');
  const qMax = p(input, 'biology.max_specific_cod_uptake_kg_cod_kg_biomass_s');
  const saturation = concentration / (ks + concentration);
  const sigma = p(input, 'biology.ph_tolerance');
  const phDistance = (state.phAnode - p(input, 'biology.ph_optimum')) / sigma;
  const phFactor = Math.exp(-0.5 * phDistance * phDistance);
  const temperature = p(input, 'operation.temperature_k');
  const referenceTemperature = p(input, 'biology.reference_temperature_k');
  const activationEnergy = p(input, 'biology.activation_energy_j_mol');
  const arrheniusExponent = Math.max(
    -20,
    Math.min(
      20,
      (-activationEnergy / GAS_CONSTANT) *
        (1 / temperature - 1 / referenceTemperature),
    ),
  );
  return qMax * saturation * biomass * phFactor * Math.exp(arrheniusExponent);
}

function ratesFor(input: MechanisticModelInput, state: State): Rates {
  const uptake = biologicalUptake(input, state);
  const anodeVolume = p(input, 'geometry.anode_chamber_volume_m3');
  const cathodeArea = p(input, 'geometry.cathode_area_m2');
  const massTransfer = p(
    input,
    'electrochemistry.oxygen_mass_transfer_coefficient_m_s',
  );
  const currentFromBiofilm =
    p(input, 'biology.coulombic_efficiency') *
    p(input, 'materials.biofilm_electroactive_fraction') *
    COD_ELECTRON_EQUIVALENTS_C_KG *
    uptake *
    anodeVolume;
  const currentFromOxygen =
    input.system_type === 'MFC'
      ? COD_ELECTRON_EQUIVALENTS_C_KG *
        massTransfer *
        cathodeArea *
        Math.max(0, state.oxygen)
      : Number.POSITIVE_INFINITY;
  const currentCeiling = Math.max(
    0,
    Math.min(currentFromBiofilm, currentFromOxygen),
  );
  const resistance = getOhmicResistance(input);
  const temperature = p(input, 'operation.temperature_k');
  const anodeArea =
    p(input, 'geometry.anode_area_m2') *
    p(input, 'materials.anode_electroactive_area_factor');
  const effectiveCathodeArea =
    cathodeArea * p(input, 'materials.cathode_electroactive_area_factor');
  const anodeExchange = p(
    input,
    'electrochemistry.anode_exchange_current_density_a_m2',
  );
  const cathodeExchange = p(
    input,
    'electrochemistry.cathode_exchange_current_density_a_m2',
  );
  const anodeAlpha = p(
    input,
    'electrochemistry.anode_charge_transfer_coefficient',
  );
  const cathodeAlpha = p(
    input,
    'electrochemistry.cathode_charge_transfer_coefficient',
  );
  const reversibleVoltage = p(
    input,
    'electrochemistry.reversible_cell_voltage_v',
  );

  const polarizationComponents = (current: number) => {
    const anodeOverpotential = inverseButlerVolmer(
      current / anodeArea,
      anodeExchange,
      anodeAlpha,
      temperature,
    );
    const cathodeOverpotential = inverseButlerVolmer(
      current / effectiveCathodeArea,
      cathodeExchange,
      cathodeAlpha,
      temperature,
    );
    const ohmicVoltageDrop = current * resistance;
    return {
      anodeOverpotential,
      cathodeOverpotential,
      ohmicVoltageDrop,
      total: anodeOverpotential + cathodeOverpotential + ohmicVoltageDrop,
    };
  };
  const polarization = (current: number) =>
    polarizationComponents(current).total;

  let current = 0;
  if (currentCeiling > 0) {
    let residual: (candidate: number) => number;
    if (input.system_type === 'MFC') {
      const load = p(input, 'electrochemistry.external_load_ohm');
      residual = (candidate) =>
        candidate * load - (reversibleVoltage - polarization(candidate));
      if (residual(0) < 0) {
        let low = 0;
        let high = currentCeiling;
        if (residual(high) <= 0) current = high;
        else {
          for (let iteration = 0; iteration < 40; iteration += 1) {
            const middle = (low + high) / 2;
            if (residual(middle) <= 0) low = middle;
            else high = middle;
          }
          current = (low + high) / 2;
        }
      }
    } else {
      const appliedVoltage = p(input, 'electrochemistry.applied_voltage_v');
      residual = (candidate) =>
        appliedVoltage - reversibleVoltage - polarization(candidate);
      if (residual(0) > 0) {
        let low = 0;
        let high = currentCeiling;
        if (residual(high) >= 0) current = high;
        else {
          for (let iteration = 0; iteration < 40; iteration += 1) {
            const middle = (low + high) / 2;
            if (residual(middle) >= 0) low = middle;
            else high = middle;
          }
          current = (low + high) / 2;
        }
      }
    }
  }

  const finalPolarization = polarizationComponents(current);
  const kineticCellVoltage = Math.max(
    0,
    reversibleVoltage - finalPolarization.total,
  );
  const cellVoltage =
    input.system_type === 'MFC'
      ? current * p(input, 'electrochemistry.external_load_ohm')
      : p(input, 'electrochemistry.applied_voltage_v');
  const supplyLimitationVoltageLoss =
    current <= 0
      ? 0
      : input.system_type === 'MFC'
        ? Math.max(0, kineticCellVoltage - cellVoltage)
        : Math.max(0, cellVoltage - reversibleVoltage - polarization(current));
  return {
    uptake,
    current,
    cellVoltage,
    ohmicResistance: resistance,
    anodeActivationOverpotentialV: finalPolarization.anodeOverpotential,
    cathodeActivationOverpotentialV: finalPolarization.cathodeOverpotential,
    ohmicVoltageDropV: finalPolarization.ohmicVoltageDrop,
    supplyLimitationVoltageLoss,
  };
}

function safeState(state: State): State {
  return {
    cod: Math.max(0, state.cod),
    biomass: Math.max(0, state.biomass),
    oxygen: Math.max(0, state.oxygen),
    phAnode: Math.max(0, Math.min(14, state.phAnode)),
    phCathode: Math.max(0, Math.min(14, state.phCathode)),
  };
}

function derivativesWithRates(
  input: MechanisticModelInput,
  safe: State,
  rates: Rates,
): State {
  const flow = p(input, 'operation.flow_m3_s');
  const anodeVolume = p(input, 'geometry.anode_chamber_volume_m3');
  const cathodeVolume = p(input, 'geometry.cathode_chamber_volume_m3');
  const dilution = flow / anodeVolume;
  const oxygenTransfer =
    input.system_type === 'MFC'
      ? p(input, 'electrochemistry.oxygen_mass_transfer_coefficient_m_s') *
        p(input, 'geometry.cathode_area_m2') *
        (p(input, 'operation.oxygen_saturation_kg_m3') - safe.oxygen)
      : 0;
  const protonFlux = rates.current / FARADAY;
  const phExchange =
    p(input, 'biology.proton_transfer_coefficient_mol_s_ph') *
    (safe.phCathode - safe.phAnode);
  const anodeBuffer =
    anodeVolume * p(input, 'biology.buffer_capacity_anode_mol_m3_ph');
  const cathodeBuffer =
    cathodeVolume * p(input, 'biology.buffer_capacity_cathode_mol_m3_ph');

  return {
    cod:
      dilution * (p(input, 'operation.influent_cod_kg_m3') - safe.cod) -
      rates.uptake,
    biomass:
      p(input, 'biology.biomass_yield_kg_biomass_kg_cod') * rates.uptake -
      (p(input, 'biology.decay_rate_s_inv') +
        p(input, 'operation.biomass_washout_rate_s_inv')) *
        safe.biomass,
    oxygen:
      input.system_type === 'MFC'
        ? oxygenTransfer / cathodeVolume -
          (rates.current * OXYGEN_MOLAR_MASS_KG_MOL) /
            (4 * FARADAY * cathodeVolume)
        : 0,
    phAnode:
      dilution * (p(input, 'operation.influent_ph') - safe.phAnode) +
      (-protonFlux + phExchange) / anodeBuffer,
    phCathode: (protonFlux - phExchange) / cathodeBuffer,
  };
}

function addScaled(state: State, derivative: State, scale: number): State {
  return {
    cod: state.cod + derivative.cod * scale,
    biomass: state.biomass + derivative.biomass * scale,
    oxygen: state.oxygen + derivative.oxygen * scale,
    phAnode: state.phAnode + derivative.phAnode * scale,
    phCathode: state.phCathode + derivative.phCathode * scale,
  };
}

function electricalPowerW(input: MechanisticModelInput, rates: Rates): number {
  return input.system_type === 'MFC'
    ? rates.current ** 2 * p(input, 'electrochemistry.external_load_ohm')
    : rates.current * p(input, 'electrochemistry.applied_voltage_v');
}

function hydrogenProductionMolS(
  input: MechanisticModelInput,
  rates: Rates,
): { gross: number; captured: number; uncaptured: number } {
  if (input.system_type !== 'MEC') {
    return { gross: 0, captured: 0, uncaptured: 0 };
  }
  const gross =
    (rates.current * p(input, 'electrochemistry.hydrogen_faraday_efficiency')) /
    (2 * FARADAY);
  const captured =
    gross * p(input, 'electrochemistry.hydrogen_capture_fraction');
  return {
    gross,
    captured,
    uncaptured: gross - captured,
  };
}

function rk4Step(
  input: MechanisticModelInput,
  state: State,
  step: number,
): ReactorStep {
  const y1 = safeState(state);
  const r1 = ratesFor(input, y1);
  const k1 = derivativesWithRates(input, y1, r1);
  const y2 = safeState(addScaled(state, k1, step / 2));
  const r2 = ratesFor(input, y2);
  const k2 = derivativesWithRates(input, y2, r2);
  const y3 = safeState(addScaled(state, k2, step / 2));
  const r3 = ratesFor(input, y3);
  const k3 = derivativesWithRates(input, y3, r3);
  const y4 = safeState(addScaled(state, k3, step));
  const r4 = ratesFor(input, y4);
  const k4 = derivativesWithRates(input, y4, r4);
  const result = {
    cod: state.cod + (step / 6) * (k1.cod + 2 * k2.cod + 2 * k3.cod + k4.cod),
    biomass:
      state.biomass +
      (step / 6) * (k1.biomass + 2 * k2.biomass + 2 * k3.biomass + k4.biomass),
    oxygen:
      state.oxygen +
      (step / 6) * (k1.oxygen + 2 * k2.oxygen + 2 * k3.oxygen + k4.oxygen),
    phAnode:
      state.phAnode +
      (step / 6) * (k1.phAnode + 2 * k2.phAnode + 2 * k3.phAnode + k4.phAnode),
    phCathode:
      state.phCathode +
      (step / 6) *
        (k1.phCathode + 2 * k2.phCathode + 2 * k3.phCathode + k4.phCathode),
  };
  const hydrogen1 = hydrogenProductionMolS(input, r1);
  const hydrogen2 = hydrogenProductionMolS(input, r2);
  const hydrogen3 = hydrogenProductionMolS(input, r3);
  const hydrogen4 = hydrogenProductionMolS(input, r4);
  const integrateRate = (v1: number, v2: number, v3: number, v4: number) =>
    (step / 6) * (v1 + 2 * v2 + 2 * v3 + v4);
  const flow = p(input, 'operation.flow_m3_s');
  const influentCod = p(input, 'operation.influent_cod_kg_m3');
  const anodeVolume = p(input, 'geometry.anode_chamber_volume_m3');
  const biomassYield = p(input, 'biology.biomass_yield_kg_biomass_kg_cod');
  const biomassDecayRate = p(input, 'biology.decay_rate_s_inv');
  const biomassWashoutRate = p(input, 'operation.biomass_washout_rate_s_inv');
  const massRates = (stageState: State, stageRates: Rates) => ({
    codInfluent: flow * influentCod,
    codEffluent: flow * stageState.cod,
    codBiodegraded: stageRates.uptake * anodeVolume,
    biomassGrowth: biomassYield * stageRates.uptake * anodeVolume,
    biomassDecay: biomassDecayRate * stageState.biomass * anodeVolume,
    biomassWashout: biomassWashoutRate * stageState.biomass * anodeVolume,
  });
  const mass1 = massRates(y1, r1);
  const mass2 = massRates(y2, r2);
  const mass3 = massRates(y3, r3);
  const mass4 = massRates(y4, r4);
  const reversibleVoltage = p(
    input,
    'electrochemistry.reversible_cell_voltage_v',
  );

  return {
    state: safeState(result),
    cellElectricalEnergyJ: integrateRate(
      electricalPowerW(input, r1),
      electricalPowerW(input, r2),
      electricalPowerW(input, r3),
      electricalPowerW(input, r4),
    ),
    reversiblePotentialEnergyJ: integrateRate(
      r1.current * reversibleVoltage,
      r2.current * reversibleVoltage,
      r3.current * reversibleVoltage,
      r4.current * reversibleVoltage,
    ),
    anodeActivationWorkJ: integrateRate(
      r1.current * r1.anodeActivationOverpotentialV,
      r2.current * r2.anodeActivationOverpotentialV,
      r3.current * r3.anodeActivationOverpotentialV,
      r4.current * r4.anodeActivationOverpotentialV,
    ),
    cathodeActivationWorkJ: integrateRate(
      r1.current * r1.cathodeActivationOverpotentialV,
      r2.current * r2.cathodeActivationOverpotentialV,
      r3.current * r3.cathodeActivationOverpotentialV,
      r4.current * r4.cathodeActivationOverpotentialV,
    ),
    ohmicPolarizationWorkJ: integrateRate(
      r1.current * r1.ohmicVoltageDropV,
      r2.current * r2.ohmicVoltageDropV,
      r3.current * r3.ohmicVoltageDropV,
      r4.current * r4.ohmicVoltageDropV,
    ),
    boundaryResidualEnergyJ: integrateRate(
      r1.current * r1.supplyLimitationVoltageLoss,
      r2.current * r2.supplyLimitationVoltageLoss,
      r3.current * r3.supplyLimitationVoltageLoss,
      r4.current * r4.supplyLimitationVoltageLoss,
    ),
    codInfluentMassKg: integrateRate(
      mass1.codInfluent,
      mass2.codInfluent,
      mass3.codInfluent,
      mass4.codInfluent,
    ),
    codEffluentMassKg: integrateRate(
      mass1.codEffluent,
      mass2.codEffluent,
      mass3.codEffluent,
      mass4.codEffluent,
    ),
    codBiodegradedMassKg: integrateRate(
      mass1.codBiodegraded,
      mass2.codBiodegraded,
      mass3.codBiodegraded,
      mass4.codBiodegraded,
    ),
    biomassGrowthKg: integrateRate(
      mass1.biomassGrowth,
      mass2.biomassGrowth,
      mass3.biomassGrowth,
      mass4.biomassGrowth,
    ),
    biomassDecayKg: integrateRate(
      mass1.biomassDecay,
      mass2.biomassDecay,
      mass3.biomassDecay,
      mass4.biomassDecay,
    ),
    biomassWashoutKg: integrateRate(
      mass1.biomassWashout,
      mass2.biomassWashout,
      mass3.biomassWashout,
      mass4.biomassWashout,
    ),
    hydrogenGrossMol: integrateRate(
      hydrogen1.gross,
      hydrogen2.gross,
      hydrogen3.gross,
      hydrogen4.gross,
    ),
    hydrogenCapturedMol: integrateRate(
      hydrogen1.captured,
      hydrogen2.captured,
      hydrogen3.captured,
      hydrogen4.captured,
    ),
    hydrogenUncapturedMol: integrateRate(
      hydrogen1.uncaptured,
      hydrogen2.uncaptured,
      hydrogen3.uncaptured,
      hydrogen4.uncaptured,
    ),
  };
}

function runReactor(input: MechanisticModelInput): ReactorRun {
  const duration = p(input, 'operation.duration_s');
  const requestedStep = p(input, 'operation.time_step_s');
  const count = Math.ceil(duration / requestedStep);
  const step = duration / count;
  const initialState: State = {
    cod: p(input, 'operation.initial_cod_kg_m3'),
    biomass: p(input, 'operation.initial_biomass_kg_m3'),
    oxygen:
      input.system_type === 'MFC'
        ? p(input, 'operation.initial_dissolved_oxygen_kg_m3')
        : 0,
    phAnode: p(input, 'operation.initial_ph_anode'),
    phCathode: p(input, 'operation.initial_ph_cathode'),
  };
  let state: State = { ...initialState };
  const points: Point[] = [];
  let cellElectricalEnergyJ = 0;
  let reversiblePotentialEnergyJ = 0;
  let anodeActivationWorkJ = 0;
  let cathodeActivationWorkJ = 0;
  let ohmicPolarizationWorkJ = 0;
  let boundaryResidualEnergyJ = 0;
  let codInfluentMassKg = 0;
  let codEffluentMassKg = 0;
  let codBiodegradedMassKg = 0;
  let biomassGrowthKg = 0;
  let biomassDecayKg = 0;
  let biomassWashoutKg = 0;
  let hydrogenGrossMol = 0;
  let hydrogenCapturedMol = 0;
  let hydrogenUncapturedMol = 0;
  const stride = Math.max(1, Math.ceil(count / MAX_SERIES_POINTS));

  for (let index = 0; index <= count; index += 1) {
    if (index % stride === 0 || index === count) {
      points.push({
        time_s: index * step,
        state: { ...state },
        rates: ratesFor(input, state),
        cellElectricalEnergyJ,
        reversiblePotentialEnergyJ,
        anodeActivationWorkJ,
        cathodeActivationWorkJ,
        ohmicPolarizationWorkJ,
        boundaryResidualEnergyJ,
        codInfluentMassKg,
        codEffluentMassKg,
        codBiodegradedMassKg,
        biomassGrowthKg,
        biomassDecayKg,
        biomassWashoutKg,
        hydrogenGrossMol,
        hydrogenCapturedMol,
        hydrogenUncapturedMol,
      });
    }
    if (index < count) {
      const interval = rk4Step(input, state, step);
      cellElectricalEnergyJ += interval.cellElectricalEnergyJ;
      reversiblePotentialEnergyJ += interval.reversiblePotentialEnergyJ;
      anodeActivationWorkJ += interval.anodeActivationWorkJ;
      cathodeActivationWorkJ += interval.cathodeActivationWorkJ;
      ohmicPolarizationWorkJ += interval.ohmicPolarizationWorkJ;
      boundaryResidualEnergyJ += interval.boundaryResidualEnergyJ;
      codInfluentMassKg += interval.codInfluentMassKg;
      codEffluentMassKg += interval.codEffluentMassKg;
      codBiodegradedMassKg += interval.codBiodegradedMassKg;
      biomassGrowthKg += interval.biomassGrowthKg;
      biomassDecayKg += interval.biomassDecayKg;
      biomassWashoutKg += interval.biomassWashoutKg;
      hydrogenGrossMol += interval.hydrogenGrossMol;
      hydrogenCapturedMol += interval.hydrogenCapturedMol;
      hydrogenUncapturedMol += interval.hydrogenUncapturedMol;
      state = interval.state;
    }
  }
  return {
    points,
    cellElectricalEnergyJ,
    reversiblePotentialEnergyJ,
    anodeActivationWorkJ,
    cathodeActivationWorkJ,
    ohmicPolarizationWorkJ,
    boundaryResidualEnergyJ,
    codInfluentMassKg,
    codEffluentMassKg,
    codBiodegradedMassKg,
    biomassGrowthKg,
    biomassDecayKg,
    biomassWashoutKg,
    hydrogenGrossMol,
    hydrogenCapturedMol,
    hydrogenUncapturedMol,
  };
}

function observation(input: {
  key: string;
  label: string;
  value: number | string;
  unit: string | null;
  note: string;
  confidence: 'low' | 'medium' | 'high';
}): DerivedObservation {
  return {
    observation_id: `mechanistic:${input.key}`,
    key: input.key,
    label: input.label,
    value: input.value,
    unit: input.unit,
    source_kind: 'modeled',
    confidence_level: input.confidence,
    decision_relevance: 'informational',
    provenance_note: input.note,
    assumptions: [
      'Lumped, isothermal, well-mixed reactor; temperature and influent are fixed boundary conditions.',
      'One-at-a-time perturbations use supplied uncertainty magnitudes when available; they are not a joint prediction interval.',
    ],
    missing_dependencies: [],
  };
}

function biosensorIssues(sensor: BiosensorConfiguration): string[] {
  const issues: string[] = [];
  if (sensor.configuration_profile_id) {
    const profile = getBioelectrochemicalModelProfile(
      sensor.configuration_profile_id,
    );

    if (!profile) {
      issues.push(
        `biosensor.configuration_profile_id is unknown: ${sensor.configuration_profile_id}`,
      );
    } else if (profile.system !== 'biosensor') {
      issues.push(
        `biosensor.configuration_profile_id=${profile.id} is not a biosensor profile`,
      );
    } else if (profile.status !== 'executable') {
      issues.push(
        `biosensor.configuration_profile_id=${profile.id} is a research profile only; ${profile.limitations[0]}`,
      );
    } else if (profile.deploymentMode !== sensor.deployment_mode) {
      issues.push(
        `biosensor.configuration_profile_id=${profile.id} requires deployment_mode=${profile.deploymentMode}`,
      );
    }
  }
  if (sensor.transduction_mode !== 'amperometric') {
    issues.push(
      `stack_blocks.sensors_and_analytics.biosensor.transduction_mode=${sensor.transduction_mode} (current executable sensor model supports amperometric calibration only)`,
    );
  }
  const requireParam = (
    path: string,
    candidate: ScientificModelParameter | undefined,
    expectedUnit: string,
  ) => {
    if (!candidate) issues.push(`biosensor.${path}`);
    else if (candidate.unit !== expectedUnit) {
      issues.push(`biosensor.${path}.unit (expected ${expectedUnit})`);
    }
  };
  const concentrationUnit = sensor.concentration_unit;
  requireParam('concentration', sensor.concentration, concentrationUnit);
  requireParam(
    'working_electrode_area_m2',
    sensor.working_electrode_area_m2,
    'm2',
  );
  requireParam('ionic_strength_mol_m3', sensor.ionic_strength_mol_m3, 'mol/m3');
  if (
    sensor.power_source === 'external' ||
    sensor.power_source === 'mec_power_bus'
  ) {
    requireParam('power_available_w', sensor.power_available_w, 'W');
  } else if (sensor.power_available_w) {
    requireParam('power_available_w', sensor.power_available_w, 'W');
  }
  if (sensor.biorecognition_loading_mg_cm2) {
    requireParam(
      'biorecognition_loading_mg_cm2',
      sensor.biorecognition_loading_mg_cm2,
      'mg/cm2',
    );
  }
  requireParam('temperature_k', sensor.temperature_k, 'K');
  requireParam('ph', sensor.ph, 'pH');
  requireParam(
    'calibration.range_min',
    sensor.calibration.range_min,
    concentrationUnit,
  );
  requireParam(
    'calibration.range_max',
    sensor.calibration.range_max,
    concentrationUnit,
  );
  requireParam(
    'analytical_performance.lod',
    sensor.analytical_performance.lod,
    concentrationUnit,
  );
  requireParam(
    'analytical_performance.loq',
    sensor.analytical_performance.loq,
    concentrationUnit,
  );
  requireParam(
    'analytical_performance.response_time_s',
    sensor.analytical_performance.response_time_s,
    's',
  );
  requireParam(
    'analytical_performance.recovery_time_s',
    sensor.analytical_performance.recovery_time_s,
    's',
  );
  requireParam(
    'analytical_performance.noise_std_a',
    sensor.analytical_performance.noise_std_a,
    'A',
  );
  requireParam(
    'analytical_performance.drift_a_per_day',
    sensor.analytical_performance.drift_a_per_day,
    'A/day',
  );
  requireParam(
    'analytical_performance.repeatability_cv_pct',
    sensor.analytical_performance.repeatability_cv_pct,
    '%',
  );
  requireParam(
    'analytical_performance.accuracy_pct',
    sensor.analytical_performance.accuracy_pct,
    '%',
  );
  requireParam(
    'analytical_performance.selectivity_pct',
    sensor.analytical_performance.selectivity_pct,
    '%',
  );
  requireParam(
    'analytical_performance.calibration_r2',
    sensor.analytical_performance.calibration_r2,
    '1',
  );
  requireParam(
    'analytical_performance.replicate_count',
    sensor.analytical_performance.replicate_count,
    'count',
  );
  requireParam('power_consumption_w', sensor.power_consumption_w, 'W');
  if (sensor.calibration.model === 'linear') {
    requireParam(
      'calibration.sensitivity_a_per_unit',
      sensor.calibration.sensitivity_a_per_unit,
      `A/(${concentrationUnit})`,
    );
    requireParam(
      'calibration.intercept_a',
      sensor.calibration.intercept_a,
      'A',
    );
  } else {
    requireParam(
      'calibration.maximum_current_a',
      sensor.calibration.maximum_current_a,
      'A',
    );
    requireParam(
      'calibration.half_saturation_concentration',
      sensor.calibration.half_saturation_concentration,
      concentrationUnit,
    );
  }
  for (const [name, value] of [
    ['concentration', sensor.concentration.value],
    ['range_min', sensor.calibration.range_min.value],
    ['range_max', sensor.calibration.range_max.value],
    ['lod', sensor.analytical_performance.lod.value],
    ['loq', sensor.analytical_performance.loq.value],
    ['working_electrode_area_m2', sensor.working_electrode_area_m2.value],
    ['ionic_strength_mol_m3', sensor.ionic_strength_mol_m3.value],
    ['power_consumption_w', sensor.power_consumption_w.value],
    [
      'analytical_performance.noise_std_a',
      sensor.analytical_performance.noise_std_a.value,
    ],
    [
      'analytical_performance.response_time_s',
      sensor.analytical_performance.response_time_s.value,
    ],
    [
      'analytical_performance.recovery_time_s',
      sensor.analytical_performance.recovery_time_s.value,
    ],
    [
      'calibration.maximum_current_a',
      sensor.calibration.maximum_current_a?.value,
    ],
  ] as const) {
    if (value !== undefined && value < 0) {
      issues.push(`biosensor.${name}.value must be >= 0`);
    }
  }
  if (sensor.power_available_w && sensor.power_available_w.value < 0) {
    issues.push('biosensor.power_available_w.value must be >= 0');
  }
  if (
    sensor.biorecognition_loading_mg_cm2 &&
    sensor.biorecognition_loading_mg_cm2.value < 0
  ) {
    issues.push('biosensor.biorecognition_loading_mg_cm2.value must be >= 0');
  }
  if (
    sensor.analytical_performance.calibration_r2.value < 0 ||
    sensor.analytical_performance.calibration_r2.value > 1
  ) {
    issues.push(
      'biosensor.analytical_performance.calibration_r2.value must be in [0, 1]',
    );
  }
  if (
    sensor.analytical_performance.replicate_count.value < 1 ||
    !Number.isInteger(sensor.analytical_performance.replicate_count.value)
  ) {
    issues.push(
      'biosensor.analytical_performance.replicate_count.value must be a positive integer',
    );
  }
  for (const [name, value] of [
    [
      'repeatability_cv_pct',
      sensor.analytical_performance.repeatability_cv_pct.value,
    ],
    ['accuracy_pct', sensor.analytical_performance.accuracy_pct.value],
    ['selectivity_pct', sensor.analytical_performance.selectivity_pct.value],
  ] as const) {
    if (value < 0 || value > 100) {
      issues.push(
        `biosensor.analytical_performance.${name}.value must be in [0, 100]`,
      );
    }
  }
  if (
    sensor.calibration.model !== 'linear' &&
    (!sensor.calibration.half_saturation_concentration ||
      sensor.calibration.half_saturation_concentration.value <= 0)
  ) {
    issues.push(
      'biosensor.calibration.half_saturation_concentration.value must be > 0',
    );
  }
  if (
    sensor.calibration.range_min.value >= sensor.calibration.range_max.value
  ) {
    issues.push('biosensor.calibration.range_min must be below range_max');
  }
  if (
    sensor.analytical_performance.lod.value >
    sensor.analytical_performance.loq.value
  ) {
    issues.push('biosensor.analytical_performance.lod must be <= loq');
  }
  if (
    sensor.concentration.value < sensor.calibration.range_min.value ||
    sensor.concentration.value > sensor.calibration.range_max.value
  ) {
    issues.push('biosensor.concentration is outside the calibration range');
  }
  return [...new Set(issues)];
}

function componentModelParameterIssues(
  values: NormalizedCaseInput['stack_blocks']['component_model_parameters'],
): string[] {
  const issues: string[] = [];
  if (!values) return issues;

  for (const [groupId, entries] of Object.entries(values)) {
    if (!entries) continue;
    const group = getComponentModelParameterGroup(groupId);
    if (!group) {
      issues.push(
        `stack_blocks.component_model_parameters.${groupId} is not a recognized stack component group`,
      );
      continue;
    }
    for (const [parameterId, value] of Object.entries(entries)) {
      const spec = group.parameters.find((entry) => entry.id === parameterId);
      const path = `stack_blocks.component_model_parameters.${groupId}.${parameterId}`;
      if (!spec) {
        issues.push(`${path} is not in the component property catalog`);
        continue;
      }
      if (value.unit !== spec.unit) {
        issues.push(
          `${path}.unit must be ${spec.unit}; received ${value.unit}`,
        );
      }
      const numericIssue = getComponentParameterRangeIssue(
        parameterId,
        value.value,
      );
      if (numericIssue) issues.push(`${path}.value ${numericIssue}`);
    }
  }

  return issues;
}

function getComponentParameterRangeIssue(
  parameterId: string,
  value: number,
): string | undefined {
  if (
    [
      'anode_chamber_volume_m3',
      'cathode_chamber_volume_m3',
      'reactor_length_m',
      'reactor_width_m',
      'reactor_height_m',
      'electrode_gap_m',
      'projected_area_m2',
      'electroactive_area_factor',
      'thickness_m',
      'mean_pore_diameter_m',
      'specific_surface_area_m2_m3',
      'solid_conductivity_s_m',
      'catalyst_loading_kg_m2',
      'exchange_current_density_a_m2',
      'effective_diffusivity_m2_s',
      'gas_transfer_coefficient_m_s',
      'catalyst_feature_size_m',
      'membrane_area_m2',
      'ionic_conductivity_s_m',
      'hydraulic_permeability_m2',
      'collector_conductivity_s_m',
      'collector_cross_section_m2',
      'area_specific_contact_resistance_ohm_m2',
      'working_electrode_area_m2',
      'response_time_s',
      'measurement_interval_s',
      'replicate_count',
      'biofilm_thickness_m',
      'biomass_density_kg_m3',
      'maximum_specific_cod_uptake_kg_cod_kg_biomass_s',
      'half_saturation_cod_kg_m3',
      'biomass_yield_kg_biomass_kg_cod',
      'effective_substrate_diffusivity_m2_s',
      'biofilm_conductivity_s_m',
    ].includes(parameterId) &&
    value <= 0
  ) {
    return 'must be greater than zero';
  }
  if (
    [
      'liquid_flow_m3_s',
      'pressure_drop_pa',
      'gas_pressure_pa',
      'contact_resistance_ohm',
      'leakage_rate_m3_s',
      'recirculation_flow_m3_s',
      'pump_pressure_rise_pa',
      'auxiliary_power_w',
      'gas_collection_pressure_pa',
      'dosing_flow_m3_s',
      'noise_standard_deviation_a',
      'buffer_capacity_mol_m3_ph',
    ].includes(parameterId) &&
    value < 0
  ) {
    return 'must be nonnegative';
  }
  if (
    ['porosity', 'pump_efficiency', 'gas_capture_fraction'].includes(
      parameterId,
    ) &&
    (value < 0 || value > 1)
  ) {
    return 'must be between 0 and 1';
  }
  if (
    parameterId === 'charge_transfer_coefficient' &&
    (value <= 0 || value >= 1)
  ) {
    return 'must be greater than 0 and less than 1';
  }
  if (parameterId === 'tortuosity' && value < 1) {
    return 'must be at least 1';
  }
  if (parameterId === 'cell_count' && (!Number.isInteger(value) || value < 1)) {
    return 'must be a positive integer';
  }
  if (
    parameterId === 'wetting_contact_angle_deg' &&
    (value < 0 || value > 180)
  ) {
    return 'must be between 0 and 180 degrees';
  }
  if (parameterId === 'calibration_r2' && (value < 0 || value > 1)) {
    return 'must be between 0 and 1';
  }
  return undefined;
}

function modelFidelityIssues(
  model: Pick<MechanisticModelInput, 'model_fidelity_id'> | undefined,
  componentParameters: NormalizedCaseInput['stack_blocks']['component_model_parameters'],
): string[] {
  const fidelityId = model?.model_fidelity_id;
  if (!fidelityId) return [];

  const profile = getModelFidelityProfile(fidelityId);
  if (!profile) {
    return [`mechanistic_model.model_fidelity_id is unknown: ${fidelityId}`];
  }
  if (profile.status === 'executable') return [];

  const issues = [
    `mechanistic_model.model_fidelity_id=${profile.id} is a research profile only; METREV does not execute this spatial/scale formulation.`,
  ];
  for (const requiredPath of profile.requiredComponentParameters) {
    const [groupId, parameterId] = requiredPath.split('.', 2);
    const componentGroup = componentParameters?.[groupId] as
      | Record<string, unknown>
      | undefined;
    if (!componentGroup?.[parameterId]) {
      issues.push(
        `stack_blocks.component_model_parameters.${requiredPath} is required by the selected research profile`,
      );
    }
  }
  for (const requiredInput of profile.requiredSpatialInputs) {
    issues.push(`research profile prerequisite: ${requiredInput}`);
  }
  return issues;
}

function biosensorCurrent(sensor: BiosensorConfiguration): number {
  const concentration = sensor.concentration.value;
  if (sensor.calibration.model === 'linear') {
    return (
      (sensor.calibration.intercept_a?.value ?? 0) +
      (sensor.calibration.sensitivity_a_per_unit?.value ?? 0) * concentration
    );
  }
  const maximum = sensor.calibration.maximum_current_a?.value ?? 0;
  const halfSaturation =
    sensor.calibration.half_saturation_concentration?.value ?? 0;
  return (maximum * concentration) / (halfSaturation + concentration);
}

function sourceRefsFor(input: unknown): string[] {
  const refs = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (
      'source_ref' in value &&
      typeof (value as { source_ref?: unknown }).source_ref === 'string'
    ) {
      refs.add((value as { source_ref: string }).source_ref);
      return;
    }
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (key.endsWith('_source_ref') && typeof child === 'string') {
        refs.add(child);
      }
      visit(child);
    }
  };
  visit(input);
  return [...refs].sort();
}

function seriesFor(
  input: MechanisticModelInput,
  points: Point[],
): SimulationSeries[] {
  const specs = [
    {
      key: 'cod_kg_m3',
      label: 'Dissolved COD',
      unit: 'kgCOD/m3',
      read: (point: Point) => point.state.cod,
    },
    {
      key: 'biomass_kg_m3',
      label: 'Electroactive biomass',
      unit: 'kgVSS/m3',
      read: (point: Point) => point.state.biomass,
    },
    {
      key: 'dissolved_oxygen_kg_m3',
      label: 'Cathode dissolved oxygen',
      unit: 'kgO2/m3',
      read: (point: Point) => point.state.oxygen,
    },
    {
      key: 'ph_anode',
      label: 'Anode pH',
      unit: 'pH',
      read: (point: Point) => point.state.phAnode,
    },
    {
      key: 'ph_cathode',
      label: 'Cathode pH',
      unit: 'pH',
      read: (point: Point) => point.state.phCathode,
    },
    {
      key: 'current_a',
      label: 'Cell current',
      unit: 'A',
      read: (point: Point) => point.rates.current,
    },
    {
      key: 'cell_voltage_v',
      label: 'Cell voltage',
      unit: 'V',
      read: (point: Point) => point.rates.cellVoltage,
    },
    {
      key: 'anode_activation_overpotential_v',
      label: 'Modeled anode activation overpotential',
      unit: 'V',
      read: (point: Point) => point.rates.anodeActivationOverpotentialV,
    },
    {
      key: 'cathode_activation_overpotential_v',
      label: 'Modeled cathode activation overpotential',
      unit: 'V',
      read: (point: Point) => point.rates.cathodeActivationOverpotentialV,
    },
    {
      key: 'ohmic_voltage_drop_v',
      label: 'Modeled ohmic voltage drop',
      unit: 'V',
      read: (point: Point) => point.rates.ohmicVoltageDropV,
    },
    {
      key: 'supply_limitation_voltage_loss_v',
      label: 'Current-limit voltage closure residual',
      unit: 'V',
      read: (point: Point) => point.rates.supplyLimitationVoltageLoss,
    },
    {
      key: 'cod_influent_cumulative_kg',
      label: 'Modeled cumulative influent COD mass',
      unit: 'kgCOD',
      read: (point: Point) => point.codInfluentMassKg,
    },
    {
      key: 'cod_effluent_cumulative_kg',
      label: 'Modeled cumulative effluent COD mass',
      unit: 'kgCOD',
      read: (point: Point) => point.codEffluentMassKg,
    },
    {
      key: 'cod_biodegraded_cumulative_kg',
      label: 'Modeled cumulative biodegraded COD mass',
      unit: 'kgCOD',
      read: (point: Point) => point.codBiodegradedMassKg,
    },
    {
      key: 'cod_mass_balance_residual_kg',
      label: 'Modeled COD mass-balance residual',
      unit: 'kgCOD',
      read: (point: Point) =>
        point.codInfluentMassKg -
        point.codEffluentMassKg -
        point.codBiodegradedMassKg -
        p(input, 'geometry.anode_chamber_volume_m3') *
          (point.state.cod - points[0].state.cod),
    },
    {
      key: 'biomass_mass_balance_residual_kg',
      label: 'Modeled biomass mass-balance residual',
      unit: 'kgVSS',
      read: (point: Point) =>
        point.biomassGrowthKg -
        point.biomassDecayKg -
        point.biomassWashoutKg -
        p(input, 'geometry.anode_chamber_volume_m3') *
          (point.state.biomass - points[0].state.biomass),
    },
    {
      key: 'activation_polarization_work_j',
      label: 'Modeled electrode activation polarization work',
      unit: 'J',
      read: (point: Point) =>
        point.anodeActivationWorkJ + point.cathodeActivationWorkJ,
    },
    {
      key: 'ohmic_polarization_work_j',
      label: 'Modeled ohmic polarization work',
      unit: 'J',
      read: (point: Point) => point.ohmicPolarizationWorkJ,
    },
    {
      key: 'electrochemical_boundary_residual_energy_j',
      label: 'Modeled boundary-closure residual energy equivalent',
      unit: 'J',
      read: (point: Point) => point.boundaryResidualEnergyJ,
    },
    ...(input.system_type === 'MFC'
      ? [
          {
            key: 'gross_electrical_output_energy_j',
            label: 'Gross MFC electrical output energy',
            unit: 'J',
            read: (point: Point) => point.cellElectricalEnergyJ,
          },
        ]
      : [
          {
            key: 'mec_cell_electrical_input_energy_j',
            label: 'MEC cell electrical input energy',
            unit: 'J',
            read: (point: Point) => point.cellElectricalEnergyJ,
          },
          {
            key: 'hydrogen_gross_production_mol',
            label: 'Gross MEC hydrogen produced',
            unit: 'mol',
            read: (point: Point) => point.hydrogenGrossMol,
          },
          {
            key: 'hydrogen_captured_production_mol',
            label: 'MEC hydrogen captured',
            unit: 'mol',
            read: (point: Point) => point.hydrogenCapturedMol,
          },
          {
            key: 'hydrogen_uncaptured_production_mol',
            label: 'Modeled MEC hydrogen not captured',
            unit: 'mol',
            read: (point: Point) => point.hydrogenUncapturedMol,
          },
        ]),
  ];
  return specs.map((spec) => ({
    series_id: `mechanistic:${spec.key}`,
    title: spec.label,
    series_type: 'trend_line',
    x_axis: { key: 'time_s', label: 'Time', unit: 's' },
    y_axis: { key: spec.key, label: spec.label, unit: spec.unit },
    points: points.map((point) => ({
      x: point.time_s,
      y: spec.read(point),
      meta: {},
    })),
    source_kind: 'modeled',
    provenance_note: `Calculated by ${MODEL_VERSION} from source-referenced inputs.`,
  }));
}

function failedRun(missingInputs: string[], note: string): MechanisticRun {
  return {
    status: 'insufficient_data',
    missingInputs,
    note,
    inputSnapshot: {},
    observations: [],
    series: [],
    assumptions: [],
    sourceRefs: [],
    confidenceScore: 0,
    confidenceLevel: 'low',
  };
}

interface ReportedUncertaintyCandidate {
  parameterPath: string;
  value: number;
  uncertainty: number;
  unit: string;
  sourceKind: SimulationSensitivityAnalysis['effects'][number]['source_kind'];
  sourceRef: string;
}

const MAX_SENSITIVITY_PARAMETERS = 16;
const SENSITIVITY_INTERPRETATION =
  'Each eligible input is changed separately to nominal minus and plus its reported uncertainty magnitude. These deterministic scenarios do not assign a probability distribution, combine parameter uncertainties, or form a prediction interval.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isScientificParameterRecord(
  value: Record<string, unknown>,
): value is Record<string, unknown> & {
  value: number;
  unit: string;
  source_kind: string;
  source_ref: string;
} {
  return (
    typeof value.value === 'number' &&
    typeof value.unit === 'string' &&
    typeof value.source_kind === 'string' &&
    typeof value.source_ref === 'string'
  );
}

function collectReportedUncertaintyCandidates(input: NormalizedCaseInput): {
  candidates: ReportedUncertaintyCandidate[];
  skipped: Array<{ parameter_path: string; reason: string }>;
} {
  const candidates: ReportedUncertaintyCandidate[] = [];
  const skipped: Array<{ parameter_path: string; reason: string }> = [];
  const roots: Array<[string, unknown]> = [
    ['mechanistic_model', input.mechanistic_model],
    [
      'stack_blocks.sensors_and_analytics.biosensor',
      input.stack_blocks.sensors_and_analytics.biosensor,
    ],
  ];

  const visit = (value: unknown, path: string) => {
    if (!isRecord(value)) return;
    if (isScientificParameterRecord(value)) {
      if (value.uncertainty !== undefined) {
        if (
          typeof value.uncertainty !== 'number' ||
          !Number.isFinite(value.uncertainty) ||
          value.uncertainty <= 0
        ) {
          skipped.push({
            parameter_path: path,
            reason:
              'A positive finite reported uncertainty magnitude is required for a perturbation scenario.',
          });
        } else if (value.uncertainty_unit !== value.unit) {
          skipped.push({
            parameter_path: path,
            reason:
              'The uncertainty unit is missing or differs from the parameter unit.',
          });
        } else {
          candidates.push({
            parameterPath: path,
            value: value.value,
            uncertainty: value.uncertainty,
            unit: value.unit,
            sourceKind:
              value.source_kind as ReportedUncertaintyCandidate['sourceKind'],
            sourceRef: value.source_ref,
          });
        }
      }
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      visit(nested, `${path}.${key}`);
    }
  };

  for (const [path, root] of roots) visit(root, path);
  candidates.sort((left, right) =>
    left.parameterPath.localeCompare(right.parameterPath),
  );

  if (candidates.length > MAX_SENSITIVITY_PARAMETERS) {
    for (const candidate of candidates.slice(MAX_SENSITIVITY_PARAMETERS)) {
      skipped.push({
        parameter_path: candidate.parameterPath,
        reason: `The per-run sensitivity limit is ${MAX_SENSITIVITY_PARAMETERS} parameters.`,
      });
    }
    candidates.length = MAX_SENSITIVITY_PARAMETERS;
  }

  return { candidates, skipped };
}

function setParameterValue(
  input: NormalizedCaseInput,
  parameterPath: string,
  value: number,
): NormalizedCaseInput | undefined {
  const cloned = structuredClone(input) as unknown as Record<string, unknown>;
  const segments = parameterPath.split('.');
  const leafKey = segments.pop();
  if (!leafKey) return undefined;

  let current = cloned;
  for (const segment of segments) {
    const next = current[segment];
    if (!isRecord(next)) return undefined;
    current = next;
  }

  const parameter = current[leafKey];
  if (!isRecord(parameter)) return undefined;
  parameter.value = value;
  return cloned as unknown as NormalizedCaseInput;
}

function numericObservationMap(
  run: MechanisticRun,
): Map<string, { label: string; unit: string | null; value: number }> {
  return new Map(
    run.observations.flatMap((item) =>
      typeof item.value === 'number'
        ? [
            [
              item.key,
              { label: item.label, unit: item.unit, value: item.value },
            ],
          ]
        : [],
    ),
  );
}

function buildSensitivityAnalysis(
  input: NormalizedCaseInput,
  nominalRun: MechanisticRun,
): SimulationSensitivityAnalysis {
  const { candidates, skipped } = collectReportedUncertaintyCandidates(input);
  if (candidates.length === 0) {
    return {
      method: 'one_at_a_time_reported_uncertainty_v1',
      status: 'not_available',
      interpretation: SENSITIVITY_INTERPRETATION,
      evaluated_parameter_count: 0,
      skipped_parameters: skipped,
      effects: [],
    };
  }

  const nominalObservations = numericObservationMap(nominalRun);
  const effects: SimulationSensitivityAnalysis['effects'] = candidates.map(
    (candidate) => {
      const lowerInputValue = candidate.value - candidate.uncertainty;
      const upperInputValue = candidate.value + candidate.uncertainty;
      const lowerInput = setParameterValue(
        input,
        candidate.parameterPath,
        lowerInputValue,
      );
      const upperInput = setParameterValue(
        input,
        candidate.parameterPath,
        upperInputValue,
      );
      const lowerRun = lowerInput
        ? simulateMechanisticCaseCore(lowerInput)
        : failedRun(
            [candidate.parameterPath],
            'The lower perturbation could not be applied to the input snapshot.',
          );
      const upperRun = upperInput
        ? simulateMechanisticCaseCore(upperInput)
        : failedRun(
            [candidate.parameterPath],
            'The upper perturbation could not be applied to the input snapshot.',
          );
      const lowerObservations = numericObservationMap(lowerRun);
      const upperObservations = numericObservationMap(upperRun);
      const metrics = [...nominalObservations.entries()].map(
        ([key, nominal]) => {
          const lowerValue = lowerObservations.get(key)?.value ?? null;
          const upperValue = upperObservations.get(key)?.value ?? null;
          return {
            key,
            label: nominal.label,
            unit: nominal.unit,
            nominal_value: nominal.value,
            lower_input_value: lowerValue,
            upper_input_value: upperValue,
            lower_change_from_nominal:
              lowerValue === null ? null : lowerValue - nominal.value,
            upper_change_from_nominal:
              upperValue === null ? null : upperValue - nominal.value,
          };
        },
      );
      const lowerCompleted = lowerRun.status === 'completed';
      const upperCompleted = upperRun.status === 'completed';

      return {
        parameter_path: candidate.parameterPath,
        source_kind: candidate.sourceKind,
        source_ref: candidate.sourceRef,
        unit: candidate.unit,
        nominal_value: candidate.value,
        reported_uncertainty: candidate.uncertainty,
        status:
          lowerCompleted && upperCompleted
            ? 'completed'
            : lowerCompleted || upperCompleted
              ? 'partial'
              : 'blocked',
        lower_input_scenario: {
          status: lowerRun.status,
          input_value: lowerInputValue,
          missing_inputs: lowerRun.missingInputs,
          ...(lowerRun.status === 'insufficient_data'
            ? { note: lowerRun.note }
            : {}),
        },
        upper_input_scenario: {
          status: upperRun.status,
          input_value: upperInputValue,
          missing_inputs: upperRun.missingInputs,
          ...(upperRun.status === 'insufficient_data'
            ? { note: upperRun.note }
            : {}),
        },
        metrics,
      };
    },
  );
  const hasIncompleteEffects = effects.some(
    (effect) => effect.status !== 'completed',
  );

  return {
    method: 'one_at_a_time_reported_uncertainty_v1',
    status:
      skipped.length > 0 || hasIncompleteEffects ? 'partial' : 'completed',
    interpretation: SENSITIVITY_INTERPRETATION,
    evaluated_parameter_count: effects.length,
    skipped_parameters: skipped,
    effects,
  };
}

function simulateMechanisticCaseCore(
  normalizedCase: NormalizedCaseInput,
): MechanisticRun {
  const componentParameters =
    normalizedCase.stack_blocks.component_model_parameters;
  const componentIssues = componentModelParameterIssues(componentParameters);
  if (componentIssues.length > 0) {
    return failedRun(
      componentIssues,
      'Component model parameters must use catalogued properties, compatible units, and explicit provenance.',
    );
  }

  const sensorDraft = normalizedCase.stack_blocks.sensors_and_analytics
    .biosensor as BiosensorConfigurationDraft | undefined;
  const sensorResult = sensorDraft
    ? biosensorConfigurationSchema.safeParse(sensorDraft)
    : undefined;
  const sensorIssues =
    sensorResult && !sensorResult.success
      ? sensorResult.error.issues.map(
          (issue) =>
            `stack_blocks.sensors_and_analytics.biosensor.${issue.path.join('.')}`,
        )
      : [];
  const sensor: BiosensorConfiguration | undefined = sensorResult?.success
    ? sensorResult.data
    : undefined;
  if (normalizedCase.technology_family === 'electrochemical_biosensor') {
    if (!sensor) {
      return failedRun(
        sensorIssues.length
          ? sensorIssues
          : ['stack_blocks.sensors_and_analytics.biosensor'],
        'A standalone electrochemical biosensor requires a complete sensor definition and calibration.',
      );
    }
    return simulateStandaloneBiosensor(sensor);
  }

  if (normalizedCase.missing_data.includes('technology_family')) {
    return failedRun(
      ['technology_family must be explicitly supplied before model execution'],
      'A missing system classification cannot select a mechanistic model.',
    );
  }

  if (
    normalizedCase.technology_family !== 'microbial_fuel_cell' &&
    normalizedCase.technology_family !== 'microbial_electrolysis_cell'
  ) {
    return failedRun(
      [
        'technology_family must be explicitly classified as MFC, MEC, or biosensor',
      ],
      'Mechanistic execution is blocked for historical or unclassified technology families.',
    );
  }

  if (
    normalizedCase.defaults_used.includes(
      'technology_family:domain_template_default',
    )
  ) {
    return failedRun(
      ['technology_family must be explicitly supplied before model execution'],
      'The system type came from a template default and cannot select a mechanistic model.',
    );
  }

  const fidelityIssues = modelFidelityIssues(
    normalizedCase.mechanistic_model,
    componentParameters,
  );
  if (fidelityIssues.length > 0) {
    return failedRun(
      fidelityIssues,
      'The requested model fidelity is catalogued for research but is not executable in METREV.',
    );
  }

  if (!normalizedCase.mechanistic_model) {
    return failedRun(
      [
        'mechanistic_model.geometry: electrode areas, chamber volumes, electrode gap, and separator properties',
        'mechanistic_model.operation: influent COD, flow, temperature, pH, oxygen and time domain',
        'mechanistic_model.biology: uptake kinetics, biomass yield/decay, electron efficiency, buffer capacity',
        'mechanistic_model.electrochemistry: reversible voltage, charge-transfer kinetics and circuit boundary',
      ],
      'The proxy simulator has been retired. A source-backed coupled model input is required.',
    );
  }

  const modelResult = mechanisticModelInputSchema.safeParse(
    normalizedCase.mechanistic_model,
  );
  if (!modelResult.success) {
    const modelIssues = modelResult.error.issues.map(
      (issue) => `mechanistic_model.${issue.path.join('.')}`,
    );
    return failedRun(
      [...modelIssues, ...sensorIssues],
      'Mechanistic execution requires complete, unit-consistent, source-referenced inputs.',
    );
  }
  const model = modelResult.data;

  const issues = collectInputIssues(model);
  if (model.model_profile_id) {
    const profile = getBioelectrochemicalModelProfile(model.model_profile_id);

    if (!profile) {
      issues.push(
        `mechanistic_model.model_profile_id is unknown: ${model.model_profile_id}`,
      );
    } else if (profile.status !== 'executable') {
      issues.push(
        `mechanistic_model.model_profile_id=${profile.id} is a research profile only; ${profile.limitations[0]}`,
      );
    } else if (profile.system !== model.system_type) {
      issues.push(
        `mechanistic_model.model_profile_id=${profile.id} requires system_type=${profile.system}`,
      );
    } else {
      const isBatch = model.operation.flow_m3_s.value === 0;
      const profileRequiresBatch = profile.operatingRegime === 'batch';

      if (profileRequiresBatch !== isBatch) {
        issues.push(
          `mechanistic_model.model_profile_id=${profile.id} is inconsistent with flow_m3_s=${model.operation.flow_m3_s.value}; batch profiles require zero flow and continuous-mixed profiles require positive flow`,
        );
      }
    }
  }
  if (
    model.system_type !==
    (normalizedCase.technology_family === 'microbial_fuel_cell' ? 'MFC' : 'MEC')
  ) {
    issues.push('mechanistic_model.system_type must match technology_family');
  }
  if (sensorDraft && !sensor) {
    issues.push(...sensorIssues);
  }
  if (sensor) {
    issues.push(...biosensorIssues(sensor));
    if (
      (model.system_type === 'MFC' &&
        sensor.deployment_mode === 'mec_integrated') ||
      (model.system_type === 'MEC' &&
        sensor.deployment_mode === 'mfc_integrated') ||
      sensor.deployment_mode === 'standalone'
    ) {
      issues.push(
        'biosensor.deployment_mode must match the integrated reactor type',
      );
    }
    if (
      sensor.power_source === 'mfc_harvested' &&
      model.system_type !== 'MFC'
    ) {
      issues.push('biosensor.power_source=mfc_harvested requires an MFC');
    }
    if (
      sensor.power_source === 'mec_power_bus' &&
      (!sensor.power_available_w || sensor.power_available_w.unit !== 'W')
    ) {
      issues.push(
        'biosensor.power_available_w (required in W for mec_power_bus)',
      );
    }
  }
  if (issues.length) {
    return failedRun(
      issues,
      'Mechanistic execution requires complete, unit-consistent, source-referenced inputs.',
    );
  }

  const reactorRun = runReactor(model);
  const points = reactorRun.points;
  const initial = points[0];
  const final = points[points.length - 1];
  const anodeVolume = p(model, 'geometry.anode_chamber_volume_m3');
  const codAccumulationMassKg =
    anodeVolume * (final.state.cod - initial.state.cod);
  const codMassBalanceResidualKg =
    reactorRun.codInfluentMassKg -
    reactorRun.codEffluentMassKg -
    reactorRun.codBiodegradedMassKg -
    codAccumulationMassKg;
  const biomassAccumulationKg =
    anodeVolume * (final.state.biomass - initial.state.biomass);
  const biomassMassBalanceResidualKg =
    reactorRun.biomassGrowthKg -
    reactorRun.biomassDecayKg -
    reactorRun.biomassWashoutKg -
    biomassAccumulationKg;
  const anodeArea = p(model, 'geometry.anode_area_m2');
  const influentCod = p(model, 'operation.influent_cod_kg_m3');
  const codRemoval =
    influentCod > 0
      ? Math.max(
          0,
          Math.min(100, ((influentCod - final.state.cod) / influentCod) * 100),
        )
      : 0;
  const isBatchProfile =
    getBioelectrochemicalModelProfile(model.model_profile_id ?? '')
      ?.operatingRegime === 'batch';
  const electricalDensity =
    model.system_type === 'MFC'
      ? (final.rates.current ** 2 *
          p(model, 'electrochemistry.external_load_ohm')) /
        anodeArea
      : (final.rates.current * p(model, 'electrochemistry.applied_voltage_v')) /
        anodeArea;
  const hydrogenGrossMolPerSecond =
    model.system_type === 'MEC'
      ? (final.rates.current *
          p(model, 'electrochemistry.hydrogen_faraday_efficiency')) /
        (2 * FARADAY)
      : null;
  const hydrogenCapturedMolPerSecond =
    hydrogenGrossMolPerSecond === null
      ? null
      : hydrogenGrossMolPerSecond *
        p(model, 'electrochemistry.hydrogen_capture_fraction');
  const hydrogenUncapturedMolPerSecond =
    hydrogenGrossMolPerSecond === null || hydrogenCapturedMolPerSecond === null
      ? null
      : hydrogenGrossMolPerSecond - hydrogenCapturedMolPerSecond;
  const grossElectricalPowerW =
    model.system_type === 'MFC'
      ? final.rates.current ** 2 *
        p(model, 'electrochemistry.external_load_ohm')
      : final.rates.current * p(model, 'electrochemistry.applied_voltage_v');
  const auxiliaryPowerW = p(model, 'operation.auxiliary_power_w');
  const hasAssumedValues = (() => {
    const stack: unknown[] = [model];
    if (sensor) stack.push(sensor);
    while (stack.length) {
      const next = stack.pop();
      if (!next || typeof next !== 'object') continue;
      if ('source_kind' in next) {
        const kind = (next as { source_kind?: string }).source_kind;
        if (
          kind === 'assumption' ||
          kind === 'default' ||
          kind === 'test_fixture'
        ) {
          return true;
        }
      }
      stack.push(...Object.values(next as Record<string, unknown>));
    }
    return false;
  })();
  const confidenceLevel: MechanisticRun['confidenceLevel'] = hasAssumedValues
    ? 'low'
    : 'medium';
  const confidenceScore = hasAssumedValues ? 20 : 55;
  const observations: DerivedObservation[] = [
    observation({
      key: 'current_density_a_m2',
      label: 'Current density',
      value: final.rates.current / anodeArea,
      unit: 'A/m2',
      confidence: confidenceLevel,
      note: 'Dynamic coupled MFC/MEC model: Monod COD uptake, charge-transfer kinetics, ohmic transport, oxygen limitation and external boundary condition.',
    }),
    observation({
      key: 'internal_resistance_ohm',
      label: 'Electrolyte, separator, and contact resistance',
      value: final.rates.ohmicResistance,
      unit: 'ohm',
      confidence: confidenceLevel,
      note: 'Calculated from electrolyte gap/conductivity, separator geometry/conductivity, and source-referenced contact resistance.',
    }),
    observation({
      key: 'supply_limitation_voltage_loss_v',
      label: 'Current-limit voltage closure residual',
      value: final.rates.supplyLimitationVoltageLoss,
      unit: 'V',
      confidence: confidenceLevel,
      note: 'Algebraic residual needed to close the MFC load line or MEC applied-voltage balance when the current is capped by electron supply or cathode oxygen transfer. This is a modeled residual, not a separately measured loss.',
    }),
    observation({
      key: 'anode_activation_overpotential_v',
      label: 'Modeled anode activation overpotential',
      value: final.rates.anodeActivationOverpotentialV,
      unit: 'V',
      confidence: confidenceLevel,
      note: 'Final-state Butler-Volmer overpotential for the anode; calculated from the supplied exchange-current and area parameters.',
    }),
    observation({
      key: 'cathode_activation_overpotential_v',
      label: 'Modeled cathode activation overpotential',
      value: final.rates.cathodeActivationOverpotentialV,
      unit: 'V',
      confidence: confidenceLevel,
      note: 'Final-state Butler-Volmer overpotential for the active MFC or MEC cathode reaction.',
    }),
    observation({
      key: 'ohmic_voltage_drop_v',
      label: 'Modeled ohmic voltage drop',
      value: final.rates.ohmicVoltageDropV,
      unit: 'V',
      confidence: confidenceLevel,
      note: 'Final-state current multiplied by modeled electrolyte, separator, and contact resistance.',
    }),
    observation({
      key: 'cod_influent_mass_kg',
      label: 'Integrated modeled influent COD mass',
      value: reactorRun.codInfluentMassKg,
      unit: 'kgCOD',
      confidence: confidenceLevel,
      note: 'Influent COD concentration times flow, integrated over the modeled duration.',
    }),
    observation({
      key: 'cod_effluent_mass_kg',
      label: 'Integrated modeled effluent COD mass',
      value: reactorRun.codEffluentMassKg,
      unit: 'kgCOD',
      confidence: confidenceLevel,
      note: 'Simulated anode COD concentration times flow, integrated over the modeled duration.',
    }),
    observation({
      key: 'cod_biodegraded_mass_kg',
      label: 'Integrated modeled biodegraded COD mass',
      value: reactorRun.codBiodegradedMassKg,
      unit: 'kgCOD',
      confidence: confidenceLevel,
      note: 'Monod COD uptake rate times anode volume, integrated using the same RK4 stages as the state solver.',
    }),
    observation({
      key: 'cod_accumulation_mass_kg',
      label: 'Modeled COD accumulation change',
      value: codAccumulationMassKg,
      unit: 'kgCOD',
      confidence: confidenceLevel,
      note: 'Anode volume times final-minus-initial soluble COD concentration.',
    }),
    observation({
      key: 'cod_mass_balance_residual_kg',
      label: 'Modeled COD mass-balance residual',
      value: codMassBalanceResidualKg,
      unit: 'kgCOD',
      confidence: confidenceLevel,
      note: 'Influent minus effluent minus modeled uptake minus COD accumulation; this numerical closure residual is not an experimental error estimate.',
    }),
    observation({
      key: 'biomass_growth_mass_kg',
      label: 'Integrated modeled biomass growth',
      value: reactorRun.biomassGrowthKg,
      unit: 'kgVSS',
      confidence: confidenceLevel,
      note: 'Biomass yield times modeled COD uptake, integrated over the modeled duration.',
    }),
    observation({
      key: 'biomass_decay_loss_kg',
      label: 'Integrated modeled biomass decay loss',
      value: reactorRun.biomassDecayKg,
      unit: 'kgVSS',
      confidence: confidenceLevel,
      note: 'First-order biomass decay term from the supplied decay-rate parameter; not a measured solids-loss quantity.',
    }),
    observation({
      key: 'biomass_washout_loss_kg',
      label: 'Integrated modeled biomass washout loss',
      value: reactorRun.biomassWashoutKg,
      unit: 'kgVSS',
      confidence: confidenceLevel,
      note: 'Explicit first-order washout term from the supplied operation boundary; not a measured solids-loss quantity.',
    }),
    observation({
      key: 'biomass_accumulation_change_kg',
      label: 'Modeled biomass accumulation change',
      value: biomassAccumulationKg,
      unit: 'kgVSS',
      confidence: confidenceLevel,
      note: 'Anode volume times final-minus-initial electroactive biomass concentration.',
    }),
    observation({
      key: 'biomass_mass_balance_residual_kg',
      label: 'Modeled biomass mass-balance residual',
      value: biomassMassBalanceResidualKg,
      unit: 'kgVSS',
      confidence: confidenceLevel,
      note: 'Growth minus decay minus washout minus biomass accumulation; this numerical closure residual is not an experimental error estimate.',
    }),
    observation({
      key: 'electrochemical_reversible_potential_work_j',
      label:
        'Integrated modeled reversible-potential work at simulated current',
      value: reactorRun.reversiblePotentialEnergyJ,
      unit: 'J',
      confidence: confidenceLevel,
      note: 'Integral of simulated current times the supplied reversible cell voltage; this is a model bookkeeping term, not a thermodynamic system-efficiency measurement.',
    }),
    observation({
      key: 'activation_polarization_work_j',
      label: 'Integrated modeled electrode activation-polarization work',
      value:
        reactorRun.anodeActivationWorkJ + reactorRun.cathodeActivationWorkJ,
      unit: 'J',
      confidence: confidenceLevel,
      note: 'Integral of current times both electrode Butler-Volmer overpotentials; electrical-equivalent polarization work, not measured heat.',
    }),
    observation({
      key: 'ohmic_polarization_work_j',
      label: 'Integrated modeled ohmic polarization work',
      value: reactorRun.ohmicPolarizationWorkJ,
      unit: 'J',
      confidence: confidenceLevel,
      note: 'Integral of current squared times modeled internal resistance; electrical-equivalent work, not calorimetric heat measurement.',
    }),
    observation({
      key: 'electrochemical_boundary_residual_energy_j',
      label:
        'Integrated modeled electrochemical boundary-residual energy equivalent',
      value: reactorRun.boundaryResidualEnergyJ,
      unit: 'J',
      confidence: confidenceLevel,
      note: 'Integral of current times the remaining load-line or applied-voltage residual. It identifies voltage not closed by this model boundary; it is not assigned to a physical loss pathway.',
    }),
    observation({
      key: 'cod_removal_pct',
      label: 'COD removal',
      value: codRemoval,
      unit: '%',
      confidence: confidenceLevel,
      note: isBatchProfile
        ? 'Calculated from initial and final modeled soluble COD inventory in a closed batch run; this is not a continuous effluent removal metric.'
        : 'Calculated from the simulated continuous-flow anode COD balance at the final integration time.',
    }),
    observation({
      key: 'effluent_cod_kg_m3',
      label: isBatchProfile ? 'Final batch COD' : 'Effluent COD',
      value: final.state.cod,
      unit: 'kgCOD/m3',
      confidence: confidenceLevel,
      note: isBatchProfile
        ? 'Final soluble COD concentration in the modeled batch inventory; not a sampled effluent concentration.'
        : 'Final state of the simulated continuous-flow COD balance.',
    }),
    observation({
      key: 'ph_anode_final',
      label: 'Final anode pH',
      value: final.state.phAnode,
      unit: 'pH',
      confidence: confidenceLevel,
      note: 'Integrated proton balance with explicit buffer capacity and inter-chamber proton transfer.',
    }),
    observation({
      key: 'ph_cathode_final',
      label: 'Final cathode pH',
      value: final.state.phCathode,
      unit: 'pH',
      confidence: confidenceLevel,
      note: 'Integrated proton balance with explicit buffer capacity and inter-chamber proton transfer.',
    }),
  ];
  if (model.system_type === 'MFC') {
    const netPowerW = grossElectricalPowerW - auxiliaryPowerW;
    observations.push(
      observation({
        key: 'power_density_w_m2',
        label: 'Gross MFC power density',
        value: electricalDensity,
        unit: 'W/m2',
        confidence: confidenceLevel,
        note: 'Calculated from the simulated current and external load.',
      }),
      observation({
        key: 'gross_power_w',
        label: 'Gross electrical output',
        value: grossElectricalPowerW,
        unit: 'W',
        confidence: confidenceLevel,
        note: 'MFC current through the external load before balance-of-plant and sensor loads.',
      }),
      observation({
        key: 'auxiliary_power_w',
        label: 'Auxiliary electrical demand',
        value: auxiliaryPowerW,
        unit: 'W',
        confidence: confidenceLevel,
        note: 'Source-referenced pump, dosing, controls, and other auxiliary power supplied with the case.',
      }),
      observation({
        key: 'net_power_w',
        label: 'Net MFC power after auxiliary demand',
        value: netPowerW,
        unit: 'W',
        confidence: confidenceLevel,
        note: 'Gross load output minus auxiliary demand; integrated sensor demand is subtracted separately below.',
      }),
      observation({
        key: 'net_power_density_w_m2',
        label: 'Net MFC power density',
        value: netPowerW / anodeArea,
        unit: 'W/m2',
        confidence: confidenceLevel,
        note: 'Net MFC power after auxiliary demand divided by projected geometric anode area.',
      }),
      observation({
        key: 'gross_electrical_output_energy_j',
        label: 'Gross MFC electrical output energy',
        value: reactorRun.cellElectricalEnergyJ,
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Time-integrated external-load output over the modeled duration, before auxiliary and sensor loads.',
      }),
      observation({
        key: 'auxiliary_energy_demand_j',
        label: 'MFC auxiliary energy demand',
        value: auxiliaryPowerW * p(model, 'operation.duration_s'),
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Source-referenced auxiliary power integrated over the modeled duration; sensor demand is not included.',
      }),
      observation({
        key: 'net_electrical_energy_j',
        label: 'Net MFC electrical energy after auxiliary demand',
        value:
          reactorRun.cellElectricalEnergyJ -
          auxiliaryPowerW * p(model, 'operation.duration_s'),
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Integrated external-load output minus auxiliary energy demand over the modeled duration; integrated sensor demand is not included.',
      }),
    );
  } else {
    observations.push(
      observation({
        key: 'mec_electrical_input_density_w_m2',
        label: 'MEC electrical input density',
        value: electricalDensity,
        unit: 'W/m2',
        confidence: confidenceLevel,
        note: 'Applied cell voltage times simulated current per anode area; this is external electrical input, not generated power.',
      }),
      observation({
        key: 'mec_cell_electrical_input_w',
        label: 'MEC cell electrical input',
        value: grossElectricalPowerW,
        unit: 'W',
        confidence: confidenceLevel,
        note: 'Applied cell voltage times current; this is external electrical input, not generated power.',
      }),
      observation({
        key: 'mec_total_electrical_demand_w',
        label: 'MEC total electrical demand',
        value: grossElectricalPowerW + auxiliaryPowerW,
        unit: 'W',
        confidence: confidenceLevel,
        note: 'Cell electrical input plus auxiliary demand, before any sensor load.',
      }),
      observation({
        key: 'mec_cell_electrical_input_energy_j',
        label: 'MEC cell electrical input energy',
        value: reactorRun.cellElectricalEnergyJ,
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Time-integrated applied-voltage input to the MEC over the modeled duration; this is external electrical input, not generated energy.',
      }),
      observation({
        key: 'mec_auxiliary_energy_demand_j',
        label: 'MEC auxiliary energy demand',
        value: auxiliaryPowerW * p(model, 'operation.duration_s'),
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Source-referenced auxiliary power integrated over the modeled duration; sensor demand is not included.',
      }),
      observation({
        key: 'mec_total_electrical_demand_energy_j',
        label: 'MEC total electrical demand energy',
        value:
          reactorRun.cellElectricalEnergyJ +
          auxiliaryPowerW * p(model, 'operation.duration_s'),
        unit: 'J',
        confidence: confidenceLevel,
        note: 'Integrated cell electrical input plus auxiliary demand over the modeled duration, before any sensor load.',
      }),
    );
  }
  if (
    hydrogenGrossMolPerSecond !== null &&
    hydrogenCapturedMolPerSecond !== null &&
    hydrogenUncapturedMolPerSecond !== null
  ) {
    observations.push(
      observation({
        key: 'hydrogen_gross_production_mol_s',
        label: 'Gross MEC hydrogen production rate',
        value: hydrogenGrossMolPerSecond,
        unit: 'mol/s',
        confidence: confidenceLevel,
        note: 'Faradaic hydrogen rate from MEC current and source-referenced hydrogen Faradaic efficiency, before gas collection losses.',
      }),
      observation({
        key: 'hydrogen_captured_production_mol_s',
        label: 'Captured MEC hydrogen rate',
        value: hydrogenCapturedMolPerSecond,
        unit: 'mol/s',
        confidence: confidenceLevel,
        note: 'Gross Faradaic hydrogen rate multiplied by source-referenced hydrogen capture fraction.',
      }),
      observation({
        key: 'hydrogen_uncaptured_production_mol_s',
        label: 'Modeled gross MEC hydrogen not captured rate',
        value: hydrogenUncapturedMolPerSecond,
        unit: 'mol/s',
        confidence: confidenceLevel,
        note: 'Gross Faradaic hydrogen rate minus the source-referenced captured fraction; the model does not resolve gas crossover or leak mechanisms.',
      }),
      observation({
        key: 'hydrogen_gross_production_mol',
        label: 'Gross MEC hydrogen produced',
        value: reactorRun.hydrogenGrossMol,
        unit: 'mol',
        confidence: confidenceLevel,
        note: 'Time-integrated gross Faradaic hydrogen generation over the modeled duration, before gas collection losses.',
      }),
      observation({
        key: 'hydrogen_captured_production_mol',
        label: 'MEC hydrogen captured',
        value: reactorRun.hydrogenCapturedMol,
        unit: 'mol',
        confidence: confidenceLevel,
        note: 'Time-integrated gross Faradaic hydrogen multiplied by source-referenced capture fraction.',
      }),
      observation({
        key: 'hydrogen_uncaptured_production_mol',
        label: 'Modeled gross MEC hydrogen not captured',
        value: reactorRun.hydrogenUncapturedMol,
        unit: 'mol',
        confidence: confidenceLevel,
        note: 'Gross modeled Faradaic hydrogen minus modeled captured hydrogen. The model does not separate leakage, crossover, dissolution, or collection failures.',
      }),
    );
  }

  if (sensor) {
    const current = biosensorCurrent(sensor);
    const availableSensorPowerW =
      sensor.power_source === 'mfc_harvested'
        ? grossElectricalPowerW - auxiliaryPowerW
        : sensor.power_source === 'mec_power_bus'
          ? (sensor.power_available_w?.value ?? 0) -
            grossElectricalPowerW -
            auxiliaryPowerW
          : (sensor.power_available_w?.value ?? 0);
    const netPower = availableSensorPowerW - sensor.power_consumption_w.value;
    if (netPower < 0) {
      return failedRun(
        ['biosensor.power_consumption_w exceeds available process power'],
        'The sensor load exceeds the source-backed power budget.',
      );
    }
    observations.push(
      observation({
        key: 'biosensor_signal_current_a',
        label: `${sensor.analyte_id} biosensor signal`,
        value: current,
        unit: 'A',
        confidence: confidenceLevel,
        note: `Predicted ${sensor.transduction_mode} response using the supplied ${sensor.calibration.model} calibration in ${sensor.matrix}.`,
      }),
      observation({
        key: 'biosensor_signal_to_noise_ratio',
        label: `${sensor.analyte_id} biosensor signal-to-noise ratio`,
        value:
          sensor.analytical_performance.noise_std_a.value > 0
            ? Math.abs(current) /
              sensor.analytical_performance.noise_std_a.value
            : 'unbounded_zero_noise',
        unit: '1',
        confidence: confidenceLevel,
        note: 'Absolute calibrated current divided by the source-referenced baseline noise standard deviation.',
      }),
      observation({
        key: 'biosensor_detection_status',
        label: `${sensor.analyte_id} detection status`,
        value:
          sensor.concentration.value < sensor.analytical_performance.lod.value
            ? 'below_lod'
            : sensor.concentration.value <
                sensor.analytical_performance.loq.value
              ? 'detected_below_loq'
              : 'quantifiable',
        unit: null,
        confidence: confidenceLevel,
        note: 'Detection state is determined from the supplied LOD/LOQ and source-referenced analyte concentration.',
      }),
    );
    if (Number.isFinite(netPower)) {
      observations.push(
        observation({
          key: 'biosensor_net_power_w',
          label: 'Biosensor remaining power budget',
          value: netPower,
          unit: 'W',
          confidence: confidenceLevel,
          note: `Power draw is subtracted from the ${sensor.power_source} power budget; MEC-bus power is external input, not net energy production.`,
        }),
      );
    }
  }

  const allRefs = sourceRefsFor(model);
  if (sensor) {
    for (const ref of sourceRefsFor(sensor)) {
      if (!allRefs.includes(ref)) allRefs.push(ref);
    }
  }
  return {
    status: 'completed',
    missingInputs: [],
    note: 'Coupled dynamic lumped reactor model solved with source-referenced inputs.',
    inputSnapshot: {
      model_version: model.model_version,
      system_type: model.system_type,
      model_inputs: model,
      biosensor_inputs: sensor ?? null,
      initial_state: initial.state,
      final_state: final.state,
      integration_points: points.length,
    },
    observations,
    series: seriesFor(model, points),
    assumptions: [
      'Reactor is represented as a well-mixed, isothermal 0D anode/CSTR plus an oxygen-transfer-limited cathode.',
      'Electroactive biomass follows Monod COD uptake, yield/decay, pH inhibition and Arrhenius temperature response.',
      'Current is algebraically coupled to Butler–Volmer charge transfer, electrolyte/separator resistance, electron supply and cathode oxygen transport.',
      'Anode/cathode pH is coupled through current-driven proton balance and an explicit inter-chamber transfer coefficient.',
      'Spatial biofilm gradients, multipopulation ecology, nitrogen species, alkalinity speciation, gas transfer losses and thermal dynamics are outside this first executable 0D model.',
      'Supplied uncertainty magnitudes are tested one parameter at a time; the scenarios do not combine uncertainties or produce a probabilistic interval.',
    ],
    sourceRefs: allRefs,
    confidenceScore,
    confidenceLevel,
  };
}

function simulateStandaloneBiosensor(
  sensor: BiosensorConfiguration | undefined,
): MechanisticRun {
  if (!sensor) {
    return failedRun(
      ['stack_blocks.sensors_and_analytics.biosensor'],
      'A standalone electrochemical biosensor requires a complete sensor definition and calibration.',
    );
  }
  const issues = biosensorIssues(sensor);
  if (sensor.deployment_mode !== 'standalone') {
    issues.push(
      'biosensor.deployment_mode must be standalone for a standalone case',
    );
  }
  if (sensor.power_source !== 'external') {
    issues.push(
      'standalone biosensor requires an explicit external power source',
    );
  }
  if (issues.length) {
    return failedRun(
      issues,
      'Biosensor model input is incomplete or inconsistent.',
    );
  }
  const current = biosensorCurrent(sensor);
  const netPower =
    (sensor.power_available_w?.value ?? 0) - sensor.power_consumption_w.value;
  if (netPower < 0) {
    return failedRun(
      ['biosensor.power_available_w is below power_consumption_w'],
      'The external sensor supply is insufficient for the specified sensor load.',
    );
  }
  const score = sensor.analytical_performance.noise_std_a.value === 0 ? 55 : 45;
  return {
    status: 'completed',
    missingInputs: [],
    note: 'Standalone amperometric biosensor response calculated from its source-referenced calibration.',
    inputSnapshot: {
      model_version: MODEL_VERSION,
      analyte_id: sensor.analyte_id,
      deployment_mode: sensor.deployment_mode,
      biosensor_inputs: sensor,
    },
    observations: [
      observation({
        key: 'biosensor_signal_current_a',
        label: `${sensor.analyte_id} biosensor signal`,
        value: current,
        unit: 'A',
        confidence: 'low',
        note: `Predicted amperometric response using the supplied ${sensor.calibration.model} calibration in ${sensor.matrix}.`,
      }),
      observation({
        key: 'biosensor_signal_to_noise_ratio',
        label: `${sensor.analyte_id} biosensor signal-to-noise ratio`,
        value:
          sensor.analytical_performance.noise_std_a.value > 0
            ? Math.abs(current) /
              sensor.analytical_performance.noise_std_a.value
            : 'unbounded_zero_noise',
        unit: '1',
        confidence: 'low',
        note: 'Absolute calibrated current divided by the source-referenced baseline noise standard deviation.',
      }),
      observation({
        key: 'biosensor_detection_status',
        label: `${sensor.analyte_id} detection status`,
        value:
          sensor.concentration.value < sensor.analytical_performance.lod.value
            ? 'below_lod'
            : sensor.concentration.value <
                sensor.analytical_performance.loq.value
              ? 'detected_below_loq'
              : 'quantifiable',
        unit: null,
        confidence: 'low',
        note: 'Detection state is determined from the supplied LOD/LOQ and source-referenced analyte concentration.',
      }),
      observation({
        key: 'biosensor_net_power_w',
        label: 'Biosensor remaining external power budget',
        value: netPower,
        unit: 'W',
        confidence: 'low',
        note: 'Source-backed external power capacity minus sensor power draw.',
      }),
    ],
    series: [],
    assumptions: [
      'The reported signal is the expected calibration response; noise and drift are retained as analytical-performance inputs and are not sampled stochastically.',
      'Real wastewater matrix interference is not numerically corrected; listed interferents remain visible for experimental validation.',
    ],
    sourceRefs: sourceRefsFor(sensor),
    confidenceScore: score,
    confidenceLevel: 'low',
  };
}

export function simulateMechanisticCase(
  normalizedCase: NormalizedCaseInput,
): MechanisticRun {
  const run = simulateMechanisticCaseCore(normalizedCase);
  if (run.status !== 'completed') return run;

  const sensitivityAnalysis = buildSensitivityAnalysis(normalizedCase, run);
  const hasSensitivityWork =
    sensitivityAnalysis.evaluated_parameter_count > 0 ||
    sensitivityAnalysis.skipped_parameters.length > 0;

  return {
    ...run,
    sensitivityAnalysis,
    assumptions: hasSensitivityWork
      ? [...run.assumptions, sensitivityAnalysis.interpretation]
      : run.assumptions,
  };
}

export const mechanisticModelVersion = MODEL_VERSION;
