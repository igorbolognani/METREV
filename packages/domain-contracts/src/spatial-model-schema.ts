import { z } from 'zod';

import spatialParameterAuthority from '../../../bioelectrochem_agent_kit/domain/ontology/spatial-parameter-authority.json';

export { spatialParameterAuthority };

/** Versioned data contract; parsing this input does not imply a PDE runtime exists. */
const scientificSourceKindSchema = z.enum([
  'measured',
  'literature',
  'default',
  'assumption',
  'test_fixture',
]);

export const spatialValueSchema = z
  .object({
    value: z.number().finite(),
    unit: z.string().trim().min(1),
    source_kind: scientificSourceKindSchema,
    source_ref: z.string().trim().min(1),
    source_locator: z.string().trim().min(1).optional(),
    conditions: z.record(z.string()).optional(),
    uncertainty: z.number().finite().nonnegative().optional(),
    uncertainty_unit: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.uncertainty === undefined) !==
      (value.uncertainty_unit === undefined)
    )
      context.addIssue({
        code: 'custom',
        path: ['uncertainty'],
        message: 'Uncertainty and its unit must be supplied together',
      });
    if (value.uncertainty_unit && value.uncertainty_unit !== value.unit)
      context.addIssue({
        code: 'custom',
        path: ['uncertainty_unit'],
        message: 'Uncertainty unit must match value unit',
      });
  });

const regionKind = z.enum([
  'bulk_liquid',
  'anode',
  'biofilm',
  'membrane',
  'separator',
  'cathode',
  'gas',
  'wall',
  'inlet',
  'outlet',
]);

const field = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('constant'), value: spatialValueSchema }).strict(),
  z
    .object({
      kind: z.literal('piecewise'),
      regions: z
        .array(
          z
            .object({ tag: z.string().min(1), value: spatialValueSchema })
            .strict(),
        )
        .min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('sampled'),
      interpolation: z.enum(['nearest', 'linear']),
      samples: z
        .array(
          z
            .object({
              position_m: z.array(z.number().finite()),
              value: spatialValueSchema,
            })
            .strict(),
        )
        .min(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal('artifact'),
      uri: z.string().trim().min(1),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      unit: z.string().trim().min(1),
      source_kind: scientificSourceKindSchema,
      source_ref: z.string().trim().min(1),
      format: z.enum(['XDMF', 'HDF5', 'VTU']),
    })
    .strict(),
]);

