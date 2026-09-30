import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { spatialSidecarRequestSchema } from '@metrev/domain-contracts';

const fixturePath = fileURLToPath(
  new URL('./planar-mesh-request.json', import.meta.url),
);
export const meshRequest = JSON.parse(readFileSync(fixturePath, 'utf8'));
export const canonicalRequest = spatialSidecarRequestSchema.parse(meshRequest);
export const requestDigest = createHash('sha256')
  .update(JSON.stringify(canonicalRequest))
  .digest('hex');
export const digestRequest = (request: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(spatialSidecarRequestSchema.parse(request)))
    .digest('hex');

export const q = (value: number, unit: string) => ({
  value,
  unit,
  source_kind: 'test_fixture',
  source_ref: 'test-fixture://spatial-v2',
});
export const copy = <T>(value: T): T => structuredClone(value);

export const validSpatialInput = () => ({
  contract_version: 'spatial-input-v2',
  model_id: 'biofilm-2d-electrode-research-v1',
  system: 'MFC',
  dimension: 2,
  coordinate_system: 'cartesian',
  axes: ['x', 'y'],
  geometry: copy(meshRequest.mesh),
  mesh: {
    kind: 'generated_mesh',
    uri: 'test-fixture://mesh-1.msh',
    sha256: 'a'.repeat(64),
    format: 'msh4',
    refinement_factor: 1,
    input_sha256: requestDigest,
    request: copy(meshRequest),
    sidecar_version: '0.1.0',
    gmsh_version: '4.15.2',
    physical_groups: {
      'region:anode': 1,
      'region:biofilm': 2,
      'region:liquid': 3,
      'boundary:anode_contact': 101,
      'boundary:outer_wall': 102,
      'boundary:inlet': 103,
      'boundary:outlet': 104,
      'interface:anode:biofilm': 202,
      'interface:biofilm:liquid': 203,
    },
    component_map: {
      anode: 'case/anode',
      biofilm: 'case/biofilm',
      liquid: 'case/reactor',
    },
    interfaces: [
      {
        tag: 'interface:anode:biofilm',
        from_tag: 'anode',
        to_tag: 'biofilm',
        normal: [1, 0],
      },
      {
        tag: 'interface:biofilm:liquid',
        from_tag: 'biofilm',
        to_tag: 'liquid',
        normal: [1, 0],
      },
    ],
  },
  material_fields: [
    {
      parameter_id: 'porosity',
      domain_tag: 'anode',
      field: { kind: 'constant', value: q(0.5, '1') },
    },
  ],
  species: [
    {
      id: 'substrate',
      valence: q(0, '1'),
      molecular_diffusivity: { kind: 'constant', value: q(1e-9, 'm2/s') },
    },
  ],
  variables: [
    {
      id: 'substrate_c',
      kind: 'species_concentration',
      species_id: 'substrate',
      domain_tags: ['biofilm', 'liquid'],
      unit: 'mol/m3',
    },
    {
      id: 'phi_s',
      kind: 'solid_potential',
      domain_tags: ['anode', 'biofilm'],
      unit: 'V',
    },
    {
      id: 'temperature',
      kind: 'temperature',
      domain_tags: ['anode', 'biofilm', 'liquid'],
      unit: 'K',
    },
  ],
  reaction_laws: [],
  initial_conditions: [
    {
      variable: 'substrate_c',
      domain_tag: 'liquid',
      field: {
        kind: 'sampled',
        interpolation: 'linear',
        samples: [
          { position_m: [0.004, 0.002], value: q(1, 'mol/m3') },
          { position_m: [0.008, 0.008], value: q(1.2, 'mol/m3') },
        ],
      },
    },
  ],
  boundary_conditions: [
    {
      kind: 'dirichlet',
      tag: 'outer_wall',
      variable: 'substrate_c',
      value: q(1, 'mol/m3'),
    },
    {
      kind: 'interface_continuity',
      tag: 'interface:biofilm:liquid',
      variable: 'substrate_c',
    },
    { kind: 'circuit_coupling', tag: 'anode_contact', variable: 'phi_s' },
  ],
  circuit: { kind: 'external_load', resistance: q(1000, 'ohm') },
  requested_outputs: ['substrate_c', 'phi_s'],
});

