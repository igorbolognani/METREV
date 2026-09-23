export type PublicTopicSlug =
  | 'problem'
  | 'technology'
  | 'stack'
  | 'comparison'
  | 'impact'
  | 'metrev';

export type PublicTone = 'teal' | 'sky' | 'amber' | 'violet' | 'mint' | 'ink';

export type PublicMiniVisualKind =
  | 'wave'
  | 'cluster'
  | 'grid'
  | 'stack'
  | 'signal'
  | 'gauge'
  | 'bars'
  | 'report'
  | 'compare'
  | 'map'
  | 'network'
  | 'flow';

export type PublicCenterKind = PublicTopicSlug;

export type PublicOrbitPosition =
  | 'north-west'
  | 'north-east'
  | 'south-west'
  | 'south-east';

export interface PublicTopicLegendItem {
  label: string;
  detail: string;
  tone: PublicTone;
}

export interface PublicTopicOrbitLabel {
  label: string;
  tone: PublicTone;
  position: PublicOrbitPosition;
}

export interface PublicDialogSection {
  label: string;
  body: string;
}

export interface PublicDialogContent {
  eyebrow: string;
  title: string;
  lead: string;
  sections: PublicDialogSection[];
  takeaway: string;
}

export interface PublicInfographicPanel {
  number: number;
  title: string;
  subtitle: string;
  tone: PublicTone;
  visualKind: PublicMiniVisualKind;
  bullets: [string, string];
}

export interface PublicTopicHighlight {
  title: string;
  body: string;
}

export interface PublicTopicConfig {
  slug: PublicTopicSlug;
  navLabel: string;
  accentTone: PublicTone;
  routeMarker: string;
  cardTitle: string;
  cardSummary: string;
  previewPoints: [string, string, string];
  heroEyebrow: string;
  heroTitle: string;
  heroLead: string;
  questionTitle: string;
  questionLead: string;
  centerKind: PublicCenterKind;
  centerTitle: string;
  centerSummary: string;
  legendTitle: string;
  legendLead: string;
  orbitLabels: [
    PublicTopicOrbitLabel,
    PublicTopicOrbitLabel,
    PublicTopicOrbitLabel,
    PublicTopicOrbitLabel,
  ];
  infographicNote: string;
  legend: [PublicTopicLegendItem, PublicTopicLegendItem, PublicTopicLegendItem];
  panels: [
    PublicInfographicPanel,
    PublicInfographicPanel,
    PublicInfographicPanel,
    PublicInfographicPanel,
    PublicInfographicPanel,
    PublicInfographicPanel,
  ];
  highlights: PublicTopicHighlight[];
  footerNote: string;
}

interface PublicPanelDialogOverride {
  lead?: string;
  sectionBodies?: string[];
  sectionLabels?: string[];
  takeaway?: string;
}

const defaultPanelSectionLabels = [
  'System function',
  'Engineering pressure',
  'Decision risk',
  'What METREV checks',
] as const;

const publicPanelRiskByTopic: Record<PublicTopicSlug, string> = {
  problem:
    'Do not treat one promising material, paper, or supplier story as proof that influent chemistry, startup stability, fouling pressure, observability, and maintenance reality are already cleared.',
  technology:
    'Do not treat MFC, MEC, standalone biosensors, and cell-integrated biosensors as interchangeable systems or evidence classes.',
  stack:
    'Do not let performance language float free from reactor geometry, electrode materials, separator behavior, auxiliaries, sensor coverage, and operator routine.',
  comparison:
    'Do not rank routes without a compatible normalization basis, comparable operating regime, chemistry fit, and explicit evidence quality.',
  impact:
    'Do not translate route interest into sustainability proof unless the pathway, system boundary, readiness, and dependencies are all named.',
  metrev:
    'Do not describe the product as chat-first or simulation-first when its defensible value is traceable decision support tied to typed evidence, defaults, and report-backed review.',
};

const publicPanelCheckByTopic: Record<PublicTopicSlug, string> = {
  problem:
    'Check which wastewater, solids, startup, maintenance, separator, or monitoring measurements are still missing before route selection becomes defensible.',
  technology:
    'Check whether MFC or MEC operation, wastewater boundaries, biosensor deployment mode, and monitored signals match the case being evaluated.',
  stack:
    'Check which configured hardware, biology, control logic, service routines, and auxiliary systems are explicit versus still assumed.',
  comparison:
    'Check which metrics share a valid normalization basis and which candidate routes still need better-matched evidence before narrowing further.',
  impact:
    'Check which outcome claims are measured, which rely on modeled assumptions, and which dependencies could still weaken the impact story.',
  metrev:
    'Check that the report preserves defaults, evidence limits, uncertainty, and next actions when the decision leaves the original workspace context.',
};

const publicPanelDialogOverrides: Partial<
  Record<PublicTopicSlug, Partial<Record<number, PublicPanelDialogOverride>>>
