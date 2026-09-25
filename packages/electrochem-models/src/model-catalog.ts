export type ModelProfileStatus = 'executable' | 'research_profile_only';
export type ModelSystem = 'MFC' | 'MEC' | 'biosensor';
export type ModelOperatingRegime =
  | 'batch'
  | 'continuous_mixed'
  | 'calibrated_signal';

/**
 * Explicit inventory of what the current solver can run and what METREV can
 * describe without pretending that a research architecture is implemented.
 */
export interface BioelectrochemicalModelProfile {
  id: string;
  title: string;
  system: ModelSystem;
  status: ModelProfileStatus;
  operatingRegime: ModelOperatingRegime;
  deploymentMode?: 'standalone' | 'mfc_integrated' | 'mec_integrated';
  architecture: string;
  supportedModelVersion: string | null;
  evidenceDois: string[];
  requiredBoundaries: string[];
  limitations: string[];
}

export const BIOELECTROCHEMICAL_MODEL_PROFILES: BioelectrochemicalModelProfile[] =
  [
    {
      id: 'mfc-two-chamber-cstr-0d',
      title: 'MFC · two compartments · continuous mixed flow',
      system: 'MFC',
      status: 'executable',
      operatingRegime: 'continuous_mixed',
      architecture:
        'Lumped anode and cathode volumes, oxygen-transfer-limited cathode, separator optional, and external-load boundary.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: [
        '10.1016/j.jpowsour.2009.06.101',
        '10.1016/j.biortech.2010.06.156',
      ],
      requiredBoundaries: [
        'positive flow and HRT derived from anode volume and flow',
        'anode and cathode volumes and electrode areas',
        'oxygen transfer, load, conductivity, buffer capacity, and source-referenced kinetic parameters',
      ],
      limitations: [
        'CSTR-style mixing does not resolve hydraulic residence-time distribution or axial gradients.',
        'Literature support does not calibrate or validate the METREV implementation.',
      ],
    },
    {
      id: 'mfc-two-chamber-batch-0d',
      title: 'MFC · two compartments · batch',
      system: 'MFC',
      status: 'executable',
      operatingRegime: 'batch',
      architecture:
        'The same coupled lumped balances with a closed-feed batch boundary and an external-load MFC circuit.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: [
        '10.1016/j.jpowsour.2009.06.101',
        '10.1016/j.biortech.2010.06.156',
      ],
      requiredBoundaries: [
        'flow_m3_s exactly zero',
        'initial substrate, biomass, pH, oxygen, and duration',
        'source-referenced circuit, biological, material, and geometry inputs',
      ],
      limitations: [
        'A batch run does not support a continuous-effluent removal claim.',
        'Well-mixed compartments and the isothermal assumption remain in force.',
      ],
    },
    {
      id: 'mec-two-chamber-cstr-0d',
      title: 'MEC · two compartments · continuous mixed flow',
      system: 'MEC',
      status: 'executable',
      operatingRegime: 'continuous_mixed',
      architecture:
        'Lumped anode and cathode volumes, applied external voltage, hydrogen evolution, and separate gross/captured Faradaic output.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: ['10.1021/es104268g', '10.1128/AEM.01760-09'],
      requiredBoundaries: [
        'positive flow and HRT derived from anode volume and flow',
        'applied-voltage and hydrogen Faraday/capture efficiencies with source references',
        'cell geometry, separator or membrane, conductivity, and source-referenced kinetic inputs',
      ],
      limitations: [
        'Applied electrical power is an input; the solver does not report it as generated power.',
        'Gas crossover, dissolution, methanogenesis, and collection mechanisms are not resolved.',
      ],
    },
    {
      id: 'mec-two-chamber-batch-0d',
      title: 'MEC · two compartments · batch',
      system: 'MEC',
      status: 'executable',
      operatingRegime: 'batch',
      architecture:
        'The coupled MEC balances with no feed during the run and explicit applied-voltage and gas-capture boundaries.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: ['10.1021/es104268g', '10.1128/AEM.01760-09'],
      requiredBoundaries: [
        'flow_m3_s exactly zero',
        'initial substrate, biomass, pH, duration, and externally applied voltage',
        'gross hydrogen Faradaic efficiency and capture fraction as separately sourced inputs',
      ],
      limitations: [
        'Batch hydrogen yield is not a continuous production rate for a plant-scale design.',
        'Gas transfer, crossover, dissolved gas, and competing hydrogen consumers are outside this model.',
      ],
    },
    {
      id: 'mfc-single-chamber-air-cathode',
      title: 'MFC · single chamber · air cathode',
      system: 'MFC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'A shared liquid chamber with a bio-anode and gas-diffusion air cathode; common in wastewater treatment and MFC biosensing.',
      supportedModelVersion: null,
      evidenceDois: [
        '10.1038/s41545-024-00350-5',
        '10.1007/s10529-020-03050-5',
      ],
      requiredBoundaries: [
        'single liquid volume and oxygen boundary at the cathode',
        'electrode spacing, gas-side transfer, water balance, and any separator layer',
      ],
      limitations: [
        'The current model requires distinct lumped anode and cathode volumes and does not solve this shared-chamber geometry.',
      ],
    },
    {
      id: 'mfc-tubular-membrane-wastewater',
      title: 'MFC · tubular membrane module · sewage',
      system: 'MFC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'A tubular anion-exchange-membrane module with an internal air chamber and depth-dependent field operation.',
      supportedModelVersion: null,
      evidenceDois: ['10.3389/fenrg.2019.00091'],
      requiredBoundaries: [
        'module-to-reactor volume ratio, hydraulic residence time, external load, and leakage/wetting observations',
        'spatial position and cathode exposure along each tubular module',
      ],
      limitations: [
        'A single 0D pair of volumes cannot reproduce tube geometry, depth-dependent water ingress, or module-to-module spread.',
      ],
    },
    {
      id: 'mfc-stacked-series-parallel',
      title: 'MFC · hydraulic/electrical stack',
      system: 'MFC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'Multiple cells with explicit series/parallel wiring, flow distribution, and unit-to-unit performance variation.',
      supportedModelVersion: null,
      evidenceDois: ['10.1016/j.jenvman.2018.03.007'],
      requiredBoundaries: [
        'cell count, connection topology, shunts, manifold flows, and per-cell geometry',
        'unit-specific operating measurements and scale-dependent auxiliaries',
      ],
      limitations: [
        'The current solver represents one cell and has no electrical network or manifold model.',
      ],
    },
    {
      id: 'mfc-spatial-biofilm-electrode',
      title: 'MFC · spatial biofilm/electrode model',
      system: 'MFC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'Spatial reaction-transport formulation for biofilm, electrode, local pH, ionic gradients, and flow fields.',
      supportedModelVersion: null,
      evidenceDois: ['10.1016/j.bioelechem.2009.04.009'],
      requiredBoundaries: [
        'biofilm geometry, diffusivity, local potential, transport boundary, and mesh/convergence evidence',
      ],
      limitations: [
        'METREV currently runs a well-mixed isothermal 0D lumped model, not a spatial PDE solver.',
      ],
    },
    {
      id: 'mec-multipopulation-dynamic',
      title: 'MEC · multi-population dynamic kinetics',
      system: 'MEC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'Separate microbial populations and conversion pathways fitted and independently assessed for continuous-feed MEC conditions.',
      supportedModelVersion: null,
      evidenceDois: ['10.1021/es104268g'],
      requiredBoundaries: [
        'population-specific kinetic measurements and independently held-out validation data',
        'substrate speciation and competing hydrogen-consuming pathways',
      ],
      limitations: [
        'The executable model uses one electroactive biomass state and Monod COD uptake; this profile cannot run on it.',
      ],
    },
    {
      id: 'mec-membraneless-gas-managed',
      title: 'MEC · membrane-free · gas-managed',
      system: 'MEC',
      status: 'research_profile_only',
      operatingRegime: 'continuous_mixed',
      architecture:
        'MEC variants without an ion-exchange membrane, with explicit hydrogen crossover, gas-liquid transfer, and competing gas conversion.',
      supportedModelVersion: null,
      evidenceDois: ['10.1128/AEM.01760-09'],
      requiredBoundaries: [
        'gas composition and collection, dissolved hydrogen, crossover, and methanogenic consumption',
      ],
      limitations: [
        'The executable model reports gross and captured hydrogen but does not identify the mechanisms behind their difference.',
      ],
    },
    {
      id: 'biosensor-standalone-amperometric',
      title: 'Biosensor · standalone amperometric calibration',
      system: 'biosensor',
      status: 'executable',
      operatingRegime: 'calibrated_signal',
      deploymentMode: 'standalone',
      architecture:
        'Standalone electrochemical sensor with source-referenced calibration, stated matrix, electrode surfaces, and analytical-performance inputs.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: [],
      requiredBoundaries: [
        'analyte/measurand, matrix, reference method, calibration range, LOD/LOQ, interferences, noise, and external power',
      ],
      limitations: [
        'The current executable transduction is amperometric; it uses the supplied empirical calibration and does not correct matrix effects.',
      ],
    },
    {
      id: 'biosensor-mfc-integrated-amperometric',
      title: 'Biosensor · MFC-integrated calibrated amperometry',
      system: 'biosensor',
      status: 'executable',
      operatingRegime: 'calibrated_signal',
      deploymentMode: 'mfc_integrated',
      architecture:
        'Source-referenced amperometric signal attached to an MFC with explicit harvested-power and cell-boundary accounting.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: [],
      requiredBoundaries: [
        'analyte, matrix, reference method, calibration range, LOD/LOQ, interferences, noise, and power draw',
        'MFC cell inputs and evidence that net harvested power covers sensor and auxiliary demand',
      ],
      limitations: [
        'This is a calibrated sensor load coupled to an MFC run, not a dynamic microbial BOD sensing model.',
      ],
    },
    {
      id: 'biosensor-mec-integrated-amperometric',
      title: 'Biosensor · MEC-integrated calibrated amperometry',
      system: 'biosensor',
      status: 'executable',
      operatingRegime: 'calibrated_signal',
      deploymentMode: 'mec_integrated',
      architecture:
        'Source-referenced amperometric signal attached to an MEC with explicit external power bus and separate hydrogen accounting.',
      supportedModelVersion: 'coupled-0d-dae-v1',
      evidenceDois: [],
      requiredBoundaries: [
        'analyte, matrix, reference method, calibration range, LOD/LOQ, interferences, noise, and power draw',
        'MEC cell inputs and explicit external power available on the sensor bus',
      ],
      limitations: [
        'External MEC-bus energy remains an input and is never counted as sensor-generated energy.',
      ],
    },
    {
      id: 'biosensor-mfc-integrated-bod',
      title: 'Biosensor · MFC-integrated organic-load/BOD',
      system: 'biosensor',
      status: 'research_profile_only',
      operatingRegime: 'calibrated_signal',
      architecture:
        'Living electroactive biofilm acts as the transducer; voltage/current or integrated charge is interpreted against a method-specific BOD reference.',
      supportedModelVersion: null,
      evidenceDois: [
        '10.1007/s10529-020-03050-5',
        '10.1038/s41545-024-00350-5',
        '10.1016/j.bios.2021.113392',
      ],
      requiredBoundaries: [
        'biological adaptation, batch/flow protocol, reference-method schedule, matrix effects, drift, and power/sensor coupling',
      ],
      limitations: [
        'The current standalone calibration model does not simulate live-biofilm BOD kinetics or its dynamic charge-integral measurement.',
      ],
    },
  ];

export const EXECUTABLE_MODEL_PROFILE_IDS = new Set(
  BIOELECTROCHEMICAL_MODEL_PROFILES.filter(
    (profile) =>
      profile.status === 'executable' && profile.system !== 'biosensor',
  ).map((profile) => profile.id),
);

export function getBioelectrochemicalModelProfile(id: string) {
  return BIOELECTROCHEMICAL_MODEL_PROFILES.find((profile) => profile.id === id);
}
