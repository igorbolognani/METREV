import { z } from 'zod';
import {
  spatialSpeciesBudgetSchema,
  spatialSpeciesBudgetResidual,
} from './spatial-species-budget';

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
import {
  spatialDarcyTransportSetupSchema,
  spatialEffectiveDiffusivitySchema,
} from './spatial-darcy-transport-schema';

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
    transport_setup: spatialDarcyTransportSetupSchema.optional(),
    effective_diffusivity: spatialEffectiveDiffusivitySchema.optional(),
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
    if (
      Boolean(request.transport_setup) !==
      Boolean(request.effective_diffusivity)
    )
      context.addIssue({
        code: 'custom',
        path: ['transport_setup'],
        message: 'Transport setup and diffusivity must be supplied together',
      });
    if (request.transport_setup) {
      const transport = request.transport_setup;
      const flow = request.setup;
      if (
        transport.domain_tag !== flow.domain_tag ||
        transport.velocity_variables.x !== flow.velocity_variables.x ||
        transport.velocity_variables.y !== flow.velocity_variables.y ||
        transport.inlet.tag !== flow.inlet.tag ||
        transport.outlet.tag !== flow.outlet.tag
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_setup'],
          message:
            'Transport must bind to the same Stokes domain, velocity states and ports',
        });
      if (
        new Set([
          flow.pressure_variable,
          flow.velocity_variables.x,
          flow.velocity_variables.y,
          transport.concentration_variable,
        ]).size !== 4
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_setup', 'concentration_variable'],
          message: 'Hydraulic and concentration state IDs must be distinct',
        });
    }
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
    if (request.transport_setup) {
      const sides = Object.entries(mesh.boundaries);
      const inlet = sides.find(
        ([, b]) => b.tag === request.setup.inlet.tag,
      )?.[0];
      const outlet = sides.find(
        ([, b]) => b.tag === request.setup.outlet.tag,
      )?.[0];
      if (
        !(
          (inlet === 'left' && outlet === 'right') ||
          (inlet === 'right' && outlet === 'left') ||
          (inlet === 'top' && outlet === 'bottom') ||
          (inlet === 'bottom' && outlet === 'top')
        )
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_setup'],
          message: 'Transport requires opposing hydraulic ports',
        });
    }
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

