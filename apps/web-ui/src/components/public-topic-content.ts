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
  highlights: [
    PublicTopicHighlight,
    PublicTopicHighlight,
    PublicTopicHighlight,
  ];
  footerNote: string;
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
      'Understand why wastewater chemistry, biology, fouling, cost, and evidence quality make early BES decisions fragile.',
    previewPoints: [
      'influent chemistry',
      'biofilm pressure',
      'scale-up burden',
    ],
    heroEyebrow: 'System constraint map',
    heroTitle:
      'See the full operating pressure around a bioelectrochemical decision.',
    heroLead:
      'A BES choice never depends on one variable alone. Chemistry, biology, transport, maintenance, scale, and evidence quality all move together before a design is even worth comparing.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when a concept looks promising in theory but the plant context is still unclear. It keeps engineering pressure visible before the stack is treated as a solved question.',
    centerKind: 'problem',
    centerTitle: 'Wastewater BES decision',
    centerSummary:
      'The public problem is not just performance. It is choosing under interacting technical pressures.',
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
      'Each panel answers one engineering-risk question. Together they frame why the decision is hard before technology selection.',
    legend: [
      {
        label: 'Influent reality',
        detail:
          'Chemistry and loading shape the operating envelope before hardware choice begins.',
        tone: 'teal',
      },
      {
        label: 'Biological and physical response',
        detail:
          'Biofilm behavior, transport, and fouling change with the same decision.',
        tone: 'sky',
      },
      {
        label: 'Deployment pressure',
        detail:
          'Scale, maintenance, and evidence quality decide whether the system is actually plausible.',
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
          'Conductivity and substrate quality can help or destabilize the cell.',
          'The wastewater itself decides which BES claims are realistic.',
        ],
      },
      {
        number: 2,
        title: 'Biofilm stability',
        subtitle: 'Microbial response under load',
        tone: 'mint',
        visualKind: 'cluster',
        bullets: [
          'Electroactive communities need the right surface and operating window.',
          'A strong lab biofilm does not guarantee resilient plant behavior.',
        ],
      },
      {
        number: 3,
        title: 'Mass transfer',
        subtitle: 'Spacing, flow, separator path',
        tone: 'sky',
        visualKind: 'grid',
        bullets: [
          'Geometry and separator choices change resistance and usable current.',
          'Transport losses often explain the gap between papers and deployment.',
        ],
      },
      {
        number: 4,
        title: 'Fouling burden',
        subtitle: 'Maintenance and uptime',
        tone: 'violet',
        visualKind: 'stack',
        bullets: [
          'Scaling, clogging, and contamination raise operating burden quickly.',
          'Maintenance risk can overturn an otherwise attractive configuration.',
        ],
      },
      {
        number: 5,
        title: 'Scale-up economics',
        subtitle: 'Surface area, cost, plant fit',
        tone: 'amber',
        visualKind: 'bars',
        bullets: [
          'Electrode area, reactor footprint, and balance-of-plant cost matter early.',
          'The viable design is the one the site can sustain, not just the one with the best curve.',
        ],
      },
      {
        number: 6,
        title: 'Evidence gaps',
        subtitle: 'What is known vs. assumed',
        tone: 'ink',
        visualKind: 'network',
        bullets: [
          'Supplier claims, small studies, and missing measurements should not look equally certain.',
          'METREV keeps missing data and assumption pressure in view.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents teams from treating a BES concept as ready before the wastewater context and maintenance burden are understood.',
      },
      {
        title: 'Where it helps most',
        body: 'Early feasibility discussions, pilot framing, and conversations where a promising lab signal is being mistaken for deployment readiness.',
      },
      {
        title: 'What METREV contributes',
        body: 'A structured way to keep chemistry, biology, transport, cost, and evidence quality visible in the same decision frame.',
      },
    ],
    footerNote:
      'In METREV this problem lens sits before technology selection, because a beautiful stack choice still fails if the wastewater context is wrong.',
  },
  {
    slug: 'technology',
    navLabel: 'Technology',
    accentTone: 'sky',
    routeMarker: 'Cell primer',
    cardTitle:
      'Explain the bioelectrochemical families without collapsing them together.',
    cardSummary:
      'Separate MFC, MEC, and broader MET context so the science layer is understandable before route comparison begins.',
    previewPoints: ['MFC', 'MEC', 'signals and sensing'],
    heroEyebrow: 'Technology primer',
    heroTitle: 'Understand the BES families before comparing designs.',
    heroLead:
      'METREV treats microbial electrochemical technologies as an engineering decision surface, not as one undifferentiated category. This page explains what each family is trying to do and what must be measured to trust it.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when a conversation mixes MFC, MEC, sensing, recovery, and remediation as if they were interchangeable. They are not.',
    centerKind: 'technology',
    centerTitle: 'Microbial electrochemical cell',
    centerSummary:
      'Biofilms, electrodes, separators, and measured signals create the technology language that METREV evaluates.',
    legendTitle: 'Read the cell from family choice to measured signal.',
    legendLead:
      'The orbit tags separate the technology family, electron-transfer path, separator behavior, and monitored outputs so the science stays legible.',
    orbitLabels: [
      { label: 'MFC / MEC / MET', tone: 'teal', position: 'north-west' },
      { label: 'electron path', tone: 'sky', position: 'north-east' },
      { label: 'separator behavior', tone: 'mint', position: 'south-east' },
      { label: 'measured outputs', tone: 'amber', position: 'south-west' },
    ],
    infographicNote:
      'Each panel explains one part of the BES technology family. Together they turn the science into a readable engineering primer.',
    legend: [
      {
        label: 'Technology families',
        detail: 'MFC, MEC, and the broader MET family solve different jobs.',
        tone: 'teal',
      },
      {
        label: 'Electrochemical pathway',
        detail:
          'Electron transfer, transport, and separator behavior shape the usable signal.',
        tone: 'sky',
      },
      {
        label: 'Measured readout',
        detail:
          'Signals, COD, conductivity, temperature, and flow connect the science to operations.',
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
          'Microbial fuel cells convert substrate into electrical current while treating the stream.',
          'They are often framed around sensing, treatment coupling, and low-power recovery.',
        ],
      },
      {
        number: 2,
        title: 'MEC',
        subtitle: 'Assisted electrolysis route',
        tone: 'amber',
        visualKind: 'flow',
        bullets: [
          'Microbial electrolysis cells use an external voltage to steer reactions toward hydrogen or other products.',
          'The energy and product balance must be read differently than an MFC case.',
        ],
      },
      {
        number: 3,
        title: 'Broader MET',
        subtitle: 'Recovery, remediation, sensing',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'MET is the wider family around recovery, remediation, process control, and monitoring.',
          'The job to be done matters more than the acronym alone.',
        ],
      },
      {
        number: 4,
        title: 'Electron transfer path',
        subtitle: 'Anode, cathode, resistance',
        tone: 'sky',
        visualKind: 'stack',
        bullets: [
          'Surface properties and electron-transfer pathways govern whether the signal is usable.',
          'Performance language should stay tied to the actual path through the cell.',
        ],
      },
      {
        number: 5,
        title: 'Separator and transport',
        subtitle: 'Ion movement and loss',
        tone: 'mint',
        visualKind: 'grid',
        bullets: [
          'Membrane choice and electrode spacing shape transport losses and stability.',
          'These design variables are often more decisive than high-level technology branding.',
        ],
      },
      {
        number: 6,
        title: 'Monitored signals',
        subtitle: 'Voltage, COD, conductivity, flow',
        tone: 'ink',
        visualKind: 'wave',
        bullets: [
          'A BES technology becomes credible only when operational measurements stay visible.',
          'METREV reads the science through measured signals rather than through slogans.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents teams from treating every BES acronym as the same engineering proposition.',
      },
      {
        title: 'Where it helps most',
        body: 'Technology framing, onboarding, public explanation, and early route-selection conversations.',
      },
      {
        title: 'What METREV contributes',
        body: 'A consistent way to translate microbial electrochemical science into an engineering-readable decision tool.',
      },
    ],
    footerNote:
      'Within METREV this technology lens feeds the stack and comparison pages, because technology names alone do not produce a valid recommendation.',
  },
  {
    slug: 'stack',
    navLabel: 'Stack',
    accentTone: 'mint',
    routeMarker: 'Stack blueprint',
    cardTitle: 'Anchor every recommendation to the configured stack.',
    cardSummary:
      'Break the BES into reactor, electrodes, membrane, biology, sensors, and operating window so the decision stays physically grounded.',
    previewPoints: ['reactor', 'electrodes', 'sensors and operation'],
    heroEyebrow: 'Configured stack',
    heroTitle:
      'See the system the way METREV evaluates it: one explicit stack at a time.',
    heroLead:
      'Recommendations are only meaningful when they stay tied to a configured system. This page shows the layers METREV keeps explicit before any output is interpreted as advice.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when a BES discussion is drifting into vague language. A valid recommendation must still point back to parts an engineer can specify, buy, monitor, or change.',
    centerKind: 'stack',
    centerTitle: 'Configured BES stack',
    centerSummary:
      'Reactor architecture, materials, biology, and operations must stay visible as one connected system.',
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
      'Each panel is one controllable layer of the stack. Together they define what the evaluation is actually about.',
    legend: [
      {
        label: 'Physical hardware',
        detail:
          'Reactor, electrodes, membrane, and plant hardware define the system boundary.',
        tone: 'teal',
      },
      {
        label: 'Biological layer',
        detail:
          'Biofilm behavior is part of the configured stack, not a hidden afterthought.',
        tone: 'mint',
      },
      {
        label: 'Operating layer',
        detail:
          'Sensors and operating window connect specification choices to actual site behavior.',
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
          'Architecture determines residence time, maintenance access, and usable layout.',
          'A strong material choice cannot rescue the wrong reactor frame.',
        ],
      },
      {
        number: 2,
        title: 'Anode',
        subtitle: 'Surface, conductivity, durability',
        tone: 'sky',
        visualKind: 'grid',
        bullets: [
          'The anode is where electroactive biology meets the material surface.',
          'Cost and replacement burden matter as much as lab conductivity numbers.',
        ],
      },
      {
        number: 3,
        title: 'Biofilm',
        subtitle: 'Community and attachment',
        tone: 'mint',
        visualKind: 'cluster',
        bullets: [
          'Biofilm quality is a system response, not a detachable performance bonus.',
          'Attachment and resilience depend on both material and operating window.',
        ],
      },
      {
        number: 4,
        title: 'Cathode',
        subtitle: 'Reaction target and losses',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'The cathode path changes what the system is really optimized to do.',
          'Catalyst cost and maintenance should stay visible in the tradeoff.',
        ],
      },
      {
        number: 5,
        title: 'Membrane',
        subtitle: 'Separation and transport',
        tone: 'violet',
        visualKind: 'flow',
        bullets: [
          'Membrane selection shapes ion movement, fouling burden, and operating stability.',
          'Separator losses often explain why an elegant paper design struggles on site.',
        ],
      },
      {
        number: 6,
        title: 'Sensors and operation',
        subtitle: 'What keeps the stack readable',
        tone: 'ink',
        visualKind: 'gauge',
        bullets: [
          'Sensors, setpoints, and operator routines turn the stack into a controllable instrument.',
          'A configuration without readable operation is not a decision-ready system.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents recommendations that sound useful but cannot be traced back to a real system architecture.',
      },
      {
        title: 'Where it helps most',
        body: 'Case setup, pilot design review, supplier comparison, and cross-functional engineering conversations.',
      },
      {
        title: 'What METREV contributes',
        body: 'A stable stack vocabulary that ties each recommendation to controllable system layers.',
      },
    ],
    footerNote:
      'Inside METREV the stack is the central object of evaluation, because evidence only becomes useful when it is matched to a specific configured system.',
  },
  {
    slug: 'comparison',
    navLabel: 'Comparison',
    accentTone: 'amber',
    routeMarker: 'Tradeoff matrix',
    cardTitle: 'Compare routes conservatively, not theatrically.',
    cardSummary:
      'Keep conventional baselines, anaerobic digestion, and BES candidates in the same frame so route fit is judged with discipline.',
    previewPoints: ['baselines', 'recovery upside', 'maturity and fit'],
    heroEyebrow: 'Route comparison',
    heroTitle:
      'Make route comparison directional, readable, and honest about tradeoffs.',
    heroLead:
      'METREV does not treat comparison as a beauty contest. The goal is to see when a BES route has real upside, when a baseline remains safer, and when the chemistry or maintenance burden is still saying no.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when teams need to compare treatment routes without hiding maturity, operational burden, or chemistry mismatch.',
    centerKind: 'comparison',
    centerTitle: 'Decision matrix',
    centerSummary:
      'Recovery upside matters, but maturity and chemistry fit decide whether the route is ready for action.',
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
          'Mature routes remain visible so BES comparisons do not float without context.',
        tone: 'sky',
      },
      {
        label: 'BES upside',
        detail:
          'Recovery and sensing gains are real only when the chemistry and stack support them.',
        tone: 'teal',
      },
      {
        label: 'Decision burden',
        detail:
          'Maturity, maintainability, and operating fit prevent false wins.',
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
          'A baseline route should remain visible even when BES potential is interesting.',
          'Maturity and operator familiarity often dominate early project decisions.',
        ],
      },
      {
        number: 2,
        title: 'Anaerobic digestion',
        subtitle: 'Strong recovery baseline',
        tone: 'mint',
        visualKind: 'compare',
        bullets: [
          'Digestion is often the closest recovery comparison in wastewater contexts.',
          'Its strengths and limitations help frame where BES routes may or may not stand out.',
        ],
      },
      {
        number: 3,
        title: 'MFC, MEC, and MET routes',
        subtitle: 'Candidate BES pathways',
        tone: 'teal',
        visualKind: 'network',
        bullets: [
          'BES candidates offer upside in sensing, control, and selective recovery.',
          'That upside has to survive chemistry, scale, and operating burden to matter.',
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
          'A route with weak maturity can demand more operator time and tolerance for uncertainty.',
          'METREV keeps that burden visible next to upside metrics.',
        ],
      },
      {
        number: 6,
        title: 'Chemistry fit',
        subtitle: 'Can this route survive the stream',
        tone: 'violet',
        visualKind: 'wave',
        bullets: [
          'The wastewater line itself filters which routes are plausible.',
          'If chemistry fit is weak, the route should not win on aesthetics alone.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents BES routes from looking like default winners just because they are novel or high-upside.',
      },
      {
        title: 'Where it helps most',
        body: 'Option screening, executive explanation, technology down-selection, and pilot-or-baseline decisions.',
      },
      {
        title: 'What METREV contributes',
        body: 'A conservative route-comparison frame that keeps upside, maturity, and chemistry fit readable at the same time.',
      },
    ],
    footerNote:
      'In METREV comparison is a narrowing step, not the final proof. It tells teams where deeper validation is justified and where a baseline is still the smarter move.',
  },
  {
    slug: 'impact',
    navLabel: 'ODS',
    accentTone: 'violet',
    routeMarker: 'Impact map',
    cardTitle: 'Translate BES decisions into impact without overclaiming.',
    cardSummary:
      'Connect water, energy, circularity, and climate outcomes to engineering choices while keeping uncertainty explicit.',
    previewPoints: [
      'water quality',
      'energy pathway',
      'circularity and climate',
    ],
    heroEyebrow: 'Impact framing',
    heroTitle:
      'Show impact as a result of disciplined engineering, not as a slogan.',
    heroLead:
      'Better water, energy, and circularity outcomes matter only when the system can actually deliver them. This page keeps impact language connected to the technical decisions that would need to hold true.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when a conversation needs to connect BES decisions to ODS or sustainability goals without pretending every desired outcome is already proven.',
    centerKind: 'impact',
    centerTitle: 'Impact map',
    centerSummary:
      'Water quality, energy, industry, and circularity are linked outcomes of technical decisions, not detached promises.',
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
      'Each panel is one impact pathway. Together they show where BES value might appear and where uncertainty still matters.',
    legend: [
      {
        label: 'Water outcome',
        detail:
          'Treatment reliability and visibility remain the core public-good lens.',
        tone: 'sky',
      },
      {
        label: 'Resource pathway',
        detail:
          'Energy and circularity gains depend on route fit and technical validation.',
        tone: 'amber',
      },
      {
        label: 'Confidence boundary',
        detail:
          'Impact should contract when evidence is thin or assumptions are still doing the work.',
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
          'Cleaner treatment and better monitoring remain the most immediate BES value pathway.',
          'This is often the strongest impact argument because it stays close to the plant reality.',
        ],
      },
      {
        number: 2,
        title: 'Energy pathway',
        subtitle: 'Recovery or offset potential',
        tone: 'amber',
        visualKind: 'signal',
        bullets: [
          'Energy claims need route-specific evidence and a realistic balance of inputs and losses.',
          'METREV keeps that dependence visible instead of flattening it into a slogan.',
        ],
      },
      {
        number: 3,
        title: 'Industrial innovation',
        subtitle: 'New engineering operating models',
        tone: 'violet',
        visualKind: 'network',
        bullets: [
          'BES can open new combinations of treatment, sensing, and recovery behavior.',
          'Innovation only counts if the operating model is technically credible.',
        ],
      },
      {
        number: 4,
        title: 'Circularity',
        subtitle: 'Nutrients, materials, avoided waste',
        tone: 'mint',
        visualKind: 'map',
        bullets: [
          'Circularity is strongest when the route genuinely changes what is recovered or avoided.',
          'If the recovery path is weak, circularity language should soften too.',
        ],
      },
      {
        number: 5,
        title: 'Climate framing',
        subtitle: 'What might be avoided or shifted',
        tone: 'teal',
        visualKind: 'bars',
        bullets: [
          'Climate benefit depends on how the BES route changes energy, waste, and process choices.',
          'Impact claims should stay bounded by what the evidence can actually defend.',
        ],
      },
      {
        number: 6,
        title: 'Confidence boundary',
        subtitle: 'Where caution must remain',
        tone: 'ink',
        visualKind: 'gauge',
        bullets: [
          'The platform should reduce impact certainty when defaults and missing data are doing too much work.',
          'This is how auditable impact stays different from sales copy.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents engineering output from being relabeled as sustainability proof without the needed evidence boundary.',
      },
      {
        title: 'Where it helps most',
        body: 'Public explanation, investor and stakeholder communication, and internal reviews where impact language needs technical discipline.',
      },
      {
        title: 'What METREV contributes',
        body: 'A way to keep ODS and impact framing tied to measured conditions, route choice, and explicit uncertainty.',
      },
    ],
    footerNote:
      'METREV treats impact as a downstream result of valid engineering choices. If the route is weak, the impact story should weaken with it.',
  },
  {
    slug: 'metrev',
    navLabel: 'METREV',
    accentTone: 'ink',
    routeMarker: 'Workflow instrument',
    cardTitle: 'See the full METREV workflow as one scientific instrument.',
    cardSummary:
      'Move from configured stack to report-ready recommendation through one explicit path instead of scattered screens or guesswork.',
    previewPoints: ['configure', 'compare', 'report and follow-up'],
    heroEyebrow: 'Workflow instrument',
    heroTitle:
      'Understand how METREV moves from stack description to report-ready output.',
    heroLead:
      'The product is not just a public explainer. It is a scientific instrument for structured BES decisions. This page shows how the workflow turns configuration, evidence, comparison, and uncertainty into a report that can be defended.',
    questionTitle: 'Why this page matters',
    questionLead:
      'Use this lens when you need to explain what the tool actually does, not just what it is about. The workflow is the product.',
    centerKind: 'metrev',
    centerTitle: 'METREV workflow instrument',
    centerSummary:
      'Configuration, comparison, output review, recommendation, and reporting form one connected decision path.',
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
          'The workflow starts with an explicit stack and operating context.',
        tone: 'sky',
      },
      {
        label: 'Decision engine',
        detail:
          'Comparison, diagnostics, and recommendations remain tied to treated evidence and rules.',
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
          'The workflow begins with reactor, electrodes, membrane, biology, and operations.',
          'This keeps the evaluation tied to a defined system rather than a generic concept.',
        ],
      },
      {
        number: 2,
        title: 'Compare treated data',
        subtitle: 'Evidence and baselines together',
        tone: 'teal',
        visualKind: 'compare',
        bullets: [
          'Local context and treated literature are read alongside route baselines.',
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
          'Diagnostics expose limits, compatibility issues, and uncertainty hotspots.',
          'Teams can see what is constraining the result before acting on it.',
        ],
      },
      {
        number: 4,
        title: 'Review recommendations',
        subtitle: 'Prioritized engineering actions',
        tone: 'violet',
        visualKind: 'bars',
        bullets: [
          'Recommendations are ranked with evidence, defaults, and uncertainty attached.',
          'The platform is designed to explain why an option is being prioritized.',
        ],
      },
      {
        number: 5,
        title: 'Generate report',
        subtitle: 'Deliverable, not just dashboard',
        tone: 'amber',
        visualKind: 'report',
        bullets: [
          'The report is the defendable external-facing output of the workflow.',
          'Traceability, rationale, and next measurements stay close to the recommendation.',
        ],
      },
      {
        number: 6,
        title: 'Ask grounded follow-up',
        subtitle: 'Report-scoped explanation',
        tone: 'ink',
        visualKind: 'network',
        bullets: [
          'Follow-up explanation is anchored to the report context rather than an unbounded chat surface.',
          'This preserves the instrument posture of the product.',
        ],
      },
    ],
    highlights: [
      {
        title: 'What this lens prevents',
        body: 'It prevents the product from being mistaken for a generic website or a free-form assistant with hidden logic.',
      },
      {
        title: 'Where it helps most',
        body: 'Public product explanation, onboarding, partner conversations, and internal alignment on the workflow story.',
      },
      {
        title: 'What METREV contributes',
        body: 'A single decision path from configured stack to grounded report, with evidence and uncertainty kept visible along the way.',
      },
    ],
    footerNote:
      'This workflow lens is the bridge between the public educational layer and the signed-in workspace. It explains why the product is an instrument, not just an interface.',
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
