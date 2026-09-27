import { z } from 'zod';

// The package API and HTTP boundary accept the same complete, source-traced
// planar cell. Physical ranges and cross-domain equations are checked by the
// modeling runtime; this schema enforces payload shape, units and provenance.
const sourced = <U extends string>(unit: U) =>
  z
    .object({
      value: z.number().finite(),
      unit: z.literal(unit),
      source_kind: z.enum([
        'measured',
        'literature',
        'default',
        'assumption',
        'test_fixture',
      ]),
      source_ref: z.string().trim().min(1),
      original_value: z.number().finite().optional(),
      original_unit: z.string().trim().min(1).optional(),
      normalization_rule_id: z.string().trim().min(1).optional(),
      uncertainty: z.number().finite().nonnegative().optional(),
      uncertainty_unit: z.literal(unit).optional(),
    })
    .strict()
    .superRefine((parameter, context) => {
      if (
        (parameter.uncertainty === undefined) !==
        (parameter.uncertainty_unit === undefined)
      )
        context.addIssue({
          code: 'custom',
          path: ['uncertainty'],
          message:
            'uncertainty and matching uncertainty_unit must be supplied together',
        });
    });
const anodeCell = z
  .object({
    porosity: sourced('1'),
    tortuosity: sourced('1'),
    specificSurfaceArea: sourced('m2/m3'),
    accessibleAreaFraction: sourced('1'),
    anodePotential: sourced('V'),
  })
  .strict();
const membraneSegment = z
  .object({
    porosity: sourced('1'),
    tortuosity: sourced('1'),
  })
  .strict();
const membraneSpecies = z
  .object({
    name: z.string().trim().min(1),
    valence: sourced('1'),
    freeDiffusivity: sourced('m2/s'),
    leftConcentration: sourced('mol/m3'),
    rightConcentration: sourced('mol/m3'),
  })
  .strict();

export const coupledCell1dInputSchema = z
  .object({
    system: z.enum(['MFC', 'MEC']),
    anode: z
      .object({
        thickness: sourced('m'),
        projectedArea: sourced('m2'),
        freeSubstrateDiffusivity: sourced('m2/s'),
        bulkSubstrateConcentration: sourced('mol/m3'),
        maximumSurfaceReactionFlux: sourced('mol/(m2 s)'),
        halfSaturationConcentration: sourced('mol/m3'),
        halfRateAnodePotential: sourced('V'),
        temperature: sourced('K'),
        electronsPerSubstrateMolecule: sourced('1'),
        cells: z.array(anodeCell).min(2).max(512),
      })
      .strict(),
    membrane: z
      .object({
        thickness: sourced('m'),
        area: sourced('m2'),
        temperature: sourced('K'),
        segments: z.array(membraneSegment).min(2).max(512),
        species: z.array(membraneSpecies).length(2),
      })
      .strict(),
    electrolyteResistance: sourced('ohm'),
    contactResistance: sourced('ohm'),
    reversibleCellVoltage: sourced('V'),
    anodeTransferCoefficient: sourced('1'),
    maximumAnodeOverpotential: sourced('V'),
    cathode: z
      .object({
        activeArea: sourced('m2'),
        exchangeCurrentDensity: sourced('A/m2'),
        transferCoefficient: sourced('1'),
        oxygen: z
          .object({
            concentration: sourced('mol/m3'),
            massTransferCoefficient: sourced('m/s'),
          })
          .strict()
          .optional(),
        hydrogen: z
          .object({
            faradayEfficiency: sourced('1'),
            captureFraction: sourced('1'),
          })
          .strict()
          .optional(),
      })
      .strict(),
    circuit: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('external_load'),
          resistance: sourced('ohm'),
        })
        .strict(),
      z
        .object({ kind: z.literal('applied_voltage'), voltage: sourced('V') })
        .strict(),
    ]),
  })
  .strict()
  .superRefine((input, context) => {
    if ((input.system === 'MFC') !== (input.circuit.kind === 'external_load'))
      context.addIssue({
        code: 'custom',
        path: ['circuit'],
        message: 'MFC needs external load; MEC needs applied voltage',
      });
    if (
      (input.system === 'MFC') !== Boolean(input.cathode.oxygen) ||
      (input.system === 'MEC') !== Boolean(input.cathode.hydrogen)
    )
      context.addIssue({
        code: 'custom',
        path: ['cathode'],
        message: 'MFC needs oxygen only; MEC needs hydrogen only',
      });
  });

export type CoupledCell1dContractInput = z.infer<
  typeof coupledCell1dInputSchema
>;
