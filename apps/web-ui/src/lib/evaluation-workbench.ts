import type {
  CaseHistoryResponse,
  ConfidenceLevel,
  DerivedObservation,
  EvaluationResponse,
  EvidenceRecord,
  SignalSourceKind,
  SimulationEnrichment,
} from '@metrev/domain-contracts';

export interface MetricDisplayRecord {
  key: string;
  label: string;
  value: string;
  numericValue: number | null;
  unit: string | null;
  sourceKind: SignalSourceKind;
  note: string;
}

export type WorkbenchTone =
  | 'success'
  | 'warning'
  | 'critical'
  | 'accent'
  | 'muted';

export interface DecisionHeroCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: WorkbenchTone;
}

export interface DecisionBriefCard {
  key: string;
  label: string;
  value: string;
  detail: string;
}

export interface DecisionAttentionItem {
  key: string;
  block: string;
  finding: string;
  severity: string;
  tone: WorkbenchTone;
}

export interface DecisionLeadActionModel {
  title: string;
  phase: string;
  scoreLabel: string;
  confidenceLabel: string;
  effortLabel: string;
  benefitLabel: string;
  rationale: string;
  blockers: string[];
  measurementRequests: string[];
  supplierCandidates: string[];
}

export interface DecisionRoadmapItem {
  phase: string;
  title: string;
  detail: string;
  actionCount: number;
}

export interface DecisionImpactItem {
  key: string;
  title: string;
  impact: string;
  economic: string;
  readiness: string;
  scoreLabel: string;
}

export interface DecisionWorkspaceOverview {
  heroCards: DecisionHeroCard[];
  briefCards: DecisionBriefCard[];
  attentionItems: DecisionAttentionItem[];
  leadAction: DecisionLeadActionModel;
  roadmap: DecisionRoadmapItem[];
  impactMap: DecisionImpactItem[];
}

export const coreMetricDefinitions = [
  {
    key: 'current_density_a_m2',
    label: 'Current density',
    unit: 'A/m2',
    target: [65, 120] as const,
  },
  {
    key: 'power_density_w_m2',
    label: 'Power density',
    unit: 'W/m2',
    target: [25, 70] as const,
  },
  {
    key: 'internal_resistance_ohm',
    label: 'Internal resistance',
    unit: 'ohm',
    target: [18, 45] as const,
  },
  {
    key: 'cod_removal_pct',
    label: 'COD removal',
    unit: '%',
    target: [60, 90] as const,
  },
  {
    key: 'nitrogen_recovery_proxy_pct',
    label: 'Nitrogen recovery proxy',
    unit: '%',
    target: [45, 85] as const,
  },
  {
    key: 'hydrogen_recovery_proxy_rate',
    label: 'Hydrogen recovery proxy',
    unit: 'kgH2/m3/d',
    target: [0.15, 0.35] as const,
  },
] as const;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toCountLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function firstNonEmpty(items: Array<string | null | undefined>): string | null {
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
  }

  return null;
}

function buildPostureCard(input: {
  confidenceLevel: ConfidenceLevel;
  missingDataCount: number;
  attentionCount: number;
  defaultsCount: number;
  hasLeadAction: boolean;
}): DecisionHeroCard {
  if (!input.hasLeadAction) {
    return {
      key: 'posture',
      label: 'Decision posture',
      value: 'Hold',
      detail: 'No lead action is currently strong enough to advance the case.',
      tone: 'critical',
    };
  }

  if (
    input.confidenceLevel === 'low' ||
    input.missingDataCount >= 3 ||
    input.attentionCount >= 4
  ) {
    return {
      key: 'posture',
      label: 'Decision posture',
      value: 'Investigate',
      detail:
        'The run points to a direction, but uncertainty and open blockers still dominate execution risk.',
      tone: 'critical',
    };
  }

  if (
    input.confidenceLevel === 'medium' ||
    input.defaultsCount >= 3 ||
    input.attentionCount >= 2
  ) {
    return {
      key: 'posture',
      label: 'Decision posture',
      value: 'Stabilize',
      detail:
        'The recommendation is usable, but the next move should focus on tightening validation debt before scale-up.',
      tone: 'warning',
    };
  }

  return {
    key: 'posture',
    label: 'Decision posture',
    value: 'Advance',
    detail:
      'The lead action is supported strongly enough to move into the next implementation phase with limited friction.',
    tone: 'success',
  };
}

