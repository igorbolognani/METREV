import { z } from 'zod';

import { spatialValueSchema } from './spatial-model-schema';
import {
  spatialStokesSetupSchema,
  spatialStokesTractionSchema,
  spatialStokesViscositySchema,
} from './spatial-stokes-schema';
import {
  spatialDarcySetupSchema,
  spatialDarcyPermeabilitySchema,
  spatialDarcyViscositySchema,
} from './spatial-darcy-schema';

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
      .min(1)
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
      return sum + (mesh.height_m.value / size) * (layer.width_m.value / size);
    }, 0);
    if (width > 0 && estimate > 250_000)
      context.addIssue({
        code: 'custom',
        path: ['target_size_m'],
        message: 'Mesh estimate exceeds the bounded development runtime',
      });
  });

const planarMeshRequestSchema = z
  .object({
    protocol_version: z.literal('spatial-sidecar-v1'),
    request_id: z.string().uuid(),
    operation: z.literal('planar_mesh'),
    mesh: planarMeshSchema,
  })
  .strict();

const planarStokesRequestSchema = z
  .object({
    protocol_version: z.literal('spatial-sidecar-v1'),
    request_id: z.string().uuid(),
    operation: z.literal('planar_stokes'),
    mesh_request: planarMeshRequestSchema,
    mesh_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    refinement_factor: z.number().int().positive(),
    model_input_contract_version: z.literal('spatial-input-v2'),
    model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    setup: spatialStokesSetupSchema,
    viscosity: spatialStokesViscositySchema,
  })
  .strict()
  .superRefine((request, context) => {
    if (
      !request.mesh_request.mesh.refinement_factors.includes(
        request.refinement_factor,
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['refinement_factor'],
        message: 'Requested refinement is absent from the mesh recipe',
      });
    const mesh = request.mesh_request.mesh;
    if (
      mesh.layers.length !== 1 ||
      mesh.layers[0].kind !== 'bulk_liquid' ||
      mesh.layers[0].tag !== request.setup.domain_tag
    )
      context.addIssue({
        code: 'custom',
        path: ['setup', 'domain_tag'],
        message:
          'Planar Stokes sidecar accepts exactly one matching bulk-liquid layer',
      });
    const walls = Object.values(mesh.boundaries)
      .filter((boundary) => boundary.role === 'wall')
      .map((boundary) => boundary.tag);
    if (
      walls.length !== 2 ||
      new Set(walls).size !== 2 ||
      walls.some((tag) => !request.setup.wall_tags.includes(tag))
    )
      context.addIssue({
        code: 'custom',
        path: ['setup', 'wall_tags'],
        message: 'No-slip wall tags must match the two wall facets',
      });
    if (
      Object.values(mesh.boundaries).filter(
        (boundary) =>
          boundary.role === 'inlet' && boundary.tag === request.setup.inlet.tag,
      ).length !== 1
    )
      context.addIssue({
        code: 'custom',
        path: ['setup', 'inlet', 'tag'],
        message: 'Inlet tag must match an exterior inlet facet',
      });
    if (
      Object.values(mesh.boundaries).filter(
        (boundary) =>
          boundary.role === 'outlet' &&
          boundary.tag === request.setup.outlet.tag,
      ).length !== 1
    )
      context.addIssue({
        code: 'custom',
        path: ['setup', 'outlet', 'tag'],
        message: 'Outlet tag must match an exterior outlet facet',
      });
    for (const port of ['inlet', 'outlet'] as const) {
      const parsed = spatialStokesTractionSchema.safeParse(
        request.setup[port].traction_pa,
      );
      if (!parsed.success)
        context.addIssue({
          code: 'custom',
          path: ['setup', port, 'traction_pa'],
          message: 'Both full traction components require Pa',
        });
    }
  });

