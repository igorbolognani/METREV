import type {
  CaseHistoryResponse,
  CaseHistoryWorkspaceResponse,
  ConfidenceLevel,
  DashboardWorkspaceResponse,
  EvidenceExplorerAssistantResponse,
  EvidenceExplorerWorkspaceResponse,
  EvaluationComparisonResponse,
  EvaluationListResponse,
  EvaluationResponse,
  EvaluationSummary,
  EvaluationWorkspaceResponse,
  EvidenceRecord,
  EvidenceReviewWorkspaceResponse,
  ExportCsvResponseMetadata,
  ExternalEvidenceCatalogListResponse,
  NarrativeMetadata,
  PrintableEvaluationReportResponse,
  RuntimeVersion,
  SignalSourceKind,
  SimulationEnrichment,
  TraceabilitySummary,
  WorkspaceAttentionItem,
  WorkspaceBriefCard,
  WorkspaceHeroCard,
  WorkspaceImpactItem,
  WorkspaceLeadAction,
  WorkspaceMetricRecord,
  WorkspaceRoadmapItem,
  WorkspaceTone,
} from '@metrev/domain-contracts';
import {
  caseHistoryWorkspaceResponseSchema,
  dashboardWorkspaceResponseSchema,
  evidenceExplorerAssistantResponseSchema,
  evidenceExplorerWorkspaceResponseSchema,
  evaluationComparisonResponseSchema,
  evaluationWorkspaceResponseSchema,
  evidenceReviewWorkspaceResponseSchema,
  exportCsvResponseMetadataSchema,
  loadContractCompatibilityDefinition,
  loadContractDefaultsPolicy,
  loadContractDiagnosticsDefinition,
  loadContractImprovementsDefinition,
  loadContractOutputDefinition,
  loadContractScoringModel,
  loadContractSensitivityPolicy,
  loadContractStackOntology,
  printableEvaluationReportResponseSchema,
} from '@metrev/domain-contracts';

const WORKSPACE_SCHEMA_VERSION = '014.0.0';

const coreMetricDefinitions = [
  {
    key: 'current_density_a_m2',
    label: 'Current density',
    unit: 'A/m2',
  },
  {
    key: 'power_density_w_m2',
    label: 'Power density',
    unit: 'W/m2',
  },
  {
    key: 'internal_resistance_ohm',
    label: 'Internal resistance',
    unit: 'ohm',
  },
  {
    key: 'cod_removal_pct',
    label: 'COD removal',
    unit: '%',
  },
  {
    key: 'nitrogen_recovery_proxy_pct',
    label: 'Nitrogen recovery proxy',
    unit: '%',
  },
  {
    key: 'hydrogen_recovery_proxy_rate',
    label: 'Hydrogen recovery proxy',
    unit: 'kgH2/m3/d',
  },
] as const;

let cachedCanonicalVersions:
  | Pick<
      RuntimeVersion,
      'contract_version' | 'ontology_version' | 'ruleset_version'
    >
  | undefined;

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value))),
  ];
}

function collapseVersions(values: Array<string | undefined>): string {
  const unique = uniqueStrings(values);

  if (unique.length === 0) {
    return 'unknown';
  }

  if (unique.length === 1) {
    return unique[0];
  }

  return `mixed(${unique.join(',')})`;
}

function getCanonicalVersions(): Pick<
  RuntimeVersion,
  'contract_version' | 'ontology_version' | 'ruleset_version'
> {
  if (cachedCanonicalVersions) {
    return cachedCanonicalVersions;
  }

  cachedCanonicalVersions = {
    contract_version: String(
      loadContractOutputDefinition().version ?? 'unknown',
    ),
    ontology_version: String(loadContractStackOntology().version ?? 'unknown'),
    ruleset_version: collapseVersions([
      String(loadContractDefaultsPolicy().version ?? 'unknown'),
      String(loadContractCompatibilityDefinition().version ?? 'unknown'),
      String(loadContractDiagnosticsDefinition().version ?? 'unknown'),
      String(loadContractImprovementsDefinition().version ?? 'unknown'),
      String(loadContractScoringModel().version ?? 'unknown'),
      String(loadContractSensitivityPolicy().version ?? 'unknown'),
    ]),
  };

  return cachedCanonicalVersions;
}

