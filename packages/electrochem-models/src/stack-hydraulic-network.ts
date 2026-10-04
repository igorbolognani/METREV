import {
  stackHydraulicNetworkInputSchema,
  type StackHydraulicNetworkInput,
} from '@metrev/domain-contracts';

function solveScaledSystem(matrix: Float64Array[], rhs: Float64Array) {
  for (let row = 0; row < matrix.length; row++) {
    const scale = Math.max(...matrix[row].map(Math.abs));
    if (!Number.isFinite(scale) || scale === 0)
      throw new RangeError('Singular hydraulic stack network');
    matrix[row] = matrix[row].map((value) => value / scale);
    rhs[row] /= scale;
  }
  for (let column = 0; column < matrix.length; column++) {
    let pivot = column;
    for (let row = column + 1; row < matrix.length; row++)
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column]))
        pivot = row;
    if (Math.abs(matrix[pivot][column]) < 1e-13)
      throw new RangeError('Ill-conditioned hydraulic stack network');
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    [rhs[column], rhs[pivot]] = [rhs[pivot], rhs[column]];
    for (let row = column + 1; row < matrix.length; row++) {
      const factor = matrix[row][column] / matrix[column][column];
      for (let entry = column; entry < matrix.length; entry++)
        matrix[row][entry] -= factor * matrix[column][entry];
      rhs[row] -= factor * rhs[column];
    }
  }
  const result = new Float64Array(matrix.length);
  for (let row = matrix.length - 1; row >= 0; row--) {
    let value = rhs[row];
    for (let column = row + 1; column < matrix.length; column++)
      value -= matrix[row][column] * result[column];
    result[row] = value / matrix[row][row];
    if (!Number.isFinite(result[row]))
      throw new RangeError('Nonfinite hydraulic stack-network solution');
  }
  return result;
}

/**
 * EQ-NET-HYD-001: steady incompressible graph reduction,
 * Q_ab=(p_a-p_b+deltaP_ab)/R_ab, with positive flow from a to b.
 */
export function solveStackHydraulicNetwork(
  candidate: StackHydraulicNetworkInput,
) {
  const input = stackHydraulicNetworkInputSchema.parse(candidate);
  const unknown = input.nodes.filter((node) => node !== input.reference_node);
  const indices = new Map(unknown.map((node, index) => [node, index]));
  const matrix = unknown.map(() => new Float64Array(unknown.length));
  const rhs = new Float64Array(unknown.length);
  for (const branch of input.branches) {
    const from = indices.get(branch.from);
    const to = indices.get(branch.to);
    const conductance = 1 / branch.hydraulic_resistance.value;
    const rise = branch.pressure_rise?.value ?? 0;
    if (from !== undefined) {
      matrix[from][from] += conductance;
      rhs[from] -= conductance * rise;
    }
    if (to !== undefined) {
      matrix[to][to] += conductance;
      rhs[to] += conductance * rise;
    }
    if (from !== undefined && to !== undefined) {
      matrix[from][to] -= conductance;
      matrix[to][from] -= conductance;
    }
  }
  const relativePressure = solveScaledSystem(matrix, rhs);
  const pressure = Object.fromEntries(
    input.nodes.map((node) => [
      node,
      input.reference_pressure.value +
        (node === input.reference_node
          ? 0
          : relativePressure[indices.get(node)!]),
    ]),
  );
  const balance = Object.fromEntries(input.nodes.map((node) => [node, 0]));
  const branches = input.branches.map((branch) => {
    const pressureRise = branch.pressure_rise?.value ?? 0;
    const flow =
      (pressure[branch.from] - pressure[branch.to] + pressureRise) /
      branch.hydraulic_resistance.value;
    balance[branch.from] += flow;
    balance[branch.to] -= flow;
    const dissipation = flow * flow * branch.hydraulic_resistance.value;
    const pumpPower = flow * pressureRise;
    if (![flow, dissipation, pumpPower].every(Number.isFinite))
      throw new RangeError('Nonfinite hydraulic branch accounting');
    return {
      id: branch.id,
      kind: branch.kind,
      flow_m3_s: flow,
      pressure_drop_Pa: pressure[branch.from] - pressure[branch.to],
      hydraulic_dissipation_W: dissipation,
      signed_pump_power_W: pumpPower,
      reverse_flow: flow < 0,
      source_refs: [
        branch.hydraulic_resistance.source_ref,
        ...(branch.pressure_rise ? [branch.pressure_rise.source_ref] : []),
        ...(branch.cell_run_ref ? [branch.cell_run_ref] : []),
      ],
    };
  });
  const pumpPower = branches.reduce(
    (sum, branch) => sum + branch.signed_pump_power_W,
    0,
  );
  const dissipation = branches.reduce(
    (sum, branch) => sum + branch.hydraulic_dissipation_W,
    0,
  );
  const massResidual = Math.max(...Object.values(balance).map(Math.abs));
  const powerResidual = Math.abs(pumpPower - dissipation);
  if (
    ![pumpPower, dissipation, massResidual, powerResidual].every(
      Number.isFinite,
    )
  )
    throw new RangeError('Nonfinite hydraulic conservation accounting');
  const flowScale = Math.max(
    ...branches.map((branch) => Math.abs(branch.flow_m3_s)),
    1e-30,
  );
  const powerScale = Math.max(Math.abs(pumpPower), dissipation, 1e-30);
  const passed =
    massResidual <= 1e-9 * flowScale && powerResidual <= 1e-9 * powerScale;
  const cellFlows = branches
    .filter((branch) => branch.kind === 'cell_channel')
    .map((branch) => Math.abs(branch.flow_m3_s));
  const meanCellFlow =
    cellFlows.reduce((sum, value) => sum + value, 0) / cellFlows.length;
  const cellFlowCv =
    meanCellFlow === 0
      ? null
      : Math.sqrt(
          cellFlows.reduce(
            (sum, value) => sum + (value - meanCellFlow) ** 2,
            0,
          ) / cellFlows.length,
        ) / meanCellFlow;
  return {
    contract_version: 'stack-hydraulic-network-result-v1',
    model_id: input.model_id,
    status: passed ? 'converged' : 'conservation_failed',
    scope: 'stack_hydraulic_network_development',
    equation_id: 'EQ-NET-HYD-001',
    flow_sign: 'positive_from_to',
    node_pressure_Pa: pressure,
    branches,
    distribution: {
      cell_channel_count: cellFlows.length,
      mean_cell_flow_m3_s: meanCellFlow,
      minimum_cell_flow_m3_s: Math.min(...cellFlows),
      maximum_cell_flow_m3_s: Math.max(...cellFlows),
      cell_flow_coefficient_of_variation: cellFlowCv,
      reverse_cell_count: branches.filter(
        (branch) => branch.kind === 'cell_channel' && branch.reverse_flow,
      ).length,
    },
    accounting: {
      signed_pump_power_W: pumpPower,
      hydraulic_dissipation_W: dissipation,
      reference_pressure_source_ref: input.reference_pressure.source_ref,
    },
    conservation: {
      node_flow_max_residual_m3_s: massResidual,
      hydraulic_power_residual_W: powerResidual,
      relative_tolerance: 1e-9,
      passed,
    },
    decision_eligible: false,
    independent_validation: false,
    unsupported_physics: [
      'nonlinear_pressure_flow_curves',
      'fluid_inertia_and_transients',
      'multiphase_gas',
      'cell_scale_cfd',
      'pump_efficiency_curve',
    ],
  };
}