function buildReadinessCard(input: {
  confidenceLevel: ConfidenceLevel;
  typedEvidenceCount: number;
  missingDataCount: number;
  attentionCount: number;
  defaultsCount: number;
  simulationStatus: SimulationEnrichment['status'] | 'unavailable';
}): DecisionHeroCard {
  const base =
    input.confidenceLevel === 'high'
      ? 82
      : input.confidenceLevel === 'medium'
        ? 64
        : 44;
  const evidenceBoost = Math.min(input.typedEvidenceCount * 4, 12);
  const modelBoost = input.simulationStatus === 'completed' ? 4 : 0;
  const penalty = Math.min(
    input.missingDataCount * 6 +
      input.attentionCount * 5 +
      input.defaultsCount * 2,
    42,
  );
  const score = clampNumber(
    base + evidenceBoost + modelBoost - penalty,
    12,
    96,
  );

  let detail = 'The current run can move forward with targeted validation.';
  let tone: WorkbenchTone = 'warning';

  if (score >= 80) {
    detail =
      'The case is ready for the next execution phase without major structural blockers.';
    tone = 'success';
  } else if (score < 60) {
    detail =
      'Additional evidence or operating anchors should be collected before committing to execution.';
    tone = 'critical';
  }

  return {
    key: 'readiness',
    label: 'Delivery readiness',
    value: `${score}%`,
    detail,
    tone,
  };
}

function buildUncertaintyCard(input: {
  confidenceLevel: ConfidenceLevel;
  sensitivityLevel?: 'low' | 'medium' | 'high';
  nextTests: string[];
  provenanceNotes: string[];
}): DecisionHeroCard {
  const sensitivity = formatToken(input.sensitivityLevel ?? 'medium');
  const note =
    firstNonEmpty([
      input.provenanceNotes[0],
      input.nextTests[0] ? `Next test: ${input.nextTests[0]}` : null,
    ]) ?? 'No explicit confidence driver was captured for this run.';

  return {
    key: 'uncertainty',
    label: 'Uncertainty frame',
    value: `${formatToken(input.confidenceLevel)} confidence`,
    detail: `${sensitivity} sensitivity. ${note}`,
    tone: input.confidenceLevel === 'high' ? 'accent' : 'warning',
  };
}

function buildGapCard(input: {
  missingData: string[];
  attentionItems: DecisionAttentionItem[];
  defaultsCount: number;
}): DecisionHeroCard {
  const detail =
    firstNonEmpty([input.missingData[0], input.attentionItems[0]?.finding]) ??
    'No blocking gap is currently recorded.';
  const blockerCount = input.missingData.length + input.attentionItems.length;

  return {
    key: 'gaps',
    label: 'Critical gap',
    value:
      blockerCount > 0
        ? toCountLabel(blockerCount, 'open blocker')
        : 'No blocking gap',
    detail:
      blockerCount > 0
        ? `${detail} ${input.defaultsCount > 0 ? `Defaults still in play: ${input.defaultsCount}.` : ''}`.trim()
        : 'Defaults and missing-data flags are currently contained.',
    tone: blockerCount > 0 ? 'critical' : 'success',
  };
}

