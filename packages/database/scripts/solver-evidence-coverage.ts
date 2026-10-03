/**
 * Deterministic coverage of normalized, decision-ready evidence for the
 * solver-oriented acquisition targets in master-plan item P31.
 *
 * This describes evidence availability only. It does not assess solver input
 * sufficiency, model support, numerical verification, or scientific validity.
 */

export type SolverEvidenceStatus = 'present' | 'not_captured' | 'unknown';
export type SolverEvidenceApplicability =
  | 'applicable'
  | 'not_applicable'
  | 'unknown';

export type SolverEvidenceRecord = {
  canonicalKey?: string | null;
  componentType?: string | null;
  decisionReady: boolean;
  fieldKey?: string | null;
  material?: string | null;
  metricType?: string | null;
  normalizedUnit?: string | null;
  normalizedValue?: number | null;
  operatingConditionKey?: string | null;
  systemType?: string | null;
};

type EvidenceKeyField =
  | 'canonicalKey'
  | 'componentType'
  | 'fieldKey'
  | 'material'
  | 'metricType'
  | 'operatingConditionKey'
  | 'systemType';

type EvidenceKey = `${EvidenceKeyField}:${string}`;

type KnownVariable = {
  id: string;
  label: string;
  kind: 'measurement' | 'material' | 'system_type';
  keys: readonly EvidenceKey[];
};

type TargetSpec = {
  label: string;
  applicability: {
    kind: 'system_type' | 'component_type' | 'wastewater_hydraulics';
    values: readonly string[];
  };
  variables: readonly KnownVariable[];
  unknownVariables: readonly { id: string; label: string }[];
};

const KNOWN_SYSTEM_TYPES = ['MFC', 'MEC', 'electrochemical_biosensor'] as const;

/**
 * Each listed key maps to a normalized column already selected from
 * ScientificEvidenceFact or EvidenceBenchmarkRecord. Unknown variables have
 * no normalized key in those rows and are deliberately reported as unknown.
 */
