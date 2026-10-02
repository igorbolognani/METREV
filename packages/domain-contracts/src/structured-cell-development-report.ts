import { z } from 'zod';
import { spatialValueSchema } from './spatial-model-schema';
import {
  structuredCellInputSchema,
  STRUCTURED_CELL_LIMITS,
} from './structured-cell-schema';
import {
  compileStructuredCellEquationGraph,
  structuredCellEquationGraphSchema,
} from './structured-cell-equation-graph';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const finite = z.number().finite();
const id = z.string().min(1).max(160);
const artifact = z
  .object({
    uri: z.string().regex(/^metrev-artifact:\/\/sha256\/[a-f0-9]{64}$/),
    sha256: digest,
    bytes: z.number().int().positive(),
    format: z.literal('json'),
    media_type: z.string(),
  })
  .refine((a) => a.uri.endsWith(a.sha256), 'Artifact digest mismatch');
const summary = z.object({
  sample_count: z.number().int().positive().max(20000),
  minimum: finite,
  maximum: finite,
  mean: finite,
  integral: finite,
  integral_unit: id,
  integration_measure: z.enum(['domain_area', 'domain_volume']),
});
const field = z.object({
  field_id: id,
  unit: z.enum(['mol/m3', 'V']),
  value_type: z.literal('scalar'),
  association: z.literal('mesh_cells'),
  domain_tags: z.array(id).min(1),
  artifact: artifact.and(z.object({ dataset_path: z.literal('/values') })),
  summary,
});
const balance = z
  .object({
    balance_id: id,
    kind: id,
    scope: z.literal('global'),
    absolute_residual: finite.nonnegative(),
    unit: id,
    relative_residual: finite.nonnegative(),
    tolerance: finite.positive(),
    passed: z.boolean(),
  })
  .refine(
    (r) => r.passed === r.relative_residual <= r.tolerance,
    'Invalid balance gate',
  );
const convergence = z.object({
  solver_id: id,
  method: id,
  status: z.enum(['converged', 'not_converged']),
  residual_unit: z.literal('1'),
  absolute_tolerance: finite.positive(),
  relative_tolerance: finite.positive(),
  iterations: z.number().int().nonnegative(),
  history: z
    .array(
      z.object({
        iteration: z.number().int().nonnegative(),
        nonlinear_residual: finite.nonnegative(),
      }),
    )
    .min(1)
    .max(10001),
  termination_reason: id,
});
const circuit = z.object({
  collector_voltage_V: finite,
  anodic_current_A: finite,
  signed_electrical_power_W: finite,
  mfc_generated_power_W: finite.nullable(),
  mec_electrical_input_W: finite.nullable(),
});

