import { z } from 'zod';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const finite = z.number().finite();
const identifier = z.string().trim().min(1).max(160);

export const structuredCellFieldExtremumSchema = z
  .object({
    value: finite,
    unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
    cell_index: z.number().int().nonnegative().max(19999),
    cell_center_m: z.array(finite).min(2).max(3),
    cell_size_m: z.array(z.number().finite().positive()).min(2).max(3),
    region_index: z.number().int().nonnegative().max(127),
    domain_tag: identifier,
  })
  .strict()
  .superRefine((extremum, context) => {
    if (extremum.cell_center_m.length !== extremum.cell_size_m.length)
      context.addIssue({
        code: 'custom',
        path: ['cell_size_m'],
        message: 'Cell center and size must use the same coordinate rank',
      });
  });

const structuredCellFieldObservablesEntrySchema = z
  .object({
    field_id: identifier,
    field_artifact_sha256: digest,
    dataset_path: z.literal('/values'),
    association: z.literal('mesh_cells'),
    unit: z.enum(['mol/m3', 'V', 'A/m3', 'Pa', 'm/s']),
    minimum: structuredCellFieldExtremumSchema,
    maximum: structuredCellFieldExtremumSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    for (const statistic of ['minimum', 'maximum'] as const) {
      const point = entry[statistic];
      if (point.unit !== entry.unit)
        context.addIssue({
          code: 'custom',
          path: [statistic, 'unit'],
          message: 'Extremum unit must match its field',
        });
    }
    if (entry.minimum.value > entry.maximum.value)
      context.addIssue({
        code: 'custom',
        path: ['minimum', 'value'],
        message: 'Minimum cannot exceed maximum',
      });
  });

/** Deterministic descriptions of extrema in the restricted cell's modeled fields. */
export const structuredCellFieldObservablesSchema = z
  .object({
    contract_version: z.literal('structured-cell-field-extrema-v1'),
    record_kind: z.literal('modeled_field_extremum'),
    source_kind: z.literal('modeled_field_artifact'),
    classification: z.null(),
    thresholds_applied: z.literal(false),
    decision_eligible: z.literal(false),
    independent_validation: z.literal(false),
    algorithm: z.literal('argmin_argmax_lowest_global_cell_index_v1'),
    input_sha256: digest,
    mesh_sha256: digest,
    geometry_request_sha256: digest,
    coordinate_system: z.literal('cartesian'),
    position_basis: z.literal('finite_volume_cell_center'),
    fields: z.array(structuredCellFieldObservablesEntrySchema).min(1).max(32),
  })
  .strict()
  .superRefine((observables, context) => {
    if (
      new Set(observables.fields.map((field) => field.field_id)).size !==
      observables.fields.length
    )
      context.addIssue({
        code: 'custom',
        path: ['fields'],
        message: 'Observable field IDs must be unique',
      });
  });

export type StructuredCellFieldObservables = z.infer<
  typeof structuredCellFieldObservablesSchema
>;