> = {
  problem: {
    6: {
      lead: 'Evidence confidence is part of the engineering surface because unsupported certainty distorts every later recommendation.',
      sectionBodies: [
        'This board treats evidence confidence as part of the engineering surface rather than as a reporting afterthought.',
        'Literature fragments, supplier claims, defaults, and missing operating measurements should not be treated as equivalent sources of trust.',
        'When the evidence base is thin, teams often overcommit to a route before the wastewater context, startup burden, and monitoring needs have actually been bounded.',
        'METREV should narrow confidence and recommend which missing measurements, pilots, or benchmark records would reduce uncertainty fastest.',
      ],
      takeaway:
        'In METREV, weak evidence should narrow the recommendation and strengthen the next-test plan at the same time.',
    },
  },
  comparison: {
    4: {
      lead: 'Treatment performance and route-specific secondary outputs matter only alongside chemistry fit and operational burden.',
      sectionBodies: [
        'This board keeps treatment outcomes and system boundaries visible alongside any electrical or MEC hydrogen output.',
        'Those outputs matter only if the candidate fits the actual wastewater, remains operable, and has comparable evidence.',
        'Teams often overread isolated performance numbers and underweight maturity, maintenance, chemistry fit, and evidence comparability.',
        'Check treatment and secondary-output evidence under comparable influent chemistry, operating regime, normalization basis, and scale assumptions.',
      ],
    },
  },
  metrev: {
    5: {
      lead: 'The report is the external decision surface of the workflow, so it has to carry traceability, uncertainty, and next actions without collapsing into dashboard fragments.',
      sectionBodies: [
        'This board treats the report as the external decision surface of the workflow rather than as a decorative export.',
        'A usable report links diagnosis, recommendations, suppliers, roadmap, defaults, and audit signals into one shareable deliverable.',
        'If uncertainty notes, evidence limits, or next tests disappear here, the workflow stops being defendable outside the workspace.',
        'Confirm that recommendations, provenance, and follow-up actions stay readable when the report leaves the original review context.',
      ],
    },
  },
};

function buildDialogSections(input: {
  labels?: readonly string[];
  bodies: string[];
}): PublicDialogSection[] {
  const labels = input.labels ?? defaultPanelSectionLabels;

  return input.bodies.map((body, index) => ({
    label: labels[index] ?? `Section ${String(index + 1).padStart(2, '0')}`,
    body,
  }));
}

function getPublicLensLabel(topic: PublicTopicConfig): string {
  return topic.slug === 'impact' ? 'impact' : topic.navLabel.toLowerCase();
}

function buildDefaultPanelDialogBodies(
  topic: PublicTopicConfig,
  panel: PublicInfographicPanel,
): string[] {
  return [
    `${panel.title} keeps ${panel.subtitle.toLowerCase()} visible as one explicit decision surface inside the ${topic.routeMarker.toLowerCase()}, so route selection stays tied to an MFC/MEC process or electrochemical sensing mechanism instead of to a generic promise statement.`,
    `${panel.bullets[0]} ${panel.bullets[1]}`,
    publicPanelRiskByTopic[topic.slug],
    publicPanelCheckByTopic[topic.slug],
  ];
}

export function getPublicTopicHref(slug: PublicTopicSlug): string {
  return `/learn/${slug}`;
}

