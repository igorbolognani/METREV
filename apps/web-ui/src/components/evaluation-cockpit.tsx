'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
  CaseHistoryResponse,
  EvaluationResponse,
} from '@metrev/domain-contracts';

import { AuditTimeline } from '@/components/workbench/audit-timeline';
import { LineChart } from '@/components/workbench/line-chart';
import { PanelTabs } from '@/components/workbench/panel-tabs';
import { RangeMeter } from '@/components/workbench/range-meter';
import { SignalBadge } from '@/components/workbench/signal-badge';
import { Sparkline } from '@/components/workbench/sparkline';
import { fetchEvaluation } from '@/lib/api';
import {
  buildDecisionWorkspaceOverview,
  buildHistorySignalSeries,
  confidenceBadgeTone,
  coreMetricDefinitions,
  evidenceSourceKind,
  formatScalarValue,
  formatTimestamp,
  formatToken,
  latestSimulationStatus,
  resolveMetricDisplay,
  scorePercent,
  sortByNewest,
} from '@/lib/evaluation-workbench';

function renderStringList(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="muted empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className="list-block">
      {items.map((entry) => (
        <li key={entry}>{entry}</li>
      ))}
    </ul>
  );
}

export function EvaluationCockpit({
  evaluationId,
  evaluation,
  history,
  historyLoading,
  historyError,
  initialTab = 'summary',
  initialComparisonEvaluationId = null,
  comparisonEvaluation,
}: {
  evaluationId: string;
  evaluation: EvaluationResponse;
  history?: CaseHistoryResponse;
  historyLoading: boolean;
  historyError?: string;
  initialTab?: 'summary' | 'evidence' | 'modeling' | 'audit';
  initialComparisonEvaluationId?: string | null;
  comparisonEvaluation?: EvaluationResponse | null;
}) {
  const decisionOutput = evaluation.decision_output;
  const confidenceSummary = decisionOutput.confidence_and_uncertainty_summary;
  const diagnosis = decisionOutput.current_stack_diagnosis;
  const recommendations = decisionOutput.prioritized_improvement_options;
  const topRecommendation = recommendations[0];
  const missingData =
    decisionOutput.assumptions_and_defaults_audit.missing_data;
  const defaultsUsed =
    decisionOutput.assumptions_and_defaults_audit.defaults_used;
  const typedEvidence = evaluation.audit_record.typed_evidence;
  const attentionFindings = diagnosis.block_findings.filter(
    (finding) => finding.status !== 'documented',
  );
  const caseHistoryEvaluations = history
    ? sortByNewest(history.evaluations)
    : [];
  const relatedEvaluations = caseHistoryEvaluations.filter(
    (item) => item.evaluation_id !== evaluationId,
  );
  const caseAuditEvents = history ? sortByNewest(history.audit_events) : [];
  const [activeCenterTab, setActiveCenterTab] = React.useState<
    'summary' | 'evidence' | 'modeling' | 'audit'
  >(initialTab);
  const [comparisonEvaluationId, setComparisonEvaluationId] = React.useState<
    string | null
  >(initialComparisonEvaluationId);
  const compareQuery = useQuery({
    queryKey: ['comparison-evaluation', comparisonEvaluationId],
    queryFn: () => fetchEvaluation(comparisonEvaluationId as string),
    enabled: Boolean(comparisonEvaluationId) && !comparisonEvaluation,
  });
  const metricCards = React.useMemo(
    () =>
      coreMetricDefinitions.map((metric) => ({
        ...metric,
        display: resolveMetricDisplay(evaluation, metric.key),
      })),
    [evaluation],
  );
  const decisionOverview = React.useMemo(
    () => buildDecisionWorkspaceOverview(evaluation),
    [evaluation],
  );
  const historySignals = buildHistorySignalSeries(history);
  const simulationStatus = latestSimulationStatus(evaluation);
  const selectedComparison = comparisonEvaluation ?? compareQuery.data;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    {
      id: 'evidence',
      label: 'Evidence',
      badge: typedEvidence.length,
    },
    {
      id: 'modeling',
      label: 'Modeling',
      badge: evaluation.simulation_enrichment?.derived_observations.length ?? 0,
    },
    {
      id: 'audit',
      label: 'Audit',
      badge: caseAuditEvents.length,
    },
  ] as const;

  const topComparisonMetrics = [
    'current_density_a_m2',
    'power_density_w_m2',
    'internal_resistance_ohm',
    'cod_removal_pct',
  ] as const;

  return (
    <div className="workbench-shell" data-testid="evaluation-workbench">
      <aside className="wb-pane wb-pane-left">
        <div className="wb-pane-header">
          <div>
            <span className="badge">Run brief</span>
            <h2>Context and traceability</h2>
          </div>
          <Link className="button secondary" href="/cases/new">
            New evaluation
          </Link>
        </div>

        <div className="wb-section-grid">
          {decisionOverview.briefCards.map((card) => (
            <article className="wb-card" key={card.key}>
              <span className="option-eyebrow">{card.label}</span>
              <strong>{card.value}</strong>
              <p className="muted">{card.detail}</p>
            </article>
          ))}

          <article className="wb-card">
            <span className="option-eyebrow">Measured metrics</span>
            <div className="wb-signal-list">
              {metricCards.map((metric) => (
                <div className="wb-signal-row" key={metric.key}>
                  <div>
                    <strong>{metric.label}</strong>
                    <p className="muted">{metric.display.note}</p>
                  </div>
                  <div className="wb-signal-meta">
                    <SignalBadge kind={metric.display.sourceKind} />
                    <span className="wb-metric-value">
                      {metric.display.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="wb-card">
            <span className="option-eyebrow">Traceability ledger</span>
            <div className="section-group">
              <h3>Defaults</h3>
              {renderStringList(
                defaultsUsed,
                'No defaults were recorded for this evaluation.',
              )}
            </div>
            <div className="section-group">
              <h3>Missing data</h3>
              {renderStringList(
                missingData,
                'No missing-data items were recorded for this evaluation.',
              )}
            </div>
          </article>

          <details className="disclosure">
            <summary>Raw intake snapshot</summary>
            <div className="disclosure-content grid">
              <pre className="wb-json-block">
                {JSON.stringify(
                  evaluation.audit_record.raw_input_snapshot,
                  null,
                  2,
                )}
              </pre>
            </div>
          </details>
        </div>
      </aside>

      <section className="wb-pane wb-pane-center">
        <section className="hero cockpit-hero wb-hero">
          <div className="stack split compact">
            <div className="section-group">
              <span className="badge">Decision workspace</span>
              <h1>{evaluation.case_id} analyst workbench</h1>
              <p className="muted">{diagnosis.summary}</p>
            </div>
            <div className="stack compact">
              <span
                className={`wb-tone-badge ${confidenceBadgeTone(confidenceSummary.confidence_level)}`}
              >
                {confidenceSummary.confidence_level} confidence
              </span>
              <span
                className={`wb-tone-badge ${simulationStatus === 'completed' ? 'accent' : simulationStatus === 'unavailable' ? 'muted' : 'warning'}`}
              >
                model {formatToken(simulationStatus)}
              </span>
            </div>
          </div>

          <div className="wb-hero-grid">
            <article className="wb-story-card wb-story-card--lead">
              <span className="option-eyebrow">Next best move</span>
              <div className="stack split compact">
                <h2>{decisionOverview.leadAction.title}</h2>
                <div className="workspace-chip-list">
                  <span className="meta-chip">
                    {decisionOverview.leadAction.phase}
                  </span>
                  <span className="meta-chip">
                    {decisionOverview.leadAction.scoreLabel}
                  </span>
                  <span className="meta-chip">
                    {decisionOverview.leadAction.confidenceLabel} confidence
                  </span>
                </div>
              </div>
              <p>{decisionOverview.leadAction.rationale}</p>
              <div className="detail-grid two-columns">
                <div className="detail-item">
                  <span className="muted">Expected benefit</span>
                  <strong>{decisionOverview.leadAction.benefitLabel}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Implementation effort</span>
                  <strong>{decisionOverview.leadAction.effortLabel}</strong>
                </div>
              </div>
              <div className="grid two">
                <div className="section-group">
                  <h4>Blocking dependencies</h4>
                  {renderStringList(
                    decisionOverview.leadAction.blockers,
                    'No explicit blocker is attached to the current lead action.',
                  )}
                </div>
                <div className="section-group">
                  <h4>Immediate tests</h4>
                  {renderStringList(
                    decisionOverview.leadAction.measurementRequests,
                    'No additional measurement request is attached to the current lead action.',
                  )}
                </div>
              </div>
              {decisionOverview.leadAction.supplierCandidates.length > 0 ? (
                <p className="muted">
                  Supplier candidates:{' '}
                  {decisionOverview.leadAction.supplierCandidates.join(', ')}
                </p>
              ) : null}
            </article>

            {decisionOverview.heroCards.map((card) => (
              <article
                className={`wb-story-card wb-story-card--${card.tone}`}
                key={card.key}
              >
                <span className="option-eyebrow">{card.label}</span>
                <strong className="wb-story-stat">{card.value}</strong>
                <p className="muted">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="cockpit-strip wb-kpi-grid">
            <article className="metric-card">
              <span className="muted">Execution phase</span>
              <strong>{decisionOverview.leadAction.phase}</strong>
              <p className="muted">{decisionOverview.leadAction.scoreLabel}</p>
            </article>
            <article className="metric-card">
              <span className="muted">Attention findings</span>
              <strong>{attentionFindings.length}</strong>
              <p className="muted">
                {diagnosis.block_findings.length} total findings
              </p>
            </article>
            <article className="metric-card">
              <span className="muted">Typed evidence</span>
              <strong>{typedEvidence.length}</strong>
              <p className="muted">
                Records carried into deterministic evaluation
              </p>
            </article>
            <article className="metric-card">
              <span className="muted">Missing data</span>
              <strong>{missingData.length}</strong>
              <p className="muted">Defaults used: {defaultsUsed.length}</p>
            </article>
            <article className="metric-card">
              <span className="muted">History depth</span>
              <strong>{caseHistoryEvaluations.length}</strong>
              <p className="muted">Stored runs for this case</p>
            </article>
            <article className="metric-card">
              <span className="muted">Model coverage</span>
              <strong>
                {evaluation.simulation_enrichment?.derived_observations
                  .length ?? 0}
              </strong>
              <p className="muted">Derived observations available</p>
            </article>
          </div>
          <PanelTabs
            activeTab={activeCenterTab}
            tabs={tabs}
            onChange={setActiveCenterTab}
            label="Evaluation workbench panels"
          />
        </section>

        <section className="wb-panel-body">
          {activeCenterTab === 'summary' ? (
            <div className="wb-section-grid">
              <section className="panel nested-panel compact-panel grid">
                <div className="stack split compact">
                  <h2>Execution focus</h2>
                  <span className="badge subtle">
                    {decisionOverview.leadAction.phase}
                  </span>
                </div>
                <div className="stack split compact">
                  <h3>{decisionOverview.leadAction.title}</h3>
                  <span className="badge subtle">
                    {decisionOverview.leadAction.confidenceLabel} confidence
                  </span>
                </div>
                <p>{decisionOverview.leadAction.rationale}</p>
                {topRecommendation ? (
                  <div className="score-track">
                    <span
                      className="score-fill"
                      style={{
                        width: scorePercent(topRecommendation.priority_score),
                      }}
                    />
                  </div>
                ) : null}
                <div className="detail-grid two-columns">
                  <div className="detail-item">
                    <span className="muted">Expected benefit</span>
                    <strong>{decisionOverview.leadAction.benefitLabel}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Implementation effort</span>
                    <strong>{decisionOverview.leadAction.effortLabel}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Priority</span>
                    <strong>{decisionOverview.leadAction.scoreLabel}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Supplier candidates</span>
                    <strong>
                      {decisionOverview.leadAction.supplierCandidates.length > 0
                        ? decisionOverview.leadAction.supplierCandidates.join(
                            ', ',
                          )
                        : 'No supplier candidate attached'}
                    </strong>
                  </div>
                </div>
                <div className="grid two">
                  <div className="section-group">
                    <h4>Blocking dependencies</h4>
                    {renderStringList(
                      decisionOverview.leadAction.blockers,
                      'No blocking dependency is attached to the current lead action.',
                    )}
                  </div>
                  <div className="section-group">
                    <h4>Measurement requests</h4>
                    {renderStringList(
                      decisionOverview.leadAction.measurementRequests,
                      'No additional measurement request is attached to the current lead action.',
                    )}
                  </div>
                </div>
              </section>

              <section className="panel nested-panel compact-panel grid">
                <div className="stack split compact">
                  <h2>Validation pressure</h2>
                  <span className="badge subtle">
                    {decisionOverview.attentionItems.length} active findings
                  </span>
                </div>
                <p>{confidenceSummary.summary}</p>
                <div className="grid two">
                  <div className="section-group">
                    <h4>Next tests</h4>
                    {renderStringList(
                      confidenceSummary.next_tests,
                      'No follow-up validation tests were recorded for this evaluation.',
                    )}
                  </div>
                  <div className="section-group">
                    <h4>Confidence drivers</h4>
                    {renderStringList(
                      confidenceSummary.provenance_notes.slice(0, 4),
                      'No explicit confidence drivers were recorded for this run.',
                    )}
                  </div>
                </div>
                {decisionOverview.attentionItems.length > 0 ? (
                  <div className="finding-board">
                    {decisionOverview.attentionItems.map((item) => (
                      <article
                        className="finding-card attention"
                        key={item.key}
                      >
                        <div className="stack split compact">
                          <h3>{item.block}</h3>
                          <span className="badge subtle">{item.severity}</span>
                        </div>
                        <p>{item.finding}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="wb-empty-panel">
                    <strong>No active blocker recorded</strong>
                    <p>
                      The deterministic run did not leave any unresolved
                      attention-level finding in the current diagnosis set.
                    </p>
                  </div>
                )}
              </section>

              <section className="panel grid">
                <div className="stack split compact">
                  <div>
                    <span className="badge">Execution path</span>
                    <h2>Phased roadmap</h2>
                  </div>
                  <span className="badge subtle">
                    {decisionOverview.roadmap.length} phases
                  </span>
                </div>
                <div className="roadmap-grid">
                  {decisionOverview.roadmap.map((step) => (
                    <article className="roadmap-card" key={step.phase}>
                      <span className="badge">{step.phase}</span>
                      <h3>{step.title}</h3>
                      <p>{step.detail}</p>
                      <p className="muted">
                        {step.actionCount > 0
                          ? `${step.actionCount} planned action${step.actionCount === 1 ? '' : 's'}`
                          : 'No concrete action is attached yet.'}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel grid">
                <div className="stack split compact">
                  <div>
                    <span className="badge">Impact map</span>
                    <h2>Priority options in context</h2>
                  </div>
                  <span className="badge subtle">
                    {decisionOverview.impactMap.length} surfaced options
                  </span>
                </div>
                <div className="lens-stack">
                  {decisionOverview.impactMap.map((entry) => (
                    <article className="lens-card" key={entry.key}>
                      <div className="stack split compact">
                        <h3>{entry.title}</h3>
                        <span className="badge subtle">{entry.scoreLabel}</span>
                      </div>
                      <p>{entry.impact}</p>
                      <div className="detail-grid two-columns">
                        <div className="detail-item">
                          <span className="muted">Economic case</span>
                          <strong>{entry.economic}</strong>
                        </div>
                        <div className="detail-item">
                          <span className="muted">Readiness</span>
                          <strong>{entry.readiness}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel grid">
                <div className="stack split compact">
                  <div>
                    <span className="badge">Target-range metrics</span>
                    <h2>Rapid operating read</h2>
                  </div>
                  <span className="badge subtle">visual-first</span>
                </div>
                <div className="wb-metric-grid">
                  {metricCards.map((metric) => (
                    <article className="wb-card" key={metric.key}>
                      <div className="stack split compact">
                        <strong>{metric.label}</strong>
                        <SignalBadge kind={metric.display.sourceKind} />
                      </div>
                      <div className="wb-metric-xl">{metric.display.value}</div>
                      <RangeMeter
                        value={metric.display.numericValue}
                        min={metric.target[0] * 0.5}
                        max={metric.target[1] * 1.4}
                        target={metric.target}
                      />
                      <p className="muted">{metric.display.note}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel grid">
                <div className="stack split compact">
                  <div>
                    <span className="badge">Recommendation matrix</span>
                    <h2>Ranked decision options</h2>
                  </div>
                  <span className="badge subtle">
                    {recommendations.length} options
                  </span>
                </div>
                <div className="option-matrix">
                  {recommendations.map((option) => (
                    <article
                      className="option-row"
                      key={option.recommendation_id}
                    >
                      <div className="stack split compact">
                        <div className="section-group">
                          <span className="option-eyebrow">
                            {option.phase_assignment ?? 'Unassigned'}
                          </span>
                          <h3>{formatToken(option.recommendation_id)}</h3>
                          <p>{option.rationale}</p>
                        </div>
                        <div className="stack compact">
                          <span className="badge subtle">
                            score {option.priority_score?.toFixed(0) ?? 'n/a'}
                          </span>
                          <span className="badge subtle">
                            {formatToken(option.confidence_level)} confidence
                          </span>
                        </div>
                      </div>
                      <div className="score-track compact-track">
                        <span
                          className="score-fill"
                          style={{ width: scorePercent(option.priority_score) }}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {activeCenterTab === 'evidence' ? (
            <div className="wb-section-grid">
              <section className="panel grid">
                <div>
                  <span className="badge">Canonical decision evidence</span>
                  <h2>Measured and inferred decision signals</h2>
                </div>
                <div className="wb-signal-list">
                  {metricCards.map((metric) => (
                    <div className="wb-signal-row" key={metric.key}>
                      <div>
                        <strong>{metric.label}</strong>
                        <p className="muted">{metric.display.note}</p>
                      </div>
                      <div className="wb-signal-meta">
                        <SignalBadge kind={metric.display.sourceKind} />
                        <span className="wb-metric-value">
                          {metric.display.value}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="wb-signal-row">
                    <div>
                      <strong>Decision summary</strong>
                      <p className="muted">
                        Canonical deterministic output synthesized by the rule
                        engine.
                      </p>
                    </div>
                    <div className="wb-signal-meta">
                      <SignalBadge kind="inferred" />
                      <span className="wb-metric-value">
                        {confidenceSummary.summary}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel grid">
                <div>
                  <span className="badge">External evidence</span>
                  <h2>Reviewed supporting records</h2>
                </div>
                {typedEvidence.length > 0 ? (
                  <div className="lens-stack">
                    {typedEvidence.map((record) => (
                      <article className="lens-card" key={record.evidence_id}>
                        <div className="stack split compact">
                          <h3>{record.title}</h3>
                          <SignalBadge kind={evidenceSourceKind(record)} />
                        </div>
                        <p>{record.summary}</p>
                        <p className="muted">
                          {formatToken(record.evidence_type)} ·{' '}
                          {formatToken(record.strength_level)} strength
                        </p>
                        <p className="muted">{record.provenance_note}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted empty-state">
                    No external or typed evidence records were attached to this
                    evaluation.
                  </p>
                )}
              </section>

              <section className="panel grid">
                <div>
                  <span className="badge">Modeled evidence</span>
                  <h2>Derived observations from the optional model layer</h2>
                </div>
                {evaluation.simulation_enrichment?.derived_observations
                  .length ? (
                  <div className="wb-signal-list">
                    {evaluation.simulation_enrichment.derived_observations.map(
                      (observation) => (
                        <div
                          className="wb-signal-row"
                          key={observation.observation_id}
                        >
                          <div>
                            <strong>{observation.label}</strong>
                            <p className="muted">
                              {observation.provenance_note}
                            </p>
                          </div>
                          <div className="wb-signal-meta">
                            <SignalBadge kind={observation.source_kind} />
                            <span className="wb-metric-value">
                              {formatScalarValue(
                                observation.value,
                                observation.unit,
                              )}
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="wb-empty-panel">
                    <strong>Modeled evidence unavailable</strong>
                    <p>
                      {evaluation.simulation_enrichment?.provenance.note ??
                        'No modeled artifact is attached to this evaluation.'}
                    </p>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeCenterTab === 'modeling' ? (
            <div className="wb-section-grid">
              <section className="panel grid">
                <div className="stack split compact">
                  <div>
                    <span className="badge">Modeling artifact</span>
                    <h2>Simulation enrichment</h2>
                  </div>
                  <span
                    className={`wb-tone-badge ${simulationStatus === 'completed' ? 'accent' : simulationStatus === 'disabled' ? 'muted' : 'warning'}`}
                  >
                    {formatToken(simulationStatus)}
                  </span>
                </div>

                {evaluation.simulation_enrichment ? (
                  <>
                    <div className="detail-grid two-columns">
                      <div className="detail-item">
                        <span className="muted">Model version</span>
                        <strong>
                          {evaluation.simulation_enrichment.model_version}
                        </strong>
                      </div>
                      <div className="detail-item">
                        <span className="muted">Confidence</span>
                        <strong>
                          {evaluation.simulation_enrichment.confidence.level} ·{' '}
                          {evaluation.simulation_enrichment.confidence.score.toFixed(
                            0,
                          )}
                        </strong>
                      </div>
                    </div>
                    <div className="section-group">
                      <h3>Assumptions</h3>
                      {renderStringList(
                        evaluation.simulation_enrichment.assumptions,
                        'No modeling assumptions were recorded.',
                      )}
                    </div>
                    <div className="section-group">
                      <h3>Confidence drivers</h3>
                      {renderStringList(
                        evaluation.simulation_enrichment.confidence.drivers,
                        'No modeling confidence drivers were recorded.',
                      )}
                    </div>
                  </>
                ) : (
                  <div className="wb-empty-panel">
                    <strong>No modeling artifact attached</strong>
                    <p>
                      The current evaluation does not expose a simulation
                      enrichment artifact.
                    </p>
                  </div>
                )}
              </section>

              <section className="panel grid">
                <div>
                  <span className="badge">Visual analytics</span>
                  <h2>Technical charts</h2>
                </div>

                {evaluation.simulation_enrichment?.status === 'completed' &&
                evaluation.simulation_enrichment.series.length > 0 ? (
                  <div className="wb-chart-grid">
                    {evaluation.simulation_enrichment.series.map((series) => (
                      <article className="wb-chart-card" key={series.series_id}>
                        <div className="stack split compact">
                          <h3>{series.title}</h3>
                          <SignalBadge kind={series.source_kind} />
                        </div>
                        {series.series_type === 'operating_window' ||
                        series.series_type === 'heatmap' ? (
                          <div className="wb-heatmap-grid">
                            {series.points.slice(0, 36).map((point) => (
                              <span
                                className="wb-heatmap-cell"
                                key={`${series.series_id}-${point.x}-${point.y}`}
                                style={{
                                  opacity:
                                    typeof point.z === 'number'
                                      ? Math.max(point.z / 100, 0.15)
                                      : 0.15,
                                }}
                                title={`${point.x} / ${point.y} / ${point.z ?? 'n/a'}`}
                              />
                            ))}
                          </div>
                        ) : (
                          <LineChart series={series} label={series.title} />
                        )}
                        <p className="muted">{series.provenance_note}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="wb-empty-panel">
                    <strong>No chart-ready model artifact</strong>
                    <p>
                      {evaluation.simulation_enrichment?.provenance.note ??
                        'Charts remain unavailable until a real modeling artifact is attached.'}
                    </p>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {activeCenterTab === 'audit' ? (
            <div className="wb-section-grid">
              <section className="panel grid">
                <div>
                  <span className="badge">Pipeline trace</span>
                  <h2>Deterministic and modeled stages</h2>
                </div>
                <div className="lens-stack">
                  {evaluation.audit_record.agent_pipeline_trace.map((stage) => (
                    <article className="lens-card" key={stage.stage_id}>
                      <div className="stack split compact">
                        <h3>{stage.agent_name}</h3>
                        <span className="badge subtle">{stage.status}</span>
                      </div>
                      <p className="muted">
                        {stage.mode} · {stage.input_contract} →{' '}
                        {stage.output_contract}
                      </p>
                      {stage.notes.length > 0 ? (
                        <p className="muted">{stage.notes.join(' ')}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel grid">
                <div>
                  <span className="badge">Audit trail</span>
                  <h2>Persisted event stream</h2>
                </div>
                <AuditTimeline
                  items={caseAuditEvents.map((event) => ({
                    id: event.event_id,
                    title: formatToken(event.event_type),
                    subtitle: `${formatTimestamp(event.created_at)} · ${event.actor_role}`,
                    detail: event.evaluation_id
                      ? `Evaluation ${event.evaluation_id}`
                      : undefined,
                  }))}
                />
              </section>
            </div>
          ) : null}
        </section>
      </section>

      <aside className="wb-pane wb-pane-right" id="history-rail">
        <div className="wb-pane-header">
          <div>
            <span className="badge">History</span>
            <h2>Case rail</h2>
          </div>
          <div className="wb-rail-metrics">
            <Sparkline
              values={historySignals.confidence}
              label="Confidence trend"
            />
            <Sparkline
              values={historySignals.modeling}
              label="Modeling trend"
            />
          </div>
        </div>

        {historyLoading ? (
          <p className="muted">Loading case history...</p>
        ) : historyError ? (
          <p className="error">{historyError}</p>
        ) : history ? (
          <>
            <p className="muted">
              {history.evaluations.length} evaluations ·{' '}
              {history.evidence_records.length} evidence records · last updated{' '}
              {formatTimestamp(history.case.updated_at)}
            </p>
            {relatedEvaluations.length > 0 ? (
              <div className="history-rail wb-history-grid">
                {relatedEvaluations.map((item) => (
                  <article
                    className="history-card wb-history-card"
                    key={item.evaluation_id}
                  >
                    <div className="stack split compact">
                      <Link
                        className="section-link"
                        href={`/evaluations/${item.evaluation_id}`}
                      >
                        {item.evaluation_id}
                      </Link>
                      <span
                        className={`wb-tone-badge ${confidenceBadgeTone(item.confidence_level)}`}
                      >
                        {item.confidence_level}
                      </span>
                    </div>
                    <p>{item.summary}</p>
                    <p className="muted">{formatTimestamp(item.created_at)}</p>
                    <div className="wb-signal-meta align-left">
                      <span
                        className={`wb-tone-badge ${item.simulation_summary?.status === 'completed' ? 'accent' : item.simulation_summary?.status ? 'warning' : 'muted'}`}
                      >
                        {formatToken(
                          item.simulation_summary?.status ?? 'unavailable',
                        )}
                      </span>
                    </div>
                    <div className="hero-actions">
                      <button
                        className={
                          comparisonEvaluationId === item.evaluation_id
                            ? 'button'
                            : 'button secondary'
                        }
                        type="button"
                        onClick={() =>
                          setComparisonEvaluationId((current) =>
                            current === item.evaluation_id
                              ? null
                              : item.evaluation_id,
                          )
                        }
                      >
                        {comparisonEvaluationId === item.evaluation_id
                          ? 'Remove compare'
                          : 'Compare with current'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted empty-state">
                No alternate stored evaluations are available yet for
                comparison.
              </p>
            )}
          </>
        ) : (
          <p className="muted">No stored history was found for this case.</p>
        )}
      </aside>

      <section
        className="wb-pane wb-pane-bottom"
        data-testid="comparison-dock"
        id="comparison-dock"
      >
        <div className="wb-pane-header">
          <div>
            <span className="badge">Compare</span>
            <h2>Comparison dock</h2>
          </div>
          <span className="badge subtle">
            {selectedComparison ? '2 evaluations loaded' : 'select one run'}
          </span>
        </div>

        {!comparisonEvaluationId ? (
          <div className="wb-empty-panel">
            <strong>Select one related evaluation</strong>
            <p>
              Use the compare action in the history rail to inspect the current
              run against one previous evaluation.
            </p>
          </div>
        ) : compareQuery.isLoading ? (
          <p className="muted">Loading comparison evaluation...</p>
        ) : compareQuery.error ? (
          <p className="error">{compareQuery.error.message}</p>
        ) : selectedComparison ? (
          <div className="wb-compare-grid">
            {topComparisonMetrics.map((metricKey) => {
              const currentMetric = resolveMetricDisplay(evaluation, metricKey);
              const compareMetric = resolveMetricDisplay(
                selectedComparison,
                metricKey,
              );
              const delta =
                currentMetric.numericValue !== null &&
                compareMetric.numericValue !== null
                  ? currentMetric.numericValue - compareMetric.numericValue
                  : null;

              return (
                <article className="wb-card" key={metricKey}>
                  <div className="stack split compact">
                    <strong>{currentMetric.label}</strong>
                    <span className="badge subtle">
                      {delta === null
                        ? 'n/a'
                        : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                    </span>
                  </div>
                  <div className="wb-compare-row">
                    <div>
                      <span className="muted">Current</span>
                      <div className="wb-metric-value">
                        {currentMetric.value}
                      </div>
                    </div>
                    <SignalBadge kind={currentMetric.sourceKind} />
                  </div>
                  <div className="wb-compare-row">
                    <div>
                      <span className="muted">Baseline</span>
                      <div className="wb-metric-value">
                        {compareMetric.value}
                      </div>
                    </div>
                    <SignalBadge kind={compareMetric.sourceKind} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