export const SOLVER_EVIDENCE_TARGETS = {
  mfc_wastewater: {
    label: 'MFC wastewater',
    applicability: { kind: 'system_type', values: ['MFC'] },
    variables: [
      {
        id: 'system_type',
        label: 'technology class',
        kind: 'system_type',
        keys: ['systemType:MFC'],
      },
      {
        id: 'influent_cod',
        label: 'influent COD',
        kind: 'measurement',
        keys: [
          'canonicalKey:cod_mg_l',
          'fieldKey:cod',
          'metricType:cod',
          'operatingConditionKey:influent_cod_mg_l',
        ],
      },
      {
        id: 'current_density',
        label: 'current density',
        kind: 'measurement',
        keys: [
          'canonicalKey:current_density_a_m2',
          'fieldKey:current_density',
          'metricType:current_density',
        ],
      },
      {
        id: 'power_density',
        label: 'power density',
        kind: 'measurement',
        keys: [
          'canonicalKey:power_density_w_m2',
          'fieldKey:power_density',
          'metricType:power_density',
        ],
      },
      {
        id: 'coulombic_efficiency',
        label: 'coulombic efficiency',
        kind: 'measurement',
        keys: [
          'canonicalKey:coulombic_efficiency_pct',
          'fieldKey:coulombic_efficiency',
          'metricType:coulombic_efficiency',
        ],
      },
      {
        id: 'ph',
        label: 'pH',
        kind: 'measurement',
        keys: ['canonicalKey:ph', 'fieldKey:ph', 'operatingConditionKey:ph'],
      },
      {
        id: 'temperature',
        label: 'temperature',
        kind: 'measurement',
        keys: [
          'canonicalKey:temperature_c',
          'fieldKey:temperature',
          'operatingConditionKey:temperature_c',
        ],
      },
      {
        id: 'conductivity',
        label: 'bulk conductivity',
        kind: 'measurement',
        keys: [
          'canonicalKey:conductivity_ms_cm',
          'fieldKey:conductivity',
          'operatingConditionKey:conductivity_ms_cm',
        ],
      },
      {
        id: 'hydraulic_retention_time',
        label: 'hydraulic retention time',
        kind: 'measurement',
        keys: [
          'canonicalKey:hydraulic_retention_time_h',
          'fieldKey:hrt',
          'metricType:hydraulic_retention_time',
          'operatingConditionKey:hydraulic_retention_time_h',
        ],
      },
    ],
    unknownVariables: [
      { id: 'geometry', label: 'reactor geometry' },
      { id: 'flow', label: 'flow rate' },
      { id: 'current', label: 'absolute current' },
      { id: 'voltage', label: 'voltage' },
      { id: 'time_series', label: 'time-resolved observations' },
      { id: 'spatial_observations', label: 'spatial observations' },
    ],
  },
  mec: {
    label: 'MEC wastewater',
    applicability: { kind: 'system_type', values: ['MEC'] },
    variables: [
      {
        id: 'system_type',
        label: 'technology class',
        kind: 'system_type',
        keys: ['systemType:MEC'],
      },
      {
        id: 'influent_cod',
        label: 'influent COD',
        kind: 'measurement',
        keys: [
          'canonicalKey:cod_mg_l',
          'fieldKey:cod',
          'metricType:cod',
          'operatingConditionKey:influent_cod_mg_l',
        ],
      },
      {
        id: 'current_density',
        label: 'current density',
        kind: 'measurement',
        keys: [
          'canonicalKey:current_density_a_m2',
          'fieldKey:current_density',
          'metricType:current_density',
        ],
      },
      {
        id: 'hydrogen_production',
        label: 'hydrogen production',
        kind: 'measurement',
        keys: [
          'canonicalKey:hydrogen_production_ml_l_d',
          'fieldKey:hydrogen_production',
          'metricType:hydrogen_production',
        ],
      },
      {
        id: 'ph',
        label: 'pH',
        kind: 'measurement',
        keys: ['canonicalKey:ph', 'fieldKey:ph', 'operatingConditionKey:ph'],
      },
      {
        id: 'temperature',
        label: 'temperature',
        kind: 'measurement',
        keys: [
          'canonicalKey:temperature_c',
          'fieldKey:temperature',
          'operatingConditionKey:temperature_c',
        ],
      },
      {
        id: 'conductivity',
        label: 'bulk conductivity',
        kind: 'measurement',
        keys: [
          'canonicalKey:conductivity_ms_cm',
          'fieldKey:conductivity',
          'operatingConditionKey:conductivity_ms_cm',
        ],
      },
      {
        id: 'hydraulic_retention_time',
        label: 'hydraulic retention time',
        kind: 'measurement',
        keys: [
          'canonicalKey:hydraulic_retention_time_h',
          'fieldKey:hrt',
          'metricType:hydraulic_retention_time',
          'operatingConditionKey:hydraulic_retention_time_h',
        ],
      },
    ],
    unknownVariables: [
      { id: 'applied_voltage', label: 'applied voltage' },
      {
        id: 'gross_vs_captured_hydrogen',
        label: 'gross/captured hydrogen split',
      },
      { id: 'time_series', label: 'time-resolved observations' },
    ],
  },
  anode: {
    label: 'porous anode',
    applicability: { kind: 'component_type', values: ['anode'] },
    variables: [
      {
        id: 'anode_material',
        label: 'anode material',
        kind: 'material',
        keys: ['fieldKey:anode_material', 'componentType:anode'],
      },
    ],
    unknownVariables: [
      { id: 'geometry', label: 'anode geometry' },
      { id: 'porosity', label: 'porosity' },
      { id: 'tortuosity', label: 'tortuosity' },
      { id: 'accessible_area', label: 'internal/accessibility area' },
      { id: 'diffusivity', label: 'diffusivity' },
    ],
  },
  membrane: {
    label: 'membrane',
    applicability: {
      kind: 'component_type',
      values: ['membrane_separator'],
    },
    variables: [
      {
        id: 'membrane_material',
        label: 'membrane/separator material',
        kind: 'material',
        keys: [
          'fieldKey:membrane_separator',
          'componentType:membrane_separator',
        ],
      },
    ],
    unknownVariables: [
      { id: 'species', label: 'transported species' },
      { id: 'concentrations', label: 'side-specific concentrations' },
      { id: 'ionic_flux', label: 'ionic flux' },
      { id: 'conductivity', label: 'membrane conductivity' },
      { id: 'selectivity', label: 'selectivity' },
      { id: 'voltage_drop', label: 'membrane voltage drop' },
    ],
  },
  cathode: {
    label: 'cathode',
    applicability: { kind: 'component_type', values: ['cathode'] },
    variables: [
      {
        id: 'cathode_material',
        label: 'cathode material',
        kind: 'material',
        keys: ['fieldKey:cathode_material', 'componentType:cathode'],
      },
    ],
    unknownVariables: [
      { id: 'polarization', label: 'cathode polarization' },
      { id: 'oxygen_transfer', label: 'oxygen transfer' },
      { id: 'hydrogen_evolution', label: 'hydrogen evolution reaction' },
      { id: 'gas', label: 'gas observations' },
    ],
  },
  biofilm: {
    label: 'biofilm',
    applicability: { kind: 'component_type', values: ['biofilm'] },
    variables: [],
    unknownVariables: [
      { id: 'thickness', label: 'biofilm thickness' },
      { id: 'profiles', label: 'biofilm spatial profiles' },
      { id: 'growth', label: 'biofilm growth' },
      { id: 'spatial_ph', label: 'spatial pH' },
    ],
  },
  hydraulics: {
    label: 'hydraulics',
    applicability: {
      kind: 'wastewater_hydraulics',
      values: ['MFC', 'MEC'],
    },
    variables: [
      {
        id: 'hydraulic_retention_time',
        label: 'hydraulic retention time',
        kind: 'measurement',
        keys: [
          'canonicalKey:hydraulic_retention_time_h',
          'fieldKey:hrt',
          'metricType:hydraulic_retention_time',
          'operatingConditionKey:hydraulic_retention_time_h',
        ],
      },
    ],
    unknownVariables: [
      { id: 'velocity', label: 'fluid velocity' },
      {
        id: 'residence_time_distribution',
        label: 'residence-time distribution',
      },
      { id: 'pressure', label: 'pressure' },
      { id: 'flow', label: 'flow rate' },
    ],
  },
} as const satisfies Record<string, TargetSpec>;