const planarDarcyRequestSchema = z
  .object({
    protocol_version: z.literal('spatial-sidecar-v1'),
    request_id: z.string().uuid(),
    operation: z.literal('planar_darcy'),
    mesh_request: planarMeshRequestSchema,
    mesh_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    refinement_factor: z.number().int().positive(),
    model_input_contract_version: z.literal('spatial-input-v2'),
    model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    setup: spatialDarcySetupSchema,
    viscosity: spatialDarcyViscositySchema,
    permeability: spatialDarcyPermeabilitySchema,
  })
  .strict()
  .superRefine((request, context) => {
    const mesh = request.mesh_request.mesh;
    if (!mesh.refinement_factors.includes(request.refinement_factor))
      context.addIssue({
        code: 'custom',
        path: ['refinement_factor'],
        message: 'Requested refinement is absent from the mesh recipe',
      });
    if (
      mesh.layers.length !== 1 ||
      !['anode', 'biofilm', 'separator'].includes(mesh.layers[0].kind) ||
      mesh.layers[0].tag !== request.setup.domain_tag
    )
      context.addIssue({
        code: 'custom',
        path: ['setup', 'domain_tag'],
        message:
          'Planar Darcy sidecar accepts exactly one matching porous anode, biofilm or separator layer',
      });
    const sides = Object.entries(mesh.boundaries);
    const inlet = sides.find(
      ([, boundary]) =>
        boundary.tag === request.setup.inlet.tag && boundary.role === 'inlet',
    );
    const outlet = sides.find(
      ([, boundary]) =>
        boundary.tag === request.setup.outlet.tag && boundary.role === 'outlet',
    );
    const opposite =
      (inlet?.[0] === 'left' && outlet?.[0] === 'right') ||
      (inlet?.[0] === 'right' && outlet?.[0] === 'left') ||
      (inlet?.[0] === 'top' && outlet?.[0] === 'bottom') ||
      (inlet?.[0] === 'bottom' && outlet?.[0] === 'top');
    if (
      sides.filter(([, boundary]) => boundary.role === 'wall').length !== 2 ||
      !inlet ||
      !outlet ||
      !opposite
    )
      context.addIssue({
        code: 'custom',
        path: ['setup'],
        message:
          'Darcy requires opposing inlet/outlet pressure facets and two no-flow walls',
      });
    for (const port of ['inlet', 'outlet'] as const)
      if (request.setup[port].pressure_pa.unit !== 'Pa')
        context.addIssue({
          code: 'custom',
          path: ['setup', port, 'pressure_pa', 'unit'],
          message: 'Darcy boundary pressure must be expressed in Pa',
        });
  });

export const spatialSidecarRequestSchema = z.union([
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      operation: z.literal('health'),
    })
    .strict(),
  planarMeshRequestSchema,
  planarStokesRequestSchema,
  planarDarcyRequestSchema,
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

const stokesFileArtifact = z
  .object({
    path: z.enum(['stokes-solution.xdmf', 'stokes-solution.h5']),
    format: z.enum(['xdmf', 'hdf5']),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().positive(),
  })
  .strict();

const stokesFieldDataset = z
  .object({
    variable_id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    field_name: z.enum(['pressure', 'velocity_x', 'velocity_y']),
    dataset_path: z
      .string()
      .regex(/^\/Function\/(pressure|velocity_x|velocity_y)\/0$/),
    unit: z.enum(['Pa', 'm/s']),
    domain_tag: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  })
  .strict();

