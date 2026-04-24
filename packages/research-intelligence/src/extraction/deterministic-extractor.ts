import {
  researchExtractionResultSchema,
  researchImplementationFactorsExtractionSchema,
  researchSystemPerformanceExtractionSchema,
  type ConfidenceLevel,
  type EvidenceClaim,
  type ResearchColumnDefinition,
  type ResearchEvidenceTrace,
  type ResearchExtractionResult,
  type ResearchMetricMeasurement,
  type ResearchPaperMetadata,
  type ResearchSystemPerformanceExtraction,
} from '@metrev/domain-contracts';

import { extractMetricMeasurements } from '../normalization/metric-normalization';

export const DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION =
  'research-deterministic-v1';

export interface DeterministicExtractionInput {
  claims: EvidenceClaim[];
  column: ResearchColumnDefinition;
  paper: ResearchPaperMetadata;
  reviewId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isConfidenceLevel(value: unknown): value is ConfidenceLevel {
  return value === 'low' || value === 'medium' || value === 'high';
}

function validatePaperMetadataAnswer(answer: unknown): string[] {
  if (!isRecord(answer)) {
    return ['expected_object'];
  }

  const errors: string[] = [];

  if (typeof answer.title !== 'string' || answer.title.trim().length === 0) {
    errors.push('title');
  }

  if (!Array.isArray(answer.authors)) {
    errors.push('authors');
  }

  if (answer.year !== null && typeof answer.year !== 'number') {
    errors.push('year');
  }

  if (!isNullableString(answer.doi)) {
    errors.push('doi');
  }

  if (!isNullableString(answer.journal)) {
    errors.push('journal');
  }

  if (!isNullableString(answer.source_url)) {
    errors.push('source_url');
  }

  if (!isNullableString(answer.pdf_url)) {
    errors.push('pdf_url');
  }

  return errors;
}

function validateSummaryAnswer(answer: unknown): string[] {
  if (!isRecord(answer)) {
    return ['expected_object'];
  }

  const errors: string[] = [];

  if (
    typeof answer.summary !== 'string' ||
    answer.summary.trim().length === 0
  ) {
    errors.push('summary');
  }

  if (!isNullableString(answer.evidence_span)) {
    errors.push('evidence_span');
  }

  if (!isConfidenceLevel(answer.confidence)) {
    errors.push('confidence');
  }

  return errors;
}

function validateTechnologyApplicationAnswer(answer: unknown): string[] {
  if (!isRecord(answer)) {
    return ['expected_object'];
  }

  const errors: string[] = [];

  if (
    !Array.isArray(answer.technology_class) ||
    answer.technology_class.some((value) => typeof value !== 'string')
  ) {
    errors.push('technology_class');
  }

  if (!isNullableString(answer.application)) {
    errors.push('application');
  }

  if (!isNullableString(answer.scale)) {
    errors.push('scale');
  }

  if (!isNullableString(answer.evidence_span)) {
    errors.push('evidence_span');
  }

  return errors;
}

function validateGenericListAnswer(
  answer: unknown,
  listKey: 'gaps' | 'items',
): string[] {
  if (!isRecord(answer)) {
    return ['expected_object'];
  }

  const values = answer[listKey];
  const errors: string[] = [];

  if (
    !Array.isArray(values) ||
    values.some((value) => typeof value !== 'string')
  ) {
    errors.push(listKey);
  }

  if (!isNullableString(answer.evidence_span)) {
    errors.push('evidence_span');
  }

  if (!isConfidenceLevel(answer.confidence)) {
    errors.push('confidence');
  }

  if (
    !Array.isArray(answer.missing_fields) ||
    answer.missing_fields.some((value) => typeof value !== 'string')
  ) {
    errors.push('missing_fields');
  }

  return errors;
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function fullText(input: DeterministicExtractionInput): string {
  return [
    input.paper.title,
    input.paper.abstract_text ?? '',
    ...input.claims.map((claim) => claim.content),
  ]
    .filter(Boolean)
    .join(' ');
}

function baseTrace(
  input: DeterministicExtractionInput,
): ResearchEvidenceTrace[] {
  if (input.paper.abstract_text?.trim()) {
    return [
      {
        source: 'abstract',
        source_document_id: input.paper.source_document_id,
        text_span: truncate(input.paper.abstract_text, 520),
        source_locator: 'abstract',
        page_number: null,
      },
    ];
  }

  return [
    {
      source: 'title',
      source_document_id: input.paper.source_document_id,
      text_span: input.paper.title,
      source_locator: 'title',
      page_number: null,
    },
  ];
}

function claimTrace(claim: EvidenceClaim): ResearchEvidenceTrace {
  return {
    source: 'claim',
    source_document_id: claim.source_document_id,
    claim_id: claim.id,
    text_span: claim.source_snippet || claim.content,
    source_locator: claim.source_locator,
    page_number: claim.page_number,
  };
}

function tracesFromClaims(
  input: DeterministicExtractionInput,
  claimTypes: EvidenceClaim['claim_type'][],
): ResearchEvidenceTrace[] {
  const traces = input.claims
    .filter((claim) => claimTypes.includes(claim.claim_type))
    .slice(0, 4)
    .map((claim) => claimTrace(claim));

  return traces.length > 0 ? traces : baseTrace(input);
}

function includesAny(text: string, tokens: string[]): boolean {
  const normalized = text.toLowerCase();
  return tokens.some((token) => normalized.includes(token.toLowerCase()));
}

function detectTechnologyClasses(text: string) {
  const classes = new Set<string>();

  if (/\bMFCs?\b/i.test(text) || includesAny(text, ['microbial fuel cell'])) {
    classes.add('MFC');
  }
  if (
    /\bMECs?\b/i.test(text) ||
    includesAny(text, ['microbial electrolysis cell'])
  ) {
    classes.add('MEC');
  }
  if (
    /\bMDCs?\b/i.test(text) ||
    includesAny(text, ['microbial desalination cell'])
  ) {
    classes.add('MDC');
  }
  if (
    /\bBES\b/i.test(text) ||
    includesAny(text, ['bioelectrochemical system'])
  ) {
    classes.add('BES');
  }
  if (includesAny(text, ['bioelectrochemical sensor', 'biosensor'])) {
    classes.add('bioelectrochemical_sensor');
  }
  if (
    includesAny(text, ['hybrid', 'wetland-integrated', 'anaerobic digestion'])
  ) {
    classes.add('hybrid_system');
  }

  return classes.size > 0 ? [...classes] : ['not_reported'];
}

function detectFirst(text: string, values: string[]): string | null {
  const normalized = text.toLowerCase();
  return (
    values.find((value) => normalized.includes(value.toLowerCase())) ?? null
  );
}

function extractOperatingConditions(text: string): Record<string, unknown> {
  const conditions: Record<string, unknown> = {};
  const phMatch = text.match(/\bpH\s?(?:of|=|:)?\s?(\d+(?:\.\d+)?)/i);
  const tempMatch = text.match(/(\d+(?:\.\d+)?)\s?(?:degrees?\s?C|C)/i);
  const hrtMatch = text.match(
    /\bHRT\b\s?(?:of|=|:)?\s?(\d+(?:\.\d+)?)\s?(h|hr|hours?)/i,
  );

  if (phMatch) {
    conditions.pH = Number(phMatch[1]);
  }
  if (tempMatch) {
    conditions.temperature_c = Number(tempMatch[1]);
  }
  if (hrtMatch) {
    conditions.HRT_h = Number(hrtMatch[1]);
  }

  const substrate = detectFirst(text, [
    'acetate',
    'glucose',
    'domestic wastewater',
    'industrial wastewater',
    'brewery wastewater',
    'sludge',
    'urine',
  ]);
  if (substrate) {
    conditions.substrate = substrate;
  }

  return conditions;
}

function buildSystemPerformance(input: DeterministicExtractionInput): {
  answer: ResearchSystemPerformanceExtraction;
  trace: ResearchEvidenceTrace[];
  metrics: ResearchMetricMeasurement[];
} {
  const text = fullText(input);
  const traces = tracesFromClaims(input, [
    'metric',
    'material',
    'architecture',
    'condition',
    'applicability',
  ]);
  const abstractMetrics = input.paper.abstract_text
    ? extractMetricMeasurements({
        source: 'abstract',
        sourceDocumentId: input.paper.source_document_id,
        sourceText: input.paper.abstract_text,
      })
    : [];
  const claimMetrics = input.claims.flatMap((claim) =>
    extractMetricMeasurements({
      source: 'claim',
      sourceDocumentId: input.paper.source_document_id,
      sourceText: claim.content,
    }).map((metric) => ({
      ...metric,
      evidence_trace: claimTrace(claim),
    })),
  );
  const metrics = [...abstractMetrics, ...claimMetrics];
  const anodeMaterial = detectFirst(text, [
    'carbon felt',
    'carbon cloth',
    'graphite brush',
    'biochar',
    'stainless steel',
    'modified carbon',
  ]);
  const cathodeMaterial = detectFirst(text, [
    'Pt/C',
    'platinum',
    'MnO2',
    'Fe/N/C',
    'air cathode',
    'carbon cloth',
    'stainless steel',
  ]);
  const separator = detectFirst(text, [
    'Nafion',
    'cation exchange membrane',
    'anion exchange membrane',
    'ceramic',
    'separator-free',
    'membrane-less',
  ]);
  const architecture = detectFirst(text, [
    'single chamber',
    'single-chamber',
    'dual chamber',
    'two-chamber',
    'stacked',
    'tubular',
    'upflow',
    'membrane-less',
    'wetland-integrated',
  ]);
  const productOutputs = metrics.filter((metric) =>
    includesAny(metric.evidence_trace.text_span, [
      'hydrogen',
      'H2',
      'methane',
      'acetate',
    ]),
  );
  const treatmentMetrics = metrics.filter(
    (metric) => metric.metric_key === 'cod_removal_pct',
  );
  const electrochemicalMetrics = metrics.filter(
    (metric) => metric.metric_key !== 'cod_removal_pct',
  );
  const missingFields = [
    anodeMaterial ? null : 'anode.material',
    cathodeMaterial ? null : 'cathode.material',
    separator ? null : 'membrane_or_separator.type',
    metrics.length > 0 ? null : 'metrics',
  ].filter((value): value is string => Boolean(value));

  const answer = researchSystemPerformanceExtractionSchema.parse({
    technology_class: detectTechnologyClasses(text),
    reactor_architecture: {
      type: architecture,
    },
    anode: {
      material: anodeMaterial,
      material_class: anodeMaterial ? 'carbonaceous electrode' : null,
    },
    cathode: {
      material: cathodeMaterial,
      catalyst:
        cathodeMaterial?.toLowerCase().includes('pt') ||
        cathodeMaterial === 'platinum'
          ? 'platinum'
          : null,
    },
    membrane_or_separator: {
      type: separator,
    },
    substrate_feedstock: [
      detectFirst(text, [
        'acetate',
        'glucose',
        'domestic wastewater',
        'industrial wastewater',
        'brewery wastewater',
        'sludge',
        'urine',
      ]),
    ].filter((value): value is string => Boolean(value)),
    operating_conditions: extractOperatingConditions(text),
    electrochemical_metrics: electrochemicalMetrics,
    treatment_metrics: treatmentMetrics,
    product_outputs: productOutputs,
    scale: detectFirst(text, ['lab', 'bench', 'pilot', 'demo', 'commercial']),
    implementation_limitations: input.claims
      .filter((claim) => claim.claim_type === 'limitation')
      .map((claim) => claim.content)
      .slice(0, 6),
    missing_fields: missingFields,
    evidence_trace: traces,
    confidence:
      metrics.length > 0 || input.claims.length > 0 ? 'medium' : 'low',
  });

  return { answer, trace: traces, metrics };
}

function collectLimitationSentences(
  input: DeterministicExtractionInput,
): string[] {
  const limitationClaims = input.claims
    .filter((claim) => claim.claim_type === 'limitation')
    .map((claim) => claim.content);
  const text = fullText(input);
  const fallback = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) =>
      includesAny(sentence, [
        'limitation',
        'challenge',
        'fouling',
        'cost',
        'scale-up',
        'instability',
        'toxicity',
        'resistance',
        'barrier',
      ]),
    )
    .slice(0, 6);