export function buildRuntimeVersions(input: {
  promptVersion: string;
  modelVersion?: string | null;
}): RuntimeVersion {
  const versions = getCanonicalVersions();

  return {
    ...versions,
    prompt_version: input.promptVersion,
    model_version: input.modelVersion?.trim() || 'not_applicable',
    workspace_schema_version: WORKSPACE_SCHEMA_VERSION,
  };
}

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatScalarValue(value: unknown, unit?: string | null): string {
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

function formatMetricValue(value: number | null, unit?: string | null): string {
  if (value === null || !Number.isFinite(value)) {
    return 'Unavailable';
  }

  const rendered = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return unit ? `${rendered} ${unit}` : rendered;
}

function toCountLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
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

function confidenceScore(level: ConfidenceLevel): number {
  switch (level) {
    case 'high':
      return 90;
    case 'medium':
      return 60;
    default:
      return 30;
  }
}

function modelingScore(
  status: SimulationEnrichment['status'] | undefined,
): number {
  switch (status) {
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
}

function latestSimulationStatus(
  evaluation: EvaluationResponse,
): SimulationEnrichment['status'] | 'unavailable' {
  return evaluation.simulation_enrichment?.status ?? 'unavailable';
}

function scorePercent(score: number | undefined): string {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  return `${safeScore}%`;
}

function attentionTone(severity?: string): WorkspaceTone {
  if (severity === 'high') {
    return 'critical';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'accent';
}

function resolveMetricDisplay(
  evaluation: EvaluationResponse,
  key: string,
): WorkspaceMetricRecord {
  const definition = coreMetricDefinitions.find((metric) => metric.key === key);
  const measuredValue = evaluation.normalized_case.measured_metrics[key];
  const derivedObservation =
    evaluation.simulation_enrichment?.derived_observations.find(
      (observation) => observation.key === key,
    );

  if (typeof measuredValue === 'number' && Number.isFinite(measuredValue)) {
    return {
      key,
      label: definition?.label ?? formatToken(key),
      value: formatMetricValue(measuredValue, definition?.unit),
      numeric_value: measuredValue,
      unit: definition?.unit ?? null,
      source_kind: 'measured',
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
      numeric_value: derivedObservation.value,
      unit: derivedObservation.unit ?? definition?.unit ?? null,
      source_kind: derivedObservation.source_kind,
      note: derivedObservation.provenance_note,
    };
  }

  return {
    key,
    label: definition?.label ?? formatToken(key),
    value: 'Unavailable',
    numeric_value: null,
    unit: definition?.unit ?? null,
    source_kind: 'unavailable',
    note: 'No measured or modeled value is available for this signal.',
  };
}

function buildPostureCard(input: {
  confidenceLevel: ConfidenceLevel;
  missingDataCount: number;
  attentionCount: number;
  defaultsCount: number;
  hasLeadAction: boolean;
}): WorkspaceHeroCard {
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
}): WorkspaceHeroCard {
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
  const score = Math.min(
    96,
    Math.max(12, base + evidenceBoost + modelBoost - penalty),
  );

  let detail = 'The current run can move forward with targeted validation.';
  let tone: WorkspaceTone = 'warning';

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
}): WorkspaceHeroCard {
  const note =
    firstNonEmpty([
      input.provenanceNotes[0],
      input.nextTests[0] ? `Next test: ${input.nextTests[0]}` : null,
    ]) ?? 'No explicit confidence driver was captured for this run.';

  return {
    key: 'uncertainty',
    label: 'Uncertainty frame',
    value: `${formatToken(input.confidenceLevel)} confidence`,
    detail: `${formatToken(input.sensitivityLevel ?? 'medium')} sensitivity. ${note}`,
    tone: input.confidenceLevel === 'high' ? 'accent' : 'warning',
  };
}

function buildGapCard(input: {
  missingData: string[];
  attentionItems: WorkspaceAttentionItem[];
  defaultsCount: number;
}): WorkspaceHeroCard {
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

function buildEvaluationSummary(
  evaluation: EvaluationResponse,
): EvaluationSummary {
  return {
    evaluation_id: evaluation.evaluation_id,
    case_id: evaluation.case_id,
    created_at: evaluation.audit_record.timestamp,
    confidence_level:
      evaluation.decision_output.confidence_and_uncertainty_summary
        .confidence_level,
    technology_family: evaluation.normalized_case.technology_family,
    primary_objective: evaluation.normalized_case.primary_objective,
    summary: evaluation.decision_output.current_stack_diagnosis.summary,
    narrative_available: Boolean(evaluation.narrative),
    simulation_summary: evaluation.simulation_enrichment
      ? {
          status: evaluation.simulation_enrichment.status,
          model_version: evaluation.simulation_enrichment.model_version,
          confidence_level: evaluation.simulation_enrichment.confidence.level,
          derived_observation_count:
            evaluation.simulation_enrichment.derived_observations.length,
          has_series: evaluation.simulation_enrichment.series.length > 0,
        }
      : undefined,
  };
}

function buildEvaluationOverview(evaluation: EvaluationResponse): {
  heroCards: WorkspaceHeroCard[];
  briefCards: WorkspaceBriefCard[];
  attentionItems: WorkspaceAttentionItem[];
  leadAction: WorkspaceLeadAction;
  roadmap: WorkspaceRoadmapItem[];
  impactMap: WorkspaceImpactItem[];
  keyMetrics: WorkspaceMetricRecord[];
} {
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
  const attentionItems: WorkspaceAttentionItem[] = diagnosis.block_findings
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

  const briefCards: WorkspaceBriefCard[] = [
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

  const leadAction: WorkspaceLeadAction = topRecommendation
    ? {
        title: formatToken(topRecommendation.recommendation_id),
        phase: topRecommendation.phase_assignment ?? 'Unassigned',
        score_label:
          topRecommendation.priority_score !== undefined
            ? `${Math.round(topRecommendation.priority_score)} priority`
            : 'Priority not scored',
        confidence_label: formatToken(topRecommendation.confidence_level),
        effort_label: formatToken(topRecommendation.implementation_effort),
        benefit_label: topRecommendation.expected_benefit,
        rationale: topRecommendation.rationale,
        blockers: topRecommendation.missing_data_dependencies,
        measurement_requests: topRecommendation.measurement_requests ?? [],
        supplier_candidates: topRecommendation.supplier_candidates ?? [],
      }
    : {
        title: 'No lead action available',
        phase: 'Hold',
        score_label: 'No priority score',
        confidence_label: formatToken(confidenceSummary.confidence_level),
        effort_label: 'Not defined',
        benefit_label: 'Decision quality needs further validation.',
        rationale:
          'The deterministic evaluation did not surface a recommendation strong enough to prioritize without additional evidence or operating anchors.',
        blockers: missingData.slice(0, 3),
        measurement_requests: confidenceSummary.next_tests,
        supplier_candidates: [],
      };

  const roadmap: WorkspaceRoadmapItem[] = decisionOutput.phased_roadmap.map(
    (entry) => ({
      phase: entry.phase,
      title: entry.title,
      detail:
        entry.actions[0] ??
        'No concrete action has been assigned to this phase yet.',
      action_count: entry.actions.length,
    }),
  );

  const impactMap: WorkspaceImpactItem[] = [...decisionOutput.impact_map]
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
      score_label:
        entry.priority_score !== undefined
          ? `${Math.round(entry.priority_score)} priority`
          : 'Priority n/a',
    }));

  const keyMetrics = coreMetricDefinitions.map((metric) =>
    resolveMetricDisplay(evaluation, metric.key),
  );

  return {
    heroCards,
    briefCards,
    attentionItems,
    leadAction,
    roadmap,
    impactMap,
    keyMetrics,
  };
}

