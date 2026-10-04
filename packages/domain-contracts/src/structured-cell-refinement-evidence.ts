import { z } from 'zod';
import { structuredCellInputSchema } from './structured-cell-schema';
import { structuredCellFieldReductionSchema } from './structured-cell-field-reduction';
import {
  spatialRuntimeInputSha256,
  structuredCellGeometrySha256,
} from './spatial-runtime-input';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().trim().min(1).max(160);
const finite = z.number().finite();

function canonicalJsonStringify(value: unknown): string {
  const canonical = (candidate: unknown): unknown =>
    Array.isArray(candidate)
      ? candidate.map(canonical)
      : candidate && typeof candidate === 'object'
        ? Object.fromEntries(
            Object.entries(candidate)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, child]) => [key, canonical(child)]),
          )
        : candidate;
  return JSON.stringify(canonical(value));
}

const levelSchema = z
  .object({
    run_id: id,
    input_sha256: digest,
    geometry_request_sha256: digest,
    mesh_sha256: digest,
    cell_count: z.number().int().positive(),
    characteristic_cell_size: finite.positive(),
  })
  .strict();

const unavailableReasonSchema = z.enum([
  'three_completed_runs_required',
  'solver_identity_mismatch',
  'physical_input_mismatch',
  'three_distinct_meshes_required',
  'strict_cell_count_refinement_required',
  'uniform_characteristic_refinement_ratio_required',
  'common_observable_required',
]);

const base = z.object({
  contract_version: z.literal('structured-cell-mesh-refinement-evidence-v1'),
  record_kind: z.literal('numerical_mesh_refinement_evidence'),
  evidence_role: z.literal('mathematical_software_verification'),
  decision_eligible: z.literal(false),
  independent_validation: z.literal(false),
  current_run_id: id,
  algorithm: z.literal(
    'three_level_finest_solution_difference_uniform_characteristic_h_v1',
  ),
});

export const structuredCellMeshRefinementEvidenceSchema = z.discriminatedUnion(
  'status',
  [
    base
      .extend({
        status: z.literal('unavailable'),
        unavailable_reason: unavailableReasonSchema,
        compared_run_ids: z.array(id).max(3),
        levels: z.array(levelSchema).max(3),
        refinement_ratio: z.null(),
        observables: z.array(z.never()).length(0),
      })
      .strict(),
    base
      .extend({
        status: z.literal('assessed'),
        unavailable_reason: z.null(),
        compared_run_ids: z.array(id).length(3),
        levels: z.array(levelSchema).length(3),
        refinement_ratio: finite.gt(1),
        observables: z
          .array(
            z
              .object({
                observable_id: id,
                unit: id,
                values_coarse_to_fine: z.array(finite).length(3),
                estimated_discretization_error: z
                  .object({
                    reference: z.literal('finest_computed_solution'),
                    coarse_absolute: finite.nonnegative(),
                    medium_absolute: finite.nonnegative(),
                    medium_relative: finite.nonnegative().nullable(),
                  })
                  .strict(),
                observed_order: finite.nullable(),
                observed_order_unavailable_reason: z
                  .enum(['zero_successive_difference'])
                  .nullable(),
              })
              .strict()
              .superRefine((observable, context) => {
                if (
                  (observable.observed_order === null) ===
                  (observable.observed_order_unavailable_reason === null)
                )
                  context.addIssue({
                    code: 'custom',
                    message:
                      'Observed order requires either a value or one explicit unavailable reason',
                  });
              }),
          )
          .min(1)
          .max(64),
      })
      .strict(),
  ],
);

export type StructuredCellMeshRefinementEvidence = z.infer<
  typeof structuredCellMeshRefinementEvidenceSchema
>;

const candidateSchema = z
  .object({
    run_id: id,
    status: z.enum(['completed', 'failed']),
    input_sha256: digest,
    solver_version: id,
    runtime_version: id,
    input: structuredCellInputSchema,
    result: z
      .object({
        model_id: id,
        system: z.enum(['MFC', 'MEC']),
        dimension: z.union([z.literal(2), z.literal(3)]),
        coordinate_system: z.literal('cartesian'),
        input_sha256: digest,
        solver_version: id,
        runtime_version: id,
        mesh: z.object({
          artifact: z.object({ sha256: digest }),
          request_sha256: digest,
          mesh_quality: z.object({ cell_count: z.number().int().positive() }),
        }),
        convergence: z.array(z.object({ status: z.string() })).min(1),
        conservation_residuals: z
          .array(z.object({ passed: z.boolean() }))
          .min(1),
        cell_circuit: z.object({
          collector_voltage_V: finite,
          anodic_current_A: finite,
        }),
        structured_cell_field_reduction:
          structuredCellFieldReductionSchema.optional(),
      })
      .passthrough(),
  })
  .strict();

