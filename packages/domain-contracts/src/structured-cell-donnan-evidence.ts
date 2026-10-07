import { z } from 'zod';

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const finite = z.number().finite();

/** Scalar reductions of local equilibrium predictions, not bulk measurements. */
export const structuredCellDonnanSpeciesSummarySchema = z
  .object({
    species_id: z.string().min(1).max(160),
    valence: finite.int().min(-4).max(4),
    partition_coefficient: finite.positive(),
    mean_solution_concentration_mol_m3: finite.nonnegative(),
    minimum_equilibrium_membrane_concentration_mol_m3: finite.nonnegative(),
    mean_equilibrium_membrane_concentration_mol_m3: finite.nonnegative(),
    maximum_equilibrium_membrane_concentration_mol_m3: finite.nonnegative(),
    mean_effective_partition_factor: finite.positive(),
    positive_x_flux_mol_s: finite,
  })
  .strict()
  .superRefine((entry, context) => {
    if (
      entry.minimum_equilibrium_membrane_concentration_mol_m3 >
        entry.mean_equilibrium_membrane_concentration_mol_m3 ||
      entry.mean_equilibrium_membrane_concentration_mol_m3 >
        entry.maximum_equilibrium_membrane_concentration_mol_m3
    )
      context.addIssue({
        code: 'custom',
        message: 'Equilibrium membrane concentration summaries must be ordered',
      });
  });

const interfaceEvidence = z
  .object({
    interface_id: z.string().min(1).max(160),
    left_domain: z.string().min(1).max(160),
    right_domain: z.string().min(1).max(160),
    membrane_domain: z.string().min(1).max(160),
    solution_domain: z.string().min(1).max(160),
    orientation: z.enum(['membrane_right', 'membrane_left']),
    face_count: z.number().int().positive().max(4096),
    species: z
      .array(structuredCellDonnanSpeciesSummarySchema)
      .min(1)
      .max(12)
      .optional(),
    fixed_charge_density_mol_m3: finite,
    minimum_dimensionless_potential_jump: finite,
    mean_dimensionless_potential_jump: finite,
    maximum_dimensionless_potential_jump: finite,
    minimum_donnan_potential_jump_V: finite,
    mean_donnan_potential_jump_V: finite,
    maximum_donnan_potential_jump_V: finite,
    maximum_absolute_charge_residual_mol_m3: finite.nonnegative(),
    normalization_mol_m3: finite.positive(),
    relative_charge_residual: finite.nonnegative(),
    tolerance: finite.positive(),
    passed: z.boolean(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (
      entry.species &&
      new Set(entry.species.map((s) => s.species_id)).size !==
        entry.species.length
    )
      context.addIssue({
        code: 'custom',
        path: ['species'],
        message: 'Donnan species identities must be unique',
      });
    if (
      entry.minimum_dimensionless_potential_jump >
        entry.mean_dimensionless_potential_jump ||
      entry.mean_dimensionless_potential_jump >
        entry.maximum_dimensionless_potential_jump ||
      entry.minimum_donnan_potential_jump_V >
        entry.mean_donnan_potential_jump_V ||
      entry.mean_donnan_potential_jump_V > entry.maximum_donnan_potential_jump_V
    )
      context.addIssue({
        code: 'custom',
        message: 'Donnan potential summaries must be ordered',
      });
    const expectedRelative =
      entry.maximum_absolute_charge_residual_mol_m3 /
      entry.normalization_mol_m3;
    if (
      Math.abs(entry.relative_charge_residual - expectedRelative) >
      1e-12 * Math.max(entry.relative_charge_residual, expectedRelative, 1e-30)
    )
      context.addIssue({
        code: 'custom',
        path: ['relative_charge_residual'],
        message: 'Donnan charge residual must match its declared normalization',
      });
    if (entry.passed !== entry.relative_charge_residual <= entry.tolerance)
      context.addIssue({
        code: 'custom',
        path: ['passed'],
        message: 'Donnan closure status must match its tolerance',
      });
  });

/** Input-hash-bound evidence for local Donnan closure; never empirical validation. */
export const structuredCellDonnanInterfaceEvidenceSchema = z
  .object({
    contract_version: z.literal('structured-cell-donnan-interface-evidence-v1'),
    record_kind: z.literal('ideal_donnan_interface_closure'),
    evidence_role: z.literal('mathematical_software_verification'),
    decision_eligible: z.literal(false),
    independent_validation: z.literal(false),
    input_sha256: digest,
    interfaces: z.array(interfaceEvidence).min(1).max(15),
  })
  .strict()
  .superRefine((evidence, context) => {
    if (
      new Set(evidence.interfaces.map((entry) => entry.interface_id)).size !==
      evidence.interfaces.length
    )
      context.addIssue({
        code: 'custom',
        path: ['interfaces'],
        message: 'Donnan interface evidence identities must be unique',
      });
  });

export type StructuredCellDonnanInterfaceEvidence = z.infer<
  typeof structuredCellDonnanInterfaceEvidenceSchema
>;
