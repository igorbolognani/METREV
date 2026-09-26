/**
 * Gatti & Milocco (2017), DOI 10.1007/s40095-017-0249-1, Eqs. 7, 15–24.
 * A reduced mediator-assisted MFC model. The fitted a=D/Δz² and b encode
 * transport and electrode consumption; they do not identify D or thickness
 * separately. The spatial coordinate is a slice index, not a physical depth.
 */
export const GATTI_2017_SOURCE = {
  doi: '10.1007/s40095-017-0249-1',
  url: 'https://doi.org/10.1007/s40095-017-0249-1',
  equations: '7, 15–24, 35',
  parameterLocator:
    'Table 2 (mean values over eight experiments); N=7 in Results',
  reviewStatus: 'pending',
} as const;

export interface GattiBiofilmParameters {
  /** N intervals: states 0..N−1 plus fixed bulk state N. */
  intervals: number;
  /** a=D/Δz², s⁻¹. */
  diffusionRatePerSecond: number;
  /** b=1/(F γ c̄ Δz Nₑ), (mA s)⁻¹ for currents in mA. */
  consumptionPerMilliampSecond: number;
  reducedRateMilliamp: number;
  oxidizedRateMilliamp: number;
  symmetryPerMillivolt: number;
  internalResistanceOhm: number;
  doubleLayerCapacitanceFarad: number;
  bulkFraction: number;
}

/** Candidate extraction: every value keeps its source and original unit. */
export const GATTI_2017_PARAMETER_EVIDENCE = {
  intervals: {
    value: 7,
    unit: 'count',
    locator: 'Results, Numerical parameter estimation',
  },
  diffusionRatePerSecond: {
    value: 2.14e-2,
    unit: 's^-1',
    locator: 'Table 2, a, Mean',
  },
  consumptionPerMilliampSecond: {
    value: 3.13e-3,
    unit: '(mA s)^-1',
    locator: 'Table 2, b, Mean',
  },
  reducedRateMilliamp: {
    value: 2.96e5,
    unit: 'mA',
    locator: 'Table 2, Kr, Mean',
  },
  oxidizedRateMilliamp: {
    value: 1.8e-9,
    unit: 'mA',
    locator: 'Table 2, Ko, Mean',
  },
  symmetryPerMillivolt: {
    value: 1.97e-2,
    unit: 'mV^-1',
    locator: 'Parameter identification method, symmetry factors',
  },
  internalResistanceOhm: {
    value: 624,
    unit: 'ohm',
    locator: 'Table 2, Ri, Mean',
  },
  doubleLayerCapacitanceFarad: {
    value: 2.94e-1,
    unit: 'F',
    locator: 'Table 2, Cdl, Mean',
  },
  bulkFraction: {
    value: 1,
    unit: 'fraction',
    locator: 'Parameter identification method, S̄=1',
  },
} as const satisfies Record<
  keyof GattiBiofilmParameters,
  {
    value: number;
    unit: string;
    locator: string;
  }
>;

export function gattiParameterEvidence(key: keyof GattiBiofilmParameters) {
  return {
    ...GATTI_2017_PARAMETER_EVIDENCE[key],
    source_kind: 'literature' as const,
    source_ref: `${GATTI_2017_SOURCE.url}#${GATTI_2017_PARAMETER_EVIDENCE[key].locator}`,
    review_status: GATTI_2017_SOURCE.reviewStatus,
    extraction_method: 'table_or_text_transcription' as const,
    study_condition:
      'Gatti and Milocco MFC, eight load experiments; mean fitted parameters',
    dataset_role: 'model_development' as const,
    extraction_uncertainty: 'not_reported' as const,
  };
}

