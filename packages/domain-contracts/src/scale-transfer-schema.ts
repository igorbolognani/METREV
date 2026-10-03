import { z } from 'zod';

const text = z.string().trim().min(1).max(300);
const quantity = z
  .object({
    value: z.number().finite(),
    unit: text,
    source_kind: z.enum([
      'measured',
      'literature',
      'assumption',
      'default',
      'test_fixture',
      'modeled',
    ]),
    source_ref: text,
  })
  .strict();
const interval = z.object({ minimum: quantity, maximum: quantity }).strict();
const units = {
  effective_diffusivity: 'm2/s',
  effective_conductivity: 'S/m',
  permeability: 'm2',
  accessible_reactive_area: 'm2/m3',
} as const;

/** An explicit analytical layered-medium reduction, distinct from pore-resolved simulation. */
export const scaleTransferInputSchema = z
  .object({
    contract_version: z.literal('scale-transfer-layered-input-v1'),
    source_scale: z.enum([
      'component',
      'micro_porous_electrode',
      'nano_interface',
    ]),
    target_scale: z.literal('cell'),
    source_run_ref: text,
    source_geometry_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    target_domain_tag: text,
    property: z.enum([
      'effective_diffusivity',
      'effective_conductivity',
      'permeability',
      'accessible_reactive_area',
    ]),
    species_id: text.optional(),
    method: z.enum([
      'parallel_layer_arithmetic',
      'series_layer_harmonic',
      'volume_weighted_reactive_area',
    ]),
    direction_axis: z.enum(['x', 'y', 'z']),
    method_source_ref: text,
    samples: z
      .array(
        z
          .object({
            id: text,
            property_value: quantity,
            volume_fraction: quantity,
          })
          .strict(),
      )
      .min(1)
      .max(512),
    validity: z
      .object({ temperature: interval, condition_note: text })
      .strict(),
    target_temperature: quantity,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (new Set(input.samples.map((s) => s.id)).size !== input.samples.length)
      ctx.addIssue({
        code: 'custom',
        path: ['samples'],
        message: 'Sample IDs must be unique',
      });
    for (const [i, s] of input.samples.entries()) {
      if (
        s.property_value.unit !== units[input.property] ||
        s.property_value.value < 0 ||
        (input.property !== 'accessible_reactive_area' &&
          s.property_value.value === 0)
      )
        ctx.addIssue({
          code: 'custom',
          path: ['samples', i, 'property_value'],
          message: 'Property must use its canonical SI unit and physical range',
        });
      if (
        s.volume_fraction.unit !== '1' ||
        s.volume_fraction.value <= 0 ||
        s.volume_fraction.value > 1
      )
        ctx.addIssue({
          code: 'custom',
          path: ['samples', i, 'volume_fraction'],
          message:
            'Declared volume fractions must be positive and dimensionless',
        });
    }
    if (
      Math.abs(
        input.samples.reduce((a, s) => a + s.volume_fraction.value, 0) - 1,
      ) > 1e-10
    )
      ctx.addIssue({
        code: 'custom',
        path: ['samples'],
        message:
          'Volume fractions must already sum to one; no implicit renormalization',
      });
    if (
      (input.property === 'accessible_reactive_area') !==
      (input.method === 'volume_weighted_reactive_area')
    )
      ctx.addIssue({
        code: 'custom',
        path: ['method'],
        message:
          'Reactive area is separately source-traced and volume averaged, never derived from porosity',
      });
    if (
      (input.property === 'effective_diffusivity') !==
      Boolean(input.species_id)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['species_id'],
        message:
          'Diffusivity must name its species; other transfer properties do not use one',
      });
    const { minimum, maximum } = input.validity.temperature;
    if (
      [minimum, maximum, input.target_temperature].some(
        (q) => q.unit !== 'K' || q.value <= 0,
      ) ||
      minimum.value > maximum.value
    )
      ctx.addIssue({
        code: 'custom',
        path: ['validity', 'temperature'],
        message: 'Source-backed positive Kelvin interval required',
      });
  });
export type ScaleTransferInput = z.infer<typeof scaleTransferInputSchema>;
