import { z } from 'zod';

import { spatialValueSchema } from './spatial-model-schema';

const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const sourceRef = z.string().trim().min(1);

/** Shared metadata for the explicitly restricted planar Stokes setup. */
export const spatialStokesSetupSchema = z
  .object({
    regime: z.literal('steady_stokes'),
    equation_ref: z.literal('EQ-FL-002'),
    domain_tag: identifier,
    viscosity_parameter_id: z.literal('dynamic_viscosity_pa_s'),
    pressure_variable: identifier,
    velocity_variables: z.object({ x: identifier, y: identifier }).strict(),
    wall_tags: z.tuple([sourceRef, sourceRef]),
    inlet: z
      .object({
        tag: sourceRef,
        traction_pa: z.tuple([spatialValueSchema, spatialValueSchema]),
      })
      .strict(),
    outlet: z
      .object({
        tag: sourceRef,
        traction_pa: z.tuple([spatialValueSchema, spatialValueSchema]),
      })
      .strict(),
  })
  .strict();

export const spatialStokesViscositySchema = spatialValueSchema.refine(
  (value) => value.unit === 'Pa*s' && value.value > 0,
  'Dynamic viscosity must be positive and expressed in Pa*s',
);

export const spatialStokesTractionSchema = z
  .tuple([spatialValueSchema, spatialValueSchema])
  .refine((values) => values.every((value) => value.unit === 'Pa'));
