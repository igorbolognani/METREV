import { MODEL_FIDELITY_PROFILES } from './model-fidelity-catalog';
import { composeModules, type ComposedModule } from './physics-modules';

export type StackPhysicsSelection = {
  modelId: string;
  system: 'MFC' | 'MEC' | 'biosensor';
  architecture?: string;
  separator?: string;
};

export type PhysicsComposition = {
  modelId: string;
  status: 'executable' | 'case_runner_development' | 'not_implemented';
  activeModules: string[];
  missingModules: string[];
  missingInputs: string[];
  unsupportedConfiguration: string[];
  note: string;
  modulePlan: ComposedModule[];
};

/**
 * Selection and capability boundary shared by API and workbench. This is a
 * composition/eligibility resolver, not a spatial equation graph or PDE solve.
 */
export function resolvePhysicsComposition(
  selection: StackPhysicsSelection,
): PhysicsComposition {
  const profile = MODEL_FIDELITY_PROFILES.find(
    (candidate) => candidate.id === selection.modelId,
  );
  if (!profile)
    return {
      modelId: selection.modelId,
      status: 'not_implemented',
      activeModules: [],
      missingModules: ['unknown_model_profile'],
      missingInputs: [],
      unsupportedConfiguration: [],
      note: 'Unknown model ID; no fallback was executed.',
      modulePlan: [],
    };

  const activeModules = [
    'reactor',
    'anode',
    'biofilm',
    'cathode',
    'circuit',
    ...(selection.separator && selection.separator !== 'membrane-free'
      ? ['membrane_or_separator']
      : []),
    ...(selection.architecture === 'flow-through' ||
    selection.architecture === 'upflow'
      ? ['hydraulics']
      : []),
    ...(selection.system === 'MEC' ? ['hydrogen_accounting'] : []),
    ...(selection.system === 'biosensor' ? ['sensor'] : []),
  ];
  const unsupportedConfiguration: string[] = [];
  if (!profile.systems.includes(selection.system))
    unsupportedConfiguration.push(`system:${selection.system}`);
  if (selection.modelId === 'coupled-0d-dae-v1') {
    if (selection.architecture && selection.architecture !== 'unspecified')
      unsupportedConfiguration.push(
        `architecture:${selection.architecture}:unresolved_in_0d`,
      );
    if (selection.separator && selection.separator !== 'unspecified')
      unsupportedConfiguration.push(
        `separator:${selection.separator}:unresolved_in_0d`,
      );
  }
  if (selection.modelId === 'coupled-cell-1d-restricted-v1') {
    if (selection.architecture && selection.architecture !== 'planar')
      unsupportedConfiguration.push(
        `architecture:${selection.architecture}:requires_planar`,
      );
    if (selection.separator && selection.separator !== 'binary-electroneutral')
      unsupportedConfiguration.push(
        `separator:${selection.separator}:requires_binary_electroneutral`,
      );
  }

  const researchOnly = profile.status === 'research_profile_only';
  let composedModulePlan: ComposedModule[];
  try {
    composedModulePlan = composeModules(
      activeModules,
      profile.spatialDimension,
    );
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : 'Unknown module graph error';
    return {
      modelId: profile.id,
      status: 'not_implemented',
      activeModules,
      missingModules: [
        'configuration_specific_mapping',
        'unresolved_module_dependency',
      ],
      missingInputs: profile.requiredSpatialInputs,
      unsupportedConfiguration: [
        ...unsupportedConfiguration,
        `module_graph:${detail}`,
      ],
      note: `The selected stack's physics-module graph could not be resolved: ${detail}`,
      modulePlan: [],
    };
  }
  const composedById = new Map(
    composedModulePlan.map((module) => [module.id, module]),
  );
  const moduleMappingBlockers = composedModulePlan.flatMap((module) => {
    const blockers: string[] = [];
    if (!module.supportedDimensions.includes(profile.spatialDimension))
      blockers.push(
        `module:${module.id}:unsupported_dimension_${profile.spatialDimension}d`,
      );
    if (module.equationRefs.length === 0)
      blockers.push(`module:${module.id}:missing_equation_mapping`);
    const unmappedDependencies = module.requires.filter(
      (dependency) =>
        composedById.get(dependency)?.executableAtFidelity !== true,
    );
    if (unmappedDependencies.length > 0)
      blockers.push(
        `module:${module.id}:unmapped_dependencies:${unmappedDependencies.join(',')}`,
      );
    return blockers;
  });
  unsupportedConfiguration.push(...moduleMappingBlockers);
  const modulePlan = composedModulePlan.map((module) => ({
    ...module,
    executableAtFidelity:
      !researchOnly &&
      unsupportedConfiguration.length === 0 &&
      module.executableAtFidelity,
  }));
  const missingModules = researchOnly
    ? profile.spatialDimension >= 2
      ? [
          'spatial_geometry_mesh',
          'spatial_flow',
          'species_charge_reaction_pde',
          'interface_circuit_coupling',
          'numerical_verification',
          'async_product_runtime',
        ]
      : [
          'profile_specific_equations',
          'numerical_runtime',
          'product_integration',
        ]
    : [];
  if (unsupportedConfiguration.length > 0) {
    if (!missingModules.includes('configuration_specific_mapping'))
      missingModules.push('configuration_specific_mapping');
    for (const id of new Set(
      moduleMappingBlockers.map((blocker) => blocker.split(':')[1]),
    )) {
      if (id && !missingModules.includes(`module_mapping:${id}`))
        missingModules.push(`module_mapping:${id}`);
    }
  }
  return {
    modelId: profile.id,
    status:
      profile.status === 'research_profile_only' ||
      unsupportedConfiguration.length
        ? 'not_implemented'
        : profile.status,
    activeModules,
    missingModules,
    missingInputs: profile.requiredSpatialInputs,
    unsupportedConfiguration,
    note: researchOnly
      ? 'Catalog declaration only; the requested fidelity has no executable solver.'
      : unsupportedConfiguration.length
        ? 'The selected stack has no implemented mapping to this fidelity.'
        : profile.boundaryNote,
    modulePlan,
  };
}
