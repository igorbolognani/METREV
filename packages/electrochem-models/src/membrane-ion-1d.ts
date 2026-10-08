/**
 * A steady 1D ideal-solution Nernst–Planck membrane transport reduction.
 * Moshtarikhah et al. (2017), DOI 10.1007/s10800-016-1017-2, Eq. 1 and 7
 * motivate diffusion, migration, and ionic current. This reduced solver uses
 * declared boundary concentrations and potentials. It does not reproduce
 * Donnan partitioning, water convection, fixed charge, swelling, or the
 * coupled potential/electroneutrality equations of that paper. Its measured
 * alkaline Nafion parameters must not be transferred to an MFC by default.
 */
import {
  POROUS_ANODE_1D_SOURCES,
  type SourcedSpatialValue,
} from './porous-anode-1d';

export const MEMBRANE_ION_1D_SOURCE = {
  doi: '10.1007/s10800-016-1017-2',
  url: 'https://doi.org/10.1007/s10800-016-1017-2',
  locator:
    'Model approach, Eqs. 1, 7; convection and Donnan boundary discussion',
  review_status: 'pending',
} as const;

export interface MembraneIonSpecies {
  name: string;
  valence: SourcedSpatialValue<'1'>;
  freeDiffusivity: SourcedSpatialValue<'m2/s'>;
  /** Concentrations immediately inside the membrane, after partitioning. */
  leftConcentration: SourcedSpatialValue<'mol/m3'>;
  rightConcentration: SourcedSpatialValue<'mol/m3'>;
}

export interface MembraneIonSegment {
  /** Local liquid pore volume fraction, used in D_eff=epsilon D_free/tau. */
  porosity: SourcedSpatialValue<'1'>;
  tortuosity: SourcedSpatialValue<'1'>;
}

export interface MembraneIonInput {
  thickness: SourcedSpatialValue<'m'>;
  area: SourcedSpatialValue<'m2'>;
  temperature: SourcedSpatialValue<'K'>;
  segments: readonly MembraneIonSegment[];
  /** Imposed potential at each segment interface, from anode to cathode. */
  interfacePotential: readonly SourcedSpatialValue<'V'>[];
  species: readonly MembraneIonSpecies[];
}

export interface MembraneIonResult {
  xNodesM: number[];
  species: {
    name: string;
    concentrationMolM3: number[];
    effectiveDiffusivityM2S: number[];
    fluxMolM2S: number;
    fluxResidualMolM2S: number;
    currentA: number;
  }[];
  totalIonicCurrentA: number;
  sourceDoi: string;
  reviewStatus: 'pending';
  /** Present only for the exact uniform binary charge-closure family. */
  uniformDonnan?: {
    formulation: 'uniform-binary-ideal-donnan-v1';
    fixedChargeDensityMolM3: number;
    chargeResidualMolM3: number;
    maximumVolumeChargeResidualMolM3: number;
    leftMembraneMinusSolutionPotentialV: number;
    rightMembraneMinusSolutionPotentialV: number;
    netInterfaceVoltageV: number;
    membraneResistanceOhm: number;
    interfacePotentialV: number[];
    species: {
      name: string;
      valence: number;
      partitionCoefficient: number;
      solutionConcentrationMolM3: number;
      equilibriumMembraneConcentrationMolM3: number;
      currentFraction: number;
    }[];
  };
}

export function membraneParameterValue(
  item: SourcedSpatialValue,
  unit: string,
  label: string,
  min: number,
  max = Infinity,
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
    item.value < min ||
    item.value > max
  )
    throw new RangeError(
      `${label}: finite ${unit} value and source provenance required`,
    );
  return item.value;
}

export function positiveMembraneParameterValue(
  item: SourcedSpatialValue,
  unit: string,
  label: string,
): number {
  const value = membraneParameterValue(item, unit, label, 0);
  if (!value) throw new RangeError(`${label}: must be positive`);
  return value;
}

function bernoulli(x: number): number {
  if (Math.abs(x) < 1e-5) return 1 - x / 2 + (x * x) / 12 - x ** 4 / 720;
  return x / Math.expm1(x);
}

