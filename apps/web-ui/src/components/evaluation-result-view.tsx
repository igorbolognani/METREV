'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { fetchCaseHistory, fetchEvaluation } from '@/lib/api';

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function EvaluationResultView({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const query = useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: () => fetchEvaluation(evaluationId),
  });

  const caseId = query.data?.case_id;
  const historyQuery = useQuery({
    queryKey: ['case-history', caseId],
    queryFn: () => fetchCaseHistory(caseId as string),
    enabled: Boolean(caseId),
  });

  if (query.isLoading) {
    return <p className="muted">Loading evaluation...</p>;
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const evaluation = query.data;
  if (!evaluation) {
    return <p className="error">Evaluation not found.</p>;
  }

  return (
    <div className="grid">
      <section className="panel">
        <div className="stack split compact">
          <span className="badge">
            {
              evaluation.decision_output.confidence_and_uncertainty_summary
                .confidence_level
            }{' '}
            confidence
          </span>
          <span className="badge subtle">
            sensitivity{' '}
            {evaluation.decision_output.confidence_and_uncertainty_summary
              .sensitivity_level ?? 'not stated'}
          </span>
        </div>
        <h1>Evaluation {evaluation.evaluation_id}</h1>
        <p className="muted">
          {evaluation.decision_output.current_stack_diagnosis.summary}
        </p>
        <p className="muted">
          Case {evaluation.case_id} · Narrative mode{' '}
          {evaluation.narrative_metadata.mode} · Status{' '}
          {evaluation.narrative_metadata.status}
        </p>
        {evaluation.narrative ? <p>{evaluation.narrative}</p> : null}
        <div className="hero-actions">
          <Link className="button secondary" href="/cases/new">
            Run another evaluation
          </Link>
        </div>
      </section>

      <section className="panel">
        <h2>Prioritized options</h2>
        <ul className="list">
          {evaluation.decision_output.prioritized_improvement_options.map(
            (option) => (
              <li key={option.recommendation_id}>
                <div className="stack split compact">
                  <h3>{option.recommendation_id}</h3>
                  <span className="badge subtle">
                    score {option.priority_score ?? 'n/a'}
                  </span>
                </div>
                <p>{option.rationale}</p>
                <p className="muted">
                  Expected benefit: {option.expected_benefit}
                </p>
                <p className="muted">
                  Phase {option.phase_assignment ?? 'unassigned'} · Confidence{' '}
                  {option.confidence_level}
                </p>
                {option.rule_refs?.length ? (
                  <p className="muted">
                    Rule refs: {option.rule_refs.join(', ')}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
      </section>

      <div className="grid two">
        <section className="panel">
          <h2>Defaults and missing data</h2>
          <p className="muted">Defaults used</p>
          <ul>
            {evaluation.decision_output.assumptions_and_defaults_audit.defaults_used.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>
          <p className="muted">Missing data</p>
          <ul>
            {evaluation.decision_output.assumptions_and_defaults_audit.missing_data.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>
          <p className="muted">Assumptions</p>
          <ul>
            {evaluation.decision_output.assumptions_and_defaults_audit.assumptions.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>
        </section>

        <section className="panel">
          <h2>Next tests</h2>
          <ul>
            {evaluation.decision_output.confidence_and_uncertainty_summary.next_tests.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>
        </section>
      </div>

      <div className="grid two">
        <section className="panel">
          <h2>Provenance</h2>
          <ul>
            {evaluation.decision_output.confidence_and_uncertainty_summary.provenance_notes.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>

          <p className="muted">Typed evidence</p>
          <ul className="list compact-list">
            {evaluation.audit_record.typed_evidence.length > 0 ? (
              evaluation.audit_record.typed_evidence.map((record) => (
                <li key={record.evidence_id}>
                  <h3>{record.title}</h3>
                  <p>{record.summary}</p>
                  <p className="muted">
                    {record.evidence_type} · {record.strength_level}
                  </p>
                </li>
              ))
            ) : (
              <li>
                <p className="muted">
                  No typed evidence was supplied for this run.
                </p>
              </li>
            )}
          </ul>
        </section>

        <section className="panel">
          <h2>Pipeline trace</h2>
          <ul className="list compact-list">
            {evaluation.audit_record.agent_pipeline_trace.map((stage) => (
              <li key={stage.stage_id}>
                <div className="stack split compact">
                  <h3>{stage.agent_name}</h3>
                  <span className="badge subtle">{stage.status}</span>
                </div>
                <p className="muted">
                  {stage.mode} · {stage.input_contract} →{' '}
                  {stage.output_contract}
                </p>
                {stage.notes.length > 0 ? <p>{stage.notes.join(' ')}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>Case history</h2>
        {historyQuery.isLoading ? (
          <p className="muted">Loading case history...</p>
        ) : historyQuery.error ? (
          <p className="error">{historyQuery.error.message}</p>
        ) : historyQuery.data ? (
          <div className="grid">
            <p className="muted">
              {historyQuery.data.evaluations.length} evaluations ·{' '}
              {historyQuery.data.evidence_records.length} evidence records ·
              last updated {formatTimestamp(historyQuery.data.case.updated_at)}
            </p>
            <ul className="list compact-list">
              {historyQuery.data.evaluations.map((item) => (
                <li key={item.evaluation_id}>
                  <div className="stack split compact">
                    <h3>{item.evaluation_id}</h3>
                    <span className="badge subtle">
                      {item.confidence_level}
                    </span>
                  </div>
                  <p>{item.summary}</p>
                  <p className="muted">{formatTimestamp(item.created_at)}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="muted">No stored history was found for this case.</p>
        )}
      </section>
    </div>
  );
}
