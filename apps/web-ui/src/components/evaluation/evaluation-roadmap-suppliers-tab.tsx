'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
} from '@/components/workspace-chrome';

void React;

function listOrEmpty(items: string[], emptyMessage: string) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <ul className="list-block">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function EvaluationRoadmapSuppliersTab({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  const roadmap = evaluation.decision_output.phased_roadmap;
  const supplierShortlist = evaluation.decision_output.supplier_shortlist;

  if (roadmap.length === 0 && supplierShortlist.length === 0) {
    return (
      <WorkspaceEmptyState
        title="No roadmap or suppliers"
        description="This evaluation did not return phased roadmap or supplier shortlist entries."
      />
    );
  }

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Phased roadmap</span>
        <div className="evaluation-roadmap-list">
          {roadmap.map((entry) => (
            <article
              className="workspace-inline-card evaluation-roadmap-item"
              key={`${entry.phase}-${entry.title}`}
            >
              <div className="workspace-data-card__header">
                <div>
                  <h3>{entry.phase}</h3>
                  <p>{entry.title}</p>
                </div>
                <span className="meta-chip">
                  {entry.actions.length} actions
                </span>
              </div>
              {listOrEmpty(
                entry.actions,
                'No phase actions were attached to this roadmap entry.',
              )}
            </article>
          ))}
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard>
        <span className="badge subtle">Supplier shortlist</span>
        <div className="evaluation-supplier-grid">
          {supplierShortlist.map((entry) => (
            <article
              className="workspace-inline-card"
              key={`${entry.category}-${entry.candidate_path}`}
            >
              <div className="workspace-data-card__header">
                <div>
                  <h3>{entry.category}</h3>
                  <p>{entry.candidate_path}</p>
                </div>
              </div>
              <p>{entry.fit_note}</p>
              {entry.missing_information_before_commitment.length > 0 ? (
                <div className="evaluation-callout evaluation-callout--warning">
                  <strong>Missing information before commitment</strong>
                  {listOrEmpty(
                    entry.missing_information_before_commitment,
                    'No additional information is required before commitment.',
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </WorkspaceDataCard>
    </div>
  );
}
