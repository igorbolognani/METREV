'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
  PrintableEvaluationReportResponse,
  ReportConversationResponse,
} from '@metrev/domain-contracts';

import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import {
  WorkspaceDataCard,
  WorkspaceEmptyState,
  WorkspacePageHeader,
  WorkspaceSection,
  WorkspaceSkeleton,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { WorkspaceTabShell } from '@/components/workspace/workspace-tab-shell';
import {
  askReportConversation,
  fetchPrintableEvaluationReport,
} from '@/lib/api';
import { formatTimestamp, formatToken } from '@/lib/formatting';
import {
  usePrintableReportTab,
  type PrintableReportTab,
} from '@/lib/printable-report-view-query-state';

void React;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: ReportConversationResponse;
};

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

function formatPersistedUsage(
  value:
    | PrintableEvaluationReportResponse['evaluation_lineage']['source_usages'][number]
    | PrintableEvaluationReportResponse['evaluation_lineage']['claim_usages'][number],
) {
  const targetId =
    'source_document_id' in value ? value.source_document_id : value.claim_id;

  return `${formatToken(value.usage_type)} · ${targetId}${
    value.note ? ` · ${value.note}` : ''
  }`;
}

export function groupReportConversationCitations(
  citations: ReportConversationResponse['citations'],
) {
  const groups = {
    claim: [] as ReportConversationResponse['citations'],
    report: [] as ReportConversationResponse['citations'],
    source: [] as ReportConversationResponse['citations'],
  };

  for (const citation of citations) {
    if (
      citation.source_document_id ||
      citation.citation_id.startsWith('source:')
    ) {
      groups.source.push(citation);
      continue;
    }

    if (citation.claim_id || citation.citation_id.startsWith('claim:')) {
      groups.claim.push(citation);
      continue;
    }

    groups.report.push(citation);
  }

  return [
    { key: 'source', label: 'Source links', citations: groups.source },
    { key: 'claim', label: 'Claim links', citations: groups.claim },
    { key: 'report', label: 'Report anchors', citations: groups.report },
  ].filter((group) => group.citations.length > 0);
}

