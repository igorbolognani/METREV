import type {
  ConfidenceLevel,
  DerivedObservation,
  NormalizedCaseInput,
  SignalSourceKind,
  SimulationEnrichment,
  SimulationSummary,
} from '@metrev/domain-contracts';

export const INTERNAL_MODEL_VERSION = 'internal-v1';
export const INTERNAL_MODEL_PROVIDER = 'metrev-internal-electrochem-models';

const supportedTechnologyFamilies = new Set([
  'microbial_fuel_cell',
  'microbial_electrolysis_cell',
  'microbial_electrochemical_technology',
]);

const ruleInputSignalKeys = [
  'current_density_a_m2',
  'power_density_w_m2',
  'internal_resistance_ohm',
  'cod_removal_pct',
  'nitrogen_recovery_proxy_pct',
  'hydrogen_recovery_proxy_rate',
  'operating_window_temperature_c',
  'operating_window_ph',
  'operating_window_conductivity_ms_per_cm',
] as const;

const ruleInputSignalKeySet = new Set<string>(ruleInputSignalKeys);

type SimulationMode = 'disabled' | 'internal_v1';

export interface ModelProvider {
  evaluate(input: {
    normalizedCase: NormalizedCaseInput;
  }): SimulationEnrichment;
}

export interface SimulationEligibility {
  eligible: boolean;
  missingInputs: string[];
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function getNumericMetric(
  normalizedCase: NormalizedCaseInput,
  key: string,
): number | null {
  const value = normalizedCase.measured_metrics[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) {
    return 'high';
  }

  if (score >= 45) {
    return 'medium';
  }

  return 'low';
}

function proximityScore(
  value: number | null,
  lower: number,
  upper: number,
): number {
  if (value === null) {
    return 0.55;
  }

  if (value >= lower && value <= upper) {
    return 1;
  }

  const center = (lower + upper) / 2;
  const span = Math.max((upper - lower) / 2, 0.1);
  const penalty = Math.abs(value - center) / span;
  return clamp(1 - penalty * 0.35, 0.2, 1);
}

function technologyTargets(technologyFamily: string) {
  switch (technologyFamily) {
    case 'microbial_electrolysis_cell':
      return {
        temperature: [30, 35] as const,
        ph: [7.2, 8.4] as const,
        conductivity: [8, 24] as const,
        currentDensityBase: 95,
        powerDensityBase: 42,
        internalResistanceBase: 46,
      };
    case 'microbial_electrochemical_technology':
      return {
        temperature: [27, 33] as const,
        ph: [6.8, 8.1] as const,
        conductivity: [6, 18] as const,
        currentDensityBase: 82,
        powerDensityBase: 35,
        internalResistanceBase: 50,
      };
    default:
      return {
        temperature: [28, 32] as const,
        ph: [6.8, 7.5] as const,
        conductivity: [5, 15] as const,
        currentDensityBase: 75,
        powerDensityBase: 28,
        internalResistanceBase: 58,
      };
  }
}

function architectureFactor(architectureFamily: string): number {
  const normalized = architectureFamily.toLowerCase();

  if (normalized.includes('single')) {
    return 0.96;
  }

  if (normalized.includes('dual') || normalized.includes('two')) {
    return 1.03;
  }

  if (normalized.includes('modular')) {
    return 1.01;
  }

  return 1;
}

function observabilityFactor(dataQuality: string | undefined): number {
  switch ((dataQuality ?? '').toLowerCase()) {
    case 'high':
      return 1.04;
    case 'medium':
      return 1;
    case 'low':
      return 0.92;
    default:
      return 0.95;
  }
}

function evidenceFactor(evidenceCount: number, supplierClaimFraction: string) {
  const base = clamp(0.94 + evidenceCount * 0.02, 0.94, 1.04);

  if (supplierClaimFraction === 'high') {
    return base - 0.05;
  }

  if (supplierClaimFraction === 'medium') {
    return base - 0.02;
  }

  return base;
}

function buildUnavailableObservation(input: {
  key: string;
  label: string;
  provenanceNote: string;
  missingDependencies: string[];
  decisionRelevance?: 'informational' | 'rule_input';
}): DerivedObservation {
  return {
    observation_id: `sim-${input.key}`,
    key: input.key,
    label: input.label,
    value: null,
    unit: null,
    source_kind: 'unavailable',
    confidence_level: 'low',
    decision_relevance: input.decisionRelevance ?? 'informational',
    provenance_note: input.provenanceNote,
    assumptions: [],
    missing_dependencies: input.missingDependencies,
  };
}

function buildModeledObservation(input: {
  key: string;
  label: string;
  value: number;
  unit: string | null;
  confidenceLevel: ConfidenceLevel;
  provenanceNote: string;
  assumptions: string[];
  decisionRelevance?: 'informational' | 'rule_input';
  missingDependencies?: string[];
}): DerivedObservation {
  return {
    observation_id: `sim-${input.key}`,
    key: input.key,
    label: input.label,
    value: round(input.value),
    unit: input.unit,
    source_kind: 'modeled',
    confidence_level: input.confidenceLevel,
    decision_relevance: input.decisionRelevance ?? 'informational',
    provenance_note: input.provenanceNote,
    assumptions: input.assumptions,
    missing_dependencies: input.missingDependencies ?? [],
  };
}

function emptyEnrichment(input: {
  status: SimulationEnrichment['status'];
  note: string;
  modelVersion?: string;
  missingInputs?: string[];
  failureDetail?: Record<string, unknown>;
}): SimulationEnrichment {
  return {
    status: input.status,
    model_version: input.modelVersion ?? INTERNAL_MODEL_VERSION,
    input_snapshot: {},
    derived_observations: [],
    series: [],
    assumptions: [],
    confidence: {
      level: 'low',
      score: input.status === 'disabled' ? 0 : 20,
      drivers: [input.note],
    },
    provenance: {
      provider: INTERNAL_MODEL_PROVIDER,
      execution_mode: 'internal_model',
      source_version: INTERNAL_MODEL_VERSION,
      generated_at: new Date().toISOString(),
      source_refs: [],
      note: input.note,
    },
    failure_detail: input.failureDetail,
  };
}

export function isRuleInputDerivedSignalKey(key: string): boolean {
  return ruleInputSignalKeySet.has(key);
}

export function resolveSimulationMode(rawMode?: string): SimulationMode {
  const normalized = rawMode?.trim().toLowerCase();
  return normalized === 'disabled' ? 'disabled' : 'internal_v1';
}

export function isSimulationEligible(
  normalizedCase: NormalizedCaseInput,
): SimulationEligibility {
  const missingInputs: string[] = [];
  const notes: string[] = [];

  if (!supportedTechnologyFamilies.has(normalizedCase.technology_family)) {
    missingInputs.push('technology_family');
    notes.push(
      'Technology family is outside the supported internal model set.',
    );
  }

  const temperature = getNumber(
    normalizedCase.feed_and_operation.temperature_c,
  );
  const ph = getNumber(normalizedCase.feed_and_operation.pH);
  const measuredMetrics = Object.keys(normalizedCase.measured_metrics).length;

  if (temperature === null) {
    missingInputs.push('feed_and_operation.temperature_c');
  }

  if (ph === null) {
    missingInputs.push('feed_and_operation.pH');
  }

  if (temperature === null && ph === null && measuredMetrics === 0) {
    notes.push(
      'Modeling requires at least one operating condition or one measured metric to avoid speculative output.',
    );
  }

  return {
    eligible:
      supportedTechnologyFamilies.has(normalizedCase.technology_family) &&
      !(temperature === null && ph === null && measuredMetrics === 0),
    missingInputs,
    notes,
  };
}

function buildOperatingWindowSeries(input: {
  currentTemperature: number | null;
  currentPh: number | null;
  tempRange: readonly [number, number];
  phRange: readonly [number, number];
  confidenceLevel: ConfidenceLevel;
  assumptions: string[];
}) {
  const points = [] as SimulationEnrichment['series'][number]['points'];

  for (
    let temp = input.tempRange[0] - 2;
    temp <= input.tempRange[1] + 2;
    temp += 1
  ) {
    for (
      let ph = input.phRange[0] - 0.4;
      ph <= input.phRange[1] + 0.4;
      ph += 0.2
    ) {
      points.push({
        x: round(temp),
        y: round(ph),
        z: round(
          proximityScore(temp, input.tempRange[0], input.tempRange[1]) *
            proximityScore(ph, input.phRange[0], input.phRange[1]) *
            100,
        ),
        label:
          input.currentTemperature === temp && input.currentPh === ph
            ? 'current'
            : undefined,
        meta: {
          confidence_level: input.confidenceLevel,
          assumptions: input.assumptions,
        },
      });
    }
  }

  return {
    series_id: 'operating-window',
    title: 'Operating window map',
    series_type: 'operating_window' as const,
    x_axis: {
      key: 'temperature_c',
      label: 'Temperature',
      unit: 'degC',
    },
    y_axis: {
      key: 'ph',
      label: 'pH',
      unit: null,
    },
    points,
    source_kind: 'modeled' as SignalSourceKind,
    provenance_note:
      'Derived from deterministic operating-window scoring over temperature and pH bounds.',
  };
}

function buildSensitivitySeries(input: {
  centerTemperature: number;
  currentDensity: number;
  tempRange: readonly [number, number];
}) {
  const points = [] as SimulationEnrichment['series'][number]['points'];

  for (
    let temp = input.tempRange[0] - 3;
    temp <= input.tempRange[1] + 3;
    temp += 1
  ) {
    const score =
      input.currentDensity *
      clamp(
        proximityScore(temp, input.tempRange[0], input.tempRange[1]),
        0.3,
        1.05,
      );
    points.push({
      x: round(temp),
      y: round(score),
      label: temp === input.centerTemperature ? 'current' : undefined,
      meta: {},
    });
  }

  return {
    series_id: 'temperature-sensitivity',
    title: 'Temperature sensitivity',
    series_type: 'sensitivity_plot' as const,
    x_axis: {
      key: 'temperature_c',
      label: 'Temperature',
      unit: 'degC',
    },
    y_axis: {
      key: 'modeled_current_density_a_m2',
      label: 'Modeled current density',
      unit: 'A/m2',
    },
    points,
    source_kind: 'modeled' as SignalSourceKind,
    provenance_note:
      'Deterministic sensitivity scan around the current operating-temperature estimate.',
  };
}

function buildElectrochemicalCurves(input: {
  currentDensity: number;
  internalResistance: number;
}) {
  const polarizationPoints =
    [] as SimulationEnrichment['series'][number]['points'];
  const powerPoints = [] as SimulationEnrichment['series'][number]['points'];
  const maxCurrent = Math.max(input.currentDensity * 1.25, 40);
  const openCircuitVoltage = 0.82;

  for (
    let current = 0;
    current <= maxCurrent;
    current += Math.max(maxCurrent / 12, 5)
  ) {
    const voltage = clamp(
      openCircuitVoltage -
        current / Math.max(input.internalResistance * 3.4, 1),
      0.12,
      openCircuitVoltage,
    );
    const power = current * voltage;

    polarizationPoints.push({
      x: round(current),
      y: round(voltage, 3),
      meta: {},
    });
    powerPoints.push({
      x: round(current),
      y: round(power),
      meta: {},
    });
  }

  return [
    {
      series_id: 'polarization-curve',
      title: 'Polarization curve',
      series_type: 'polarization_curve' as const,
      x_axis: {
        key: 'current_density_a_m2',
        label: 'Current density',
        unit: 'A/m2',
      },
      y_axis: {
        key: 'cell_voltage_v',
        label: 'Cell voltage',
        unit: 'V',
      },
      points: polarizationPoints,
      source_kind: 'modeled' as SignalSourceKind,
      provenance_note:
        'Generated from a simplified linearized polarization relationship anchored to modeled current density and internal resistance.',
    },
    {
      series_id: 'power-curve',
      title: 'Power curve',
      series_type: 'power_curve' as const,
      x_axis: {
        key: 'current_density_a_m2',
        label: 'Current density',
        unit: 'A/m2',
      },
      y_axis: {
        key: 'power_density_proxy',
        label: 'Power proxy',
        unit: 'W/m2',
      },
      points: powerPoints,
      source_kind: 'modeled' as SignalSourceKind,
      provenance_note:
        'Generated from the modeled polarization curve without external simulator dependencies.',
    },
  ];
}

export const defaultInternalModelProvider: ModelProvider = {
  evaluate({ normalizedCase }) {
    const eligibility = isSimulationEligible(normalizedCase);
    if (!eligibility.eligible) {
      const unavailableKeys = [
        ['current_density_a_m2', 'Modeled current density'],
        ['power_density_w_m2', 'Modeled power density'],
        ['internal_resistance_ohm', 'Modeled internal resistance'],
        ['cod_removal_pct', 'Modeled COD removal'],
      ] as const;

      return {
        ...emptyEnrichment({
          status: 'insufficient_data',
          note:
            eligibility.notes[0] ??
            'Modeling was skipped because the internal deterministic model did not receive enough operating context.',
          missingInputs: eligibility.missingInputs,
          failureDetail: {
            missing_inputs: eligibility.missingInputs,
          },
        }),
        input_snapshot: {
          technology_family: normalizedCase.technology_family,
          architecture_family: normalizedCase.architecture_family,
          primary_objective: normalizedCase.primary_objective,
        },
        derived_observations: unavailableKeys.map(([key, label]) =>
          buildUnavailableObservation({
            key,
            label,
            provenanceNote:
              'Unavailable because the internal model did not receive sufficient operating context.',
            missingDependencies: eligibility.missingInputs,
            decisionRelevance: 'rule_input',
          }),
        ),
      };
    }

    const targets = technologyTargets(normalizedCase.technology_family);
    const currentTemperature =
      getNumber(normalizedCase.feed_and_operation.temperature_c) ??
      (targets.temperature[0] + targets.temperature[1]) / 2;
    const currentPh =
      getNumber(normalizedCase.feed_and_operation.pH) ??
      (targets.ph[0] + targets.ph[1]) / 2;
    const conductivity = getNumber(
      normalizedCase.feed_and_operation.conductivity_ms_per_cm,
    );
    const measuredCurrentDensity = getNumericMetric(
      normalizedCase,
      'current_density_a_m2',
    );
    const measuredPowerDensity = getNumericMetric(
      normalizedCase,
      'power_density_w_m2',
    );
    const measuredInternalResistance = getNumericMetric(
      normalizedCase,
      'internal_resistance_ohm',
    );
    const measuredCodRemoval = getNumericMetric(
      normalizedCase,
      'cod_removal_pct',
    );
    const typedEvidence =
      normalizedCase.cross_cutting_layers.evidence_and_provenance
        .typed_evidence;
    const tempScore = proximityScore(
      currentTemperature,
      targets.temperature[0],
      targets.temperature[1],
    );
    const phScore = proximityScore(currentPh, targets.ph[0], targets.ph[1]);
    const conductivityScore = proximityScore(
      conductivity,
      targets.conductivity[0],
      targets.conductivity[1],
    );
    const archFactor = architectureFactor(normalizedCase.architecture_family);
    const obsFactor = observabilityFactor(
      normalizedCase.stack_blocks.sensors_and_analytics.data_quality,
    );
    const evidFactor = evidenceFactor(
      typedEvidence.length,
      normalizedCase.cross_cutting_layers.evidence_and_provenance
        .supplier_claim_fraction,
    );

    const assumptions: string[] = [
      'The internal V1 model uses deterministic engineering proxies instead of high-fidelity multiphysics simulation.',
      conductivity === null
        ? `Conductivity was not provided; target midpoint ${round((targets.conductivity[0] + targets.conductivity[1]) / 2)} mS/cm was assumed for envelope estimation.`
        : undefined,
      measuredCurrentDensity === null
        ? 'Current density baseline was estimated from technology family, architecture, and operating window fit.'
        : 'Measured current density anchored the modeled electrochemical curves.',
      measuredInternalResistance === null
        ? 'Internal resistance baseline was inferred from technology family and operating conditions.'
        : 'Measured internal resistance anchored the modeled electrochemical curves.',
    ].filter((entry): entry is string => Boolean(entry));

    const confidenceScore = clamp(
      38 +
        typedEvidence.length * 6 +
        (measuredCurrentDensity !== null ? 8 : 0) +
        (measuredInternalResistance !== null ? 8 : 0) +
        (measuredPowerDensity !== null ? 5 : 0) +
        (measuredCodRemoval !== null ? 5 : 0) +
        normalizedCase.missing_data.length * -4,
      25,
      86,
    );
    const confidenceLevel = toConfidenceLevel(confidenceScore);
    const modeledCurrentDensity = clamp(
      (measuredCurrentDensity ?? targets.currentDensityBase) *
        tempScore *
        phScore *
        archFactor *
        obsFactor *
        evidFactor,
      18,
      180,
    );
    const modeledInternalResistance = clamp(
      (measuredInternalResistance ?? targets.internalResistanceBase) /
        clamp(conductivityScore * archFactor, 0.35, 1.2),
      18,
      140,
    );
    const modeledPowerDensity = clamp(
      (measuredPowerDensity ?? targets.powerDensityBase) *
        tempScore *
        phScore *
        obsFactor,
      8,
      120,
    );
    const modeledCodRemoval = clamp(
      (measuredCodRemoval ??
        (normalizedCase.primary_objective === 'wastewater_treatment'
          ? 58
          : 42)) +
        (tempScore - 0.6) * 18 +
        (phScore - 0.6) * 10 +
        (obsFactor - 0.95) * 20,
      20,
      96,
    );
    const nitrogenRecoveryProxy =
      normalizedCase.primary_objective === 'nitrogen_recovery'
        ? clamp(
            42 + phScore * 20 + conductivityScore * 14 + archFactor * 8,
            15,
            92,
          )
        : null;
    const hydrogenRecoveryProxy =
      normalizedCase.primary_objective === 'hydrogen_recovery' ||
      normalizedCase.technology_family === 'microbial_electrolysis_cell'
        ? clamp(0.18 + tempScore * 0.08 + conductivityScore * 0.06, 0.05, 0.45)
        : null;

    const derivedObservations: DerivedObservation[] = [
      buildModeledObservation({
        key: 'current_density_a_m2',
        label: 'Modeled current density',
        value: modeledCurrentDensity,
        unit: 'A/m2',
        confidenceLevel,
        provenanceNote:
          'Computed from deterministic operating-window fit and architecture scaling.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'power_density_w_m2',
        label: 'Modeled power density',
        value: modeledPowerDensity,
        unit: 'W/m2',
        confidenceLevel,
        provenanceNote:
          'Computed from deterministic operating-window fit and observability scaling.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'internal_resistance_ohm',
        label: 'Modeled internal resistance',
        value: modeledInternalResistance,
        unit: 'ohm',
        confidenceLevel,
        provenanceNote:
          'Computed from deterministic conductivity and architecture adjustments.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'cod_removal_pct',
        label: 'Modeled COD removal',
        value: modeledCodRemoval,
        unit: '%',
        confidenceLevel,
        provenanceNote:
          'Computed from operating-window fit and observability effects for wastewater-oriented runs.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'operating_window_temperature_c',
        label: 'Modeled operating-window temperature',
        value: round((targets.temperature[0] + targets.temperature[1]) / 2),
        unit: 'degC',
        confidenceLevel,
        provenanceNote:
          'Computed as the center of the deterministic operating window for the selected technology family.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'operating_window_ph',
        label: 'Modeled operating-window pH',
        value: round((targets.ph[0] + targets.ph[1]) / 2),
        unit: null,
        confidenceLevel,
        provenanceNote:
          'Computed as the center of the deterministic operating window for the selected technology family.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'operating_window_conductivity_ms_per_cm',
        label: 'Modeled operating-window conductivity',
        value: round((targets.conductivity[0] + targets.conductivity[1]) / 2),
        unit: 'mS/cm',
        confidenceLevel,
        provenanceNote:
          'Computed as the center of the deterministic conductivity window for the selected technology family.',
        assumptions,
        decisionRelevance: 'rule_input',
      }),
      buildModeledObservation({
        key: 'performance_stability_index',
        label: 'Modeled performance stability index',
        value: clamp(tempScore * phScore * obsFactor * 100, 15, 100),
        unit: null,
        confidenceLevel,
        provenanceNote:
          'Computed from operating-window fit and current observability posture.',
        assumptions,
      }),
    ];

    if (nitrogenRecoveryProxy !== null) {
      derivedObservations.push(
        buildModeledObservation({
          key: 'nitrogen_recovery_proxy_pct',
          label: 'Modeled nitrogen recovery proxy',
          value: nitrogenRecoveryProxy,
          unit: '%',
          confidenceLevel,
          provenanceNote:
            'Computed from deterministic nitrogen-recovery proxy factors without external simulator dependencies.',
          assumptions,
          decisionRelevance: 'rule_input',
        }),
      );
    } else {
      derivedObservations.push(
        buildUnavailableObservation({
          key: 'nitrogen_recovery_proxy_pct',
          label: 'Modeled nitrogen recovery proxy',
          provenanceNote:
            'Unavailable because the current run is not a nitrogen-recovery-oriented evaluation.',
          missingDependencies: ['primary_objective:nitrogen_recovery'],
          decisionRelevance: 'rule_input',
        }),
      );
    }

    if (hydrogenRecoveryProxy !== null) {
      derivedObservations.push(
        buildModeledObservation({
          key: 'hydrogen_recovery_proxy_rate',
          label: 'Modeled hydrogen recovery proxy rate',
          value: hydrogenRecoveryProxy,
          unit: 'kgH2/m3/d',
          confidenceLevel,
          provenanceNote:
            'Computed from deterministic MEC-oriented proxy factors without external simulator dependencies.',
          assumptions,
          decisionRelevance: 'rule_input',
        }),
      );
    } else {
      derivedObservations.push(
        buildUnavailableObservation({
          key: 'hydrogen_recovery_proxy_rate',
          label: 'Modeled hydrogen recovery proxy rate',
          provenanceNote:
            'Unavailable because the current run is not hydrogen-recovery-oriented.',
          missingDependencies: [
            'primary_objective:hydrogen_recovery_or_technology_family:microbial_electrolysis_cell',
          ],
          decisionRelevance: 'rule_input',
        }),
      );
    }

    return {
      status: 'completed',
      model_version: INTERNAL_MODEL_VERSION,
      input_snapshot: {
        technology_family: normalizedCase.technology_family,
        architecture_family: normalizedCase.architecture_family,
        primary_objective: normalizedCase.primary_objective,
        operating_conditions: {
          temperature_c: currentTemperature,
          pH: currentPh,
          conductivity_ms_per_cm: conductivity,
        },
        measured_metrics: normalizedCase.measured_metrics,
      },
      derived_observations: derivedObservations,
      series: [
        buildOperatingWindowSeries({
          currentTemperature: getNumber(
            normalizedCase.feed_and_operation.temperature_c,
          ),
          currentPh: getNumber(normalizedCase.feed_and_operation.pH),
          tempRange: targets.temperature,
          phRange: targets.ph,
          confidenceLevel,
          assumptions,
        }),
        buildSensitivitySeries({
          centerTemperature: round(currentTemperature),
          currentDensity: modeledCurrentDensity,
          tempRange: targets.temperature,
        }),
        ...buildElectrochemicalCurves({
          currentDensity: modeledCurrentDensity,
          internalResistance: modeledInternalResistance,
        }),
      ],
      assumptions,
      confidence: {
        level: confidenceLevel,
        score: round(confidenceScore),
        drivers: [
          `${typedEvidence.length} typed evidence records informed the enrichment context.`,
          measuredCurrentDensity !== null || measuredInternalResistance !== null
            ? 'Measured electrochemical metrics anchored part of the modeled response.'
            : 'No measured electrochemical anchors were available, so technology-family baselines were used.',
          normalizedCase.missing_data.length > 0
            ? `${normalizedCase.missing_data.length} missing-data flags reduced model confidence.`
            : 'No additional missing-data penalties were applied to the model confidence score.',
        ],
      },
      provenance: {
        provider: INTERNAL_MODEL_PROVIDER,
        execution_mode: 'internal_model',
        source_version: INTERNAL_MODEL_VERSION,
        generated_at: new Date().toISOString(),
        source_refs: [
          `technology_family:${normalizedCase.technology_family}`,
          `primary_objective:${normalizedCase.primary_objective}`,
        ],
        note: 'Deterministic internal proxy model executed without external scientific sidecars.',
      },
    };
  },
};

export function mapArtifactToDerivedObservations(
  artifact: SimulationEnrichment | undefined,
): DerivedObservation[] {
  return artifact?.derived_observations ?? [];
}

export function buildSimulationSummary(
  artifact: SimulationEnrichment | undefined,
): SimulationSummary | undefined {
  if (!artifact) {
    return undefined;
  }

  return {
    status: artifact.status,
    model_version: artifact.model_version,
    confidence_level: artifact.confidence.level,
    derived_observation_count: artifact.derived_observations.length,
    has_series: artifact.series.length > 0,
  };
}

export function evaluateSimulationEnrichment(input: {
  normalizedCase: NormalizedCaseInput;
  mode?: string;
  provider?: ModelProvider;
}): SimulationEnrichment {
  const mode = resolveSimulationMode(input.mode);

  if (mode === 'disabled') {
    return emptyEnrichment({
      status: 'disabled',
      note: 'Simulation enrichment was explicitly disabled for this evaluation.',
    });
  }

  const provider = input.provider ?? defaultInternalModelProvider;

  try {
    return provider.evaluate({ normalizedCase: input.normalizedCase });
  } catch (error) {
    return {
      ...emptyEnrichment({
        status: 'failed',
        note: 'Simulation enrichment failed and was isolated from the canonical decision pipeline.',
        failureDetail: {
          message: error instanceof Error ? error.message : String(error),
        },
      }),
      input_snapshot: {
        technology_family: input.normalizedCase.technology_family,
        architecture_family: input.normalizedCase.architecture_family,
        primary_objective: input.normalizedCase.primary_objective,
      },
    };
  }
}
