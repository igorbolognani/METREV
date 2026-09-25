import type { PublicTopicSlug } from '@/components/public-topic-content';

export interface PublicArticleSource {
  title: string;
  citation: string;
  doi: string;
  role: string;
  href?: string;
}

export interface PublicArticleDiagramNode {
  label: string;
  explanation: string;
}

export interface PublicArticleSection {
  id: string;
  title: string;
  paragraphs: [string, string, string];
  diagramTitle: string;
  diagramCaption: string;
  diagramNodes: [
    PublicArticleDiagramNode,
    PublicArticleDiagramNode,
    PublicArticleDiagramNode,
    PublicArticleDiagramNode,
  ];
  sources: string[];
}

export interface PublicTopicArticle {
  readingTime: string;
  introduction: string;
  sections: PublicArticleSection[];
  sources: PublicArticleSource[];
}

const sources: Record<string, PublicArticleSource> = {
  hamelers: {
    title:
      'Butler–Volmer–Monod model for describing bio-anode polarization curves',
    citation: 'Hamelers et al. · Bioresource Technology 102 (2011), 381–387',
    doi: '10.1016/j.biortech.2010.06.156',
    role: 'Bio-anode kinetic formulation; not validation of METREV code.',
  },
  zeng: {
    title: 'Modelling and simulation of two-chamber microbial fuel cell',
    citation: 'Zeng et al. · Journal of Power Sources 195 (2010), 79–89',
    doi: '10.1016/j.jpowsour.2009.06.101',
    role: 'Dynamic two-chamber MFC model structure.',
  },
  multipop: {
    title: 'Multi-population model of a microbial electrolysis cell',
    citation: 'Environmental Science & Technology 45 (2011), 5039–5046',
    doi: '10.1021/es104268g',
    role: 'Multi-population kinetics with validation in its stated conditions.',
  },
  call: {
    title:
      'Hydrogen production by Geobacter species and a mixed consortium in a microbial electrolysis cell',
    citation:
      'Call, Wagner & Logan · Applied and Environmental Microbiology 75 (2009), 7579–7587',
    doi: '10.1128/AEM.01760-09',
    role: 'MEC hydrogen recovery, mixed cultures, and competing pathways.',
  },
  tardy: {
    title:
      'Microbial fuel cell biosensor for the determination of biochemical oxygen demand of wastewater samples containing readily and slowly biodegradable organics',
    citation: 'Tardy et al. · Biotechnology Letters 43 (2021), 445–454',
    doi: '10.1007/s10529-020-03050-5',
    role: 'Dynamic, living-MFC BOD assay; different from static amperometry.',
  },
  sugioka: {
    title:
      'On site evaluation of a tubular microbial fuel cell using an anion exchange membrane for sewage water treatment',
    citation:
      'Sugioka, Yoshida & Iida · Frontiers in Energy Research 7 (2019), 91',
    doi: '10.3389/fenrg.2019.00091',
    role: 'Field-relevant tubular MFC configuration and operating conditions.',
  },
  salvian: {
    title:
      'Resilience of anodic biofilm in microbial fuel cell biosensor for BOD monitoring of urban wastewater',
    citation: 'Salvian et al. · npj Clean Water 7 (2024), 53',
    doi: '10.1038/s41545-024-00350-5',
    role: 'Biofilm adaptation and response in synthetic and real wastewater.',
  },
  spurr: {
    title:
      'No re-calibration required? Stability of a bioelectrochemical sensor for biodegradable organic matter over 800 days',
    citation: 'Spurr et al. · Biosensors and Bioelectronics 190 (2021), 113392',
    doi: '10.1016/j.bios.2021.113392',
    role: 'Long-term calibration behaviour under the study’s operating protocol.',
  },
  picioreanu: {
    title:
      'Model based evaluation of the effect of pH and electrode geometry on microbial fuel cell performance',
    citation: 'Picioreanu et al. · Bioelectrochemistry 78 (2010), 8–24',
    doi: '10.1016/j.bioelechem.2009.04.009',
    role: 'Spatial biofilm, ion transport, and pH formulation beyond a 0D model.',
  },
  stack: {
    title:
      'Domestic wastewater treatment and power generation in continuous flow air-cathode stacked microbial fuel cell: effect of series and parallel configuration',
    citation: 'Journal of Environmental Management 213 (2018), 126–134',
    doi: '10.1016/j.jenvman.2018.03.007',
    role: 'Multi-cell hydraulic and electrical stack configuration.',
  },
  capa: {
    title:
      'CAPES will adopt classification of articles in the Quadriennial Assessment',
    citation: 'CAPES · official announcement (31 October 2024)',
    doi: '',
    role: 'Context for journal-tier metadata; not scientific evidence.',
    href: 'https://www.gov.br/capes/pt-br/assuntos/noticias/avaliacao-da-producao-intelectual-e-ampliada',
  },
};

export const PUBLIC_TOPIC_ARTICLES: Record<
  PublicTopicSlug,
  PublicTopicArticle
