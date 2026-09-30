import { z } from 'zod';

/** Cartesian 2D rates per unit out-of-plane depth; boundary rates are outward. */
export const spatialSpeciesBudgetSchema = z
  .object({
    concentration_variable: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    unit: z.literal('mol/(m*s)'),
    inlet_outward_rate: z.number().finite(),
    outlet_outward_rate: z.number().finite(),
    wall_outward_rate: z.number().finite(),
    production_rate: z.number().finite().nonnegative(),
    consumption_rate: z.number().finite().nonnegative(),
  })
  .strict();

export type SpatialSpeciesBudget = z.infer<typeof spatialSpeciesBudgetSchema>;

export function spatialSpeciesBudgetResidual(budget: SpatialSpeciesBudget) {
  const boundary = [
    budget.inlet_outward_rate,
    budget.outlet_outward_rate,
    budget.wall_outward_rate,
  ];
  const absolute = Math.abs(
    boundary.reduce((sum, value) => sum + value, 0) -
      budget.production_rate +
      budget.consumption_rate,
  );
  const scale =
    boundary.reduce((sum, value) => sum + Math.abs(value), 0) +
    budget.production_rate +
    budget.consumption_rate;
  return { absolute, relative: absolute / Math.max(scale, 1e-30) };
}

export function spatialSpeciesBudgetMatchesLaw(
  budget: SpatialSpeciesBudget,
  law: {
    source_rate_mol_m3_s: { value: number };
    loss_rate_per_s: { value: number };
  },
  variable: string,
  area: number,
  concentrationIntegral: number,
) {
  const equal = (a: number, b: number) =>
    Math.abs(a - b) <= 1e-8 * Math.max(Math.abs(a), Math.abs(b), 1e-30);
  return (
    budget.concentration_variable === variable &&
    equal(budget.production_rate, law.source_rate_mol_m3_s.value * area) &&
    equal(
      budget.consumption_rate,
      law.loss_rate_per_s.value * concentrationIntegral,
    )
  );
}
