/**
 * A steady 1D representative-volume porous bioanode. The liquid-phase balance
 * and local reaction source follow Casula et al. (2022), Eqs. 5, 7, 9, 16,
 * 19 (DOI 10.1051/e3sconf/202233408005). This is a reduced finite-volume
 * formulation, not a reproduction of their coupled transient 3D cell.
 *
 * ε C is pore-liquid inventory per bulk electrode volume; D_eff=ε D_free/τ
 * is the declared tortuosity convention. a_v is internal area per bulk volume,
 * supplied separately from ε; the two may covary in an actual electrode.
 * The accessible electroactive fraction scales a_v, and
 * Nernst–Monod kinetics depend on local substrate and imposed anode potential.
 * No solid/electrolyte potential field, biofilm growth, hydraulics, gas or
 * cathode reaction is solved. Membrane resistance is an output diagnostic,
 * not a voltage boundary fed back into the imposed anode potential.
 */
export const POROUS_ANODE_1D_SOURCES = {
  formulation: {
    doi: '10.1051/e3sconf/202233408005',
    locator: 'Mathematical model, Eqs. 1, 5, 7, 9, 16, 19; Table 1',
    url: 'https://doi.org/10.1051/e3sconf/202233408005',
  },
  separateMembraneDomain: {
    doi: '10.1016/j.jpowsour.2024.236143',
    locator: 'Model equations, species and charge conservation by domain',
    url: 'https://doi.org/10.1016/j.jpowsour.2024.236143',
  },
  activeSurfaceLimit: {
    doi: '10.1038/s41598-020-65375-5',
    locator: 'Results and Discussion, active specific surface area limitation',
    url: 'https://doi.org/10.1038/s41598-020-65375-5',
  },
  faradayConstant: {
    value: 96485.33212,
    unit: 'C/mol',
    source_ref: 'https://physics.nist.gov/cuu/Constants/',
  },
  gasConstant: {
    value: 8.31446261815324,
    unit: 'J/(mol K)',
    source_ref: 'https://physics.nist.gov/cuu/Constants/',
  },
  review_status: 'pending',
} as const;

type SourceKind =
  | 'measured'
  | 'literature'
  | 'default'
  | 'assumption'
  | 'test_fixture';
export interface SourcedSpatialValue<Unit extends string = string> {
  value: number;
  unit: Unit;
  source_kind: SourceKind;
  source_ref: string;
  original_value?: number;
  original_unit?: string;
  normalization_rule_id?: string;
  uncertainty?: number;
  uncertainty_unit?: Unit;
}

export interface PorousAnodeCell {
  /** Pore-liquid fraction of total electrode volume. */
  porosity: SourcedSpatialValue<'1'>;
  /** Tortuosity used in D_eff=ε D_free/τ; do not substitute pore diameter. */
  tortuosity: SourcedSpatialValue<'1'>;
  /** Total internal area per bulk electrode volume, not projected/BET area. */
  specificSurfaceArea: SourcedSpatialValue<'m2/m3'>;
  /** Fraction of internal surface accessible to electroactive biofilm. */
  accessibleAreaFraction: SourcedSpatialValue<'1'>;
  /** Imposed local anode potential for the Nernst–Monod factor. */
  anodePotential: SourcedSpatialValue<'V'>;
}

export interface PorousAnodeInput {
  /** Through-thickness coordinate x; y/z are represented by projected area. */
  thickness: SourcedSpatialValue<'m'>;
  projectedArea: SourcedSpatialValue<'m2'>;
  freeSubstrateDiffusivity: SourcedSpatialValue<'m2/s'>;
  bulkSubstrateConcentration: SourcedSpatialValue<'mol/m3'>;
  maximumSurfaceReactionFlux: SourcedSpatialValue<'mol/(m2 s)'>;
  halfSaturationConcentration: SourcedSpatialValue<'mol/m3'>;
  halfRateAnodePotential: SourcedSpatialValue<'V'>;
  temperature: SourcedSpatialValue<'K'>;
  electronsPerSubstrateMolecule: SourcedSpatialValue<'1'>;
  /** x=0: no substrate flux at backing; x=L: fixed bulk concentration. */
  cells: readonly PorousAnodeCell[];
  membrane?: {
    thickness: SourcedSpatialValue<'m'>;
    ionicConductivity: SourcedSpatialValue<'S/m'>;
    activeArea: SourcedSpatialValue<'m2'>;
  };
}

export interface PorousAnodeCellResult {
  xCenterM: number;
  substrateConcentrationMolM3: number;
  effectiveDiffusivityM2S: number;
  accessibleAreaM2: number;
  reactionMolM3S: number;
  faradaicCurrentA: number;
}

