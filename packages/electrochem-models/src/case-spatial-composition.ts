import {
  caseSpatialRequestSchema,
  compileStructuredCellEquationGraph,
  structuredCellDomainMappingMatches,
  structuredCellRunAdmissionSchema,
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
  'hydraulics',
  'circuit',
  'continuous_interfaces',
] as const;
type RestrictedCellPhysics = (typeof RESTRICTED_CELL_PHYSICS)[number];

const BASE_RESTRICTED_CELL_PHYSICS: readonly RestrictedCellPhysics[] = [
  'trace_species_transport',
  'liquid_charge',
  'solid_charge',
  'electrode_reactions',
  'circuit',
  'continuous_interfaces',
];

const STACK_SELECTIONS = {
  reactor_architecture: {
    path: 'stack_blocks.reactor_architecture.architecture_type',
    read: (input: NormalizedCaseInput) =>
      input.stack_blocks.reactor_architecture.architecture_type,
  },
  anode_biofilm_support: {
    path: 'stack_blocks.anode_biofilm_support.material_family',
    read: (input: NormalizedCaseInput) =>
      input.stack_blocks.anode_biofilm_support.material_family,
  },
  cathode_catalyst_support: {
    path: 'stack_blocks.cathode_catalyst_support.catalyst_family',
    read: (input: NormalizedCaseInput) =>
      input.stack_blocks.cathode_catalyst_support.catalyst_family,
  },
  membrane_or_separator: {
    path: 'stack_blocks.membrane_or_separator.type',
    read: (input: NormalizedCaseInput) =>
      input.stack_blocks.membrane_or_separator.type,
  },
} as const;

type StackBlock = keyof typeof STACK_SELECTIONS;

function isUnresolvedSelection(value: string): boolean {
  return ['unknown', 'needs_classification'].includes(
    value.trim().toLowerCase(),
  );
}

export type CaseSpatialStackSelection = {
  stack_block: StackBlock;
  domain_tags: string[];
  selector_path: string;
  selector_value: string;
};

export type CaseSpatialComposition = {
  model_id: string;
  dimension: 1 | 2 | 3;
  status: 'ready' | 'insufficient_data' | 'not_implemented';
  missing_inputs: string[];
  missing_modules: string[];
  unsupported_configuration: string[];
  enabled_physics: RestrictedCellPhysics[];
  component_domains: NonNullable<CaseSpatialRequest['component_domains']>;
  stack_selections: CaseSpatialStackSelection[];
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
    enabled_physics: [],
    component_domains: [],
    stack_selections: [],
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
  const declaredPhysics = new Set([
    ...request.required_physics,
    ...(caseInput.mechanistic_model?.required_physics_modules ?? []),
  ]);
  out.missing_modules = [...declaredPhysics].filter(
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
  if (isUnresolvedSelection(architecture))
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
    if (!structuredCellRunAdmissionSchema.safeParse(request.input).success)
      out.unsupported_configuration.push(
        'input.hydraulics: new runs require the boundary-driven Darcy pressure solve; prescribed cell_pressure arrays remain read-compatible only',
      );
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

    out.enabled_physics = [
      ...BASE_RESTRICTED_CELL_PHYSICS,
      ...(request.input.hydraulics ? (['hydraulics'] as const) : []),
      ...(request.input.reactions.length
        ? (['homogeneous_reactions'] as const)
        : []),
    ];
    for (const physics of out.enabled_physics)
      if (!declaredPhysics.has(physics))
        out.missing_inputs.push(`required_physics:${physics}`);
    for (const physics of declaredPhysics) {
      if (
        (RESTRICTED_CELL_PHYSICS as readonly string[]).includes(physics) &&
        !out.enabled_physics.includes(physics as RestrictedCellPhysics)
      ) {
        if (physics === 'hydraulics')
          out.missing_inputs.push(
            'input.hydraulics: source-backed Darcy pressure and inlet conditions',
          );
        else
          out.unsupported_configuration.push(
            `required_physics_not_configured:${physics}`,
          );
      }
    }
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
  out.component_domains = request.input!.geometry.layers.map((layer) => {
    const mapping = request.component_domains!.find(
      (candidate) => candidate.domain_tag === layer.tag,
    );
    if (!mapping)
      throw new RangeError(`Case component mapping is missing ${layer.tag}`);
    return mapping;
  });
  const groupedDomains = new Map<StackBlock, string[]>();
  for (const mapping of out.component_domains) {
    const stackBlock = mapping.stack_block as StackBlock;
    groupedDomains.set(stackBlock, [
      ...(groupedDomains.get(stackBlock) ?? []),
      mapping.domain_tag,
    ]);
  }
  for (const [stackBlock, domainTags] of groupedDomains) {
    const selector = STACK_SELECTIONS[stackBlock];
    const value = selector.read(caseInput).trim();
    if (!value || isUnresolvedSelection(value))
      out.missing_inputs.push(selector.path);
    else
      out.stack_selections.push({
        stack_block: stackBlock,
        domain_tags: domainTags,
        selector_path: selector.path,
        selector_value: value,
      });
  }
  if (out.missing_inputs.length) {
    out.status = 'insufficient_data';
    return out;
  }
  out.input = request.input!;
  out.equation_graph = compileStructuredCellEquationGraph(out.input);
  out.status = 'ready';
  return out;
}
