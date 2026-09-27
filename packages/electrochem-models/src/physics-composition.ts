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
  const modulePlan = composeModules(
    activeModules,
    profile.spatialDimension,
  ).map((module) => ({
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
    : unsupportedConfiguration.length
      ? ['configuration_specific_mapping']
      : [];
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