export interface PorousAnodeResult {
  cells: PorousAnodeCellResult[];
  internalAreaM2: number;
  accessibleAreaM2: number;
  substrateInflowMolS: number;
  substrateConsumptionMolS: number;
  balanceResidualMolS: number;
  faradaicCurrentA: number;
  membraneResistanceOhm: number | null;
  membraneOhmicDropAtFaradaicCurrentV: number | null;
  iterations: number;
  sourceDois: string[];
  reviewStatus: 'pending';
}

function quantity<U extends string>(
  item: SourcedSpatialValue<U>,
  unit: U,
  key: string,
  min: number,
  max = Number.POSITIVE_INFINITY,
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
  ) {
    throw new RangeError(
      `${key}: finite value in [${min}, ${max}] ${unit} with source_kind and source_ref required`,
    );
  }
  return item.value;
}

function positive<U extends string>(
  item: SourcedSpatialValue<U>,
  unit: U,
  key: string,
): number {
  const value = quantity(item, unit, key, 0);
  if (value === 0) throw new RangeError(`${key}: must be positive`);
  return value;
}

/** Tridiagonal solve with no arbitrary regularization of the reaction field. */
function tridiagonal(
  lower: number[],
  diagonal: number[],
  upper: number[],
  rhs: number[],
): number[] {
  const n = diagonal.length;
  const c = new Array<number>(n).fill(0);
  const d = new Array<number>(n).fill(0);
  c[0] = upper[0] / diagonal[0];
  d[0] = rhs[0] / diagonal[0];
  for (let i = 1; i < n; i += 1) {
    const pivot = diagonal[i] - lower[i] * c[i - 1];
    if (!(pivot > 0) || !Number.isFinite(pivot))
      throw new Error('Porous anode linear system is singular');
    c[i] = i === n - 1 ? 0 : upper[i] / pivot;
    d[i] = (rhs[i] - lower[i] * d[i - 1]) / pivot;
  }
  const solution = new Array<number>(n);
  solution[n - 1] = d[n - 1];
  for (let i = n - 2; i >= 0; i -= 1)
    solution[i] = d[i] - c[i] * solution[i + 1];
  return solution;
}

function logistic(value: number): number {
  return value >= 0
    ? 1 / (1 + Math.exp(-value))
    : Math.exp(value) / (1 + Math.exp(value));
}

