import {
  researchDataMetadataReadinessExtractionSchema,
  researchExtractionResultSchema,
  researchImplementationFactorsExtractionSchema,
  researchSystemPerformanceExtractionSchema,
  type ConfidenceLevel,
  type EvidenceClaim,
  type ResearchColumnDefinition,
  type ResearchComponentProfile,
  type ResearchComponentType,
  type ResearchEvidenceTrace,
  type ResearchExtractedParameter,
  type ResearchExtractionResult,
  type ResearchMetricMeasurement,
  type ResearchPaperMetadata,
  type ResearchParameterKind,
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
  supplementalText?: string[];
  supplementalTrace?: ResearchEvidenceTrace[];
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
    ...(input.supplementalText ?? []),
    ...input.claims.map((claim) => claim.content),
  ]
    .filter(Boolean)
    .join(' ');
}

function baseTrace(
  input: DeterministicExtractionInput,
): ResearchEvidenceTrace[] {
  if ((input.supplementalTrace?.length ?? 0) > 0) {
    return input.supplementalTrace!.slice(0, 2);
  }

  if (input.paper.abstract_text?.trim()) {
    return [
      {
        source: 'abstract',
        source_document_id: input.paper.source_document_id,
        text_span: truncate(input.paper.abstract_text, 520),
        source_locator: 'abstract',
        page_number: null,
        section_label: null,
        table_label: null,
        cell_locator: null,
        caption: null,
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
      section_label: null,
      table_label: null,
      cell_locator: null,
      caption: null,
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
    section_label:
      typeof claim.metadata?.section_label === 'string'
        ? claim.metadata.section_label
        : null,
    table_label:
      typeof claim.metadata?.table_label === 'string'
        ? claim.metadata.table_label
        : null,
    cell_locator:
      typeof claim.metadata?.cell_locator === 'string'
        ? claim.metadata.cell_locator
        : null,
    caption:
      typeof claim.metadata?.caption === 'string'
        ? claim.metadata.caption
        : null,
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

function matchedLabels(
  text: string,
  candidates: Array<{ label: string; tokens: string[] }>,
): string[] {
  return candidates.flatMap((candidate) =>
    includesAny(text, candidate.tokens) ? [candidate.label] : [],
  );
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
    /\bMETs?\b/i.test(text) ||
    includesAny(text, [
      'microbial electrochemical technolog',
      'microbial electrochemical system',
      'microbial electrosynthesis',
    ])
  ) {
    classes.add('MET');
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

function parseNumberBeforeIndex(text: string, index: number): number | null {
  let end = index;
  while (end > 0 && /\s/.test(text[end - 1])) {
    end -= 1;
  }

  let start = end;
  while (start > 0 && /[0-9.,]/.test(text[start - 1])) {
    start -= 1;
  }

  if (start === end) {
    return null;
  }

  const parsed = Number.parseFloat(text.slice(start, end).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function detectTemperatureC(text: string): number | null {
  const lower = text.toLowerCase();

  for (const marker of [' degrees c', ' degree c', ' c']) {
    let searchFrom = 0;

    while (searchFrom < lower.length) {
      const index = lower.indexOf(marker, searchFrom);
      if (index === -1) {
        break;
      }

      const afterMarker = lower[index + marker.length];
      if (afterMarker && /[a-z0-9]/i.test(afterMarker)) {
        searchFrom = index + marker.length;
        continue;
      }

      const parsed = parseNumberBeforeIndex(text, index);
      if (parsed !== null) {
        return parsed;
      }

      searchFrom = index + marker.length;
    }
  }

  return null;
}

function extractOperatingConditions(text: string): Record<string, unknown> {
  const conditions: Record<string, unknown> = {};
  const phMatch = text.match(/\bpH\s?(?:of|=|:)?\s?(\d+(?:\.\d+)?)/i);
  const temperatureC = detectTemperatureC(text);
  const hrtMatch = text.match(
    /\bHRT\b\s?(?:of|=|:)?\s?(\d+(?:\.\d+)?)\s?(h|hr|hours?)/i,
  );

  if (phMatch) {
    conditions.pH = Number(phMatch[1]);
  }
  if (temperatureC !== null) {
    conditions.temperature_c = temperatureC;
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

function findEvidenceSentence(text: string, tokens: string[]): string | null {
  return (
    text
      .split(/(?<=[.!?])\s+/)
      .find((sentence) => includesAny(sentence, tokens)) ?? null
  );
}

function parameterTrace(input: {
  baseTraces: ResearchEvidenceTrace[];
  sourceDocumentId: string;
  text: string;
  tokens: string[];
}): ResearchEvidenceTrace {
  const matchingTrace = input.baseTraces.find((trace) =>
    includesAny(trace.text_span, input.tokens),
  );
  if (matchingTrace) {
    return matchingTrace;
  }

  const sentence = findEvidenceSentence(input.text, input.tokens);
  return {
    source: 'full_text',
    source_document_id: input.sourceDocumentId,
    text_span: truncate(sentence ?? input.text, 520),
    source_locator: null,
    page_number: null,
    section_label: null,
    table_label: null,
    cell_locator: null,
    caption: null,
  };
}

function buildTextParameter(input: {
  baseTraces: ResearchEvidenceTrace[];
  componentType: ResearchComponentType;
  confidence?: ConfidenceLevel;
  key: string;
  kind: ResearchParameterKind;
  label: string;
  sourceDocumentId: string;
  text: string;
  textValue: string | null;
  tokens: string[];
}): ResearchExtractedParameter | null {
  if (!input.textValue) {
    return null;
  }

  return {
    parameter_key: input.key,
    component_type: input.componentType,
    parameter_kind: input.kind,
    label: input.label,
    original_value: input.textValue,
    original_unit: null,
    normalized_value: null,
    normalized_unit: null,
    normalization_rule_id: null,
    text_value: input.textValue,
    evidence_trace: parameterTrace({
      baseTraces: input.baseTraces,
      sourceDocumentId: input.sourceDocumentId,
      text: input.text,
      tokens: input.tokens,
    }),
    confidence: input.confidence ?? 'medium',
  };
}

function buildNumericParameter(input: {
  baseTraces: ResearchEvidenceTrace[];
  componentType: ResearchComponentType;
  confidence?: ConfidenceLevel;
  key: string;
  kind: ResearchParameterKind;
  label: string;
  normalizedUnit: string;
  normalizedValue?: number;
  originalUnit: string;
  originalValue: number;
  sourceDocumentId: string;
  text: string;
  tokens: string[];
}): ResearchExtractedParameter {
  return {
    parameter_key: input.key,
    component_type: input.componentType,
    parameter_kind: input.kind,
    label: input.label,
    original_value: input.originalValue,
    original_unit: input.originalUnit,
    normalized_value: input.normalizedValue ?? input.originalValue,
    normalized_unit: input.normalizedUnit,
    normalization_rule_id:
      input.originalUnit === input.normalizedUnit
        ? 'identity'
        : 'unit-normalization-v1',
    text_value: null,
    evidence_trace: parameterTrace({
      baseTraces: input.baseTraces,
      sourceDocumentId: input.sourceDocumentId,
      text: input.text,
      tokens: input.tokens,
    }),
    confidence: input.confidence ?? 'medium',
  };
}

function firstNumericMatch(
  text: string,
  patterns: RegExp[],
): { unit: string; value: number } | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }

    const value = Number.parseFloat(match[1].replace(',', '.'));
    if (Number.isFinite(value)) {
      return {
        value,
        unit: match[2] ?? '',
      };
    }
  }

  return null;
}

function normalizeUnitText(unit: string): string {
  return unit
    .replace(/cm\s?[-^]?2/i, 'cm2')
    .replace(/m\s?[-^]?2/i, 'm2')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildScientificComponentParameters(input: {
  anodeMaterial: string | null;
  baseTraces: ResearchEvidenceTrace[];
  cathodeMaterial: string | null;
  operatingConditions: Record<string, unknown>;
  separator: string | null;
  sourceDocumentId: string;
  text: string;
}): ResearchExtractedParameter[] {
  const parameters = [
    buildTextParameter({
      baseTraces: input.baseTraces,
      componentType: 'anode',
      key: 'component_parameters.anode_material',
      kind: 'material',
      label: 'Anode material',
      sourceDocumentId: input.sourceDocumentId,
      text: input.text,
      textValue: input.anodeMaterial,
      tokens: ['anode', input.anodeMaterial ?? ''],
    }),
    buildTextParameter({
      baseTraces: input.baseTraces,
      componentType: 'cathode',
      key: 'component_parameters.cathode_material_or_catalyst',
      kind: 'material',
      label: 'Cathode material or catalyst',
      sourceDocumentId: input.sourceDocumentId,
      text: input.text,
      textValue: input.cathodeMaterial,
      tokens: ['cathode', 'catalyst', input.cathodeMaterial ?? ''],
    }),
    buildTextParameter({
      baseTraces: input.baseTraces,
      componentType: 'membrane_separator',
      key: 'component_parameters.membrane_separator_type',
      kind: 'material',
      label: 'Membrane or separator type',
      sourceDocumentId: input.sourceDocumentId,
      text: input.text,
      textValue: input.separator,
      tokens: ['membrane', 'separator', input.separator ?? ''],
    }),
  ].filter((parameter): parameter is ResearchExtractedParameter =>
    Boolean(parameter),
  );

  const numericCandidates: ResearchExtractedParameter[] = [];
  const surfaceArea = firstNumericMatch(input.text, [
    /surface\s+area\s+(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(m\s?2\s*\/\s*g|m\s?2\s*g\s?-?1|cm\s?2)/i,
    /(\d+(?:[.,]\d+)?)\s*(m\s?2\s*\/\s*g|m\s?2\s*g\s?-?1|cm\s?2)\s+surface\s+area/i,
  ]);
  if (surfaceArea) {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'anode',
        key: 'component_parameters.anode_surface_area',
        kind: 'surface_property',
        label: 'Anode surface area',
        normalizedUnit: normalizeUnitText(surfaceArea.unit),
        originalUnit: normalizeUnitText(surfaceArea.unit),
        originalValue: surfaceArea.value,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['surface area', 'anode'],
      }),
    );
  }

  const catalystLoading = firstNumericMatch(input.text, [
    /catalyst\s+loading\s+(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(mg\s*\/\s*cm\s?2|mg\s*cm\s?-?2)/i,
    /(\d+(?:[.,]\d+)?)\s*(mg\s*\/\s*cm\s?2|mg\s*cm\s?-?2)\s+catalyst\s+loading/i,
  ]);
  if (catalystLoading) {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'catalyst',
        key: 'component_parameters.catalyst_loading',
        kind: 'loading',
        label: 'Catalyst loading',
        normalizedUnit: normalizeUnitText(catalystLoading.unit),
        originalUnit: normalizeUnitText(catalystLoading.unit),
        originalValue: catalystLoading.value,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['catalyst loading', 'catalyst'],
      }),
    );
  }

  const membraneThickness = firstNumericMatch(input.text, [
    /membrane\s+thickness\s+(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(um|\u00b5m|micrometers?|mm)/i,
    /(\d+(?:[.,]\d+)?)\s*(um|\u00b5m|micrometers?|mm)\s+membrane\s+thickness/i,
  ]);
  if (membraneThickness) {
    const unit = membraneThickness.unit.toLowerCase();
    const normalizedValue =
      unit === 'mm'
        ? membraneThickness.value / 1000
        : membraneThickness.value / 1_000_000;
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'membrane_separator',
        key: 'component_parameters.membrane_separator_thickness',
        kind: 'geometry',
        label: 'Membrane thickness',
        normalizedUnit: 'm',
        normalizedValue,
        originalUnit: unit === 'mm' ? 'mm' : 'um',
        originalValue: membraneThickness.value,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['membrane thickness', 'membrane'],
      }),
    );
  }

  const startupTime = firstNumericMatch(input.text, [
    /(?:biofilm\s+)?startup\s+(?:time\s+)?(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(d|day|days)/i,
    /(\d+(?:[.,]\d+)?)\s*(d|day|days)\s+(?:biofilm\s+)?startup/i,
  ]);
  if (startupTime) {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'biofilm',
        key: 'component_parameters.biofilm_startup_time',
        kind: 'biology',
        label: 'Biofilm startup time',
        normalizedUnit: 'd',
        originalUnit: startupTime.unit,
        originalValue: startupTime.value,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['biofilm', 'startup'],
      }),
    );
  }

  if (typeof input.operatingConditions.pH === 'number') {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'electrolyte',
        key: 'component_parameters.electrolyte_pH',
        kind: 'operating_condition',
        label: 'Electrolyte pH',
        normalizedUnit: 'pH',
        originalUnit: 'pH',
        originalValue: input.operatingConditions.pH,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['pH'],
      }),
    );
  }
  if (typeof input.operatingConditions.temperature_c === 'number') {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'reactor',
        key: 'component_parameters.reactor_temperature',
        kind: 'operating_condition',
        label: 'Operating temperature',
        normalizedUnit: 'K',
        normalizedValue: input.operatingConditions.temperature_c + 273.15,
        originalUnit: 'degC',
        originalValue: input.operatingConditions.temperature_c,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['temperature', 'degrees c', ' C'],
      }),
    );
  }
  if (typeof input.operatingConditions.HRT_h === 'number') {
    numericCandidates.push(
      buildNumericParameter({
        baseTraces: input.baseTraces,
        componentType: 'reactor',
        key: 'component_parameters.reactor_hydraulic_retention_time',
        kind: 'operating_condition',
        label: 'Hydraulic retention time',
        normalizedUnit: 's',
        normalizedValue: input.operatingConditions.HRT_h * 3600,
        originalUnit: 'h',
        originalValue: input.operatingConditions.HRT_h,
        sourceDocumentId: input.sourceDocumentId,
        text: input.text,
        tokens: ['HRT', 'hydraulic retention time'],
      }),
    );
  }

  return [...parameters, ...numericCandidates];
}