/** Article Table 2 means, with its fractional bulk S̄=1 and N=7. */
export const GATTI_2017_MEAN_PARAMETERS: Readonly<GattiBiofilmParameters> = {
  intervals: GATTI_2017_PARAMETER_EVIDENCE.intervals.value,
  diffusionRatePerSecond:
    GATTI_2017_PARAMETER_EVIDENCE.diffusionRatePerSecond.value,
  consumptionPerMilliampSecond:
    GATTI_2017_PARAMETER_EVIDENCE.consumptionPerMilliampSecond.value,
  reducedRateMilliamp: GATTI_2017_PARAMETER_EVIDENCE.reducedRateMilliamp.value,
  oxidizedRateMilliamp:
    GATTI_2017_PARAMETER_EVIDENCE.oxidizedRateMilliamp.value,
  symmetryPerMillivolt:
    GATTI_2017_PARAMETER_EVIDENCE.symmetryPerMillivolt.value,
  internalResistanceOhm:
    GATTI_2017_PARAMETER_EVIDENCE.internalResistanceOhm.value,
  doubleLayerCapacitanceFarad:
    GATTI_2017_PARAMETER_EVIDENCE.doubleLayerCapacitanceFarad.value,
  bulkFraction: GATTI_2017_PARAMETER_EVIDENCE.bulkFraction.value,
};

/** Table 2 extrema across fitted experiments, not confidence bounds. */
export const GATTI_2017_FITTED_INTERVALS = {
  diffusionRatePerSecond: { min: 1e-6, max: 5e-2, unit: 's^-1' },
  consumptionPerMilliampSecond: { min: 1e-6, max: 1.47e-2, unit: '(mA s)^-1' },
  reducedRateMilliamp: { min: 9.62e4, max: 4.45e5, unit: 'mA' },
  oxidizedRateMilliamp: { min: 5.85e-10, max: 2.7e-9, unit: 'mA' },
  internalResistanceOhm: { min: 365, max: 958, unit: 'ohm' },
  doubleLayerCapacitanceFarad: { min: 1.75e-1, max: 5e-1, unit: 'F' },
} as const;

export function gattiFittedIntervalEvidence(
  key: keyof typeof GATTI_2017_FITTED_INTERVALS,
) {
  return {
    ...GATTI_2017_FITTED_INTERVALS[key],
    source_kind: 'literature' as const,
    source_ref: `${GATTI_2017_SOURCE.url}#Table 2, ${key}, Min/Max`,
    review_status: GATTI_2017_SOURCE.reviewStatus,
    extraction_method: 'table_transcription' as const,
    study_condition:
      'Eight MFC load experiments; extrema of fitted parameter values',
    dataset_role: 'model_development' as const,
    extraction_uncertainty: 'not_reported' as const,
  };
}

export interface GattiBiofilmState {
  /** S(z₀)..S(zₙ₋₁), followed by the fixed bulk S(zₙ). */
  substrateFractionBySlice: number[];
  /** U=V+I Rᵢ, mV. */
  interfacialPotentialMillivolt: number;
}

export interface GattiBiofilmObservation extends GattiBiofilmState {
  timeSeconds: number;
  loadOhm: number | null;
  terminalVoltageMillivolt: number;
  currentMilliamp: number;
  faradaicCurrentMilliamp: number;
  capacitiveCurrentMilliamp: number;
}

export interface GattiLoadSegment {
  durationSeconds: number;
  /** null denotes open circuit; zero resistance denotes short circuit. */
  loadOhm: number | null;
}

function positive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0)
    throw new RangeError(`${name} must be finite and positive`);
}

function validate(
  parameters: GattiBiofilmParameters,
  state: GattiBiofilmState,
): void {
  if (!Number.isSafeInteger(parameters.intervals) || parameters.intervals < 2) {
    throw new RangeError('intervals must be an integer of at least 2');
  }
  for (const key of [
    'diffusionRatePerSecond',
    'consumptionPerMilliampSecond',
    'reducedRateMilliamp',
    'oxidizedRateMilliamp',
    'symmetryPerMillivolt',
    'doubleLayerCapacitanceFarad',
  ] as const)
    positive(key, parameters[key]);
  if (
    !Number.isFinite(parameters.internalResistanceOhm) ||
    parameters.internalResistanceOhm < 0
  ) {
    throw new RangeError(
      'internalResistanceOhm must be finite and nonnegative',
    );
  }
  if (
    !Number.isFinite(parameters.bulkFraction) ||
    parameters.bulkFraction <= 0 ||
    parameters.bulkFraction > 1
  ) {
    throw new RangeError('bulkFraction must lie in (0, 1]');
  }
  if (
    state.substrateFractionBySlice.length !== parameters.intervals + 1 ||
    state.substrateFractionBySlice.some(
      (value) => !Number.isFinite(value) || value < 0 || value > 1,
    ) ||
    state.substrateFractionBySlice.at(-1) !== parameters.bulkFraction ||
    !Number.isFinite(state.interfacialPotentialMillivolt)
  ) {
    throw new RangeError(
      'state must have N+1 physical fractions, ending at the fixed bulk fraction',
    );
  }
}

