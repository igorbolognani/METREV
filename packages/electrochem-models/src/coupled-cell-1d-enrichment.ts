import type {
  DerivedObservation,
  SimulationEnrichment,
} from '@metrev/domain-contracts';

import type {
  CoupledCell1dInput,
  CoupledCell1dResult,
} from './coupled-cell-1d';

export const CASE_RUNNER_1D_MODEL = 'coupled-cell-1d-restricted-v1';

function inputSourceRefs(value: unknown, refs = new Set<string>()): string[] {
  if (Array.isArray(value))
    value.forEach((entry) => inputSourceRefs(entry, refs));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === 'source_ref' && typeof item === 'string') refs.add(item);
      else inputSourceRefs(item, refs);
    }
  }
  return [...refs];
}

function modeled(
  key: string,
  label: string,
  value: number,
  unit: string,
): DerivedObservation {
  return {
    observation_id: `development-1d:${key}`,
    key,
    label,
    value,
    unit,
    source_kind: 'modeled',
    confidence_level: 'low',
    decision_relevance: 'informational',
    provenance_note:
      'Restricted steady planar 1D development output; no independent calibration or validation.',
    assumptions: [
      'Imposed anode material potential and binary electroneutral membrane boundary.',
    ],
    missing_dependencies: [],
  };
}

/** Map an actual 1D solve into the same persisted evaluation contract as 0D. */
export function coupledCell1dEnrichment(
  cell: CoupledCell1dInput,
  result: CoupledCell1dResult,
): SimulationEnrichment {
  const points = result.anode.cells
    .filter(
      (_, index, cells) =>
        index % Math.max(1, Math.ceil((cells.length - 1) / 199)) === 0 ||
        index === cells.length - 1,
    )
    .map((entry) => ({
      x: entry.xCenterM,
      y: entry.substrateConcentrationMolM3,
      meta: { domain: 'anode', component: 'porous_anode' },
    }));
  const observations: DerivedObservation[] = [
    modeled('cell_current_a', 'Cell current', result.currentA, 'A'),
    modeled('cell_voltage_v', 'Cell voltage', result.cellVoltageV, 'V'),
    modeled(
      result.system === 'MFC'
        ? 'mfc_electrical_generation_w'
        : 'mec_electrical_input_w',
      result.system === 'MFC'
        ? 'MFC generated electrical power'
        : 'MEC consumed electrical power',
      result.electricalPowerW,
      'W',
    ),
    modeled(
      'electron_balance_residual_a',
      'Electron balance residual',
      result.electronBalanceResidualA,
      'A',
    ),
    modeled(
      'ionic_charge_residual_a',
      'Ionic charge residual',
      result.ionicChargeResidualA,
      'A',
    ),
    modeled(
      'circuit_residual_v',
      'Circuit closure residual',
      result.circuitResidualV,
      'V',
    ),
    modeled(
      'anode_substrate_balance_residual_mol_s',
      'Substrate balance residual',
      result.anode.balanceResidualMolS,
      'mol/s',
    ),
  ];
  if (result.system === 'MEC')
    observations.push(
      modeled(
        'hydrogen_gross_mol_s',
        'Gross MEC hydrogen',
        result.hydrogenGrossMolS,
        'mol/s',
      ),
      modeled(
        'hydrogen_captured_mol_s',
        'Captured MEC hydrogen',
        result.hydrogenCapturedMolS,
        'mol/s',
      ),
    );

  return {
    status: 'completed',
    model_version: CASE_RUNNER_1D_MODEL,
    input_snapshot: { cell_1d: cell },
    derived_observations: observations,
    series: [
      {
        series_id: 'development-1d:anode-substrate',
        title: 'Anode substrate profile (steady 1D)',
        series_type: 'trend_line',
        x_axis: { key: 'x_m', label: 'Anode depth', unit: 'm' },
        y_axis: { key: 'substrate_mol_m3', label: 'Substrate', unit: 'mol/m3' },
        points,
        source_kind: 'modeled',
        provenance_note:
          'Sampled from the solver cell centers, at most 200 profile points.',
      },
    ],
    assumptions: [
      'Steady planar 1D cell with imposed anode material potential.',
      'Binary electroneutral membrane with equal interface concentrations and diffusivities.',
      'Development calculation only; results are excluded from decision rule inputs.',
    ],
    confidence: {
      level: 'low',
      score: 20,
      drivers: ['No matched independent full-cell calibration or validation.'],
    },
    provenance: {
      provider: 'metrev-coupled-electrochem-models',
      execution_mode: 'internal_model',
      source_version: CASE_RUNNER_1D_MODEL,
      generated_at: new Date().toISOString(),
      source_refs: [
        ...new Set([...inputSourceRefs(cell), ...result.sourceDois]),
      ],
      note: 'Restricted 1D development solver, now persisted through case evaluation.',
    },
  };
}