function createMeta(input: {
  versions: RuntimeVersion;
  traceability: TraceabilitySummary;
}) {
  return {
    generated_at: new Date().toISOString(),
    versions: input.versions,
    traceability: input.traceability,
  };
}

function buildDashboardTraceability(
  evaluationList: EvaluationListResponse,
  evidenceCatalog: ExternalEvidenceCatalogListResponse,
): TraceabilitySummary {
  return {
    subject_type: 'workspace',
    subject_id: 'dashboard',
    entrypoint: 'api',
    transformation_stages: [
      'evaluation_list',
      'evidence_backlog',
      'dashboard_workspace_presenter',
    ],
    rule_refs: [],
    evidence_refs: evidenceCatalog.items.map((item) => item.id),
    defaults_count: 0,
    missing_data_count: 0,
    evidence_count: evidenceCatalog.items.length,
    case_id: evaluationList.items[0]?.case_id,
    evaluation_id: evaluationList.items[0]?.evaluation_id,
  };
}

export function buildDashboardWorkspace(input: {
  evaluationList: EvaluationListResponse;
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
  versions: RuntimeVersion;
}): DashboardWorkspaceResponse {
  const items = input.evaluationList.items;
  const latestEvaluation = items[0] ?? null;
  const totalCases = new Set(items.map((item) => item.case_id)).size;
  const highConfidenceRuns = items.filter(
    (item) => item.confidence_level === 'high',
  ).length;
  const modeledRuns = items.filter(
    (item) => item.simulation_summary?.status === 'completed',
  ).length;

  return dashboardWorkspaceResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: buildDashboardTraceability(
        input.evaluationList,
        input.evidenceCatalog,
      ),
    }),
    summary: {
      total_runs: items.length,
      total_cases: totalCases,
      high_confidence_runs: highConfidenceRuns,
      modeled_runs: modeledRuns,
      pending_evidence: input.evidenceCatalog.summary.pending,
      accepted_evidence: input.evidenceCatalog.summary.accepted,
      rejected_evidence: input.evidenceCatalog.summary.rejected,
    },
    hero: {
      title: 'Bioelectrochemical decision workspace',
      subtitle:
        'Deterministic evaluation, evidence review, case history, and reporting now share one operational surface.',
      latest_case_id: latestEvaluation?.case_id ?? null,
      latest_summary: latestEvaluation?.summary ?? null,
    },
    trends: {
      run_growth: [...items]
        .slice(0, 6)
        .reverse()
        .map((_, index) => index + 1),
      confidence: [...items]
        .slice(0, 6)
        .reverse()
        .map((item) => confidenceScore(item.confidence_level)),
      model_coverage: [...items]
        .slice(0, 6)
        .reverse()
        .map((item) => modelingScore(item.simulation_summary?.status)),
    },
    quick_actions: {
      new_evaluation_href: '/cases/new',
      evidence_review_href: '/evidence/review',
      latest_evaluation_href: latestEvaluation
        ? `/evaluations/${latestEvaluation.evaluation_id}`
        : null,
      latest_case_history_href: latestEvaluation
        ? `/cases/${latestEvaluation.case_id}/history`
        : null,
    },
    recent_runs: items.slice(0, 6),
    evidence_backlog: input.evidenceCatalog.items.slice(0, 6),
  });
}

