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
import { structuredCellTopology } from './structured-cell-topology';
import { structuredCellFieldObservablesSchema } from './structured-cell-observables';
import {
  structuredCellFieldReductionSchema,
  assertStructuredCellFieldReductionBinding,
} from './structured-cell-field-reduction';
import { structuredCellMeshRefinementEvidenceSchema } from './structured-cell-refinement-evidence';

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
  unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
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
        fields: z.array(field).min(1).max(32),
        structured_cell_field_observables:
          structuredCellFieldObservablesSchema.optional(),
        structured_cell_field_reduction:
          structuredCellFieldReductionSchema.optional(),
        structured_cell_mesh_refinement_evidence:
          structuredCellMeshRefinementEvidenceSchema.optional(),
        conservation_residuals: z.array(balance).min(1).max(64),
        convergence: z.array(convergence).min(1).max(32),
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
    const observables = result.structured_cell_field_observables;
    if (result.structured_cell_field_reduction) {
      try {
        assertStructuredCellFieldReductionBinding(
          result.structured_cell_field_reduction,
          result,
          input,
        );
      } catch (error) {
        invalid(
          error instanceof Error
            ? error.message
            : 'Invalid field reduction binding',
        );
      }
    }
    if (
      result.structured_cell_mesh_refinement_evidence &&
      result.structured_cell_mesh_refinement_evidence.current_run_id !== run.id
    )
      invalid('Mesh-refinement evidence identifies a different run');
    if (observables) {
      const mesh = structuredCellTopology(input);
      const byId = new Map(result.fields.map((f) => [f.field_id, f]));
      const close = (actual: number, expected: number) =>
        Math.abs(actual - expected) <=
        1e-12 * Math.max(Math.abs(actual), Math.abs(expected), 1e-30);
      if (
        observables.input_sha256 !== result.input_sha256 ||
        observables.mesh_sha256 !== result.mesh.artifact.sha256 ||
        observables.geometry_request_sha256 !== result.mesh.request_sha256 ||
        observables.fields.length !== result.fields.length ||
        observables.fields.some((entry) => {
          const f = byId.get(entry.field_id);
          return (
            !f ||
            entry.field_artifact_sha256 !== f.artifact.sha256 ||
            entry.dataset_path !== f.artifact.dataset_path ||
            entry.association !== f.association ||
            entry.unit !== f.unit ||
            entry.minimum.value !== f.summary.minimum ||
            entry.maximum.value !== f.summary.maximum
          );
        })
      )
        invalid('Derived extrema differ from the persisted field/run identity');
      for (const entry of observables.fields)
        for (const statistic of ['minimum', 'maximum'] as const) {
          const point = entry[statistic];
          const expectedCenter = mesh.centers_m[point.cell_index];
          const expectedSize = mesh.sizes_m[point.cell_index];
          const expectedRegion = mesh.region_index[point.cell_index];
          if (
            point.cell_index >= mesh.centers_m.length ||
            point.region_index !== expectedRegion ||
            point.domain_tag !== input.geometry.layers[expectedRegion]?.tag ||
            !byId
              .get(entry.field_id)
              ?.domain_tags.includes(
                input.geometry.layers[point.region_index]?.tag,
              ) ||
            point.cell_center_m.length !== input.dimension ||
            point.cell_size_m.length !== input.dimension ||
            point.cell_center_m.some(
              (value, axis) => !close(value, expectedCenter[axis]),
            ) ||
            point.cell_size_m.some(
              (value, axis) => !close(value, expectedSize[axis]),
            )
          )
            invalid(
              'Derived extremum position differs from the admitted cell mesh',
            );
        }
    }
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
      mesh_refinement:
        run.result.structured_cell_mesh_refinement_evidence?.status ??
        'unavailable',
      mesh_refinement_unavailable_reason:
        run.result.structured_cell_mesh_refinement_evidence
          ?.unavailable_reason ?? 'evidence_record_not_persisted',
      time_refinement: 'not_applicable_steady',
      benchmark_reference: 'tests/contracts/test_spatial_cell_verification.py',
    },
    enabled_physics: [
      'steady_trace_species_diffusion_migration',
      ...('advection' in run.input_snapshot && run.input_snapshot.advection
        ? ['prescribed_incompressible_upwind_species_advection']
        : []),
      ...('hydraulics' in run.input_snapshot && run.input_snapshot.hydraulics
        ? [
            'steady_heterogeneous_porous_darcy',
            'darcy_upwind_species_advection',
          ]
        : []),
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
    field_extrema: run.result.structured_cell_field_observables ?? null,
    modeled_field_observations:
      run.result.structured_cell_field_reduction ?? null,
    mesh_refinement_evidence:
      run.result.structured_cell_mesh_refinement_evidence ?? null,
    disabled_physics: [
      ...('hydraulics' in run.input_snapshot && run.input_snapshot.hydraulics
        ? []
        : ['hydraulic_pressure_solve']),
      'free_flow_stokes',
      'gas_multiphase_transport',
      'thermal_field',
      'coupled_proton_speciation',
      'biofilm_growth',
      'donnan_equilibrium',
      'double_layer',
    ],
    spatial_image_slice_artifacts: [] as {
      uri: string;
      sha256: string;
      role: 'image' | 'slice';
    }[],
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
      `Mesh refinement: ${report.verification_status.mesh_refinement}${report.verification_status.mesh_refinement_unavailable_reason ? ` (${report.verification_status.mesh_refinement_unavailable_reason})` : ''}. Time refinement: ${report.verification_status.time_refinement}. Enabled physics: ${report.enabled_physics.join(', ')}.`,
      '## Mesh-refinement evidence',
      ...(report.mesh_refinement_evidence
        ? report.mesh_refinement_evidence.status === 'assessed'
          ? [
              'This is mathematical software verification. Error values are differences to the finest computed solution, not exact or empirical errors.',
              `Compared runs: ${report.mesh_refinement_evidence.compared_run_ids.join(', ')}. Characteristic refinement ratio: ${report.mesh_refinement_evidence.refinement_ratio}.`,
              rows([
                [
                  'Observable',
                  'Unit',
                  'Coarse error',
                  'Medium error',
                  'Medium relative error',
                  'Observed order',
                  'Order unavailable reason',
                ],
                ['---', '---', '---', '---', '---', '---', '---'],
                ...report.mesh_refinement_evidence.observables.map(
                  (observable) => [
                    observable.observable_id,
                    observable.unit,
                    observable.estimated_discretization_error.coarse_absolute,
                    observable.estimated_discretization_error.medium_absolute,
                    observable.estimated_discretization_error.medium_relative,
                    observable.observed_order,
                    observable.observed_order_unavailable_reason,
                  ],
                ),
              ]),
            ]
          : [
              `Unavailable: ${report.mesh_refinement_evidence.unavailable_reason}. Compared runs: ${report.mesh_refinement_evidence.compared_run_ids.join(', ') || 'none'}.`,
            ]
        : ['Unavailable: evidence_record_not_persisted.']),
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
      '## Deterministic modeled field extrema',
      ...(report.field_extrema
        ? [
            'These descriptive extrema are selected from modeled field artifacts by value, with ties assigned to the lowest global mesh-cell index. Positions identify finite-volume cell centers and are linked to the immutable input, geometry request, mesh, and field digests. They are not hotspot classifications and are not decision eligible.',
            `Input SHA-256: ${report.field_extrema.input_sha256}. Geometry request SHA-256: ${report.field_extrema.geometry_request_sha256}. Mesh SHA-256: ${report.field_extrema.mesh_sha256}.`,
            rows([
              [
                'Field',
                'Statistic',
                'Value',
                'Unit',
                'Global cell index (zero-based)',
                'Center (m)',
                'Cell size (m)',
                'Region index',
                'Domain',
                'Field SHA-256',
              ],
              [
                '---',
                '---',
                '---',
                '---',
                '---',
                '---',
                '---',
                '---',
                '---',
                '---',
              ],
              ...report.field_extrema.fields.flatMap((entry) =>
                (['minimum', 'maximum'] as const).map((statistic) => {
                  const point = entry[statistic];
                  return [
                    entry.field_id,
                    statistic,
                    point.value,
                    point.unit,
                    point.cell_index,
                    point.cell_center_m.join(', '),
                    point.cell_size_m.join(', '),
                    point.region_index,
                    point.domain_tag,
                    entry.field_artifact_sha256,
                  ];
                }),
              ),
            ]),
          ]
        : ['No field extrema were persisted for this run.']),
      '## Physical volume weighted modeled observations',
      ...(report.modeled_field_observations
        ? [
            `Role: ${report.modeled_field_observations.result_role}. Decision eligible: false. Independent validation: false. Weighting uses physical cell volumes, including the sourced out-of-plane depth in 2D. Current density is a volumetric Faradaic source in A/m3; it is not a surface current density. Current RMS uniformity is abs(weighted mean)/weighted RMS; a zero field has no defined uniformity.`,
            rows([
              [
                'Field',
                'Domain',
                'Weighted mean',
                'Weighted standard deviation',
                'Physical integral',
                'Integral unit',
                'Physical volume (m3)',
                'Current RMS uniformity',
              ],
              ['---', '---', '---', '---', '---', '---', '---', '---'],
              ...report.modeled_field_observations.fields.flatMap((field) =>
                field.domains.map((domain) => [
                  field.field_id,
                  domain.domain_tag,
                  domain.statistics.volume_weighted_mean,
                  domain.statistics.volume_weighted_standard_deviation,
                  domain.statistics.physical_integral,
                  domain.statistics.physical_integral_unit,
                  domain.statistics.physical_volume_m3,
                  domain.statistics.current_rms_uniformity ?? 'not applicable',
                ]),
              ),
            ]),
            '## Electrode overpotential extrema',
            'Overpotential = modeled solid potential − modeled liquid potential − the source-backed equilibrium potential. Peak positions refer to finite-volume cells; no biological hotspot classification is implied.',
            rows([
              [
                'Electrode',
                'Minimum (V)',
                'Maximum (V)',
                'Minimum center (m)',
                'Maximum center (m)',
                'Equilibrium potential source',
              ],
              ['---', '---', '---', '---', '---', '---'],
              ...report.modeled_field_observations.electrode_overpotentials.map(
                (entry) => [
                  entry.domain_tag,
                  entry.statistics.minimum.value,
                  entry.statistics.maximum.value,
                  entry.statistics.minimum.cell_center_m.join(', '),
                  entry.statistics.maximum.cell_center_m.join(', '),
                  entry.equilibrium_potential.source_ref,
                ],
              ),
            ]),
            ...(report.modeled_field_observations.threshold_regions.length
              ? [
                  '## Explicit source-backed modeled threshold regions',
                  'Fractions use physical cell volumes. The threshold definition and provenance are supplied explicitly; these regions do not establish independent validation or decision eligibility.',
                  rows([
                    [
                      'Threshold',
                      'Field',
                      'Domain',
                      'Predicate',
                      'Threshold unit',
                      'Source',
                      'Volume fraction',
                      'Matching cells',
                      'Representative centers (m)',
                      'Omitted matching cells',
                    ],
                    [
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                      '---',
                    ],
                    ...report.modeled_field_observations.threshold_regions.map(
                      (region) => [
                        region.threshold_id,
                        region.field_id,
                        region.domain_tag ?? 'all field domains',
                        `${region.comparison} ${region.threshold.value}`,
                        region.threshold.unit,
                        region.threshold.source_ref,
                        region.volume_fraction,
                        region.matching_cells,
                        region.representative_cells
                          .map((cell) => `(${cell.cell_center_m.join(', ')})`)
                          .join('; '),
                        region.omitted_matching_cells,
                      ],
                    ),
                  ]),
                ]
              : []),
            ...(report.modeled_field_observations
              .hydraulic_boundary_pressure_differences.length
              ? [
                  '## Darcy pressure boundary differences',
                  'The imposed pressure difference is calculated from the sourced opposing boundary pressures. The solved pressure field is recorded separately at fluid cell centers; cell-center extrema do not equal boundary values.',
                  rows([
                    [
                      'Axis',
                      'Minimum face pressure (Pa)',
                      'Maximum face pressure (Pa)',
                      'Imposed pressure difference (Pa)',
                      'Sources',
                      'Pressure field SHA-256',
                    ],
                    ['---', '---', '---', '---', '---', '---'],
                    ...report.modeled_field_observations.hydraulic_boundary_pressure_differences.map(
                      (difference) => [
                        difference.axis,
                        difference.minimum_face_pressure.value,
                        difference.maximum_face_pressure.value,
                        difference.imposed_pressure_difference_Pa,
                        `${difference.minimum_face_pressure.source_ref}; ${difference.maximum_face_pressure.source_ref}`,
                        difference.pressure_field_sha256,
                      ],
                    ),
                  ]),
                ]
              : []),
            '## Observable boundaries',
            ...report.modeled_field_observations.unsupported_observables.map(
              (entry) => `- ${cell(entry.observable)}: ${cell(entry.reason)}`,
            ),
          ]
        : [
            'No verified weighted field observations were persisted for this run.',
          ]),
      `Disabled physics: ${report.disabled_physics.join(', ')}. Spatial image/slice artifacts: ${report.spatial_image_slice_artifacts.length ? report.spatial_image_slice_artifacts.map((artifact) => artifact.uri).join(', ') : 'none persisted for this run'}.`,
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