function buildOperatingEnvelopeValue(evaluation: EvaluationResponse): string {
  const operation = evaluation.normalized_case.feed_and_operation;
  const tokens = [
    typeof operation.temperature_c === 'number'
      ? formatScalarValue(operation.temperature_c, 'degC')
      : null,
    typeof operation.pH === 'number'
      ? `pH ${formatScalarValue(operation.pH, null)}`
      : null,
    typeof operation.conductivity_ms_per_cm === 'number'
      ? formatScalarValue(operation.conductivity_ms_per_cm, 'mS/cm')
      : null,
  ].filter((entry): entry is string => Boolean(entry));

  return tokens.length > 0
    ? tokens.join(' · ')
    : 'Operating envelope still sparse';
}

function buildOperatingEnvelopeDetail(evaluation: EvaluationResponse): string {
  const operation = evaluation.normalized_case.feed_and_operation;
  const detail = firstNonEmpty([
    operation.influent_type,
    typeof operation.hydraulic_retention_time_h === 'number'
      ? `Hydraulic retention time ${formatScalarValue(
          operation.hydraulic_retention_time_h,
          'h',
        )}`
      : null,
  ]);

  return (
    detail ??
    'Influent type and retention-time posture are not fully described.'
  );
}

function attentionTone(severity?: string): WorkbenchTone {
  if (severity === 'high') {
    return 'critical';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'accent';
}

export function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function formatScalarValue(
  value: unknown,
  unit?: string | null,
): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rendered = Number.isInteger(value) ? String(value) : value.toFixed(2);
    return unit ? `${rendered} ${unit}` : rendered;
  }

  if (typeof value === 'string' && value.trim()) {
    return unit ? `${value} ${unit}` : value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return 'Unavailable';
}

