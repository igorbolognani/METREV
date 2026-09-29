import { z } from 'zod';

import { spatialValueSchema } from './spatial-model-schema';

const region = z.enum([
  'bulk_liquid',
  'anode',
  'biofilm',
  'membrane',
  'separator',
  'cathode',
  'gas',
]);

/** Mesh construction is separate from a scientific case or a PDE solve. */
export const planarMeshSchema = z
  .object({
    geometry_version: z.literal('planar-layers-v1'),
    height_m: spatialValueSchema,
    layers: z
      .array(
        z
          .object({
            tag: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
            kind: region,
            component_id: z.string().trim().min(1).optional(),
            width_m: spatialValueSchema,
            /** Optional source-traced local maximum size; interface nodes use the finer neighbor. */
            target_size_m: spatialValueSchema.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(16),
    boundaries: z
      .object({
        left: z
          .object({
            tag: z.string().min(1),
            role: z.enum(['wall', 'inlet', 'outlet', 'electrode']),
          })
          .strict(),
        right: z
          .object({
            tag: z.string().min(1),
            role: z.enum(['wall', 'inlet', 'outlet', 'electrode']),
          })
          .strict(),
        top: z
          .object({
            tag: z.string().min(1),
            role: z.enum(['wall', 'inlet', 'outlet', 'electrode']),
          })
          .strict(),
        bottom: z
          .object({
            tag: z.string().min(1),
            role: z.enum(['wall', 'inlet', 'outlet', 'electrode']),
          })
          .strict(),
      })
      .strict(),
    target_size_m: spatialValueSchema,
    refinement_factors: z.array(z.number().int().min(1).max(16)).min(1).max(3),
  })
  .strict()
  .superRefine((mesh, context) => {
    for (const [path, value] of [
      [['height_m'], mesh.height_m],
      [['target_size_m'], mesh.target_size_m],
      ...mesh.layers.map(
        (layer, index) =>
          [['layers', index, 'width_m'], layer.width_m] as const,
      ),
      ...mesh.layers.flatMap((layer, index) =>
        layer.target_size_m
          ? [[['layers', index, 'target_size_m'], layer.target_size_m] as const]
          : [],
      ),
    ] as const) {
      if (value.unit !== 'm' || value.value <= 0)
        context.addIssue({
          code: 'custom',
          path: [...path],
          message: 'Expected positive length in m',
        });
    }
    const tags = mesh.layers.map((layer) => layer.tag);
    const boundaryTags = Object.values(mesh.boundaries).map(({ tag }) => tag);
    if (
      new Set([...tags, ...boundaryTags]).size !==
      tags.length + boundaryTags.length
    )
      context.addIssue({
        code: 'custom',
        path: ['boundaries'],
        message: 'Domain and boundary tags must be unique',
      });
    if (
      new Set(mesh.refinement_factors).size !==
        mesh.refinement_factors.length ||
      mesh.refinement_factors.some(
        (factor, index) =>
          index > 0 && factor <= mesh.refinement_factors[index - 1],
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['refinement_factors'],
        message: 'Refinement factors must be strictly increasing',
      });
    const width = mesh.layers.reduce(
      (sum, layer) => sum + layer.width_m.value,
      0,
    );
    mesh.layers.forEach((layer, index) => {
      if (
        layer.target_size_m &&
        layer.target_size_m.value > mesh.target_size_m.value
      )
        context.addIssue({
          code: 'custom',
          path: ['layers', index, 'target_size_m'],
          message:
            'Local refinement size must not exceed the global target size',
        });
    });
    const factor = Math.max(...mesh.refinement_factors);
    const estimate = mesh.layers.reduce((sum, layer) => {
      const size =
        (layer.target_size_m?.value ?? mesh.target_size_m.value) / factor;
      return sum + (mesh.height_m.value * layer.width_m.value) / (size * size);
    }, 0);
    if (width > 0 && estimate > 250_000)
      context.addIssue({
        code: 'custom',
        path: ['target_size_m'],
        message: 'Mesh estimate exceeds the bounded development runtime',
      });
  });

export const spatialSidecarRequestSchema = z.discriminatedUnion('operation', [
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      operation: z.literal('health'),
    })
    .strict(),
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      operation: z.literal('planar_mesh'),
      mesh: planarMeshSchema,
    })
    .strict(),
]);

const runtimeMetadata = z
  .object({
    sidecar_version: z.string().min(1),
    protocol_version: z.literal('spatial-sidecar-v1'),
    python_version: z.string().min(1),
    gmsh_version: z.string().nullable(),
    dolfinx_version: z.string().nullable(),
    petsc_version: z.string().nullable(),
  })
  .strict();

const meshArtifact = z
  .object({
    refinement_factor: z.number().int().positive(),
    format: z.literal('msh4'),
    path: z.string().regex(/^mesh-[0-9]+\.msh$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().positive(),
    node_count: z.number().int().positive(),
    cell_count: z.number().int().positive(),
    min_quality: z.number().finite().min(0).max(1),
  })
  .strict();

export const spatialSidecarResponseSchema = z.union([
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      status: z.literal('ok'),
      operation: z.literal('health'),
      metadata: runtimeMetadata,
      capabilities: z.array(z.string()),
    })
    .strict(),
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      status: z.literal('ok'),
      operation: z.literal('planar_mesh'),
      metadata: runtimeMetadata,
      geometry_version: z.literal('planar-layers-v1'),
      input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      physical_groups: z.record(z.number().int().positive()),
      component_map: z.record(z.string()),
      interfaces: z.array(
        z
          .object({
            tag: z.string(),
            from_tag: z.string(),
            to_tag: z.string(),
            normal: z.tuple([z.literal(1), z.literal(0)]),
          })
          .strict(),
      ),
      artifacts: z.array(meshArtifact).min(1),
    })
    .strict(),
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      status: z.literal('error'),
      code: z.enum([
        'invalid_request',
        'dependency_unavailable',
        'mesh_failure',
        'unsupported_operation',
        'internal_error',
      ]),
      message: z.string().min(1),
      metadata: runtimeMetadata,
    })
    .strict(),
]);

export type PlanarMesh = z.infer<typeof planarMeshSchema>;
export type SpatialSidecarRequest = z.infer<typeof spatialSidecarRequestSchema>;
export type SpatialSidecarResponse = z.infer<
  typeof spatialSidecarResponseSchema
>;