/** Steady state, central finite volumes; no case-scientific parameter defaults. */
export function solvePorousAnode1d(input: PorousAnodeInput): PorousAnodeResult {
  const n = input.cells?.length ?? 0;
  if (n < 2 || n > 512)
    throw new RangeError('cells: 2..512 through-thickness volumes required');
  const length = positive(input.thickness, 'm', 'thickness');
  const area = positive(input.projectedArea, 'm2', 'projectedArea');
  const freeD = positive(
    input.freeSubstrateDiffusivity,
    'm2/s',
    'freeSubstrateDiffusivity',
  );
  const bulk = positive(
    input.bulkSubstrateConcentration,
    'mol/m3',
    'bulkSubstrateConcentration',
  );
  const kMax = quantity(
    input.maximumSurfaceReactionFlux,
    'mol/(m2 s)',
    'maximumSurfaceReactionFlux',
    0,
  );
  const halfC = positive(
    input.halfSaturationConcentration,
    'mol/m3',
    'halfSaturationConcentration',
  );
  const halfPotential = quantity(
    input.halfRateAnodePotential,
    'V',
    'halfRateAnodePotential',
    -Infinity,
  );
  const temperature = positive(input.temperature, 'K', 'temperature');
  const electrons = positive(
    input.electronsPerSubstrateMolecule,
    '1',
    'electronsPerSubstrateMolecule',
  );
  const dx = length / n;
  const cellVolume = area * dx;
  const faraday = POROUS_ANODE_1D_SOURCES.faradayConstant.value;
  const gas = POROUS_ANODE_1D_SOURCES.gasConstant.value;
  const effectiveD: number[] = [];
  const internalArea: number[] = [];
  const activeArea: number[] = [];
  const kineticAreaRate: number[] = [];
  input.cells.forEach((cell, i) => {
    const eps = positive(cell.porosity, '1', `cells[${i}].porosity`);
    if (eps >= 1) throw new RangeError(`cells[${i}].porosity must be below 1`);
    const tau = quantity(cell.tortuosity, '1', `cells[${i}].tortuosity`, 1);
    const av = quantity(
      cell.specificSurfaceArea,
      'm2/m3',
      `cells[${i}].specificSurfaceArea`,
      0,
    );
    const coverage = quantity(
      cell.accessibleAreaFraction,
      '1',
      `cells[${i}].accessibleAreaFraction`,
      0,
      1,
    );
    const potential = quantity(
      cell.anodePotential,
      'V',
      `cells[${i}].anodePotential`,
      -Infinity,
    );
    effectiveD.push((freeD * eps) / tau);
    internalArea.push(av * cellVolume);
    activeArea.push(av * coverage * cellVolume);
    kineticAreaRate.push(
      av *
        coverage *
        kMax *
        logistic((faraday * (potential - halfPotential)) / (gas * temperature)),
    );
  });
  const conductance = new Array<number>(n + 1).fill(0);
  for (let i = 1; i < n; i += 1) {
    conductance[i] =
      (2 * effectiveD[i - 1] * effectiveD[i]) /
      (effectiveD[i - 1] + effectiveD[i]) /
      dx;
  }
  conductance[n] = (2 * effectiveD[n - 1]) / dx;

  const evaluate = (values: number[]) => {
    const reaction = values.map(
      (c, i) => (kineticAreaRate[i] * c) / (halfC + c),
    );
    const derivative = values.map(
      (c, i) => (kineticAreaRate[i] * halfC) / (halfC + c) ** 2,
    );
    const residual = values.map(
      (c, i) =>
        (conductance[i] * ((i === 0 ? c : values[i - 1]) - c) +
          conductance[i + 1] * ((i === n - 1 ? bulk : values[i + 1]) - c)) /
          dx -
        reaction[i],
    );
    return {
      reaction,
      derivative,
      residual,
      norm: Math.max(...residual.map(Math.abs)),
    };
  };
  let values = new Array<number>(n).fill(bulk);
  let state = evaluate(values);
  const scale = Math.max(
    ...kineticAreaRate,
    ...effectiveD.map((d) => (d * bulk) / (length * length)),
  );
  const tolerance = Math.max(1e-18, 1e-10 * scale);
  let iterations = 0;
  while (state.norm > tolerance && iterations < 60) {
    const diagonal = values.map(
      (_, i) =>
        (conductance[i] + conductance[i + 1]) / dx + state.derivative[i],
    );
    const lower = values.map((_, i) => (i === 0 ? 0 : -conductance[i] / dx));
    const upper = values.map((_, i) =>
      i === n - 1 ? 0 : -conductance[i + 1] / dx,
    );
    const delta = tridiagonal(lower, diagonal, upper, state.residual);
    let step = 1;
    let candidate: number[];
    let next: ReturnType<typeof evaluate>;
    do {
      candidate = values.map((c, i) => c + step * delta[i]);
      if (candidate.some((c) => !Number.isFinite(c) || c < 0 || c > bulk)) {
        step /= 2;
        continue;
      }
      next = evaluate(candidate);
      if (next.norm <= state.norm) break;
      step /= 2;
    } while (step > 1 / 2 ** 30);
    if (step <= 1 / 2 ** 30)
      throw new Error('Porous anode nonlinear solver did not descend');
    values = candidate;
    state = next!;
    iterations += 1;
  }
  if (state.norm > tolerance)
    throw new Error('Porous anode nonlinear solver did not converge');
  const cellResults = values.map((c, i) => ({
    xCenterM: (i + 0.5) * dx,
    substrateConcentrationMolM3: c,
    effectiveDiffusivityM2S: effectiveD[i],
    accessibleAreaM2: activeArea[i],
    reactionMolM3S: state.reaction[i],
    faradaicCurrentA: electrons * faraday * state.reaction[i] * cellVolume,
  }));
  const consumption = state.reaction.reduce(
    (sum, rate) => sum + rate * cellVolume,
    0,
  );
  const inflow = area * conductance[n] * (bulk - values[n - 1]);
  const current = electrons * faraday * consumption;
  let membraneResistance: number | null = null;
  if (input.membrane) {
    const thickness = positive(
      input.membrane.thickness,
      'm',
      'membrane.thickness',
    );
    const conductivity = positive(
      input.membrane.ionicConductivity,
      'S/m',
      'membrane.ionicConductivity',
    );
    const membraneArea = positive(
      input.membrane.activeArea,
      'm2',
      'membrane.activeArea',
    );
    membraneResistance = thickness / (conductivity * membraneArea);
  }
  return {
    cells: cellResults,
    internalAreaM2: internalArea.reduce((sum, value) => sum + value, 0),
    accessibleAreaM2: activeArea.reduce((sum, value) => sum + value, 0),
    substrateInflowMolS: inflow,
    substrateConsumptionMolS: consumption,
    balanceResidualMolS: inflow - consumption,
    faradaicCurrentA: current,
    membraneResistanceOhm: membraneResistance,
    membraneOhmicDropAtFaradaicCurrentV:
      membraneResistance === null ? null : current * membraneResistance,
    iterations,
    sourceDois: [
      POROUS_ANODE_1D_SOURCES.formulation.doi,
      POROUS_ANODE_1D_SOURCES.activeSurfaceLimit.doi,
      ...(input.membrane
        ? [POROUS_ANODE_1D_SOURCES.separateMembraneDomain.doi]
        : []),
    ],
    reviewStatus: POROUS_ANODE_1D_SOURCES.review_status,
  };
}