export type StructuredCellRefinementCandidate = z.input<typeof candidateSchema>;

function unavailable(
  currentRunId: string,
  reason: z.infer<typeof unavailableReasonSchema>,
  candidates: z.infer<typeof candidateSchema>[],
): StructuredCellMeshRefinementEvidence {
  return structuredCellMeshRefinementEvidenceSchema.parse({
    contract_version: 'structured-cell-mesh-refinement-evidence-v1',
    record_kind: 'numerical_mesh_refinement_evidence',
    evidence_role: 'mathematical_software_verification',
    decision_eligible: false,
    independent_validation: false,
    current_run_id: currentRunId,
    algorithm:
      'three_level_finest_solution_difference_uniform_characteristic_h_v1',
    status: 'unavailable',
    unavailable_reason: reason,
    compared_run_ids: candidates.map((candidate) => candidate.run_id),
    levels: [],
    refinement_ratio: null,
    observables: [],
  });
}

function physicalInputIdentity(
  input: z.infer<typeof structuredCellInputSchema>,
) {
  const normalized = structuredCellInputSchema.parse(input);
  return canonicalJsonStringify({
    ...normalized,
    geometry: {
      ...normalized.geometry,
      transverse_cells: normalized.geometry.transverse_cells.map(() => 1),
      layers: normalized.geometry.layers.map((layer) => ({
        ...layer,
        cells: 1,
      })),
    },
  });
}

/**
 * Derives numerical evidence only from three persisted terminal runs. The finest
 * run is a computed reference; differences are not exact or empirical errors.
 */