export type SolverEvidenceTargetId = keyof typeof SOLVER_EVIDENCE_TARGETS;

export type SolverVariableCoverage = {
  id: string;
  label: string;
  status: SolverEvidenceStatus;
  normalized_keys: string[];
  supporting_record_count: number;
  complete_normalized_value_count: number;
};

export type SolverUnknownVariableCoverage = {
  id: string;
  label: string;
  status: 'unknown';
  normalized_keys: string[];
};

export type SolverEvidenceGroupCoverage = {
  applicability: SolverEvidenceApplicability;
  label: string;
  variables: SolverVariableCoverage[];
  present_variables: string[];
  not_captured_variables: string[];
  unknown_variables: SolverUnknownVariableCoverage[];
  note: string;
};

export type SolverEvidenceCoverage = {
  scope: string;
  targets: Record<SolverEvidenceTargetId, SolverEvidenceGroupCoverage>;
};

function normalized(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function evidenceKeyMatches(record: SolverEvidenceRecord, key: EvidenceKey) {
  const separator = key.indexOf(':');
  const field = key.slice(0, separator) as EvidenceKeyField;
  const expected = normalized(key.slice(separator + 1));
  return normalized(record[field]) === expected;
}

function recordHasExplicitTechnology(
  records: readonly SolverEvidenceRecord[],
  systemType: string,
) {
  return records.some(
    (record) => normalized(record.systemType) === normalized(systemType),
  );
}

function recordHasComponent(
  records: readonly SolverEvidenceRecord[],
  componentType: string,
) {
  return records.some(
    (record) =>
      normalized(record.componentType) === normalized(componentType) ||
      (componentType === 'anode' &&
        normalized(record.fieldKey) === 'anode_material') ||
      (componentType === 'cathode' &&
        normalized(record.fieldKey) === 'cathode_material') ||
      (componentType === 'membrane_separator' &&
        normalized(record.fieldKey) === 'membrane_separator'),
  );
}

function assessApplicability(
  target: TargetSpec,
  records: readonly SolverEvidenceRecord[],
): SolverEvidenceApplicability {
  if (target.applicability.kind === 'system_type') {
    if (recordHasExplicitTechnology(records, target.applicability.values[0]!)) {
      return 'applicable';
    }
    const hasOtherTechnology = records.some((record) =>
      KNOWN_SYSTEM_TYPES.some(
        (systemType) =>
          normalized(record.systemType) === normalized(systemType),
      ),
    );
    return hasOtherTechnology ? 'not_applicable' : 'unknown';
  }

  if (target.applicability.kind === 'component_type') {
    return recordHasComponent(records, target.applicability.values[0]!)
      ? 'applicable'
      : 'unknown';
  }

  if (
    target.applicability.values.some((systemType) =>
      recordHasExplicitTechnology(records, systemType),
    ) ||
    records.some((record) =>
      target.variables.some((variable) =>
        variable.keys.some((key) => evidenceKeyMatches(record, key)),
      ),
    )
  ) {
    return 'applicable';
  }

  if (
    records.some(
      (record) =>
        normalized(record.systemType) ===
        normalized('electrochemical_biosensor'),
    )
  ) {
    return 'not_applicable';
  }
  return 'unknown';
}

function recordsInTargetScope(
  targetId: SolverEvidenceTargetId,
  applicability: SolverEvidenceApplicability,
  records: readonly SolverEvidenceRecord[],
) {
  if (applicability === 'not_applicable') {
    return [];
  }

  if (applicability === 'unknown') {
    return records;
  }

  const target = SOLVER_EVIDENCE_TARGETS[targetId];
  if (target.applicability.kind === 'system_type') {
    const systemType = target.applicability.values[0]!;
    return records.filter(
      (record) => normalized(record.systemType) === normalized(systemType),
    );
  }
  if (target.applicability.kind === 'component_type') {
    const componentType = target.applicability.values[0]!;
    return records.filter(
      (record) =>
        normalized(record.componentType) === normalized(componentType) ||
        (componentType === 'anode' &&
          normalized(record.fieldKey) === 'anode_material') ||
        (componentType === 'cathode' &&
          normalized(record.fieldKey) === 'cathode_material') ||
        (componentType === 'membrane_separator' &&
          normalized(record.fieldKey) === 'membrane_separator'),
    );
  }

  return records.filter((record) => {
    const systemType = normalized(record.systemType);
    return !systemType || ['mfc', 'mec'].includes(systemType);
  });
}

function hasCompleteNormalizedValue(
  record: SolverEvidenceRecord,
  variable: KnownVariable,
) {
  if (variable.kind === 'measurement') {
    return (
      typeof record.normalizedValue === 'number' &&
      Number.isFinite(record.normalizedValue) &&
      Boolean(record.normalizedUnit?.trim())
    );
  }
  if (variable.kind === 'material') {
    return Boolean(record.material?.trim());
  }
  return Boolean(record.systemType?.trim());
}

function assessVariable(
  variable: KnownVariable,
  records: readonly SolverEvidenceRecord[],
  applicability: SolverEvidenceApplicability,
): SolverVariableCoverage {
  const matches = records.filter((record) =>
    variable.keys.some((key) => evidenceKeyMatches(record, key)),
  );
  const normalizedKeys = [
    ...new Set(
      matches.flatMap((record) =>
        variable.keys.filter((key) => evidenceKeyMatches(record, key)),
      ),
    ),
  ].sort();
  const completeMatches = matches.filter((record) =>
    hasCompleteNormalizedValue(record, variable),
  );
  const status: SolverEvidenceStatus =
    applicability !== 'applicable'
      ? 'unknown'
      : completeMatches.length > 0
        ? 'present'
        : matches.length > 0
          ? 'unknown'
          : 'not_captured';

  return {
    id: variable.id,
    label: variable.label,
    status,
    normalized_keys: normalizedKeys,
    supporting_record_count: matches.length,
    complete_normalized_value_count: completeMatches.length,
  };
}

function makeUnknownVariable(variable: { id: string; label: string }) {
  return {
    id: variable.id,
    label: variable.label,
    status: 'unknown' as const,
    normalized_keys: [],
  };
}

export function assessSolverEvidenceCoverage(input: {
  canonicalFacts: readonly SolverEvidenceRecord[];
  benchmarkRecords: readonly SolverEvidenceRecord[];
}): SolverEvidenceCoverage {
  const records = [...input.canonicalFacts, ...input.benchmarkRecords].filter(
    (record) => record.decisionReady,
  );
  const targets = Object.fromEntries(
    Object.entries(SOLVER_EVIDENCE_TARGETS).map(([targetId, target]) => {
      const id = targetId as SolverEvidenceTargetId;
      const applicability = assessApplicability(target, records);
      const inScope = recordsInTargetScope(id, applicability, records);
      const variables = target.variables.map((variable) =>
        assessVariable(variable, inScope, applicability),
      );
      const unknownVariables = target.unknownVariables.map(makeUnknownVariable);
      return [
        id,
        {
          applicability,
          label: target.label,
          variables,
          present_variables: variables
            .filter((variable) => variable.status === 'present')
            .map((variable) => variable.id),
          not_captured_variables: variables
            .filter((variable) => variable.status === 'not_captured')
            .map((variable) => variable.id),
          unknown_variables: [
            ...variables
              .filter((variable) => variable.status === 'unknown')
              .map((variable) => ({
                id: variable.id,
                label: variable.label,
                status: 'unknown' as const,
                normalized_keys: variable.normalized_keys,
              })),
            ...unknownVariables,
          ],
          note: 'Coverage uses only decision-ready normalized scientific facts and benchmark rows attached to this accepted catalog record. Not captured means an applicable target has no matching normalized key; it does not mean the variable is absent from the source. Unknown means the normalized key is unmapped or the matching fact lacks a complete normalized value and unit. This is not solver validation or an input-sufficiency decision.',
        } satisfies SolverEvidenceGroupCoverage,
      ];
    }),
  ) as Record<SolverEvidenceTargetId, SolverEvidenceGroupCoverage>;

  return {
    scope:
      'Decision-ready normalized evidence coverage for accepted catalog records; title, summary, abstract, tags, and free text are not used to infer variable presence. Not captured does not imply absent from the source or that the solver can or cannot use the value.',
    targets,
  };
}

export function summarizeSolverEvidenceCoverage(
  coverages: readonly SolverEvidenceCoverage[],
) {
  return Object.fromEntries(
    Object.keys(SOLVER_EVIDENCE_TARGETS).map((targetId) => {
      const id = targetId as SolverEvidenceTargetId;
      const groups = coverages.map((coverage) => coverage.targets[id]);
      const variables = SOLVER_EVIDENCE_TARGETS[id].variables.map(
        (variable) => ({
          id: variable.id,
          present_record_count: groups.filter((group) =>
            group.present_variables.includes(variable.id),
          ).length,
          not_captured_record_count: groups.filter((group) =>
            group.not_captured_variables.includes(variable.id),
          ).length,
          unknown_record_count: groups.filter((group) =>
            group.unknown_variables.some((entry) => entry.id === variable.id),
          ).length,
        }),
      );

      return [
        id,
        {
          applicable_record_count: groups.filter(
            (group) => group.applicability === 'applicable',
          ).length,
          not_applicable_record_count: groups.filter(
            (group) => group.applicability === 'not_applicable',
          ).length,
          unknown_applicability_record_count: groups.filter(
            (group) => group.applicability === 'unknown',
          ).length,
          variables,
          unknown_variable_ids: SOLVER_EVIDENCE_TARGETS[
            id
          ].unknownVariables.map((variable) => variable.id),
        },
      ];
    }),
  );
}