/** Equation 9 at zero current, for a uniform initial biofilm. */
export function initialGattiBiofilmState(
  parameters: GattiBiofilmParameters,
): GattiBiofilmState {
  const fraction = parameters.bulkFraction;
  const state = {
    substrateFractionBySlice: Array<number>(parameters.intervals + 1).fill(
      fraction,
    ),
    interfacialPotentialMillivolt:
      Math.log(
        (parameters.reducedRateMilliamp * fraction) /
          parameters.oxidizedRateMilliamp,
      ) /
      (2 * parameters.symmetryPerMillivolt),
  };
  validate(parameters, state);
  return state;
}

function rates(
  parameters: GattiBiofilmParameters,
  state: GattiBiofilmState,
  loadOhm: number | null,
) {
  const u = state.interfacialPotentialMillivolt;
  const i =
    loadOhm === null ? 0 : u / (loadOhm + parameters.internalResistanceOhm);
  const v = loadOhm === null ? u : i * loadOhm;
  const reduced =
    parameters.reducedRateMilliamp *
    state.substrateFractionBySlice[0] *
    Math.exp(-parameters.symmetryPerMillivolt * u);
  const oxidized =
    parameters.oxidizedRateMilliamp *
    Math.exp(parameters.symmetryPerMillivolt * u);
  const faradaic = reduced - oxidized;
  const derivatives = state.substrateFractionBySlice.map((s, index, slices) => {
    if (index === parameters.intervals) return 0;
    const inward = index === 0 ? 0 : slices[index - 1];
    const outward = slices[index + 1];
    return (
      parameters.diffusionRatePerSecond *
        (inward + outward - (index === 0 ? 1 : 2) * s) -
      (index === 0 ? parameters.consumptionPerMilliampSecond * faradaic : 0)
    );
  });
  return {
    currentMilliamp: i,
    terminalVoltageMillivolt: v,
    faradaicCurrentMilliamp: faradaic,
    capacitiveCurrentMilliamp: faradaic - i,
    derivative: {
      substrateFractionBySlice: derivatives,
      interfacialPotentialMillivolt:
        (faradaic - i) / parameters.doubleLayerCapacitanceFarad,
    },
    electrochemicalSlope:
      parameters.symmetryPerMillivolt * (reduced + oxidized) +
      (loadOhm === null ? 0 : 1 / (loadOhm + parameters.internalResistanceOhm)),
  };
}

function advance(
  state: GattiBiofilmState,
  derivative: GattiBiofilmState,
  factor: number,
): GattiBiofilmState {
  return {
    substrateFractionBySlice: state.substrateFractionBySlice.map(
      (value, index) =>
        value + factor * derivative.substrateFractionBySlice[index],
    ),
    interfacialPotentialMillivolt:
      state.interfacialPotentialMillivolt +
      factor * derivative.interfacialPotentialMillivolt,
  };
}

