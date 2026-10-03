import {
  stackNetworkInputSchema,
  type StackNetworkInput,
} from '@metrev/domain-contracts';

/** EQ-NET-001: KCL with I_ab=(V_a-V_b+E_ab)/R_ab, positive from a to b. */
export function solveLinearStackNetwork(candidate: StackNetworkInput) {
  const input = stackNetworkInputSchema.parse(candidate);
  const unknown = input.nodes.filter((n) => n !== input.reference_node);
  const indices = new Map(unknown.map((node, i) => [node, i]));
  const matrix = unknown.map(() => new Float64Array(unknown.length));
  const rhs = new Float64Array(unknown.length);
  for (const branch of input.branches) {
    const a = indices.get(branch.from),
      b = indices.get(branch.to);
    const g = 1 / branch.resistance.value,
      e = branch.emf?.value ?? 0;
    if (a !== undefined) {
      matrix[a][a] += g;
      rhs[a] -= g * e;
    }
    if (b !== undefined) {
      matrix[b][b] += g;
      rhs[b] += g * e;
    }
    if (a !== undefined && b !== undefined) {
      matrix[a][b] -= g;
      matrix[b][a] -= g;
    }
  }
  // Row scaling makes the pivot criterion independent of resistance units/magnitudes.
  for (let i = 0; i < unknown.length; i++) {
    const scale = Math.max(...matrix[i].map(Math.abs));
    if (!Number.isFinite(scale) || scale === 0)
      throw new RangeError('Singular stack network');
    matrix[i] = matrix[i].map((v) => v / scale);
    rhs[i] /= scale;
  }
  for (let k = 0; k < unknown.length; k++) {
    let pivot = k;
    for (let i = k + 1; i < unknown.length; i++)
      if (Math.abs(matrix[i][k]) > Math.abs(matrix[pivot][k])) pivot = i;
    if (Math.abs(matrix[pivot][k]) < 1e-13)
      throw new RangeError('Ill-conditioned stack network');
    [matrix[k], matrix[pivot]] = [matrix[pivot], matrix[k]];
    [rhs[k], rhs[pivot]] = [rhs[pivot], rhs[k]];
    for (let i = k + 1; i < unknown.length; i++) {
      const factor = matrix[i][k] / matrix[k][k];
      for (let j = k; j < unknown.length; j++)
        matrix[i][j] -= factor * matrix[k][j];
      rhs[i] -= factor * rhs[k];
    }
  }
  const x = new Float64Array(unknown.length);
  for (let i = unknown.length - 1; i >= 0; i--) {
    let v = rhs[i];
    for (let j = i + 1; j < unknown.length; j++) v -= matrix[i][j] * x[j];
    x[i] = v / matrix[i][i];
    if (!Number.isFinite(x[i]))
      throw new RangeError('Nonfinite stack-network solution');
  }
  const voltage = Object.fromEntries(
    input.nodes.map((n) => [
      n,
      n === input.reference_node ? 0 : x[indices.get(n)!],
    ]),
  );
  const balance = Object.fromEntries(input.nodes.map((n) => [n, 0]));
  const branches = input.branches.map((b) => {
    const current =
      (voltage[b.from] - voltage[b.to] + (b.emf?.value ?? 0)) /
      b.resistance.value;
    balance[b.from] += current;
    balance[b.to] -= current;
    const sourcePower = current * (b.emf?.value ?? 0);
    const terminalPower = current * (voltage[b.to] - voltage[b.from]);
    const jouleLoss = current * current * b.resistance.value;
    if (
      ![current, sourcePower, terminalPower, jouleLoss].every(Number.isFinite)
    )
      throw new RangeError('Nonfinite stack-network branch accounting');
    return {
      id: b.id,
      kind: b.kind,
      current_A: current,
      joule_loss_W: jouleLoss,
      signed_source_power_W: sourcePower,
      terminal_delivered_power_W: terminalPower,
      generated_power_W:
        b.kind === 'reduced_cell' && input.system === 'MFC'
          ? Math.max(terminalPower, 0)
          : 0,
      absorbed_source_power_W: Math.max(-sourcePower, 0),
      source_refs: [
        b.resistance.source_ref,
        ...(b.emf ? [b.emf.source_ref] : []),
        ...(b.cell_run_ref ? [b.cell_run_ref] : []),
      ],
    };
  });
  const sourcePower = branches.reduce((s, b) => s + b.signed_source_power_W, 0);
  const dissipation = branches.reduce((s, b) => s + b.joule_loss_W, 0);
  const kclResidual = Math.max(...Object.values(balance).map(Math.abs));
  const powerResidual = Math.abs(sourcePower - dissipation);
  if (
    ![sourcePower, dissipation, kclResidual, powerResidual].every(
      Number.isFinite,
    )
  )
    throw new RangeError('Nonfinite stack-network conservation accounting');
  const currentScale = Math.max(
    ...branches.map((b) => Math.abs(b.current_A)),
    1e-30,
  );
  const powerScale = Math.max(Math.abs(sourcePower), dissipation, 1e-30);
  const passed =
    kclResidual <= 1e-9 * currentScale && powerResidual <= 1e-9 * powerScale;
  return {
    contract_version: 'stack-network-linear-result-v1',
    model_id: input.model_id,
    system: input.system,
    status: passed ? 'converged' : 'conservation_failed',
    scope: 'stack_network_linear_development',
    equation_id: 'EQ-NET-001',
    current_sign: 'positive_from_to',
    node_potential_V: voltage,
    branches,
    accounting: {
      signed_source_power_W: sourcePower,
      joule_loss_W: dissipation,
      load_power_W: branches
        .filter((b) => b.kind === 'load')
        .reduce((s, b) => s + b.joule_loss_W, 0),
      auxiliary_demand_W: input.auxiliary_power.value,
      // Applied supplies are explicitly external input; MEC never reports generated power.
      supply_electrical_input_W: branches
        .filter((b) => b.kind === 'supply')
        .reduce((s, b) => s + Math.max(b.signed_source_power_W, 0), 0),
      mfc_generated_power_W:
        input.system === 'MFC'
          ? branches.reduce((s, b) => s + b.generated_power_W, 0)
          : null,
      auxiliary_source_ref: input.auxiliary_power.source_ref,
    },
    conservation: {
      kcl_max_residual_A: kclResidual,
      electrical_residual_W: powerResidual,
      relative_tolerance: 1e-9,
      passed,
    },
    decision_eligible: false,
    independent_validation: false,
    unsupported_physics: [
      'nonlinear_cell_polarization',
      'hydraulic_manifold',
      'transient_network',
      'gas_heat_and_biology',
    ],
  };
}