export const spatialModelInputSchema = z
  .object({
    contract_version: z.literal('spatial-input-v1'),
    model_id: z.string().trim().min(1),
    system: z.enum(['MFC', 'MEC']),
    dimension: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    coordinate_system: z.enum(['cartesian', 'axisymmetric']),
    axes: z
      .array(z.enum(['x', 'y', 'z', 'r']))
      .min(1)
      .max(3),
    geometry: z
      .object({
        kind: z.literal('box'),
        extents_m: z.array(spatialValueSchema).min(1).max(3),
        regions: z
          .array(
            z
              .object({
                tag: z.string().trim().min(1),
                kind: regionKind,
                component_id: z.string().trim().min(1).optional(),
              })
              .strict(),
          )
          .min(1),
        interfaces: z.array(
          z
            .object({
              from_tag: z.string().trim().min(1),
              to_tag: z.string().trim().min(1),
              normal: z.array(z.number().finite()).min(1).max(3),
            })
            .strict(),
        ),
      })
      .strict(),
    mesh: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('generate'),
          target_size_m: spatialValueSchema,
          algorithm: z.string().trim().min(1),
        })
        .strict(),
      z
        .object({
          kind: z.literal('reference'),
          uri: z.string().trim().min(1),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          format: z.enum(['msh', 'XDMF']),
        })
        .strict(),
    ]),
    material_fields: z.array(
      z
        .object({
          parameter_id: z.string().trim().min(1),
          domain_tag: z.string().trim().min(1),
          field,
        })
        .strict(),
    ),
    species: z.array(
      z
        .object({
          id: z.string().trim().min(1),
          valence: spatialValueSchema,
          diffusivity: field,
        })
        .strict(),
    ),
    initial_conditions: z.array(
      z
        .object({
          variable: z.string().trim().min(1),
          domain_tag: z.string().trim().min(1),
          field,
        })
        .strict(),
    ),
    boundary_conditions: z.array(
      z
        .object({
          kind: z.enum([
            'dirichlet',
            'neumann',
            'robin',
            'flux',
            'symmetry',
            'interface_continuity',
            'circuit_coupling',
          ]),
          tag: z.string().trim().min(1),
          variable: z.string().trim().min(1),
          value: spatialValueSchema.optional(),
          coefficient: spatialValueSchema.optional(),
        })
        .strict(),
    ),
    circuit: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('external_load'),
          resistance: spatialValueSchema,
        })
        .strict(),
      z
        .object({
          kind: z.literal('applied_voltage'),
          voltage: spatialValueSchema,
        })
        .strict(),
    ]),
    requested_outputs: z.array(z.string().trim().min(1)).min(1),
  })
  .strict()
  .superRefine((input, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    if (
      input.axes.length !== input.dimension ||
      new Set(input.axes).size !== input.axes.length
    )
      issue(['axes'], 'Axes must be unique and match dimension');
    if (input.geometry.extents_m.length !== input.dimension)
      issue(['geometry', 'extents_m'], 'Extent count must match dimension');
    input.geometry.extents_m.forEach((extent, i) => {
      if (extent.unit !== 'm' || extent.value <= 0)
        issue(
          ['geometry', 'extents_m', i],
          'Extent must be a positive length in m',
        );
    });
    if (
      input.coordinate_system === 'axisymmetric' &&
      (input.dimension !== 2 || input.axes.join(',') !== 'r,z')
    )
      issue(['coordinate_system'], 'Axisymmetric coordinates require 2D [r,z]');
    if (input.coordinate_system === 'cartesian' && input.axes.includes('r'))
      issue(['axes'], 'Cartesian coordinates cannot use r');
    if (
      input.mesh.kind === 'generate' &&
      (input.mesh.target_size_m.unit !== 'm' ||
        input.mesh.target_size_m.value <= 0)
    )
      issue(
        ['mesh', 'target_size_m'],
        'Mesh target size must be a positive length in m',
      );
    if ((input.system === 'MFC') !== (input.circuit.kind === 'external_load'))
      issue(['circuit'], 'MFC needs load; MEC needs applied voltage');
    const tags = input.geometry.regions.map((region) => region.tag);
    if (new Set(tags).size !== tags.length)
      issue(['geometry', 'regions'], 'Region tags must be unique');
    input.geometry.interfaces.forEach((face, i) => {
      if (
        !tags.includes(face.from_tag) ||
        !tags.includes(face.to_tag) ||
        face.from_tag === face.to_tag
      )
        issue(
          ['geometry', 'interfaces', i],
          'Interface needs two distinct declared region tags',
        );
      if (
        face.normal.length !== input.dimension ||
        !face.normal.some((value) => value !== 0)
      )
        issue(
          ['geometry', 'interfaces', i, 'normal'],
          'Normal must be nonzero with correct dimension',
        );
    });
    const checkField = (
      candidate: z.infer<typeof field>,
      path: (string | number)[],
      expectedUnit?: string,
      bounds?: { min?: number; max?: number; exclusive_min?: number },
    ) => {
      const values =
        candidate.kind === 'constant'
          ? [{ value: candidate.value.value, unit: candidate.value.unit }]
          : candidate.kind === 'piecewise'
            ? candidate.regions.map((region) => ({
                value: region.value.value,
                unit: region.value.unit,
              }))
            : candidate.kind === 'sampled'
              ? candidate.samples.map((sample) => ({
                  value: sample.value.value,
                  unit: sample.value.unit,
                }))
              : [{ unit: candidate.unit, value: undefined }];
      values.forEach((entry, i) => {
        if (expectedUnit && entry.unit !== expectedUnit)
          issue([...path, i], `Expected canonical unit ${expectedUnit}`);
        if (entry.value === undefined) return;
        if (
          (bounds?.min !== undefined && entry.value < bounds.min) ||
          (bounds?.max !== undefined && entry.value > bounds.max) ||
          (bounds?.exclusive_min !== undefined &&
            entry.value <= bounds.exclusive_min)
        )
          issue([...path, i], 'Value outside parameter bounds');
      });
      if (candidate.kind === 'piecewise') {
        for (const region of candidate.regions)
          if (!tags.includes(region.tag))
            issue(path, `Undeclared piecewise tag: ${region.tag}`);
      }
      if (candidate.kind === 'sampled') {
        candidate.samples.forEach((sample, i) => {
          if (sample.position_m.length !== input.dimension)
            issue(
              [...path, 'samples', i, 'position_m'],
              'Sample coordinate count must match dimension',
            );
        });
      }
    };
    input.material_fields.forEach((entry, i) => {
      if (!tags.includes(entry.domain_tag))
        issue(['material_fields', i, 'domain_tag'], 'Unknown region');
      const parameter = (
        spatialParameterAuthority.parameters as Record<
          string,
          {
            unit: string;
            domains: string[];
            dimensions: number[];
            bounds: { min?: number; max?: number; exclusive_min?: number };
          }
        >
      )[entry.parameter_id];
      if (!parameter) {
        issue(
          ['material_fields', i, 'parameter_id'],
          'Parameter is absent from the spatial authority',
        );
      } else {
        const region = input.geometry.regions.find(
          (candidate) => candidate.tag === entry.domain_tag,
        );
        if (region && !parameter.domains.includes(region.kind))
          issue(
            ['material_fields', i, 'domain_tag'],
            `Parameter ${entry.parameter_id} is not defined for ${region.kind}`,
          );
        if (!parameter.dimensions.includes(input.dimension))
          issue(
            ['material_fields', i, 'parameter_id'],
            'Parameter is not defined for this dimension',
          );
        checkField(
          entry.field,
          ['material_fields', i, 'field'],
          parameter.unit,
          parameter.bounds,
        );
      }
    });
    input.species.forEach((entry, i) => {
      if (entry.valence.unit !== '1' || !Number.isInteger(entry.valence.value))
        issue(
          ['species', i, 'valence'],
          'Valence must be an integer with unit 1',
        );
      checkField(entry.diffusivity, ['species', i, 'diffusivity'], 'm2/s', {
        exclusive_min: 0,
      });
    });
    input.initial_conditions.forEach((entry, i) => {
      if (!tags.includes(entry.domain_tag))
        issue(['initial_conditions', i, 'domain_tag'], 'Unknown region');
      checkField(entry.field, ['initial_conditions', i, 'field']);
    });
    input.boundary_conditions.forEach((entry, i) => {
      if (!tags.includes(entry.tag))
        issue(['boundary_conditions', i, 'tag'], 'Unknown region');
      if (
        entry.kind !== 'symmetry' &&
        entry.kind !== 'interface_continuity' &&
        entry.value === undefined
      )
        issue(
          ['boundary_conditions', i, 'value'],
          'Boundary value is required',
        );
      if (entry.kind === 'robin' && entry.coefficient === undefined)
        issue(
          ['boundary_conditions', i, 'coefficient'],
          'Robin coefficient is required',
        );
    });
    if (
      input.circuit.kind === 'external_load' &&
      (input.circuit.resistance.unit !== 'ohm' ||
        input.circuit.resistance.value <= 0)
    )
      issue(['circuit', 'resistance'], 'Load must be positive in ohm');
    if (
      input.circuit.kind === 'applied_voltage' &&
      (input.circuit.voltage.unit !== 'V' || input.circuit.voltage.value <= 0)
    )
      issue(['circuit', 'voltage'], 'Applied voltage must be positive in V');
  });

export type SpatialModelInput = z.infer<typeof spatialModelInputSchema>;

export const physicsCompositionRequestSchema = z
  .object({
    modelId: z.string().trim().min(1),
    system: z.enum(['MFC', 'MEC', 'biosensor']),
    architecture: z.string().trim().optional(),
    separator: z.string().trim().optional(),
  })
  .strict();