export function deriveStructuredCellMeshRefinementEvidence(
  currentRunId: string,
  values: unknown[],
): StructuredCellMeshRefinementEvidence {
  const candidates = values.map((value) => candidateSchema.parse(value));
  if (
    candidates.length !== 3 ||
    !candidates.some((candidate) => candidate.run_id === currentRunId) ||
    candidates.some(
      (candidate) =>
        candidate.status !== 'completed' ||
        candidate.input_sha256 !== candidate.result.input_sha256 ||
        spatialRuntimeInputSha256(candidate.input) !== candidate.input_sha256 ||
        structuredCellGeometrySha256(candidate.input) !==
          candidate.result.mesh.request_sha256 ||
        candidate.result.convergence.some(
          (entry) => entry.status !== 'converged',
        ) ||
        candidate.result.conservation_residuals.some((entry) => !entry.passed),
    )
  )
    return unavailable(
      currentRunId,
      'three_completed_runs_required',
      candidates,
    );

  const first = candidates[0];
  if (
    candidates.some(
      (candidate) =>
        candidate.solver_version !== first.solver_version ||
        candidate.runtime_version !== first.runtime_version ||
        candidate.solver_version !== candidate.result.solver_version ||
        candidate.runtime_version !== candidate.result.runtime_version ||
        candidate.result.solver_version !== first.result.solver_version ||
        candidate.result.runtime_version !== first.result.runtime_version ||
        candidate.result.model_id !== first.result.model_id ||
        candidate.result.system !== first.result.system ||
        candidate.result.dimension !== first.result.dimension ||
        candidate.result.coordinate_system !== first.result.coordinate_system,
    )
  )
    return unavailable(currentRunId, 'solver_identity_mismatch', candidates);
  if (
    candidates.some(
      (candidate) =>
        physicalInputIdentity(candidate.input) !==
        physicalInputIdentity(first.input),
    )
  )
    return unavailable(currentRunId, 'physical_input_mismatch', candidates);
  if (
    new Set(
      candidates.map((candidate) => candidate.result.mesh.artifact.sha256),
    ).size !== 3
  )
    return unavailable(
      currentRunId,
      'three_distinct_meshes_required',
      candidates,
    );

  const sorted = [...candidates].sort(
    (a, b) =>
      a.result.mesh.mesh_quality.cell_count -
        b.result.mesh.mesh_quality.cell_count ||
      a.run_id.localeCompare(b.run_id),
  );
  const counts = sorted.map(
    (candidate) => candidate.result.mesh.mesh_quality.cell_count,
  );
  if (!(counts[0] < counts[1] && counts[1] < counts[2]))
    return unavailable(
      currentRunId,
      'strict_cell_count_refinement_required',
      candidates,
    );
  const dimension = first.result.dimension;
  const sizes = counts.map((count) => count ** (-1 / dimension));
  const ratios = [sizes[0] / sizes[1], sizes[1] / sizes[2]];
  const directionalRefinementRatios = sorted.flatMap((candidate, index) =>
    index === 0
      ? []
      : [
          ...candidate.input.geometry.layers.map(
            (layer, axis) =>
              layer.cells / sorted[index - 1].input.geometry.layers[axis].cells,
          ),
          ...candidate.input.geometry.transverse_cells.map(
            (cells, axis) =>
              cells / sorted[index - 1].input.geometry.transverse_cells[axis],
          ),
        ],
  );
  if (
    ratios.some((ratio) => ratio <= 1) ||
    Math.abs(ratios[0] - ratios[1]) > 1e-10 * Math.max(ratios[0], ratios[1]) ||
    directionalRefinementRatios.some(
      (ratio) =>
        ratio <= 1 ||
        Math.abs(ratio - ratios[0]) > 1e-10 * Math.max(ratio, ratios[0]),
    )
  )
    return unavailable(
      currentRunId,
      'uniform_characteristic_refinement_ratio_required',
      candidates,
    );

  const observableMaps = sorted.map((candidate) => {
    const entries: [string, { unit: string; value: number }][] = [
      [
        'anodic_current',
        { unit: 'A', value: candidate.result.cell_circuit.anodic_current_A },
      ],
      [
        'collector_voltage',
        {
          unit: 'V',
          value: candidate.result.cell_circuit.collector_voltage_V,
        },
      ],
    ];
    for (const field of candidate.result.structured_cell_field_reduction
      ?.fields ?? [])
      entries.push([
        `${field.field_id}_volume_weighted_mean`,
        { unit: field.unit, value: field.global.volume_weighted_mean },
      ]);
    return new Map(entries);
  });
  const common = [...observableMaps[0].keys()].filter((observableId) => {
    const unit = observableMaps[0].get(observableId)?.unit;
    return observableMaps.every((map) => map.get(observableId)?.unit === unit);
  });
  if (common.length === 0)
    return unavailable(currentRunId, 'common_observable_required', candidates);

  const ratio = (ratios[0] + ratios[1]) / 2;
  const observables = common.sort().map((observableId) => {
    const values = observableMaps.map((map) => map.get(observableId)!.value);
    const coarse = Math.abs(values[0] - values[2]);
    const medium = Math.abs(values[1] - values[2]);
    const successiveCoarse = Math.abs(values[0] - values[1]);
    const successiveMedium = Math.abs(values[1] - values[2]);
    const canEstimateOrder = successiveCoarse > 0 && successiveMedium > 0;
    return {
      observable_id: observableId,
      unit: observableMaps[0].get(observableId)!.unit,
      values_coarse_to_fine: values,
      estimated_discretization_error: {
        reference: 'finest_computed_solution' as const,
        coarse_absolute: coarse,
        medium_absolute: medium,
        medium_relative: values[2] === 0 ? null : medium / Math.abs(values[2]),
      },
      observed_order: canEstimateOrder
        ? Math.log(successiveCoarse / successiveMedium) / Math.log(ratio)
        : null,
      observed_order_unavailable_reason: canEstimateOrder
        ? null
        : ('zero_successive_difference' as const),
    };
  });
  return structuredCellMeshRefinementEvidenceSchema.parse({
    contract_version: 'structured-cell-mesh-refinement-evidence-v1',
    record_kind: 'numerical_mesh_refinement_evidence',
    evidence_role: 'mathematical_software_verification',
    decision_eligible: false,
    independent_validation: false,
    current_run_id: currentRunId,
    algorithm:
      'three_level_finest_solution_difference_uniform_characteristic_h_v1',
    status: 'assessed',
    unavailable_reason: null,
    compared_run_ids: sorted.map((candidate) => candidate.run_id),
    levels: sorted.map((candidate, index) => ({
      run_id: candidate.run_id,
      input_sha256: candidate.input_sha256,
      geometry_request_sha256: candidate.result.mesh.request_sha256,
      mesh_sha256: candidate.result.mesh.artifact.sha256,
      cell_count: candidate.result.mesh.mesh_quality.cell_count,
      characteristic_cell_size: sizes[index],
    })),
    refinement_ratio: ratio,
    observables,
  });
}
