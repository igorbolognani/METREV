import {
  caseSpatialRequestSchema,
  compileStructuredCellEquationGraph,
  structuredCellDomainMappingMatches,
  type CaseSpatialRequest,
  type NormalizedCaseInput,
  type StructuredCellEquationGraph,
  type StructuredCellInput,
} from '@metrev/domain-contracts';

export const RESTRICTED_CELL_PHYSICS = [
  'trace_species_transport',
  'liquid_charge',
  'solid_charge',
  'electrode_reactions',
  'homogeneous_reactions',
  'circuit',
  'continuous_interfaces',
] as const;
export type CaseSpatialComposition = {
  model_id: string;
  dimension: 1 | 2 | 3;
  status: 'ready' | 'insufficient_data' | 'not_implemented';
  missing_inputs: string[];
  missing_modules: string[];
  unsupported_configuration: string[];
  equation_graph: StructuredCellEquationGraph | null;
  input: StructuredCellInput | null;
  decision_eligible: false;
};

/** Resolves exact case/stack selection; no parameters are inferred from the 0D model. */
export function resolveCaseSpatialComposition(
  caseInput: NormalizedCaseInput,
  candidate: CaseSpatialRequest,
): CaseSpatialComposition {
  const request = caseSpatialRequestSchema.parse(candidate);
  const out: CaseSpatialComposition = {
    model_id: request.model_id,
    dimension: request.dimension,
    status: 'not_implemented',
    missing_inputs: [],
    missing_modules: [],
    unsupported_configuration: [],
    equation_graph: null,
    input: null,
    decision_eligible: false,
  };
  if (
    request.model_id !== 'structured-cell-supporting-electrolyte-v1' ||
    ![2, 3].includes(request.dimension)
  ) {
    out.missing_modules.push('requested_profile_equation_assembly');
    return out;
  }
  out.missing_modules = request.required_physics.filter(
    (p) => !(RESTRICTED_CELL_PHYSICS as readonly string[]).includes(p),
  );
  const system =
    caseInput.technology_family === 'microbial_fuel_cell'
      ? 'MFC'
      : caseInput.technology_family === 'microbial_electrolysis_cell'
        ? 'MEC'
        : null;
  if (!system)
    out.unsupported_configuration.push('case_system_requires_MFC_or_MEC');
  const architecture =
    caseInput.stack_blocks.reactor_architecture.architecture_type;
  if (['needs_classification', 'unknown'].includes(architecture))
    out.missing_inputs.push(
      'stack_blocks.reactor_architecture.architecture_type: explicit planar declaration',
    );
  else if (!['planar', 'planar_layered_cell'].includes(architecture))
    out.unsupported_configuration.push('geometry_adapter:' + architecture);
  if (!request.input)
    out.missing_inputs.push(
      'input: complete source-backed spatial-cell-input-v1',
    );
  if (!request.component_domains)
    out.missing_inputs.push(
      'component_domains: explicit layer-to-stack mapping',
    );
  if (request.input) {
    if (request.input.case_context)
      throw new RangeError(
        'Case context is assigned by the authenticated service',
      );
    if (
      request.input.dimension !== request.dimension ||
      request.input.system !== system
    )
      out.unsupported_configuration.push(
        'input_identity_differs_from_requested_case_fidelity',
      );
    const present = request.input.geometry.layers.some(
      (l) => l.kind === 'membrane',
    );
    const separator = request.input.geometry.layers.some(
      (l) => l.kind === 'separator',
    );
    const declared =
      caseInput.stack_blocks.reactor_architecture.membrane_presence;
    if (declared === 'unknown')
      out.missing_inputs.push(
        'stack_blocks.reactor_architecture.membrane_presence',
      );
    else if ((declared === 'present') !== (present || separator))
      out.unsupported_configuration.push(
        'separator_presence_differs_from_case',
      );
  }
  if (out.missing_modules.length || out.unsupported_configuration.length)
    return out;
  if (out.missing_inputs.length) {
    out.status = 'insufficient_data';
    return out;
  }
  if (
    !structuredCellDomainMappingMatches(
      request.input!.geometry.layers,
      request.component_domains!,
    )
  )
    throw new RangeError(
      'Case component mapping must cover every layer with its compatible stack block',
    );
  out.input = request.input!;
  out.equation_graph = compileStructuredCellEquationGraph(out.input);
  out.status = 'ready';
  return out;
}
