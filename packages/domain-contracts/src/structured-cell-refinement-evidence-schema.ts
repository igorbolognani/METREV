import { z } from 'zod';
import { structuredCellInputSchema } from './structured-cell-schema';
import { structuredCellFieldReductionSchema } from './structured-cell-field-reduction';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const id = z.string().trim().min(1).max(160);
const finite = z.number().finite();

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

export const structuredCellRefinementUnavailableReasonSchema = z.enum([
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
        unavailable_reason: structuredCellRefinementUnavailableReasonSchema,
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

export const structuredCellRefinementCandidateSchema = z
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

export type StructuredCellRefinementCandidate = z.input<
  typeof structuredCellRefinementCandidateSchema
>;

export type StructuredCellRefinementUnavailableReason = z.infer<
  typeof structuredCellRefinementUnavailableReasonSchema
>;
