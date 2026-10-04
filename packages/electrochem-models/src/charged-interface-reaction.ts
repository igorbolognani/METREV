/**
 * Standalone development kernels for charged species, membrane interfaces,
 * and homogeneous reactions. These kernels assemble local algebra only; they
 * are not a full-cell membrane, cathode, biofilm, or multidimensional solver.
 *
 * Sign conventions:
 * - membrane potential jump is phi_membrane - phi_solution;
 * - positive interface flux travels from the declared left side to the right;
 * - reaction stoichiometry is positive for products and negative for reactants;
 * - reaction source is positive when a species is produced.
 *
 * All dimensional values use SI units. Donnan equilibrium assumes ideal
 * activities. Interface transport uses an isothermal Scharfetter-Gummel face
 * law with a sourced transfer velocity. Homogeneous reactions use sourced rate
 * scales multiplied by dimensionless concentration ratios.
 */
import type { SourcedSpatialValue } from './porous-anode-1d';

const FARADAY_C_MOL = 96485.33212;
const GAS_CONSTANT_J_MOL_K = 8.314462618;
const SUPPORTED_SOURCE_KINDS = new Set([
  'measured',
  'literature',
  'default',
  'assumption',
  'test_fixture',
]);

export const CHARGED_INTERFACE_REACTION_KERNEL = {
  equationIds: {
    donnan: 'ideal-donnan-electroneutral-interface-v1',
    interfaceFlux: 'isothermal-scharfetter-gummel-interface-v1',
    homogeneousReaction: 'reference-scaled-mass-action-reaction-v1',
  },
  supportedDimensions: [1, 2, 3] as const,
  assumptions: [
    'ideal activities',
    'isothermal local interface',
    'no water transport or convection through the interface',
    'fixed membrane charge is prescribed and spatially local',
    'reaction geometry and rate scales are externally supplied',
  ] as const,
  unsupportedPhysics: [
    'activity-coefficient models',
    'electro-osmotic water transport',
    'membrane swelling',
    'membrane fouling',
    'precipitation and gas reactions',
    'electrode electron-transfer kinetics',
  ] as const,
} as const;

export interface ChargedSpeciesContract {
  id: string;
  valence: SourcedSpatialValue<'1'>;
  /** Integer atom counts by element or conserved pseudo-element. */
  composition: Readonly<Record<string, SourcedSpatialValue<'1'>>>;
}

export interface UnsupportedChargedEffects {
  convection?: boolean;
  waterTransport?: boolean;
  fouling?: boolean;
  nonIdealActivities?: boolean;
  transientSurfaceStorage?: boolean;
}

export interface DonnanInterfaceInput {
  interfaceKind: 'ion_exchange_membrane';
  temperature: SourcedSpatialValue<'K'>;
  fixedChargeDensity: SourcedSpatialValue<'mol/m3'>;
  solutionPotentialV: number;
  membranePotentialV: number;
  species: readonly ChargedSpeciesContract[];
  solutionConcentrationMolM3: Readonly<Record<string, number>>;
  membraneConcentrationMolM3: Readonly<Record<string, number>>;
  partitionCoefficient: Readonly<Record<string, SourcedSpatialValue<'1'>>>;
  requestedEffects?: UnsupportedChargedEffects;
}

export interface LocalResidualJacobian {
  equationId: string;
  variableOrder: string[];
  variableUnits: string[];
  residual: number[];
  residualUnits: string[];
  jacobian: number[][];
}

export interface DonnanInterfaceSolution {
  membranePotentialV: number;
  membraneConcentrationMolM3: Record<string, number>;
  dimensionlessDonnanPotential: number;
  iterations: number;
  chargeResidualMolM3: number;
  assembled: LocalResidualJacobian;
}

export interface ChargedInterfaceFluxInput {
  interfaceKind: 'porous_separator' | 'ion_exchange_membrane';
  temperature: SourcedSpatialValue<'K'>;
  species: readonly ChargedSpeciesContract[];
  leftPotentialV: number;
  rightPotentialV: number;
  leftConcentrationMolM3: Readonly<Record<string, number>>;
  rightConcentrationMolM3: Readonly<Record<string, number>>;
  transferVelocityMS: Readonly<Record<string, SourcedSpatialValue<'m/s'>>>;
  requestedEffects?: UnsupportedChargedEffects;
}

