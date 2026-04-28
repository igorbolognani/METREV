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
    'Do not collapse all BES families into one maturity story or assume the same signals validate treatment, hydrogen, recovery, sensing, and control objectives equally well.',
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
    'Check whether the declared BES family, objective, reaction pathway, output stream, and monitored signals actually match the case being evaluated.',
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
      lead: 'Recovery upside explains why a BES route is interesting, but it should never erase chemistry fit or operational burden from the decision.',
      sectionBodies: [
        'This board keeps recovery upside visible without letting it outrank normalization discipline or the full engineering context by default.',
        'That upside only matters if the candidate can survive the actual stream, maintain performance outside a narrow lab window, and justify the extra operating burden.',
        'Teams often overread upside and underweight maturity, maintenance burden, chemistry fit, and evidence comparability.',
        'Check what evidence exists for recovery under comparable influent chemistry, maintenance cadence, normalization basis, and scale assumptions.',
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
    `${panel.title} keeps ${panel.subtitle.toLowerCase()} visible as one explicit decision surface inside the ${topic.routeMarker.toLowerCase()}, so route selection stays tied to a real BES mechanism instead of to a generic promise statement.`,
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
    cardTitle: 'Map the real BES pressure before choosing a stack.',
    cardSummary:
      'Keep influent chemistry, conductivity, pH, temperature, solids exposure, hydraulic regime, fouling pressure, serviceability, and evidence strength in one frame before any BES concept is treated as deployment-ready.',
    previewPoints: [
      'influent chemistry',
      'biofilm pressure',
      'scale-up burden',
    ],
    heroEyebrow: 'System constraint map',
    heroTitle:
      'See the full operating pressure around a bioelectrochemical decision.',
    heroLead:
      'A BES decision couples wastewater chemistry, conductivity, pH, temperature, hydraulic regime, biofilm maturity, transport losses, maintenance burden, and observability. This page keeps those interacting constraints visible before reactor or material choices are treated as credible.',
    questionTitle: 'Frame the wastewater boundary first.',
    questionLead:
      'Use this lens when laboratory promise outruns case definition. It forces missing measurements, fouling exposure, startup uncertainty, and monitoring burden into the same decision frame before stack selection.',
    centerKind: 'problem',
    centerTitle: 'Wastewater BES decision',
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
      'Each panel isolates one engineering variable that can change BES plausibility. Together they show why route selection is a coupled wastewater-and-stack decision rather than a single-material choice.',
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
          'The wastewater itself filters which BES claims remain realistic once the case leaves the paper and enters a real operating envelope.',
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
        body: 'Influent type, pH, temperature, conductivity, retention time, solids load, startup behavior, separator path, and service access all change whether a BES route is even plausible at site level.',
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
      'Explain the bioelectrochemical families without collapsing them together.',
    cardSummary:
      'Separate MFC, MEC, and broader MET routes by primary objective, electron-transfer logic, separator burden, gas handling, monitored signals, and operational durability instead of treating BES as one acronym.',
    previewPoints: ['MFC', 'MEC', 'signals and sensing'],
    heroEyebrow: 'Technology primer',
    heroTitle: 'Understand the BES families before comparing designs.',
    heroLead:
      'Microbial fuel cells, microbial electrolysis cells, and broader MET routes share electroactive biology, but they do not share the same objective, reaction pathway, separator burden, gas handling needs, or measurement requirements. This page keeps those differences explicit before the family label becomes strategy.',
    questionTitle: 'Separate family, objective, and signal.',
    questionLead:
      'Use this lens when a conversation mixes sensing, power generation, hydrogen, recovery, and remediation as though the same hardware and evidence standard could validate them all.',
    centerKind: 'technology',
    centerTitle: 'Microbial electrochemical cell',
    centerSummary:
      'Biofilms, electrodes, separators, and measured signals define the family language that METREV evaluates.',
    legendTitle: 'Read the cell from family choice to measured signal.',
    legendLead:
      'The orbit tags separate the technology family, electron-transfer path, separator behavior, and monitored outputs so the science stays legible at engineering level.',
    orbitLabels: [
      { label: 'MFC / MEC / MET', tone: 'teal', position: 'north-west' },
      { label: 'electron path', tone: 'sky', position: 'north-east' },
      { label: 'separator behavior', tone: 'mint', position: 'south-east' },
      { label: 'measured outputs', tone: 'amber', position: 'south-west' },
    ],
    infographicNote:
      'Each panel explains one technical dimension that separates the BES families. Together they turn the science into a readable engineering primer.',
    legend: [
      {
        label: 'Technology families',
        detail:
          'MFC, MEC, and broader MET routes solve different jobs and demand different evidence.',
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
          'Voltage, current, COD, conductivity, gas, and flow connect the science to plant operations.',
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
        title: 'Broader MET',
        subtitle: 'Recovery, remediation, sensing',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'The broader MET family includes sensing, selective recovery, remediation, and hybrid control architectures that extend beyond simple electricity generation.',
          'The job to be done matters more than acronym familiarity because each route changes what must be measured and maintained.',
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
          'Voltage, current, COD, conductivity, flow, temperature, gas composition, and startup trends are what turn BES science into an auditable operating story.',
          'METREV treats those measurements as part of the technology definition, not as optional reporting extras.',
        ],
      },
    ],
    highlights: [
      {
        title: 'System function',
        body: 'The technology lens explains what the family is trying to do: treatment, hydrogen recovery, sensing, low-power generation, remediation, or another explicit operating objective.',
      },
      {
        title: 'Engineering pressure',
        body: 'Family choice depends on influent context, conductivity, pH, temperature, gas handling, separator logic, transport path, and the signals that must stay measurable during operation.',
      },
      {
        title: 'Decision risk',
        body: 'Maturity language gets distorted when every BES family is collapsed into one story or when output promises are detached from the measurements that would validate them.',
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
      'A defensible BES recommendation has to point back to a configured system: reactor architecture, electrode supports, separator logic, interconnects, gas and liquid auxiliaries, sensors, and operating routines. This page shows the layers METREV keeps explicit before any output is interpreted as advice.',
    questionTitle: 'Keep the stack explicit.',
    questionLead:
      'Use this lens when discussion drifts into vague performance language. A valid recommendation must still map to parts an engineer can specify, procure, instrument, maintain, and replace.',
    centerKind: 'stack',
    centerTitle: 'Configured BES stack',
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
        body: 'The stack lens keeps the BES readable as one system object instead of letting performance claims drift toward one material, one electrode, or one isolated subsystem.',
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
    cardTitle: 'Compare routes conservatively, not theatrically.',
    cardSummary:
      'Compare routes only after normalization basis, operating regime, evidence quality, chemistry fit, and service burden are compatible enough to support a disciplined read across BES and baseline options.',
    previewPoints: ['baselines', 'recovery upside', 'maturity and fit'],
    heroEyebrow: 'Route comparison',
    heroTitle:
      'Make route comparison directional, readable, and honest about tradeoffs.',
    heroLead:
      'METREV treats comparison as disciplined narrowing, not as a beauty contest. The goal is to see when a BES route has real upside, when a mature baseline remains safer, and when chemistry, service burden, or evidence mismatch still block a fair ranking.',
    questionTitle: 'Normalize before you rank.',
    questionLead:
      'Use this lens when teams need to compare wastewater routes without hiding normalization basis, maturity gap, maintenance exposure, or chemistry mismatch behind one headline metric.',
    centerKind: 'comparison',
    centerTitle: 'Decision matrix',
    centerSummary:
      'Recovery upside matters, but normalization discipline, maturity, and chemistry fit decide whether a route is ready for action.',
    legendTitle: 'Read the route matrix left to right.',
    legendLead:
      'The orbit tags keep mature baselines, BES upside, maintenance burden, and chemistry fit in the same comparison frame.',
    orbitLabels: [
      { label: 'mature baselines', tone: 'sky', position: 'north-west' },
      { label: 'BES upside', tone: 'teal', position: 'north-east' },
      { label: 'maintenance burden', tone: 'ink', position: 'south-east' },
      { label: 'chemistry fit', tone: 'violet', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is one comparison dimension. Together they keep route choice grounded instead of aspirational.',
    legend: [
      {
        label: 'Baseline anchors',
        detail:
          'Mature routes remain visible so BES comparisons do not float without context or service benchmarks.',
        tone: 'sky',
      },
      {
        label: 'BES upside',
        detail:
          'Recovery and sensing gains are real only when chemistry, stack design, and evidence quality support them.',
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
          'Activated sludge and other mature treatment trains remain critical anchors because they set the serviceability and reliability bar BES candidates must beat or complement.',
          'Operator familiarity, spare parts, compliance history, and existing infrastructure often dominate early project decisions.',
        ],
      },
      {
        number: 2,
        title: 'Anaerobic digestion',
        subtitle: 'Strong recovery baseline',
        tone: 'mint',
        visualKind: 'compare',
        bullets: [
          'Anaerobic digestion is often the closest recovery baseline in wastewater because it couples treatment with established energy-recovery logic.',
          'Its known strengths and constraints help frame where BES routes may truly add value instead of merely sounding novel.',
        ],
      },
      {
        number: 3,
        title: 'MFC, MEC, and MET routes',
        subtitle: 'Candidate BES pathways',
        tone: 'teal',
        visualKind: 'network',
        bullets: [
          'BES candidates may add sensing, process control, selective recovery, or low-power generation, but only within a narrower maturity envelope.',
          'That upside has to survive chemistry, scale, monitoring discipline, and service burden to matter.',
        ],
      },
      {
        number: 4,
        title: 'Recovery upside',
        subtitle: 'What value might be unlocked',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'Recovery potential shows why a route is interesting enough to investigate.',
          'Potential alone should never be mistaken for validated site performance.',
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
        body: 'The comparison lens keeps BES candidates, mature baselines, and recovery pathways in one narrowing frame rather than treating novelty as a winner by default.',
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
        body: 'METREV widens uncertainty when metrics are not comparable enough and keeps baseline routes visible when they are still safer than the more ambitious BES option.',
      },
    ],
    footerNote:
      'In METREV comparison is a narrowing step, not proof of superiority; if the evidence base, chemistry fit, or normalization basis is weak, the output should recommend deeper validation rather than a theatrical winner.',
  },
  {
    slug: 'impact',
    navLabel: 'ODS',
    accentTone: 'violet',
    routeMarker: 'Impact map',
    cardTitle: 'Translate BES decisions into impact without overclaiming.',
    cardSummary:
      'Keep water, energy, circularity, climate, and ODS language tied to measured outputs, declared assumptions, maturity, and named dependencies instead of using impact as a free-standing claim.',
    previewPoints: [
      'water quality',
      'energy pathway',
      'circularity and climate',
    ],
    heroEyebrow: 'Impact framing',
    heroTitle:
      'Show impact as a result of disciplined engineering, not as a slogan.',
    heroLead:
      'Water, energy, circularity, climate, and ODS narratives only matter when the configured system can actually deliver them. This page keeps impact language tied to measured outputs, declared assumptions, maturity, and named dependencies rather than letting sustainability claims float free.',
    questionTitle: 'Bound impact with evidence.',
    questionLead:
      'Use this lens when a BES discussion needs to connect engineering decisions to public outcomes without pretending every desired benefit is already proven at site scale.',
    centerKind: 'impact',
    centerTitle: 'Impact map',
    centerSummary:
      'Water quality, energy, circularity, and climate outcomes are downstream effects of technical decisions, not detached promises.',
    legendTitle: 'Read impact through its evidence boundary.',
    legendLead:
      'The orbit tags show where water, energy, circularity, and confidence move together instead of being claimed independently.',
    orbitLabels: [
      { label: 'water quality', tone: 'sky', position: 'north-west' },
      { label: 'energy pathway', tone: 'amber', position: 'north-east' },
      { label: 'circularity loop', tone: 'mint', position: 'south-east' },
      { label: 'confidence boundary', tone: 'ink', position: 'south-west' },
    ],
    infographicNote:
      'Each panel is one impact pathway. Together they show where BES value might appear and where uncertainty still matters before public claims harden.',
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
          'Energy and circularity gains depend on route fit, system boundary, and technical validation.',
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
          'Cleaner effluent, stable removal, and better process visibility are often the most immediate BES value pathways because they stay closest to plant reality.',
          'Treatment credibility depends on measured water-quality response, not on abstract sustainability language.',
        ],
      },
      {
        number: 2,
        title: 'Energy pathway',
        subtitle: 'Recovery or offset potential',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'Energy claims require route-specific evidence for usable electrical output, assisted inputs, gas recovery, and conversion losses.',
          'METREV keeps the balance-of-energy dependency explicit rather than flattening it into a generic benefit.',
        ],
      },
      {
        number: 3,
        title: 'Industrial innovation',
        subtitle: 'New engineering operating models',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'BES can enable new combinations of treatment, sensing, selective recovery, and distributed control that are hard to express in conventional plant categories.',
          'Innovation only counts if the operating model, maintenance path, and evidence base are technically credible.',
        ],
      },
      {
        number: 4,
        title: 'Circularity',
        subtitle: 'Nutrients, materials, avoided waste',
        tone: 'mint',
        visualKind: 'map',
        bullets: [
          'Circularity is strongest when the route truly changes what can be recovered, reused, or prevented from becoming waste.',
          'If the recovery path is speculative or narrow, circularity language should contract accordingly.',
        ],
      },
      {
        number: 5,
        title: 'Climate framing',
        subtitle: 'What might be avoided or shifted',
        tone: 'teal',
        visualKind: 'bars',
        bullets: [
          'Climate benefit depends on how the route changes energy sourcing, emissions exposure, chemical demand, sludge handling, and avoided process steps.',
          'Impact claims should stay bounded by what the evidence and system boundary can actually defend.',
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
        body: 'The impact lens translates engineering choices into outcome pathways only after the route objective, measured behavior, and evidence boundary are explicit.',
      },
      {
        title: 'Engineering pressure',
        body: 'Water quality, energy pathway, circularity, climate framing, readiness, and economic plausibility all depend on what was actually measured and what still rests on assumptions.',
      },
      {
        title: 'Decision risk',
        body: 'Impact language becomes misleading when route interest is relabeled as sustainability proof without naming defaults, missing data, or the pathway that is supposed to deliver the benefit.',
      },
      {
        title: 'What METREV checks',
        body: 'METREV weakens impact certainty when the technical case is still thin and keeps the next measurements or dependencies visible before stronger public claims are made.',
      },
    ],
    footerNote:
      'METREV treats impact as downstream of disciplined engineering: if fit, evidence, system boundary, or readiness is weak, the impact story should narrow honestly instead of getting louder.',
  },
  {
    slug: 'metrev',
    navLabel: 'METREV',
    accentTone: 'ink',
    routeMarker: 'Workflow instrument',
    cardTitle: 'See the full METREV workflow as one scientific instrument.',
    cardSummary:
      'Present METREV as an auditable decision-support workflow: configured stack, evidence typing, deterministic checks, comparison, recommendation, and report-grounded follow-up stay in one traceable path.',
    previewPoints: ['configure', 'compare', 'report and follow-up'],
    heroEyebrow: 'Workflow instrument',
    heroTitle:
      'Understand how METREV moves from stack description to report-ready output.',
    heroLead:
      'METREV is not only a public explainer. It is a scientific instrument for structured BES decisions: case configuration, evidence typing, deterministic checks, comparison, recommendation, and report-grounded follow-up stay connected in one auditable workflow.',
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
          'The workflow starts with an explicit stack and operating context rather than a generic BES label.',
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
        body: 'This lens shows the product as a scientific instrument for BES decisions, not as a generic website, chat surface, or black-box assistant.',
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
      `${panel.subtitle}. Read this board as one controllable BES decision surface inside the ${getPublicLensLabel(topic)} lens, where operating claims stay tied to measured variables, hardware choices, and evidence limits.`,
    sections: buildDialogSections({
      labels: override?.sectionLabels,
      bodies:
        override?.sectionBodies ?? buildDefaultPanelDialogBodies(topic, panel),
    }),
    takeaway: override?.takeaway ?? topic.footerNote,
  };
}