export function buildEvaluationWorkspace(input: {
  evaluation: EvaluationResponse;
  history?: CaseHistoryResponse | null;
  versions: RuntimeVersion;
}): EvaluationWorkspaceResponse {
  const historyEvaluations =
    input.history?.evaluations
      .slice()
      .sort((left, right) => right.created_at.localeCompare(left.created_at)) ??
    [];
  const compareCandidates = historyEvaluations.filter(
    (item) => item.evaluation_id !== input.evaluation.evaluation_id,
  );
  const defaultCompareTargetId = compareCandidates[0]?.evaluation_id ?? null;
  const overview = buildEvaluationOverview(input.evaluation);

  return evaluationWorkspaceResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        ...input.evaluation.audit_record.traceability,
        subject_type: 'workspace',
        subject_id: 'evaluation-workspace',
        evaluation_id: input.evaluation.evaluation_id,
      },
    }),
    evaluation: input.evaluation,
    history_summary: {
      total_runs: historyEvaluations.length || 1,
      latest_case_history_href: `/cases/${input.evaluation.case_id}/history`,
      default_compare_target_id: defaultCompareTargetId,
      compare_candidates: compareCandidates,
    },
    overview: {
      title: `${input.evaluation.case_id} decision workspace`,
      subtitle:
        input.evaluation.decision_output.current_stack_diagnosis.summary,
      hero_cards: overview.heroCards,
      brief_cards: overview.briefCards,
      attention_items: overview.attentionItems,
      lead_action: overview.leadAction,
      key_metrics: overview.keyMetrics,
      roadmap: overview.roadmap,
      impact_map: overview.impactMap,
    },
    links: {
      history_href: `/cases/${input.evaluation.case_id}/history`,
      compare_href: defaultCompareTargetId
        ? `/evaluations/${input.evaluation.evaluation_id}/compare/${defaultCompareTargetId}`
        : null,
      report_href: `/evaluations/${input.evaluation.evaluation_id}/report`,
      export_json_href: `/api/exports/evaluations/${input.evaluation.evaluation_id}/json`,
      export_csv_href: `/api/exports/evaluations/${input.evaluation.evaluation_id}/csv`,
    },
  });
}

function summarizeHistoryDelta(input: {
  current: EvaluationSummary;
  previous?: EvaluationSummary;
}): string {
  if (!input.previous) {
    return 'Initial saved run for this case.';
  }

  const confidenceChanged =
    input.current.confidence_level !== input.previous.confidence_level
      ? `Confidence moved from ${formatToken(input.previous.confidence_level)} to ${formatToken(input.current.confidence_level)}.`
      : `Confidence stayed ${formatToken(input.current.confidence_level)}.`;

  const modelChanged =
    input.current.simulation_summary?.status !==
    input.previous.simulation_summary?.status
      ? `Model status moved from ${formatToken(
          input.previous.simulation_summary?.status ?? 'unavailable',
        )} to ${formatToken(
          input.current.simulation_summary?.status ?? 'unavailable',
        )}.`
      : `Model status stayed ${formatToken(
          input.current.simulation_summary?.status ?? 'unavailable',
        )}.`;

  return `${confidenceChanged} ${modelChanged}`;
}

function buildEvaluationLineage(
  evaluation:
    | Pick<
        EvaluationResponse,
        'source_usages' | 'claim_usages' | 'workspace_snapshots'
      >
    | null
    | undefined,
) {
  return {
    source_usages: evaluation?.source_usages ?? [],
    claim_usages: evaluation?.claim_usages ?? [],
    workspace_snapshots: evaluation?.workspace_snapshots ?? [],
  };
}

export function buildCaseHistoryWorkspace(input: {
  history: CaseHistoryResponse;
  versions: RuntimeVersion;
  currentEvaluationId?: string | null;
  currentEvaluation?: EvaluationResponse | null;
}): CaseHistoryWorkspaceResponse {
  const evaluations = input.history.evaluations
    .slice()
    .sort((left, right) => right.created_at.localeCompare(left.created_at));

  return caseHistoryWorkspaceResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        subject_type: 'case',
        subject_id: input.history.case.case_id,
        case_id: input.history.case.case_id,
        evaluation_id:
          input.currentEvaluationId ?? evaluations[0]?.evaluation_id,
        entrypoint: 'api',
        transformation_stages: [
          'case_history_query',
          'history_workspace_presenter',
        ],
        rule_refs: [],
        evidence_refs: input.history.evidence_records.map(
          (record) => record.evidence_id,
        ),
        defaults_count: input.history.case.defaults_used.length,
        missing_data_count: input.history.case.missing_data.length,
        evidence_count: input.history.evidence_records.length,
      },
    }),
    case: input.history.case,
    timeline: evaluations.map((evaluation, index) => ({
      evaluation,
      delta_summary: summarizeHistoryDelta({
        current: evaluation,
        previous: evaluations[index + 1],
      }),
      compare_href: evaluations[index + 1]
        ? `/evaluations/${evaluation.evaluation_id}/compare/${evaluations[index + 1].evaluation_id}`
        : null,
      is_latest: index === 0,
    })),
    evidence_records: input.history.evidence_records,
    audit_events: input.history.audit_events
      .slice()
      .sort((left, right) => right.created_at.localeCompare(left.created_at)),
    current_evaluation_id:
      input.currentEvaluationId ?? evaluations[0]?.evaluation_id ?? null,
    current_evaluation_lineage: buildEvaluationLineage(input.currentEvaluation),
  });
}

