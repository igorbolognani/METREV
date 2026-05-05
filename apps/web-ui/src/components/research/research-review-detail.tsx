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
    addResearchColumn,
    createResearchEvidencePack,
    fetchResearchEvidencePackDecisionInput,
    fetchResearchReview,
    runResearchExtractions,
} from '@/lib/api';
import { formatToken } from '@/lib/formatting';

void React;

type ResearchReviewDetailTab = 'table' | 'columns' | 'papers' | 'pack';

function resultKey(paperId: string, columnId: string) {
  return `${paperId}:${columnId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function collectStringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringList(entry));
  }

  return [];
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  if (Math.abs(value) >= 100) {
    return value.toFixed(1).replace(/\.0$/, '');
  }

  return value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function renderChipList(items: string[], emptyLabel = 'Not reported') {
  if (items.length === 0) {
    return <span className="muted">{emptyLabel}</span>;
  }

  return (
    <div className="workspace-chip-list compact">
      {items.map((item) => (
        <span className="meta-chip" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

function metricLabel(metric: unknown): string | null {
  const record = asRecord(metric);
  if (!record) {
    return null;
  }

  const metricKey = readString(record.metric_key);
  const originalValue = readNumber(record.original_value);
  const normalizedValue = readNumber(record.normalized_value);
  const originalUnit = readString(record.original_unit);
  const normalizedUnit = readString(record.normalized_unit);
  const value = normalizedValue ?? originalValue;
  const unit = normalizedUnit ?? originalUnit;

  if (!metricKey || value === null) {
    return null;
  }

  return `${formatToken(metricKey)} ${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
}

function summarizeOperatingConditions(answer: Record<string, unknown>) {
  const operatingConditions = asRecord(answer.operating_conditions);
  const substrateFeedstock = collectStringList(answer.substrate_feedstock).map(
    (value) => `substrate ${value}`,
  );
  const componentConditions = summarizeComponentParameters(answer, [
    'operating_condition',
  ]);

  const conditionChips = operatingConditions
    ? Object.entries(operatingConditions).flatMap(([key, value]) => {
        const stringValue = readString(value);
        if (stringValue) {
          return [`${formatToken(key)} ${stringValue}`];
        }

        const numericValue = readNumber(value);
        return numericValue === null
          ? []
          : [`${formatToken(key)} ${formatNumber(numericValue)}`];
      })
    : [];

  return [...substrateFeedstock, ...conditionChips, ...componentConditions];
}

function summarizeComponentParameters(
  answer: Record<string, unknown>,
  kinds?: string[],
) {
  const parameters = Array.isArray(answer.component_parameters)
    ? answer.component_parameters
    : [];

  return parameters.flatMap((entry) => {
    const parameter = asRecord(entry);
    if (!parameter) {
      return [];
    }

    const parameterKind = readString(parameter.parameter_kind);
    if (kinds && (!parameterKind || !kinds.includes(parameterKind))) {
      return [];
    }

    const componentType = readString(parameter.component_type);
    const label = readString(parameter.label);
    const textValue = readString(parameter.text_value);
    const originalValue = readString(parameter.original_value);
    const normalizedValue = readNumber(parameter.normalized_value);
    const normalizedUnit = readString(parameter.normalized_unit);
    const originalUnit = readString(parameter.original_unit);
    const value =
      textValue ??
      originalValue ??
      (normalizedValue === null ? null : formatNumber(normalizedValue));
    const unit = normalizedUnit ?? originalUnit;

    return label && value
      ? [
          `${componentType ? `${formatToken(componentType)} ` : ''}${label}: ${value}${unit ? ` ${unit}` : ''}`,
        ]
      : [];
  });
}

function summarizeDesignParameters(answer: Record<string, unknown>) {
  const reactor = asRecord(answer.reactor_architecture);
  if (!reactor) {
    return [];
  }

  return [
    readString(reactor.type),
    readNumber(reactor.useful_volume_ml) !== null
      ? `volume ${formatNumber(readNumber(reactor.useful_volume_ml)!)} mL`
      : null,
    readNumber(reactor.electrode_area_cm2) !== null
      ? `electrode area ${formatNumber(readNumber(reactor.electrode_area_cm2)!)} cm2`
      : null,
    readNumber(reactor.electrode_spacing_cm) !== null
      ? `spacing ${formatNumber(readNumber(reactor.electrode_spacing_cm)!)} cm`
      : null,
    readString(reactor.geometry)
      ? `geometry ${readString(reactor.geometry)}`
      : null,
    ...summarizeComponentParameters(answer, ['geometry', 'surface_property']),
  ].filter((value): value is string => Boolean(value));
}

function summarizeMaterialProperties(answer: Record<string, unknown>) {
  const anode = asRecord(answer.anode);
  const cathode = asRecord(answer.cathode);
  const membrane = asRecord(answer.membrane_or_separator);

  return [
    readString(anode?.material) ? `anode ${readString(anode?.material)}` : null,
    readString(anode?.modification)
      ? `anode mod ${readString(anode?.modification)}`
      : null,
    ...collectStringList(anode?.properties).map((value) => `anode ${value}`),
    readString(cathode?.material)
      ? `cathode ${readString(cathode?.material)}`
      : null,
    readString(cathode?.catalyst)
      ? `catalyst ${readString(cathode?.catalyst)}`
      : null,
    readNumber(cathode?.loading_mg_cm2) !== null
      ? `loading ${formatNumber(readNumber(cathode?.loading_mg_cm2)!)} mg/cm2`
      : null,
    ...collectStringList(cathode?.properties).map(
      (value) => `cathode ${value}`,
    ),
    readString(membrane?.type)
      ? `separator ${readString(membrane?.type)}`
      : null,
    ...collectStringList(membrane?.properties).map(
      (value) => `separator ${value}`,
    ),
    ...summarizeComponentParameters(answer, ['material', 'loading']),
  ].filter((value): value is string => Boolean(value));
}

function summarizeImplementationFactors(answer: Record<string, unknown>) {
  return [
    ...collectStringList(answer.scale_up_barriers),
    ...collectStringList(answer.economic_barriers),
    ...collectStringList(answer.durability_issues),
    ...collectStringList(answer.maturity_signals),
    ...collectStringList(answer.implementation_dependencies),
  ];
}

function summarizeLimitations(answer: Record<string, unknown>) {
  return [
    ...collectStringList(answer.implementation_limitations),
    ...collectStringList(answer.performance_limitations),
    ...collectStringList(answer.electrode_limitations),
    ...collectStringList(answer.membrane_limitations),
    ...collectStringList(answer.biofilm_limitations),
    ...collectStringList(answer.data_gaps),
  ];
}

function renderPaperCell(paper: ResearchPaperMetadata) {
  const paperChips = [
    paper.year ? `Year ${paper.year}` : null,
    paper.doi ? `DOI ${paper.doi}` : null,
    formatToken(paper.source_type),
  ].filter((value): value is string => Boolean(value));

  return (
    <div>
      <strong>{paper.title}</strong>
      <div className="workspace-chip-list compact">
        {paperChips.map((item) => (
          <span className="meta-chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function resultMap(review: ResearchReviewDetail) {
  return new Map(
    review.extraction_results.map((result) => [
      resultKey(result.paper_id, result.column_id),
      result,
    ]),
  );
}

function renderCell(
  column: ResearchColumnDefinition,
  result: ResearchExtractionResult | undefined,
) {
  if (!result) {
    return <span className="muted">Queued</span>;
  }

  if (result.status === 'invalid') {
    return <span className="error">Invalid</span>;
  }

  if (typeof result.answer === 'object' && result.answer !== null) {
    const answer = result.answer as Record<string, unknown>;
    if (column.column_id === 'summary') {
      return (
        readString(answer.summary) ?? (
          <span className="muted">Not reported</span>
        )
      );
    }

    if (column.column_id === 'technology_application') {
      const technology = collectStringList(answer.technology_class);
      const application = readString(answer.application);
      const scale = readString(answer.scale);
      return renderChipList(
        [
          ...technology,
          application ? `application ${application}` : null,
          scale ? `scale ${scale}` : null,
        ].filter((value): value is string => Boolean(value)),
      );
    }

    if (column.column_id === 'design_parameters') {
      return renderChipList(summarizeDesignParameters(answer));
    }

    if (column.column_id === 'material_properties') {
      return renderChipList(summarizeMaterialProperties(answer));
    }

    if (column.column_id === 'operating_conditions') {
      return renderChipList(summarizeOperatingConditions(answer));
    }

    if (column.column_id === 'performance_metrics') {
      const metrics = collectStringList(
        (Array.isArray(answer.electrochemical_metrics)
          ? answer.electrochemical_metrics
          : []
        ).map((metric) => metricLabel(metric)),
      ).concat(
        collectStringList(
          (Array.isArray(answer.treatment_metrics)
            ? answer.treatment_metrics
            : []
          ).map((metric) => metricLabel(metric)),
        ),
      );

      return renderChipList(metrics);
    }

    if (column.column_id === 'product_outputs') {
      return renderChipList(
        collectStringList(
          (Array.isArray(answer.product_outputs)
            ? answer.product_outputs
            : []
          ).map((metric) => metricLabel(metric)),
        ),
      );
    }

    if (column.column_id === 'limitations') {
      const items = summarizeLimitations(answer).concat(
        collectStringList(answer.items),
      );
      return renderChipList(items);
    }

    if (column.column_id === 'implementation_factors') {
      return renderChipList(summarizeImplementationFactors(answer));
    }

    if (column.column_id === 'data_metadata_readiness') {
      const summary = readString(answer.summary);
      const decisionReadiness = readString(answer.decision_use_readiness);
      const blockingGaps = collectStringList(answer.blocking_gaps);

      return (
        <div>
          {summary ? <div>{summary}</div> : null}
          {renderChipList(
            [
              decisionReadiness
                ? `decision use ${formatToken(decisionReadiness)}`
                : null,
              ...blockingGaps.map((gap) => `gap ${formatToken(gap)}`),
            ].filter((value): value is string => Boolean(value)),
            summary ? 'No readiness tags' : 'Not reported',
          )}
        </div>
      );
    }

    if (Array.isArray(answer.items)) {
      return answer.items.join('; ') || 'Not reported';
    }

    if (typeof answer.summary === 'string') {
      return answer.summary;
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
  columns,
  paper,
  results,
}: {
  columns: ResearchColumnDefinition[];
  paper: ResearchPaperMetadata;
  results: ResearchExtractionResult[];
}) {
  const visibleResultRows = columns
    .filter((column) => column.column_id !== 'paper')
    .map((column) => ({
      column,
      result: results.find((result) => result.column_id === column.column_id),
    }));

  return (
    <WorkspaceDataCard>
      <h3>{paper.title}</h3>
      <p>{paper.abstract_text ?? 'No abstract stored.'}</p>
      <div className="workspace-chip-list compact">
        <span className="meta-chip">DOI {paper.doi ?? 'not stated'}</span>
        <span className="meta-chip">Year {paper.year ?? 'not stated'}</span>
        <span className="meta-chip">{formatToken(paper.source_type)}</span>
      </div>
      <div className="evidence-review-table-shell">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Details</th>
              <th>Confidence</th>
              <th>Trace</th>
            </tr>
          </thead>
          <tbody>
            {visibleResultRows.map(({ column, result }) => (
              <tr key={`${paper.paper_id}-${column.column_id}`}>
                <td>
                  <strong>{column.name}</strong>
                </td>
                <td>{renderCell(column, result)}</td>
                <td>{result?.confidence ?? 'queued'}</td>
                <td>{result?.evidence_trace.length ?? 0} trace(s)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <>
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
          <div className="workspace-action-row">
            <Link
              className="button secondary"
              href={`/cases/new?researchPackId=${pack.pack_id}`}
            >
              Use in evaluation
            </Link>
          </div>
        </>
      ) : null}
    </WorkspaceDataCard>
  );
}

export function ResearchReviewDetailWorkspace({
  activeTab,
  onTabChange,
  reviewId,
}: {
  activeTab?: ResearchReviewDetailTab;
  onTabChange?: (nextTab: ResearchReviewDetailTab) => void;
  reviewId: string;
}) {
  const queryClient = useQueryClient();
  const [internalActiveTab, setInternalActiveTab] =
    React.useState<ResearchReviewDetailTab>('table');
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
        primaryHref="/admin/intelligence/research/reviews"
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
  const resolvedActiveTab = activeTab ?? internalActiveTab;
  const summaryItems = [
    {
      detail: 'Source-document rows attached to this review.',
      key: 'papers',
      label: 'Papers',
      tone: 'accent' as const,
      value: review.paper_count,
    },
    {
      detail: 'Schema-backed table columns currently visible.',
      key: 'columns',
      label: 'Columns',
      tone: 'default' as const,
      value: columns.length,
    },
    {
      detail: 'Cell-level extraction results saved for this review.',
      key: 'results',
      label: 'Results',
      tone: 'success' as const,
      value: review.completed_result_count,
    },
  ];

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        actions={
          <>
            <Link
              className="button secondary"
              href="/admin/intelligence/research/reviews"
            >
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

      <SummaryRail
        items={summaryItems}
        label="Research review detail summary"
      />

      <WorkspaceTabShell
        activeTab={resolvedActiveTab}
        items={[
          { value: 'table', label: 'Table', badge: review.paper_count },
          { value: 'columns', label: 'Columns', badge: columns.length },
          { value: 'papers', label: 'Papers', badge: review.papers.length },
          {
            value: 'pack',
            label: 'Pack',
            badge: selectedPack
              ? selectedPack.evidence_items.length
              : undefined,
          },
        ]}
        label="Research review detail tabs"
        onTabChange={(value) => {
          if (
            value === 'table' ||
            value === 'columns' ||
            value === 'papers' ||
            value === 'pack'
          ) {
            if (activeTab === undefined) {
              setInternalActiveTab(value);
            }
            onTabChange?.(value);
          }
        }}
        summary="Separate the living extraction table, column schema changes, paper context, and decision-pack bridge."
        title="Research detail layers"
      >
        <TabsContent value="table">
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
                          {column.column_id === 'paper'
                            ? renderPaperCell(paper)
                            : renderCell(
                                column,
                                cells.get(
                                  resultKey(paper.paper_id, column.column_id),
                                ),
                              )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="columns">
          <WorkspaceSection
            title="Add structured column"
            eyebrow="Column registry"
          >
            <AddColumnPanel
              onAddColumn={(column) => addColumnMutation.mutate(column)}
              pending={addColumnMutation.isPending}
            />
            <WorkspaceDataCard>
              <span className="badge subtle">Visible columns</span>
              <div className="workspace-chip-list compact">
                {columns.map((column) => (
                  <span className="meta-chip" key={column.column_id}>
                    {column.name}
                  </span>
                ))}
              </div>
            </WorkspaceDataCard>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="papers">
          <WorkspaceSection title="Paper details" eyebrow="Evidence trace">
            <div className="workspace-card-list">
              {review.papers.map((paper) => (
                <PaperDetailsPanel
                  columns={columns}
                  key={paper.paper_id}
                  paper={paper}
                  results={review.extraction_results.filter(
                    (result) => result.paper_id === paper.paper_id,
                  )}
                />
              ))}
            </div>
          </WorkspaceSection>
        </TabsContent>

        <TabsContent value="pack">
          <WorkspaceSection title="Evidence pack" eyebrow="Decision bridge">
            <EvidencePackViewer
              decisionInput={decisionInput}
              pack={selectedPack}
            />
          </WorkspaceSection>
        </TabsContent>
      </WorkspaceTabShell>
    </div>
  );
}