export function ReportConversationTrace({
  response,
}: {
  response: ReportConversationResponse;
}) {
  const selectedSectionLabel = response.grounding_summary.selected_section
    ? formatToken(response.grounding_summary.selected_section)
    : 'Whole report';
  const refusalStateLabel = response.refusal_reason
    ? 'Refusal applied'
    : 'Grounded answer';
  const citationGroups = groupReportConversationCitations(response.citations);

  return (
    <div className="report-conversation-trace">
      <div className="workspace-chip-list compact">
        <span className="meta-chip">Section {selectedSectionLabel}</span>
        <span
          className={`meta-chip ${response.refusal_reason ? 'meta-chip--warning' : 'meta-chip--success'}`}
        >
          {refusalStateLabel}
        </span>
        <span className="meta-chip">
          Sources {response.grounding_summary.source_usage_count}
        </span>
        <span className="meta-chip">
          Claims {response.grounding_summary.claim_usage_count}
        </span>
        <span className="meta-chip">
          Snapshots {response.grounding_summary.snapshot_count}
        </span>
      </div>
      <div className="report-conversation-trace__group">
        <span className="badge subtle">Uncertainty note</span>
        <p>{response.uncertainty_summary}</p>
      </div>
      {response.refusal_reason ? (
        <div className="report-conversation-trace__group">
          <span className="badge subtle">Refusal state</span>
          <p>{response.refusal_reason}</p>
        </div>
      ) : null}
      <div className="report-conversation-trace__group">
        <span className="badge subtle">Recommended next checks</span>
        {listOrEmpty(
          response.recommended_next_checks.slice(0, 4),
          'No follow-up checks were attached to this answer.',
        )}
      </div>
      {citationGroups.map((group) => (
        <div className="report-conversation-trace__group" key={group.key}>
          <span className="badge subtle">{group.label}</span>
          <div className="workspace-chip-list compact">
            {group.citations.map((citation) => (
              <span className="meta-chip" key={citation.citation_id}>
                {citation.label}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PrintableReportView({
  evaluationId,
}: {
  evaluationId: string;
}) {
  const [activeTab, setActiveTab] = usePrintableReportTab();
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

  return (
    <PrintableReportWorkspaceView
      activeTab={activeTab}
      onTabChange={(nextTab) => {
        void setActiveTab(nextTab);
      }}
      report={report}
    />
  );
}

export function PrintableReportWorkspaceView({
  activeTab = 'report',
  onTabChange,
  report,
}: {
  activeTab?: PrintableReportTab;
  onTabChange?: (nextTab: PrintableReportTab) => void;
  report: PrintableEvaluationReportResponse;
}) {
  const [conversationOpen, setConversationOpen] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(
    null,
  );
  const [question, setQuestion] = React.useState('');
  const [chatMessages, setChatMessages] = React.useState<ChatMessage[]>([]);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [isAsking, setIsAsking] = React.useState(false);
  const presentation = report.presentation;
  const tabs = presentation?.tabs.map((tab) => ({
    badge:
      tab.key === 'report'
        ? report.sections.prioritized_improvements.length +
          report.sections.supplier_shortlist.length
        : report.evaluation_lineage.source_usages.length +
          report.evaluation_lineage.claim_usages.length,
    label: tab.label,
    value: tab.key,
  })) ?? [
    { value: 'report', label: 'Report' },
    { value: 'audit', label: 'Audit' },
  ];
  const summaryItems = [
    {
      detail: report.sections.confidence_and_uncertainty_summary.summary,
      key: 'confidence',
      label: 'Confidence',
      tone: 'warning' as const,
      value: formatToken(
        report.sections.confidence_and_uncertainty_summary.confidence_level,
      ),
    },
    {
      detail:
        'Prioritized improvements stay visible in the printable consulting layer.',
      key: 'improvements',
      label: 'Improvements',
      tone: 'accent' as const,
      value: report.sections.prioritized_improvements.length,
    },
    {
      detail:
        'Qualified candidates remain paired with fit notes for export and review.',
      key: 'suppliers',
      label: 'Supplier candidates',
      tone: 'success' as const,
      value: report.sections.supplier_shortlist.length,
    },
    {
      detail: 'Roadmap phases remain explicit before printing or PDF export.',
      key: 'roadmap',
      label: 'Roadmap phases',
      value: report.sections.phased_roadmap.length,
    },
  ];

  async function handleAskReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isAsking) {
      return;
    }

    setQuestion('');
    setChatError(null);
    setIsAsking(true);
    setChatMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmedQuestion,
      },
    ]);

    try {
      const response = await askReportConversation(
        report.evaluation.evaluation_id,
        {
          message: trimmedQuestion,
          conversation_id: conversationId ?? undefined,
          selected_section: activeTab,
        },
      );
      setConversationId(response.conversation_id);
      setChatMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text:
            response.answer ??
            response.refusal_reason ??
            'Report conversation is unavailable in the current LLM mode.',
          response,
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="workspace-page report-page">
      <WorkspacePageHeader
        badge="Printable report"
        title={presentation?.page_title ?? report.title}
        description={presentation?.short_summary ?? report.subtitle}
        chips={[
          `Case ${report.evaluation.case_id}`,
          ...(presentation?.badges.map((badge) => badge.label) ?? [
            `Confidence ${formatToken(report.sections.confidence_and_uncertainty_summary.confidence_level)}`,
          ]),
          `Workspace schema ${report.meta.versions.workspace_schema_version}`,
        ]}
        actions={
          <>
            {presentation?.primary_actions?.[0]?.href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={presentation.primary_actions[0].href}>
                  {presentation.primary_actions[0].label}
                </Link>
              </Button>
            ) : null}
            <Button
              onClick={() => setConversationOpen((current) => !current)}
              size="sm"
              variant="outline"
            >
              Ask this report
            </Button>
            <Button onClick={() => window.print()} size="sm" variant="default">
              Print / Save as PDF
            </Button>
          </>
        }
      />

      <SummaryRail items={summaryItems} label="Printable report summary" />

      <WorkspaceTabShell
        activeTab={activeTab}
        items={tabs}
        label="Printable report tabs"
        onTabChange={(value) => {
          if (value === 'report' || value === 'audit') {
            onTabChange?.(value);
          }
        }}
        summary={
          presentation?.copy?.detail ??
          'Printable consulting output remains split between the report narrative and the audit-visible assumptions and lineage.'
        }
        title={presentation?.copy?.headline ?? 'Printable report'}
      >
        <TabsContent value="report">
          <div className="workspace-card-list">
            <WorkspaceSection
              eyebrow="Stack diagnosis"
              title="Current state and bottlenecks"
            >
              <WorkspaceDataCard>
                <h3>{report.sections.stack_diagnosis.summary}</h3>
                <ul className="list-block">
                  {report.sections.stack_diagnosis.block_findings.map(
                    (finding) => (
                      <li key={`${finding.block}-${finding.finding}`}>
                        <strong>{finding.block}</strong>: {finding.finding}
                      </li>
                    ),
                  )}
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
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="workspace-card-list">
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
                <p>
                  {report.sections.confidence_and_uncertainty_summary.summary}
                </p>
                <ul className="list-block">
                  {report.sections.confidence_and_uncertainty_summary.next_tests.map(
                    (entry) => (
                      <li key={entry}>{entry}</li>
                    ),
                  )}
                </ul>
              </WorkspaceDataCard>
            </WorkspaceSection>

            <WorkspaceSection
              eyebrow="Evidence lineage"
              title="Persisted provenance and snapshots"
            >
              <div className="workspace-detail-grid">
                <WorkspaceDataCard>
                  <h3>Persisted source usage</h3>
                  {listOrEmpty(
                    report.evaluation_lineage.source_usages.map((usage) =>
                      formatPersistedUsage(usage),
                    ),
                    'No persisted source usage records were attached to this report payload.',
                  )}
                </WorkspaceDataCard>
                <WorkspaceDataCard>
                  <h3>Persisted claim usage</h3>
                  {listOrEmpty(
                    report.evaluation_lineage.claim_usages.map((usage) =>
                      formatPersistedUsage(usage),
                    ),
                    'No persisted claim usage records were attached to this report payload.',
                  )}
                </WorkspaceDataCard>
              </div>
              <WorkspaceDataCard>
                <h3>Workspace snapshot inventory</h3>
                {listOrEmpty(
                  report.evaluation_lineage.workspace_snapshots.map(
                    (snapshot) =>
                      `${formatToken(snapshot.snapshot_type)} · ${formatTimestamp(snapshot.created_at)}`,
                  ),
                  'No immutable workspace snapshots were attached to this report payload.',
                )}
              </WorkspaceDataCard>
            </WorkspaceSection>
          </div>
        </TabsContent>
      </WorkspaceTabShell>

      {conversationOpen ? (
        <aside
          aria-label="Ask this report"
          className="report-conversation-drawer"
        >
          <div className="workspace-data-card__header">
            <div>
              <span className="badge subtle">Report grounded</span>
              <h3>Ask this report</h3>
              <p>
                Answers are constrained to this report, its audit summary, and
                persisted lineage.
              </p>
            </div>
            <Button
              aria-label="Close report conversation"
              onClick={() => setConversationOpen(false)}
              size="sm"
              variant="ghost"
            >
              Close
            </Button>
          </div>
          <div className="report-conversation-drawer__messages">
            {chatMessages.length === 0 ? (
              <p className="muted">
                Ask for clarification on diagnosis, recommendations, confidence,
                missing measurements, suppliers, or executive wording.
              </p>
            ) : null}
            {chatMessages.map((message) => (
              <article
                className={`report-conversation-message report-conversation-message--${message.role}`}
                key={message.id}
              >
                <strong>{message.role === 'user' ? 'You' : 'METREV'}</strong>
                <p>{message.text}</p>
                {message.response ? (
                  <ReportConversationTrace response={message.response} />
                ) : null}
              </article>
            ))}
            {chatError ? <p className="error">{chatError}</p> : null}
          </div>
          <form
            className="report-conversation-drawer__form"
            onSubmit={handleAskReport}
          >
            <textarea
              aria-label="Question about this report"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about the diagnosis, confidence, missing measurements, or recommendations..."
              rows={3}
              value={question}
            />
            <Button disabled={isAsking || !question.trim()} type="submit">
              {isAsking ? 'Asking...' : 'Ask'}
            </Button>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