function summarizeMetricDelta(input: {
  current: WorkspaceMetricRecord;
  baseline: WorkspaceMetricRecord;
}): {
  deltaLabel: string;
  direction: 'improved' | 'declined' | 'steady' | 'unknown';
} {
  if (
    input.current.numeric_value === null ||
    input.baseline.numeric_value === null
  ) {
    return {
      deltaLabel: 'No comparable numeric delta',
      direction: 'unknown',
    };
  }

  const delta = input.current.numeric_value - input.baseline.numeric_value;
  if (Math.abs(delta) < 0.001) {
    return {
      deltaLabel: 'No material change',
      direction: 'steady',
    };
  }

  const sign = delta > 0 ? '+' : '';
  return {
    deltaLabel: `${sign}${delta.toFixed(1)} ${input.current.unit ?? ''}`.trim(),
    direction: delta > 0 ? 'improved' : 'declined',
  };
}

function recommendationSummaryMap(evaluation: EvaluationResponse) {
  return new Map(
    evaluation.decision_output.prioritized_improvement_options.map(
      (recommendation, index) => [
        recommendation.recommendation_id,
        {
          rank: index + 1,
          recommendation,
        },
      ],
    ),
  );
}

function confidenceChangeLabel(
  current: EvaluationResponse,
  baseline: EvaluationResponse,
): string {
  const from =
    baseline.decision_output.confidence_and_uncertainty_summary
      .confidence_level;
  const to =
    current.decision_output.confidence_and_uncertainty_summary.confidence_level;

  if (from === to) {
    return `Confidence remained ${formatToken(to)}.`;
  }

  return `Confidence moved from ${formatToken(from)} to ${formatToken(to)}.`;
}

export function buildEvaluationComparison(input: {
  current: EvaluationResponse;
  baseline: EvaluationResponse;
  versions: RuntimeVersion;
}): EvaluationComparisonResponse {
  const currentMetrics = new Map(
    coreMetricDefinitions.map((metric) => [
      metric.key,
      resolveMetricDisplay(input.current, metric.key),
    ]),
  );
  const baselineMetrics = new Map(
    coreMetricDefinitions.map((metric) => [
      metric.key,
      resolveMetricDisplay(input.baseline, metric.key),
    ]),
  );
  const currentRecommendations = recommendationSummaryMap(input.current);
  const baselineRecommendations = recommendationSummaryMap(input.baseline);
  const recommendationIds = uniqueStrings([
    ...currentRecommendations.keys(),
    ...baselineRecommendations.keys(),
  ]);
  const currentSummary = buildEvaluationSummary(input.current);
  const baselineSummary = buildEvaluationSummary(input.baseline);

  return evaluationComparisonResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        ...input.current.audit_record.traceability,
        subject_type: 'workspace',
        subject_id: 'evaluation-comparison',
        evaluation_id: input.current.evaluation_id,
      },
    }),
    current_evaluation: currentSummary,
    baseline_evaluation: baselineSummary,
    conclusion: {
      summary: `Comparing ${formatTimestamp(baselineSummary.created_at)} to ${formatTimestamp(currentSummary.created_at)} for ${input.current.case_id}.`,
      confidence_change: confidenceChangeLabel(input.current, input.baseline),
      defaults_change: `${input.baseline.decision_output.assumptions_and_defaults_audit.defaults_used.length} -> ${input.current.decision_output.assumptions_and_defaults_audit.defaults_used.length} defaults in play.`,
      missing_data_change: `${input.baseline.decision_output.assumptions_and_defaults_audit.missing_data.length} -> ${input.current.decision_output.assumptions_and_defaults_audit.missing_data.length} missing-data flags.`,
      model_status_change: `Model moved from ${formatToken(
        input.baseline.simulation_enrichment?.status ?? 'unavailable',
      )} to ${formatToken(input.current.simulation_enrichment?.status ?? 'unavailable')}.`,
    },
    metric_deltas: coreMetricDefinitions.map((metric) => {
      const currentMetric = currentMetrics.get(metric.key)!;
      const baselineMetric = baselineMetrics.get(metric.key)!;
      const delta = summarizeMetricDelta({
        current: currentMetric,
        baseline: baselineMetric,
      });

      return {
        key: metric.key,
        label: metric.label,
        current_value: currentMetric.value,
        baseline_value: baselineMetric.value,
        delta_label: delta.deltaLabel,
        direction: delta.direction,
        source_kind:
          currentMetric.source_kind === 'unavailable'
            ? baselineMetric.source_kind
            : currentMetric.source_kind,
      };
    }),
    recommendation_deltas: recommendationIds.map((recommendationId) => {
      const currentRecord = currentRecommendations.get(recommendationId);
      const baselineRecord = baselineRecommendations.get(recommendationId);

      return {
        recommendation_id: recommendationId,
        current_rank: currentRecord?.rank ?? null,
        baseline_rank: baselineRecord?.rank ?? null,
        delta_label:
          currentRecord && baselineRecord
            ? `${baselineRecord.rank} -> ${currentRecord.rank}`
            : currentRecord
              ? 'New recommendation'
              : 'No longer present',
        summary:
          currentRecord?.recommendation.rationale ??
          baselineRecord?.recommendation.rationale ??
          'Recommendation rationale unavailable.',
      };
    }),
    supplier_shortlist_delta: uniqueStrings([
      ...input.current.decision_output.supplier_shortlist.map(
        (entry) => entry.category,
      ),
      ...input.baseline.decision_output.supplier_shortlist.map(
        (entry) => entry.category,
      ),
    ]).map((category) => {
      const currentCandidate =
        input.current.decision_output.supplier_shortlist.find(
          (entry) => entry.category === category,
        );
      const baselineCandidate =
        input.baseline.decision_output.supplier_shortlist.find(
          (entry) => entry.category === category,
        );

      return {
        category,
        current_candidate: currentCandidate?.candidate_path ?? null,
        baseline_candidate: baselineCandidate?.candidate_path ?? null,
        detail:
          currentCandidate?.fit_note ??
          baselineCandidate?.fit_note ??
          'No supplier fit note recorded for this category.',
      };
    }),
  });
}

