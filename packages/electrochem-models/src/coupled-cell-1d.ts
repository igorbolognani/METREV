/**
 * A restricted, steady planar MFC/MEC cell. One circuit current closes the
 * porous-anode reaction, membrane charge flux, cathode polarization and the
 * electrical boundary. This is a development model, not a calibrated plant
 * prediction or a 2D/3D multiphysics solver.
 *
 * The membrane reduction is deliberately limited to an uncharged, binary,
 * monovalent electrolyte with equal ion diffusivities and equal, constant
 * concentrations at both interfaces. This admits an electroneutral solution
 * with concentration-independent conductivity. Different ion mixtures need
 * an electroneutral potential/Donnan/partition solver and cannot enter here.
 */
import { coupledCell1dInputSchema } from '@metrev/domain-contracts';
import {
  POROUS_ANODE_1D_SOURCES,
  solvePorousAnode1d,
  type PorousAnodeInput,
  type PorousAnodeResult,
  type SourcedSpatialValue,
} from './porous-anode-1d';
import {
  MEMBRANE_ION_1D_SOURCE,
  solveMembraneIon1d,
  type MembraneIonInput,
  type MembraneIonResult,
} from './membrane-ion-1d';

const F = POROUS_ANODE_1D_SOURCES.faradayConstant.value;
const R = POROUS_ANODE_1D_SOURCES.gasConstant.value;

export const COUPLED_CELL_1D_SOURCES = {
  porousAnode: POROUS_ANODE_1D_SOURCES.formulation.doi,
  bioanodePolarization: '10.1016/j.biortech.2010.06.156',
  membraneTransport: MEMBRANE_ION_1D_SOURCE.doi,
  cellChargeBalance: '10.1016/j.jpowsour.2009.06.101',
} as const;

export interface CoupledCell1dInput {
  system: 'MFC' | 'MEC';
  anode: PorousAnodeInput;
  membrane: Omit<MembraneIonInput, 'interfacePotential'>;
  /** These are separate from the resolved membrane loss, which is counted once. */
  electrolyteResistance: SourcedSpatialValue<'ohm'>;
  contactResistance: SourcedSpatialValue<'ohm'>;
  reversibleCellVoltage: SourcedSpatialValue<'V'>;
  /** Scales f(eta)=1-exp(-alpha F eta/RT); eta >= 0. */
  anodeTransferCoefficient: SourcedSpatialValue<'1'>;
  maximumAnodeOverpotential: SourcedSpatialValue<'V'>;
  cathode: {
    activeArea: SourcedSpatialValue<'m2'>;
    exchangeCurrentDensity: SourcedSpatialValue<'A/m2'>;
    transferCoefficient: SourcedSpatialValue<'1'>;
    /** MFC oxygen reduction: mol O2 per liquid volume and transfer velocity. */
    oxygen?: {
      concentration: SourcedSpatialValue<'mol/m3'>;
      massTransferCoefficient: SourcedSpatialValue<'m/s'>;
    };
    /** MEC hydrogen fractions: Faradaic generation and collected share. */
    hydrogen?: {
      faradayEfficiency: SourcedSpatialValue<'1'>;
      captureFraction: SourcedSpatialValue<'1'>;
    };
  };
  circuit:
    | { kind: 'external_load'; resistance: SourcedSpatialValue<'ohm'> }
    | { kind: 'applied_voltage'; voltage: SourcedSpatialValue<'V'> };
}

export interface CoupledCell1dResult {
  system: 'MFC' | 'MEC';
  currentA: number;
  cellVoltageV: number;
  electricalPowerW: number;
  electricalBoundary: 'generated' | 'consumed';
  anodeOverpotentialV: number;
  cathodeActivationOverpotentialV: number;
  cathodeMassTransferOverpotentialV: number;
  membraneVoltageDropV: number;
  otherOhmicDropV: number;
  electronBalanceResidualA: number;
  ionicChargeResidualA: number;
  circuitResidualV: number;
  /** A zero-current condition leaves an unused driving potential. */
  currentLimitReason:
    | 'none'
    | 'no_driving_voltage'
    | 'no_oxygen'
    | 'no_active_anode';
  hydrogenGrossMolS: number;
  hydrogenCapturedMolS: number;
  anode: PorousAnodeResult;
  membrane: MembraneIonResult;
  modelStatus: 'development_only';
  sourceDois: string[];
}