export interface ChargedInterfaceFluxResult extends LocalResidualJacobian {
  /** Positive values travel left to right. */
  fluxMolM2S: Record<string, number>;
  leftBoundarySourceMolM2S: Record<string, number>;
  rightBoundarySourceMolM2S: Record<string, number>;
  ionicCurrentDensityAM2: number;
  maximumSpeciesConservationResidualMolM2S: number;
}

export interface HomogeneousReactionContract {
  id: string;
  /** Products positive, reactants negative, in mol species / mol extent. */
  stoichiometry: Readonly<Record<string, SourcedSpatialValue<'1'>>>;
  forwardRateScale: SourcedSpatialValue<'mol/m3/s'>;
  reverseRateScale: SourcedSpatialValue<'mol/m3/s'>;
  referenceConcentration: Readonly<
    Record<string, SourcedSpatialValue<'mol/m3'>>
  >;
  forwardOrder: Readonly<Record<string, SourcedSpatialValue<'1'>>>;
  reverseOrder: Readonly<Record<string, SourcedSpatialValue<'1'>>>;
}

export interface HomogeneousReactionInput {
  species: readonly ChargedSpeciesContract[];
  concentrationMolM3: Readonly<Record<string, number>>;
  reactions: readonly HomogeneousReactionContract[];
  requestedPhysics?: {
    precipitation?: boolean;
    gasEvolution?: boolean;
    electronTransfer?: boolean;
  };
}

export interface HomogeneousReactionResult extends LocalResidualJacobian {
  netRateMolM3S: Record<string, number>;
  speciesSourceMolM3S: Record<string, number>;
  reactionRateJacobianS1: number[][];
  elementConservationResidualMolM3S: Record<string, number>;
  chargeConservationResidualCM3S: number;
}

function sourced(
  item: SourcedSpatialValue | undefined,
  unit: string,
  label: string,
  limits: { min?: number; positive?: boolean } = {},
): number {
  if (
    !item ||
    item.unit !== unit ||
    !item.source_ref?.trim() ||
    !SUPPORTED_SOURCE_KINDS.has(item.source_kind) ||
    !Number.isFinite(item.value) ||
    (limits.positive && !(item.value > 0)) ||
    (limits.min !== undefined && item.value < limits.min)
  ) {
    throw new RangeError(`${label}: sourced finite ${unit} value required`);
  }
  return item.value;
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value))
    throw new RangeError(`${label}: finite value required`);
  return value;
}

function positiveState(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value) || !(value > 0))
    throw new RangeError(`${label}: positive finite mol/m3 state required`);
  return value;
}

function nonnegativeState(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value) || value < 0)
    throw new RangeError(`${label}: nonnegative finite mol/m3 state required`);
  return value;
}

