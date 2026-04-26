'use client';

import type { EvaluationResponse } from '@metrev/domain-contracts';
import Link from 'next/link';
import * as React from 'react';

import {
    WorkspaceDataCard,
    WorkspaceSection,
} from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

export function EvaluationReportTab({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  const decision = evaluation.decision_output;
  const reportHref = `/evaluations/${evaluation.evaluation_id}/report`;

  return (
    <div className="workspace-card-list">
      <WorkspaceSection
        eyebrow="Client deliverable"
        title="Report-ready output"
      >
        <WorkspaceDataCard>
          <div className="workspace-data-card__header">
            <div>
              <h3>{evaluation.case_id} report</h3>
              <p>{decision.current_stack_diagnosis.summary}</p>
            </div>
            <Link className="button" href={reportHref}>
              Open printable report
            </Link>
          </div>
        </WorkspaceDataCard>
      </WorkspaceSection>

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <span className="badge subtle">Report sections</span>
          <ul className="list-block">
            <li>Stack diagnosis</li>
            <li>{decision.prioritized_improvement_options.length} prioritized improvements</li>
            <li>{decision.impact_map.length} impact map entries</li>
            <li>{decision.supplier_shortlist.length} supplier candidates</li>
            <li>{decision.phased_roadmap.length} roadmap phases</li>
            <li>Assumptions, defaults, and uncertainty summary</li>
          </ul>
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <span className="badge subtle">Confidence</span>
          <h3>
            {formatToken(
              decision.confidence_and_uncertainty_summary.confidence_level,
            )}
          </h3>
          <p>{decision.confidence_and_uncertainty_summary.summary}</p>
        </WorkspaceDataCard>
      </div>
    </div>
  );
}

