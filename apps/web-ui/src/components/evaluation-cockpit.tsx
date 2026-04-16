'use client';

import Link from 'next/link';

import type {
    CaseHistoryResponse,
    EvaluationResponse,
} from '@metrev/domain-contracts';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

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

function renderPills(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="muted empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className="pill-list">
      {items.map((entry) => (
        <li key={entry} className="pill">
          {entry}
        </li>
      ))}
    </ul>
  );
}

function sortByNewest<T extends { created_at: string }>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
}

function scorePercent(score: number | undefined): string {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  return `${safeScore}%`;
}

export function EvaluationCockpit({
  evaluationId,
  evaluation,
  history,
  historyLoading,
  historyError,
}: {
  evaluationId: string;
  evaluation: EvaluationResponse;
  history?: CaseHistoryResponse;
  historyLoading: boolean;
  historyError?: string;
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
  const documentedFindings = diagnosis.block_findings.filter(
    (finding) => finding.status === 'documented',
  );
  const caseHistoryEvaluations = history
    ? sortByNewest(history.evaluations)
    : [];
  const relatedEvaluations = caseHistoryEvaluations.filter(
    (item) => item.evaluation_id !== evaluationId,
  );
  const caseAuditEvents = history ? sortByNewest(history.audit_events) : [];

  return (
    <div className="grid">
      <section className="hero cockpit-hero">
        <div className="stack split compact">
          <div className="section-group">
            <span className="badge">Decision cockpit</span>
            <h1>{evaluation.case_id} analyst briefing</h1>
            <p className="muted">{diagnosis.summary}</p>
          </div>
          <div className="stack compact">
            <span className="badge">
              {confidenceSummary.confidence_level} confidence
            </span>
            <span className="badge subtle">
              sensitivity {confidenceSummary.sensitivity_level ?? 'not stated'}
            </span>
          </div>
        </div>

        <div className="cockpit-strip">
          <article className="metric-card">
            <span className="muted">Lead action</span>
            <strong>
              {topRecommendation
                ? formatToken(topRecommendation.recommendation_id)
                : 'Not available'}
            </strong>
            <p className="muted">
              {topRecommendation?.phase_assignment ?? 'No phase assigned'}
            </p>
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
            <span className="muted">Shortlist lanes</span>
            <strong>{decisionOutput.supplier_shortlist.length}</strong>
            <p className="muted">Candidate paths under review</p>
          </article>
        </div>

        <div className="grid two">
          <section className="panel nested-panel compact-panel grid">
            <div className="stack split compact">
              <h2>Lead action</h2>
              {topRecommendation ? (
                <span className="badge subtle">
                  score {topRecommendation.priority_score?.toFixed(0) ?? 'n/a'}
                </span>
              ) : null}
            </div>
            {topRecommendation ? (
              <>
                <div className="stack split compact">
                  <h3>{formatToken(topRecommendation.recommendation_id)}</h3>
                  <span className="badge subtle">
                    {topRecommendation.recommendation_id}
                  </span>
                </div>
                <p>{topRecommendation.rationale}</p>
                <div className="score-track">
                  <span
                    className="score-fill"
                    style={{
                      width: scorePercent(topRecommendation.priority_score),
                    }}
                  />
                </div>
                <div className="detail-grid two-columns">
                  <div className="detail-item">
                    <span className="muted">Expected benefit</span>
                    <strong>{topRecommendation.expected_benefit}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Phase</span>
                    <strong>
                      {topRecommendation.phase_assignment ?? 'Unassigned'}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Confidence</span>
                    <strong>
                      {formatToken(topRecommendation.confidence_level)}
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Implementation effort</span>
                    <strong>
                      {formatToken(topRecommendation.implementation_effort)}
                    </strong>
                  </div>
                </div>
                <div className="grid two">
                  <div className="section-group">
                    <h4>Supplier candidates</h4>
                    {renderPills(
                      topRecommendation.supplier_candidates ?? [],
                      'No supplier candidates are attached to the current lead action.',
                    )}
                  </div>
                  <div className="section-group">
                    <h4>Missing-data dependencies</h4>
                    {renderStringList(
                      topRecommendation.missing_data_dependencies,
                      'This lead action is not currently blocked by additional missing data.',
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="muted empty-state">
                No prioritized action was generated for this evaluation.
              </p>
            )}
          </section>

          <section className="panel nested-panel compact-panel grid">
            <div className="stack split compact">
              <h2>Decision posture</h2>
              <span className="badge subtle">
                {recommendations.length} ranked options
              </span>
            </div>
            <p>{confidenceSummary.summary}</p>
            <div className="detail-grid two-columns">
              <div className="detail-item">
                <span className="muted">Case created</span>
                <strong>
                  {formatTimestamp(evaluation.audit_record.timestamp)}
                </strong>
              </div>
              <div className="detail-item">
                <span className="muted">Narrative mode</span>
                <strong>{evaluation.narrative_metadata.mode}</strong>
              </div>
            </div>
            <div className="grid two">
              <div className="section-group">
                <h4>Confidence drivers</h4>
                {renderStringList(
                  confidenceSummary.provenance_notes.slice(0, 4),
                  'No explicit confidence drivers were recorded for this run.',
                )}
              </div>
              <div className="section-group">
                <h4>Next tests</h4>
                {renderStringList(
                  confidenceSummary.next_tests,
                  'No follow-up validation tests were recorded for this evaluation.',
                )}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="panel">
        <div className="stack split compact">
          <div>
            <span className="badge">Recommendation matrix</span>
            <h2>Ranked decision options</h2>
          </div>
          <Link className="button secondary" href="/cases/new">
            Run another evaluation
          </Link>
        </div>

        <div className="option-matrix">
          {recommendations.map((option) => (
            <article className="option-row" key={option.recommendation_id}>
              <div className="stack split compact">
                <div className="section-group">
                  <span className="option-eyebrow">
                    {option.phase_assignment ?? 'Unassigned'}
                  </span>
                  <div className="stack split compact">
                    <h3>{formatToken(option.recommendation_id)}</h3>
                    <span className="badge subtle">
                      {option.recommendation_id}
                    </span>
                  </div>
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

              <div className="detail-grid two-columns">
                <div className="detail-item">
                  <span className="muted">Expected benefit</span>
                  <strong>{option.expected_benefit}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Linked diagnosis</span>
                  <strong>{option.linked_diagnosis}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Implementation effort</span>
                  <strong>{formatToken(option.implementation_effort)}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Risk level</span>
                  <strong>{formatToken(option.risk_level)}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Economic plausibility</span>
                  <strong>{formatToken(option.economic_plausibility)}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Evidence strength</span>
                  <strong>{option.evidence_strength_summary}</strong>
                </div>
              </div>

              <details className="disclosure">
                <summary>Evidence, dependencies, and assumptions</summary>
                <div className="disclosure-content grid">
                  <div className="grid two">
                    <div className="section-group">
                      <h4>Prerequisite actions</h4>
                      {renderStringList(
                        option.prerequisite_actions ?? [],
                        'No prerequisite actions were recorded for this option.',
                      )}
                    </div>
                    <div className="section-group">
                      <h4>Measurement requests</h4>
                      {renderStringList(
                        option.measurement_requests ?? [],
                        'No additional measurement requests were recorded.',
                      )}
                    </div>
                  </div>
                  <div className="grid two">
                    <div className="section-group">
                      <h4>Assumptions</h4>
                      {renderStringList(
                        option.assumptions,
                        'No explicit assumptions were recorded for this option.',
                      )}
                    </div>
                    <div className="section-group">
                      <h4>Supplier candidates</h4>
                      {renderPills(
                        option.supplier_candidates ?? [],
                        'No supplier candidates were attached to this option.',
                      )}
                    </div>
                  </div>
                  {(option.rule_refs?.length ?? 0) > 0 ? (
                    <p className="muted">
                      Rule refs: {option.rule_refs?.join(', ')}
                    </p>
                  ) : null}
                  {(option.evidence_refs?.length ?? 0) > 0 ? (
                    <p className="muted">
                      Evidence refs: {option.evidence_refs?.join(', ')}
                    </p>
                  ) : null}
                  {(option.provenance_notes?.length ?? 0) > 0 ? (
                    <p className="muted">
                      Provenance notes: {option.provenance_notes?.join(' ')}
                    </p>
                  ) : null}
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <div className="stack split compact">
            <div>
              <span className="badge">Diagnosis board</span>
              <h2>Current diagnosis</h2>
            </div>
            <span className="badge subtle">
              {attentionFindings.length} attention items
            </span>
          </div>

          <div className="finding-board">
            {attentionFindings.length > 0 ? (
              attentionFindings.map((finding) => (
                <article
                  className="finding-card attention"
                  key={`${finding.block}-${finding.finding}`}
                >
                  <div className="stack split compact">
                    <h3>{formatToken(finding.block)}</h3>
                    <div className="stack compact">
                      <span className="badge subtle">
                        {formatToken(finding.status)}
                      </span>
                      {finding.severity ? (
                        <span className="badge subtle">
                          {formatToken(finding.severity)} severity
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p>{finding.finding}</p>
                  {finding.rule_refs.length > 0 ? (
                    <p className="muted">
                      Rule refs: {finding.rule_refs.join(', ')}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="muted empty-state">
                No attention-level diagnosis findings were recorded for this
                run.
              </p>
            )}
          </div>

          <div className="section-group">
            <h3>Main weaknesses and blind spots</h3>
            {renderStringList(
              diagnosis.main_weaknesses_or_blind_spots,
              'No major blind spots were recorded for this run.',
            )}
          </div>

          <details className="disclosure">
            <summary>Documented stack context</summary>
            <div className="disclosure-content grid">
              <div className="finding-board">
                {documentedFindings.map((finding) => (
                  <article
                    className="finding-card documented"
                    key={`${finding.block}-${finding.finding}`}
                  >
                    <div className="stack split compact">
                      <h3>{formatToken(finding.block)}</h3>
                      <span className="badge subtle">Documented</span>
                    </div>
                    <p>{finding.finding}</p>
                  </article>
                ))}
              </div>
            </div>
          </details>
        </section>

        <section className="panel">
          <div className="stack split compact">
            <div>
              <span className="badge">Decision lenses</span>
              <h2>Impact and supplier context</h2>
            </div>
            <span className="badge subtle">
              {decisionOutput.impact_map.length} impact rows
            </span>
          </div>

          <div className="lens-stack">
            {decisionOutput.impact_map.map((entry) => (
              <article className="lens-card" key={entry.option}>
                <div className="stack split compact">
                  <h3>{formatToken(entry.option)}</h3>
                  <span className="badge subtle">
                    {entry.priority_score?.toFixed(0) ?? 'n/a'}
                  </span>
                </div>
                <p className="muted">{entry.technical_impact}</p>
                <div className="grid two">
                  <div className="detail-item">
                    <span className="muted">Economic case</span>
                    <strong>{entry.economic_plausibility}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="muted">Readiness</span>
                    <strong>{entry.maturity_or_readiness}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="section-group">
            <h3>Supplier shortlist</h3>
            <div className="lens-stack">
              {decisionOutput.supplier_shortlist.map((entry) => (
                <article
                  className="lens-card"
                  key={`${entry.category}-${entry.candidate_path}`}
                >
                  <div className="stack split compact">
                    <h4>{formatToken(entry.category)}</h4>
                    <span className="badge subtle">Candidate path</span>
                  </div>
                  <p>{entry.candidate_path}</p>
                  <p className="muted">{entry.fit_note}</p>
                  {renderStringList(
                    entry.missing_information_before_commitment,
                    'No blocking information gaps were recorded for this shortlist entry.',
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="stack split compact">
          <div>
            <span className="badge">Execution path</span>
            <h2>Phased roadmap</h2>
          </div>
          <span className="badge subtle">
            {decisionOutput.phased_roadmap.length} phases
          </span>
        </div>
        <div className="roadmap-grid">
          {decisionOutput.phased_roadmap.map((entry) => (
            <article className="roadmap-card" key={entry.phase}>
              <span className="badge">{entry.phase}</span>
              <h3>{entry.title}</h3>
              {entry.actions.length > 0 ? (
                <ul className="list-block">
                  {entry.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted empty-state">
                  No actions were assigned to this phase for the current run.
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <div>
            <span className="badge">Traceability</span>
            <h2>Defaults, gaps, and assumptions</h2>
          </div>
          <div className="section-group">
            <h3>Defaults used</h3>
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
          <div className="section-group">
            <h3>Assumptions</h3>
            {renderStringList(
              decisionOutput.assumptions_and_defaults_audit.assumptions,
              'No assumptions were recorded for this evaluation.',
            )}
          </div>
        </section>

        <section className="panel">
          <div>
            <span className="badge">Secondary detail</span>
            <h2>Evidence and runtime trace</h2>
          </div>

          <details className="disclosure" open>
            <summary>Narrative and confidence context</summary>
            <div className="disclosure-content grid">
              <div className="detail-grid two-columns">
                <div className="detail-item">
                  <span className="muted">Narrative mode</span>
                  <strong>{evaluation.narrative_metadata.mode}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Status</span>
                  <strong>{evaluation.narrative_metadata.status}</strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Provider</span>
                  <strong>
                    {evaluation.narrative_metadata.provider ?? 'Not set'}
                  </strong>
                </div>
                <div className="detail-item">
                  <span className="muted">Model</span>
                  <strong>
                    {evaluation.narrative_metadata.model ?? 'Not set'}
                  </strong>
                </div>
              </div>
              {evaluation.narrative ? <p>{evaluation.narrative}</p> : null}
            </div>
          </details>

          <details className="disclosure">
            <summary>Typed evidence and provenance</summary>
            <div className="disclosure-content grid">
              {renderStringList(
                confidenceSummary.provenance_notes,
                'No additional provenance notes were recorded for this evaluation.',
              )}
              <div className="lens-stack">
                {typedEvidence.length > 0 ? (
                  typedEvidence.map((record) => (
                    <article className="lens-card" key={record.evidence_id}>
                      <div className="stack split compact">
                        <h3>{record.title}</h3>
                        <span className="badge subtle">
                          {record.evidence_id}
                        </span>
                      </div>
                      <p>{record.summary}</p>
                      <p className="muted">
                        {record.evidence_type} · {record.strength_level}
                      </p>
                      <p className="muted">
                        Provenance note: {record.provenance_note}
                      </p>
                      <div className="grid two">
                        <div className="section-group">
                          <h4>Tags</h4>
                          {renderPills(
                            record.tags,
                            'No tags were attached to this evidence record.',
                          )}
                        </div>
                        <div className="section-group">
                          <h4>Block mapping</h4>
                          {renderPills(
                            record.block_mapping,
                            'No block mapping was recorded for this evidence record.',
                          )}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted empty-state">
                    No typed evidence was supplied for this run.
                  </p>
                )}
              </div>
            </div>
          </details>

          <details className="disclosure">
            <summary>Pipeline trace</summary>
            <div className="disclosure-content grid">
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
                    {stage.deterministic_owner ? (
                      <p className="muted">
                        Owner: {stage.deterministic_owner}
                      </p>
                    ) : null}
                    {stage.assistant_surface ? (
                      <p className="muted">
                        Assistant surface: {stage.assistant_surface}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </details>
        </section>
      </div>

      <section className="panel">
        <div className="stack split compact">
          <div>
            <span className="badge">History and comparison</span>
            <h2>Case history</h2>
          </div>
          {history ? (
            <span className="badge subtle">
              {history.evaluations.length} evaluations
            </span>
          ) : null}
        </div>

        {historyLoading ? (
          <p className="muted">Loading case history...</p>
        ) : historyError ? (
          <p className="error">{historyError}</p>
        ) : history ? (
          <div className="grid">
            <p className="muted">
              {history.evaluations.length} evaluations ·{' '}
              {history.evidence_records.length} evidence records ·{' '}
              {history.audit_events.length} audit events · last updated{' '}
              {formatTimestamp(history.case.updated_at)}
            </p>

            {relatedEvaluations.length > 0 ? (
              <div className="history-rail">
                {relatedEvaluations.map((item) => (
                  <article className="history-card" key={item.evaluation_id}>
                    <div className="stack split compact">
                      <Link
                        className="section-link"
                        href={`/evaluations/${item.evaluation_id}`}
                      >
                        {item.evaluation_id}
                      </Link>
                      <span className="badge subtle">
                        {item.confidence_level}
                      </span>
                    </div>
                    <p>{item.summary}</p>
                    <p className="muted">{formatTimestamp(item.created_at)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted empty-state">
                No alternate stored evaluations are available yet for
                comparison.
              </p>
            )}

            <details className="disclosure">
              <summary>Audit events</summary>
              <div className="disclosure-content grid">
                <div className="lens-stack">
                  {caseAuditEvents.map((event) => (
                    <article className="lens-card" key={event.event_id}>
                      <div className="stack split compact">
                        <h3>{event.event_type}</h3>
                        <span className="badge subtle">{event.actor_role}</span>
                      </div>
                      <p className="muted">
                        {formatTimestamp(event.created_at)} · Event ID{' '}
                        {event.event_id}
                      </p>
                      {event.actor_id ? (
                        <p className="muted">Actor: {event.actor_id}</p>
                      ) : null}
                      {event.evaluation_id ? (
                        <p className="muted">
                          Evaluation: {event.evaluation_id}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </details>
          </div>
        ) : (
          <p className="muted">No stored history was found for this case.</p>
        )}
      </section>
    </div>
  );
}
