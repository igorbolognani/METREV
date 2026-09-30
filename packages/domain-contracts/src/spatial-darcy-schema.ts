import { z } from 'zod';

import { spatialValueSchema } from './spatial-model-schema';

const identifier = z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/);
const sourceRef = z.string().trim().min(1);

/** Restricted one-domain Darcy development setup; no bulk/porous interface is implied. */
export const spatialDarcySetupSchema = z
  .object({
    regime: z.literal('steady_darcy'),
    equation_ref: z.literal('EQ-FL-003'),
    domain_tag: identifier,
    viscosity_parameter_id: z.literal('dynamic_viscosity_pa_s'),
    permeability_parameter_id: z.literal('hydraulic_permeability_m2'),
    pressure_variable: identifier,
    velocity_variables: z.object({ x: identifier, y: identifier }).strict(),
    inlet: z
      .object({ tag: sourceRef, pressure_pa: spatialValueSchema })
      .strict(),
    outlet: z
      .object({ tag: sourceRef, pressure_pa: spatialValueSchema })
      .strict(),
  })
  .strict();

export const spatialDarcyViscositySchema = spatialValueSchema.refine(
  (value) => value.unit === 'Pa*s' && value.value > 0,
  'Dynamic viscosity must be positive and expressed in Pa*s',
);

export const spatialDarcyPermeabilitySchema = spatialValueSchema.refine(
  (value) => value.unit === 'm2' && value.value > 0,
  'Hydraulic permeability must be positive and expressed in m2',
);