function rejectUnsupported(
  requested: UnsupportedChargedEffects | undefined,
  label: string,
): void {
  const unsupported = Object.entries(requested ?? {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  if (unsupported.length)
    throw new RangeError(
      `${label}: unsupported effects requested: ${unsupported.join(', ')}`,
    );
}

interface ValidatedSpecies {
  id: string;
  valence: number;
  composition: Record<string, number>;
}

function validateSpecies(
  input: readonly ChargedSpeciesContract[],
): ValidatedSpecies[] {
  if (!input.length || input.length > 64)
    throw new RangeError('species: 1..64 entries required');
  const ids = new Set<string>();
  return input.map((item, index) => {
    if (!item.id?.trim() || ids.has(item.id))
      throw new RangeError(`species[${index}].id: unique nonempty id required`);
    ids.add(item.id);
    const valence = sourced(item.valence, '1', `species[${index}].valence`);
    if (!Number.isInteger(valence))
      throw new RangeError(`species[${index}].valence: integer required`);
    const composition: Record<string, number> = {};
    for (const [element, count] of Object.entries(item.composition)) {
      if (!element.trim())
        throw new RangeError(
          `species[${index}].composition: element id required`,
        );
      const value = sourced(
        count,
        '1',
        `species[${index}].composition.${element}`,
        {
          min: 0,
        },
      );
      if (!Number.isInteger(value))
        throw new RangeError(
          `species[${index}].composition.${element}: integer count required`,
        );
      if (value) composition[element] = value;
    }
    if (!Object.keys(composition).length)
      throw new RangeError(
        `species[${index}].composition: at least one conserved component required`,
      );
    return { id: item.id, valence, composition };
  });
}

/** Assemble ideal Donnan partition residuals plus membrane electroneutrality. */
export function assembleDonnanInterface(
  input: DonnanInterfaceInput,
): LocalResidualJacobian {
  if (input.interfaceKind !== 'ion_exchange_membrane')
    throw new RangeError('Donnan interface requires ion_exchange_membrane');
  rejectUnsupported(input.requestedEffects, 'Donnan interface');
  const species = validateSpecies(input.species);
  if (!species.some((item) => item.valence !== 0))
    throw new RangeError(
      'Donnan interface: at least one charged species required',
    );
  const temperature = sourced(input.temperature, 'K', 'temperature', {
    positive: true,
  });
  const fixedCharge = sourced(
    input.fixedChargeDensity,
    'mol/m3',
    'fixedChargeDensity',
  );
  const solutionPotential = finite(
    input.solutionPotentialV,
    'solutionPotentialV',
  );
  const membranePotential = finite(
    input.membranePotentialV,
    'membranePotentialV',
  );
  const factor = FARADAY_C_MOL / (GAS_CONSTANT_J_MOL_K * temperature);
  const residual: number[] = [];
  const jacobian = Array.from({ length: species.length + 1 }, () =>
    Array<number>(species.length + 1).fill(0),
  );
  let chargeResidual = fixedCharge;
  species.forEach((ion, i) => {
    const solution = positiveState(
      input.solutionConcentrationMolM3[ion.id],
      `solutionConcentrationMolM3.${ion.id}`,
    );
    const membrane = positiveState(
      input.membraneConcentrationMolM3[ion.id],
      `membraneConcentrationMolM3.${ion.id}`,
    );
    const partition = sourced(
      input.partitionCoefficient[ion.id],
      '1',
      `partitionCoefficient.${ion.id}`,
      { positive: true },
    );
    residual.push(
      Math.log(membrane / (partition * solution)) +
        ion.valence * factor * (membranePotential - solutionPotential),
    );
    jacobian[i][i] = 1 / membrane;
    jacobian[i][species.length] = ion.valence * factor;
    chargeResidual += ion.valence * membrane;
  });
  residual.push(chargeResidual);
  species.forEach((ion, i) => {
    jacobian[species.length][i] = ion.valence;
  });
  return {
    equationId: CHARGED_INTERFACE_REACTION_KERNEL.equationIds.donnan,
    variableOrder: [
      ...species.map((ion) => `membrane_concentration:${ion.id}`),
      'membrane_potential',
    ],
    variableUnits: [...species.map(() => 'mol/m3'), 'V'],
    residual,
    residualUnits: [...species.map(() => '1'), 'mol/m3'],
    jacobian,
  };
}

/** Solve the ideal local Donnan closure with monotone bracketed bisection. */
export function solveDonnanInterface(
  input: Omit<
    DonnanInterfaceInput,
    'membranePotentialV' | 'membraneConcentrationMolM3'
  >,
): DonnanInterfaceSolution {
  rejectUnsupported(input.requestedEffects, 'Donnan interface');
  const species = validateSpecies(input.species);
  if (!species.some((item) => item.valence !== 0))
    throw new RangeError(
      'Donnan interface: at least one charged species required',
    );
  const temperature = sourced(input.temperature, 'K', 'temperature', {
    positive: true,
  });
  const fixedCharge = sourced(
    input.fixedChargeDensity,
    'mol/m3',
    'fixedChargeDensity',
  );
  finite(input.solutionPotentialV, 'solutionPotentialV');
  const bases = species.map((ion) => ({
    ...ion,
    base:
      positiveState(
        input.solutionConcentrationMolM3[ion.id],
        `solutionConcentrationMolM3.${ion.id}`,
      ) *
      sourced(
        input.partitionCoefficient[ion.id],
        '1',
        `partitionCoefficient.${ion.id}`,
        {
          positive: true,
        },
      ),
  }));
  const charge = (psi: number) =>
    fixedCharge +
    bases.reduce(
      (sum, ion) => sum + ion.valence * ion.base * Math.exp(-ion.valence * psi),
      0,
    );
  let low = 0;
  let high = 0;
  let lowValue = charge(low);
  let highValue = lowValue;
  for (
    let step = 1;
    step <= 80 && !(lowValue >= 0 && highValue <= 0);
    step += 1
  ) {
    low = -step;
    high = step;
    lowValue = charge(low);
    highValue = charge(high);
  }
  if (
    !(Number.isFinite(lowValue) && Number.isFinite(highValue)) ||
    lowValue < 0 ||
    highValue > 0
  )
    throw new RangeError(
      'Donnan interface: no finite electroneutral root for declared ions and fixed charge',
    );
  let psi = 0;
  let iterations = 0;
  const scale = Math.max(
    1,
    Math.abs(fixedCharge),
    ...bases.map((item) => item.base),
  );
  for (; iterations < 160; iterations += 1) {
    psi = (low + high) / 2;
    const value = charge(psi);
    if (Math.abs(value) <= 1e-12 * scale || high - low <= 1e-13) break;
    if (value > 0) low = psi;
    else high = psi;
  }
  const membraneConcentrationMolM3 = Object.fromEntries(
    bases.map((ion) => [ion.id, ion.base * Math.exp(-ion.valence * psi)]),
  );
  const membranePotentialV =
    input.solutionPotentialV +
    (GAS_CONSTANT_J_MOL_K * temperature * psi) / FARADAY_C_MOL;
  const assembled = assembleDonnanInterface({
    ...input,
    membranePotentialV,
    membraneConcentrationMolM3,
  });
  return {
    membranePotentialV,
    membraneConcentrationMolM3,
    dimensionlessDonnanPotential: psi,
    iterations: iterations + 1,
    chargeResidualMolM3: assembled.residual.at(-1) ?? NaN,
    assembled,
  };
}

function bernoulli(value: number): number {
  if (Math.abs(value) < 1e-5)
    return 1 - value / 2 + value ** 2 / 12 - value ** 4 / 720;
  return value / Math.expm1(value);
}

function bernoulliDerivative(value: number): number {
  if (Math.abs(value) < 1e-4) return -0.5 + value / 6 - value ** 3 / 180;
  const exponential = Math.exp(value);
  const denominator = Math.expm1(value);
  return (denominator - value * exponential) / denominator ** 2;
}

/** Assemble a conservative charged-species face flux and exact dense Jacobian. */
export function assembleChargedInterfaceFlux(
  input: ChargedInterfaceFluxInput,
): ChargedInterfaceFluxResult {
  if (
    !['porous_separator', 'ion_exchange_membrane'].includes(input.interfaceKind)
  )
    throw new RangeError(
      'interfaceKind: supported separator or membrane required',
    );
  rejectUnsupported(input.requestedEffects, 'charged interface flux');
  const species = validateSpecies(input.species);
  const temperature = sourced(input.temperature, 'K', 'temperature', {
    positive: true,
  });
  const leftPotential = finite(input.leftPotentialV, 'leftPotentialV');
  const rightPotential = finite(input.rightPotentialV, 'rightPotentialV');
  const voltageFactor = FARADAY_C_MOL / (GAS_CONSTANT_J_MOL_K * temperature);
  const count = species.length;
  const jacobian = Array.from({ length: 2 * count }, () =>
    Array<number>(2 * count + 2).fill(0),
  );
  const fluxMolM2S: Record<string, number> = {};
  const leftBoundarySourceMolM2S: Record<string, number> = {};
  const rightBoundarySourceMolM2S: Record<string, number> = {};
  let ionicCurrentDensityAM2 = 0;
  species.forEach((ion, i) => {
    const left = positiveState(
      input.leftConcentrationMolM3[ion.id],
      `leftConcentrationMolM3.${ion.id}`,
    );
    const right = positiveState(
      input.rightConcentrationMolM3[ion.id],
      `rightConcentrationMolM3.${ion.id}`,
    );
    const velocity = sourced(
      input.transferVelocityMS[ion.id],
      'm/s',
      `transferVelocityMS.${ion.id}`,
      { positive: true },
    );
    const psi = ion.valence * voltageFactor * (rightPotential - leftPotential);
    if (Math.abs(psi) > 50)
      throw new RangeError(
        `${ion.id}: interface electrochemical jump exceeds supported range`,
      );
    const bForward = bernoulli(psi);
    const bReverse = bernoulli(-psi);
    const flux = velocity * (bForward * left - bReverse * right);
    const derivativePsi =
      velocity *
      (bernoulliDerivative(psi) * left + bernoulliDerivative(-psi) * right);
    fluxMolM2S[ion.id] = flux;
    leftBoundarySourceMolM2S[ion.id] = -flux;
    rightBoundarySourceMolM2S[ion.id] = flux;
    ionicCurrentDensityAM2 += FARADAY_C_MOL * ion.valence * flux;
    // Rows are left and right boundary sources. Columns are left/right c, phiL, phiR.
    const derivatives = Array<number>(2 * count + 2).fill(0);
    derivatives[i] = velocity * bForward;
    derivatives[count + i] = -velocity * bReverse;
    derivatives[2 * count] = -derivativePsi * ion.valence * voltageFactor;
    derivatives[2 * count + 1] = derivativePsi * ion.valence * voltageFactor;
    jacobian[i] = derivatives.map((value) => -value);
    jacobian[count + i] = derivatives;
  });
  const residual = [
    ...species.map((ion) => leftBoundarySourceMolM2S[ion.id]),
    ...species.map((ion) => rightBoundarySourceMolM2S[ion.id]),
  ];
  return {
    equationId: CHARGED_INTERFACE_REACTION_KERNEL.equationIds.interfaceFlux,
    variableOrder: [
      ...species.map((ion) => `left_concentration:${ion.id}`),
      ...species.map((ion) => `right_concentration:${ion.id}`),
      'left_potential',
      'right_potential',
    ],
    variableUnits: [
      ...species.map(() => 'mol/m3'),
      ...species.map(() => 'mol/m3'),
      'V',
      'V',
    ],
    residual,
    residualUnits: residual.map(() => 'mol/m2/s'),
    jacobian,
    fluxMolM2S,
    leftBoundarySourceMolM2S,
    rightBoundarySourceMolM2S,
    ionicCurrentDensityAM2,
    maximumSpeciesConservationResidualMolM2S: Math.max(
      0,
      ...species.map((ion) =>
        Math.abs(
          leftBoundarySourceMolM2S[ion.id] + rightBoundarySourceMolM2S[ion.id],
        ),
      ),
    ),
  };
}

function concentrationProduct(
  order: Readonly<Record<string, SourcedSpatialValue<'1'>>>,
  concentration: Readonly<Record<string, number>>,
  reference: Readonly<Record<string, SourcedSpatialValue<'mol/m3'>>>,
  speciesIds: Set<string>,
  label: string,
): { value: number; derivative: Record<string, number> } {
  let value = 1;
  const factors: Record<
    string,
    { exponent: number; state: number; scale: number }
  > = {};
  for (const [id, item] of Object.entries(order)) {
    if (!speciesIds.has(id))
      throw new RangeError(`${label}.${id}: unknown species`);
    const exponent = sourced(item, '1', `${label}.${id}`, { min: 0 });
    if (!Number.isInteger(exponent))
      throw new RangeError(
        `${label}.${id}: nonnegative integer order required`,
      );
    const state = nonnegativeState(
      concentration[id],
      `concentrationMolM3.${id}`,
    );
    const scale = sourced(
      reference[id],
      'mol/m3',
      `referenceConcentration.${id}`,
      {
        positive: true,
      },
    );
    value *= (state / scale) ** exponent;
    factors[id] = { exponent, state, scale };
  }
  return {
    value,
    derivative: Object.fromEntries(
      Object.entries(factors).map(([id, factor]) => {
        const otherProduct = Object.entries(factors)
          .filter(([otherId]) => otherId !== id)
          .reduce(
            (product, [, other]) =>
              product * (other.state / other.scale) ** other.exponent,
            1,
          );
        const derivative =
          factor.exponent === 0
            ? 0
            : (factor.exponent *
                (factor.state / factor.scale) ** (factor.exponent - 1) *
                otherProduct) /
              factor.scale;
        return [id, derivative];
      }),
    ),
  };
}

/** Assemble charge- and element-conserving homogeneous reaction sources. */
export function assembleHomogeneousReactions(
  input: HomogeneousReactionInput,
): HomogeneousReactionResult {
  const unsupported = Object.entries(input.requestedPhysics ?? {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  if (unsupported.length)
    throw new RangeError(
      `homogeneous reactions: unsupported physics requested: ${unsupported.join(', ')}`,
    );
  const species = validateSpecies(input.species);
  const ids = new Set(species.map((item) => item.id));
  species.forEach((item) =>
    nonnegativeState(
      input.concentrationMolM3[item.id],
      `concentrationMolM3.${item.id}`,
    ),
  );
  if (!input.reactions.length || input.reactions.length > 128)
    throw new RangeError('reactions: 1..128 entries required');
  const reactionIds = new Set<string>();
  const sources = Object.fromEntries(species.map((item) => [item.id, 0]));
  const sourceJacobian = Array.from({ length: species.length }, () =>
    Array<number>(species.length).fill(0),
  );
  const rates: Record<string, number> = {};
  const reactionRateJacobianS1: number[][] = [];
  for (const [reactionIndex, reaction] of input.reactions.entries()) {
    if (!reaction.id?.trim() || reactionIds.has(reaction.id))
      throw new RangeError(
        `reactions[${reactionIndex}].id: unique nonempty id required`,
      );
    reactionIds.add(reaction.id);
    const stoichiometry: Record<string, number> = {};
    for (const [id, coefficient] of Object.entries(reaction.stoichiometry)) {
      if (!ids.has(id))
        throw new RangeError(
          `${reaction.id}.stoichiometry.${id}: unknown species`,
        );
      const value = sourced(
        coefficient,
        '1',
        `${reaction.id}.stoichiometry.${id}`,
      );
      if (value) stoichiometry[id] = value;
    }
    if (Object.keys(stoichiometry).length < 2)
      throw new RangeError(
        `${reaction.id}: at least two nonzero stoichiometric entries required`,
      );
    const elementBalance: Record<string, number> = {};
    let chargeBalance = 0;
    for (const ion of species) {
      const coefficient = stoichiometry[ion.id] ?? 0;
      chargeBalance += ion.valence * coefficient;
      for (const [element, count] of Object.entries(ion.composition))
        elementBalance[element] =
          (elementBalance[element] ?? 0) + count * coefficient;
    }
    const imbalance = [chargeBalance, ...Object.values(elementBalance)].find(
      (value) => Math.abs(value) > 1e-12,
    );
    if (imbalance !== undefined)
      throw new RangeError(
        `${reaction.id}: stoichiometry violates charge or element conservation`,
      );
    const forwardScale = sourced(
      reaction.forwardRateScale,
      'mol/m3/s',
      `${reaction.id}.forwardRateScale`,
      { min: 0 },
    );
    const reverseScale = sourced(
      reaction.reverseRateScale,
      'mol/m3/s',
      `${reaction.id}.reverseRateScale`,
      { min: 0 },
    );
    const forward = concentrationProduct(
      reaction.forwardOrder,
      input.concentrationMolM3,
      reaction.referenceConcentration,
      ids,
      `${reaction.id}.forwardOrder`,
    );
    const reverse = concentrationProduct(
      reaction.reverseOrder,
      input.concentrationMolM3,
      reaction.referenceConcentration,
      ids,
      `${reaction.id}.reverseOrder`,
    );
    const rate = forwardScale * forward.value - reverseScale * reverse.value;
    const rateDerivative = species.map(
      (ion) =>
        forwardScale * (forward.derivative[ion.id] ?? 0) -
        reverseScale * (reverse.derivative[ion.id] ?? 0),
    );
    rates[reaction.id] = rate;
    reactionRateJacobianS1.push(rateDerivative);
    species.forEach((ion, row) => {
      const coefficient = stoichiometry[ion.id] ?? 0;
      sources[ion.id] += coefficient * rate;
      rateDerivative.forEach((derivative, column) => {
        sourceJacobian[row][column] += coefficient * derivative;
      });
    });
  }
  const elements = new Set(
    species.flatMap((item) => Object.keys(item.composition)),
  );
  const elementResidual = Object.fromEntries(
    [...elements].map((element) => [
      element,
      species.reduce(
        (sum, ion) => sum + (ion.composition[element] ?? 0) * sources[ion.id],
        0,
      ),
    ]),
  );
  const chargeResidual =
    FARADAY_C_MOL *
    species.reduce((sum, ion) => sum + ion.valence * sources[ion.id], 0);
  return {
    equationId:
      CHARGED_INTERFACE_REACTION_KERNEL.equationIds.homogeneousReaction,
    variableOrder: species.map((ion) => `concentration:${ion.id}`),
    variableUnits: species.map(() => 'mol/m3'),
    residual: species.map((ion) => sources[ion.id]),
    residualUnits: species.map(() => 'mol/m3/s'),
    jacobian: sourceJacobian,
    netRateMolM3S: rates,
    speciesSourceMolM3S: sources,
    reactionRateJacobianS1,
    elementConservationResidualMolM3S: elementResidual,
    chargeConservationResidualCM3S: chargeResidual,
  };
}
