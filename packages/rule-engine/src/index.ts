import {
    canonicalOutputSections,
    confidenceLevelSchema,
    decisionOutputSchema,
    loadContractCompatibilityDefinition,
    loadContractDiagnosticsDefinition,
    loadContractImprovementsDefinition,
    loadContractOutputDefinition,
    loadContractScoringModel,
    loadContractSensitivityPolicy,
    type ConfidenceLevel,
    type DecisionOutput,
    type DerivedObservation,
    type EvidenceRecord,
    type NormalizedCaseInput,
    type RecommendationRecord,
} from '@metrev/domain-contracts';
import { dedupeStrings, isNonEmptyString } from '@metrev/utils';

type RuleCondition = {
  all?: RuleCondition[];
  any?: RuleCondition[];
  field?: string;
  metric?: string;
  operator?: string;
  value?: unknown;
};

interface TriggeredDiagnostic {
  id: string;
  name: string;
  diagnosis: string;
  confidence: ConfidenceLevel;
  expectedEffects: string[];
}

const compatibilityRules =
  loadContractCompatibilityDefinition().compatibility_rules;
const diagnosticRules = loadContractDiagnosticsDefinition().diagnostic_rules;
const improvementRules = loadContractImprovementsDefinition().improvement_rules;
const outputDefinition = loadContractOutputDefinition();
const scoringModel = loadContractScoringModel().scoring_model;
const sensitivityPolicy = loadContractSensitivityPolicy().sensitivity_policy;

const metricThresholds: Record<
  string,
  { high_threshold?: number; low_threshold?: number }
> = {
  current_density_a_m2: { low_threshold: 80 },
  power_density_w_m2: { low_threshold: 25 },
  internal_resistance_ohm: { high_threshold: 40 },
  cod_removal_pct: { low_threshold: 60 },
};

const derivedObservationRuleInputKeys = new Set([
  'current_density_a_m2',
  'power_density_w_m2',
  'internal_resistance_ohm',
  'cod_removal_pct',
  'nitrogen_recovery_proxy_pct',
  'hydrogen_recovery_proxy_rate',
  'operating_window_temperature_c',
  'operating_window_ph',
  'operating_window_conductivity_ms_per_cm',
]);

const placeholderTokens = new Set([
  'unknown',
  'needs_classification',
  'medium',
  'none',
  'documented',
  'present',
  'absent',
]);

function toEvidenceRecordValue(
  record: EvidenceRecord,
): Record<string, unknown> {
  return record as Record<string, unknown>;
}