/** Browser-safe projection of the admitted restricted profile, not a replacement for server validation. */
export const structuredCellRunViewSchema = z
  .object({
    id,
    evaluation_id: id.nullable(),
    model_id: z.literal('structured-cell-supporting-electrolyte-v1'),
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(2), z.literal(3)]),
    status: z.enum([
      'queued',
      'preparing_geometry',
      'meshing',
      'solving',
      'postprocessing',
      'completed',
      'failed',
      'cancelled',
    ]),
    progress: finite.min(0).max(100),
    input_sha256: digest,
    input_snapshot: structuredCellInputSchema,
    solver_version: id,
    runtime_version: id,
    failure: z.object({ code: id, message: z.string() }).nullable(),
    result: z
      .object({
        contract_version: z.literal('spatial-simulation-result-v3'),
        run_id: id,
        input_sha256: digest,
        model_id: z.literal('structured-cell-supporting-electrolyte-v1'),
        system: z.enum(['MFC', 'MEC']),
        dimension: z.union([z.literal(2), z.literal(3)]),
        produced_at: z.string().datetime({ offset: true }),
        solver_version: id,
        runtime_version: id,
        mesh: z.object({
          artifact,
          request_sha256: digest,
          dimension: z.union([z.literal(2), z.literal(3)]),
          geometry_version: id,
          mesh_quality: z.object({
            cell_count: z.number().int().positive().max(20000),
          }),
        }),
        fields: z.array(field).min(1).max(16),
        conservation_residuals: z.array(balance).min(1).max(64),
        convergence: z.array(convergence).min(1).max(16),
        cell_circuit: circuit,
        equation_graph: structuredCellEquationGraphSchema.optional(),
        warnings: z.array(
          z.object({
            code: id,
            severity: z.enum(['info', 'warning', 'error']),
            message: z.string(),
          }),
        ),
      })
      .nullable(),
  })
  .superRefine((run, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    const input = run.input_snapshot,
      result = run.result;
    if (input.dimension !== run.dimension || input.system !== run.system)
      invalid('Input identity mismatch');
    if (
      input.case_context &&
      input.case_context.evaluation_id !== run.evaluation_id
    )
      invalid('Case evaluation identity mismatch');
    if (!result) {
      if (run.status === 'completed') invalid('Completed run needs a result');
      return;
    }
    if (input.case_context && !result.equation_graph)
      invalid('Case-bound cell view requires an equation graph');
    if (
      result.run_id !== run.id ||
      result.input_sha256 !== run.input_sha256 ||
      result.dimension !== run.dimension ||
      result.system !== run.system ||
      result.solver_version !== run.solver_version ||
      result.runtime_version !== run.runtime_version ||
      result.mesh.dimension !== run.dimension
    )
      invalid('Result identity mismatch');
    if (
      result.equation_graph &&
      JSON.stringify(result.equation_graph) !==
        JSON.stringify(compileStructuredCellEquationGraph(input))
    )
      invalid('Equation graph differs from admitted input');
    if (
      new Set(result.fields.map((f) => f.field_id)).size !==
      result.fields.length
    )
      invalid('Duplicate fields');
    if (
      result.fields.some(
        (f) =>
          f.summary.sample_count > result.mesh.mesh_quality.cell_count ||
          f.summary.minimum > f.summary.mean ||
          f.summary.mean > f.summary.maximum,
      )
    )
      invalid('Invalid field summary');
    if (
      run.system === 'MFC'
        ? result.cell_circuit.mec_electrical_input_W !== null
        : result.cell_circuit.mfc_generated_power_W !== null
    )
      invalid('Circuit power kind mismatch');
    if (
      run.status === 'completed' &&
      (result.convergence.some(
        (c) =>
          c.status !== 'converged' ||
          c.history[c.history.length - 1].nonlinear_residual >
            c.absolute_tolerance,
      ) ||
        result.conservation_residuals.some((r) => !r.passed))
    )
      invalid('Completed result failed numerical gates');
  });
export type StructuredCellRunView = z.infer<typeof structuredCellRunViewSchema>;

