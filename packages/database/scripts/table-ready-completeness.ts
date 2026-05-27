export type TechnicalCompletenessAction =
  | 'keep'
  | 'reacquire_full_text'
  | 'rerun_extraction'
  | 'quarantine_for_review'
  | 'reject_from_intake'
  | 'delete_record';

export type TechnicalCompletenessFact = {
  canonicalKey?: string | null;
  componentType?: string | null;
  decisionReady: boolean;
  factType?: string | null;
  fieldKey?: string | null;
  material?: string | null;
  metricType?: string | null;
  normalizedUnit?: string | null;
  normalizedValue?: number | null;
  reactorType?: string | null;
  systemType?: string | null;
};

export type TechnicalCompletenessBenchmark = {
  application?: string | null;
  componentType?: string | null;
  decisionReady: boolean;
  material?: string | null;
  metricType?: string | null;
  normalizedUnit?: string | null;
  normalizedValue?: number | null;
  systemType?: string | null;
};

export type TechnicalCompletenessCandidate = {
  abstractAvailable: boolean;
  benchmarkRecords: TechnicalCompletenessBenchmark[];
  canonicalFacts: TechnicalCompletenessFact[];
  catalogItemId: string;
  claimCount: number;
  doiAvailable: boolean;
  evidenceQuality?: string | null;
  extractionStatus?: string | null;
  fullTextAvailable: boolean;
  sourceArtifactCount: number;
  sourceCategory?: string | null;
  sourceRecordId: string;
  sourceTextChunkCount: number;
  sourceType?: string | null;
  sourceUrlAvailable: boolean;
  summary?: string | null;
  tags?: string[];
  title: string;
};

export type TechnicalCompletenessAssessment = {
  coverage: {
    decisionMetadata: boolean;
    metricsOutputs: boolean;
    overview: boolean;
    reactorMaterials: boolean;
  };
  counts: {
    decisionReadyBenchmarkRecords: number;
    decisionReadyCanonicalFacts: number;
    normalizedMetricRecords: number;
    performanceMetricSignals: number;
    reactorMaterialSignals: number;
  };
  flags: string[];
  missingRequirements: string[];
  recommendedAction: TechnicalCompletenessAction;
  score: number;
  strictTableReady: boolean;
};

export const TECHNICAL_RESEARCH_TECHNOLOGY_CLASSES = [
  'MFC',
  'MEC',
  'MET',
  'BES',
] as const;

const DOMAIN_TERMS = [
  'bioelectrochemical',
  'bio-electrochemical',
  'microbial fuel cell',
  'microbial electrolysis',
  'microbial electrosynthesis',
  'microbial desalination cell',
  'electromethanogenesis',
  'microbial electrochemical',
  'mfc',
  'mec',
  'bes',
];

const BROAD_REVIEW_TERMS = [
  'bibliometric',
  'circular bioeconomy',
  'critical review',
  'literature review',
  'perspective',
  'roadmap',
  'review',
  'scoping review',
  'state of the art',
  'systematic review',
];

const REACTOR_MATERIAL_TERMS = [
  'anode',
  'cathode',
  'catalyst',
  'electrode',
  'membrane',
  'reactor',
  'separator',
];

const PERFORMANCE_METRIC_TERMS = [
  'cod',
  'coulombic',
  'current',
  'hydrogen',
  'methane',
  'power',
  'recovery',
  'removal',
  'voltage',
];

function normalizeText(value: string | null | undefined) {
  return value?.toLowerCase() ?? '';
}

function textIncludesAny(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(term));
}

function candidateHaystack(candidate: TechnicalCompletenessCandidate) {
  return [
    candidate.title,
    candidate.summary,
    candidate.sourceCategory,
    candidate.sourceType,
    ...(candidate.tags ?? []),
  ]
    .map((value) => normalizeText(value))
    .join(' ');
}

function factHaystack(fact: TechnicalCompletenessFact) {
  return [
    fact.canonicalKey,
    fact.componentType,
    fact.factType,
    fact.fieldKey,
    fact.material,
    fact.metricType,
    fact.reactorType,
    fact.systemType,
  ]
    .map((value) => normalizeText(value))
    .join(' ');
}

function benchmarkHaystack(benchmark: TechnicalCompletenessBenchmark) {
  return [
    benchmark.application,
    benchmark.componentType,
    benchmark.material,
    benchmark.metricType,
    benchmark.systemType,
  ]
    .map((value) => normalizeText(value))
    .join(' ');
}

function isNormalizedMetric(input: {
  decisionReady: boolean;
  metricType?: string | null;
  normalizedUnit?: string | null;
  normalizedValue?: number | null;
}) {
  return Boolean(
    input.decisionReady &&
    input.metricType &&
    input.normalizedUnit &&
    input.normalizedValue !== null &&
    input.normalizedValue !== undefined,
  );
}

function hasTechnologyClassSignal(candidate: TechnicalCompletenessCandidate) {
  const allowedClasses = new Set<string>(TECHNICAL_RESEARCH_TECHNOLOGY_CLASSES);
  return [...candidate.canonicalFacts, ...candidate.benchmarkRecords].some(
    (entry) => {
      const systemType = 'systemType' in entry ? entry.systemType : null;
      return systemType ? allowedClasses.has(systemType.toUpperCase()) : false;
    },
  );
}

export function hasTechnicalResearchTechnologyClass(
  technologyClasses: string[],
) {
  const allowedClasses = new Set<string>(TECHNICAL_RESEARCH_TECHNOLOGY_CLASSES);
  return technologyClasses.some((technology) =>
    allowedClasses.has(technology.toUpperCase()),
  );
}