export function formatMetricValue(
  value: number | null,
  unit?: string | null,
): string {
  if (value === null || !Number.isFinite(value)) {
    return 'Unavailable';
  }

  const rendered = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${rendered} ${unit}` : rendered;
}

export function confidenceBadgeTone(
  level: ConfidenceLevel,
): 'success' | 'warning' | 'critical' {
  switch (level) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    default:
      return 'critical';
  }
}

export function sourceKindTone(
  kind: SignalSourceKind,
): 'success' | 'warning' | 'accent' | 'critical' | 'muted' {
  switch (kind) {
    case 'measured':
      return 'success';
    case 'modeled':
      return 'accent';
    case 'inferred':
      return 'warning';
    default:
      return 'muted';
  }
}

export function evidenceSourceKind(record: EvidenceRecord): SignalSourceKind {
  switch (record.evidence_type) {
    case 'internal_benchmark':
      return 'measured';
    case 'literature_evidence':
    case 'supplier_claim':
    case 'engineering_assumption':
    case 'derived_heuristic':
      return 'inferred';
    default:
      return 'unavailable';
  }
}

export function scorePercent(score: number | undefined): string {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  return `${safeScore}%`;
}

export function sortByNewest<T extends { created_at: string }>(
  items: T[],
): T[] {
  return [...items].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

export function extractDerivedObservation(
  simulationEnrichment: SimulationEnrichment | undefined,
  key: string,
): DerivedObservation | undefined {
  return simulationEnrichment?.derived_observations.find(
    (observation) => observation.key === key,
  );
}

export function resolveMetricDisplay(
  evaluation: EvaluationResponse,
  key: string,
): MetricDisplayRecord {
  const definition = coreMetricDefinitions.find((metric) => metric.key === key);
  const measuredValue = evaluation.normalized_case.measured_metrics[key];
  const derivedObservation = extractDerivedObservation(
    evaluation.simulation_enrichment,
    key,
  );

  if (typeof measuredValue === 'number' && Number.isFinite(measuredValue)) {
    return {
      key,
      label: definition?.label ?? formatToken(key),
      value: formatMetricValue(measuredValue, definition?.unit),
      numericValue: measuredValue,
      unit: definition?.unit ?? null,
      sourceKind: 'measured',
      note: 'Observed directly from the current case inputs.',
    };
  }

  if (
    derivedObservation &&
    typeof derivedObservation.value === 'number' &&
    Number.isFinite(derivedObservation.value)
  ) {
    return {
      key,
      label: definition?.label ?? derivedObservation.label,
      value: formatMetricValue(
        derivedObservation.value,
        derivedObservation.unit,
      ),
      numericValue: derivedObservation.value,
      unit: derivedObservation.unit ?? definition?.unit ?? null,
      sourceKind: derivedObservation.source_kind,
      note: derivedObservation.provenance_note,
    };
  }

  return {
    key,
    label: definition?.label ?? formatToken(key),
    value: 'Unavailable',
    numericValue: null,
    unit: definition?.unit ?? null,
    sourceKind: 'unavailable',
    note: 'No measured or modeled value is available for this signal.',
  };
}

export function buildMetricSeries(values: Array<number | null>): number[] {
  return values.map((value) => value ?? 0);
}

export function buildHistorySignalSeries(
  history: CaseHistoryResponse | undefined,
): {
  confidence: number[];
  modeling: number[];
} {
  if (!history) {
    return {
      confidence: [],
      modeling: [],
    };
  }

  return {
    confidence: history.evaluations.map((entry) => {
      switch (entry.confidence_level) {
        case 'high':
          return 90;
        case 'medium':
          return 60;
        default:
          return 30;
      }
    }),
    modeling: history.evaluations.map((entry) => {
      switch (entry.simulation_summary?.status) {
        case 'completed':
          return 100;
        case 'insufficient_data':
          return 45;
        case 'failed':
          return 20;
        case 'disabled':
          return 0;
        default:
          return 10;
      }
    }),
  };
}

export function latestSimulationStatus(
  evaluation: EvaluationResponse,
): SimulationEnrichment['status'] | 'unavailable' {
  return evaluation.simulation_enrichment?.status ?? 'unavailable';
}

export function buildDecisionWorkspaceOverview(
  evaluation: EvaluationResponse,
): DecisionWorkspaceOverview {
  const decisionOutput = evaluation.decision_output;
  const confidenceSummary = decisionOutput.confidence_and_uncertainty_summary;
  const diagnosis = decisionOutput.current_stack_diagnosis;
  const typedEvidence = evaluation.audit_record.typed_evidence;
  const missingData =
    decisionOutput.assumptions_and_defaults_audit.missing_data;
  const defaultsUsed =
    decisionOutput.assumptions_and_defaults_audit.defaults_used;
  const assumptions = decisionOutput.assumptions_and_defaults_audit.assumptions;
  const topRecommendation = decisionOutput.prioritized_improvement_options[0];
  const attentionItems: DecisionAttentionItem[] = diagnosis.block_findings
    .filter((finding) => finding.status !== 'documented')
    .map((finding) => ({
      key: `${finding.block}-${finding.finding}`,
      block: formatToken(finding.block),
      finding: finding.finding,
      severity: formatToken(finding.severity ?? finding.status),
      tone: attentionTone(finding.severity),
    }));
  const simulationStatus = latestSimulationStatus(evaluation);
  const evidenceProfile =
    evaluation.normalized_case.cross_cutting_layers.evidence_and_provenance
      .evidence_profile;
  const supplierClaimFraction =
    evaluation.normalized_case.cross_cutting_layers.evidence_and_provenance
      .supplier_claim_fraction;

  const heroCards = [
    buildPostureCard({
      confidenceLevel: confidenceSummary.confidence_level,
      missingDataCount: missingData.length,
      attentionCount: attentionItems.length,
      defaultsCount: defaultsUsed.length,
      hasLeadAction: Boolean(topRecommendation),
    }),
    buildReadinessCard({
      confidenceLevel: confidenceSummary.confidence_level,
      typedEvidenceCount: typedEvidence.length,
      missingDataCount: missingData.length,
      attentionCount: attentionItems.length,
      defaultsCount: defaultsUsed.length,
      simulationStatus,
    }),
    buildUncertaintyCard({
      confidenceLevel: confidenceSummary.confidence_level,
      sensitivityLevel: confidenceSummary.sensitivity_level,
      nextTests: confidenceSummary.next_tests,
      provenanceNotes: confidenceSummary.provenance_notes,
    }),
    buildGapCard({
      missingData,
      attentionItems,
      defaultsCount: defaultsUsed.length,
    }),
  ];

  const briefCards: DecisionBriefCard[] = [
    {
      key: 'context',
      label: 'Run context',
      value: evaluation.case_id,
      detail: `${formatToken(evaluation.normalized_case.technology_family)} · ${formatToken(
        evaluation.normalized_case.primary_objective,
      )} · ${evaluation.normalized_case.architecture_family}`,
    },
    {
      key: 'operating',
      label: 'Operating envelope',
      value: buildOperatingEnvelopeValue(evaluation),
      detail: buildOperatingEnvelopeDetail(evaluation),
    },
    {
      key: 'evidence',
      label: 'Evidence posture',
      value: `${toCountLabel(typedEvidence.length, 'typed record')}`,
      detail: `${formatToken(evidenceProfile)} profile · ${formatToken(
        supplierClaimFraction,
      )} supplier-claim share · model ${formatToken(simulationStatus)}`,
    },
    {
      key: 'traceability',
      label: 'Traceability',
      value: `${toCountLabel(assumptions.length, 'assumption')}`,
      detail: `${toCountLabel(defaultsUsed.length, 'default')} · ${toCountLabel(
        missingData.length,
        'missing-data flag',
      )}`,
    },
  ];

  const leadAction: DecisionLeadActionModel = topRecommendation
    ? {
        title: formatToken(topRecommendation.recommendation_id),
        phase: topRecommendation.phase_assignment ?? 'Unassigned',
        scoreLabel:
          topRecommendation.priority_score !== undefined
            ? `${Math.round(topRecommendation.priority_score)} priority`
            : 'Priority not scored',
        confidenceLabel: formatToken(topRecommendation.confidence_level),
        effortLabel: formatToken(topRecommendation.implementation_effort),
        benefitLabel: topRecommendation.expected_benefit,
        rationale: topRecommendation.rationale,
        blockers: topRecommendation.missing_data_dependencies,
        measurementRequests: topRecommendation.measurement_requests ?? [],
        supplierCandidates: topRecommendation.supplier_candidates ?? [],
      }
    : {
        title: 'No lead action available',
        phase: 'Hold',
        scoreLabel: 'No priority score',
        confidenceLabel: formatToken(confidenceSummary.confidence_level),
        effortLabel: 'Not defined',
        benefitLabel: 'Decision quality needs further validation.',
        rationale:
          'The deterministic evaluation did not surface a recommendation strong enough to prioritize without additional evidence or operating anchors.',
        blockers: missingData.slice(0, 3),
        measurementRequests: confidenceSummary.next_tests,
        supplierCandidates: [],
      };

  const roadmap = decisionOutput.phased_roadmap.map((entry) => ({
    phase: entry.phase,
    title: entry.title,
    detail:
      entry.actions[0] ??
      'No concrete action has been assigned to this phase yet.',
    actionCount: entry.actions.length,
  }));

  const impactMap = [...decisionOutput.impact_map]
    .sort(
      (left, right) => (right.priority_score ?? 0) - (left.priority_score ?? 0),
    )
    .slice(0, 4)
    .map((entry) => ({
      key: entry.option,
      title: formatToken(entry.option),
      impact: entry.technical_impact,
      economic: entry.economic_plausibility,
      readiness: entry.maturity_or_readiness,
      scoreLabel:
        entry.priority_score !== undefined
          ? `${Math.round(entry.priority_score)} priority`
          : 'Priority n/a',
    }));

  return {
    heroCards,
    briefCards,
    attentionItems,
    leadAction,
    roadmap,
    impactMap,
  };
}