/** Explicit RK4 with a local stability step bound; segment boundaries are exact. */
export function simulateGattiBiofilm(
  parameters: GattiBiofilmParameters,
  segments: readonly GattiLoadSegment[],
  options: {
    initialState?: GattiBiofilmState;
    maximumStepSeconds?: number;
  } = {},
): GattiBiofilmObservation[] {
  let state = options.initialState ?? initialGattiBiofilmState(parameters);
  validate(parameters, state);
  const maximumStep = options.maximumStepSeconds ?? 1;
  positive('maximumStepSeconds', maximumStep);
  const observations: GattiBiofilmObservation[] = [];
  let time = 0;
  for (const { durationSeconds, loadOhm } of segments) {
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0 ||
      (loadOhm !== null && (!Number.isFinite(loadOhm) || loadOhm < 0)) ||
      (loadOhm === 0 && parameters.internalResistanceOhm === 0)
    ) {
      throw new RangeError(
        'segment needs a nonnegative duration and a valid load',
      );
    }
    const end = time + durationSeconds;
    if (!Number.isFinite(end))
      throw new RangeError('total duration must be finite');
    while (time < end) {
      const first = rates(parameters, state, loadOhm);
      const step = Math.min(
        end - time,
        maximumStep,
        0.4 / parameters.diffusionRatePerSecond,
        (0.4 * parameters.doubleLayerCapacitanceFarad) /
          first.electrochemicalSlope,
      );
      positive('integration step', step);
      const k1 = first.derivative;
      const k2 = rates(
        parameters,
        advance(state, k1, step / 2),
        loadOhm,
      ).derivative;
      const k3 = rates(
        parameters,
        advance(state, k2, step / 2),
        loadOhm,
      ).derivative;
      const k4 = rates(
        parameters,
        advance(state, k3, step),
        loadOhm,
      ).derivative;
      state = {
        substrateFractionBySlice: state.substrateFractionBySlice.map(
          (value, index) =>
            value +
            (step *
              (k1.substrateFractionBySlice[index] +
                2 * k2.substrateFractionBySlice[index] +
                2 * k3.substrateFractionBySlice[index] +
                k4.substrateFractionBySlice[index])) /
              6,
        ),
        interfacialPotentialMillivolt:
          state.interfacialPotentialMillivolt +
          (step *
            (k1.interfacialPotentialMillivolt +
              2 * k2.interfacialPotentialMillivolt +
              2 * k3.interfacialPotentialMillivolt +
              k4.interfacialPotentialMillivolt)) /
            6,
      };
      validate(parameters, state);
      time = Math.min(end, time + step);
    }
    const output = rates(parameters, state, loadOhm);
    observations.push({
      ...state,
      substrateFractionBySlice: [...state.substrateFractionBySlice],
      timeSeconds: time,
      loadOhm,
      terminalVoltageMillivolt: output.terminalVoltageMillivolt,
      currentMilliamp: output.currentMilliamp,
      faradaicCurrentMilliamp: output.faradaicCurrentMilliamp,
      capacitiveCurrentMilliamp: output.capacitiveCurrentMilliamp,
    });
  }
  return observations;
}

/** One-at-a-time research envelope; extrema came from different fitted runs. */
export function sweepGattiFittedIntervals(
  segments: readonly GattiLoadSegment[],
  options: { maximumStepSeconds?: number } = {},
) {
  const baseline = simulateGattiBiofilm(
    GATTI_2017_MEAN_PARAMETERS,
    segments,
    options,
  );
  const variations = (
    Object.keys(GATTI_2017_FITTED_INTERVALS) as Array<
      keyof typeof GATTI_2017_FITTED_INTERVALS
    >
  ).flatMap((parameter) => {
    const { min, max } = GATTI_2017_FITTED_INTERVALS[parameter];
    return (
      [
        ['min', min],
        ['max', max],
      ] as const
    ).map(([endpoint, value]) => ({
      parameter,
      endpoint,
      value,
      evidence: gattiFittedIntervalEvidence(parameter),
      observations: simulateGattiBiofilm(
        { ...GATTI_2017_MEAN_PARAMETERS, [parameter]: value },
        segments,
        options,
      ),
    }));
  });
  return {
    baseline,
    variations,
    interpretation:
      'One-at-a-time fitted-parameter exploration; not a confidence or predictive interval.',
    review_status: GATTI_2017_SOURCE.reviewStatus,
  };
}
