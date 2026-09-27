import type {
  SpatialModelInput,
  SpatialModelInput as Input,
} from './spatial-model-schema';

/** Canonical descriptors; execution requires a matching, verified module. */
export type Domain = Input['geometry']['regions'][number];
export type Geometry = Input['geometry'];
export type MaterialField = Input['material_fields'][number];
export type Species = Input['species'][number];
export type BoundaryCondition = Input['boundary_conditions'][number];
export type InitialCondition = Input['initial_conditions'][number];
export type CircuitBoundary = Input['circuit'];
export type RequestedOutput = Input['requested_outputs'][number];

export interface ReactionLaw {
  id: string;
  equation_ref: string;
  domain_tags: string[];
  stoichiometry: Record<string, number>;
  electron_count: number;
  proton_count: number;
  parameter_ids: string[];
}

export interface TransportLaw {
  id: string;
  kind: 'diffusion' | 'convection_diffusion' | 'nernst_planck';
  species_ids: string[];
  domain_tags: string[];
  equation_ref: string;
  parameter_ids: string[];
}

export interface ChargeTransport {
  id: string;
  carrier: 'ionic' | 'electronic';
  domain_tags: string[];
  potential_variable: string;
  conductivity_parameter_id: string;
  equation_ref: string;
}

export interface SolverConfiguration {
  input: SpatialModelInput;
  nonlinear_tolerance: number;
  linear_tolerance: number;
  maximum_iterations: number;
  /** These values are caller supplied and cannot be inferred from the mesh. */
  time_step_s?: number;
}