  return limitationClaims.length > 0 ? limitationClaims : fallback;
}

function buildImplementationFactors(input: DeterministicExtractionInput): {
  answer: unknown;
  trace: ResearchEvidenceTrace[];
} {
  const text = fullText(input);
  const limitationSentences = collectLimitationSentences(input);
  const traces = tracesFromClaims(input, [
    'limitation',
    'economic',
    'applicability',
    'supplier_claim',
    'market_signal',
  ]);

  const answer = researchImplementationFactorsExtractionSchema.parse({
    performance_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'low power',
        'low current',
        'low efficiency',
        'performance',
      ]),
    ),
    internal_resistance_issues: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'resistance',
        'ohmic',
        'charge transfer',
        'mass transfer',
      ]),
    ),
    electrode_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'electrode',
        'anode',
        'surface area',
        'passivation',
      ]),
    ),
    cathode_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, ['cathode', 'ORR', 'oxygen', 'flooding']),
    ),
    membrane_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, ['membrane', 'crossover', 'fouling']),
    ),
    biofilm_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, ['biofilm', 'startup', 'microbial', 'methanogen']),
    ),
    substrate_limitations: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'substrate',
        'wastewater',
        'toxicity',
        'conductivity',
      ]),
    ),
    fouling_and_scaling: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'fouling',
        'scaling',
        'clogging',
        'precipitation',
      ]),
    ),
    operational_risks: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'pH control',
        'temperature',
        'flow',
        'gas',
        'safety',
      ]),
    ),
    scale_up_barriers: limitationSentences.filter((sentence) =>
      includesAny(sentence, ['scale', 'scale-up', 'pilot', 'commercial']),
    ),
    economic_barriers: limitationSentences.filter((sentence) =>
      includesAny(sentence, ['cost', 'CAPEX', 'OPEX', 'economic']),
    ),
    durability_issues: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'durability',
        'lifetime',
        'corrosion',
        'degradation',
      ]),
    ),
    reproducibility_issues: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'reproducibility',
        'variability',
        'standards',
        'comparison',
      ]),
    ),
    data_gaps: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'missing',
        'data gap',
        'no economic',
        'short operation',
      ]),
    ),
    maturity_signals: [
      detectFirst(text, [
        'lab-only',
        'lab scale',
        'pilot',
        'commercial',
        'long-term operation',
      ]),
    ].filter((value): value is string => Boolean(value)),
    implementation_dependencies: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'pretreatment',
        'integration',
        'renewable',
        'automatic control',
      ]),
    ),
    supplier_relevance: input.claims
      .filter((claim) => claim.claim_type === 'supplier_claim')
      .map((claim) => claim.content),
    environmental_safety_factors: limitationSentences.filter((sentence) =>
      includesAny(sentence, [
        'emissions',
        'sludge',
        'metal',
        'toxicity',
        'gas risk',
        'disposal',
      ]),
    ),
    missing_fields:
      limitationSentences.length > 0 ? [] : ['implementation_limitations'],
    evidence_trace: traces,
    confidence: limitationSentences.length > 0 ? 'medium' : 'low',
  });

  return { answer, trace: limitationSentences.length > 0 ? traces : [] };
}