export const stokesChannelInput = () => {
  const candidate = validSpatialInput();
  candidate.geometry.layers = [candidate.geometry.layers[2]];
  candidate.geometry.boundaries.left = { tag: 'west', role: 'wall' };
  candidate.geometry.boundaries.right = { tag: 'east', role: 'wall' };
  candidate.mesh.request.mesh = copy(candidate.geometry);
  candidate.mesh.input_sha256 = digestRequest(candidate.mesh.request);
  candidate.mesh.physical_groups = {
    'region:liquid': 1,
    'boundary:west': 101,
    'boundary:east': 102,
    'boundary:inlet': 103,
    'boundary:outlet': 104,
  };
  candidate.mesh.component_map = { liquid: 'case/reactor' };
  candidate.mesh.interfaces = [];
  candidate.material_fields = [
    {
      parameter_id: 'dynamic_viscosity_pa_s',
      domain_tag: 'liquid',
      field: { kind: 'constant', value: q(1e-3, 'Pa*s') },
    },
  ];
  candidate.species = [];
  candidate.reaction_laws = [];
  candidate.variables = [
    { id: 'p', kind: 'pressure', domain_tags: ['liquid'], unit: 'Pa' },
    { id: 'ux', kind: 'velocity_x', domain_tags: ['liquid'], unit: 'm/s' },
    { id: 'uy', kind: 'velocity_y', domain_tags: ['liquid'], unit: 'm/s' },
  ];
  candidate.initial_conditions = [];
  candidate.boundary_conditions = [];
  candidate.requested_outputs = ['p', 'ux', 'uy'];
  return {
    ...candidate,
    stokes_development: {
      regime: 'steady_stokes',
      equation_ref: 'EQ-FL-002',
      domain_tag: 'liquid',
      viscosity_parameter_id: 'dynamic_viscosity_pa_s',
      pressure_variable: 'p',
      velocity_variables: { x: 'ux', y: 'uy' },
      wall_tags: ['west', 'east'],
      inlet: { tag: 'inlet', traction_pa: [q(0, 'Pa'), q(1, 'Pa')] },
      outlet: { tag: 'outlet', traction_pa: [q(0, 'Pa'), q(0, 'Pa')] },
    },
  };
};

export const darcyPorousInput = () => {
  const candidate = stokesChannelInput();
  candidate.geometry.layers[0] = {
    ...candidate.geometry.layers[0],
    tag: 'porous',
    kind: 'biofilm',
    component_id: 'case/biofilm',
  };
  candidate.geometry.boundaries = {
    left: { tag: 'west', role: 'inlet' },
    right: { tag: 'east', role: 'outlet' },
    top: { tag: 'north', role: 'wall' },
    bottom: { tag: 'south', role: 'wall' },
  };
  candidate.mesh.request.mesh = copy(candidate.geometry);
  candidate.mesh.input_sha256 = digestRequest(candidate.mesh.request);
  candidate.mesh.physical_groups = {
    'region:porous': 1,
    'boundary:west': 101,
    'boundary:east': 102,
    'boundary:south': 103,
    'boundary:north': 104,
  };
  candidate.mesh.component_map = { porous: 'case/biofilm' };
  candidate.mesh.interfaces = [];
  candidate.material_fields = [
    {
      parameter_id: 'dynamic_viscosity_pa_s',
      domain_tag: 'porous',
      field: { kind: 'constant', value: q(1e-3, 'Pa*s') },
    },
    {
      parameter_id: 'hydraulic_permeability_m2',
      domain_tag: 'porous',
      field: { kind: 'constant', value: q(1e-10, 'm2') },
    },
  ];
  candidate.variables = [
    { id: 'p', kind: 'pressure', domain_tags: ['porous'], unit: 'Pa' },
    { id: 'ux', kind: 'velocity_x', domain_tags: ['porous'], unit: 'm/s' },
    { id: 'uy', kind: 'velocity_y', domain_tags: ['porous'], unit: 'm/s' },
  ];
  candidate.initial_conditions = [];
  candidate.boundary_conditions = [];
  candidate.requested_outputs = ['p', 'ux', 'uy'];
  const { stokes_development: unusedStokesSetup, ...porousCandidate } =
    candidate;
  void unusedStokesSetup;
  return {
    ...porousCandidate,
    darcy_development: {
      regime: 'steady_darcy',
      equation_ref: 'EQ-FL-003',
      domain_tag: 'porous',
      viscosity_parameter_id: 'dynamic_viscosity_pa_s',
      permeability_parameter_id: 'hydraulic_permeability_m2',
      pressure_variable: 'p',
      velocity_variables: { x: 'ux', y: 'uy' },
      inlet: { tag: 'west', pressure_pa: q(10, 'Pa') },
      outlet: { tag: 'east', pressure_pa: q(0, 'Pa') },
    },
  };
};

export const darcyTransportInput = () => {
  const input = darcyPorousInput();
  input.species = [
    {
      id: 'neutral_tracer',
      valence: q(0, '1'),
      molecular_diffusivity: {
        kind: 'constant',
        value: q(1e-9, 'm2/s'),
      },
      effective_diffusivity: {
        kind: 'constant',
        value: q(1e-9, 'm2/s'),
      },
    },
  ];
  input.variables.push({
    id: 'neutral_tracer_c',
    kind: 'species_concentration',
    species_id: 'neutral_tracer',
    domain_tags: ['porous'],
    unit: 'mol/m3',
  });
  input.requested_outputs.push('neutral_tracer_c');
  return {
    ...input,
    darcy_transport_development: {
      regime: 'steady_advection_diffusion' as const,
      equation_ref: 'EQ-SP-001' as const,
      domain_tag: 'porous',
      species_id: 'neutral_tracer',
      concentration_variable: 'neutral_tracer_c',
      velocity_variables: { x: 'ux', y: 'uy' },
      inlet: { tag: 'west', concentration_mol_m3: q(2, 'mol/m3') },
      outlet: { tag: 'east', concentration_mol_m3: q(1, 'mol/m3') },
    },
  };
};