export function buildStructuredCellDevelopmentReport(value: unknown) {
  const run = structuredCellRunViewSchema.parse(value);
  if (!run.result || !['completed', 'failed'].includes(run.status))
    throw new Error(
      'A terminal run with a retained numerical result is required',
    );
  const parameters: (z.infer<typeof spatialValueSchema> & { path: string })[] =
    [];
  function collect(value: unknown, path: string) {
    if (typeof value !== 'object' || value === null) return;
    const parameter = spatialValueSchema.safeParse(value);
    if (parameter.success) {
      parameters.push({ path, ...parameter.data });
      return;
    }
    Object.entries(value).forEach(([key, child]) =>
      collect(child, path ? `${path}.${key}` : key),
    );
  }
  collect(run.input_snapshot, 'input');
  return {
    contract_version: 'spatial-cell-development-report-v1' as const,
    decision_eligible: false as const,
    independent_validation: false as const,
    result_role:
      run.status === 'completed'
        ? 'modeled_development_result'
        : 'failed_run_diagnostics',
    run: {
      id: run.id,
      evaluation_id: run.evaluation_id,
      status: run.status,
      model_id: run.model_id,
      system: run.system,
      dimension: run.dimension,
      input_sha256: run.input_sha256,
      solver_version: run.solver_version,
      runtime_version: run.runtime_version,
      produced_at: run.result.produced_at,
    },
    geometry: {
      geometry_version: run.input_snapshot.geometry.geometry_version,
      lengths_m: run.input_snapshot.geometry.lengths_m.map((v) => v.value),
      out_of_plane_depth_m:
        run.dimension === 2
          ? run.input_snapshot.geometry.out_of_plane_depth?.value
          : null,
      cell_count: run.result.mesh.mesh_quality.cell_count,
      mesh: run.result.mesh.artifact,
      request_sha256: run.result.mesh.request_sha256,
    },
    input_snapshot: run.input_snapshot,
    case_context: run.input_snapshot.case_context ?? null,
    equation_graph: run.result.equation_graph ?? null,
    numerical_options: run.input_snapshot.numerics,
    verification_status: {
      mesh_refinement: 'not_assessed_for_this_run',
      time_refinement: 'not_applicable_steady',
      benchmark_reference: 'tests/contracts/test_spatial_cell_verification.py',
    },
    enabled_physics: [
      'steady_trace_species_diffusion_migration',
      ...new Set(
        run.input_snapshot.reactions.map((r) => `${r.law.kind}_reactions`),
      ),
      'volumetric_butler_volmer',
      'fixed_conductivity_liquid_charge',
      'electrode_solid_charge',
      run.system === 'MFC' ? 'mfc_external_load' : 'mec_applied_voltage',
    ],
    convergence: run.result.convergence,
    conservation_residuals: run.result.conservation_residuals,
    circuit: run.result.cell_circuit,
    fields: run.result.fields,
    parameter_provenance: parameters,
    equation_references: [
      ...run.input_snapshot.reactions.map((r) => r.equation_ref),
      'bioelectrochem_agent_kit/domain/ontology/structured-cell-equations.yaml',
    ],
    limitations: [...STRUCTURED_CELL_LIMITS],
    warnings: run.result.warnings,
    failure: run.failure,
  };
}
export type StructuredCellDevelopmentReport = ReturnType<
  typeof buildStructuredCellDevelopmentReport
>;

