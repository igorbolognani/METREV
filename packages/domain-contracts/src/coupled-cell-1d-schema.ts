import { z } from 'zod';
import { spatialFieldSchema } from './spatial-model-schema';
import { evaluateSpatialMaterialField } from './spatial-field-runtime';

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
      source_locator: z.string().trim().min(1).optional(),
      conditions: z.record(z.string()).optional(),
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

const anodeFieldProfile = z
  .object({
    domain_tag: z.string().trim().min(1),
    cell_count: z.number().int().min(2).max(512),
    porosity: spatialFieldSchema,
    tortuosity: spatialFieldSchema,
    specificSurfaceArea: spatialFieldSchema,
    accessibleAreaFraction: spatialFieldSchema,
    anodePotential: spatialFieldSchema,
  })
  .strict();
const membraneFieldProfile = z
  .object({
    domain_tag: z.string().trim().min(1),
    segment_count: z.number().int().min(2).max(512),
    porosity: spatialFieldSchema,
    tortuosity: spatialFieldSchema,
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
        cells: z.array(anodeCell).min(2).max(512).optional(),
      })
      .strict(),
    membrane: z
      .object({
        thickness: sourced('m'),
        area: sourced('m2'),
        temperature: sourced('K'),
        segments: z.array(membraneSegment).min(2).max(512).optional(),
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
    /** Explicit source fields are compiled at the 1D finite-volume centers. */
    field_profiles: z
      .object({
        anode: anodeFieldProfile.optional(),
        membrane: membraneFieldProfile.optional(),
      })
      .strict()
      .refine(
        (profiles) => Boolean(profiles.anode || profiles.membrane),
        'At least one field profile is required',
      )
      .optional(),
  })
  .strict()
  .superRefine((input, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    if (!input.anode.cells && !input.field_profiles?.anode)
      issue(
        ['anode', 'cells'],
        'Source-traced anode cells or an explicit field profile are required',
      );
    if (!input.membrane.segments && !input.field_profiles?.membrane)
      issue(
        ['membrane', 'segments'],
        'Source-traced membrane segments or an explicit field profile are required',
      );
    try {
      const compiled = compileProfiles(input);
      if (
        compiled.anode &&
        input.anode.cells &&
        JSON.stringify(compiled.anode) !== JSON.stringify(input.anode.cells)
      )
        issue(
          ['anode', 'cells'],
          'Cell quantities must reproduce the declared field profile including provenance',
        );
      if (
        compiled.membrane &&
        input.membrane.segments &&
        JSON.stringify(compiled.membrane) !==
          JSON.stringify(input.membrane.segments)
      )
        issue(
          ['membrane', 'segments'],
          'Segment quantities must reproduce the declared field profile including provenance',
        );
    } catch (error) {
      issue(
        ['field_profiles'],
        error instanceof Error ? error.message : 'Invalid field profile',
      );
    }
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
  })
  .transform((input) => {
    const compiled = compileProfiles(input);
    return {
      ...input,
      anode: { ...input.anode, cells: compiled.anode ?? input.anode.cells! },
      membrane: {
        ...input.membrane,
        segments: compiled.membrane ?? input.membrane.segments!,
      },
    };
  });

type FieldProfileCandidate = {
  anode: { thickness: { value: number; unit: 'm' } };
  membrane: { thickness: { value: number; unit: 'm' } };
  field_profiles?: {
    anode?: z.infer<typeof anodeFieldProfile>;
    membrane?: z.infer<typeof membraneFieldProfile>;
  };
};

function compileProfiles(input: FieldProfileCandidate): {
  anode?: z.infer<typeof anodeCell>[];
  membrane?: z.infer<typeof membraneSegment>[];
} {
  const anodeProfile = input.field_profiles?.anode;
  const membraneProfile = input.field_profiles?.membrane;
  const value = <U extends string>(
    parameterId: string,
    field: z.infer<typeof spatialFieldSchema>,
    domainKind: string,
    tag: string,
    x: number,
    unit: U,
  ) =>
    sourced(unit).parse(
      evaluateSpatialMaterialField(parameterId, field, {
        dimension: 1,
        domain_kind: domainKind,
        domain_tag: tag,
        position_m: [x],
      }).quantity,
    );
  if (
    (anodeProfile && input.anode.thickness.value <= 0) ||
    (membraneProfile && input.membrane.thickness.value <= 0)
  )
    throw new RangeError('Field-profile thickness must be positive');
  return {
    ...(anodeProfile
      ? {
          anode: Array.from({ length: anodeProfile.cell_count }, (_, index) => {
            const x =
              ((index + 0.5) * input.anode.thickness.value) /
              anodeProfile.cell_count;
            const at = <U extends string>(
              parameterId: string,
              field: z.infer<typeof spatialFieldSchema>,
              unit: U,
            ) =>
              value(
                parameterId,
                field,
                'anode',
                anodeProfile.domain_tag,
                x,
                unit,
              );
            return {
              porosity: at('porosity', anodeProfile.porosity, '1'),
              tortuosity: at('tortuosity', anodeProfile.tortuosity, '1'),
              specificSurfaceArea: at(
                'specific_surface_area_m2_m3',
                anodeProfile.specificSurfaceArea,
                'm2/m3',
              ),
              accessibleAreaFraction: at(
                'accessible_reactive_area_fraction',
                anodeProfile.accessibleAreaFraction,
                '1',
              ),
              anodePotential: at(
                'imposed_anode_potential_v',
                anodeProfile.anodePotential,
                'V',
              ),
            };
          }),
        }
      : {}),
    ...(membraneProfile
      ? {
          membrane: Array.from(
            { length: membraneProfile.segment_count },
            (_, index) => {
              const x =
                ((index + 0.5) * input.membrane.thickness.value) /
                membraneProfile.segment_count;
              return {
                porosity: value(
                  'porosity',
                  membraneProfile.porosity,
                  'membrane',
                  membraneProfile.domain_tag,
                  x,
                  '1',
                ),
                tortuosity: value(
                  'tortuosity',
                  membraneProfile.tortuosity,
                  'membrane',
                  membraneProfile.domain_tag,
                  x,
                  '1',
                ),
              };
            },
          ),
        }
      : {}),
  };
}

export type CoupledCell1dContractInput = z.infer<
  typeof coupledCell1dInputSchema
>;
