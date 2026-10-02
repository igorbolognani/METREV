import { z } from 'zod';
import { structuredCellInputSchema } from './structured-cell-schema';
import { structuredCellCaseContextSchema } from './structured-cell-case-context';

/** Selection is retained even when a profile, dimension or input is unsupported. */
export const caseSpatialRequestSchema = z
  .object({
    model_id: z.string().trim().min(1).max(160),
    dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    required_physics: z.array(z.string().trim().min(1).max(80)).max(32),
    component_domains:
      structuredCellCaseContextSchema.shape.component_domains.optional(),
    input: structuredCellInputSchema.optional(),
  })
  .strict();
export type CaseSpatialRequest = z.infer<typeof caseSpatialRequestSchema>;

/** Bounded history projection excludes scientific input and result manifests. */
export const caseSpatialRunHistoryEntrySchema = z
  .object({
    id: z.string().min(1),
    evaluation_id: z.string().min(1).nullable(),
    model_id: z.string().min(1),
    dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
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
    progress: z.number().int().min(0).max(100),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strict();
export type CaseSpatialRunHistoryEntry = z.infer<
  typeof caseSpatialRunHistoryEntrySchema
>;