function readEvidenceStringField(
  record: EvidenceRecord,
  key: string,
): string | undefined {
  const value = toEvidenceRecordValue(record)[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function readEvidenceStringArrayField(
  record: EvidenceRecord,
  key: string,
): string[] {
  const value = toEvidenceRecordValue(record)[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === 'string' && entry.trim().length > 0,
  );
}

function readEvidenceNestedStringArrayField(
  record: EvidenceRecord,
  key: string,
  nestedKey: string,
): string[] {
  const nestedValue = toEvidenceRecordValue(record)[key];
  if (
    !nestedValue ||
    typeof nestedValue !== 'object' ||
    Array.isArray(nestedValue)
  ) {
    return [];
  }

  const candidate = (nestedValue as Record<string, unknown>)[nestedKey];
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate.filter(
    (entry): entry is string =>
      typeof entry === 'string' && entry.trim().length > 0,
  );
}

function readEvidenceNestedStringField(
  record: EvidenceRecord,
  key: string,
  nestedKey: string,
): string | undefined {
  const nestedValue = toEvidenceRecordValue(record)[key];
  if (
    !nestedValue ||
    typeof nestedValue !== 'object' ||
    Array.isArray(nestedValue)
  ) {
    return undefined;
  }

  const candidate = (nestedValue as Record<string, unknown>)[nestedKey];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate
    : undefined;
}

function countTracePenaltyEvidence(typedEvidence: EvidenceRecord[]): number {
  return typedEvidence.filter((record) => {
    const metadataLevel = readEvidenceNestedStringField(
      record,
      'metadata_quality',
      'level',
    );
    const veracityLevel = readEvidenceNestedStringField(
      record,
      'veracity_score',
      'level',
    );
    const confidencePenalties = readEvidenceNestedStringArrayField(
      record,
      'veracity_score',
      'confidence_penalties',
    );

    return (
      metadataLevel === 'low' ||
      veracityLevel === 'low' ||
      confidencePenalties.length > 0 ||
      readEvidenceStringField(record, 'review_status') === 'pending'
    );
  }).length;
}

function countNonAcceptedReviewedEvidence(
  typedEvidence: EvidenceRecord[],
): number {
  return typedEvidence.filter((record) => {
    const reviewStatus = readEvidenceStringField(record, 'review_status');
    return reviewStatus !== undefined && reviewStatus !== 'accepted';
  }).length;
}

function toConfidenceLevel(input: {
  missingCount: number;
  defaultsCount: number;
  evidenceCount: number;
  supplierClaimFraction: string;
  highSeverityMatches: number;
  lowObservability: boolean;
  modeledObservationCount: number;
  tracePenaltyEvidenceCount: number;
  nonAcceptedEvidenceCount: number;
}): ConfidenceLevel {
  let score = 0.6;

  score += Math.min(0.2, input.evidenceCount * 0.05);
  score -= input.missingCount * 0.08;
  score -= input.defaultsCount * 0.04;
  score -= input.highSeverityMatches * 0.08;

  if (input.lowObservability) {
    score -= 0.08;
  }

  score -= Math.min(0.08, input.modeledObservationCount * 0.02);
  score -= Math.min(0.12, input.tracePenaltyEvidenceCount * 0.04);
  score -= Math.min(0.08, input.nonAcceptedEvidenceCount * 0.03);

  if (input.supplierClaimFraction === 'high') {
    score -= 0.08;
  } else if (input.supplierClaimFraction === 'medium') {
    score -= 0.04;
  }

  if (score >= 0.7) {
    return confidenceLevelSchema.Enum.high;
  }

  if (score >= 0.45) {
    return confidenceLevelSchema.Enum.medium;
  }

  return confidenceLevelSchema.Enum.low;
}

function toResolvedMetricContext(input: {
  normalizedCase: NormalizedCaseInput;
  derivedObservations?: DerivedObservation[];
}): {
  resolvedCase: NormalizedCaseInput;
  modeledRuleInputsUsed: DerivedObservation[];
} {
  const resolvedMetrics = {
    ...input.normalizedCase.measured_metrics,
  };
  const modeledRuleInputsUsed: DerivedObservation[] = [];

  for (const observation of input.derivedObservations ?? []) {
    if (observation.decision_relevance !== 'rule_input') {
      continue;
    }

    if (!derivedObservationRuleInputKeys.has(observation.key)) {
      continue;
    }

    if (observation.source_kind === 'unavailable') {
      continue;
    }

    if (
      typeof observation.value !== 'number' ||
      !Number.isFinite(observation.value)
    ) {
      continue;
    }

    const measuredValue = resolvedMetrics[observation.key];
    if (typeof measuredValue === 'number' && Number.isFinite(measuredValue)) {
      continue;
    }

    resolvedMetrics[observation.key] = observation.value;
    modeledRuleInputsUsed.push(observation);
  }

  return {
    resolvedCase: {
      ...input.normalizedCase,
      measured_metrics: resolvedMetrics,
    },
    modeledRuleInputsUsed,
  };
}

function describeBlock(
  blockName: string,
  block: Record<string, unknown>,
): {
  block: string;
  finding: string;
  status: 'attention' | 'documented' | 'needs-data';
  rule_refs: string[];
  severity?: 'low' | 'medium' | 'high';
} {
  const populated = Object.values(block).some((value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized.length > 0 && !placeholderTokens.has(normalized);
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (value && typeof value === 'object') {
      return Object.values(value).some(
        (entry) => entry !== undefined && entry !== null,
      );
    }

    return value !== null && value !== undefined;
  });

  if (!populated) {
    return {
      block: blockName,
      status: 'needs-data',
      finding: `${blockName} is not documented well enough for confident recommendations.`,
      rule_refs: [],
      severity: 'medium',
    };
  }

  if (
    blockName === 'sensors_and_analytics' &&
    ['low', 'unknown'].includes(String(block.data_quality ?? 'unknown'))
  ) {
    return {
      block: blockName,
      status: 'attention',
      finding:
        'Instrumentation quality is weak relative to the required audit and validation standard.',
      rule_refs: [],
      severity: 'high',
    };
  }

  if (
    blockName === 'operational_biology' &&
    ['early', 'unknown'].includes(String(block.biofilm_maturity ?? 'unknown'))
  ) {
    return {
      block: blockName,
      status: 'attention',
      finding:
        'Biological readiness remains uncertain, which constrains performance interpretation.',
      rule_refs: [],
      severity: 'medium',
    };
  }

  return {
    block: blockName,
    status: 'documented',
    finding: `${blockName} has enough detail to support an initial deterministic review.`,
    rule_refs: [],
  };
}

function getPathValue(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, root);
}

function normalizeComparable(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  return value;
}

function resolveThreshold(metric: string, value: unknown): unknown {
  if (!isNonEmptyString(value)) {
    return value;
  }

  const threshold =
    metricThresholds[metric]?.[value as 'high_threshold' | 'low_threshold'];
  return threshold ?? value;
}

function evaluateLeaf(
  normalizedCase: NormalizedCaseInput,
  node: RuleCondition,
): boolean {
  const reference = node.field
    ? getPathValue(normalizedCase, node.field.replace(/^case\./, ''))
    : getPathValue(normalizedCase.measured_metrics, String(node.metric));
  const comparison = node.metric
    ? resolveThreshold(String(node.metric), node.value)
    : node.value;

  switch (node.operator) {
    case '=':
      return normalizeComparable(reference) === normalizeComparable(comparison);
    case '>':
      return Number(reference) > Number(comparison);
    case '<':
      return Number(reference) < Number(comparison);
    case 'in':
      return Array.isArray(comparison)
        ? comparison
            .map(normalizeComparable)
            .includes(normalizeComparable(reference))
        : false;
    case 'contains':
      if (Array.isArray(reference)) {
        return reference
          .map(normalizeComparable)
          .includes(normalizeComparable(comparison));
      }

      if (typeof reference === 'string' && typeof comparison === 'string') {
        return reference.toLowerCase().includes(comparison.toLowerCase());
      }

      return false;
    default:
      return false;
  }
}

function evaluateCondition(
  normalizedCase: NormalizedCaseInput,
  node: RuleCondition,
): boolean {
  if (node.all) {
    return node.all.every((entry) => evaluateCondition(normalizedCase, entry));
  }

  if (node.any) {
    return node.any.some((entry) => evaluateCondition(normalizedCase, entry));
  }

  return evaluateLeaf(normalizedCase, node);
}

function collectFieldRefs(node: RuleCondition): string[] {
  if (node.all) {
    return node.all.flatMap((entry) => collectFieldRefs(entry));
  }

  if (node.any) {
    return node.any.flatMap((entry) => collectFieldRefs(entry));
  }

  return dedupeStrings([
    node.field,
    node.metric ? `metric:${node.metric}` : undefined,
  ]);
}

function deriveConcernArea(node: RuleCondition): string {
  const firstReference = collectFieldRefs(node)[0];
  if (!firstReference) {
    return 'cross_cutting_review';
  }

  if (firstReference.startsWith('metric:')) {
    return 'measured_metrics';
  }

  const segments = firstReference.replace(/^case\./, '').split('.');
  if (segments[0] === 'stack_blocks' && segments[1]) {
    return segments[1];
  }

  return segments[0] ?? 'cross_cutting_review';
}

function mapImpactToScale(value: string | undefined): number {
  switch (value) {
    case 'high':
      return 5;
    case 'medium':
      return 4;
    case 'low':
      return 3;
    case 'indirect':
      return 2;
    default:
      return 2;
  }
}

function mapEffortToScale(
  value: RecommendationRecord['implementation_effort'],
): number {
  switch (value) {
    case 'low':
      return 2;
    case 'medium':
      return 3;
    case 'high':
      return 5;
  }
}

function mapRiskToScale(value: RecommendationRecord['risk_level']): number {
  switch (value) {
    case 'low':
      return 2;
    case 'medium':
      return 3;
    case 'high':
      return 5;
  }
}

function computeEvidenceStrengthScale(
  normalizedCase: NormalizedCaseInput,
): number {
  const evidence =
    normalizedCase.cross_cutting_layers.evidence_and_provenance.typed_evidence;

  if (evidence.length === 0) {
    return 1;
  }

  const total = evidence.reduce((sum, record) => {
    if (record.strength_level === 'strong') {
      return sum + 5;
    }

    if (record.strength_level === 'moderate') {
      return sum + 3;
    }

    return sum + 2;
  }, 0);

  return Math.max(1, Math.min(5, Math.round(total / evidence.length)));
}

function computePriorityScore(input: {
  recommendation: RecommendationRecord;
  normalizedCase: NormalizedCaseInput;
}): number {
  const trl = input.normalizedCase.cross_cutting_layers.risk_and_maturity.trl;
  const maturityScale = Math.max(
    1,
    Math.min(5, Math.round(((trl - 1) / 8) * 4 + 1)),
  );

  const dimensionScores = {
    expected_technical_gain: mapImpactToScale(
      input.recommendation.expected_benefit,
    ),
    economic_feasibility:
      input.recommendation.economic_plausibility === 'high'
        ? 5
        : input.recommendation.economic_plausibility === 'medium'
          ? 3
          : 2,
    implementation_risk: mapRiskToScale(input.recommendation.risk_level),
    maturity_trl: maturityScale,
    implementation_complexity: mapEffortToScale(
      input.recommendation.implementation_effort,
    ),
    evidence_strength: computeEvidenceStrengthScale(input.normalizedCase),
  };

  const rawScore = Object.entries(scoringModel.dimensions).reduce(
    (sum, [dimension, config]) => {
      const score =
        dimensionScores[dimension as keyof typeof dimensionScores] ?? 1;
      const normalized = config.invert ? 6 - score : score;
      return sum + (normalized / 5) * config.weight;
    },
    0,
  );

  const bounded = Math.round(
    (rawScore /
      Object.values(scoringModel.dimensions).reduce(
        (sum, item) => sum + item.weight,
        0,
      )) *
      scoringModel.output.final_priority_score.range[1],
  );

  if (input.normalizedCase.missing_data.length > 3) {
    return Math.min(bounded, 65);
  }

  return bounded;
}

function phaseForRecommendation(id: string): string {
  if (id === 'rec-data-closure' || id === 'imp_004') {
    return 'Phase 1';
  }

  if (id === 'imp_001') {
    return 'Phase 2';
  }

  return 'Phase 3';
}

function buildRecommendation(input: {
  recommendationId: string;
  linkedDiagnosis: string;
  rationale: string;
  expectedBenefit: string;
  confidenceLevel: ConfidenceLevel;
  missingDataDependencies: string[];
  assumptions: string[];
  ruleRefs: string[];
  evidenceRefs: string[];
  supplierCandidates: string[];
  phaseAssignment: string;
  implementationEffort: RecommendationRecord['implementation_effort'];
  economicPlausibility: RecommendationRecord['economic_plausibility'];
  riskLevel: RecommendationRecord['risk_level'];
  maturityLevel: RecommendationRecord['maturity_level'];
  evidenceStrengthSummary: string;
  provenanceNotes: string[];
}): RecommendationRecord {
  return {
    recommendation_id: input.recommendationId,
    linked_diagnosis: input.linkedDiagnosis,
    rationale: input.rationale,
    expected_benefit: input.expectedBenefit,
    implementation_effort: input.implementationEffort,
    economic_plausibility: input.economicPlausibility,
    risk_level: input.riskLevel,
    maturity_level: input.maturityLevel,
    evidence_strength_summary: input.evidenceStrengthSummary,
    assumptions: input.assumptions,
    missing_data_dependencies: input.missingDataDependencies,
    confidence_level: input.confidenceLevel,
    supplier_candidates: input.supplierCandidates,
    prerequisite_actions: input.missingDataDependencies,
    measurement_requests: input.missingDataDependencies,
    phase_assignment: input.phaseAssignment,
    rule_refs: input.ruleRefs,
    evidence_refs: input.evidenceRefs,
    provenance_notes: input.provenanceNotes,
  };
}

function buildSupplierShortlist(
  normalizedCase: NormalizedCaseInput,
  recommendations: RecommendationRecord[],
): DecisionOutput['supplier_shortlist'] {
  const supplierContext =
    normalizedCase.cross_cutting_layers.risk_and_maturity.supplier_context;
  const normalizeSupplierName = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ');
  const excludedSuppliers = new Set(
    supplierContext.excluded_suppliers.map(normalizeSupplierName),
  );
  const allowedPreferredSuppliers = supplierContext.preferred_suppliers.filter(
    (candidate) => !excludedSuppliers.has(normalizeSupplierName(candidate)),
  );

  const shortlist: DecisionOutput['supplier_shortlist'] = [];

  if (allowedPreferredSuppliers.length > 0) {
    shortlist.push({
      category: 'preferred_suppliers',
      candidate_path: allowedPreferredSuppliers.join(', '),
      fit_note:
        'Client-preferred suppliers remain candidates only after compatibility, evidence quality, and serviceability checks.',
      missing_information_before_commitment: dedupeStrings([
        'compatibility validation',
        'serviceability terms',
        'evidence corroboration',
      ]),
    });
  }

  if (
    recommendations.some(
      (recommendation) =>
        recommendation.recommendation_id.includes('004') ||
        recommendation.recommendation_id === 'rec-data-closure',
    )
  ) {
    shortlist.push({
      category: 'instrumentation',
      candidate_path:
        allowedPreferredSuppliers[0] ??
        'Telemetry, diagnostics, and historian package',
      fit_note:
        'Observability upgrades are low-regret because they increase auditability and reduce false precision.',
      missing_information_before_commitment: dedupeStrings([
        'sensor specification',
        'integration scope',
        'alarm coverage',
      ]),
    });
  }

  shortlist.push({
    category: 'stack_materials',
    candidate_path:
      recommendations.length > 1
        ? 'Modular anode, cathode, membrane, and interconnect shortlist'
        : 'Validation-first materials shortlist',
    fit_note:
      'Material candidates should stay as a shortlist until the measured operating envelope and evidence base become stronger.',
    missing_information_before_commitment: dedupeStrings([
      ...normalizedCase.missing_data,
      'supplier qualification evidence',
    ]),
  });

  return shortlist;
}

function determineSensitivityLevel(
  normalizedCase: NormalizedCaseInput,
): 'low' | 'medium' | 'high' {
  const trackedFactors = sensitivityPolicy.tracked_factors;
  const missingTrackedFactors = trackedFactors.filter((path) => {
    const value = getPathValue(normalizedCase, path.replace(/^case\./, ''));
    if (Array.isArray(value)) {
      return value.length === 0;
    }

    return value === undefined || value === null || value === '';
  }).length;

  if (normalizedCase.missing_data.length > 3 || missingTrackedFactors > 2) {
    return 'high';
  }

  if (normalizedCase.missing_data.length > 1 || missingTrackedFactors > 0) {
    return 'medium';
  }

  return 'low';
}

export function runCaseEvaluation(
  normalizedCase: NormalizedCaseInput,
  input: {
    derivedObservations?: DerivedObservation[];
  } = {},
): DecisionOutput {
  const { resolvedCase, modeledRuleInputsUsed } = toResolvedMetricContext({
    normalizedCase,
    derivedObservations: input.derivedObservations,
  });
  const missingData = resolvedCase.missing_data;
  const defaultsUsed = resolvedCase.defaults_used;
  const evidenceProfile =
    resolvedCase.cross_cutting_layers.evidence_and_provenance.evidence_profile;
  const typedEvidence =
    resolvedCase.cross_cutting_layers.evidence_and_provenance.typed_evidence;
  const tracePenaltyEvidenceCount = countTracePenaltyEvidence(typedEvidence);
  const nonAcceptedEvidenceCount =
    countNonAcceptedReviewedEvidence(typedEvidence);

  const compatibilityMatches = compatibilityRules.filter((rule) =>
    evaluateCondition(resolvedCase, rule.condition as RuleCondition),
  );
  const triggeredDiagnostics: TriggeredDiagnostic[] = diagnosticRules
    .filter((rule) =>
      evaluateCondition(resolvedCase, rule.trigger as RuleCondition),
    )
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      diagnosis: rule.diagnosis,
      confidence: rule.confidence,
      expectedEffects: rule.expected_effects ?? [],
    }));

  const confidenceLevel = toConfidenceLevel({
    missingCount: missingData.length,
    defaultsCount: defaultsUsed.length,
    evidenceCount: typedEvidence.length,
    supplierClaimFraction:
      normalizedCase.cross_cutting_layers.evidence_and_provenance
        .supplier_claim_fraction,
    highSeverityMatches: compatibilityMatches.filter(
      (rule) => rule.severity === 'high',
    ).length,
    lowObservability:
      resolvedCase.stack_blocks.sensors_and_analytics.data_quality === 'low',
    modeledObservationCount: modeledRuleInputsUsed.length,
    tracePenaltyEvidenceCount,
    nonAcceptedEvidenceCount,
  });

  const blockFindings = Object.entries(resolvedCase.stack_blocks).map(
    ([blockName, value]) =>
      describeBlock(blockName, value as Record<string, unknown>),
  );

  const ruleFindings = compatibilityMatches.map((rule) => ({
    block: deriveConcernArea(rule.condition as RuleCondition),
    status: 'attention' as const,
    finding: rule.finding,
    rule_refs: [rule.id],
    severity: rule.severity,
  }));

  const diagnosticFindings = triggeredDiagnostics.map((diagnostic) => ({
    block: 'diagnostics',
    status: 'attention' as const,
    finding: diagnostic.diagnosis,
    rule_refs: [diagnostic.id],
    severity: diagnostic.confidence === 'high' ? 'high' : 'medium',
  }));

  const weaknesses = dedupeStrings([
    missingData.length > 0
      ? 'Missing data reduces confidence and narrows the recommendation space.'
      : undefined,
    !isNonEmptyString(normalizedCase.feed_and_operation.influent_type)
      ? 'Influent context is incomplete, which weakens compatibility reasoning.'
      : undefined,
    !Object.keys(resolvedCase.stack_blocks.sensors_and_analytics).length
      ? 'Observability is weak, so validation coverage should be improved before strong conclusions.'
      : undefined,
    compatibilityMatches.some((rule) => rule.severity === 'high')
      ? 'At least one high-severity compatibility rule was triggered and should be closed before procurement decisions.'
      : undefined,
    typedEvidence.length === 0
      ? 'No typed evidence records were supplied, so confidence depends on defaults and explicit missing-data handling.'
      : undefined,
    tracePenaltyEvidenceCount > 0
      ? `${tracePenaltyEvidenceCount} evidence records carry metadata or veracity penalties, so confidence is intentionally reduced until trace quality improves.`
      : undefined,
    modeledRuleInputsUsed.length > 0
      ? `Deterministic evaluation used ${modeledRuleInputsUsed.length} modeled derived observations because measured anchors were unavailable for those signals.`
      : undefined,
  ]);

  const supplierCandidates =
    resolvedCase.cross_cutting_layers.risk_and_maturity.supplier_context
      .preferred_suppliers;

  const recommendations: RecommendationRecord[] = [];

  if (missingData.length > 0) {
    recommendations.push(
      buildRecommendation({
        recommendationId: 'rec-data-closure',
        linkedDiagnosis: 'Input completeness and traceability',
        rationale:
          'Close the most material data gaps before committing to structural stack changes or supplier selection.',
        expectedBenefit:
          'Improves confidence, reduces false precision, and protects follow-on engineering and procurement decisions.',
        confidenceLevel,
        missingDataDependencies: missingData,
        assumptions: resolvedCase.assumptions,
        ruleRefs: ['defaults_policy'],
        evidenceRefs: resolvedCase.evidence_refs,
        supplierCandidates,
        phaseAssignment: 'Phase 1',
        implementationEffort: 'low',
        economicPlausibility: 'high',
        riskLevel: 'low',
        maturityLevel: 'high',
        evidenceStrengthSummary:
          'This is a low-regret prerequisite because current uncertainty is driven primarily by missing inputs.',
        provenanceNotes: [
          'Generated directly from the explicit missing-data audit.',
        ],
      }),
    );
  }

  for (const diagnostic of triggeredDiagnostics) {
    const improvement = improvementRules.find(
      (rule) => rule.linked_diagnosis === diagnostic.id,
    );

    if (!improvement) {
      continue;
    }

    const phaseAssignment = phaseForRecommendation(improvement.id);
    const economicPlausibility =
      improvement.expected_impacts.cost === 'low'
        ? 'high'
        : improvement.expected_impacts.cost === 'medium'
          ? 'medium'
          : 'low';
    const riskLevel =
      improvement.expected_impacts.risk === 'low'
        ? 'low'
        : improvement.expected_impacts.risk === 'medium'
          ? 'medium'
          : 'high';
    const maturityLevel =
      improvement.expected_impacts.maturity === 'high'
        ? 'high'
        : improvement.expected_impacts.maturity === 'medium'
          ? 'medium'
          : 'low';

    recommendations.push(
      buildRecommendation({
        recommendationId: improvement.id,
        linkedDiagnosis: diagnostic.name,
        rationale: improvement.action,
        expectedBenefit:
          diagnostic.expectedEffects.join(', ') || diagnostic.diagnosis,
        confidenceLevel,
        missingDataDependencies: missingData.slice(0, 2),
        assumptions: resolvedCase.assumptions,
        ruleRefs: [diagnostic.id, improvement.id],
        evidenceRefs: resolvedCase.evidence_refs,
        supplierCandidates,
        phaseAssignment,
        implementationEffort: phaseAssignment === 'Phase 1' ? 'low' : 'medium',
        economicPlausibility,
        riskLevel,
        maturityLevel,
        evidenceStrengthSummary:
          typedEvidence.length > 0
            ? `${typedEvidence.length} typed evidence records inform this recommendation, but follow-up validation is still required.`
            : 'This recommendation is supported primarily by deterministic rule matches rather than external evidence records.',
        provenanceNotes: [
          `Derived from diagnostic rule ${diagnostic.id} and improvement rule ${improvement.id}.`,
        ],
      }),
    );
  }

  if (
    !recommendations.some(
      (recommendation) => recommendation.recommendation_id === 'imp_004',
    ) &&
    resolvedCase.stack_blocks.sensors_and_analytics.data_quality !== 'high'
  ) {
    recommendations.push(
      buildRecommendation({
        recommendationId: 'rec-observability',
        linkedDiagnosis: 'Instrumentation and monitoring',
        rationale:
          'Upgrade sensing, historian capture, and validation logging before relying on narrow optimization claims.',
        expectedBenefit:
          'Improves traceability, accelerates root-cause isolation, and reduces sensitivity to assumptions.',
        confidenceLevel,
        missingDataDependencies: dedupeStrings(
          missingData.filter(
            (entry) =>
              entry.includes('sensor') || entry.includes('measurement'),
          ),
        ),
        assumptions: resolvedCase.assumptions,
        ruleRefs: ['diag_004'],
        evidenceRefs: resolvedCase.evidence_refs,
        supplierCandidates,
        phaseAssignment: 'Phase 1',
        implementationEffort: 'low',
        economicPlausibility: 'high',
        riskLevel: 'low',
        maturityLevel: 'high',
        evidenceStrengthSummary:
          'Instrumentation improvements are justified even under low confidence because they make later recommendations more defensible.',
        provenanceNotes: [
          'Added because observability remains below the target decision standard.',
        ],
      }),
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      buildRecommendation({
        recommendationId: 'rec-baseline-validation',
        linkedDiagnosis: 'No acute rule triggers',
        rationale:
          'Maintain the current stack while expanding evidence quality, baseline monitoring, and periodic validation checks.',
        expectedBenefit:
          'Preserves a traceable baseline and avoids unnecessary structural change when no deterministic bottleneck dominates.',
        confidenceLevel,
        missingDataDependencies: resolvedCase.missing_data,
        assumptions: resolvedCase.assumptions,
        ruleRefs: [],
        evidenceRefs: resolvedCase.evidence_refs,
        supplierCandidates,
        phaseAssignment: 'Phase 2',
        implementationEffort: 'low',
        economicPlausibility: 'high',
        riskLevel: 'low',
        maturityLevel: 'high',
        evidenceStrengthSummary:
          'No acute deterministic trigger dominated the case, so the safest action is controlled validation rather than aggressive redesign.',
        provenanceNotes: [
          'Added because the deterministic rule set did not produce a higher-priority structural intervention.',
        ],
      }),
    );
  }

  const enrichedRecommendations = recommendations
    .map((recommendation) => ({
      ...recommendation,
      priority_score: computePriorityScore({
        recommendation,
        normalizedCase: resolvedCase,
      }),
    }))
    .sort(
      (left, right) => (right.priority_score ?? 0) - (left.priority_score ?? 0),
    );

  const sensitivityLevel = determineSensitivityLevel(resolvedCase);
  const provenanceNotes = dedupeStrings([
    `${typedEvidence.length} typed evidence records were processed in deterministic evaluation mode.`,
    resolvedCase.cross_cutting_layers.evidence_and_provenance
      .supplier_claim_fraction !== 'none'
      ? 'Supplier claims remained separated from validated evidence and lowered confidence accordingly.'
      : undefined,
    tracePenaltyEvidenceCount > 0
      ? `${tracePenaltyEvidenceCount} typed evidence records carried metadata or veracity penalties and were down-weighted in confidence scoring.`
      : undefined,
    nonAcceptedEvidenceCount > 0
      ? `${nonAcceptedEvidenceCount} typed evidence records were not fully accepted at review time and remained confidence-limited.`
      : undefined,
    `${triggeredDiagnostics.length} diagnostic rules and ${compatibilityMatches.length} compatibility rules matched the current case.`,
    `Evidence profile is ${evidenceProfile}.`,
    modeledRuleInputsUsed.length > 0
      ? `Modeled derived observations supplemented missing measured signals for ${modeledRuleInputsUsed.map((item) => item.key).join(', ')}.`
      : undefined,
    sensitivityLevel === 'high'
      ? 'Recommendation ranking is highly sensitive to missing inputs and assumption shifts.'
      : sensitivityLevel === 'medium'
        ? 'Recommendation ranking is directionally stable but still depends on a few assumption-sensitive factors.'
        : 'Recommendation ranking is relatively stable under the currently tracked sensitivity factors.',
  ]);

  const phasedRoadmap = ['Phase 1', 'Phase 2', 'Phase 3'].map((phase) => ({
    phase,
    title:
      phase === 'Phase 1'
        ? 'Immediate low-regret actions'
        : phase === 'Phase 2'
          ? 'Validation and pilot strengthening'
          : 'Structural optimization and supplier narrowing',
    actions: enrichedRecommendations
      .filter((recommendation) => recommendation.phase_assignment === phase)
      .map((recommendation) => recommendation.rationale),
  }));

  const decisionOutput = decisionOutputSchema.parse({
    current_stack_diagnosis: {
      summary: `Case ${resolvedCase.case_id} targets ${resolvedCase.primary_objective} using ${resolvedCase.technology_family} with architecture ${resolvedCase.architecture_family}. ${triggeredDiagnostics.length} diagnostics and ${compatibilityMatches.length} compatibility checks were triggered under an ${evidenceProfile} evidence profile.${modeledRuleInputsUsed.length > 0 ? ` ${modeledRuleInputsUsed.length} modeled signals supplemented missing measured anchors.` : ''}`,
      block_findings: [
        ...blockFindings,
        ...ruleFindings,
        ...diagnosticFindings,
      ],
      main_weaknesses_or_blind_spots: weaknesses,
    },
    prioritized_improvement_options: enrichedRecommendations,
    impact_map: enrichedRecommendations.map((recommendation) => ({
      option: recommendation.recommendation_id,
      technical_impact: recommendation.expected_benefit,
      economic_plausibility:
        recommendation.economic_plausibility === 'high'
          ? 'Low-regret or staged investment path.'
          : recommendation.economic_plausibility === 'medium'
            ? 'Economic case is plausible but depends on validation milestones.'
            : 'Economic case should remain exploratory until risk is reduced.',
      maturity_or_readiness:
        recommendation.maturity_level === 'high'
          ? 'Ready for staged execution once prerequisites are complete.'
          : recommendation.maturity_level === 'medium'
            ? 'Validation milestone required before commitment.'
            : 'Exploratory only at the current maturity and evidence level.',
      dependencies: recommendation.prerequisite_actions ?? [],
      confidence: recommendation.confidence_level,
      priority_score: recommendation.priority_score,
    })),
    supplier_shortlist: buildSupplierShortlist(
      resolvedCase,
      enrichedRecommendations,
    ),
    phased_roadmap: phasedRoadmap,
    assumptions_and_defaults_audit: {
      assumptions: resolvedCase.assumptions,
      defaults_used: resolvedCase.defaults_used,
      missing_data: resolvedCase.missing_data,
    },
    confidence_and_uncertainty_summary: {
      confidence_level: confidenceLevel,
      summary:
        confidenceLevel === 'high'
          ? 'Current inputs support a defensible first-pass decision package with bounded uncertainty.'
          : confidenceLevel === 'medium'
            ? 'Recommendations are directionally useful but still depend on targeted validation work.'
            : 'Recommendations should be treated as exploratory until the highlighted validation and data-closure steps are completed.',
      next_tests: dedupeStrings([
        'Confirm influent and operating regime with repeatable measurements.',
        'Validate baseline electrochemical performance after instrumentation review.',
        triggeredDiagnostics.length > 0
          ? 'Run a focused comparison test against the dominant diagnosed bottleneck.'
          : undefined,
        missingData.length > 0
          ? 'Close the most material missing-data items before procurement or major retrofit decisions.'
          : undefined,
      ]),
      provenance_notes: provenanceNotes,
      sensitivity_level: sensitivityLevel,
    },
  });

  const requiredSections = dedupeStrings([
    ...outputDefinition.normalized_decision_output.required_sections,
    ...canonicalOutputSections,
  ]);
  const missingSections = requiredSections.filter(
    (section) => !(section in decisionOutput),
  );

  if (missingSections.length > 0) {
    throw new Error(
      `Decision output is missing canonical sections: ${missingSections.join(', ')}`,
    );
  }

  return decisionOutput;
}
