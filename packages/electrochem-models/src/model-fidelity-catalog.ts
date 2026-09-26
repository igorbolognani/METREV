export type SpatialDimension = 0 | 1 | 2 | 3;
export type ModelResolutionScale = 'macro' | 'micro' | 'nano';
export type ModelFidelityStatus = 'executable' | 'research_profile_only';

export interface ModelFidelityProfile {
  id: string;
  title: string;
  spatialDimension: SpatialDimension;
  temporal: boolean;
  scales: ModelResolutionScale[];
  status: ModelFidelityStatus;
  systems: Array<'MFC' | 'MEC' | 'biosensor'>;
  phenomena: string[];
  requiredComponentParameters: string[];
  requiredSpatialInputs: string[];
  requiredGroups: string[];
  referenceDois: string[];
  boundaryNote: string;
  limitation: string;
}

/**
 * Resolution inventory, not a claim that every listed formulation is present
 * in the solver. Only the coupled isothermal lumped model is executable.
 */
export const MODEL_FIDELITY_PROFILES: ModelFidelityProfile[] = [
  {
    id: 'coupled-0d-dae-v1',
    title: 'Lumped reactor · transient 0D',
    spatialDimension: 0,
    temporal: true,
    scales: ['macro'],
    status: 'executable',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'COD and electroactive biomass inventories',
      'Anode and cathode pH balances',
      'MFC cathode oxygen-transfer limitation',
      'Butler–Volmer electrode kinetics and lumped ohmic losses',
      'MFC external load or MEC applied-voltage boundary',
      'MEC gross and captured hydrogen accounting',
    ],
    requiredComponentParameters: [],
    requiredSpatialInputs: [],
    requiredGroups: [
      'reactor_geometry',
      'electrode_materials',
      'operation_and_feed',
      'lumped_biology',
      'electrochemistry_and_circuit',
    ],
    referenceDois: [
      '10.1016/j.biortech.2010.06.156',
      '10.1016/j.jpowsour.2009.06.101',
      '10.3182/20110828-6-IT-1002.01636',
    ],
    boundaryNote:
      'Each compartment is well mixed and isothermal. Batch and continuous mixed-flow profiles use the same state equations with different flow boundaries.',
    limitation:
      'This model has no spatial gradients, resolved biofilm thickness, pore transport, stack network, thermal field, or gas-transfer/crossover model.',
  },
  {
    id: 'biofilm-1d-direct-transfer-research-v1',
    title: 'Biofilm depth and direct electron transfer · 1D micro',
    spatialDimension: 1,
    temporal: true,
    scales: ['micro'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Substrate and ion diffusion through biofilm depth',
      'Biomass growth and decay by position',
      'Local pH and redox gradients',
      'Biofilm matrix electron conduction and cell-to-matrix transfer',
      'Heterogeneous charge transfer at the electrode interface',
    ],
    requiredComponentParameters: [
      'operational_biology.biofilm_thickness_m',
      'operational_biology.effective_substrate_diffusivity_m2_s',
      'operational_biology.biofilm_conductivity_s_m',
      'anode_biofilm_support.porosity',
      'anode_biofilm_support.specific_surface_area_m2_m3',
    ],
    requiredSpatialInputs: [
      'biofilm-depth coordinate and physical thickness',
      'substrate, ion, and potential boundary conditions at liquid and electrode interfaces',
      'mesh element count, refinement study, and residual convergence criterion',
    ],
    requiredGroups: [
      'biofilm_geometry',
      'species_diffusivities_and_boundary_fluxes',
      'local_biofilm_kinetics',
      'biofilm_conductivity_and_electron_transfer',
      'electrode_boundary_conditions',
      'mesh_and_convergence_evidence',
    ],
    referenceDois: [
      '10.1002/bit.21533',
      '10.1016/j.watres.2007.04.009',
      '10.1016/j.bioelechem.2015.03.010',
    ],
    boundaryNote:
      'The coordinate is declared as biofilm depth; the bulk-liquid boundary and electrode interface require separate flux and potential conditions.',
    limitation:
      'The runtime contains no spatial biofilm mesh, local transport equations, or direct-transfer field solver.',
  },
  {
    id: 'biofilm-2d-electrode-research-v1',
    title: 'Liquid flow and spatial biofilm · 2D macro + micro',
    spatialDimension: 2,
    temporal: true,
    scales: ['macro', 'micro'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Convection across the electrode plane and transport into the biofilm',
      'Spatially varying species, pH, biomass, charge, and current density',
      'Electromigration when ionic gradients require it',
      'Geometry-dependent anode and biofilm performance',
    ],
    requiredComponentParameters: [
      'reactor_architecture.reactor_length_m',
      'reactor_architecture.reactor_width_m',
      'anode_biofilm_support.thickness_m',
      'anode_biofilm_support.porosity',
      'operational_biology.effective_substrate_diffusivity_m2_s',
      'operational_biology.biofilm_conductivity_s_m',
    ],
    requiredSpatialInputs: [
      'two declared coordinates and resolved phase geometry',
      'inlet, outlet, electrode, and liquid/biofilm interface conditions',
      'mesh count, mesh-refinement comparison, and nonlinear convergence criteria',
    ],
    requiredGroups: [
      'reactor_and_flow_geometry',
      'electrode_plane_and_biofilm_geometry',
      'species_transport_and_ionic_migration',
      'microbial_populations_and_kinetics',
      'charge_transfer_and_electrical_boundaries',
      'mesh_convergence_and_condition_matched_observations',
    ],
    referenceDois: [
      '10.1016/j.bioelechem.2009.04.009',
      '10.1016/j.watres.2007.04.009',
    ],
    boundaryNote:
      'The two axes and phases must be declared for each case; published MFC formulations use differing electron-transfer, guild, pH, and gas assumptions.',
    limitation:
      'METREV has no 2D coupled flow, species, charge, or biofilm PDE implementation.',
  },
  {
    id: 'cell-3d-multiphysics-research-v1',
    title:
      'Cell-scale coupled flow, transport, and electric fields · 3D macro + micro',
    spatialDimension: 3,
    temporal: true,
    scales: ['macro', 'micro'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Three-dimensional hydrodynamics and species transport',
      'Spatial ionic/electronic potential and current distributions',
      'Biofilm growth and local electrochemical reaction rates',
      'Gas or product boundaries when relevant to the selected system',
    ],
    requiredComponentParameters: [
      'reactor_architecture.reactor_length_m',
      'reactor_architecture.reactor_width_m',
      'reactor_architecture.reactor_height_m',
      'reactor_architecture.electrode_gap_m',
      'reactor_architecture.liquid_flow_m3_s',
      'anode_biofilm_support.solid_conductivity_s_m',
      'anode_biofilm_support.porosity',
      'cathode_catalyst_support.effective_diffusivity_m2_s',
      'membrane_or_separator.ionic_conductivity_s_m',
      'operational_biology.effective_substrate_diffusivity_m2_s',
    ],
    requiredSpatialInputs: [
      'three declared spatial coordinates and fluid/solid/biofilm domain geometry',
      'inlet, outlet, wall, electrode, and product boundary conditions',
      'mesh independence, solver convergence, and condition-matched comparison observations',
    ],
    requiredGroups: [
      'three_dimensional_geometry_and_mesh',
      'inlet_outlet_walls_and_flow_boundaries',
      'fluid_and_species_properties',
      'electrode_biofilm_and_material_fields',
      'local_kinetics_and_charge_transfer',
      'mesh_independence_solver_convergence_and_independent_comparison',
    ],
    referenceDois: [
      '10.1016/j.bej.2020.107714',
      '10.1016/j.jece.2021.105476',
      '10.1016/j.camwa.2019.11.019',
      '10.1016/j.jpowsour.2020.229432',
    ],
    boundaryNote:
      'Three spatial dimensions still require a time scheme, constitutive laws, mesh, and case-specific boundary conditions; space and time are separate axes.',
    limitation:
      'No 3D mesh, Navier–Stokes, Nernst–Planck, porous-media, or distributed charge solver is implemented or verified in METREV.',
  },
  {
    id: 'stack-network-macro-research-v1',
    title: 'Stack cells and manifolds · macro network',
    spatialDimension: 0,
    temporal: true,
    scales: ['macro'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Cell-to-cell circuit topology, series/parallel links, and shunts',
      'Hydraulic manifold flow distribution and cell variation',
      'Explicit auxiliary loads and per-cell observation coverage',
    ],
    requiredComponentParameters: [
      'reactor_architecture.cell_count',
      'electrical_interconnect_and_sealing.contact_resistance_ohm',
      'balance_of_plant.recirculation_flow_m3_s',
      'balance_of_plant.auxiliary_power_w',
    ],
    requiredSpatialInputs: [
      'explicit per-cell electrical and hydraulic connection graph',
      'per-cell parameters or a source-backed distribution model',
      'measured cell and manifold flows plus auxiliary-load accounting',
    ],
    requiredGroups: [
      'cell_count_and_per_cell_state',
      'electrical_graph_and_contact_resistances',
      'manifold_geometry_and_flow_distribution',
      'auxiliary_loads_and_cell_level_observations',
    ],
    referenceDois: [
      '10.1016/j.jenvman.2018.03.007',
      '10.1186/s13068-019-1368-0',
    ],
    boundaryNote:
      'A stack is a connected network of cells and fluid paths; it is not a 1D/2D/3D continuum model.',
    limitation:
      'The METREV executable model represents one cell and has no network or manifold equations.',
  },
  {
    id: 'porous-electrode-micro-3d-research-v1',
    title: 'Pores, fibers, and attached biofilm · 3D micro',
    spatialDimension: 3,
    temporal: true,
    scales: ['micro'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Pore-solution diffusion and convective access',
      'Heterogeneous biofilm growth and substrate limitation',
      'Pore-size-dependent biomass, electroactivity, and effective properties',
      'Upscaling from local fluxes to electrode-scale response',
    ],
    requiredComponentParameters: [
      'anode_biofilm_support.mean_pore_diameter_m',
      'anode_biofilm_support.porosity',
      'anode_biofilm_support.tortuosity',
      'anode_biofilm_support.specific_surface_area_m2_m3',
      'operational_biology.biofilm_thickness_m',
      'operational_biology.effective_substrate_diffusivity_m2_s',
      'operational_biology.biofilm_conductivity_s_m',
    ],
    requiredSpatialInputs: [
      'resolved or imaged pore/fiber geometry and wetting state',
      'local flow and species/electron boundary conditions',
      'mesh convergence and documented local-to-electrode upscaling map',
    ],
    requiredGroups: [
      'pore_or_fiber_geometry_distribution',
      'porosity_tortuosity_and_effective_diffusivity',
      'wetting_and_local_flow',
      'biofilm_properties_and_local_kinetics',
      'declared_upscaling_or_homogenization_map',
    ],
    referenceDois: [
      '10.1016/j.scitotenv.2023.165448',
      '10.1021/acsestwater.4c00849',
      '10.1016/j.electacta.2026.148494',
    ],
    boundaryNote:
      'Projected geometric area and nominal porosity do not determine local accessible area, flow, or biofilm state.',
    limitation:
      'No pore-resolved field, imaging-to-mesh pipeline, or homogenization implementation exists in the runtime.',
  },
  {
    id: 'electrode-interface-nano-research-v1',
    title: 'Catalyst and electrode interface · nano-informed properties',
    spatialDimension: 0,
    temporal: false,
    scales: ['nano'],
    status: 'research_profile_only',
    systems: ['MFC', 'MEC'],
    phenomena: [
      'Nanostructured feature size and material identity',
      'Electrochemically active area, catalyst loading, and interfacial kinetics',
      'Protocol- and electrolyte-specific catalyst response',
    ],
    requiredComponentParameters: [
      'cathode_catalyst_support.catalyst_feature_size_m',
      'cathode_catalyst_support.catalyst_loading_kg_m2',
      'cathode_catalyst_support.electroactive_area_factor',
      'cathode_catalyst_support.exchange_current_density_a_m2',
      'anode_biofilm_support.roughness_factor',
    ],
    requiredSpatialInputs: [
      'material identity, synthesis batch, and nano/microstructure measurement method',
      'electrochemically active surface area and reference-electrode protocol',
      'electrolyte, pH, potential window, and condition-matched kinetic data',
    ],
    requiredGroups: [
      'material_identity_and_batch',
      'feature_size_and_loading',
      'electrochemically_active_surface_area',
      'reference_electrode_and_test_protocol',
      'electrolyte_specific_interfacial_kinetics',
    ],
    referenceDois: [
      '10.1016/j.electacta.2018.01.118',
      '10.1021/nn402103q',
      '10.1002/elsa.202000002',
    ],
    boundaryNote:
      'Nano refers to measured/declared surface features and material-specific interface properties, not a generic atomic solver.',
    limitation:
      'METREV does not calculate atomic structure, active-site chemistry, adsorption, or universal nano-kinetics from a material-family label.',
  },
];