function value<U extends string>(
  item: SourcedSpatialValue<U>,
  unit: U,
  label: string,
  minimum: number,
  maximum = Infinity,
): number {
  if (
    !item ||
    item.unit !== unit ||
    !item.source_ref?.trim() ||
    ![
      'measured',
      'literature',
      'default',
      'assumption',
      'test_fixture',
    ].includes(item.source_kind) ||
    !Number.isFinite(item.value) ||
    item.value < minimum ||
    item.value > maximum
  )
    throw new RangeError(
      `${label}: ${unit} in [${minimum}, ${maximum}] with provenance required`,
    );
  return item.value;
}

function positive<U extends string>(
  item: SourcedSpatialValue<U>,
  unit: U,
  label: string,
): number {
  const v = value(item, unit, label, 0);
  if (v === 0) throw new RangeError(`${label}: must be positive`);
  return v;
}

function inverseButlerVolmer(
  currentDensity: number,
  exchange: number,
  alpha: number,
  thermalV: number,
): number {
  if (currentDensity === 0) return 0;
  const at = (eta: number) =>
    exchange *
    (Math.exp(Math.min(50, (alpha * eta) / thermalV)) -
      Math.exp(Math.max(-50, (-(1 - alpha) * eta) / thermalV)));
  let low = 0,
    high = 2;
  if (at(high) < currentDensity)
    throw new RangeError('cathode: current exceeds 2 V Butler–Volmer domain');
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (at(mid) < currentDensity) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Quasi-steady coupling. All case values, including the admissible eta range, are supplied. */
export function solveCoupledCell1d(
  input: CoupledCell1dInput,
): CoupledCell1dResult {
  if (input.system !== 'MFC' && input.system !== 'MEC')
    throw new RangeError('system: MFC or MEC required');
  if (input.anode.membrane)
    throw new RangeError(
      'anode.membrane: remove the standalone resistance diagnostic to avoid double counting',
    );
  const checked = coupledCell1dInputSchema.safeParse(input);
  if (!checked.success)
    throw new RangeError(
      `coupled-cell-1d input: ${checked.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  const temperature = positive(
    input.anode.temperature,
    'K',
    'anode.temperature',
  );
  if (
    positive(input.membrane.temperature, 'K', 'membrane.temperature') !==
    temperature
  )
    throw new RangeError('anode and membrane temperatures must match');
  const alphaA = value(
    input.anodeTransferCoefficient,
    '1',
    'anodeTransferCoefficient',
    0,
    1,
  );
  const alphaC = value(
    input.cathode.transferCoefficient,
    '1',
    'cathode.transferCoefficient',
    0,
    1,
  );
  if (alphaA === 0 || alphaA === 1 || alphaC === 0 || alphaC === 1)
    throw new RangeError(
      'charge transfer coefficients must be strictly between zero and one',
    );
  const maxEta = positive(
    input.maximumAnodeOverpotential,
    'V',
    'maximumAnodeOverpotential',
  );
  const reversible = positive(
    input.reversibleCellVoltage,
    'V',
    'reversibleCellVoltage',
  );
  const resistance =
    value(input.electrolyteResistance, 'ohm', 'electrolyteResistance', 0) +
    value(input.contactResistance, 'ohm', 'contactResistance', 0);
  const cathodeArea = positive(
    input.cathode.activeArea,
    'm2',
    'cathode.activeArea',
  );
  const exchange = positive(
    input.cathode.exchangeCurrentDensity,
    'A/m2',
    'cathode.exchangeCurrentDensity',
  );
  const thermalV = (R * temperature) / F;

  if ((input.system === 'MFC') !== (input.circuit.kind === 'external_load'))
    throw new RangeError(
      'MFC requires external_load; MEC requires applied_voltage',
    );
  if (
    (input.system === 'MFC') !== Boolean(input.cathode.oxygen) ||
    (input.system === 'MEC') !== Boolean(input.cathode.hydrogen)
  )
    throw new RangeError(
      'MFC requires oxygen only; MEC requires hydrogen only',
    );
  const load =
    input.circuit.kind === 'external_load'
      ? positive(input.circuit.resistance, 'ohm', 'circuit.resistance')
      : 0;
  const applied =
    input.circuit.kind === 'applied_voltage'
      ? positive(input.circuit.voltage, 'V', 'circuit.voltage')
      : 0;
  const oxygenLimit = input.cathode.oxygen
    ? 4 *
      F *
      cathodeArea *
      value(
        input.cathode.oxygen.concentration,
        'mol/m3',
        'cathode.oxygen.concentration',
        0,
      ) *
      positive(
        input.cathode.oxygen.massTransferCoefficient,
        'm/s',
        'cathode.oxygen.massTransferCoefficient',
      )
    : Infinity;
  const h2Efficiency = input.cathode.hydrogen
    ? value(
        input.cathode.hydrogen.faradayEfficiency,
        '1',
        'cathode.hydrogen.faradayEfficiency',
        0,
        1,
      )
    : 0;
  const h2Capture = input.cathode.hydrogen
    ? value(
        input.cathode.hydrogen.captureFraction,
        '1',
        'cathode.hydrogen.captureFraction',
        0,
        1,
      )
    : 0;

  // The restricted membrane case has an exact electroneutral solution with
  // uniform concentration. A harmonic sum captures heterogeneous pore paths.
  const ions = input.membrane.species;
  if (
    ions?.length !== 2 ||
    ions[0].name === ions[1].name ||
    !ions[0].name?.trim() ||
    !ions[1].name?.trim()
  )
    throw new RangeError(
      'membrane: one named monovalent cation/anion pair required',
    );
  const z = ions.map((ion, i) =>
    value(ion.valence, '1', `membrane.species[${i}].valence`, -1, 1),
  );
  if (z[0] * z[1] !== -1)
    throw new RangeError('membrane: valences must be +1 and -1');
  const freeD = ions.map((ion, i) =>
    positive(
      ion.freeDiffusivity,
      'm2/s',
      `membrane.species[${i}].freeDiffusivity`,
    ),
  );
  const concentrations = ions.flatMap((ion, i) => [
    value(
      ion.leftConcentration,
      'mol/m3',
      `membrane.species[${i}].leftConcentration`,
      0,
    ),
    value(
      ion.rightConcentration,
      'mol/m3',
      `membrane.species[${i}].rightConcentration`,
      0,
    ),
  ]);
  const c = concentrations[0];
  if (
    c === 0 ||
    freeD[0] !== freeD[1] ||
    concentrations.some((v) => Math.abs(v - c) > 1e-12 * c)
  )
    throw new RangeError(
      'membrane: equal positive concentrations on both sides and equal ion diffusivities required',
    );
  const n = input.membrane.segments?.length ?? 0;
  if (n < 2 || n > 512)
    throw new RangeError('membrane.segments: 2..512 required');
  const length = positive(input.membrane.thickness, 'm', 'membrane.thickness');
  const area = positive(input.membrane.area, 'm2', 'membrane.area');
  const h = length / n;
  const poreResistance = input.membrane.segments.map((segment, i) => {
    const eps = positive(
      segment.porosity,
      '1',
      `membrane.segments[${i}].porosity`,
    );
    if (eps >= 1)
      throw new RangeError(
        `membrane.segments[${i}].porosity: below one required`,
      );
    const tau = value(
      segment.tortuosity,
      '1',
      `membrane.segments[${i}].tortuosity`,
      1,
    );
    return (h * tau) / (freeD[0] * eps);
  });
  const totalPoreResistance = poreResistance.reduce((sum, v) => sum + v, 0);
  const membraneResistance =
    (R * temperature * totalPoreResistance) / (2 * F * F * area * c);
  if (!Number.isFinite(membraneResistance) || membraneResistance <= 0)
    throw new RangeError(
      'membrane: effective ionic resistance outside supported domain',
    );

  const anodeAt = (eta: number) => {
    const activity = -Math.expm1((-alphaA * eta) / thermalV);
    return solvePorousAnode1d({
      ...input.anode,
      maximumSurfaceReactionFlux: {
        ...input.anode.maximumSurfaceReactionFlux,
        value: input.anode.maximumSurfaceReactionFlux.value * activity,
      },
    });
  };
  const polarization = (eta: number) => {
    const anode = anodeAt(eta);
    const current = anode.faradaicCurrentA;
    const cathodeActivation = inverseButlerVolmer(
      current / cathodeArea,
      exchange,
      alphaC,
      thermalV,
    );
    const cathodeMassTransfer =
      current === 0
        ? 0
        : oxygenLimit === 0 || current >= oxygenLimit
          ? Infinity
          : oxygenLimit === Infinity
            ? 0
            : (-thermalV / 4) * Math.log1p(-current / oxygenLimit);
    const loss =
      eta +
      cathodeActivation +
      cathodeMassTransfer +
      current * (resistance + membraneResistance + load);
    return {
      eta,
      anode,
      current,
      cathodeActivation,
      cathodeMassTransfer,
      residual:
        (input.system === 'MFC' ? reversible : applied - reversible) - loss,
    };
  };
  const available = input.system === 'MFC' ? reversible : applied - reversible;
  let final: ReturnType<typeof polarization>;
  let currentLimitReason: CoupledCell1dResult['currentLimitReason'] = 'none';
  if (
    available <= 0 ||
    oxygenLimit === 0 ||
    anodeAt(maxEta).faradaicCurrentA === 0
  ) {
    currentLimitReason =
      available <= 0
        ? 'no_driving_voltage'
        : oxygenLimit === 0
          ? 'no_oxygen'
          : 'no_active_anode';
    final = polarization(0);
  } else {
    let low = 0,
      high = maxEta;
    if (polarization(high).residual > 1e-8)
      throw new RangeError(
        'maximumAnodeOverpotential: circuit root outside declared kinetic domain',
      );
    for (let i = 0; i < 52; i += 1) {
      const mid = (low + high) / 2;
      if (polarization(mid).residual > 0) low = mid;
      else high = mid;
    }
    final = polarization((low + high) / 2);
  }
  const current = final.current;
  const drop = current * membraneResistance;
  let cumulative = 0;
  const potential = [
    0,
    ...poreResistance.map((segment) => {
      cumulative += segment;
      return (-drop * cumulative) / totalPoreResistance;
    }),
  ].map(
    (v): SourcedSpatialValue<'V'> => ({
      value: v,
      unit: 'V',
      source_kind: 'assumption',
      source_ref: 'model://coupled-cell-1d/ionic-charge-closure',
    }),
  );
  const membrane = solveMembraneIon1d({
    ...input.membrane,
    interfacePotential: potential,
  });
  const ionicChargeResidual = membrane.totalIonicCurrentA - current;
  if (
    Math.abs(ionicChargeResidual) > Math.max(1e-10, current * 1e-6) ||
    Math.abs(final.anode.balanceResidualMolS) >
      Math.max(1e-14, final.anode.substrateConsumptionMolS * 1e-6) ||
    (current > 0 && Math.abs(final.residual) > 1e-8)
  )
    throw new Error('Coupled cell failed ionic, substrate or circuit closure');
  const voltage = input.system === 'MFC' ? current * load : applied;
  const grossH2 =
    input.system === 'MEC' ? (current * h2Efficiency) / (2 * F) : 0;
  return {
    system: input.system,
    currentA: current,
    cellVoltageV: voltage,
    electricalPowerW: current * voltage,
    electricalBoundary: input.system === 'MFC' ? 'generated' : 'consumed',
    anodeOverpotentialV: final.eta,
    cathodeActivationOverpotentialV: final.cathodeActivation,
    cathodeMassTransferOverpotentialV: final.cathodeMassTransfer,
    membraneVoltageDropV: drop,
    otherOhmicDropV: current * resistance,
    electronBalanceResidualA: final.anode.faradaicCurrentA - current,
    ionicChargeResidualA: ionicChargeResidual,
    circuitResidualV: final.residual,
    currentLimitReason,
    hydrogenGrossMolS: grossH2,
    hydrogenCapturedMolS: grossH2 * h2Capture,
    anode: final.anode,
    membrane,
    modelStatus: 'development_only',
    sourceDois: [
      ...new Set([
        ...final.anode.sourceDois,
        ...Object.values(COUPLED_CELL_1D_SOURCES),
      ]),
    ],
  };
}