export function buildEvidenceReviewWorkspace(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
  versions: RuntimeVersion;
  filters?: {
    status?: string;
    query?: string;
  };
}): EvidenceReviewWorkspaceResponse {
  return evidenceReviewWorkspaceResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        subject_type: 'workspace',
        subject_id: 'evidence-review',
        entrypoint: 'api',
        transformation_stages: [
          'external_evidence_catalog_query',
          'evidence_review_workspace_presenter',
        ],
        rule_refs: [],
        evidence_refs: input.evidenceCatalog.items.map((item) => item.id),
        defaults_count: 0,
        missing_data_count: 0,
        evidence_count: input.evidenceCatalog.items.length,
      },
    }),
    filters: {
      active_status: input.filters?.status as
        | EvidenceReviewWorkspaceResponse['filters']['active_status']
        | undefined,
      search_query: input.filters?.query?.trim() || undefined,
    },
    summary: input.evidenceCatalog.summary,
    spotlight: input.evidenceCatalog.items.slice(0, 3),
    items: input.evidenceCatalog.items,
  });
}

function _toFacetBuckets(
  items: ExternalEvidenceCatalogListResponse['items'],
  getValue: (
    item: ExternalEvidenceCatalogListResponse['items'][number],
  ) => string | null | undefined,
  getLabel: (value: string) => string,
) {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const rawValue = getValue(item)?.trim() || 'not_stated';
    const current = counts.get(rawValue);

    counts.set(rawValue, {
      count: (current?.count ?? 0) + 1,
      label: current?.label ?? getLabel(rawValue),
    });
  }

  return [...counts.entries()]
    .map(([value, entry]) => ({
      value,
      label: entry.label,
      count: entry.count,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label),
    );
}

function toPublishedAtTimestamp(value: string | null | undefined): number {
  if (!value?.trim()) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildEvidenceExplorerCsvHref(input?: {
  page?: number;
  pageSize?: number;
  query?: string;
  sourceType?: string;
  status?: string;
}) {
  const searchParams = new URLSearchParams();

  if (input?.status?.trim()) {
    searchParams.set('status', input.status.trim());
  }

  if (input?.query?.trim()) {
    searchParams.set('q', input.query.trim());
  }

  if (input?.sourceType?.trim()) {
    searchParams.set('sourceType', input.sourceType.trim());
  }

  if (input?.page) {
    searchParams.set('page', String(input.page));
  }

  if (input?.pageSize) {
    searchParams.set('pageSize', String(input.pageSize));
  }

  const queryString = searchParams.toString();
  return `/api/exports/evidence/explorer/csv${queryString ? `?${queryString}` : ''}`;
}

export function buildEvidenceExplorerWorkspace(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
  versions: RuntimeVersion;
  filters?: {
    page?: number;
    pageSize?: number;
    query?: string;
    sourceType?: string;
    status?: string;
  };
}): EvidenceExplorerWorkspaceResponse {
  const items = input.evidenceCatalog.items;
  const intakeReadyItems = items.filter(
    (item) => item.review_status === 'accepted',
  );
  const recentlyPublishedItems = [...items]
    .sort(
      (left, right) =>
        toPublishedAtTimestamp(right.published_at) -
        toPublishedAtTimestamp(left.published_at),
    )
    .slice(0, 5);

  return evidenceExplorerWorkspaceResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        subject_type: 'workspace',
        subject_id: 'evidence-explorer',
        entrypoint: 'api',
        transformation_stages: [
          'external_evidence_catalog_query',
          'evidence_explorer_workspace_presenter',
        ],
        rule_refs: [],
        evidence_refs: items.map((item) => item.id),
        defaults_count: 0,
        missing_data_count: 0,
        evidence_count: items.length,
      },
    }),
    filters: {
      active_status: input.filters?.status as
        | EvidenceExplorerWorkspaceResponse['filters']['active_status']
        | undefined,
      active_source_type: input.filters?.sourceType as
        | EvidenceExplorerWorkspaceResponse['filters']['active_source_type']
        | undefined,
      search_query: input.filters?.query?.trim() || undefined,
    },
    summary: input.evidenceCatalog.summary,
    spotlight: items.slice(0, 3),
    items,
    table_groups: {
      intake_ready: intakeReadyItems.slice(0, 5),
      recently_published: recentlyPublishedItems,
    },
    warehouse_facets: input.evidenceCatalog.warehouse_aggregate.facets,
    warehouse_snapshot: input.evidenceCatalog.warehouse_aggregate.snapshot,
    export_csv_href: buildEvidenceExplorerCsvHref(input.filters),
  });
}