export function renderStructuredCellDevelopmentReport(
  report: StructuredCellDevelopmentReport,
): string {
  const cell = (value: unknown) => String(value).replace(/[|`<>\r\n]/g, ' ');
  const rows = (values: unknown[][]) =>
    values.map((row) => `| ${row.map(cell).join(' | ')} |`).join('\n');
  return (
    [
      '# METREV spatial cell development report',
      `Run: ${cell(report.run.id)} · ${report.run.dimension}D · ${report.run.system} · ${report.run.status}`,
      `Role: ${report.result_role}. Decision eligible: false. Independent validation: false.`,
      ...(report.case_context
        ? [
            `Case: ${cell(report.case_context.case_id)}. Evaluation: ${cell(report.case_context.evaluation_id)}. Immutable normalized case SHA-256: ${report.case_context.normalized_case_sha256}.`,
            rows([
              ['Domain', 'Case stack block'],
              ['---', '---'],
              ...report.case_context.component_domains.map((m) => [
                m.domain_tag,
                m.stack_block,
              ]),
            ]),
          ]
        : []),
      ...(report.equation_graph
        ? [
            `Fixed-profile equation assembly: ${report.equation_graph.nodes.length} nodes, ${report.equation_graph.cell_count} cells, ${report.equation_graph.algebraic_state_count} algebraic states.`,
            rows([
              ['Node', 'Equation', 'Domains', 'States and units'],
              ['---', '---', '---', '---'],
              ...report.equation_graph.nodes.map((n) => [
                n.id,
                n.equation_id,
                n.domain_tags.join(', '),
                n.states
                  .map((s) => s.id + ' [' + s.unit + '] (' + s.role + ')')
                  .join(', '),
              ]),
            ]),
          ]
        : []),
      `Produced: ${report.run.produced_at}. Solver: ${cell(report.run.solver_version)}. Runtime: ${cell(report.run.runtime_version)}.`,
      `Input SHA-256: ${report.run.input_sha256}. Mesh SHA-256: ${report.geometry.mesh.sha256}. Geometry request SHA-256: ${report.geometry.request_sha256}.`,
      `Geometry: ${cell(report.geometry.geometry_version)}; ${report.geometry.cell_count} cells; lengths ${report.geometry.lengths_m.join(' × ')} m; out-of-plane depth ${report.geometry.out_of_plane_depth_m ?? 'not applicable'} m.`,
      `Mesh refinement: ${report.verification_status.mesh_refinement}. Time refinement: ${report.verification_status.time_refinement}. Enabled physics: ${report.enabled_physics.join(', ')}.`,
      '## Numerical diagnostics',
      rows([
        ['Solver', 'Status', 'Termination', 'Final scaled residual'],
        ['---', '---', '---', '---'],
        ...report.convergence.map((c) => [
          c.solver_id,
          c.status,
          c.termination_reason,
          c.history[c.history.length - 1].nonlinear_residual,
        ]),
      ]),
      rows([
        [
          'Balance',
          'Absolute residual',
          'Unit',
          'Relative residual',
          'Tolerance',
          'Passed',
        ],
        ['---', '---', '---', '---', '---', '---'],
        ...report.conservation_residuals.map((r) => [
          r.balance_id,
          r.absolute_residual,
          r.unit,
          r.relative_residual,
          r.tolerance,
          r.passed,
        ]),
      ]),
      `Collector voltage: ${report.circuit.collector_voltage_V} V. Anodic current: ${report.circuit.anodic_current_A} A. ${report.run.system === 'MEC' ? `MEC electrical input: ${report.circuit.mec_electrical_input_W}` : `MFC signed generated output: ${report.circuit.mfc_generated_power_W}`} W.`,
      '## Field summaries and external artifacts',
      'Integrals use domain area in 2D and domain volume in 3D. Physical 2D inventory additionally requires the declared depth. Arrays remain outside this report.',
      rows([
        [
          'Field',
          'Unit',
          'Min',
          'Mean',
          'Max',
          'Integral',
          'Integral unit',
          'Samples',
          'SHA-256',
        ],
        ['---', '---', '---', '---', '---', '---', '---', '---', '---'],
        ...report.fields.map((f) => [
          f.field_id,
          f.unit,
          f.summary.minimum,
          f.summary.mean,
          f.summary.maximum,
          f.summary.integral,
          f.summary.integral_unit,
          f.summary.sample_count,
          f.artifact.sha256,
        ]),
      ]),
      '## Parameter provenance',
      rows([
        [
          'Path',
          'Value',
          'Unit',
          'Source kind',
          'Source reference',
          'Locator and conditions',
          'Uncertainty',
        ],
        ['---', '---', '---', '---', '---', '---', '---'],
        ...report.parameter_provenance.map((p) => [
          p.path,
          p.value,
          p.unit,
          p.source_kind,
          p.source_ref,
          JSON.stringify({
            source_locator: p.source_locator,
            conditions: p.conditions,
          }),
          p.uncertainty === undefined
            ? 'not supplied'
            : `${p.uncertainty} ${p.uncertainty_unit}`,
        ]),
      ]),
      '## Limits',
      ...report.limitations.map((l) => `- ${cell(l)}`),
      ...report.warnings.map((w) => `- ${cell(w.code)}: ${cell(w.message)}`),
      ...(report.failure
        ? [
            `- Failure ${cell(report.failure.code)}: ${cell(report.failure.message)}`,
          ]
        : []),
    ].join('\n\n') + '\n'
  );
}
