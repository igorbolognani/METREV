'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';

import type {
    ResearchColumnDefinition,
    ResearchDecisionIngestionPreview,
    ResearchEvidencePack,
    ResearchExtractionResult,
    ResearchPaperMetadata,
    ResearchReviewDetail,
} from '@metrev/domain-contracts';

import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import {
    addResearchColumn,
    createResearchEvidencePack,
    fetchResearchEvidencePackDecisionInput,
    fetchResearchReview,
    runResearchExtractions,
} from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

function resultKey(paperId: string, columnId: string) {
  return `${paperId}:${columnId}`;
}

function resultMap(review: ResearchReviewDetail) {
  return new Map(
    review.extraction_results.map((result) => [
      resultKey(result.paper_id, result.column_id),
      result,
    ]),
  );
}

function renderCell(result: ResearchExtractionResult | undefined) {
  if (!result) {
    return <span className="muted">Queued</span>;
  }

  if (result.status === 'invalid') {
    return <span className="error">Invalid</span>;
  }

  if (typeof result.answer === 'object' && result.answer !== null) {
    const answer = result.answer as Record<string, unknown>;
    if (typeof answer.summary === 'string') {
      return answer.summary;
    }
    if (Array.isArray(answer.technology_class)) {
      return answer.technology_class.join(', ');
    }
    if (Array.isArray(answer.electrochemical_metrics)) {
      return `${answer.electrochemical_metrics.length} metric(s)`;
    }
    if (Array.isArray(answer.performance_limitations)) {
      return `${answer.performance_limitations.length} limitation(s)`;
    }
    if (Array.isArray(answer.items)) {
      return answer.items.join('; ') || 'Not reported';
    }
  }

  return JSON.stringify(result.answer).slice(0, 180);
}

function visibleColumns(review: ResearchReviewDetail) {
  return review.columns.filter((column) => column.visible);
}

function AddColumnPanel({
  onAddColumn,
  pending,
}: {
  onAddColumn: (column: ResearchColumnDefinition) => void;
  pending: boolean;
}) {
  const [name, setName] = React.useState('Research Gaps');
  const [instructions, setInstructions] = React.useState(
    'Extract unresolved research gaps explicitly stated in the source.',
  );

  function submit() {
    const columnId = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    if (!columnId) {
      return;
    }

    onAddColumn({
      column_id: columnId,
      name,
      group: 'limitations',
      type: 'llm_extracted',
      answer_structure: 'specified',
      instructions,
      output_schema_key: 'generic_list',
      output_schema: {
        items: ['string'],
        evidence_span: 'string | null',
        confidence: 'low | medium | high',
      },
      visible: true,
      position: 0,
    });
  }

  return (
    <WorkspaceDataCard tone="accent">
      <div className="form-grid">
        <label>
          <span>Name</span>
          <input
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label>
          <span>Instructions</span>
          <textarea
            onChange={(event) => setInstructions(event.target.value)}
            value={instructions}
          />
        </label>
      </div>
      <div className="workspace-action-row">
        <button disabled={pending} onClick={submit} type="button">
          {pending ? 'Adding...' : 'Add column'}
        </button>
      </div>
    </WorkspaceDataCard>
  );
}

function PaperDetailsPanel({
  paper,
  results,
}: {
  paper: ResearchPaperMetadata;
  results: ResearchExtractionResult[];
}) {
  return (
    <WorkspaceDataCard>
      <h3>{paper.title}</h3>
      <p>{paper.abstract_text ?? 'No abstract stored.'}</p>
      <div className="workspace-chip-list compact">
        <span className="meta-chip">DOI {paper.doi ?? 'not stated'}</span>
        <span className="meta-chip">Year {paper.year ?? 'not stated'}</span>
        <span className="meta-chip">{formatToken(paper.source_type)}</span>
      </div>
      <ul className="list-block">
        {results.slice(0, 6).map((result) => (
          <li key={`${result.paper_id}-${result.column_id}`}>
            {formatToken(result.column_id)}: {result.confidence} confidence,{' '}
            {result.evidence_trace.length} trace(s)
          </li>
        ))}
      </ul>
    </WorkspaceDataCard>
  );
}