function buildEvidenceExplorerAssistantProvenanceSummary(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
  citedEvidenceIds: string[];
}): string {
  const citedLabel =
    input.citedEvidenceIds.length > 0
      ? `Current-page spotlight citations: ${input.citedEvidenceIds.join(', ')}.`
      : 'No current-page spotlight citations were available for this brief.';

  return `This assistant brief uses the filtered warehouse snapshot of ${input.evidenceCatalog.warehouse_aggregate.snapshot.filtered_item_count} matching record(s) and the current returned page slice of ${input.evidenceCatalog.summary.returned} row(s). ${citedLabel} Review status, DOI presence, and linked source availability remain visible in the explorer and are not upgraded by the assistant text.`;
}

function buildEvidenceExplorerAssistantUncertaintySummary(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
}): string {
  const summary = input.evidenceCatalog.summary;
  const snapshot = input.evidenceCatalog.warehouse_aggregate.snapshot;

  if (snapshot.filtered_item_count === 0) {
    return 'No records matched the current explorer filters, so uncertainty is maximal until the search scope is widened.';
  }

  if (summary.pending > 0) {
    return `${summary.pending} matching record(s) remain pending review, and only ${snapshot.reviewed_claim_count} extracted claim(s) in the filtered warehouse currently have reviewed status. Treat this brief as exploratory until the pending review load drops.`;
  }

  if (snapshot.reviewed_claim_count === 0) {
    return 'The filtered warehouse has records, but none of their extracted claims have reviewed status yet. The brief may help triage, but it is not a substitute for analyst claim review.';
  }

  return `The filtered warehouse has ${snapshot.reviewed_claim_count} reviewed claim(s), but the assistant still only summarizes the current filter state and does not infer beyond the supplied records.`;
}

function buildEvidenceExplorerAssistantNextChecks(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
}): string[] {
  const checks: string[] = [];
  const summary = input.evidenceCatalog.summary;
  const snapshot = input.evidenceCatalog.warehouse_aggregate.snapshot;

  if (summary.pending > 0) {
    checks.push(
      'Review the pending records in this filtered warehouse before promoting them into intake-ready evidence.',
    );
  }

  if (snapshot.reviewed_claim_count === 0) {
    checks.push(
      'Add analyst review decisions to extracted claims before relying on claim-level comparisons.',
    );
  }

  if (snapshot.doi_count < snapshot.filtered_item_count) {
    checks.push(
      'Prioritize records with DOI coverage when you need citation-backed follow-up.',
    );
  }

  if (snapshot.linked_source_count < snapshot.filtered_item_count) {
    checks.push(
      'Prefer records with direct source URLs when you need fast provenance inspection from the explorer.',
    );
  }

  if (checks.length === 0) {
    checks.push(
      'Re-check the cited spotlight rows directly before turning this brief into intake or recommendation work.',
    );
  }

  return checks.slice(0, 3);
}

export function buildEvidenceExplorerAssistantResponse(input: {
  evidenceCatalog: ExternalEvidenceCatalogListResponse;
  versions: RuntimeVersion;
  narrative: string | null;
  narrativeMetadata: NarrativeMetadata;
  filters?: {
    page?: number;
    pageSize?: number;
    query?: string;
    sourceType?: string;
    status?: string;
  };
}): EvidenceExplorerAssistantResponse {
  const spotlight = input.evidenceCatalog.items.slice(0, 3);
  const citedEvidenceIds = spotlight.map((item) => item.id);

  return evidenceExplorerAssistantResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        subject_type: 'workspace',
        subject_id: 'evidence-explorer-assistant',
        entrypoint: 'api',
        transformation_stages: [
          'external_evidence_catalog_query',
          'evidence_explorer_assistant_generation',
        ],
        rule_refs: [],
        evidence_refs: citedEvidenceIds,
        defaults_count: 0,
        missing_data_count: 0,
        evidence_count:
          input.evidenceCatalog.warehouse_aggregate.snapshot
            .filtered_item_count,
      },
    }),
    filters: {
      active_status: input.filters?.status as
        | EvidenceExplorerAssistantResponse['filters']['active_status']
        | undefined,
      active_source_type: input.filters?.sourceType as
        | EvidenceExplorerAssistantResponse['filters']['active_source_type']
        | undefined,
      search_query: input.filters?.query?.trim() || undefined,
    },
    warehouse_snapshot: input.evidenceCatalog.warehouse_aggregate.snapshot,
    spotlight,
    assistant: {
      summary: input.narrative,
      narrative_metadata: input.narrativeMetadata,
      provenance_summary: buildEvidenceExplorerAssistantProvenanceSummary({
        evidenceCatalog: input.evidenceCatalog,
        citedEvidenceIds,
      }),
      uncertainty_summary: buildEvidenceExplorerAssistantUncertaintySummary({
        evidenceCatalog: input.evidenceCatalog,
      }),
      recommended_next_checks: buildEvidenceExplorerAssistantNextChecks({
        evidenceCatalog: input.evidenceCatalog,
      }),
      cited_evidence_ids: citedEvidenceIds,
    },
  });
}