function buildGenericList(input: DeterministicExtractionInput): {
  answer: unknown;
  confidence: ConfidenceLevel;
  trace: ResearchEvidenceTrace[];
} {
  const text = fullText(input);
  const instructionTokens = input.column.instructions
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 4);
  const items = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) =>
      instructionTokens.some((token) => sentence.toLowerCase().includes(token)),
    )
    .slice(0, 5)
    .map((sentence) => truncate(sentence, 240));
  const listKey =
    input.column.output_schema &&
    typeof input.column.output_schema === 'object' &&
    'gaps' in input.column.output_schema
      ? 'gaps'
      : 'items';
  const confidence = items.length > 0 ? 'low' : 'low';

  return {
    answer: {
      [listKey]: items,
      evidence_span: items[0] ?? null,
      confidence,
      missing_fields: items.length > 0 ? [] : [input.column.column_id],
    },
    confidence,
    trace: items.length > 0 ? baseTrace(input) : [],
  };
}

function buildAnswer(input: DeterministicExtractionInput): {
  answer: unknown;
  confidence: ConfidenceLevel;
  missingFields: string[];
  normalizedPayload: Record<string, unknown>;
  trace: ResearchEvidenceTrace[];
} {
  if (input.column.output_schema_key === 'paper_metadata') {
    return {
      answer: {
        title: input.paper.title,
        authors: input.paper.authors,
        year: input.paper.year,
        doi: input.paper.doi,
        journal: input.paper.journal,
        source_url: input.paper.source_url,
        pdf_url: input.paper.pdf_url,
      },
      confidence: 'high',
      missingFields: [
        input.paper.doi ? null : 'doi',
        input.paper.abstract_text ? null : 'abstract_text',
      ].filter((value): value is string => Boolean(value)),
      normalizedPayload: {},
      trace: baseTrace(input),
    };
  }

  if (input.column.output_schema_key === 'summary') {
    const summary = truncate(
      input.paper.abstract_text ?? input.paper.title,
      360,
    );
    return {
      answer: {
        summary,
        evidence_span: summary,
        confidence: input.paper.abstract_text ? 'medium' : 'low',
      },
      confidence: input.paper.abstract_text ? 'medium' : 'low',
      missingFields: input.paper.abstract_text ? [] : ['abstract_text'],
      normalizedPayload: {},
      trace: baseTrace(input),
    };
  }

  if (input.column.output_schema_key === 'technology_application') {
    const text = fullText(input);
    const application = detectFirst(text, [
      'wastewater treatment',
      'hydrogen recovery',
      'nitrogen recovery',
      'sensing',
      'desalination',
      'energy recovery',
    ]);

    return {
      answer: {
        technology_class: detectTechnologyClasses(text),
        application,
        scale: detectFirst(text, [
          'lab',
          'bench',
          'pilot',
          'demo',
          'commercial',
        ]),
        evidence_span: truncate(text, 360),
      },
      confidence: application ? 'medium' : 'low',
      missingFields: application ? [] : ['application'],
      normalizedPayload: {},
      trace: baseTrace(input),
    };
  }

  if (input.column.output_schema_key === 'system_performance') {
    const built = buildSystemPerformance(input);
    return {
      answer: built.answer,
      confidence: built.answer.confidence,
      missingFields: built.answer.missing_fields,
      normalizedPayload: { metrics: built.metrics },
      trace: built.trace,
    };
  }

  if (input.column.output_schema_key === 'implementation_factors') {
    const built = buildImplementationFactors(input);
    const parsed = researchImplementationFactorsExtractionSchema.parse(
      built.answer,
    );
    return {
      answer: parsed,
      confidence: parsed.confidence,
      missingFields: parsed.missing_fields,
      normalizedPayload: {},
      trace: built.trace,
    };
  }

  const generic = buildGenericList(input);
  return {
    answer: generic.answer,
    confidence: generic.confidence,
    missingFields:
      (generic.answer as { missing_fields?: string[] }).missing_fields ?? [],
    normalizedPayload: {},
    trace: generic.trace,
  };
}