const planarDarcyTransportRequestSchema = z
  .object({
    protocol_version: z.literal('spatial-sidecar-v1'),
    request_id: z.string().uuid(),
    operation: z.literal('planar_darcy_transport'),
    mesh_request: planarMeshRequestSchema,
    mesh_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    refinement_factor: z.number().int().positive(),
    model_input_contract_version: z.literal('spatial-input-v2'),
    model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    setup: spatialDarcySetupSchema,
    transport_setup: spatialDarcyTransportSetupSchema,
    viscosity: spatialDarcyViscositySchema,
    permeability: spatialDarcyPermeabilitySchema,
    effective_diffusivity: spatialEffectiveDiffusivitySchema,
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
      mesh.layers[0].tag !== request.setup.domain_tag ||
      request.transport_setup.domain_tag !== request.setup.domain_tag
    )
      context.addIssue({
        code: 'custom',
        path: ['transport_setup', 'domain_tag'],
        message: 'Darcy transport accepts one matching porous domain',
      });
    if (
      request.transport_setup.velocity_variables.x !==
        request.setup.velocity_variables.x ||
      request.transport_setup.velocity_variables.y !==
        request.setup.velocity_variables.y
    )
      context.addIssue({
        code: 'custom',
        path: ['transport_setup', 'velocity_variables'],
        message: 'Transport velocity must bind to the solved Darcy states',
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
      !opposite ||
      request.transport_setup.inlet.tag !== request.setup.inlet.tag ||
      request.transport_setup.outlet.tag !== request.setup.outlet.tag ||
      request.setup.inlet.pressure_pa.value <=
        request.setup.outlet.pressure_pa.value
    )
      context.addIssue({
        code: 'custom',
        path: ['transport_setup'],
        message:
          'Positive Darcy flow requires matching concentration ports, two no-flow walls and inlet pressure above outlet pressure',
      });
    const stateIds = [
      request.setup.pressure_variable,
      request.setup.velocity_variables.x,
      request.setup.velocity_variables.y,
      request.transport_setup.concentration_variable,
    ];
    if (new Set(stateIds).size !== stateIds.length)
      context.addIssue({
        code: 'custom',
        path: ['transport_setup', 'concentration_variable'],
        message: 'Pressure, velocity and concentration states must be distinct',
      });
    for (const port of ['inlet', 'outlet'] as const)
      if (
        request.transport_setup[port].concentration_mol_m3.unit !== 'mol/m3' ||
        request.transport_setup[port].concentration_mol_m3.value < 0
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_setup', port, 'concentration_mol_m3'],
          message:
            'Boundary concentration must be nonnegative and expressed in mol/m3',
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
  planarDarcyTransportRequestSchema,
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

const transportFieldDataset = z
  .object({
    variable_id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    field_name: z.literal('concentration'),
    dataset_path: z.literal('/Function/concentration/0'),
    unit: z.literal('mol/m3'),
    domain_tag: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  })
  .strict();

const scalarTransportFieldSummary = z
  .object({
    field_name: z.enum([
      'pressure',
      'velocity_x',
      'velocity_y',
      'concentration',
    ]),
    variable_id: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    unit: z.enum(['Pa', 'm/s', 'mol/m3']),
    domain_tag: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
    association: z.literal('mesh_nodes'),
    sample_count: z.number().int().positive(),
    minimum: z.number().finite(),
    maximum: z.number().finite(),
    mean: z.number().finite(),
    integral: z.number().finite(),
    integration_measure: z.literal('domain_area'),
    integral_unit: z.enum(['Pa*m2', 'm3/s', 'mol/m']),
  })
  .strict()
  .superRefine((summary, context) => {
    if (
      summary.minimum > summary.maximum ||
      summary.mean < summary.minimum ||
      summary.mean > summary.maximum
    )
      context.addIssue({
        code: 'custom',
        path: ['mean'],
        message: 'Field statistics must satisfy minimum <= mean <= maximum',
      });
    const expectedIntegralUnit = {
      Pa: 'Pa*m2',
      'm/s': 'm3/s',
      'mol/m3': 'mol/m',
    }[summary.unit];
    if (summary.integral_unit !== expectedIntegralUnit)
      context.addIssue({
        code: 'custom',
        path: ['integral_unit'],
        message: `Expected ${expectedIntegralUnit} for ${summary.unit} over domain area`,
      });
  });

const darcyTransportSolverDiagnostic = z
  .object({
    solver_id: z.enum(['darcy_pressure', 'neutral_scalar_transport']),
    method: z.literal('petsc_preonly_lu'),
    status: z.literal('converged'),
    iterations: z.number().int().positive(),
    converged_reason: z.number().int().positive(),
  })
  .strict();

const stokesSolverDiagnostic = z
  .object({
    solver_id: z.literal('stokes_saddle_point'),
    method: z.literal('petsc_preonly_lu'),
    status: z.literal('converged'),
    iterations: z.number().int().positive(),
    converged_reason: z.number().int().positive(),
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
      operation: z.literal('planar_darcy_transport'),
      metadata: runtimeMetadata,
      model_input_contract_version: z.literal('spatial-input-v2'),
      model_input_sha256: z.string().regex(/^[a-f0-9]{64}$/),
      field_representation: z.literal('lagrange_p1_interpolation'),
      mesh: meshArtifact,
      field_datasets: z.tuple([
        stokesFieldDataset,
        stokesFieldDataset,
        stokesFieldDataset,
        transportFieldDataset,
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
          darcy_linear_iterations: z.number().int().nonnegative(),
          darcy_linear_converged_reason: z.number().int().positive(),
          inlet_species_rate_mol_m_s_per_depth: z.number().finite(),
          outlet_species_rate_mol_m_s_per_depth: z.number().finite(),
          wall_species_rate_mol_m_s_per_depth: z.number().finite(),
          relative_species_balance: z.number().finite().nonnegative(),
          species_budget: spatialSpeciesBudgetSchema.optional(),
          peclet_number: z.number().finite().nonnegative(),
          minimum_concentration_mol_m3: z.number().finite().nonnegative(),
          maximum_concentration_mol_m3: z.number().finite().nonnegative(),
          transport_linear_iterations: z.number().int().nonnegative(),
          transport_linear_converged_reason: z.number().int().positive(),
        })
        .strict(),
      solution_artifacts: z.tuple([
        z
          .object({
            path: z.literal('darcy-transport-solution.xdmf'),
            format: z.literal('xdmf'),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive(),
          })
          .strict(),
        z
          .object({
            path: z.literal('darcy-transport-solution.h5'),
            format: z.literal('hdf5'),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: z.number().int().positive(),
          })
          .strict(),
      ]),
      /** Additive development diagnostics; older v1 sidecars may omit them. */
      field_summaries: z
        .tuple([
          scalarTransportFieldSummary,
          scalarTransportFieldSummary,
          scalarTransportFieldSummary,
          scalarTransportFieldSummary,
        ])
        .optional(),
      solver_diagnostics: z
        .tuple([darcyTransportSolverDiagnostic, darcyTransportSolverDiagnostic])
        .optional(),
    })
    .strict()
    .superRefine((response, context) => {
      const budget = response.diagnostics.species_budget;
      const d = response.diagnostics;
      if (
        budget &&
        (budget.inlet_outward_rate !== d.inlet_species_rate_mol_m_s_per_depth ||
          budget.outlet_outward_rate !==
            d.outlet_species_rate_mol_m_s_per_depth ||
          budget.wall_outward_rate !== d.wall_species_rate_mol_m_s_per_depth ||
          Math.abs(
            spatialSpeciesBudgetResidual(budget).relative -
              d.relative_species_balance,
          ) > 1e-12)
      )
        context.addIssue({
          code: 'custom',
          path: ['diagnostics', 'species_budget'],
          message:
            'Reaction species budget must match measured rates and balance',
        });
      const [pressure, velocityX, velocityY, concentration] =
        response.field_datasets;
      const expected = [
        ['pressure', '/Function/pressure/0', 'Pa'],
        ['velocity_x', '/Function/velocity_x/0', 'm/s'],
        ['velocity_y', '/Function/velocity_y/0', 'm/s'],
        ['concentration', '/Function/concentration/0', 'mol/m3'],
      ];
      const actual = [pressure, velocityX, velocityY, concentration];
      if (
        actual.some(
          (field, index) =>
            field.field_name !== expected[index][0] ||
            field.dataset_path !== expected[index][1] ||
            field.unit !== expected[index][2],
        ) ||
        new Set(actual.map(({ variable_id }) => variable_id)).size !== 4 ||
        new Set(actual.map(({ domain_tag }) => domain_tag)).size !== 1
      )
        context.addIssue({
          code: 'custom',
          path: ['field_datasets'],
          message:
            'Darcy transport fields require four distinct states, one domain and canonical XDMF datasets',
        });
      if (
        response.diagnostics.minimum_concentration_mol_m3 >
        response.diagnostics.maximum_concentration_mol_m3
      )
        context.addIssue({
          code: 'custom',
          path: ['diagnostics'],
          message: 'Minimum concentration cannot exceed maximum concentration',
        });
      if (
        Boolean(response.field_summaries) !==
        Boolean(response.solver_diagnostics)
      )
        context.addIssue({
          code: 'custom',
          path: ['field_summaries'],
          message:
            'Field summaries and solver diagnostics must be supplied together',
        });
      if (response.field_summaries) {
        const expectedSummaries = [
          ['pressure', pressure, 'Pa*m2'],
          ['velocity_x', velocityX, 'm3/s'],
          ['velocity_y', velocityY, 'm3/s'],
          ['concentration', concentration, 'mol/m'],
        ] as const;
        if (
          response.field_summaries.some((summary, index) => {
            const [fieldName, dataset, integralUnit] = expectedSummaries[index];
            return (
              summary.field_name !== fieldName ||
              summary.variable_id !== dataset.variable_id ||
              summary.unit !== dataset.unit ||
              summary.domain_tag !== dataset.domain_tag ||
              summary.integral_unit !== integralUnit ||
              summary.sample_count !== response.mesh.node_count
            );
          })
        )
          context.addIssue({
            code: 'custom',
            path: ['field_summaries'],
            message:
              'Field summaries must bind the four exported nodal fields and their units',
          });
      }
      if (response.solver_diagnostics) {
        const [darcySolver, transportSolver] = response.solver_diagnostics;
        if (
          darcySolver.solver_id !== 'darcy_pressure' ||
          transportSolver.solver_id !== 'neutral_scalar_transport' ||
          darcySolver.iterations !==
            response.diagnostics.darcy_linear_iterations ||
          darcySolver.converged_reason !==
            response.diagnostics.darcy_linear_converged_reason ||
          transportSolver.iterations !==
            response.diagnostics.transport_linear_iterations ||
          transportSolver.converged_reason !==
            response.diagnostics.transport_linear_converged_reason
        )
          context.addIssue({
            code: 'custom',
            path: ['solver_diagnostics'],
            message:
              'Solver diagnostics must match the Darcy and transport solve outcomes',
          });
      }
    }),
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
      field_datasets: z
        .array(z.union([stokesFieldDataset, transportFieldDataset]))
        .min(3)
        .max(4),
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
      transport_diagnostics: z
        .object({
          inlet_species_rate_mol_m_s_per_depth: z.number().finite(),
          outlet_species_rate_mol_m_s_per_depth: z.number().finite(),
          wall_species_rate_mol_m_s_per_depth: z.number().finite(),
          relative_species_balance: z.number().finite().nonnegative(),
          species_budget: spatialSpeciesBudgetSchema.optional(),
          peclet_number: z.number().finite().nonnegative(),
          minimum_concentration_mol_m3: z.number().finite(),
          maximum_concentration_mol_m3: z.number().finite(),
          linear_iterations: z.number().int().positive(),
          linear_converged_reason: z.number().int().positive(),
        })
        .strict()
        .optional(),
      solution_artifacts: z.tuple([stokesFileArtifact, stokesFileArtifact]),
      /** Additive diagnostics consumed by the durable result-v2 worker. */
      field_summaries: z
        .array(scalarTransportFieldSummary)
        .min(3)
        .max(4)
        .optional(),
      solver_diagnostics: z
        .array(
          z.union([
            stokesSolverDiagnostic,
            darcyTransportSolverDiagnostic.refine(
              (solver) => solver.solver_id === 'neutral_scalar_transport',
            ),
          ]),
        )
        .min(1)
        .max(2)
        .optional(),
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
          .size !== response.field_datasets.length
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
      if (
        Boolean(response.field_summaries) !==
        Boolean(response.solver_diagnostics)
      )
        context.addIssue({
          code: 'custom',
          path: ['field_summaries'],
          message:
            'Field summaries and solver diagnostics must be supplied together',
        });
      if (response.field_summaries) {
        const expectedSummaries = [
          ['pressure', datasets.get('pressure'), 'Pa*m2'],
          ['velocity_x', datasets.get('velocity_x'), 'm3/s'],
          ['velocity_y', datasets.get('velocity_y'), 'm3/s'],
        ] as Array<
          readonly [
            string,
            (typeof response.field_datasets)[number] | undefined,
            string,
          ]
        >;
        if (response.transport_diagnostics)
          expectedSummaries.push([
            'concentration',
            datasets.get('concentration'),
            'mol/m',
          ]);
        if (
          response.field_summaries.length !== expectedSummaries.length ||
          response.field_summaries.some((summary, index) => {
            const [fieldName, dataset, integralUnit] = expectedSummaries[index];
            return (
              summary.field_name !== fieldName ||
              summary.variable_id !== dataset?.variable_id ||
              summary.unit !== dataset?.unit ||
              summary.domain_tag !== dataset?.domain_tag ||
              summary.integral_unit !== integralUnit ||
              summary.sample_count !== response.mesh.node_count
            );
          })
        )
          context.addIssue({
            code: 'custom',
            path: ['field_summaries'],
            message:
              'Field summaries must bind the three exported Stokes fields and their units',
          });
      }
      const transport = response.transport_diagnostics;
      if (
        Boolean(transport) !== datasets.has('concentration') ||
        response.field_datasets.length !== (transport ? 4 : 3)
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_diagnostics'],
          message:
            'Concentration requires transport diagnostics and exactly four fields',
        });
      if (transport) {
        const rates = [
          transport.inlet_species_rate_mol_m_s_per_depth,
          transport.outlet_species_rate_mol_m_s_per_depth,
          transport.wall_species_rate_mol_m_s_per_depth,
        ];
        const budget = transport.species_budget;
        if (
          budget &&
          (budget.inlet_outward_rate !== rates[0] ||
            budget.outlet_outward_rate !== rates[1] ||
            budget.wall_outward_rate !== rates[2])
        )
          context.addIssue({
            code: 'custom',
            path: ['transport_diagnostics', 'species_budget'],
            message:
              'Species budget must use the measured outward boundary rates',
          });
        const balance = budget
          ? spatialSpeciesBudgetResidual(budget).relative
          : Math.abs(rates.reduce((sum, rate) => sum + rate, 0)) /
            Math.max(
              rates.reduce((sum, rate) => sum + Math.abs(rate), 0),
              1e-30,
            );
        const concentrationSummary = response.field_summaries?.find(
          (summary) => summary.field_name === 'concentration',
        );
        if (
          Math.abs(balance - transport.relative_species_balance) > 1e-12 ||
          concentrationSummary?.minimum !==
            transport.minimum_concentration_mol_m3 ||
          concentrationSummary?.maximum !==
            transport.maximum_concentration_mol_m3
        )
          context.addIssue({
            code: 'custom',
            path: ['transport_diagnostics'],
            message:
              'Transport balance and extrema must match measured fluxes and field summary',
          });
      }
      if (
        transport &&
        (transport.minimum_concentration_mol_m3 >
          transport.maximum_concentration_mol_m3 ||
          !response.field_summaries ||
          !response.solver_diagnostics)
      )
        context.addIssue({
          code: 'custom',
          path: ['transport_diagnostics'],
          message:
            'Transport requires valid extrema, summaries and direct solver diagnostics',
        });
      if (response.solver_diagnostics) {
        if (
          response.solver_diagnostics.length !== (transport ? 2 : 1) ||
          response.solver_diagnostics[0].solver_id !== 'stokes_saddle_point'
        )
          context.addIssue({
            code: 'custom',
            path: ['solver_diagnostics'],
            message:
              'Stokes and optional scalar solver diagnostics must be ordered and complete',
          });
        if (transport) {
          const scalar = response.solver_diagnostics[1];
          if (
            !scalar ||
            scalar.solver_id !== 'neutral_scalar_transport' ||
            scalar.iterations !== transport.linear_iterations ||
            scalar.converged_reason !== transport.linear_converged_reason
          )
            context.addIssue({
              code: 'custom',
              path: ['solver_diagnostics'],
              message:
                'Scalar solver diagnostics must match the transport solve',
            });
        }
        const [solver] = response.solver_diagnostics;
        if (
          solver.iterations !== response.diagnostics.linear_iterations ||
          solver.converged_reason !==
            response.diagnostics.linear_converged_reason
        )
          context.addIssue({
            code: 'custom',
            path: ['solver_diagnostics'],
            message: 'Solver diagnostics must match the Stokes solve outcome',
          });
      }
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