export function evaluateTechnicalCompleteness(
  candidate: TechnicalCompletenessCandidate,
): TechnicalCompletenessAssessment {
  const haystack = candidateHaystack(candidate);
  const decisionReadyFacts = candidate.canonicalFacts.filter(
    (fact) => fact.decisionReady,
  );
  const decisionReadyBenchmarks = candidate.benchmarkRecords.filter(
    (benchmark) => benchmark.decisionReady,
  );
  const normalizedMetricRecords = [
    ...candidate.canonicalFacts.filter(isNormalizedMetric),
    ...candidate.benchmarkRecords.filter(isNormalizedMetric),
  ];
  const reactorMaterialSignals = [
    ...decisionReadyFacts.filter((fact) =>
      textIncludesAny(factHaystack(fact), REACTOR_MATERIAL_TERMS),
    ),
    ...decisionReadyBenchmarks.filter((benchmark) =>
      textIncludesAny(benchmarkHaystack(benchmark), REACTOR_MATERIAL_TERMS),
    ),
  ];
  const performanceMetricSignals = normalizedMetricRecords.filter((record) =>
    textIncludesAny(
      'fieldKey' in record ? factHaystack(record) : benchmarkHaystack(record),
      PERFORMANCE_METRIC_TERMS,
    ),
  );
  const domainSpecific =
    textIncludesAny(haystack, DOMAIN_TERMS) ||
    hasTechnologyClassSignal(candidate);
  const broadReviewLike = textIncludesAny(haystack, BROAD_REVIEW_TERMS);
  const broadWithoutExperimentalSignal =
    broadReviewLike && normalizedMetricRecords.length < 2;
  const sourceIdentity = candidate.doiAvailable || candidate.sourceUrlAvailable;
  const traceableSourceText =
    candidate.fullTextAvailable && candidate.sourceTextChunkCount > 0;
  const notLowQuality = candidate.evidenceQuality?.toLowerCase() !== 'low';
  const extractionComplete = ![
    'extraction_failed',
    'insufficient_source',
    'needs_full_text',
  ].includes(candidate.extractionStatus ?? '');
  const coverage = {
    overview: domainSpecific && sourceIdentity && candidate.abstractAvailable,
    reactorMaterials: reactorMaterialSignals.length > 0,
    metricsOutputs:
      normalizedMetricRecords.length > 0 && performanceMetricSignals.length > 0,
    decisionMetadata:
      traceableSourceText &&
      decisionReadyFacts.length > 0 &&
      decisionReadyBenchmarks.length > 0 &&
      notLowQuality,
  };
  const requirements: Array<[string, boolean]> = [
    ['domain_specific_met_mfc_mec_bes', domainSpecific],
    ['stable_identifier', sourceIdentity],
    ['abstract_available', candidate.abstractAvailable],
    ['traceable_source_chunks', traceableSourceText],
    ['decision_ready_canonical_facts', decisionReadyFacts.length > 0],
    ['decision_ready_benchmark_rows', decisionReadyBenchmarks.length > 0],
    ['normalized_values_with_units', normalizedMetricRecords.length > 0],
    ['reactor_or_material_signal', reactorMaterialSignals.length > 0],
    [
      'performance_or_output_metric_signal',
      performanceMetricSignals.length > 0,
    ],
    ['overview_group_coverage', coverage.overview],
    ['reactor_materials_group_coverage', coverage.reactorMaterials],
    ['metrics_outputs_group_coverage', coverage.metricsOutputs],
    ['decision_metadata_group_coverage', coverage.decisionMetadata],
    ['not_low_evidence_quality', notLowQuality],
    [
      'not_broad_review_without_experimental_signal',
      !broadWithoutExperimentalSignal,
    ],
    ['extraction_complete', extractionComplete],
  ];
  const missingRequirements = requirements
    .filter(([, passed]) => !passed)
    .map(([requirement]) => requirement);
  const flags = [
    broadReviewLike ? 'broad_review_like' : null,
    broadWithoutExperimentalSignal ? 'broad_without_experimental_signal' : null,
    normalizedMetricRecords.some(
      (record) => normalizeText(record.metricType) === 'unclassified_metric',
    )
      ? 'unclassified_metric_present'
      : null,
  ].filter((flag): flag is string => Boolean(flag));
  const strictTableReady = missingRequirements.length === 0;
  const score =
    requirements.filter(([, passed]) => passed).length / requirements.length;

  let recommendedAction: TechnicalCompletenessAction;
  if (strictTableReady) {
    recommendedAction = 'keep';
  } else if (!sourceIdentity && candidate.claimCount === 0) {
    recommendedAction = 'delete_record';
  } else if (
    !domainSpecific ||
    !notLowQuality ||
    broadWithoutExperimentalSignal
  ) {
    recommendedAction = 'reject_from_intake';
  } else if (!traceableSourceText) {
    recommendedAction = 'reacquire_full_text';
  } else if (candidate.extractionStatus === 'needs_review') {
    recommendedAction = 'quarantine_for_review';
  } else {
    recommendedAction = 'rerun_extraction';
  }

  return {
    coverage,
    counts: {
      decisionReadyBenchmarkRecords: decisionReadyBenchmarks.length,
      decisionReadyCanonicalFacts: decisionReadyFacts.length,
      normalizedMetricRecords: normalizedMetricRecords.length,
      performanceMetricSignals: performanceMetricSignals.length,
      reactorMaterialSignals: reactorMaterialSignals.length,
    },
    flags,
    missingRequirements,
    recommendedAction,
    score: Number(score.toFixed(4)),
    strictTableReady,
  };
}
