import { z } from 'zod';

import { spatialValueSchema } from './spatial-model-schema';

const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const sourceRef = z.string().trim().min(1);

export const spatialLinearSourceLossSchema = z
  .object({
    law: z.literal('constant_source_first_order_loss'),
    source_rate_mol_m3_s: spatialValueSchema.refine(
      (value) => value.unit === 'mol/(m3*s)' && value.value >= 0,
      'Scalar production requires sourced nonnegative mol/(m3*s)',
    ),
    loss_rate_per_s: spatialValueSchema.refine(
      (value) => value.unit === '1/s' && value.value >= 0,
      'First-order scalar loss requires sourced nonnegative 1/s',
    ),
  })
  .strict();

export const spatialTransportConcentrationSchema = spatialValueSchema.refine(
  (value) => value.unit === 'mol/m3' && value.value >= 0,
  'Boundary concentration must be nonnegative and expressed in mol/m3',
);

/** Shared neutral-scalar setup; the containing contract binds its hydraulic regime. */
export const spatialDarcyTransportSetupSchema = z
  .object({
    regime: z.literal('steady_advection_diffusion'),
    equation_ref: z.literal('EQ-SP-001'),
    domain_tag: identifier,
    species_id: identifier,
    concentration_variable: identifier,
    linear_source_loss: spatialLinearSourceLossSchema.optional(),
    velocity_variables: z.object({ x: identifier, y: identifier }).strict(),
    inlet: z
      .object({
        tag: sourceRef,
        concentration_mol_m3: spatialTransportConcentrationSchema,
      })
      .strict(),
    outlet: z
      .object({
        tag: sourceRef,
        concentration_mol_m3: spatialTransportConcentrationSchema,
      })
      .strict(),
  })
  .strict();

export const spatialEffectiveDiffusivitySchema = spatialValueSchema.refine(
  (value) => value.unit === 'm2/s' && value.value > 0,
  'Effective diffusivity must be positive and expressed in m2/s',
);