export const PUBLIC_TOPIC_PAGES: PublicTopicConfig[] = [
  {
    slug: 'problem',
    navLabel: 'Problem',
    accentTone: 'teal',
    routeMarker: 'Pressure map',
    cardTitle:
      'Map wastewater, MFC/MEC, and biosensor constraints before choosing a system.',
    cardSummary:
      'Keep influent chemistry, conductivity, pH, temperature, solids exposure, hydraulic regime, fouling pressure, serviceability, and evidence strength in one frame before an MFC, MEC, or biosensor configuration is treated as deployment-ready.',
    previewPoints: [
      'influent chemistry',
      'biofilm pressure',
      'scale-up burden',
    ],
    heroEyebrow: 'System constraint map',
    heroTitle:
      'See the full operating pressure around a bioelectrochemical decision.',
    heroLead:
      'An MFC/MEC decision couples wastewater chemistry, conductivity, pH, temperature, hydraulic regime, biofilm maturity, transport losses, maintenance burden, and observability. This page keeps those interacting constraints visible before reactor or material choices are treated as credible.',
    questionTitle: 'Frame the wastewater boundary first.',
    questionLead:
      'Use this lens when laboratory promise outruns case definition. It forces missing measurements, fouling exposure, startup uncertainty, and monitoring burden into the same decision frame before stack selection.',
    centerKind: 'problem',
    centerTitle: 'Wastewater MFC/MEC decision',
    centerSummary:
      'The public problem is not just performance. It is choosing under interacting wastewater, stack, and evidence pressures.',
    legendTitle: 'Read the pressure map from stream to deployment.',
    legendLead:
      'Start at the wastewater core, then read the four orbit tags around it: influent reality, biofilm response, maintainability pressure, and evidence confidence.',
    orbitLabels: [
      { label: 'influent reality', tone: 'sky', position: 'north-west' },
      { label: 'biofilm response', tone: 'mint', position: 'north-east' },
      { label: 'upkeep burden', tone: 'amber', position: 'south-east' },
      { label: 'evidence confidence', tone: 'ink', position: 'south-west' },
    ],
    infographicNote:
      'Each panel isolates one engineering variable that can change MFC/MEC plausibility. Together they show why route selection is a coupled wastewater-and-stack decision rather than a single-material choice.',
    legend: [
      {
        label: 'Influent reality',
        detail:
          'Chemistry, salts, inhibitors, and loading define the operating envelope before hardware selection begins.',
        tone: 'teal',
      },
      {
        label: 'Biological and physical response',
        detail:
          'Biofilm behavior, transport resistance, and fouling pressure move with the same decision.',
        tone: 'sky',
      },
      {
        label: 'Deployment pressure',
        detail:
          'Scale-up burden, service access, and evidence quality decide whether the system is actually plausible.',
        tone: 'amber',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'Influent chemistry',
        subtitle: 'COD, salts, pH, inhibitors',
        tone: 'teal',
        visualKind: 'wave',
        bullets: [
          'Conductivity, COD strength, salts, inhibitors, and pH can either stabilize the electroactive pathway or suppress it before startup is complete.',
          'The wastewater itself filters which MFC/MEC claims remain realistic once the case leaves the paper and enters a real operating envelope.',
        ],
      },
      {
        number: 2,
        title: 'Biofilm stability',
        subtitle: 'Microbial response under load',
        tone: 'mint',
        visualKind: 'cluster',
        bullets: [
          'Electroactive communities need the right surface condition, startup protocol, and shock tolerance if current generation is expected to remain stable.',
          'A strong laboratory biofilm does not guarantee resilience under variable load, intermittent maintenance, or uncharacterized inoculum behavior.',
        ],
      },
      {
        number: 3,
        title: 'Mass transfer',
        subtitle: 'Spacing, flow, separator path',
        tone: 'sky',
        visualKind: 'grid',
        bullets: [
          'Electrode spacing, flow distribution, and separator logic change ohmic resistance, crossover exposure, and the current that remains usable at site scale.',
          'Transport losses often explain why an elegant paper configuration collapses once residence time, footprint, and maintenance access become real constraints.',
        ],
      },
      {
        number: 4,
        title: 'Fouling burden',
        subtitle: 'Maintenance and uptime',
        tone: 'violet',
        visualKind: 'stack',
        bullets: [
          'Scaling, clogging, contamination, and cleaning-path complexity can raise operating burden faster than headline performance suggests.',
          'Maintenance risk can overturn an otherwise attractive configuration when uptime, labor, and service access are folded back into the decision.',
        ],
      },
      {
        number: 5,
        title: 'Scale-up economics',
        subtitle: 'Surface area, cost, plant fit',
        tone: 'amber',
        visualKind: 'bars',
        bullets: [
          'Electrode area, reactor footprint, auxiliary systems, and replacement cycles matter early because they shape both CAPEX and serviceable plant fit.',
          'The viable design is the one the site can sustain through maintenance, utilities, and operating discipline, not only the one with the best curve.',
        ],
      },
      {
        number: 6,
        title: 'Evidence gaps',
        subtitle: 'What is known vs. assumed',
        tone: 'ink',
        visualKind: 'network',
        bullets: [
          'Supplier claims, small studies, inferred defaults, and missing measurements should not appear to carry the same evidentiary weight.',
          'METREV keeps assumption pressure, missing data, and confidence penalties visible so unsupported certainty cannot quietly drive the route choice.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'This lens keeps the wastewater case whole: feed chemistry, electroactive biology, transport losses, maintenance burden, observability, and evidence confidence stay visible before technology choice begins.',
      },
      {
        title: 'Engineering pressure',
        body: 'Influent type, pH, temperature, conductivity, retention time, solids load, startup behavior, separator path, and service access shape MFC/MEC wastewater feasibility.',
      },
      {
        title: 'Decision risk',
        body: 'Teams usually overreach when one promising lab result is treated as proof that chemistry fit, transport discipline, scale-up burden, and monitoring coverage have already been cleared.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV keeps missing measurements, defaults, serviceability pressure, evidence quality, and confidence penalties in the same frame so the first output can still be “not decision-ready yet”.',
      },
    ],
    footerNote:
      'In METREV the correct next step may still be characterization, pilot framing, or a narrower feasibility screen; a stack recommendation only deserves confidence after the wastewater boundary, missing-data penalties, and operating window are explicit.',
  },
  {
    slug: 'technology',
    navLabel: 'Technology',
    accentTone: 'sky',
    routeMarker: 'Cell primer',
    cardTitle:
      'Model MFCs, MECs, and wastewater biosensors within their system boundaries.',
    cardSummary:
      'Compare wastewater MFCs, externally assisted MECs, and standalone or cell-integrated electrochemical biosensors using explicit materials, operating inputs, and measurements.',
    previewPoints: ['MFC', 'MEC', 'standalone and integrated biosensors'],
    heroEyebrow: 'Technology primer',
    heroTitle: 'Model wastewater MFCs, MECs, and electrochemical biosensors.',
    heroLead:
      'METREV focuses on microbial fuel cells (MFCs), microbial electrolysis cells (MECs), wastewater management and treatment, and electrochemical biosensors. Biosensors may run as standalone instruments or be integrated with an MFC or MEC. The coupled model keeps wastewater, biology, materials, electrochemistry, operation, and sensor power in one explicit system boundary.',
    questionTitle: 'Separate family, objective, and signal.',
    questionLead:
      'Use this lens to distinguish MFC electrical output, MEC external electrical input with hydrogen as a secondary output, and standalone or cell-integrated wastewater sensing.',
    centerKind: 'technology',
    centerTitle: 'MFC, MEC, and wastewater biosensors',
    centerSummary:
      'Wastewater, electroactive biology, materials, electrochemistry, and sensing are modeled as connected parts of the declared system.',
    legendTitle: 'Read the configured system from inputs to measurements.',
    legendLead:
      'The orbit tags show system type, electron-transfer path, wastewater boundary, and sensor deployment so the engineering model stays explicit.',
    orbitLabels: [
      { label: 'MFC / MEC / biosensor', tone: 'teal', position: 'north-west' },
      { label: 'electron path', tone: 'sky', position: 'north-east' },
      { label: 'separator behavior', tone: 'mint', position: 'south-east' },
      { label: 'measured outputs', tone: 'amber', position: 'south-west' },
    ],
    infographicNote:
      'Each panel explains one part of the active MFC, MEC, wastewater, and biosensor model boundary.',
    legend: [
      {
        label: 'Active system types',
        detail:
          'MFCs, MECs, and electrochemical biosensors use distinct boundaries and evidence requirements.',
        tone: 'teal',
      },
      {
        label: 'Electrochemical pathway',
        detail:
          'Electron transfer, transport losses, and separator behavior shape what the cell can actually deliver.',
        tone: 'sky',
      },
      {
        label: 'Measured readout',
        detail:
          'Voltage, current, wastewater quality, conductivity, gas, and flow connect the model to plant operations.',
        tone: 'amber',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'MFC',
        subtitle: 'Power from treatment',
        tone: 'teal',
        visualKind: 'signal',
        bullets: [
          'Microbial fuel cells couple treatment with direct current generation, so useful output depends on both pollutant removal and stable electrical readout.',
          'They are often strongest where sensing or low-power recovery matters more than large standalone energy claims.',
        ],
      },
      {
        number: 2,
        title: 'MEC',
        subtitle: 'Assisted electrolysis route',
        tone: 'amber',
        visualKind: 'flow',
        bullets: [
          'Microbial electrolysis cells apply external voltage to shift reaction energetics toward hydrogen or other reduced products, making cathode design and gas handling central.',
          'The energy balance, crossover control, and product recovery pathway must be read differently than an MFC case.',
        ],
      },
      {
        number: 3,
        title: 'Wastewater biosensors',
        subtitle: 'Standalone or cell-integrated sensing',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'A wastewater biosensor may operate as a standalone instrument or be integrated with an MFC or MEC; each deployment has an explicit power source and sensor boundary.',
          'Analyte, matrix, recognition element, electrodes, immobilization, calibration, detection limits, drift, and interferences define the sensing case.',
        ],
      },
      {
        number: 4,
        title: 'Electron transfer path',
        subtitle: 'Anode, cathode, resistance',
        tone: 'sky',
        visualKind: 'stack',
        bullets: [
          'Surface chemistry, mediator behavior, biofilm contact, and internal resistance decide whether electron flow remains interpretable and useful.',
          'Performance language should stay attached to the actual electron-transfer path instead of generic high-output claims.',
        ],
      },
      {
        number: 5,
        title: 'Separator and transport',
        subtitle: 'Ion movement and loss',
        tone: 'mint',
        visualKind: 'grid',
        bullets: [
          'Membrane choice, pH gradients, ion transport, and electrode spacing shape resistance, crossover, and long-run stability.',
          'These design variables often decide scalability more than high-level technology branding.',
        ],
      },
      {
        number: 6,
        title: 'Monitored signals',
        subtitle: 'Voltage, COD, conductivity, flow',
        tone: 'ink',
        visualKind: 'wave',
        bullets: [
          'Voltage, current, COD, conductivity, flow, temperature, gas composition, and startup trends are what turn MFC/MEC science into an auditable operating story.',
          'METREV treats those measurements as part of the technology definition, not as optional reporting extras.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'The active scope is wastewater management and treatment with MFCs or MECs, plus electrochemical biosensing in standalone and integrated deployments. MEC hydrogen remains a secondary output.',
      },
      {
        title: 'Engineering pressure',
        body: 'Family choice depends on influent context, conductivity, pH, temperature, gas handling, separator logic, transport path, and the signals that must stay measurable during operation.',
      },
      {
        title: 'Decision risk',
        body: 'Maturity language gets distorted when MFC and MEC configurations are collapsed into one story or when output promises are detached from the measurements that would validate them.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV ties family selection to objective, monitored variables, configured system boundaries, and evidence posture so a technology label never substitutes for engineering fit.',
      },
    ],
    footerNote:
      'Inside METREV, naming the family only opens the analysis; the route still has to resolve into a configured stack, a measurement plan, and a comparison frame before it becomes advice.',
  },
  {
    slug: 'stack',
    navLabel: 'Stack',
    accentTone: 'mint',
    routeMarker: 'Stack blueprint',
    cardTitle: 'Anchor every recommendation to the configured stack.',
    cardSummary:
      'Treat the stack as an explicit system: reactor architecture, electrodes, separator logic, interconnects, biology, balance of plant, sensors, and operating protocol all shape whether a recommendation is defensible.',
    previewPoints: ['reactor', 'electrodes', 'sensors and operation'],
    heroEyebrow: 'Configured stack',
    heroTitle:
      'See the system the way METREV evaluates it: one explicit stack at a time.',
    heroLead:
      'A defensible MFC or MEC recommendation has to point back to a configured system: reactor architecture, electrode supports, separator logic, interconnects, gas and liquid auxiliaries, sensors, and operating routines. This page shows the layers METREV keeps explicit before any output is interpreted as advice.',
    questionTitle: 'Keep the stack explicit.',
    questionLead:
      'Use this lens when discussion drifts into vague performance language. A valid recommendation must still map to parts an engineer can specify, procure, instrument, maintain, and replace.',
    centerKind: 'stack',
    centerTitle: 'Configured MFC/MEC system',
    centerSummary:
      'Reactor architecture, materials, biofilm, auxiliaries, and control routines must stay visible as one connected system.',
    legendTitle: 'Read the configured stack from hardware to operation.',
    legendLead:
      'The orbit tags keep reactor layout, biofilm attachment, membrane transport, and instrumentation tied to the same system boundary.',
    orbitLabels: [
      { label: 'reactor frame', tone: 'teal', position: 'north-west' },
      { label: 'biofilm layer', tone: 'mint', position: 'north-east' },
      { label: 'membrane path', tone: 'violet', position: 'south-east' },
      { label: 'control loop', tone: 'sky', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is one controllable layer of the stack. Together they define what the evaluation is actually about and what can still be tuned, serviced, or replaced.',
    legend: [
      {
        label: 'Physical hardware',
        detail:
          'Reactor, electrodes, membrane, interconnects, and plant hardware define the system boundary.',
        tone: 'teal',
      },
      {
        label: 'Biological layer',
        detail:
          'Biofilm behavior is part of the configured stack, not a hidden afterthought or one-off lab artifact.',
        tone: 'mint',
      },
      {
        label: 'Operating layer',
        detail:
          'Sensors, setpoints, and operating window connect specification choices to actual site behavior.',
        tone: 'sky',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'Reactor',
        subtitle: 'Volume, flow path, footprint',
        tone: 'teal',
        visualKind: 'stack',
        bullets: [
          'Architecture fixes residence time distribution, hydraulic path, footprint, clean-in-place access, and retrofit feasibility long before material optimization matters.',
          'A strong electrode material cannot rescue a reactor frame that is mismatched to solids load or service access.',
        ],
      },
      {
        number: 2,
        title: 'Anode',
        subtitle: 'Surface, conductivity, durability',
        tone: 'sky',
        visualKind: 'grid',
        bullets: [
          'The anode couples conductivity, surface texture, wettability, durability, and replacement burden where electroactive biology attaches.',
          'Useful anode selection balances current density with fouling tolerance, cost, and practical lifecycle management.',
        ],
      },
      {
        number: 3,
        title: 'Biofilm',
        subtitle: 'Community and attachment',
        tone: 'mint',
        visualKind: 'cluster',
        bullets: [
          'Biofilm performance reflects inoculum, startup regime, shear exposure, nutrient balance, and the interface created by the anode surface.',
          'Attachment quality and resilience are system responses, not detachable performance bonuses.',
        ],
      },
      {
        number: 4,
        title: 'Cathode',
        subtitle: 'Reaction target and losses',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'Cathode chemistry defines the target reaction, overpotential, catalyst burden, gas handling needs, and crossover sensitivity of the route.',
          'Cathode-side losses can dominate both energy balance and maintenance cost in product-oriented systems.',
        ],
      },
      {
        number: 5,
        title: 'Membrane',
        subtitle: 'Separation and transport',
        tone: 'violet',
        visualKind: 'flow',
        bullets: [
          'Separator selection shapes ion transport, pH gradient management, fouling behavior, and leakage between compartments.',
          'Membrane losses often explain why a promising architecture becomes unstable or uneconomic outside controlled studies.',
        ],
      },
      {
        number: 6,
        title: 'Sensors and operation',
        subtitle: 'What keeps the stack readable',
        tone: 'ink',
        visualKind: 'gauge',
        bullets: [
          'Sensors, setpoints, alarms, and operator routines are what turn a configured stack into a controllable scientific instrument.',
          'A configuration without readable operation, baseline logging, and disciplined adjustments is not decision-ready.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'The stack lens keeps each MFC or MEC readable as one system object instead of letting performance claims drift toward one material, one electrode, or one isolated subsystem.',
      },
      {
        title: 'Engineering pressure',
        body: 'Reactor geometry, anode support, cathode strategy, separator behavior, interconnects, flow control, gas handling, startup routine, and sensor coverage all change stack behavior.',
      },
      {
        title: 'Decision risk',
        body: 'Teams overreach when reactor, auxiliaries, monitoring, and serviceability are hidden behind a simplified “good stack” story that no operator can actually inspect.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV anchors every recommendation to the configured hardware, biology, operating controls, and auxiliary burden so evidence is matched to a real system boundary.',
      },
    ],
    footerNote:
      'Inside METREV the stack is the central evaluated object because evidence only becomes useful when it can be attached to a specific, inspectable, and adjustable system boundary.',
  },
  {
    slug: 'comparison',
    navLabel: 'Comparison',
    accentTone: 'amber',
    routeMarker: 'Tradeoff matrix',
    cardTitle: 'Compare wastewater MFC and MEC cases against a clear baseline.',
    cardSummary:
      'Use mature wastewater treatment routes as context while comparing MFC and MEC cases by treatment performance, energy boundary, wastewater fit, and evidence quality.',
    previewPoints: [
      'wastewater baselines',
      'treatment performance',
      'maturity and fit',
    ],
    heroEyebrow: 'Route comparison',
    heroTitle: 'Compare MFC and MEC wastewater cases with matched evidence.',
    heroLead:
      'METREV compares MFC/MEC wastewater cases with context from mature treatment routes. It checks matched influent, treatment targets, operating conditions, service burden, and evidence before presenting a directional result.',
    questionTitle: 'Normalize before you rank.',
    questionLead:
      'Use this lens when teams need to compare wastewater routes without hiding normalization basis, maturity gap, maintenance exposure, or chemistry mismatch behind one headline metric.',
    centerKind: 'comparison',
    centerTitle: 'Decision matrix',
    centerSummary:
      'Treatment outcomes lead the comparison; energy input/output, maturity, and chemistry fit remain explicit secondary dimensions.',
    legendTitle: 'Compare treatment outcomes on matched boundaries.',
    legendLead:
      'The orbit tags keep wastewater targets, system energy, maintenance burden, and influent chemistry in the same frame.',
    orbitLabels: [
      { label: 'mature baselines', tone: 'sky', position: 'north-west' },
      { label: 'MFC / MEC outputs', tone: 'teal', position: 'north-east' },
      { label: 'maintenance burden', tone: 'ink', position: 'south-east' },
      { label: 'chemistry fit', tone: 'violet', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is one comparison dimension. Together they keep route choice grounded instead of aspirational.',
    legend: [
      {
        label: 'Baseline anchors',
        detail:
          'Mature wastewater treatment routes remain visible so MFC/MEC comparisons have operating context and service benchmarks.',
        tone: 'sky',
      },
      {
        label: 'MFC / MEC outputs',
        detail:
          'Treatment, MFC electricity, MEC electrical input, and secondary hydrogen are kept distinct and source-grounded.',
        tone: 'teal',
      },
      {
        label: 'Decision burden',
        detail:
          'Maturity, maintainability, normalization discipline, and operating fit prevent false wins.',
        tone: 'amber',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'Conventional treatment',
        subtitle: 'Operationally mature anchor',
        tone: 'sky',
        visualKind: 'bars',
        bullets: [
          'Activated sludge and other mature treatment trains may provide context when the case owner selects them as a comparison baseline.',
          'Operator familiarity, spare parts, compliance history, and existing infrastructure are context fields, not active METREV technology choices.',
        ],
      },
      {
        number: 2,
        title: 'Anaerobic digestion',
        subtitle: 'Optional wastewater treatment comparator',
        tone: 'mint',
        visualKind: 'compare',
        bullets: [
          'Anaerobic digestion may be included as a site-selected comparator when it is part of the existing wastewater train.',
          'Its operating boundary and measured outputs must be kept separate from MFC/MEC model results.',
        ],
      },
      {
        number: 3,
        title: 'MFC and MEC wastewater cases',
        subtitle: 'Coupled treatment and electrochemistry',
        tone: 'teal',
        visualKind: 'network',
        bullets: [
          'MFCs and MECs are evaluated for wastewater treatment using their distinct electrical boundaries; electrochemical biosensors cover standalone and cell-integrated sensing.',
          'Comparisons depend on influent chemistry, scale, monitoring discipline, and service burden.',
        ],
      },
      {
        number: 4,
        title: 'Treatment and energy metrics',
        subtitle: 'Primary and secondary results',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'Compare COD and water-quality results with current/power for MFCs and electrical input plus secondary captured hydrogen for MECs.',
          'Modeled potential must remain distinct from measured site performance.',
        ],
      },
      {
        number: 5,
        title: 'Maturity and maintainability',
        subtitle: 'How hard the route is to sustain',
        tone: 'ink',
        visualKind: 'gauge',
        bullets: [
          'A route with weak maturity often demands more operator time, spare troubleshooting capacity, and tolerance for uncertain failure modes.',
          'METREV keeps that burden visible next to upside metrics so novelty does not masquerade as readiness.',
        ],
      },
      {
        number: 6,
        title: 'Chemistry fit',
        subtitle: 'Can this route survive the stream',
        tone: 'violet',
        visualKind: 'wave',
        bullets: [
          'Influent composition, conductivity, solids, inhibitors, and variability filter which routes are plausible before comparison tables even begin.',
          'If chemistry fit is weak, the route should not win on aesthetics, isolated metrics, or unqualified optimism.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'The comparison lens keeps MFC/MEC wastewater cases beside explicitly selected treatment baselines without treating model output as measured performance.',
      },
      {
        title: 'Engineering pressure',
        body: 'Valid comparison depends on compatible metrics, area or volume basis, operating context, chemistry fit, maturity, and realistic burden around maintenance and monitoring.',
      },
      {
        title: 'Decision risk',
        body: 'Teams overclaim when out-of-context performance numbers, supplier claims, or upside narratives outrun normalization discipline and comparable evidence quality.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV widens uncertainty when metrics are not comparable enough and keeps baseline routes visible when they are still safer than an MFC/MEC configuration.',
      },
    ],
    footerNote:
      'In METREV comparison is a narrowing step, not proof of superiority; if the evidence base, chemistry fit, or normalization basis is weak, the output should recommend deeper validation rather than a theatrical winner.',
  },
  {
    slug: 'impact',
    navLabel: 'Results',
    accentTone: 'violet',
    routeMarker: 'Results map',
    cardTitle:
      'Read wastewater, energy, and biosensor results without overclaiming.',
    cardSummary:
      'Keep effluent quality, COD removal, MFC electrical output, MEC input and secondary hydrogen, and biosensor performance tied to declared model limits and evidence.',
    previewPoints: [
      'water quality',
      'MFC and MEC energy metrics',
      'biosensor performance',
    ],
    heroEyebrow: 'Outputs and metrics',
    heroTitle:
      'Read modeled and measured system results on their stated boundaries.',
    heroLead:
      'This page reports wastewater treatment, MFC/MEC electrical boundaries, secondary MEC hydrogen, and biosensor metrics. It keeps model output separate from measured results and identifies assumptions or missing validation.',
    questionTitle: 'Separate model output from measurement.',
    questionLead:
      'Use this lens when reviewing a case result, checking its measurement boundary, or deciding which experiment is needed next.',
    centerKind: 'impact',
    centerTitle: 'System results',
    centerSummary:
      'Wastewater, energy, and sensing metrics are reported with their source and model boundary.',
    legendTitle: 'Read the result with its source and limits.',
    legendLead:
      'The orbit tags separate wastewater response, electrical quantities, biosensor performance, and confidence limits.',
    orbitLabels: [
      { label: 'water quality', tone: 'sky', position: 'north-west' },
      { label: 'energy pathway', tone: 'amber', position: 'north-east' },
      { label: 'biosensor response', tone: 'mint', position: 'south-east' },
      { label: 'confidence boundary', tone: 'ink', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is a modeled or measured wastewater, energy, or sensing result. Model limits stay visible beside the metric.',
    legend: [
      {
        label: 'Water outcome',
        detail:
          'Treatment reliability and process visibility remain the core public-good lens.',
        tone: 'sky',
      },
      {
        label: 'Resource pathway',
        detail:
          'MFC output, MEC electrical input, and captured hydrogen use separate boundaries and units.',
        tone: 'amber',
      },
      {
        label: 'Confidence boundary',
        detail:
          'Impact should contract when evidence is thin or assumptions are still doing the explanatory work.',
        tone: 'mint',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'Water quality',
        subtitle: 'Treatment and process visibility',
        tone: 'sky',
        visualKind: 'wave',
        bullets: [
          'Effluent quality, contaminant removal, and process visibility describe the wastewater treatment outcome.',
          'Treatment credibility depends on measured water-quality response, not on abstract sustainability language.',
        ],
      },
      {
        number: 2,
        title: 'Energy pathway',
        subtitle: 'MFC output and MEC input',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'MFC electricity, MEC electrical input, auxiliary demand, and secondary captured hydrogen are reported as separate quantities.',
          'Auxiliary loads, sensor power, and secondary hydrogen remain separate from the primary electrical quantities.',
        ],
      },
      {
        number: 3,
        title: 'Biosensor performance',
        subtitle: 'Standalone or integrated measurement',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'Standalone and integrated biosensors report calibrated current, range, detection limits, response, drift, and available power.',
          'Calibration, range, detection limits, response, drift, matrix interference, and sensor power define the result.',
        ],
      },
      {
        number: 4,
        title: 'Model limits',
        subtitle: 'What still needs validation',
        tone: 'mint',
        visualKind: 'map',
        bullets: [
          'A 0D model does not resolve spatial transport, detailed aqueous speciation, or competing microbial populations.',
          'Independent data and uncertainty propagation are required before design claims are made.',
        ],
      },
      {
        number: 5,
        title: 'Evidence and validation',
        subtitle: 'What supports the result',
        tone: 'teal',
        visualKind: 'bars',
        bullets: [
          'Model parameters require units and source references; measured outputs require a sampling method and reference method.',
          'Independent observations are required to validate the mechanistic model for a given wastewater and reactor.',
        ],
      },
      {
        number: 6,
        title: 'Confidence boundary',
        subtitle: 'Where caution must remain',
        tone: 'ink',
        visualKind: 'gauge',
        bullets: [
          'The platform should reduce impact certainty when defaults, proxies, and missing measurements are doing too much of the explanatory work.',
          'This is how auditable impact stays distinct from sales copy or grant-friendly storytelling.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'The results view keeps wastewater treatment, cell energy, hydrogen as a secondary MEC output, and biosensor response distinct.',
      },
      {
        title: 'Engineering pressure',
        body: 'Every metric depends on units, operating conditions, measurement method, system boundary, and model status.',
      },
      {
        title: 'Decision risk',
        body: 'Results become misleading when model outputs, measurements, defaults, and unsupported claims are presented as the same type of evidence.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV identifies model limits and missing measurements so the next validation step is visible.',
      },
    ],
    footerNote:
      'METREV reports a result only with its declared boundary; missing data or validation narrows the conclusion and identifies the next measurement.',
  },
  {
    slug: 'metrev',
    navLabel: 'METREV',
    accentTone: 'ink',
    routeMarker: 'Workflow instrument',
    cardTitle: 'See the full METREV workflow as one scientific instrument.',
    cardSummary:
      'Present METREV as a scientific workflow: wastewater and system inputs, coupled MFC/MEC model, standalone/integrated biosensors, reviewed evidence, and next validation steps stay connected.',
    previewPoints: ['configure', 'compare', 'report and follow-up'],
    heroEyebrow: 'Workflow instrument',
    heroTitle:
      'Understand how METREV models wastewater systems and reports the evidence.',
    heroLead:
      'METREV is a scientific decision-support tool for MFC/MEC wastewater systems and electrochemical biosensors. Case normalization, mechanistic execution, source review, deterministic checks, and next measurements stay connected; modeled values are kept separate from observations.',
    questionTitle: 'Treat the workflow as the product.',
    questionLead:
      'Use this lens when you need to explain what the tool actually does, not just what it is about. The workflow itself is the product surface that preserves traceability.',
    centerKind: 'metrev',
    centerTitle: 'METREV workflow instrument',
    centerSummary:
      'Configuration, evidence, comparison, review, recommendation, and reporting form one connected decision path.',
    legendTitle: 'Read the instrument from configuration to report.',
    legendLead:
      'The orbit tags trace the workflow anchors that keep the product grounded: configure, compare, inspect, and report.',
    orbitLabels: [
      { label: 'configure stack', tone: 'sky', position: 'north-west' },
      { label: 'compare evidence', tone: 'teal', position: 'north-east' },
      { label: 'report surface', tone: 'amber', position: 'south-east' },
      { label: 'review outputs', tone: 'mint', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is one step in the instrument workflow. Together they show how the tool turns evidence into a defendable output.',
    legend: [
      {
        label: 'Configured input',
        detail:
          'The workflow starts with wastewater, reactor, materials, biology, electrochemistry, and sensor inputs rather than a generic technology label.',
        tone: 'sky',
      },
      {
        label: 'Decision engine',
        detail:
          'Comparison, diagnostics, and recommendations remain tied to treated evidence, rules, and visible defaults.',
        tone: 'teal',
      },
      {
        label: 'Report output',
        detail:
          'The final surface is a report-backed explanation rather than a free-form assistant guess.',
        tone: 'amber',
      },
    ],
    panels: [
      {
        number: 1,
        title: 'Configure stack',
        subtitle: 'Start from the actual system',
        tone: 'sky',
        visualKind: 'stack',
        bullets: [
          'The workflow begins with explicit reactor, electrodes, separator, biology, auxiliaries, and operating context rather than a vague technology label.',
          'This keeps every later recommendation attached to a defined system boundary.',
        ],
      },
      {
        number: 2,
        title: 'Compare treated data',
        subtitle: 'Evidence and baselines together',
        tone: 'teal',
        visualKind: 'compare',
        bullets: [
          'Local case inputs and treated literature are read alongside baselines, supplier signals, and compatibility rules inside one comparison frame.',
          'Comparison narrows options before recommendation language begins.',
        ],
      },
      {
        number: 3,
        title: 'Inspect outputs',
        subtitle: 'Diagnosis before action',
        tone: 'mint',
        visualKind: 'signal',
        bullets: [
          'Diagnostics expose missing data, compatibility issues, maturity limits, and uncertainty hotspots before action language appears.',
          'Teams can see what is constraining the result instead of receiving a black-box answer.',
        ],
      },
      {
        number: 4,
        title: 'Review recommendations',
        subtitle: 'Prioritized engineering actions',
        tone: 'violet',
        visualKind: 'bars',
        bullets: [
          'Recommendations are prioritized with rationale, defaults, evidence type, and confidence notes attached to each action.',
          'The platform is designed to explain why an option is being ranked, deferred, or ruled out.',
        ],
      },
      {
        number: 5,
        title: 'Generate report',
        subtitle: 'Deliverable, not just dashboard',
        tone: 'amber',
        visualKind: 'report',
        bullets: [
          'The report is the defendable external-facing decision surface of the workflow rather than a decorative export from a dashboard.',
          'Traceability, rationale, uncertainty, and next measurements stay close to the recommendation so the output survives external review.',
        ],
      },
      {
        number: 6,
        title: 'Ask grounded follow-up',
        subtitle: 'Report-scoped explanation',
        tone: 'ink',
        visualKind: 'network',
        bullets: [
          'Follow-up explanation is anchored to the generated report and case context rather than an unbounded chat surface.',
          'This preserves the instrument posture of the product when users need clarification after the first report.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'This lens shows the product as a source-grounded scientific workflow for wastewater MFC/MEC systems and standalone or integrated biosensors.',
      },
      {
        title: 'Engineering pressure',
        body: 'The workflow stays credible only when configuration, evidence typing, defaults, uncertainty, comparison, and reporting remain connected instead of fragmenting into isolated screens.',
      },
      {
        title: 'Decision risk',
        body: 'Product claims overreach when traceability disappears, when supplier signals look validated by default, or when report-grounded follow-up is replaced with open-ended speculation.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV keeps diagnosis, recommendations, impact framing, supplier review, roadmap, defaults, and uncertainty in one auditable sequence so a report can still be defended outside the workspace.',
      },
    ],
    footerNote:
      'This workflow lens is the bridge between public education and the signed-in instrument: the value is not chat-first speed, but traceable decisions that stay grounded when shared, reviewed, and challenged.',
  },
];

export const PUBLIC_TOPIC_PAGE_BY_SLUG = Object.fromEntries(
  PUBLIC_TOPIC_PAGES.map((topic) => [topic.slug, topic]),
) as Record<PublicTopicSlug, PublicTopicConfig>;

export const PUBLIC_TOPIC_SLUGS = PUBLIC_TOPIC_PAGES.map((topic) => topic.slug);

export function getPublicTopicConfig(topic: string): PublicTopicConfig | null {
  if (topic in PUBLIC_TOPIC_PAGE_BY_SLUG) {
    return PUBLIC_TOPIC_PAGE_BY_SLUG[topic as PublicTopicSlug];
  }

  return null;
}

export function getPublicTopicLandingDialog(
  topic: PublicTopicConfig,
): PublicDialogContent {
  return {
    eyebrow: `${topic.navLabel} overview`,
    title: topic.cardTitle,
    lead: topic.cardSummary,
    sections: topic.highlights.map((highlight) => ({
      label: highlight.title,
      body: highlight.body,
    })),
    takeaway: topic.footerNote,
  };
}

export function getPublicPanelDialog(
  topic: PublicTopicConfig,
  panel: PublicInfographicPanel,
): PublicDialogContent {
  const override = publicPanelDialogOverrides[topic.slug]?.[panel.number];

  return {
    eyebrow: `${topic.navLabel} board ${String(panel.number).padStart(2, '0')}`,
    title: panel.title,
    lead:
      override?.lead ??
      `${panel.subtitle}. Read this board as one controllable MFC/MEC or biosensor decision surface inside the ${getPublicLensLabel(topic)} lens, where operating claims stay tied to measured variables, hardware choices, and evidence limits.`,
    sections: buildDialogSections({
      labels: override?.sectionLabels,
      bodies:
        override?.sectionBodies ?? buildDefaultPanelDialogBodies(topic, panel),
    }),
    takeaway: override?.takeaway ?? topic.footerNote,
  };
}
