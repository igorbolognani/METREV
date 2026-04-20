'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';

import type { PrintableEvaluationReportResponse } from '@metrev/domain-contracts';

import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { fetchPrintableEvaluationReport } from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

export function PrintableReportView({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const query = useQuery({
    queryKey: ['printable-report', evaluationId],
    queryFn: () => fetchPrintableEvaluationReport(evaluationId),
  });

  if (query.isLoading) {
    return (
      <div className="workspace-page report-page">
        <WorkspaceSkeleton lines={8} />
      </div>
    );
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const report = query.data;
  if (!report) {
    return (
      <WorkspaceEmptyState
        title="Report unavailable"
        description="The printable report payload could not be loaded."
      />
    );
  }

  return <PrintableReportWorkspaceView report={report} />;
}

export function PrintableReportWorkspaceView({
  report,
}: {
  report: PrintableEvaluationReportResponse;
}) {
  return (
    <div className="workspace-page report-page">
      <WorkspacePageHeader
        badge="Printable report"
        title={report.title}
        description={report.subtitle}
        chips={[
          `Case ${report.evaluation.case_id}`,
          `Confidence ${formatToken(report.sections.confidence_and_uncertainty_summary.confidence_level)}`,
          `Workspace schema ${report.meta.versions.workspace_schema_version}`,
        ]}
        actions={
          <button
            className="button"
            type="button"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        }
      />

      <WorkspaceSection
        eyebrow="Stack diagnosis"
        title="Current state and bottlenecks"
      >
        <WorkspaceDataCard>
          <h3>{report.sections.stack_diagnosis.summary}</h3>
          <ul className="list-block">
            {report.sections.stack_diagnosis.block_findings.map((finding) => (
              <li key={`${finding.block}-${finding.finding}`}>
                <strong>{finding.block}</strong>: {finding.finding}
              </li>
            ))}
          </ul>
        </WorkspaceDataCard>
      </WorkspaceSection>

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Prioritized improvements"
          title="Action shortlist"
        >
          <div className="workspace-card-list">
            {report.sections.prioritized_improvements.map((entry) => (
              <WorkspaceDataCard key={entry.recommendation_id}>
                <h3>{formatToken(entry.recommendation_id)}</h3>
                <p>{entry.expected_benefit}</p>
                <p className="muted">{entry.rationale}</p>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>

        <WorkspaceSection eyebrow="Impact map" title="Expected leverage">
          <div className="workspace-card-list">
            {report.sections.impact_map.map((entry) => (
              <WorkspaceDataCard key={entry.option}>
                <h3>{formatToken(entry.option)}</h3>
                <p>{entry.technical_impact}</p>
                <p className="muted">{entry.economic_plausibility}</p>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>
      </div>

      <div className="workspace-split-grid">
        <WorkspaceSection
          eyebrow="Supplier shortlist"
          title="Qualified candidates"
        >
          <div className="workspace-card-list">
            {report.sections.supplier_shortlist.map((entry) => (
              <WorkspaceDataCard
                key={`${entry.category}-${entry.candidate_path}`}
              >
                <h3>{entry.category}</h3>
                <p>{entry.candidate_path}</p>
                <p className="muted">{entry.fit_note}</p>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>

        <WorkspaceSection eyebrow="Roadmap" title="Phased plan">
          <div className="workspace-card-list">
            {report.sections.phased_roadmap.map((entry) => (
              <WorkspaceDataCard key={`${entry.phase}-${entry.title}`}>
                <h3>{entry.phase}</h3>
                <p>{entry.title}</p>
                <ul className="list-block">
                  {entry.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </WorkspaceDataCard>
            ))}
          </div>
        </WorkspaceSection>
      </div>

      <WorkspaceSection
        eyebrow="Audit-visible assumptions"
        title="Defaults, missing data, and uncertainty"
      >
        <div className="workspace-detail-grid">
          <WorkspaceDataCard>
            <h3>Defaults used</h3>
            <ul className="list-block">
              {report.sections.assumptions_and_defaults_audit.defaults_used.map(
                (entry) => (
                  <li key={entry}>{entry}</li>
                ),
              )}
            </ul>
          </WorkspaceDataCard>
          <WorkspaceDataCard>
            <h3>Missing data</h3>
            <ul className="list-block">
              {report.sections.assumptions_and_defaults_audit.missing_data.map(
                (entry) => (
                  <li key={entry}>{entry}</li>
                ),
              )}
            </ul>
          </WorkspaceDataCard>
        </div>
        <WorkspaceDataCard>
          <h3>Confidence / uncertainty summary</h3>
          <p>{report.sections.confidence_and_uncertainty_summary.summary}</p>
          <ul className="list-block">
            {report.sections.confidence_and_uncertainty_summary.next_tests.map(
              (entry) => (
                <li key={entry}>{entry}</li>
              ),
            )}
          </ul>
        </WorkspaceDataCard>
      </WorkspaceSection>
    </div>
  );
}
