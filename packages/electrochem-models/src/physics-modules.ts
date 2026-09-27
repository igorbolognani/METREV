/** Dependencies describe composition, not a claim that an equation has been solved. */
export interface PhysicsModule {
  id: string;
  requires: string[];
  supportedDimensions: (0 | 1 | 2 | 3)[];
  requiredDomains: string[];
  requiredParameters: string[];
  stateVariables: string[];
  boundaryRequirements: string[];
  equationRefs: string[];
  outputs: string[];
}

export const PHYSICS_MODULES: Readonly<Record<string, PhysicsModule>> = {
  reactor: {
    id: 'reactor',
    requires: [],
    supportedDimensions: [0, 1],
    requiredDomains: ['bulk_liquid'],
    requiredParameters: ['geometry', 'operation'],
    stateVariables: ['substrate'],
    boundaryRequirements: ['inlet', 'outlet'],
    equationRefs: ['coupled-cell-1d', 'coupled-0d-dae'],
    outputs: ['substrate'],
  },
  anode: {
    id: 'anode',
    requires: ['reactor'],
    supportedDimensions: [0, 1],
    requiredDomains: ['anode'],
    requiredParameters: ['anode_material', 'anode_area'],
    stateVariables: ['anode_current'],
    boundaryRequirements: ['anode_interface'],
    equationRefs: ['coupled-cell-1d', 'coupled-0d-dae'],
    outputs: ['current'],
  },
  biofilm: {
    id: 'biofilm',
    requires: ['anode'],
    supportedDimensions: [0, 1],
    requiredDomains: ['biofilm'],
    requiredParameters: ['biomass', 'kinetics'],
    stateVariables: ['biofilm_substrate'],
    boundaryRequirements: ['biofilm_interface'],
    equationRefs: ['coupled-cell-1d', 'coupled-0d-dae'],
    outputs: ['uptake'],
  },
  cathode: {
    id: 'cathode',
    requires: ['reactor'],
    supportedDimensions: [0, 1],
    requiredDomains: ['cathode'],
    requiredParameters: ['cathode_material'],
    stateVariables: ['cathode_current'],
    boundaryRequirements: ['cathode_interface'],
    equationRefs: ['coupled-cell-1d', 'coupled-0d-dae'],
    outputs: ['current'],
  },
  circuit: {
    id: 'circuit',
    requires: ['anode', 'cathode'],
    supportedDimensions: [0, 1],
    requiredDomains: [],
    requiredParameters: ['external_load_or_applied_voltage'],
    stateVariables: ['cell_current'],
    boundaryRequirements: ['terminal_potential'],
    equationRefs: ['coupled-cell-1d', 'coupled-0d-dae'],
    outputs: ['current', 'power'],
  },
  membrane_or_separator: {
    id: 'membrane_or_separator',
    requires: ['reactor'],
    supportedDimensions: [0, 1],
    requiredDomains: ['membrane_or_separator'],
    requiredParameters: ['membrane_properties'],
    stateVariables: ['ionic_flux'],
    boundaryRequirements: ['two_interfaces'],
    equationRefs: ['membrane-ion-1d', 'coupled-0d-dae'],
    outputs: ['ionic_flux'],
  },
  hydraulics: {
    id: 'hydraulics',
    requires: ['reactor'],
    supportedDimensions: [],
    requiredDomains: ['bulk_liquid'],
    requiredParameters: ['density', 'viscosity', 'flow_boundary'],
    stateVariables: ['velocity', 'pressure'],
    boundaryRequirements: ['inlet', 'outlet', 'wall'],
    equationRefs: [],
    outputs: ['velocity', 'pressure'],
  },
  hydrogen_accounting: {
    id: 'hydrogen_accounting',
    requires: ['cathode', 'circuit'],
    supportedDimensions: [0, 1],
    requiredDomains: ['cathode'],
    requiredParameters: ['faradaic_efficiency'],
    stateVariables: [],
    boundaryRequirements: [],
    equationRefs: ['coupled-0d-dae', 'coupled-cell-1d'],
    outputs: ['hydrogen_accounting'],
  },
  sensor: {
    id: 'sensor',
    requires: ['circuit'],
    supportedDimensions: [0],
    requiredDomains: [],
    requiredParameters: ['sensor_calibration'],
    stateVariables: [],
    boundaryRequirements: [],
    equationRefs: ['coupled-0d-dae'],
    outputs: ['signal'],
  },
  gas: {
    id: 'gas',
    requires: ['reactor'],
    supportedDimensions: [],
    requiredDomains: ['gas'],
    requiredParameters: ['gas_transfer'],
    stateVariables: ['dissolved_gas'],
    boundaryRequirements: ['gas_interface'],
    equationRefs: [],
    outputs: ['gas_flux'],
  },
  thermal: {
    id: 'thermal',
    requires: ['reactor'],
    supportedDimensions: [],
    requiredDomains: ['bulk_liquid'],
    requiredParameters: ['heat_capacity', 'thermal_conductivity'],
    stateVariables: ['temperature'],
    boundaryRequirements: ['thermal_boundary'],
    equationRefs: [],
    outputs: ['temperature'],
  },
};

export interface ComposedModule extends PhysicsModule {
  executableAtFidelity: boolean;
}

export function composeModules(
  ids: string[],
  dimension: 0 | 1 | 2 | 3,
): ComposedModule[] {
  const ordered: ComposedModule[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    const module = PHYSICS_MODULES[id];
    if (!module || visiting.has(id))
      throw new RangeError(`Invalid physics module dependency: ${id}`);
    visiting.add(id);
    for (const dependency of module.requires) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    ordered.push({
      ...module,
      executableAtFidelity: module.supportedDimensions.includes(dimension),
    });
  };
  ids.forEach(visit);
  return ordered;
}