export function buildPrintableEvaluationReport(input: {
  evaluation: EvaluationResponse;
  versions: RuntimeVersion;
}): PrintableEvaluationReportResponse {
  return printableEvaluationReportResponseSchema.parse({
    meta: createMeta({
      versions: input.versions,
      traceability: {
        ...input.evaluation.audit_record.traceability,
        subject_type: 'workspace',
        subject_id: 'printable-report',
        evaluation_id: input.evaluation.evaluation_id,
      },
    }),
    evaluation: buildEvaluationSummary(input.evaluation),
    evaluation_lineage: buildEvaluationLineage(input.evaluation),
    title: `${input.evaluation.case_id} consulting report`,
    subtitle:
      'Stack diagnosis, prioritized improvements, impact map, roadmap, and audit-visible assumptions.',
    sections: {
      stack_diagnosis: input.evaluation.decision_output.current_stack_diagnosis,
      prioritized_improvements:
        input.evaluation.decision_output.prioritized_improvement_options,
      impact_map: input.evaluation.decision_output.impact_map,
      supplier_shortlist: input.evaluation.decision_output.supplier_shortlist,
      phased_roadmap: input.evaluation.decision_output.phased_roadmap,
      assumptions_and_defaults_audit:
        input.evaluation.decision_output.assumptions_and_defaults_audit,
      confidence_and_uncertainty_summary:
        input.evaluation.decision_output.confidence_and_uncertainty_summary,
    },
  });
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function serializeEvaluationCsv(input: {
  evaluation: EvaluationResponse;
  versions: RuntimeVersion;
}): {
  metadata: ExportCsvResponseMetadata;
  content: string;
} {
  const rows: string[][] = [];
  const metrics = coreMetricDefinitions.map((metric) =>
    resolveMetricDisplay(input.evaluation, metric.key),
  );

  rows.push(['section', 'label', 'primary_value', 'secondary_value', 'notes']);

  for (const metric of metrics) {
    rows.push([
      'metric',
      metric.label,
      metric.value,
      formatToken(metric.source_kind),
      metric.note,
    ]);
  }

  input.evaluation.decision_output.prioritized_improvement_options.forEach(
    (recommendation, index) => {
      rows.push([
        'recommendation',
        `${index + 1}. ${formatToken(recommendation.recommendation_id)}`,
        scorePercent(recommendation.priority_score),
        recommendation.phase_assignment ?? 'Unassigned',
        [
          recommendation.rationale,
          recommendation.expected_benefit,
          `Confidence ${formatToken(recommendation.confidence_level)}`,
        ].join(' | '),
      ]);
    },
  );

  input.evaluation.decision_output.supplier_shortlist.forEach((candidate) => {
    rows.push([
      'supplier_shortlist',
      candidate.category,
      candidate.candidate_path,
      String(candidate.missing_information_before_commitment.length),
      candidate.fit_note,
    ]);
  });

  const content = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  return {
    metadata: exportCsvResponseMetadataSchema.parse({
      file_name: `${input.evaluation.case_id}-${input.evaluation.evaluation_id}.csv`,
      content_type: 'text/csv',
      generated_at: new Date().toISOString(),
      column_count: rows[0].length,
      row_count: Math.max(rows.length - 1, 0),
      versions: input.versions,
    }),
    content,
  };
}

export function serializeEvidenceExplorerCsv(input: {
  items: ExternalEvidenceCatalogListResponse['items'];
  versions: RuntimeVersion;
}): {
  metadata: ExportCsvResponseMetadata;
  content: string;
} {
  const rows: string[][] = [];

  rows.push([
    'id',
    'title',
    'review_status',
    'source_type',
    'evidence_type',
    'publisher',
    'published_at',
    'claim_count',
    'reviewed_claim_count',
    'doi',
    'source_url',
    'tags',
  ]);

  for (const item of input.items) {
    rows.push([
      item.id,
      item.title,
      item.review_status,
      item.source_type,
      item.evidence_type,
      item.publisher ?? '',
      item.published_at ?? '',
      String(item.claim_count),
      String(item.reviewed_claim_count),
      item.doi ?? '',
      item.source_url ?? '',
      item.tags.join('|'),
    ]);
  }

  const content = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  return {
    metadata: exportCsvResponseMetadataSchema.parse({
      file_name: `evidence-explorer-${new Date().toISOString().slice(0, 10)}.csv`,
      content_type: 'text/csv',
      generated_at: new Date().toISOString(),
      column_count: rows[0].length,
      row_count: Math.max(rows.length - 1, 0),
      versions: input.versions,
    }),
    content,
  };
}

export function sourceKindTone(kind: SignalSourceKind): WorkspaceTone {
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