export const spatialSidecarResponseSchema = z.union([
  z
    .object({
      protocol_version: z.literal('spatial-sidecar-v1'),
      request_id: z.string().uuid(),
      status: z.literal('ok'),
      operation: z.literal('planar_darcy'),
      metadata: runtimeMetadata,
      model_input_contract_version: z.literal('spatial-input-v2'),
      model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      field_representation: z.literal('lagrange_p1_interpolation'),
      mesh: meshArtifact,
      field_datasets: z.tuple([
        stokesFieldDataset,
        stokesFieldDataset,
        stokesFieldDataset,
      ]),
      physical_groups: z.record(z.number().int().positive()),
      diagnostics: z
        .object({
          inlet_flow_m2_s_per_depth: z.number().finite(),
          outlet_flow_m2_s_per_depth: z.number().finite(),
          relative_flow_balance: z.number().finite().nonnegative(),
          mean_inlet_pressure_pa: z.number().finite(),
          mean_outlet_pressure_pa: z.number().finite(),
          pressure_drop_pa: z.number().finite(),
          divergence_l2_per_s: z.number().finite().nonnegative(),
          linear_iterations: z.number().int().nonnegative(),
          linear_converged_reason: z.number().int().positive(),
        })
        .strict(),
      solution_artifacts: z.tuple([
        z
          .object({
            path: z.literal('darcy-solution.xdmf'),
            format: z.literal('xdmf'),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive(),
          })
          .strict(),
        z
          .object({
            path: z.literal('darcy-solution.h5'),
            format: z.literal('hdf5'),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive(),
          })
          .strict(),
      ]),
    })
    .strict()
    .superRefine((response, context) => {
      const datasets = new Map(
        response.field_datasets.map((field) => [field.field_name, field]),
      );
      for (const fieldName of ['pressure', 'velocity_x', 'velocity_y'] as const)
        if (!datasets.has(fieldName))
          context.addIssue({
            code: 'custom',
            path: ['field_datasets'],
            message: `Missing ${fieldName} field dataset binding`,
          });
      for (const field of response.field_datasets)
        if (field.dataset_path !== `/Function/${field.field_name}/0`)
          context.addIssue({
            code: 'custom',
            path: ['field_datasets'],
            message: 'Field name and HDF5 dataset path must agree',
          });
      if (
        new Set(response.field_datasets.map(({ variable_id }) => variable_id))
          .size !== 3 ||
        datasets.get('pressure')?.unit !== 'Pa' ||
        datasets.get('velocity_x')?.unit !== 'm/s' ||
        datasets.get('velocity_y')?.unit !== 'm/s'
      )
        context.addIssue({
          code: 'custom',
          path: ['field_datasets'],
          message:
            'Darcy fields require distinct state variables, canonical units and matching HDF5 paths',
        });
    }),
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
      operation: z.literal('planar_stokes'),
      metadata: runtimeMetadata,
      model_input_contract_version: z.literal('spatial-input-v2'),
      model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      field_representation: z.literal('lagrange_p1_interpolation'),
      mesh: meshArtifact,
      field_datasets: z.tuple([
        stokesFieldDataset,
        stokesFieldDataset,
        stokesFieldDataset,
      ]),
      physical_groups: z.record(z.number().int().positive()),
      diagnostics: z
        .object({
          inlet_flow_m2_s_per_depth: z.number().finite(),
          outlet_flow_m2_s_per_depth: z.number().finite(),
          relative_flow_balance: z.number().finite().nonnegative(),
          mean_inlet_pressure_pa: z.number().finite(),
          mean_outlet_pressure_pa: z.number().finite(),
          pressure_drop_pa: z.number().finite(),
          divergence_l2_per_s: z.number().finite().nonnegative(),
          linear_iterations: z.number().int().nonnegative(),
          linear_converged_reason: z.number().int().positive(),
        })
        .strict(),
      solution_artifacts: z.tuple([stokesFileArtifact, stokesFileArtifact]),
    })
    .strict()
    .superRefine((response, context) => {
      const [xdmf, hdf5] = response.solution_artifacts;
      if (xdmf.path !== 'stokes-solution.xdmf' || xdmf.format !== 'xdmf')
        context.addIssue({
          code: 'custom',
          path: ['solution_artifacts', 0],
          message: 'First Stokes artifact must be the XDMF manifest',
        });
      if (hdf5.path !== 'stokes-solution.h5' || hdf5.format !== 'hdf5')
        context.addIssue({
          code: 'custom',
          path: ['solution_artifacts', 1],
          message: 'Second Stokes artifact must be the HDF5 field data',
        });
      const datasets = new Map(
        response.field_datasets.map((field) => [field.field_name, field]),
      );
      for (const fieldName of ['pressure', 'velocity_x', 'velocity_y'] as const)
        if (!datasets.has(fieldName))
          context.addIssue({
            code: 'custom',
            path: ['field_datasets'],
            message: `Missing ${fieldName} field dataset binding`,
          });
      for (const field of response.field_datasets)
        if (field.dataset_path !== `/Function/${field.field_name}/0`)
          context.addIssue({
            code: 'custom',
            path: ['field_datasets'],
            message: 'Field name and HDF5 dataset path must agree',
          });
      if (
        new Set(response.field_datasets.map(({ variable_id }) => variable_id))
          .size !== 3
      )
        context.addIssue({
          code: 'custom',
          path: ['field_datasets'],
          message:
            'Stokes state variables must bind to distinct field datasets',
        });
      if (
        datasets.get('pressure')?.unit !== 'Pa' ||
        datasets.get('velocity_x')?.unit !== 'm/s' ||
        datasets.get('velocity_y')?.unit !== 'm/s'
      )
        context.addIssue({
          code: 'custom',
          path: ['field_datasets'],
          message: 'Stokes datasets must preserve pressure and velocity units',
        });
    }),
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
        'solver_failure',
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