> = {
  problem: {
    readingTime: '8 minute read',
    introduction:
      'A bioelectrochemical treatment or sensing choice begins with the water, operating boundary, and measurement plan. The same reactor can behave differently when influent composition, sampling point, hydraulic regime, or biofilm history changes. This chapter turns those differences into questions a team can answer before choosing hardware.',
    sections: [
      {
        id: 'define-the-wastewater',
        title: 'Define the wastewater before the reactor',
        paragraphs: [
          'Wastewater is a changing mixture, not a single substrate concentration. Total and soluble chemical oxygen demand (COD), biochemical oxygen demand (BOD), suspended solids, alkalinity, salts, nutrients, and inhibitory compounds describe different properties. A single COD number cannot identify which fraction an electroactive community can use during the residence time available.',
          'Start with the process boundary: influent source, treatment stage, sampling location, flow range, temperature range, and time period represented. Primary effluent, raw sewage, industrial wastewater, and synthetic acetate feed are different matrices. Results from one are evidence about that setup; they do not automatically transfer to another.',
          'Sampling and analytical methods belong in the case record. Preserve whether a value is filtered or total, its method, units, date, and sample point. If the intended outcome is BOD removal, record the reference BOD method and its incubation conditions rather than substituting COD because it is easier to obtain.',
        ],
        diagramTitle: 'A case starts with a measured boundary',
        diagramCaption:
          'Select each node to inspect what the boundary must specify.',
        diagramNodes: [
          {
            label: 'Source',
            explanation:
              'Name the wastewater origin and treatment stage. A laboratory substrate does not stand in for sewage.',
          },
          {
            label: 'Sample',
            explanation:
              'Retain time, location, method, dilution, and filtered-versus-total status for each measurement.',
          },
          {
            label: 'Fractions',
            explanation:
              'Separate readily biodegradable substrate, slowly biodegradable material, suspended solids, and non-biodegradable COD when measured.',
          },
          {
            label: 'Objective',
            explanation:
              'State whether the case targets effluent quality, organic-load sensing, power, hydrogen, or a defined combination.',
          },
        ],
        sources: ['tardy', 'sugioka'],
      },
      {
        id: 'measure-operating-conditions',
        title: 'Treat operating conditions as part of the evidence',
        paragraphs: [
          'Conductivity affects ohmic loss; pH affects microbial activity, speciation, and electrode kinetics; temperature changes both biological rates and electrochemical behaviour. These variables are not background decoration. They can explain why a nominally identical cell has a different current or removal rate.',
          'Hydraulic retention time (HRT) is the active liquid volume divided by flow only when that volume and flow boundary are clearly defined. Mixing, short-circuiting, recirculation, intermittent feeding, and module manifolds can make a nominal HRT a poor description of the actual exposure. Record the operating mode and measured flow history.',
          'Solids, oil, scaling, corrosion, membrane fouling, cathode wetting, and cleaning intervals are design loads. A short clean-water trial may establish that a circuit works; it does not establish long-term maintainability in the intended wastewater.',
        ],
        diagramTitle: 'Conditions change several mechanisms at once',
        diagramCaption:
          'The diagram links operating measurements to the pathways they constrain.',
        diagramNodes: [
          {
            label: 'Conductivity',
            explanation:
              'Constrains electrolyte resistance only when units, temperature, and geometry are compatible.',
          },
          {
            label: 'pH / buffer',
            explanation:
              'A pH value alone does not provide alkalinity or buffer capacity for proton-balance calculations.',
          },
          {
            label: 'Temperature',
            explanation:
              'A fixed measured temperature can be an input; it does not create a thermal-energy balance.',
          },
          {
            label: 'Hydraulics',
            explanation:
              'Flow and effective volume set the modeled residence boundary; they do not resolve a residence-time distribution.',
          },
        ],
        sources: ['zeng', 'picioreanu'],
      },
      {
        id: 'biological-startup-and-stability',
        title: 'The biology has a history',
        paragraphs: [
          'Electroactive biomass forms, adapts, competes with other organisms, and can be lost through decay, detachment, or washout. Startup time, inoculum, substrate changes, oxygen exposure, and maintenance affect the state that produces current. A steady-looking voltage trace does not by itself show that the biofilm, water treatment, or sensor calibration is stable.',
          'Real wastewater brings a broader substrate mixture and native planktonic organisms. A sensor biofilm cultivated on acetate may respond differently when the sample changes to untreated urban wastewater. Studies that move from synthetic to real matrices provide useful evidence about adaptation, but their observed calibration remains specific to the reactor, assay, and operating protocol.',
          'A responsible pilot plan therefore records startup criteria, recovery after feed changes, replicate cells, drift, fouling, and maintenance interventions. These variables distinguish a one-time laboratory response from a repeatable operating method.',
        ],
        diagramTitle: 'Biofilm state links yesterday to today',
        diagramCaption:
          'Select a stage to see the measurements needed for a stability claim.',
        diagramNodes: [
          {
            label: 'Inoculum',
            explanation:
              'Record source, pretreatment, enrichment, and whether parallel reactors share a source.',
          },
          {
            label: 'Adaptation',
            explanation:
              'Track the feed change and time after the change; biofilm adaptation can shift current and power.',
          },
          {
            label: 'Response',
            explanation:
              'Separate immediate signal, integrated charge, peak current, and steady operating output.',
          },
          {
            label: 'Recovery',
            explanation:
              'Test return to baseline after loading, cleaning, starvation, or a matrix transition.',
          },
        ],
        sources: ['salvian', 'tardy', 'spurr'],
      },
      {
        id: 'sensing-is-not-treatment',
        title: 'Do not collapse treatment and sensing into one number',
        paragraphs: [
          'A treatment reactor is judged against an effluent or conversion objective. A biosensor is judged against an analyte, reference method, working range, sensitivity, detection and quantification limits, response and recovery times, selectivity, precision, and drift. One device may contribute to both, but the two claims need separate measurements.',
          'An MFC-based biological BOD assay can use voltage over time and integrated charge generated as the biofilm consumes substrates. That is not equivalent to an electrochemical electrode with a static calibration curve. Even when both report current, their recognition mechanism, assay time, and matrix response can differ substantially.',
          'For a sensor claim, test the actual sample matrix and likely interferents. Compare against the declared standard method with paired samples and a documented study design. A response curve from acetate does not demonstrate accuracy for a complex wastewater sample.',
        ],
        diagramTitle: 'Two functions, two validation questions',
        diagramCaption:
          'Choose a node to distinguish reactor performance from analytical performance.',
        diagramNodes: [
          {
            label: 'Treatment',
            explanation:
              'Measure influent and effluent using a named analytical method and compatible sampling.',
          },
          {
            label: 'Transducer',
            explanation:
              'Name the biological or electrode recognition mechanism and the measured signal.',
          },
          {
            label: 'Calibration',
            explanation:
              'State analyte, units, concentration range, reference method, and fitted equation.',
          },
          {
            label: 'Validation',
            explanation:
              'Use independent or held-out matched samples to estimate analytical error and bias.',
          },
        ],
        sources: ['tardy', 'salvian', 'spurr'],
      },
      {
        id: 'decision-gates',
        title: 'Turn uncertainty into a test plan',
        paragraphs: [
          'A useful early decision is not necessarily “choose the winning technology.” It may be “measure influent conductivity for a month,” “run a paired BOD comparison,” or “test cathode wetting under the site’s hydraulic conditions.” These actions resolve different uncertainty sources and have different costs.',
          'Separate observed measurements, literature-reported values, engineering assumptions, and defaults. A default can support a transparent exploratory calculation, but it must not be presented as a case measurement. If a critical parameter is absent, the correct model result is to report insufficient information and identify the next measurement.',
          'The decision record should say which system boundary is being compared, what result is measured versus modeled, which conditions remain unmatched, and what evidence would change the recommendation. This keeps a promising trial from becoming an unsupported performance guarantee.',
        ],
        diagramTitle: 'A missing value can define the next experiment',
        diagramCaption:
          'Click a gate to see how an evidence gap should affect the decision.',
        diagramNodes: [
          {
            label: 'Known',
            explanation:
              'Retain measured values with units, method, date, and source reference.',
          },
          {
            label: 'Uncertain',
            explanation:
              'Report stated uncertainty separately from a model’s one-at-a-time scenario response.',
          },
          {
            label: 'Missing',
            explanation:
              'Identify the critical input and block numerical output when the model cannot be parameterized.',
          },
          {
            label: 'Next test',
            explanation:
              'Choose a measurement or pilot that reduces the uncertainty relevant to the decision.',
          },
        ],
        sources: ['hamelers', 'tardy'],
      },
    ],
    sources: [
      sources.tardy,
      sources.sugioka,
      sources.salvian,
      sources.spurr,
      sources.zeng,
      sources.picioreanu,
      sources.hamelers,
    ],
  },
  technology: {
    readingTime: '9 minute read',
    introduction:
      'MFCs, MECs, and electrochemical biosensors share electrodes and microbial processes, but they answer different engineering questions. The electrical boundary, biological role, and validation method must be named before their metrics can be compared.',
    sections: [
      {
        id: 'three-system-families',
        title: 'Three families, three operating purposes',
        paragraphs: [
          'A microbial fuel cell (MFC) couples oxidation of biodegradable material at an anode to a cathodic electron acceptor. Electrons travel through an external circuit, where useful electrical output may be recovered while the organic substrate is transformed. The recoverable output depends on biology, electrode kinetics, ionic transport, circuit load, and operating conditions.',
          'A microbial electrolysis cell (MEC) also uses biological oxidation at the anode, but hydrogen evolution at the cathode generally requires an applied electrical potential. That electrical supply is an input to the system. Reporting hydrogen without reporting the applied voltage and associated electrical energy obscures the process boundary.',
          'An electrochemical biosensor converts recognition of a defined analyte into a signal. It may be standalone or coupled to an MFC/MEC. A sensor integrated with a treatment cell must retain both the sensing calibration and the host cell’s operating and power boundaries.',
        ],
        diagramTitle: 'Follow electrons to identify the technology',
        diagramCaption:
          'The selectable pathways show where the electrical boundary changes.',
        diagramNodes: [
          {
            label: 'MFC',
            explanation:
              'Organic oxidation supplies electrons to an external load; net useful output must account for auxiliaries.',
          },
          {
            label: 'MEC',
            explanation:
              'External voltage assists cathodic reduction; the bus is energy input, not generated energy.',
          },
          {
            label: 'Sensor',
            explanation:
              'A calibrated signal measures a named analyte under a stated matrix and protocol.',
          },
          {
            label: 'Integrated',
            explanation:
              'Treatment and sensing may coexist, but each performance claim needs its own evidence.',
          },
        ],
        sources: ['zeng', 'call', 'tardy'],
      },
      {
        id: 'mfc-electron-balance',
        title: 'MFC: close the circuit and the energy balance',
        paragraphs: [
          'In an MFC, a bio-anode transfers electrons from microbial oxidation to the circuit. Current is constrained by substrate uptake, coulombic efficiency, active biomass, electrode overpotentials, ohmic losses, and the cathode reaction. A measured polarization curve is therefore evidence about a particular operating point and cell—not a universal power-density constant.',
          'Distinguish gross electrical output at the external load from net output after pumps, mixing, controls, air handling, and sensors. If the system exports energy only under some operating conditions, report those conditions and the measurement method. A modeled residual in a voltage balance is not automatically a measured physical loss pathway.',
          'The Butler–Volmer–Monod formulation provides one literature-grounded way to connect bio-anode kinetics and charge transfer. Alternative formulations may fit different datasets. A model choice should follow the target question and available measurements, and its parameters should not be transplanted without matching their units and scope.',
        ],
        diagramTitle: 'Current is the meeting point of several limits',
        diagramCaption:
          'Click each constraint to read the evidence needed to parameterize it.',
        diagramNodes: [
          {
            label: 'Substrate',
            explanation:
              'COD uptake depends on biodegradable fractions and the model’s kinetic assumptions.',
          },
          {
            label: 'Biofilm',
            explanation:
              'Biomass state, coulombic efficiency, and adaptation shape electron delivery.',
          },
          {
            label: 'Electrodes',
            explanation:
              'Charge-transfer parameters and active area constrain polarization.',
          },
          {
            label: 'Circuit',
            explanation:
              'Load and internal resistance determine voltage and current at the operating point.',
          },
        ],
        sources: ['hamelers', 'zeng'],
      },
      {
        id: 'mec-voltage-and-hydrogen',
        title: 'MEC: report the electrical input and hydrogen boundary',
        paragraphs: [
          'The applied cell voltage drives the MEC beyond the potential available from the biological anode. Hydrogen generation can be estimated from current through Faraday’s law, but the conversion is constrained by Faradaic efficiency and the actual gas collection boundary. These are separate quantities, not one reported “hydrogen yield.”',
          'Keep gross Faradaic hydrogen, measured or modeled capture, dissolved gas, crossover, and collection loss conceptually distinct. If a model lacks gas transfer, methanogenesis, or hydrogen recycling, it cannot infer which mechanism accounts for a difference between gross and captured gas.',
          'Mixed microbial communities can consume hydrogen or generate methane, changing recovery and energy efficiency. The reported conditions matter: substrate, applied voltage, organism, separator, gas collection, and operating mode all shape the result. MEC secondary output should not displace the primary wastewater-treatment objective unless the case owner explicitly chooses it.',
        ],
        diagramTitle: 'An MEC has an external energy input',
        diagramCaption:
          'The diagram separates electron flow, electrical input, and collected product.',
        diagramNodes: [
          {
            label: 'Anode',
            explanation:
              'Biological oxidation supplies electrons according to the modeled substrate and biomass boundary.',
          },
          {
            label: 'Voltage',
            explanation:
              'Applied voltage is measured electrical input and must be included in energy reporting.',
          },
          {
            label: 'Faraday',
            explanation:
              'Gross hydrogen derives from charge and an explicit Faradaic efficiency.',
          },
          {
            label: 'Collection',
            explanation:
              'Captured gas requires measured collection efficiency; the model must not invent gas-loss mechanisms.',
          },
        ],
        sources: ['call', 'multipop'],
      },
      {
        id: 'sensors-are-methods',
        title: 'A biosensor is an analytical method, not just a current output',
        paragraphs: [
          'The sensor contract starts with the measurand. BOD₅, biodegradable organic matter, toxicity, microbial activity, and COD are related but not interchangeable. Define the analyte, reference method, concentration unit, matrix, response time, calibration date, working range, selectivity, noise, drift, repeatability, and recovery procedure.',
          'Biological MFC sensors often use the living anodic biofilm as part of the recognition and transduction pathway. Their response can depend on biofilm history and substrate composition. Static amperometric electrodes can use a different recognition element and calibration law. Similar units do not make those physical models equivalent.',
          'A reported detection limit belongs to a method and study protocol. Preserve how it was calculated, the number and type of replicates, matrix, and sampling conditions. Do not copy a literature LOD or calibration slope into a new wastewater case as a default.',
        ],
        diagramTitle: 'Analytical performance is multidimensional',
        diagramCaption:
          'Select a measure to separate detection, accuracy, and temporal behaviour.',
        diagramNodes: [
          {
            label: 'Measurand',
            explanation:
              'Specify the quantity the instrument is intended to estimate and its reference procedure.',
          },
          {
            label: 'Calibration',
            explanation:
              'Fit and document the relation only over the range and matrix that were tested.',
          },
          {
            label: 'Interference',
            explanation:
              'Test relevant wastewater constituents and biological matrix effects.',
          },
          {
            label: 'Stability',
            explanation:
              'Track drift, recalibration, recovery, and changes after feed or operating transitions.',
          },
        ],
        sources: ['tardy', 'salvian', 'spurr'],
      },
      {
        id: 'choose-formulation',
        title: 'Select a model formulation for the evidence you have',
        paragraphs: [
          'Monod uptake is a useful compact description when a single limiting substrate and one biomass state are defensible approximations. Multi-population models add microbial guilds and competing pathways, but they also require more parameters and identification data. Higher complexity is not automatically more reliable for a case with sparse measurements.',
          'Nernst–Monod and Butler–Volmer–Monod formulations represent different relationships between anode potential, substrate uptake, and electron transfer. The appropriate structure depends on the mechanism under study and the available polarization or kinetic measurements. One published fit does not establish that a structure is identifiable for another wastewater or reactor.',
          'METREV’s current executable formulation is one lumped, isothermal, 0D model. It can run specified MFC/MEC boundaries and amperometric calibration inputs. Other model formulations are recorded as research profiles only until equations, parameters, benchmarks, and regression evidence exist in code.',
        ],
        diagramTitle: 'Model complexity must follow data coverage',
        diagramCaption:
          'Choose a formulation level to see the extra data it demands.',
        diagramNodes: [
          {
            label: 'Empirical',
            explanation:
              'Fit a stated input-output relation to the measured operating domain; do not call it mechanistic proof.',
          },
          {
            label: 'Single guild',
            explanation:
              'A compact kinetic model needs explicit substrate, biomass, yield, and decay inputs.',
          },
          {
            label: 'Electrochemical',
            explanation:
              'Charge-transfer equations need electrode-specific kinetic parameters and potential boundaries.',
          },
          {
            label: 'Multi-guild',
            explanation:
              'Multiple populations require independent measurements that distinguish their contributions.',
          },
        ],
        sources: ['hamelers', 'multipop'],
      },
      {
        id: 'technology-evidence',
        title: 'Keep technology labels attached to the source conditions',
        paragraphs: [
          'The same nominal MFC label includes single-chamber air-cathode reactors, two-chamber cells, tubular modules, stacks, and hybrid treatment configurations. MECs likewise vary in chamber layout, separators, cathodic pathways, and gas management. Those differences change transport, energy demand, and process observability.',
          'When a paper compares technologies, inspect the tested architecture, feed, scale, duration, and system boundary. A study reporting long-term calibration stability in a controlled assay does not establish a no-recalibration rule for a field installation. A field reactor can demonstrate a viable setup while leaving spatial leakage or module variation unresolved.',
          'Evidence should qualify the claim it actually tested. If the architecture or operating envelope changes, the next step is often a matched experiment—not an extrapolation from a journal metric or an LLM summary.',
        ],
        diagramTitle: 'A technology name is not a full configuration',
        diagramCaption:
          'The same label covers architectures with distinct boundaries.',
        diagramNodes: [
          {
            label: 'Geometry',
            explanation:
              'Record chamber layout, effective volume, electrode area, and separator or membrane configuration.',
          },
          {
            label: 'Operation',
            explanation:
              'Record batch or flow mode, load or voltage, temperature, and operating duration.',
          },
          {
            label: 'Measurement',
            explanation:
              'Keep actual study measurements separate from modeled outputs and derived quantities.',
          },
          {
            label: 'Transfer',
            explanation:
              'Reassess applicability when matrix, scale, hardware, or operating mode changes.',
          },
        ],
        sources: ['sugioka', 'salvian', 'spurr'],
      },
    ],
    sources: [
      sources.hamelers,
      sources.zeng,
      sources.multipop,
      sources.call,
      sources.tardy,
      sources.salvian,
      sources.spurr,
      sources.sugioka,
    ],
  },
  stack: {
    readingTime: '10 minute read',
    introduction:
      'A reactor architecture determines which transport paths, control boundaries, and failure modes exist. The catalog below separates four executable lumped configurations from larger families represented as literature profiles only.',
    sections: [
      {
        id: 'architecture-is-a-model-input',
        title: 'Architecture is part of the model input',
        paragraphs: [
          'The reactor fixes more than the picture on a datasheet. Chamber volumes, electrode areas, spacing, separator presence, flow path, cathode exposure, and module count determine mass-transfer and electrical boundaries. Two systems with the same anode material can have different residence times, ionic resistances, and maintenance requirements.',
          'A model cannot represent a configuration merely because its input includes a “reactor type” label. The state variables and equations must resolve the relevant physics. For example, a pair of well-mixed compartment balances does not resolve a tubular reactor’s depth-dependent leakage or the electrical interactions among stacked cells.',
          'METREV therefore ties named runnable profiles to the current 0D solver and marks other architectures as research profiles. A research profile is useful for structuring evidence and identifying missing capabilities, but it cannot produce simulated output until a compatible formulation is implemented and tested.',
        ],
        diagramTitle: 'Geometry determines the equations you need',
        diagramCaption:
          'Select each design feature to inspect its modeling consequence.',
        diagramNodes: [
          {
            label: 'Volumes',
            explanation:
              'Set liquid inventories and connect flow to residence time under the specified mixing boundary.',
          },
          {
            label: 'Electrodes',
            explanation:
              'Set working area and electrode separation for charge transfer and ohmic losses.',
          },
          {
            label: 'Separator',
            explanation:
              'Changes ionic transport and crossover; absence must be modeled as a boundary, not a zero-valued membrane.',
          },
          {
            label: 'Modules',
            explanation:
              'Add electrical topology, manifold flow, and unit variation before claiming stack-level output.',
          },
        ],
        sources: ['zeng', 'sugioka', 'stack'],
      },
      {
        id: 'chamber-architectures',
        title: 'Single and two-chamber systems are not interchangeable',
        paragraphs: [
          'In a single-chamber air-cathode MFC, the wastewater and bio-anode occupy the main liquid space while oxygen reaches a gas-diffusion cathode. That arrangement can avoid a continuously supplied catholyte, but it places cathode wetting, oxygen transfer, membrane/separator layers, and contamination exposure directly in the design problem.',
          'A two-chamber MFC separates anode and cathode liquid compartments, often with a membrane or separator. It provides a different transport and pH boundary and may require catholyte operation or additional materials. The model should carry those chamber volumes and interface properties explicitly.',
          'The current METREV solver is structured around distinct lumped anode and cathode compartments. It can represent two-compartment MFC/MEC profiles under stated boundaries. The shared-liquid geometry of a single-chamber air-cathode cell is not equivalent and remains research-profile-only.',
        ],
        diagramTitle: 'Two layouts imply different liquid boundaries',
        diagramCaption:
          'Compare the compartments and oxygen boundary rather than the labels.',
        diagramNodes: [
          {
            label: 'Single chamber',
            explanation:
              'One wastewater chamber and a gas-facing cathode require a shared-liquid geometry and cathode wetting boundary.',
          },
          {
            label: 'Two chamber',
            explanation:
              'Separate anode and cathode volumes need explicit separator and inter-chamber transport inputs.',
          },
          {
            label: 'MFC cathode',
            explanation:
              'Oxygen supply and reduction define the MFC cathodic boundary.',
          },
          {
            label: 'MEC cathode',
            explanation:
              'Applied electrical potential and hydrogen evolution define the MEC boundary.',
          },
        ],
        sources: ['zeng', 'salvian', 'sugioka'],
      },
      {
        id: 'tubular-and-field-modules',
        title: 'Tubular field modules reveal scale-specific failure modes',
        paragraphs: [
          'Tubular modules can package an anode and separator around an air chamber and be deployed directly in a wastewater channel. A site study reported vertical assemblies and noted lower output in bottom units associated with water ingress to the air cathode. That observation makes installation height, wetting, and module position engineering variables—not incidental narrative.',
          'Field comparisons also depend on the surrounding reactor volume, external resistance, flow, HRT, and primary-treatment stage. A module tested in a small chemostat does not automatically predict treatment-plant performance. Report the volume ratio and the treatment boundary around the module.',
          'A 0D pair of volumes can explore some stated operating conditions; it cannot reproduce a depth gradient, tubular water ingress, or the performance distribution among field modules. Those architectures remain in the research catalog until transport and spatial effects are modeled.',
        ],
        diagramTitle: 'A field module adds position and wetting boundaries',
        diagramCaption:
          'Choose a node to see which observations a tubular model needs.',
        diagramNodes: [
          {
            label: 'Elevation',
            explanation:
              'Track module position because hydrostatic and exposure differences can change output.',
          },
          {
            label: 'Wetting',
            explanation:
              'Measure cathode ingress or wetting; it can alter gas transfer and electrode function.',
          },
          {
            label: 'Reactor',
            explanation:
              'Retain the module-to-reactor volume and hydraulic relationship.',
          },
          {
            label: 'Spread',
            explanation:
              'Report unit-level replicates rather than hiding module variation in a mean.',
          },
        ],
        sources: ['sugioka'],
      },
      {
        id: 'stacks-and-electrical-topology',
        title: 'Stacks require hydraulic and electrical network models',
        paragraphs: [
          'Series and parallel cell connections change voltage, current, and the consequences of a weak or reversed cell. Hydraulic manifolds can create unequal feed distribution and cell loading. A stack performance figure therefore needs the number of modules, electrical topology, hydraulic path, and cell-level variation.',
          'A published continuous-flow wastewater stack study used 40 air-cathode MFC units and examined series and parallel configuration. That evidence shows why “stacked MFC” is a family of testable configurations. It does not make a single-cell solver a stack model.',
          'METREV’s current executable model calculates one reactor instance at a time and has no electrical-network or manifold solver. Stack-level performance remains a research profile; a future implementation should first test network conservation and unit-to-unit uncertainty against measured stack data.',
        ],
        diagramTitle: 'Modules couple through wiring and manifolds',
        diagramCaption:
          'Each link adds a balance that a single-cell run does not contain.',
        diagramNodes: [
          {
            label: 'Cell',
            explanation:
              'Start with a parameterized unit cell and measured cell-level response.',
          },
          {
            label: 'Wiring',
            explanation:
              'Series/parallel topology changes current paths, voltage, and shunt risks.',
          },
          {
            label: 'Manifold',
            explanation:
              'Flow distribution and pressure drop determine each cell’s feed boundary.',
          },
          {
            label: 'Stack',
            explanation:
              'Validate total performance against module-level data with auxiliaries included.',
          },
        ],
        sources: ['stack'],
      },
      {
        id: 'materials-and-separator',
        title: 'Materials and separators need measured properties',
        paragraphs: [
          'Carbon brush, felt, cloth, metal mesh, catalysts, current collectors, and separator polymers have different surface area, conductivity, wetting, mechanical strength, and compatibility. A material label is not a kinetic parameter. Surface modification or projected-area normalization can change what the reported current density means.',
          'Separator and membrane properties influence ionic resistance, pH separation, and possible crossover. Record the membrane family, thickness, area, conductivity, condition, and whether a measured value or a literature value was used. For membrane-free operation, the electrolyte and gas transfer boundary still needs an explicit formulation.',
          'Do not substitute a high-surface-area electrode from one paper into another case as if the geometry were unchanged. Report which area basis was used—projected, geometric, or estimated electroactive area—and retain its source and uncertainty.',
        ],
        diagramTitle: 'Material claims need a measurement basis',
        diagramCaption:
          'Select a property to connect material choice with its source.',
        diagramNodes: [
          {
            label: 'Material',
            explanation:
              'State substrate, coating, pretreatment, and batch or supplier identifier.',
          },
          {
            label: 'Property',
            explanation:
              'Use measured conductivity, thickness, area, or porosity with methods and units.',
          },
          {
            label: 'Interface',
            explanation:
              'The biofilm/electrode contact and separator determine local transfer behaviour.',
          },
          {
            label: 'Condition',
            explanation:
              'Fouling, aging, compression, and wetting may change a fresh-material measurement.',
          },
        ],
        sources: ['hamelers', 'sugioka'],
      },
      {
        id: 'executable-versus-research-profiles',
        title: 'Current runnable profiles and research profiles',
        paragraphs: [
          'The four reactor profiles currently supported are a two-compartment MFC in batch or continuous mixed-flow operation and a two-compartment MEC in batch or continuous mixed-flow operation. The flow field must agree with the named regime: batch means zero feed during the modeled interval; continuous mixed flow requires positive flow.',
          'Standalone amperometric calibration and calibrated amperometric sensing integrated with MFC/MEC power accounting are also executable sensor profiles when the case supplies complete, source-referenced calibration and analytical performance. These profiles do not simulate a live biofilm’s BOD response over time.',
          'Single-chamber air-cathode cells, tubular modules, electrical stacks, spatial biofilms, multi-population MEC kinetics, and dynamic living-MFC BOD sensors are represented for research and evidence mapping only. Choosing one of those names in a run returns insufficient data instead of simulated output.',
        ],
        diagramTitle: 'A configuration can be executable or a research profile',
        diagramCaption:
          'Select a profile family to see what the current solver actually supports.',
        diagramNodes: [
          {
            label: 'MFC 0D',
            explanation:
              'Two lumped compartments; batch or continuous mixed flow; explicit oxygen and load boundaries.',
          },
          {
            label: 'MEC 0D',
            explanation:
              'Two lumped compartments; batch or continuous mixed flow; applied voltage and separate gas capture.',
          },
          {
            label: 'Amperometry',
            explanation:
              'A supplied static calibration is executable; it is not a model of microbial BOD assay kinetics.',
          },
          {
            label: 'Research only',
            explanation:
              'Architectures that need spatial, network, multipopulation, or gas-transfer equations are blocked from execution.',
          },
        ],
        sources: [
          'zeng',
          'multipop',
          'tardy',
          'sugioka',
          'stack',
          'picioreanu',
        ],
      },
    ],
    sources: [
      sources.zeng,
      sources.multipop,
      sources.sugioka,
      sources.stack,
      sources.picioreanu,
      sources.hamelers,
      sources.tardy,
    ],
  },
  comparison: {
    readingTime: '9 minute read',
    introduction:
      'A comparison is scientifically useful only when routes share an objective, boundary, operating envelope, and compatible metric. The method below keeps evidence design and applicability visible before any table produces a winner.',
    sections: [
      {
        id: 'same-objective',
        title: 'Compare the same engineering objective',
        paragraphs: [
          'Treatment performance, electrical export, hydrogen recovery, and analytical accuracy are not interchangeable objectives. A route that reports a high power density may leave an effluent requirement unmet. A sensor with a low detection limit may have a slow response or require external energy. State the primary objective and any secondary outputs before selecting metrics.',
          'Conventional activated sludge, anaerobic treatment, membranes, MFCs, MECs, and sensor-only systems may be useful comparators, but their study boundaries differ. Compare treatment trains at the same influent, target effluent, flow, reliability, and included auxiliary systems wherever possible.',
          'If a complete matched comparison is not available, report a partial comparison and name what is missing. A transparent gap is more useful than a composite score that rewards incomparable numbers.',
        ],
        diagramTitle: 'A valid comparison starts at a shared objective',
        diagramCaption:
          'Choose the outcome to see which routes can be compared on it.',
        diagramNodes: [
          {
            label: 'Objective',
            explanation:
              'Name the target outcome and its acceptance criterion before ranking options.',
          },
          {
            label: 'Alternatives',
            explanation:
              'List the process trains that can meet the same service requirement.',
          },
          {
            label: 'Boundary',
            explanation:
              'Include process stages, energy, chemicals, handling, and monitoring consistently.',
          },
          {
            label: 'Decision',
            explanation:
              'Use a trade-off view when no option dominates across the agreed metrics.',
          },
        ],
        sources: ['sugioka', 'stack'],
      },
      {
        id: 'normalization-basis',
        title: 'Check the denominator and the measurement method',
        paragraphs: [
          'Current density per projected electrode area, power per reactor volume, COD removal per treated volume, and energy per kilogram of COD removed answer different questions. The numerator, denominator, and area convention must be stated. Normalizing by an undocumented surface-area estimate can reverse an apparent material comparison.',
          'Keep concentration and mass-flow metrics separate. A concentration removal percentage is not a mass-removal rate unless the corresponding flow and sampling basis are known. HRT comparisons require the volume that actually participates in flow, and sensor sensitivity requires the analyte’s concentration unit and matrix.',
          'If units differ, convert only when the dimensions and basis are defined. Retain the original value and unit, the normalized value and unit, and the conversion rule. If the basis is ambiguous, leave the values side by side and mark the comparison not assessed.',
        ],
        diagramTitle: 'A number is inseparable from its denominator',
        diagramCaption:
          'The four linked fields must be preserved in a comparison.',
        diagramNodes: [
          {
            label: 'Quantity',
            explanation:
              'Name the physical or analytical quantity, not a broad label such as performance.',
          },
          {
            label: 'Unit',
            explanation:
              'Keep the source unit and any conversion rule in the evidence record.',
          },
          {
            label: 'Denominator',
            explanation:
              'Record area, volume, mass removed, or concentration range used for normalization.',
          },
          {
            label: 'Method',
            explanation:
              'Identify whether the value is measured, fitted, calculated, or modeled.',
          },
        ],
        sources: ['sugioka', 'hamelers', 'tardy'],
      },
      {
        id: 'match-study-conditions',
        title: 'Match conditions and study design',
        paragraphs: [
          'A paper’s conditions include substrate, real or synthetic matrix, scale, batch or flow operation, temperature, pH, load or applied voltage, duration, and replicate design. These factors affect microbial growth, transport, and sensor response. Record the match dimension by dimension instead of relying on a broad “similar system” label.',
          'Calibration data, training data, parameter-estimation data, and independent validation data serve different roles. If the same observations set parameters and report model agreement, the fit does not establish independent predictive performance. State whether comparison samples were held out and whether the operating conditions match the intended case.',
          'Report error metrics alongside the original study design and sample count. Correlation alone does not show agreement or absence of bias. A short test can support feasibility; it cannot establish long-term reliability without duration and stability evidence.',
        ],
        diagramTitle: 'Study role determines what a result can support',
        diagramCaption:
          'Select a dataset role to see how it should be interpreted.',
        diagramNodes: [
          {
            label: 'Calibration',
            explanation:
              'Use to estimate model or sensor parameters; do not call the same data independent validation.',
          },
          {
            label: 'Training',
            explanation:
              'Use for fitting or method development, with the chosen observations disclosed.',
          },
          {
            label: 'Validation',
            explanation:
              'Reserve independent matched observations and report error and bias metrics.',
          },
          {
            label: 'Unknown',
            explanation:
              'If dataset role or condition match is unknown, block a validation claim.',
          },
        ],
        sources: ['multipop', 'tardy', 'sugioka'],
      },
      {
        id: 'journal-ranking-is-not-validity',
        title: 'Journal tiers are metadata, not a validation method',
        paragraphs: [
          'A1–A4 may refer to historical CAPES Qualis Periódicos strata when an area and evaluation cycle are specified. Those labels are not a universal international journal grade. For the 2025–2028 CAPES cycle, the assessment shifts to article-level procedures and may use up to eight strata (A1–A8); the applicable method is set by each evaluation area.',
          'Journal standing does not tell METREV whether a paper used real wastewater, measured the parameter of interest, had adequate replicates, held out validation data, reported a usable locator, or applies to the target geometry. Review the individual study, methods, data, and applicability directly.',
          'The source registry therefore records the DOI, journal, year, source type, study role, scope, and review status. A classification may be stored only with its scheme, level, object (journal or article), area, cycle, identifier, retrieval date, and official reference; it never converts a claim into accepted evidence.',
        ],
        diagramTitle:
          'Outlet metadata and study evidence answer different questions',
        diagramCaption: 'Select a criterion to see the proper review gate.',
        diagramNodes: [
          {
            label: 'Tier',
            explanation:
              'Record a journal classification with scheme, area, cycle, ISSN, and retrieval date.',
          },
          {
            label: 'Design',
            explanation:
              'Inspect experiments, comparators, replicates, and the role of each dataset.',
          },
          {
            label: 'Applicability',
            explanation:
              'Match wastewater, geometry, and operation to the case under review.',
          },
          {
            label: 'Decision use',
            explanation:
              'Require a reviewed claim, not a journal label, before evidence enters a decision flow.',
          },
        ],
        sources: ['capa'],
      },
      {
        id: 'tradeoffs-not-winners',
        title: 'Show trade-offs instead of manufacturing a winner',
        paragraphs: [
          'A decision should preserve performance, reliability, operator burden, footprint, materials, energy input, and evidence strength as separate dimensions until stakeholders define their priorities. Combining them into one number requires explicit weights and value judgments; an algorithm cannot infer those priorities from a literature table.',
          'A route can appear attractive on treatment removal but require more maintenance, external voltage, gas management, or sensor recalibration. A complete comparison states which criteria are measured, estimated, modeled, or missing and shows the dependencies that could change the ordering.',
          'When uncertainty is high, a sensitivity scenario can show how a stated input perturbation changes outputs. That is not a probability distribution, prediction interval, or robustness proof. Describe the tested range and retain the direction and magnitude of each change.',
        ],
        diagramTitle: 'Trade-offs stay visible until priorities are stated',
        diagramCaption:
          'Each dimension remains separate until a decision owner supplies weights.',
        diagramNodes: [
          {
            label: 'Performance',
            explanation:
              'Compare target-specific outputs with matched measurements and compatible units.',
          },
          {
            label: 'Operations',
            explanation:
              'Include staffing, service, startup, fouling, and reliability evidence.',
          },
          {
            label: 'Resources',
            explanation:
              'Keep external power, auxiliary energy, materials, and consumables in the boundary.',
          },
          {
            label: 'Preference',
            explanation:
              'Make stakeholder weights explicit before aggregating trade-offs.',
          },
        ],
        sources: ['sugioka', 'spurr', 'call'],
      },
      {
        id: 'comparison-output',
        title: 'A defensible comparison ends with a testable next step',
        paragraphs: [
          'The conclusion should identify the strongest matched evidence, the unmatched conditions, the assumptions used, and the measurement that would most reduce decision risk. It should not claim a universal best configuration from a small and heterogeneous set of publications.',
          'When simulation is used, label the model version and input sources. Compare predictions to independent measured data only when the metric, unit, conditions, and dataset role are compatible. If they are not, report a residual as a numerical difference without calling it validation.',
          'A comparison matrix should therefore make its limits easy to read: “supported under this condition,” “candidate for this case,” “not comparable,” or “not assessed.” Those categories preserve engineering judgment and give the next experiment a clear purpose.',
        ],
        diagramTitle: 'Comparison becomes a learning loop',
        diagramCaption:
          'A decision updates when a better-matched measurement arrives.',
        diagramNodes: [
          {
            label: 'Compare',
            explanation:
              'Align objective, boundary, units, conditions, and study design.',
          },
          {
            label: 'Gap',
            explanation:
              'Name what blocks a fair or decision-ready comparison.',
          },
          {
            label: 'Test',
            explanation:
              'Collect the missing measurement or independent validation set.',
          },
          {
            label: 'Revise',
            explanation:
              'Update the comparison while preserving prior sources and assumptions.',
          },
        ],
        sources: ['hamelers', 'multipop', 'sugioka'],
      },
    ],
    sources: [
      sources.capa,
      sources.hamelers,
      sources.multipop,
      sources.sugioka,
      sources.tardy,
      sources.spurr,
      sources.call,
      sources.stack,
    ],
  },
  impact: {
    readingTime: '8 minute read',
    introduction:
      'Impact claims need explicit process and energy boundaries. The chapter separates measured treatment outcomes from modeled electrical or hydrogen outputs and explains which additions are required before a result can support a sustainability claim.',
    sections: [
      {
        id: 'water-quality-outcome',
        title: 'Start with the treated-water outcome',
        paragraphs: [
          'A wastewater-treatment claim begins with influent and effluent quality, sample method, flow, treatment stage, and the target standard or reuse requirement. COD removal alone does not establish pathogen safety, nutrient control, toxicity reduction, or compliance with a discharge permit.',
          'Concentration change and mass removal are distinct. For a varying flow, use time-aligned concentration and flow data to compute loading and mass removed. Preserve the analytical method and whether samples are filtered, composite, grab, or otherwise prepared.',
          'If the model contains only COD, it cannot estimate nitrogen, phosphorus, suspended solids, pathogen, or micropollutant outcomes. A water-quality dashboard should show those indicators as missing or informational rather than inferring them from current.',
        ],
        diagramTitle: 'Treatment performance follows the water balance',
        diagramCaption:
          'Choose a measurement to see how it enters an outcome claim.',
        diagramNodes: [
          {
            label: 'Influent',
            explanation:
              'Measure the incoming load and identify source, date, method, and sampling basis.',
          },
          {
            label: 'Process',
            explanation:
              'Retain flow, active volume, HRT, operating mode, and interventions.',
          },
          {
            label: 'Effluent',
            explanation:
              'Measure the treated water using the same analyte definition and compatible method.',
          },
          {
            label: 'Compliance',
            explanation:
              'Compare to the actual permitted limit and missing analytes; COD alone is not comprehensive safety.',
          },
        ],
        sources: ['sugioka'],
      },
      {
        id: 'gross-and-net-electricity',
        title: 'Separate gross electrical output from net energy',
        paragraphs: [
          'An MFC’s current and voltage may be measured across a resistor or power management circuit. Report the load, measurement interval, time stability, and whether values are peak, average, or integrated. A maximum polarization point is not necessarily the operating point after control, pumping, and treatment duties are included.',
          'Net energy requires an explicit boundary around auxiliary loads: mixing, pumping, air delivery, control electronics, sensors, heating/cooling, and downstream treatment. If a study reports cell output but not those loads, describe it as cell-level output rather than net plant energy.',
          'METREV’s executable model accounts for the specified auxiliary power and sensor draw. It does not produce a whole-plant energy ledger unless the user supplies that boundary and the relevant inputs. A model output is not a measured energy saving.',
        ],
        diagramTitle: 'Net output is a boundary calculation',
        diagramCaption:
          'Select the energy term to inspect whether it is generated, consumed, or unresolved.',
        diagramNodes: [
          {
            label: 'Cell output',
            explanation:
              'MFC electrical output is current and voltage under a stated external load.',
          },
          {
            label: 'Auxiliaries',
            explanation:
              'Subtract pumps, mixing, control, air delivery, and sensor loads that are inside the boundary.',
          },
          {
            label: 'Net result',
            explanation:
              'Compute only with compatible power or energy units and time coverage.',
          },
          {
            label: 'Evidence',
            explanation:
              'Keep measured energy separate from simulated output and unmetered estimates.',
          },
        ],
        sources: ['sugioka', 'stack'],
      },
      {
        id: 'hydrogen-recovery-boundary',
        title: 'MEC hydrogen is a product and an energy input story',
        paragraphs: [
          'An MEC requires applied electrical energy to drive hydrogen evolution under its selected biological conditions. Report cell voltage, current, electrical energy supplied, hydrogen rate, gas composition, and recovery basis together. Gross Faradaic production and captured hydrogen answer different questions.',
          'Hydrogen can dissolve, cross compartments, be consumed by microbes, or be collected with methane and other gases. Unless those mechanisms are measured and modeled, a gap between Faradaic hydrogen and captured gas is not a calibrated “leak” estimate.',
          'Energy recovery comparisons need both the energy content and the energy inputs on the same boundary. The substrate’s chemical energy, MEC electrical input, gas treatment, compression, and downstream use may all affect a life-cycle or plant-level conclusion.',
        ],
        diagramTitle: 'Hydrogen output needs a complete accounting chain',
        diagramCaption:
          'Select a stage to separate calculated gas from measured gas.',
        diagramNodes: [
          {
            label: 'Applied V',
            explanation:
              'Log voltage and current as supplied electricity, with duration and instrumentation.',
          },
          {
            label: 'Faraday',
            explanation:
              'Calculate a gross theoretical amount only with an explicit current efficiency.',
          },
          {
            label: 'Gas phase',
            explanation:
              'Measure composition, pressure, temperature, and collection conditions.',
          },
          {
            label: 'Use boundary',
            explanation:
              'Include purification, compression, storage, and final use before an energy-recovery claim.',
          },
        ],
        sources: ['call', 'multipop'],
      },
      {
        id: 'life-cycle-boundary',
        title: 'A sustainability claim needs life-cycle scope',
        paragraphs: [
          'A process can recover electricity and still require energy-intensive materials, membranes, replacement electrodes, chemicals, or service. Life-cycle assessment must define the functional unit, system boundary, allocation method, infrastructure, operational inventory, and comparator. A laboratory output number is not a greenhouse-gas result.',
          'Use a functional unit connected to the service delivered—for example, treating a defined volume to a stated effluent quality over a period—rather than comparing power densities across unrelated reactors. Include avoided processes only when the baseline and substitution assumption are supported.',
          'Uncertainty should carry through the inventory and scenario. Where no life-cycle data exist, present a boundary map and missing inventory rather than assigning environmental credits. METREV can organize measured and modeled process outputs; it is not currently a validated LCA engine.',
        ],
        diagramTitle: 'Impact follows the service and its system boundary',
        diagramCaption:
          'A functional unit links the treatment service to included inputs and outputs.',
        diagramNodes: [
          {
            label: 'Service',
            explanation:
              'Define treated volume, effluent quality, duration, and reliability delivered.',
          },
          {
            label: 'Inputs',
            explanation:
              'Include electricity, chemicals, materials, membranes, and replacement parts.',
          },
          {
            label: 'Outputs',
            explanation:
              'Track effluent, recovered electricity or gas, residuals, and emissions.',
          },
          {
            label: 'Baseline',
            explanation:
              'Compare with a real alternative process delivering the same service.',
          },
        ],
        sources: ['sugioka', 'call'],
      },
      {
        id: 'scale-and-serviceability',
        title: 'Scale-up changes maintenance and reliability',
        paragraphs: [
          'More electrode area and reactor volume do not guarantee proportional performance. Flow distribution, electrode spacing, cathode exposure, material cost, cleaning access, replacement intervals, and unit variation change with scale. A small cell can support mechanism learning without proving that a treatment train is serviceable.',
          'Field and pilot evidence should report uptime, maintenance actions, fouling, wetting, startup, effluent stability, and replicate-unit spread. A decrease in output near one module position or after one operating interval may be a material signal about the installation boundary.',
          'System performance should include the work required to keep sensors calibrated and cathodes active. If calibration stability was shown under a particular reference substrate and schedule, carry that protocol into the interpretation rather than making a broad no-recalibration claim.',
        ],
        diagramTitle: 'Operational impact includes service work',
        diagramCaption:
          'Select an operating event to identify what a pilot should record.',
        diagramNodes: [
          {
            label: 'Uptime',
            explanation:
              'Record run hours, bypasses, shutdowns, and treatment service continuity.',
          },
          {
            label: 'Fouling',
            explanation:
              'Track inspection, cleaning, lost area, and whether performance recovers.',
          },
          {
            label: 'Calibration',
            explanation:
              'Log standards, recalibration interval, drift, and reference-method agreement.',
          },
          {
            label: 'Replacement',
            explanation:
              'Include electrode, membrane, sensor, and consumable replacement over time.',
          },
        ],
        sources: ['sugioka', 'salvian', 'spurr'],
      },
      {
        id: 'impact-claims',
        title: 'Phrase conclusions at the level of the evidence',
        paragraphs: [
          'Use “measured under this test condition” for observations, “calculated from stated inputs” for a model output, and “scenario estimate” for a boundary-dependent projection. Reserve “validated” for a clearly described comparison against independent matched measurements and a prespecified evaluation method.',
          'A literature result can establish that an architecture was tested or that a mechanism is plausible. It does not establish a case-specific outcome. A paper-level mean can be a useful reference while still being unsuitable as a default parameter or validation datum.',
          'Where evidence is weak or incomplete, narrow the claim and state the next test. That protects engineering users from mistaking an attractive energy-recovery story for a demonstrated net environmental benefit.',
        ],
        diagramTitle: 'Claim strength follows the evidence type',
        diagramCaption:
          'Choose the source type to see the language it supports.',
        diagramNodes: [
          {
            label: 'Measured',
            explanation:
              'A measured claim needs sample, method, unit, date, and instrument or analytical method.',
          },
          {
            label: 'Modeled',
            explanation:
              'A modeled claim needs model version, input sources, boundary, and explicit assumptions.',
          },
          {
            label: 'Literature',
            explanation:
              'A literature claim remains scoped to the cited study conditions and design.',
          },
          {
            label: 'Validated',
            explanation:
              'Use only after an independent matched dataset and declared error assessment exist.',
          },
        ],
        sources: ['hamelers', 'multipop', 'salvian'],
      },
    ],
    sources: [
      sources.sugioka,
      sources.call,
      sources.multipop,
      sources.spurr,
      sources.salvian,
      sources.hamelers,
      sources.stack,
    ],
  },
  metrev: {
    readingTime: '10 minute read',
    introduction:
      'METREV is an auditable decision-support workspace for wastewater MFC/MEC and electrochemical-biosensor cases. Its strongest output is a traceable chain from case inputs and source claims to a bounded model result, review, and next test—not an autonomous guarantee.',
    sections: [
      {
        id: 'decision-support-workflow',
        title: 'A decision-support workflow, not a literature chatbot',
        paragraphs: [
          'A case starts with its technology, objective, reactor architecture, influent context, operations, measurements, and evidence. The workflow links those inputs to deterministic rules, optional mechanistic calculations, evidence review, recommendations, and an exportable report. Reports should retain assumptions, defaults, source links, and missing data after leaving the original workspace.',
          'The product does not treat an LLM summary as an evidence record. Discovery metadata can identify candidate papers; extracted text can suggest claims; only reviewed claims with provenance, locator, applicability, and unit handling can enter decision-sensitive evidence pathways.',
          'This is a practical response to a common failure mode in technical systems: a fluent answer can hide an absent measurement or a mismatched source. METREV keeps the data contract and review state visible so the user can distinguish what was observed from what was inferred or modeled.',
        ],
        diagramTitle: 'The report must preserve its evidence trail',
        diagramCaption: 'Select a stage to see which component is responsible.',
        diagramNodes: [
          {
            label: 'Case',
            explanation:
              'The user supplies a bounded technology, objective, architecture, and operating context.',
          },
          {
            label: 'Evidence',
            explanation:
              'Sources and claims retain review state, units, locators, and applicability.',
          },
          {
            label: 'Model',
            explanation:
              'Deterministic equations operate only on complete source-referenced inputs.',
          },
          {
            label: 'Report',
            explanation:
              'Recommendations carry confidence limits, assumptions, evidence, and next tests.',
          },
        ],
        sources: ['hamelers', 'multipop'],
      },
      {
        id: 'typed-inputs-and-provenance',
        title: 'Typed inputs stop silent parameter substitution',
        paragraphs: [
          'Every scientific model parameter needs a value, unit, source kind, and source reference. The source kind distinguishes measured, literature, default, assumption, and test-fixture values. An absent critical model input blocks execution rather than borrowing a plausible value from an unrelated article.',
          'A source DOI can establish where an article is. It does not show that a specific claim was extracted correctly or applies to the current case. The new registry therefore separates the selected publication record from its candidate claims and keeps every claim pending for a human review decision.',
          'The literature registry records a source’s role, study type, application scope, and unresolved review status. A1–A4 or another journal classification may be stored only with its scheme, evaluation area, cycle, ISSN, retrieval date, and official source; none of those labels substitutes for study-level review.',
        ],
        diagramTitle: 'Each parameter carries its provenance',
        diagramCaption:
          'A complete parameter retains both a value and the evidence that supports it.',
        diagramNodes: [
          {
            label: 'Value',
            explanation:
              'Store the value without rounding away source precision.',
          },
          {
            label: 'Unit',
            explanation:
              'Check dimensions and conversion explicitly before solving.',
          },
          {
            label: 'Source kind',
            explanation:
              'Distinguish measured values from literature, assumptions, defaults, and fixtures.',
          },
          {
            label: 'Locator',
            explanation:
              'Retain the DOI plus page/table/figure or exact source span for human review.',
          },
        ],
        sources: ['hamelers', 'multipop', 'tardy'],
      },
      {
        id: 'executable-model-boundary',
        title: 'The executable solver is a bounded 0D model',
        paragraphs: [
          'The current process model uses lumped anode and cathode states, one electroactive biomass state, Monod COD uptake, selected Butler–Volmer kinetics, electrolyte/separator/contact resistance, cathode oxygen transfer for an MFC, and an external voltage boundary for an MEC. It uses a fixed temperature and explicit RK4 integration for dynamic states.',
          'Named executable configurations include MFC/MEC batch and continuously mixed two-compartment cases when flow, circuit, biological, geometry, and material inputs are complete and source-referenced. A static amperometric calibration can run standalone or be coupled to the supported power boundary. A living MFC BOD assay is a different dynamic sensor model.',
          'The solver does not resolve spatial biofilm gradients, multiple competing microbial guilds, alkalinity speciation, nitrogen balances, dynamic thermal behavior, gas crossover or transfer, tubular flow, electrical stacks, or plant-scale LCA. A catalog makes these research profiles visible without pretending they already run.',
        ],
        diagramTitle: 'Executable scope and research gaps',
        diagramCaption:
          'Select a boundary to see what the current 0D formulation contains.',
        diagramNodes: [
          {
            label: 'States',
            explanation:
              'COD, one electroactive biomass state, cathode oxygen, and anode/cathode pH are lumped.',
          },
          {
            label: 'Current',
            explanation:
              'Algebraic current couples electron supply, kinetics, transport, and the MFC/MEC circuit boundary.',
          },
          {
            label: 'Missing',
            explanation:
              'Spatial biofilms, multipopulation kinetics, gas transfer, and thermal dynamics remain outside the solver.',
          },
          {
            label: 'Profile gate',
            explanation:
              'Research-only configurations return insufficient data instead of reusing the 0D model.',
          },
        ],
        sources: ['hamelers', 'zeng', 'multipop', 'picioreanu'],
      },
      {
        id: 'validation-is-separate',
        title: 'Numerical output is not experimental validation',
        paragraphs: [
          'Model execution means the equations produced a numerical trajectory for the supplied inputs. It does not establish predictive accuracy. A validation claim needs measured observations that were not used for calibration or training, matched conditions, exact metric and unit, a documented comparison coordinate, and error analysis.',
          'The existing comparison gate can compute a signed residual only when review status, dataset role, condition match, metric, unit, and coordinates agree. It does not currently set acceptance thresholds or calculate a statistical prediction interval. These limits should remain visible in reports and product language.',
          'A stronger next numerical step is time-step refinement and mass-balance closure checks on representative cases; a stronger empirical step is an independent, matched MFC/MEC dataset with reusable units and locators. Neither step should be mislabeled as the other.',
        ],
        diagramTitle:
          'Model execution and empirical validation are different gates',
        diagramCaption:
          'Choose a gate to see the evidence needed to pass through it.',
        diagramNodes: [
          {
            label: 'Run',
            explanation:
              'Complete inputs allow the deterministic equations to execute.',
          },
          {
            label: 'Closure',
            explanation:
              'Check numerical mass and electrical accounting residuals for the implemented balances.',
          },
          {
            label: 'Data match',
            explanation:
              'Compare only with independent measurements under matched conditions and units.',
          },
          {
            label: 'Assessment',
            explanation:
              'Report error and uncertainty; do not claim validation without a declared criterion.',
          },
        ],
        sources: ['multipop', 'hamelers'],
      },
      {
        id: 'gpt6-role',
        title: 'GPT‑6 can assist the workflow without owning the evidence',
        paragraphs: [
          'GPT‑6 is useful for bounded tasks such as drafting a report explanation, organizing a search result, or proposing candidate spans from a source document. The implementation uses the official Responses API when a deployment explicitly selects OpenAI mode and configures a key. The default remains a deterministic local stub; no network call occurs merely because the package exists.',
          'Candidate measurement and qualitative extractions must quote an exact span from the supplied source, retain the expected source-document identifier, and pass local schema and ontology checks. These safeguards reject fabricated spans and mismatched document IDs, but they do not prove that a claim is scientifically correct or that a page locator is genuine. Human review remains required.',
          'The provider receives only the bounded case or report context needed for the task, makes no browsing or database tools available, stores Responses API output off by default, and falls back to a deterministic response on failure. Refusal cases such as requests to dump the warehouse or simulate a new scenario are handled deterministically before a model call.',
        ],
        diagramTitle: 'LLM assistance is a candidate-generation stage',
        diagramCaption:
          'Select the actor to inspect its boundary and responsibility.',
        diagramNodes: [
          {
            label: 'GPT‑6',
            explanation:
              'Draft a bounded narrative or candidate extraction from supplied context.',
          },
          {
            label: 'Validator',
            explanation:
              'Check exact source span, expected document ID, field allowlists, schema, and units.',
          },
          {
            label: 'Reviewer',
            explanation:
              'Confirm interpretation, locator, applicability, study design, and review status.',
          },
          {
            label: 'Decision',
            explanation:
              'Use only accepted, scoped evidence with source lineage; the LLM cannot accept a claim.',
          },
        ],
        sources: ['capa'],
      },
      {
        id: 'next-technical-gains',
        title: 'The next technical gains are measurable',
        paragraphs: [
          'Near-term improvements should be driven by verification: add time-step convergence diagnostics; build an independent, source-located test corpus for MFC and MEC; report sensitivity and parameter identifiability separately; replace heuristic confidence scores with named coverage indicators; and measure prediction error on held-out data before enabling stronger recommendation language.',
          'Architecture expansion should follow an evidence and software gate. A two-dimensional biofilm model needs spatial discretization and solver verification; a stack needs network and manifold balances; a multi-population MEC model needs population-resolved observations. Each should have a profile, parameter contract, reference cases, convergence tests, and scope statement before it reaches an executable selector.',
          'The source register now exits its empty state with DOI-level records and locator-backed candidate claims, but all remain pending human review. The pages below explain the boundary. The owner’s next useful action is to review those claims and select an independent dataset for a matched validation plan.',
        ],
        diagramTitle: 'A model extension earns its executable status',
        diagramCaption:
          'Click each gate to see what must exist before a profile can run.',
        diagramNodes: [
          {
            label: 'Formulation',
            explanation:
              'State equations, assumptions, numerical method, and intended applicability.',
          },
          {
            label: 'Parameters',
            explanation:
              'Define required values, units, source kinds, references, and identification limits.',
          },
          {
            label: 'Verification',
            explanation:
              'Test units, limiting cases, conservation, solver refinement, and regression fixtures.',
          },
          {
            label: 'Validation',
            explanation:
              'Use a separate source-reviewed and matched experimental dataset with error analysis.',
          },
        ],
        sources: ['hamelers', 'zeng', 'multipop', 'picioreanu'],
      },
    ],
    sources: [
      sources.hamelers,
      sources.zeng,
      sources.multipop,
      sources.call,
      sources.tardy,
      sources.sugioka,
      sources.salvian,
      sources.spurr,
      sources.picioreanu,
      sources.stack,
      sources.capa,
    ],
  },
};