export interface ComponentModelParameterSpec {
  id: string;
  unit: string;
  scales: ModelResolutionScale[];
  spatialRole: string;
}

export interface ComponentModelGroupSpec {
  id: string;
  title: string;
  parameters: ComponentModelParameterSpec[];
}

const parameter = (
  id: string,
  unit: string,
  scales: ModelResolutionScale[],
  spatialRole: string,
): ComponentModelParameterSpec => ({ id, unit, scales, spatialRole });

/** Quantitative property vocabulary; each supplied entry must carry source provenance. */
export const COMPONENT_MODEL_PARAMETER_GROUPS: ComponentModelGroupSpec[] = [
  {
    id: 'reactor_architecture',
    title: 'Reactor, chambers, and flow paths',
    parameters: [
      parameter(
        'anode_chamber_volume_m3',
        'm3',
        ['macro'],
        'compartment inventory',
      ),
      parameter(
        'cathode_chamber_volume_m3',
        'm3',
        ['macro'],
        'compartment inventory',
      ),
      parameter(
        'reactor_length_m',
        'm',
        ['macro'],
        'x geometry and axial flow domain',
      ),
      parameter(
        'reactor_width_m',
        'm',
        ['macro'],
        'y geometry and transverse flow domain',
      ),
      parameter(
        'reactor_height_m',
        'm',
        ['macro'],
        'z geometry and vertical flow domain',
      ),
      parameter('electrode_gap_m', 'm', ['macro'], 'ionic path length'),
      parameter(
        'liquid_flow_m3_s',
        'm3/s',
        ['macro'],
        'inlet/outlet and residence-time boundary',
      ),
      parameter('pressure_drop_pa', 'Pa', ['macro'], 'hydraulic loss'),
      parameter('cell_count', '1', ['macro'], 'network cardinality'),
    ],
  },
  {
    id: 'anode_biofilm_support',
    title: 'Anode, current collector, and biofilm support',
    parameters: [
      parameter(
        'projected_area_m2',
        'm2',
        ['macro'],
        'geometric electrode boundary',
      ),
      parameter(
        'electroactive_area_factor',
        '1',
        ['macro', 'micro'],
        'projected-to-effective area mapping',
      ),
      parameter(
        'thickness_m',
        'm',
        ['macro', 'micro'],
        'electrode or biofilm depth, identify which',
      ),
      parameter('porosity', '1', ['micro'], 'pore volume fraction'),
      parameter(
        'mean_pore_diameter_m',
        'm',
        ['micro'],
        'pore transport length scale',
      ),
      parameter(
        'specific_surface_area_m2_m3',
        'm2/m3',
        ['micro'],
        'internal area per porous-electrode volume',
      ),
      parameter(
        'solid_conductivity_s_m',
        'S/m',
        ['macro', 'micro'],
        'distributed solid-phase conduction',
      ),
      parameter(
        'tortuosity',
        '1',
        ['micro'],
        'effective transport path correction',
      ),
      parameter(
        'roughness_factor',
        '1',
        ['micro', 'nano'],
        'measured interfacial roughness mapping',
      ),
      parameter(
        'wetting_contact_angle_deg',
        'degree',
        ['micro', 'nano'],
        'wettability boundary',
      ),
    ],
  },
  {
    id: 'cathode_catalyst_support',
    title: 'Cathode, catalyst, gas/liquid interface',
    parameters: [
      parameter(
        'projected_area_m2',
        'm2',
        ['macro'],
        'geometric reaction boundary',
      ),
      parameter(
        'catalyst_loading_kg_m2',
        'kg/m2',
        ['micro', 'nano'],
        'catalyst mass per projected area',
      ),
      parameter(
        'electroactive_area_factor',
        '1',
        ['macro', 'micro'],
        'projected-to-effective area mapping',
      ),
      parameter(
        'exchange_current_density_a_m2',
        'A/m2',
        ['macro', 'micro', 'nano'],
        'protocol-specific charge-transfer law',
      ),
      parameter(
        'charge_transfer_coefficient',
        '1',
        ['macro', 'micro', 'nano'],
        'dimensionless kinetic coefficient',
      ),
      parameter(
        'effective_diffusivity_m2_s',
        'm2/s',
        ['micro'],
        'species-specific effective transport',
      ),
      parameter(
        'gas_transfer_coefficient_m_s',
        'm/s',
        ['macro', 'micro'],
        'gas/liquid or gas/diffusion-layer boundary',
      ),
      parameter(
        'catalyst_feature_size_m',
        'm',
        ['nano'],
        'measured particle/feature dimension',
      ),
      parameter(
        'gas_pressure_pa',
        'Pa',
        ['macro'],
        'gas-side operating boundary',
      ),
    ],
  },
  {
    id: 'membrane_or_separator',
    title: 'Membrane, separator, or membrane-free ionic path',
    parameters: [
      parameter(
        'membrane_area_m2',
        'm2',
        ['macro'],
        'transport interface area',
      ),
      parameter(
        'thickness_m',
        'm',
        ['macro', 'micro'],
        'separator transport length',
      ),
      parameter(
        'ionic_conductivity_s_m',
        'S/m',
        ['macro', 'micro'],
        'ionic ohmic transport',
      ),
      parameter(
        'effective_diffusivity_m2_s',
        'm2/s',
        ['micro'],
        'species-specific diffusion',
      ),
      parameter('porosity', '1', ['micro'], 'open volume fraction'),
      parameter('tortuosity', '1', ['micro'], 'effective path correction'),
      parameter(
        'hydraulic_permeability_m2',
        'm2',
        ['micro'],
        'pressure-driven liquid transport',
      ),
      parameter(
        'species_crossover_coefficient_m_s',
        'm/s',
        ['macro', 'micro'],
        'species-specific crossover boundary',
      ),
    ],
  },
  {
    id: 'electrical_interconnect_and_sealing',
    title: 'Current collectors, contacts, busbars, and seals',
    parameters: [
      parameter(
        'contact_resistance_ohm',
        'ohm',
        ['macro'],
        'lumped contact loss',
      ),
      parameter(
        'collector_conductivity_s_m',
        'S/m',
        ['macro'],
        'solid current path',
      ),
      parameter(
        'conductive_path_length_m',
        'm',
        ['macro'],
        'collector electrical path',
      ),
      parameter(
        'collector_cross_section_m2',
        'm2',
        ['macro'],
        'collector current-carrying section',
      ),
      parameter(
        'area_specific_contact_resistance_ohm_m2',
        'ohm*m2',
        ['macro', 'micro'],
        'area-normalized interface resistance',
      ),
      parameter(
        'leakage_rate_m3_s',
        'm3/s',
        ['macro'],
        'measured hydraulic/gas leakage boundary; identify phase',
      ),
    ],
  },
  {
    id: 'balance_of_plant',
    title: 'Pumps, valves, dosing, gas collection, and auxiliaries',
    parameters: [
      parameter(
        'recirculation_flow_m3_s',
        'm3/s',
        ['macro'],
        'recirculation boundary',
      ),
      parameter('pump_pressure_rise_pa', 'Pa', ['macro'], 'pump head'),
      parameter(
        'pump_efficiency',
        '1',
        ['macro'],
        'electrical-to-hydraulic efficiency',
      ),
      parameter(
        'auxiliary_power_w',
        'W',
        ['macro'],
        'explicit external electric load',
      ),
      parameter(
        'gas_capture_fraction',
        '1',
        ['macro'],
        'measured/configured collection boundary',
      ),
      parameter(
        'gas_collection_pressure_pa',
        'Pa',
        ['macro'],
        'product collection boundary',
      ),
      parameter(
        'dosing_flow_m3_s',
        'm3/s',
        ['macro'],
        'chemical addition boundary',
      ),
    ],
  },
  {
    id: 'sensors_and_analytics',
    title: 'Diagnostics and electrochemical biosensors',
    parameters: [
      parameter(
        'working_electrode_area_m2',
        'm2',
        ['macro', 'micro'],
        'electrode surface boundary',
      ),
      parameter(
        'response_time_s',
        's',
        ['macro'],
        'sensor dynamic response descriptor',
      ),
      parameter(
        'noise_standard_deviation_a',
        'A',
        ['macro'],
        'current measurement noise',
      ),
      parameter(
        'drift_a_per_day',
        'A/day',
        ['macro'],
        'time-dependent signal drift',
      ),
      parameter(
        'measurement_interval_s',
        's',
        ['macro'],
        'telemetry sampling interval',
      ),
      parameter(
        'calibration_r2',
        '1',
        ['macro'],
        'reported fit diagnostic, not independent validity',
      ),
      parameter(
        'replicate_count',
        '1',
        ['macro'],
        'number of replicate observations',
      ),
    ],
  },
  {
    id: 'operational_biology',
    title: 'Inoculum, biofilm, and microbial populations',
    parameters: [
      parameter(
        'biofilm_thickness_m',
        'm',
        ['micro'],
        'resolved biofilm depth',
      ),
      parameter(
        'biomass_density_kg_m3',
        'kg/m3',
        ['macro', 'micro'],
        'local or compartment biomass; identify scale',
      ),
      parameter(
        'maximum_specific_cod_uptake_kg_cod_kg_biomass_s',
        'kgCOD/(kgVSS*s)',
        ['macro', 'micro'],
        'specified population kinetic law',
      ),
      parameter(
        'half_saturation_cod_kg_m3',
        'kgCOD/m3',
        ['macro', 'micro'],
        'species-specific substrate response',
      ),
      parameter(
        'biomass_yield_kg_biomass_kg_cod',
        'kgVSS/kgCOD',
        ['macro', 'micro'],
        'condition-specific biomass yield',
      ),
      parameter(
        'decay_rate_s_inv',
        '1/s',
        ['macro', 'micro'],
        'population-specific decay',
      ),
      parameter(
        'effective_substrate_diffusivity_m2_s',
        'm2/s',
        ['micro'],
        'substrate-specific biofilm diffusion',
      ),
      parameter(
        'biofilm_conductivity_s_m',
        'S/m',
        ['micro'],
        'distributed electron transport through biofilm',
      ),
      parameter(
        'buffer_capacity_mol_m3_ph',
        'mol/(m3*pH)',
        ['macro', 'micro'],
        'declared liquid/biofilm buffer domain',
      ),
    ],
  },
];

export function getModelFidelityProfile(id: string) {
  return MODEL_FIDELITY_PROFILES.find((profile) => profile.id === id);
}

export function getComponentModelParameterGroup(id: string) {
  return COMPONENT_MODEL_PARAMETER_GROUPS.find((group) => group.id === id);
}