function validateColumnAnswer(input: {
  answer: unknown;
  column: ResearchColumnDefinition;
  outputSchemaKey: string;
}): string[] {
  if (input.outputSchemaKey === 'paper_metadata') {
    return validatePaperMetadataAnswer(input.answer);
  }

  if (input.outputSchemaKey === 'summary') {
    return validateSummaryAnswer(input.answer);
  }

  if (input.outputSchemaKey === 'technology_application') {
    return validateTechnologyApplicationAnswer(input.answer);
  }

  if (input.outputSchemaKey === 'system_performance') {
    const parsed = researchSystemPerformanceExtractionSchema.safeParse(
      input.answer,
    );
    return parsed.success
      ? []
      : parsed.error.issues.map((issue) =>
          issue.path.length > 0 ? issue.path.join('.') : issue.message,
        );
  }

  if (input.outputSchemaKey === 'implementation_factors') {
    const parsed = researchImplementationFactorsExtractionSchema.safeParse(
      input.answer,
    );
    return parsed.success
      ? []
      : parsed.error.issues.map((issue) =>
          issue.path.length > 0 ? issue.path.join('.') : issue.message,
        );
  }

  if (input.outputSchemaKey === 'generic_list') {
    return validateGenericListAnswer(
      input.answer,
      input.column.output_schema &&
        typeof input.column.output_schema === 'object' &&
        'gaps' in input.column.output_schema
        ? 'gaps'
        : 'items',
    );
  }

  return [];
}

export function runDeterministicResearchExtraction(
  input: DeterministicExtractionInput,
): ResearchExtractionResult {
  const built = buildAnswer(input);
  const validationErrors = validateColumnAnswer({
    answer: built.answer,
    column: input.column,
    outputSchemaKey: input.column.output_schema_key,
  });

  return researchExtractionResultSchema.parse({
    review_id: input.reviewId,
    paper_id: input.paper.paper_id,
    column_id: input.column.column_id,
    status: validationErrors.length > 0 ? 'invalid' : 'valid',
    answer: built.answer,
    evidence_trace: built.trace,
    confidence: validationErrors.length > 0 ? 'low' : built.confidence,
    missing_fields: built.missingFields,
    validation_errors: validationErrors,
    normalized_payload: built.normalizedPayload,
    extractor_version: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  });
}
