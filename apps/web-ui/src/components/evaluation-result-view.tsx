'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import { LineChart } from '@/components/workbench/line-chart';
import { PanelTabs } from '@/components/workbench/panel-tabs';
import { SignalBadge } from '@/components/workbench/signal-badge';
import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
  WorkspaceStatCard,
} from '@/components/workspace-chrome';
import {
  fetchEvaluationCsvExport,
  fetchEvaluationJsonExport,
  fetchEvaluationWorkspace,
} from '@/lib/api';
import { downloadCsv, downloadJson } from '@/lib/downloads';
import { formatTimestamp, formatToken } from '@/lib/formatting';

void React;

type WorkspaceTab = 'summary' | 'evidence' | 'modeling' | 'audit';

function toneClass(tone: string): 'default' | 'accent' | 'warning' | 'success' | 'critical' {
  switch (tone) {
    case 'accent':
    case 'warning':
    case 'success':
    case 'critical':
      return tone;
    default:
      return 'default';
  }
}

function renderStringList(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <ul className="list-block">
      {items.map((entry) => (
        <li key={entry}>{entry}</li>
      ))}
    </ul>
  );
}

export function EvaluationResultView({
  evaluationId,
  initialTab = 'summary',
}: {
  evaluationId: string;
  initialTab?: WorkspaceTab;
}) {
  const [activeTab, setActiveTab] = React.useState<WorkspaceTab>(initialTab);
  const query = useQuery({
    queryKey: ['evaluation-workspace', evaluationId],
    queryFn: () => fetchEvaluationWorkspace(evaluationId),
  });
  const jsonExportMutation = useMutation({
    mutationFn: () => fetchEvaluationJsonExport(evaluationId),
    onSuccess: (value) => {
      downloadJson({
        value,
        fileName: `${value.evaluation.case_id}-${value.evaluation.evaluation_id}.json`,
      });
    },
  });
  const csvExportMutation = useMutation({
    mutationFn: () => fetchEvaluationCsvExport(evaluationId),
    onSuccess: (value) => {
      downloadCsv({
        content: value.content,
        fileName: value.metadata.file_name,
      });
    },
  });

  if (query.isLoading) {
    return (
      <div className="workspace-page">
        <WorkspaceSkeleton lines={6} />
      </div>
    );
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const workspace = query.data;
  if (!workspace) {
    return (
      <WorkspaceEmptyState
        title="Workspace unavailable"
        description="The evaluation workspace payload could not be loaded."
      />
    );
  }

  return (
    <EvaluationWorkspaceView
      workspace={workspace}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onExportCsv={() => csvExportMutation.mutate()}
      onExportJson={() => jsonExportMutation.mutate()}
      exportCsvPending={csvExportMutation.isPending}
      exportJsonPending={jsonExportMutation.isPending}
      exportCsvError={csvExportMutation.error?.message}
      exportJsonError={jsonExportMutation.error?.message}
    />
  );
}

export function EvaluationWorkspaceView({
  workspace,
  activeTab,
  onTabChange,
  onExportJson,
  onExportCsv,
  exportJsonPending = false,
  exportCsvPending = false,
  exportJsonError,
  exportCsvError,
}: {
  workspace: Awaited<ReturnType<typeof fetchEvaluationWorkspace>>;
  activeTab: WorkspaceTab;
  onTabChange: (nextTab: WorkspaceTab) => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  exportJsonPending?: boolean;
  exportCsvPending?: boolean;
  exportJsonError?: string;
  exportCsvError?: string;
}) {
  const evaluation = workspace.evaluation;
  const decisionOutput = evaluation.decision_output;
  const typedEvidence = evaluation.audit_record.typed_evidence;
  const simulation = evaluation.simulation_enrichment;
  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'evidence', label: 'Evidence', badge: typedEvidence.length },
    {
      id: 'modeling',
      label: 'Modeling',
      badge: simulation?.derived_observations.length ?? 0,
    },
    {
      id: 'audit',
      label: 'Audit',
      badge:
        decisionOutput.assumptions_and_defaults_audit.defaults_used.length +
        decisionOutput.assumptions_and_defaults_audit.missing_data.length,
    },
  ] as const;

  return (
    <div className="workspace-page" data-testid="evaluation-workspace">
      <WorkspacePageHeader
        badge="Evaluation workspace"
        title={workspace.overview.title}
        description={workspace.overview.subtitle}
        chips={[
          `${formatToken(
            evaluation.decision_output.confidence_and_uncertainty_summary.confidence_level,
          )} confidence`,
          `Model ${formatToken(simulation?.status ?? 'unavailable')}`,
          `Workspace schema ${workspace.meta.versions.workspace_schema_version}`,
        ]}
        actions={
          <>
            {workspace.links.compare_href ? (
              <Link className="button secondary" href={workspace.links.compare_href}>
                Compare
              </Link>
            ) : null}
            <Link className="button secondary" href={workspace.links.history_href}>
              Case history
            </Link>
            <Link className="button secondary" href={workspace.links.report_href}>
              Report
            </Link>
            <button
              className="secondary"
              type="button"
              onClick={onExportJson}
            >
              {exportJsonPending ? 'Exporting JSON...' : 'Export JSON'}
            </button>
            <button
              className="secondary"
              type="button"
              onClick={onExportCsv}
            >
              {exportCsvPending ? 'Exporting CSV...' : 'Export CSV'}
            </button>
          </>
        }
      />

      <section className="workspace-stats-grid">
        {workspace.overview.hero_cards.map((card) => (
          <WorkspaceStatCard
            key={card.key}
            label={card.label}
            value={card.value}
            detail={card.detail}
            tone={toneClass(card.tone)}
          />
        ))}
      </section>

      <section className="workspace-detail-grid">
        {workspace.overview.brief_cards.map((card) => (
          <WorkspaceDataCard key={card.key}>
            <span className="badge subtle">{card.label}</span>
            <h3>{card.value}</h3>
            <p>{card.detail}</p>
          </WorkspaceDataCard>
        ))}
      </section>

      <WorkspaceSection
        eyebrow="Execution focus"
        title={workspace.overview.lead_action.title}
        description={workspace.overview.lead_action.rationale}
      >
        <div className="workspace-lead-grid">
          <WorkspaceDataCard tone="accent">
            <div className="workspace-data-card__header">
              <div>
                <span className="badge subtle">Lead action</span>
                <h3>{workspace.overview.lead_action.title}</h3>
              </div>
              <span className="meta-chip">{workspace.overview.lead_action.phase}</span>
            </div>
            <p>{workspace.overview.lead_action.score_label}</p>
            <div className="workspace-chip-list compact">
              <span className="meta-chip">
                {workspace.overview.lead_action.confidence_label} confidence
              </span>
              <span className="meta-chip">
                {workspace.overview.lead_action.effort_label} effort
              </span>
            </div>
            <div className="workspace-detail-grid">
              <WorkspaceDataCard>
                <h3>Blocking dependencies</h3>
                {renderStringList(
                  workspace.overview.lead_action.blockers,
                  'No explicit blocker is attached to the lead action.',
                )}
              </WorkspaceDataCard>
              <WorkspaceDataCard>
                <h3>Immediate tests</h3>
                {renderStringList(
                  workspace.overview.lead_action.measurement_requests,
                  'No additional measurement request is attached to the lead action.',
                )}
              </WorkspaceDataCard>
            </div>
          </WorkspaceDataCard>

          <WorkspaceDataCard>
            <span className="badge subtle">History posture</span>
            <h3>{workspace.history_summary.total_runs} stored run(s)</h3>
            <p>
              Compare against previous evaluations without overloading the current
              result surface.
            </p>
            <div className="workspace-action-row">
              <Link className="ghost-button" href={workspace.links.history_href}>
                Open case history
              </Link>
              {workspace.links.compare_href ? (
                <Link className="ghost-button" href={workspace.links.compare_href}>
                  Compare with prior run
                </Link>
              ) : null}
            </div>
          </WorkspaceDataCard>
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        eyebrow="Result reading"
        title="Decision layers"
        description="Use the tabs below to move between summary, evidence, modeling, and audit without mixing them into one overloaded page."
      >
        <PanelTabs
          activeTab={activeTab}
          tabs={tabs}
          onChange={onTabChange}
          label="Evaluation workspace tabs"
        />

        {activeTab === 'summary' ? (
          <div className="workspace-form-layout">
            <WorkspaceDataCard>
              <span className="badge subtle">Key metrics</span>
              <div className="workspace-card-list">
                {workspace.overview.key_metrics.map((metric) => (
                  <article className="workspace-inline-card" key={metric.key}>
                    <div className="workspace-data-card__header">
                      <div>
                        <h3>{metric.label}</h3>
                        <p>{metric.note}</p>
                      </div>
                      <SignalBadge kind={metric.source_kind} />
                    </div>
                    <strong>{metric.value}</strong>
                  </article>
                ))}
              </div>
            </WorkspaceDataCard>

            <WorkspaceDataCard tone="accent">
              <span className="badge subtle">Prioritized recommendations</span>
              <div className="workspace-card-list">
                {decisionOutput.prioritized_improvement_options.map(
                  (recommendation, index) => (
                    <article className="workspace-inline-card" key={recommendation.recommendation_id}>
                      <div className="workspace-data-card__header">
                        <div>
                          <h3>
                            {index + 1}. {formatToken(recommendation.recommendation_id)}
                          </h3>
                          <p>{recommendation.rationale}</p>
                        </div>
                        <span className="meta-chip">
                          {recommendation.priority_score !== undefined
                            ? `${Math.round(recommendation.priority_score)}`
                            : 'n/a'}
                        </span>
                      </div>
                      <p>{recommendation.expected_benefit}</p>
                      <div className="workspace-chip-list compact">
                        <span className="meta-chip">
                          {formatToken(recommendation.implementation_effort)} effort
                        </span>
                        <span className="meta-chip">
                          {formatToken(recommendation.confidence_level)} confidence
                        </span>
                        {recommendation.phase_assignment ? (
                          <span className="meta-chip">
                            {recommendation.phase_assignment}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  ),
                )}
              </div>
            </WorkspaceDataCard>

            <div className="workspace-detail-grid">
              <WorkspaceDataCard>
                <span className="badge subtle">Impact map</span>
                {workspace.overview.impact_map.length > 0 ? (
                  <div className="workspace-card-list">
                    {workspace.overview.impact_map.map((entry) => (
                      <article className="workspace-inline-card" key={entry.key}>
                        <h3>{entry.title}</h3>
                        <p>{entry.impact}</p>
                        <p className="muted">
                          {entry.economic} · {entry.readiness} · {entry.score_label}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No impact map entries were returned.</p>
                )}
              </WorkspaceDataCard>

              <WorkspaceDataCard>
                <span className="badge subtle">Phased roadmap</span>
                {workspace.overview.roadmap.length > 0 ? (
                  <div className="workspace-card-list">
                    {workspace.overview.roadmap.map((entry) => (
                      <article className="workspace-inline-card" key={`${entry.phase}-${entry.title}`}>
                        <h3>{entry.phase}</h3>
                        <p>{entry.title}</p>
                        <p className="muted">
                          {entry.detail} · {entry.action_count} action(s)
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No phased roadmap entries were returned.</p>
                )}
              </WorkspaceDataCard>
            </div>
          </div>
        ) : null}

        {activeTab === 'evidence' ? (
          <div className="workspace-form-layout">
            <WorkspaceDataCard>
              <span className="badge subtle">Typed evidence</span>
              {typedEvidence.length > 0 ? (
                <div className="workspace-card-list">
                  {typedEvidence.map((record) => (
                    <article className="workspace-inline-card" key={record.evidence_id}>
                      <div className="workspace-data-card__header">
                        <div>
                          <h3>{record.title}</h3>
                          <p>{record.summary}</p>
                        </div>
                        <SignalBadge kind={record.evidence_type === 'internal_benchmark' ? 'measured' : 'inferred'} />
                      </div>
                      <p className="muted">
                        {formatToken(record.evidence_type)} ·{' '}
                        {formatToken(record.strength_level)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No typed evidence records were attached.</p>
              )}
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <span className="badge subtle">Supplier shortlist</span>
              {decisionOutput.supplier_shortlist.length > 0 ? (
                <div className="workspace-card-list">
                  {decisionOutput.supplier_shortlist.map((entry) => (
                    <article className="workspace-inline-card" key={`${entry.category}-${entry.candidate_path}`}>
                      <h3>{entry.category}</h3>
                      <p>{entry.candidate_path}</p>
                      <p className="muted">{entry.fit_note}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">No supplier shortlist was returned for this evaluation.</p>
              )}
            </WorkspaceDataCard>
          </div>
        ) : null}

        {activeTab === 'modeling' ? (
          <div className="workspace-form-layout">
            <WorkspaceDataCard tone="accent">
              <span className="badge subtle">Modeling artifact</span>
              <h3>{formatToken(simulation?.status ?? 'unavailable')}</h3>
              <p>
                Model version {simulation?.model_version ?? 'not available'} with{' '}
                {simulation?.derived_observations.length ?? 0} derived observation(s).
              </p>
              {simulation?.series?.[0] ? (
                <LineChart
                  label={simulation.series[0].title}
                  series={simulation.series[0]}
                />
              ) : (
                <p className="muted">
                  No chartable series is available for this evaluation.
                </p>
              )}
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <span className="badge subtle">Derived observations</span>
              {simulation?.derived_observations.length ? (
                <div className="workspace-card-list">
                  {simulation.derived_observations.map((observation) => (
                    <article className="workspace-inline-card" key={observation.observation_id}>
                      <div className="workspace-data-card__header">
                        <div>
                          <h3>{observation.label}</h3>
                          <p>{observation.provenance_note}</p>
                        </div>
                        <SignalBadge kind={observation.source_kind} />
                      </div>
                      <strong>
                        {typeof observation.value === 'number'
                          ? `${observation.value}${observation.unit ? ` ${observation.unit}` : ''}`
                          : String(observation.value)}
                      </strong>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  No derived observations were produced for this run.
                </p>
              )}
            </WorkspaceDataCard>
          </div>
        ) : null}

        {activeTab === 'audit' ? (
          <div className="workspace-form-layout">
            <WorkspaceDataCard>
              <span className="badge subtle">Assumptions and defaults</span>
              <div className="workspace-detail-grid">
                <WorkspaceDataCard>
                  <h3>Defaults used</h3>
                  {renderStringList(
                    decisionOutput.assumptions_and_defaults_audit.defaults_used,
                    'No defaults were recorded for this evaluation.',
                  )}
                </WorkspaceDataCard>
                <WorkspaceDataCard>
                  <h3>Missing data</h3>
                  {renderStringList(
                    decisionOutput.assumptions_and_defaults_audit.missing_data,
                    'No missing-data flags were recorded.',
                  )}
                </WorkspaceDataCard>
              </div>
              <WorkspaceDataCard>
                <h3>Assumptions</h3>
                {renderStringList(
                  decisionOutput.assumptions_and_defaults_audit.assumptions,
                  'No explicit assumptions were stored for this evaluation.',
                )}
              </WorkspaceDataCard>
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <span className="badge subtle">Traceability</span>
              <p>{evaluation.audit_record.summary}</p>
              <div className="workspace-chip-list compact">
                <span className="meta-chip">
                  Contract {workspace.meta.versions.contract_version}
                </span>
                <span className="meta-chip">
                  Ontology {workspace.meta.versions.ontology_version}
                </span>
                <span className="meta-chip">
                  Rules {workspace.meta.versions.ruleset_version}
                </span>
              </div>
              <p className="muted">
                Generated {formatTimestamp(workspace.meta.generated_at)} from{' '}
                {workspace.meta.traceability.transformation_stages.join(' -> ')}.
              </p>
            </WorkspaceDataCard>
          </div>
        ) : null}

        {exportJsonError ? <p className="error">{exportJsonError}</p> : null}
        {exportCsvError ? <p className="error">{exportCsvError}</p> : null}
      </WorkspaceSection>
    </div>
  );
}