function buildComponentProfiles(input: {
  anodeMaterial: string | null;
  cathodeMaterial: string | null;
  componentParameters: ResearchExtractedParameter[];
  separator: string | null;
  traces: ResearchEvidenceTrace[];
}): ResearchComponentProfile[] {
  const componentDefinitions: Array<{
    componentType: ResearchComponentType;
    label: string;
    material: string | null;
    role: string;
  }> = [
    {
      componentType: 'anode',
      label: 'Anode',
      material: input.anodeMaterial,
      role: 'electron-collecting biofilm support',
    },
    {
      componentType: 'cathode',
      label: 'Cathode',
      material: input.cathodeMaterial,
      role: 'reduction electrode and catalyst surface',
    },
    {
      componentType: 'membrane_separator',
      label: 'Membrane or separator',
      material: input.separator,
      role: 'ion transport and compartment separation',
    },
    {
      componentType: 'biofilm',
      label: 'Biofilm',
      material: null,
      role: 'electroactive microbial interface',
    },
  ];

  return componentDefinitions
    .map((definition) => {
      const properties = input.componentParameters.filter(
        (parameter) => parameter.component_type === definition.componentType,
      );
      const hasMaterial = Boolean(definition.material);
      const missingFields = [
        hasMaterial || definition.componentType === 'biofilm'
          ? null
          : `${definition.componentType}.material`,
        properties.length > 0 ? null : `${definition.componentType}.properties`,
      ].filter((value): value is string => Boolean(value));

      return {
        component_type: definition.componentType,
        label: definition.label,
        material: definition.material,
        role: definition.role,
        properties,
        missing_fields: missingFields,
        evidence_trace: properties
          .map((parameter) => parameter.evidence_trace)
          .slice(0, 4),
        confidence:
          missingFields.length === 0
            ? 'medium'
            : properties.length > 0 || hasMaterial
              ? 'low'
              : 'low',
      } satisfies ResearchComponentProfile;
    })
    .filter(
      (profile) =>
        profile.properties.length > 0 ||
        profile.material ||
        profile.component_type === 'biofilm',
    )
    .map((profile) => ({
      ...profile,
      evidence_trace:
        profile.evidence_trace.length > 0
          ? profile.evidence_trace
          : input.traces.slice(0, 1),
    }));
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
  const supplementalMetrics = (input.supplementalText ?? []).flatMap(
    (sourceText) =>
      extractMetricMeasurements({
        source: 'full_text',
        sourceDocumentId: input.paper.source_document_id,
        sourceText,
      }),
  );
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
  const metrics = [...abstractMetrics, ...supplementalMetrics, ...claimMetrics];
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
  const operatingConditions = extractOperatingConditions(text);
  const componentParameters = buildScientificComponentParameters({
    anodeMaterial,
    baseTraces: traces,
    cathodeMaterial,
    operatingConditions,
    separator,
    sourceDocumentId: input.paper.source_document_id,
    text,
  });
  const componentProfiles = buildComponentProfiles({
    anodeMaterial,
    cathodeMaterial,
    componentParameters,
    separator,
    traces,
  });
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
    componentParameters.length > 0 ? null : 'component_parameters',
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
    operating_conditions: operatingConditions,
    component_parameters: componentParameters,
    component_profiles: componentProfiles,
    quality_gate: {
      gate_id: 'deterministic-system-performance-v1',
      passed: componentParameters.length > 0 && metrics.length > 0,
      reasons:
        componentParameters.length > 0 || metrics.length > 0
          ? ['full_access_traceable']
          : ['insufficient_source_metadata'],
      trace_count: traces.length,
      table_count: traces.filter((trace) => Boolean(trace.table_label)).length,
      figure_count: traces.filter((trace) => Boolean(trace.caption)).length,
      missing_fields: missingFields,
    },
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

function buildDataMetadataReadiness(input: DeterministicExtractionInput): {
  answer: unknown;
  trace: ResearchEvidenceTrace[];
} {
  const text = fullText(input);
  const traces = tracesFromClaims(input, [
    'condition',
    'applicability',
    'limitation',
    'metric',
  ]);
  const signalGeneration = matchedLabels(text, [
    {
      label: 'timestamp_origin',
      tokens: ['timestamp origin', 'timestamp', 'time interval'],
    },
    {
      label: 'temporal_resolution',
      tokens: ['temporal resolution', 'sampling interval', 'resolution'],
    },
    {
      label: 'sensor_location',
      tokens: ['sensor location', 'location', 'installed'],
    },
    {
      label: 'device_specification',
      tokens: ['datasheet', 'manual', 'equipment', 'sensor', 'device'],
    },
    {
      label: 'signal_modification_history',
      tokens: ['data augmentation', 'data fusion', 'imputed'],
    },
  ]);
  const signalQuality = matchedLabels(text, [
    {
      label: 'calibration_context',
      tokens: ['calibration', 'calibrated', 'calibration curve'],
    },
    {
      label: 'validation_context',
      tokens: ['validation', 'validated', 'validation results'],
    },
    {
      label: 'quality_flags',
      tokens: ['quality flag', 'suspect quality', 'fault'],
    },
    {
      label: 'drift_and_bias',
      tokens: ['drift', 'bias', 'trueness', 'precision'],
    },
    {
      label: 'response_characteristics',
      tokens: ['response time', 'measurement range'],
    },
  ]);
  const contextualAnnotations = matchedLabels(text, [
    {
      label: 'rain_events',
      tokens: ['rain event', 'rainfall'],
    },
    {
      label: 'toxic_discharge',
      tokens: ['toxic discharge', 'toxicity'],
    },
    {
      label: 'maintenance_and_cleaning',
      tokens: ['maintenance', 'cleaning date', 'cleaning'],
    },
    {
      label: 'operating_upsets',
      tokens: ['operating upset', 'process upset', 'startup'],
    },
    {
      label: 'environmental_context',
      tokens: ['operating context', 'climatic', 'context'],
    },
  ]);
  const dataLineage = matchedLabels(text, [
    {
      label: 'data_pipeline',
      tokens: ['data pipeline', 'data acquisition', 'data-generating'],
    },
    {
      label: 'provenance_and_traceability',
      tokens: ['lineage', 'traceability', 'provenance', 'review lifecycle'],
    },
    {
      label: 'transformation_history',
      tokens: ['transformation', 'signal modification', 'history'],
    },
    {
      label: 'quality_control_records',
      tokens: ['quality assurance', 'quality control', 'historical'],
    },
  ]);
  const accessAndLicensing = [
    input.paper.doi ? 'doi_available' : null,
    input.paper.pdf_url ? 'pdf_link_available' : null,
    input.paper.source_url ? 'source_url_available' : null,
  ].filter((value): value is string => Boolean(value));
  const reviewState = [
    'analyst_review_required',
    input.paper.source_type === 'manual'
      ? 'manual_source_review_path'
      : 'provider_source_review_path',
  ];
  const trainingAndExtractionApplicability = [
    signalQuality.length > 0 ? 'quality_assessment_ready' : null,
    dataLineage.length > 0 ? 'traceable_extraction_ready' : null,
    contextualAnnotations.length > 0 ? 'context_aware_analysis_ready' : null,
    includesAny(text, [
      'model',
      'machine learning',
      'analytics',
      'automation',
      'algorithm',
      'training',
    ])
      ? 'model_training_candidate_with_quality_controls'
      : null,
  ].filter((value): value is string => Boolean(value));
  const categoryCount = [
    signalGeneration,
    signalQuality,
    contextualAnnotations,
    dataLineage,
  ].filter((entries) => entries.length > 0).length;
  const blockingGaps = [
    signalGeneration.length === 0 ? 'signal_generation_metadata' : null,
    signalQuality.length === 0 ? 'signal_quality_metadata' : null,
    contextualAnnotations.length === 0 ? 'contextual_annotations' : null,
    dataLineage.length === 0 ? 'data_lineage_metadata' : null,
  ].filter((value): value is string => Boolean(value));
  const decisionUseReadiness =
    categoryCount >= 3 && trainingAndExtractionApplicability.length > 0
      ? 'ready_with_review'
      : categoryCount >= 2
        ? 'context_only'
        : 'insufficient';
  const recommendedUses = [
    signalGeneration.length > 0
      ? 'sensor_and_acquisition_interpretation'
      : null,
    signalQuality.length > 0 ? 'data_quality_assessment' : null,
    contextualAnnotations.length > 0 ? 'context_aware_analysis' : null,
    dataLineage.length > 0 ? 'traceable_extraction_and_audit' : null,
    decisionUseReadiness === 'ready_with_review'
      ? 'reviewed_decision_support_intake'
      : null,
  ].filter((value): value is string => Boolean(value));
  const summary =
    categoryCount > 0
      ? `Metadata/data readiness captures ${[
          signalGeneration.length > 0 ? 'signal generation' : null,
          signalQuality.length > 0 ? 'signal quality' : null,
          contextualAnnotations.length > 0 ? 'contextual annotations' : null,
          dataLineage.length > 0 ? 'data lineage' : null,
        ]
          .filter((value): value is string => Boolean(value))
          .join(', ')} and is ${decisionUseReadiness.replace(/_/g, ' ')}.`
      : null;
  const answer = researchDataMetadataReadinessExtractionSchema.parse({
    summary,
    metadata_categories: {
      signal_generation: signalGeneration,
      signal_quality: signalQuality,
      contextual_annotations: contextualAnnotations,
      data_lineage: dataLineage,
      access_and_licensing: accessAndLicensing,
      review_state: reviewState,
    },
    training_and_extraction_applicability: trainingAndExtractionApplicability,
    decision_use_readiness: decisionUseReadiness,
    blocking_gaps: blockingGaps,
    recommended_uses: recommendedUses,
    missing_fields: blockingGaps,
    evidence_trace: traces,
    confidence:
      categoryCount >= 3 ? 'medium' : categoryCount >= 1 ? 'low' : 'low',
  });

  return {
    answer,
    trace: traces,
  };
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

  if (input.column.output_schema_key === 'data_metadata_readiness') {
    const built = buildDataMetadataReadiness(input);
    const parsed = researchDataMetadataReadinessExtractionSchema.parse(
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

  if (input.outputSchemaKey === 'data_metadata_readiness') {
    const parsed = researchDataMetadataReadinessExtractionSchema.safeParse(
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
  const evidenceTrace =
    validationErrors.length === 0 && built.trace.length === 0
      ? baseTrace(input)
      : built.trace;

  // Spec 037 / Phase 4: honest research-cell record alongside the legacy
  // result. Derivation follows contracts/research-cell-coverage.md.
  const hasSubstantiveAnswer = (() => {
    const value = built.answer;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0 && value !== 'not_reported';
    }
    if (typeof value === 'number' || typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }
    return false;
  })();

  const confidenceNumeric =
    built.confidence === 'high'
      ? 0.85
      : built.confidence === 'medium'
        ? 0.6
        : 0.3;

  let cellStatus:
    | 'filled_with_trace'
    | 'filled_without_enough_trace'
    | 'not_reported_by_paper'
    | 'extraction_failed'
    | 'needs_analyst_review';
  let missingReason:
    | 'not_reported_by_paper'
    | 'extraction_failed'
    | 'needs_analyst_review'
    | null;

  if (validationErrors.length > 0) {
    cellStatus = 'extraction_failed';
    missingReason = 'extraction_failed';
  } else if (!hasSubstantiveAnswer) {
    cellStatus = 'not_reported_by_paper';
    missingReason = 'not_reported_by_paper';
  } else if (evidenceTrace.length === 0) {
    cellStatus = 'filled_without_enough_trace';
    missingReason = null;
  } else {
    cellStatus = 'filled_with_trace';
    missingReason = null;
  }

  if (cellStatus !== 'extraction_failed' && confidenceNumeric < 0.4) {
    cellStatus = 'needs_analyst_review';
    missingReason = 'needs_analyst_review';
  }

  const cell = {
    paper_id: input.paper.paper_id,
    review_id: input.reviewId,
    column_id: input.column.column_id,
    output_schema_key: input.column.output_schema_key,
    value_display: null,
    normalized_value: null,
    unit: null,
    status: cellStatus,
    missing_reason: missingReason,
    confidence: confidenceNumeric,
    evidence_trace: evidenceTrace,
    extractor_version: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  };

  const normalizedPayloadWithCells = {
    ...(built.normalizedPayload as Record<string, unknown>),
    cells: [cell],
  };

  return researchExtractionResultSchema.parse({
    review_id: input.reviewId,
    paper_id: input.paper.paper_id,
    column_id: input.column.column_id,
    status: validationErrors.length > 0 ? 'invalid' : 'valid',
    answer: built.answer,
    evidence_trace: evidenceTrace,
    confidence: validationErrors.length > 0 ? 'low' : built.confidence,
    missing_fields: built.missingFields,
    validation_errors: validationErrors,
    normalized_payload: normalizedPayloadWithCells,
    extractor_version: DETERMINISTIC_RESEARCH_EXTRACTOR_VERSION,
  });
}
