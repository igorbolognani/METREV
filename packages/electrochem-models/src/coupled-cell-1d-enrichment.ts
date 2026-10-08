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
  const sampledCells = result.anode.cells.filter(
    (_, index, cells) =>
      index % Math.max(1, Math.ceil((cells.length - 1) / 199)) === 0 ||
      index === cells.length - 1,
  );
  const points = sampledCells.map((entry) => ({
    x: entry.xCenterM,
    y: entry.substrateConcentrationMolM3,
    meta: { domain: 'anode', component: 'porous_anode' },
  }));
  const reactionRatePoints = sampledCells.map((entry) => ({
    x: entry.xCenterM,
    y: entry.reactionMolM3S,
    meta: {
      domain: 'anode',
      component: 'porous_anode',
      quantity: 'substrate_reaction_rate',
    },
  }));
  const observations: DerivedObservation[] = [
    modeled('cell_current_a', 'Cell current', result.currentA, 'A'),
    modeled(
      'anode_substrate_consumption_mol_s',
      'Anode substrate consumption rate',
      result.anode.substrateConsumptionMolS,
      'mol/s',
    ),
    modeled(
      'anode_substrate_reaction_rate_mol_m3_s',
      'Mean volumetric anode substrate reaction rate',
      result.anode.cells.length
        ? result.anode.cells.reduce(
            (sum, cell) => sum + cell.reactionMolM3S,
            0,
          ) / result.anode.cells.length
        : 0,
      'mol/(m3 s)',
    ),
    modeled(
      'anode_faradaic_current_a',
      'Anode Faradaic current from substrate reaction',
      result.anode.faradaicCurrentA,
      'A',
    ),
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

  const donnan = result.membrane.uniformDonnan;
  const membraneSeries: SimulationEnrichment['series'] = [];
  if (donnan) {
    observations.push(
      modeled(
        'membrane_resistance_ohm',
        'Resolved membrane ionic resistance',
        donnan.membraneResistanceOhm,
        'ohm',
      ),
      modeled(
        'membrane_voltage_drop_v',
        'Membrane transport voltage drop',
        result.membraneVoltageDropV,
        'V',
      ),
      modeled(
        'membrane_fixed_charge_mol_m3',
        'Declared fixed charge per pore-liquid volume',
        donnan.fixedChargeDensityMolM3,
        'mol/m3',
      ),
      modeled(
        'membrane_left_donnan_jump_v',
        'Left membrane minus solution Donnan potential',
        donnan.leftMembraneMinusSolutionPotentialV,
        'V',
      ),
      modeled(
        'membrane_right_donnan_jump_v',
        'Right membrane minus solution Donnan potential',
        donnan.rightMembraneMinusSolutionPotentialV,
        'V',
      ),
      modeled(
        'membrane_volume_charge_residual_mol_m3',
        'Maximum membrane-volume electroneutrality residual',
        donnan.maximumVolumeChargeResidualMolM3,
        'mol/m3',
      ),
    );
    // Index-based keys avoid using scientific species names as unsafe identifiers.
    for (const [index, ion] of result.membrane.species.entries()) {
      const equilibrium = donnan.species[index];
      const prefix = `membrane_ion_${index}`;
      observations.push(
        modeled(
          `${prefix}_flux_mol_m2_s`,
          `${ion.name}: signed left-to-right ionic flux`,
          ion.fluxMolM2S,
          'mol/(m2 s)',
        ),
        modeled(
          `${prefix}_current_a`,
          `${ion.name}: ionic current contribution`,
          ion.currentA,
          'A',
        ),
        modeled(
          `${prefix}_current_fraction`,
          `${ion.name}: modeled current fraction`,
          equilibrium.currentFraction,
          '1',
        ),
        modeled(
          `${prefix}_equilibrium_concentration_mol_m3`,
          `${ion.name}: predicted membrane equilibrium concentration`,
          equilibrium.equilibriumMembraneConcentrationMolM3,
          'mol/m3',
        ),
      );
      membraneSeries.push({
        series_id: `development-1d:${prefix}-concentration`,
        title: `${ion.name}: membrane concentration (uniform Donnan 1D)`,
        series_type: 'trend_line',
        x_axis: { key: 'x_m', label: 'Membrane depth', unit: 'm' },
        y_axis: {
          key: 'ion_concentration_mol_m3',
          label: 'Modeled membrane concentration',
          unit: 'mol/m3',
        },
        points: result.membrane.xNodesM.flatMap((x, node, nodes) =>
          node % Math.max(1, Math.ceil((nodes.length - 1) / 199)) === 0 ||
          node === nodes.length - 1
            ? [
                {
                  x,
                  y: ion.concentrationMolM3[node],
                  meta: {
                    domain: 'membrane',
                    species: ion.name,
                    quantity: 'modeled_concentration',
                  },
                },
              ]
            : [],
        ),
        source_kind: 'modeled',
        provenance_note:
          'Uniform ideal binary Donnan solution, no experimental observations; fixed charge and partitions retained in cell_1d input.',
      });
    }
    membraneSeries.push({
      series_id: 'development-1d:membrane-potential',
      title: 'Membrane potential (uniform Donnan 1D)',
      series_type: 'trend_line',
      x_axis: { key: 'x_m', label: 'Membrane depth', unit: 'm' },
      y_axis: {
        key: 'potential_v',
        label: 'Membrane-side potential',
        unit: 'V',
      },
      points: result.membrane.xNodesM.flatMap((x, node, nodes) =>
        node % Math.max(1, Math.ceil((nodes.length - 1) / 199)) === 0 ||
        node === nodes.length - 1
          ? [
              {
                x,
                y: donnan.interfacePotentialV[node],
                meta: { domain: 'membrane', gauge: 'left_solution_zero' },
              },
            ]
          : [],
      ),
      source_kind: 'modeled',
      provenance_note:
        'Left solution potential is zero; both equal Donnan jumps cancel across the complete solution-to-solution boundary.',
    });
    for (const entry of observations)
      entry.assumptions = [
        'Imposed anode material potential; identical electroneutral binary solution reservoirs; uniform fixed charge and partitions; no membrane convection or concentration polarization.',
      ];
  }

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
      {
        series_id: 'development-1d:anode-reaction-rate',
        title: 'Anode substrate reaction rate (steady 1D)',
        series_type: 'trend_line',
        x_axis: { key: 'x_m', label: 'Anode depth', unit: 'm' },
        y_axis: {
          key: 'reaction_rate_mol_m3_s',
          label: 'Substrate reaction rate',
          unit: 'mol/(m3 s)',
        },
        points: reactionRatePoints,
        source_kind: 'modeled',
        provenance_note:
          'Local porous-anode reaction rates sampled from the steady 1D solver cells.',
      },
      ...membraneSeries,
    ],
    assumptions: [
      'Steady planar 1D cell with imposed anode material potential.',
      donnan
        ? 'Uniform fixed-charge ideal binary Donnan membrane with identical electroneutral solution reservoirs and common pore-factor diffusivity fields; no concentration polarization or water transport.'
        : 'Binary electroneutral membrane with equal interface concentrations and diffusivities.',
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