/** Steady transport with exact exponential fitting in each constant-coefficient segment. */
export function solveMembraneIon1d(input: MembraneIonInput): MembraneIonResult {
  const number = membraneParameterValue;
  const positive = positiveMembraneParameterValue;
  const n = input.segments?.length ?? 0;
  if (
    n < 2 ||
    n > 512 ||
    input.interfacePotential?.length !== n + 1 ||
    !input.species?.length ||
    input.species.length > 32
  )
    throw new RangeError('segments: 2..512; potentials: n+1; species: 1..32');
  const length = positive(input.thickness, 'm', 'thickness');
  const area = positive(input.area, 'm2', 'area');
  const temperature = positive(input.temperature, 'K', 'temperature');
  const eps = input.segments.map((segment, i) => {
    const value = positive(segment.porosity, '1', `segments[${i}].porosity`);
    if (value >= 1)
      throw new RangeError(`segments[${i}].porosity must be below 1`);
    return value;
  });
  const tau = input.segments.map((segment, i) =>
    number(segment.tortuosity, '1', `segments[${i}].tortuosity`, 1),
  );
  const potential = input.interfacePotential.map((item, i) =>
    number(item, 'V', `interfacePotential[${i}]`, -Infinity),
  );
  const h = length / n;
  const f = POROUS_ANODE_1D_SOURCES.faradayConstant.value;
  const rt = POROUS_ANODE_1D_SOURCES.gasConstant.value * temperature;
  const names = new Set<string>();
  const species = input.species.map((ion, s) => {
    if (!ion.name?.trim() || names.has(ion.name))
      throw new RangeError(`species[${s}].name: unique nonempty name required`);
    names.add(ion.name);
    const z = number(ion.valence, '1', `species[${s}].valence`, -Infinity);
    if (!Number.isInteger(z) || !z)
      throw new RangeError(`species[${s}].valence: nonzero integer required`);
    const freeD = positive(
      ion.freeDiffusivity,
      'm2/s',
      `species[${s}].freeDiffusivity`,
    );
    const left = number(
      ion.leftConcentration,
      'mol/m3',
      `species[${s}].leftConcentration`,
      0,
    );
    const right = number(
      ion.rightConcentration,
      'mol/m3',
      `species[${s}].rightConcentration`,
      0,
    );
    const d = eps.map((value, i) => (freeD * value) / tau[i]);
    const a: number[] = [],
      b: number[] = [];
    for (let i = 0; i < n; i += 1) {
      const pe = (z * f * (potential[i + 1] - potential[i])) / rt;
      if (Math.abs(pe) > 50)
        throw new RangeError(
          `species[${s}]: potential jump exceeds supported cell Peclet number`,
        );
      a.push((d[i] / h) * bernoulli(pe));
      b.push((d[i] / h) * bernoulli(-pe));
    }
    const m = n - 1;
    const diag = Array.from({ length: m }, (_, k) => b[k] + a[k + 1]);
    const lower = Array.from({ length: m }, (_, k) => (k ? -a[k] : 0));
    const upper = Array.from({ length: m }, (_, k) =>
      k < m - 1 ? -b[k + 1] : 0,
    );
    const rhs = Array.from(
      { length: m },
      (_, k) =>
        (k === 0 ? a[0] * left : 0) + (k === m - 1 ? b[n - 1] * right : 0),
    );
    for (let k = 1; k < m; k += 1) {
      const factor = lower[k] / diag[k - 1];
      diag[k] -= factor * upper[k - 1];
      rhs[k] -= factor * rhs[k - 1];
      if (!(diag[k] > 0)) throw new Error('Membrane transport system singular');
    }
    const interior = new Array<number>(m);
    interior[m - 1] = rhs[m - 1] / diag[m - 1];
    for (let k = m - 2; k >= 0; k -= 1)
      interior[k] = (rhs[k] - upper[k] * interior[k + 1]) / diag[k];
    const c = [left, ...interior, right];
    const flux = a.map((value, i) => value * c[i] - b[i] * c[i + 1]);
    const mean = flux.reduce((sum, value) => sum + value, 0) / n;
    if (
      c.some(
        (value) =>
          !Number.isFinite(value) || value < -1e-9 * Math.max(1, left, right),
      )
    )
      throw new Error('Membrane transport solution has invalid concentration');
    return {
      name: ion.name,
      concentrationMolM3: c,
      effectiveDiffusivityM2S: d,
      fluxMolM2S: mean,
      fluxResidualMolM2S: Math.max(
        ...flux.map((value) => Math.abs(value - mean)),
      ),
      currentA: z * f * area * mean,
    };
  });
  return {
    xNodesM: Array.from({ length: n + 1 }, (_, i) => i * h),
    species,
    totalIonicCurrentA: species.reduce((sum, ion) => sum + ion.currentA, 0),
    sourceDoi: MEMBRANE_ION_1D_SOURCE.doi,
    reviewStatus: 'pending',
  };
}