function EvidencePackViewer({
  decisionInput,
  pack,
}: {
  decisionInput: ResearchDecisionIngestionPreview | null;
  pack: ResearchEvidencePack | null;
}) {
  if (!pack) {
    return (
      <WorkspaceEmptyState
        description="Build an evidence pack after at least one extraction result is available."
        title="No evidence pack selected"
      />
    );
  }

  return (
    <WorkspaceDataCard tone="success">
      <h3>{pack.title}</h3>
      <div className="workspace-chip-list compact">
        <span className="meta-chip">{formatToken(pack.status)}</span>
        <span className="meta-chip">
          {pack.evidence_items.length} evidence items
        </span>
        <span className="meta-chip">{pack.metrics.length} metrics</span>
        <span className="meta-chip">{pack.confidence} confidence</span>
      </div>
      {decisionInput ? (
        <pre className="payload-preview">
          {JSON.stringify(
            {
              evidence_records: decisionInput.evidence_records.length,
              measured_metric_candidates:
                decisionInput.measured_metric_candidates,
              missing_data: decisionInput.missing_data,
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </WorkspaceDataCard>
  );
}

export function ResearchReviewDetailWorkspace({
  reviewId,
}: {
  reviewId: string;
}) {
  const queryClient = useQueryClient();
  const [pack, setPack] = React.useState<ResearchEvidencePack | null>(null);
  const query = useQuery({
    queryKey: ['research-review', reviewId],
    queryFn: () => fetchResearchReview(reviewId),
  });
  const selectedPackId =
    pack?.pack_id ?? query.data?.evidence_packs[0]?.pack_id;
  const decisionInputQuery = useQuery({
    queryKey: ['research-evidence-pack-decision-input', selectedPackId],
    queryFn: () => fetchResearchEvidencePackDecisionInput(selectedPackId!),
    enabled: Boolean(selectedPackId),
  });
  const extractionMutation = useMutation({
    mutationFn: () => runResearchExtractions(reviewId, { limit: 100 }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['research-review', reviewId],
      });
      await queryClient.invalidateQueries({ queryKey: ['research-reviews'] });
    },
  });
  const addColumnMutation = useMutation({
    mutationFn: (column: ResearchColumnDefinition) =>
      addResearchColumn(reviewId, column),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['research-review', reviewId],
      });
    },
  });
  const packMutation = useMutation({
    mutationFn: () =>
      createResearchEvidencePack(reviewId, {
        title: query.data ? `${query.data.title} evidence pack` : undefined,
        status: 'draft',
      }),
    onSuccess: async (createdPack) => {
      setPack(createdPack);
      await queryClient.invalidateQueries({
        queryKey: [
          'research-evidence-pack-decision-input',
          createdPack.pack_id,
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: ['research-review', reviewId],
      });
    },
  });

  if (query.isLoading) {
    return (
      <div className="workspace-page">
        <WorkspaceSkeleton lines={7} />
      </div>
    );
  }

  if (query.error) {
    return <p className="error">{query.error.message}</p>;
  }

  const review = query.data;
  if (!review) {
    return (
      <WorkspaceEmptyState
        description="The requested research review does not exist."
        primaryHref="/research/reviews"
        primaryLabel="Back to reviews"
        title="Review not found"
      />
    );
  }

  const columns = visibleColumns(review);
  const cells = resultMap(review);
  const queuedJobs = review.extraction_jobs.filter(
    (job) => job.status === 'queued',
  ).length;
  const selectedPack = pack ?? review.evidence_packs[0] ?? null;
  const decisionInput = selectedPack ? (decisionInputQuery.data ?? null) : null;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Link className="button secondary" href="/research/reviews">
              All reviews
            </Link>
            <button
              disabled={extractionMutation.isPending || queuedJobs === 0}
              onClick={() => extractionMutation.mutate()}
              type="button"
            >
              {extractionMutation.isPending
                ? 'Extracting...'
                : 'Run extraction'}
            </button>
            <button
              disabled={
                packMutation.isPending || review.extraction_results.length === 0
              }
              onClick={() => packMutation.mutate()}
              type="button"
            >
              {packMutation.isPending ? 'Building...' : 'Build pack'}
            </button>
          </>
        }
        badge="Research review"
        chips={[
          `${review.paper_count} papers`,
          `${columns.length} visible columns`,
          `${review.completed_result_count} results`,
          `${queuedJobs} queued`,
        ]}
        description={review.query}
        title={review.title}
      />

      <section className="workspace-stats-grid">
        <WorkspaceStatCard
          detail="Source-document rows attached to this review."
          label="Papers"
          tone="accent"
          value={review.paper_count}
        />
        <WorkspaceStatCard
          detail="Schema-backed table columns currently visible."
          label="Columns"
          value={columns.length}
        />
        <WorkspaceStatCard
          detail="Cell-level extraction results saved for this review."
          label="Results"
          tone="success"
          value={review.completed_result_count}
        />
      </section>

      <WorkspaceSection title="Review table" eyebrow="Living table">
        <div className="evidence-review-table-shell">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.column_id}>{column.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {review.papers.map((paper) => (
                <tr key={paper.paper_id}>
                  {columns.map((column) => (
                    <td key={`${paper.paper_id}-${column.column_id}`}>
                      {column.column_id === 'paper' ? (
                        <strong>{paper.title}</strong>
                      ) : (
                        renderCell(
                          cells.get(
                            resultKey(paper.paper_id, column.column_id),
                          ),
                        )
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Add structured column" eyebrow="Column registry">
        <AddColumnPanel
          onAddColumn={(column) => addColumnMutation.mutate(column)}
          pending={addColumnMutation.isPending}
        />
      </WorkspaceSection>

      <WorkspaceSection title="Paper details" eyebrow="Evidence trace">
        <div className="workspace-card-list">
          {review.papers.slice(0, 3).map((paper) => (
            <PaperDetailsPanel
              key={paper.paper_id}
              paper={paper}
              results={review.extraction_results.filter(
                (result) => result.paper_id === paper.paper_id,
              )}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Evidence pack" eyebrow="Decision bridge">
        <EvidencePackViewer decisionInput={decisionInput} pack={selectedPack} />
      </WorkspaceSection>
    </div>
  );
}
