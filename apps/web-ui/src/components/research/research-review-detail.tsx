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

import { DenseTableShell } from '@/components/ui/dense-table';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import {
    WorkspaceDataCard,
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceSkeleton,
} from '@/components/workspace-chrome';
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
type ResearchPaperStatusFilter = 'all' | 'completed' | 'queued' | 'attention';
type ResearchColumnGroupKey =
  | 'overview'
  | 'bioelectrochemistry'
  | 'metrics'
  | 'decision';

const RESEARCH_FIELD_LABELS: Record<string, string> = {
  cod_removal_pct: 'COD removal',
  conductivity_ms_cm: 'Conductivity',
  current_density_a_m2: 'Current density',
  electrode_area_cm2: 'Electrode area',
  electrode_spacing_cm: 'Electrode spacing',
  HRT_h: 'HRT',
  pH: 'pH',
  power_density_w_m2: 'Power density',
  temperature_c: 'Temperature',
  useful_volume_ml: 'Volume',
};

const RESEARCH_FIELD_UNITS: Record<string, string> = {
  conductivity_ms_cm: 'mS/cm',
  electrode_area_cm2: 'cm2',
  electrode_spacing_cm: 'cm',
  HRT_h: 'h',
  temperature_c: 'C',
  useful_volume_ml: 'mL',
};

const RESEARCH_TABLE_GROUPS: Array<{
  columnIds: string[];
  description: string;
  key: ResearchColumnGroupKey;
  label: string;
}> = [
  {
    key: 'overview',
    label: 'Overview',
    description:
      'Summary, technology, core materials, key metrics, and implementation status.',
    columnIds: [
      'summary',
      'technology_application',
      'material_properties',
      'performance_metrics',
      'implementation_factors',
    ],
  },
  {
    key: 'bioelectrochemistry',
    label: 'Reactor & Materials',
    description:
      'Reactor architecture, materials, separator, and operating conditions.',
    columnIds: [
      'design_parameters',
      'material_properties',
      'operating_conditions',
    ],
  },
  {
    key: 'metrics',
    label: 'Metrics & Outputs',
    description: 'Electrochemical, treatment, and product output measurements.',
    columnIds: ['performance_metrics', 'product_outputs'],
  },
  {
    key: 'decision',
    label: 'Decision & Metadata',
    description:
      'Limitations, implementation factors, and readiness for analyst use.',
    columnIds: [
      'limitations',
      'implementation_factors',
      'data_metadata_readiness',
    ],
  },
];

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

function formatResearchFieldLabel(key: string) {
  return RESEARCH_FIELD_LABELS[key] ?? formatToken(key);
}

function formatResearchFieldValue(key: string, value: number) {
  const unit = RESEARCH_FIELD_UNITS[key];
  return `${formatResearchFieldLabel(key)} ${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function sanitizeVisibleText(value: unknown) {
  const rawValue = readString(value);
  if (!rawValue) {
    return null;
  }

  const decodedValue = decodeHtmlEntities(rawValue);
  const withoutTags = decodedValue.replace(/<\/?[\w:-]+\b[^>]*>/g, ' ');
  const normalizedValue = withoutTags
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function truncateVisibleText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeChipItems(items: string[]) {
  return items.flatMap((item) => {
    const sanitizedValue = sanitizeVisibleText(item);
    return sanitizedValue ? [sanitizedValue] : [];
  });
}

function renderChipList(
  items: string[],
  emptyLabel = 'Not reported',
  options?: {
    limit?: number;
  },
) {
  const normalizedItems = normalizeChipItems(items);
  if (normalizedItems.length === 0) {
    return <QuietState label={emptyLabel} />;
  }

  const limit = options?.limit;
  const visibleItems = limit
    ? normalizedItems.slice(0, limit)
    : normalizedItems;
  const hiddenCount = normalizedItems.length - visibleItems.length;

  return (
    <div className="workspace-chip-list compact">
      {visibleItems.map((item, index) => (
        <span className="meta-chip" key={`${item}-${index}`}>
          {item}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span className="meta-chip">+{hiddenCount} more</span>
      ) : null}
    </div>
  );
}

function QuietState({ label }: { label: string }) {
  return <span className="research-review-quiet-state">{label}</span>;
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

  return `${formatResearchFieldLabel(metricKey)} ${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
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
          return [`${formatResearchFieldLabel(key)} ${stringValue}`];
        }

        const numericValue = readNumber(value);
        return numericValue === null
          ? []
          : [formatResearchFieldValue(key, numericValue)];
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
    readString(cathode?.material)
      ? `cathode ${readString(cathode?.material)}`
      : null,
    readString(membrane?.type)
      ? `separator ${readString(membrane?.type)}`
      : null,
    readString(cathode?.catalyst)
      ? `catalyst ${readString(cathode?.catalyst)}`
      : null,
    readString(anode?.modification)
      ? `anode mod ${readString(anode?.modification)}`
      : null,
    ...collectStringList(anode?.properties).map((value) => `anode ${value}`),
    readNumber(cathode?.loading_mg_cm2) !== null
      ? `loading ${formatNumber(readNumber(cathode?.loading_mg_cm2)!)} mg/cm2`
      : null,
    ...collectStringList(cathode?.properties).map(
      (value) => `cathode ${value}`,
    ),
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

function paperMetaChips(paper: ResearchPaperMetadata) {
  const paperChips = [
    paper.year ? `Year ${paper.year}` : null,
    paper.doi ? `DOI ${paper.doi}` : null,
    sanitizeVisibleText(paper.journal)
      ? `Journal ${sanitizeVisibleText(paper.journal)}`
      : null,
    formatToken(paper.source_type),
  ].filter((value): value is string => Boolean(value));

  return paperChips;
}

function renderPaperCell(
  paper: ResearchPaperMetadata,
  options?: {
    compact?: boolean;
  },
) {
  const compact = options?.compact ?? false;
  const sanitizedTitle = sanitizeVisibleText(paper.title) ?? 'Untitled paper';
  const sanitizedAbstract = sanitizeVisibleText(paper.abstract_text);
  const preview = sanitizedAbstract
    ? truncateVisibleText(sanitizedAbstract, compact ? 180 : 320)
    : null;
  const paperChips = compact
    ? [
        paper.year ? `Year ${paper.year}` : null,
        formatToken(paper.source_type),
      ].filter((value): value is string => Boolean(value))
    : paperMetaChips(paper);

  return (
    <div className="research-review-paper-cell">
      <strong>{sanitizedTitle}</strong>
      {preview ? (
        <p className="research-review-paper-cell__preview">{preview}</p>
      ) : null}
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

function summarizeStructuredResult(answer: Record<string, unknown>) {
  const listKeys = ['items', 'gaps', 'missing_fields', 'validation_errors'];
  for (const key of listKeys) {
    const values = collectStringList(answer[key]);
    if (values.length > 0) {
      return values;
    }
  }

  const scalarEntries = Object.entries(answer)
    .filter(
      ([key]) =>
        ![
          'confidence',
          'evidence_trace',
          'evidence_span',
          'missing_fields',
          'validation_errors',
        ].includes(key),
    )
    .flatMap(([key, value]) => {
      const sanitizedValue = sanitizeVisibleText(value);
      if (sanitizedValue) {
        return [`${formatToken(key)}: ${sanitizedValue}`];
      }

      const numericValue = readNumber(value);
      return numericValue === null
        ? []
        : [`${formatToken(key)}: ${formatNumber(numericValue)}`];
    });

  return scalarEntries;
}

function renderResultFallback(
  answer: Record<string, unknown>,
  compact: boolean,
) {
  const summary = sanitizeVisibleText(answer.summary);
  if (summary) {
    return compact ? truncateVisibleText(summary, 180) : summary;
  }

  const evidenceSpan = sanitizeVisibleText(answer.evidence_span);
  if (evidenceSpan) {
    return compact ? truncateVisibleText(evidenceSpan, 180) : evidenceSpan;
  }

  const structuredItems = summarizeStructuredResult(answer);
  if (structuredItems.length > 0) {
    return renderChipList(structuredItems, 'Not reported', {
      limit: compact ? 3 : undefined,
    });
  }

  return <span className="muted">Structured result</span>;
}

function resultTraceCount(result: ResearchExtractionResult | undefined) {
  return result?.evidence_trace.length ?? 0;
}

function renderCell(
  column: ResearchColumnDefinition,
  result: ResearchExtractionResult | undefined,
  options?: {
    compact?: boolean;
  },
) {
  const compact = options?.compact ?? false;
  if (!result) {
    return <QuietState label="Queued" />;
  }

  if (result.status === 'invalid') {
    return (
      <div className="research-review-invalid-cell">
        <span className="error">Invalid</span>
        {collectStringList(
          (result.answer as Record<string, unknown>)?.validation_errors,
        )
          .slice(0, compact ? 2 : undefined)
          .map((message) => (
            <span className="muted" key={message}>
              {sanitizeVisibleText(message) ?? message}
            </span>
          ))}
      </div>
    );
  }

  if (typeof result.answer === 'object' && result.answer !== null) {
    const answer = result.answer as Record<string, unknown>;
    if (column.column_id === 'summary') {
      const summary = sanitizeVisibleText(answer.summary);
      if (!summary) {
        return <QuietState label="Not reported" />;
      }

      return compact ? truncateVisibleText(summary, 220) : summary;
    }

    if (column.column_id === 'technology_application') {
      const technology = collectStringList(answer.technology_class);
      const application = sanitizeVisibleText(answer.application);
      const scale = sanitizeVisibleText(answer.scale);
      return renderChipList(
        [
          ...technology,
          application ? `application ${application}` : null,
          scale ? `scale ${scale}` : null,
        ].filter((value): value is string => Boolean(value)),
        'Not reported',
        { limit: compact ? 3 : undefined },
      );
    }

    if (column.column_id === 'design_parameters') {
      return renderChipList(summarizeDesignParameters(answer), 'Not reported', {
        limit: compact ? 3 : undefined,
      });
    }

    if (column.column_id === 'material_properties') {
      return renderChipList(
        summarizeMaterialProperties(answer),
        'Not reported',
        {
          limit: compact ? 3 : undefined,
        },
      );
    }

    if (column.column_id === 'operating_conditions') {
      return renderChipList(
        summarizeOperatingConditions(answer),
        'Not reported',
        {
          limit: compact ? 3 : undefined,
        },
      );
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
      return renderChipList(metrics, 'Not reported', {
        limit: compact ? 4 : undefined,
      });
    }

    if (column.column_id === 'product_outputs') {
      return renderChipList(
        collectStringList(
          (Array.isArray(answer.product_outputs)
            ? answer.product_outputs
            : []
          ).map((metric) => metricLabel(metric)),
        ),
        'Not reported',
        { limit: compact ? 3 : undefined },
      );
    }

    if (column.column_id === 'limitations') {
      const items = summarizeLimitations(answer).concat(
        collectStringList(answer.items),
      );
      return renderChipList(items, 'Not reported', {
        limit: compact ? 3 : undefined,
      });
    }

    if (column.column_id === 'implementation_factors') {
      return renderChipList(
        summarizeImplementationFactors(answer),
        'Not reported',
        {
          limit: compact ? 3 : undefined,
        },
      );
    }

    if (column.column_id === 'data_metadata_readiness') {
      const summary = sanitizeVisibleText(answer.summary);
      const decisionReadiness = sanitizeVisibleText(
        answer.decision_use_readiness,
      );
      const blockingGaps = collectStringList(answer.blocking_gaps);

      return (
        <div className="research-review-cell-stack">
          {summary ? (
            <div>{compact ? truncateVisibleText(summary, 160) : summary}</div>
          ) : null}
          {renderChipList(
            [
              decisionReadiness
                ? `decision use ${formatToken(decisionReadiness)}`
                : null,
              ...blockingGaps.map((gap) => `gap ${formatToken(gap)}`),
            ].filter((value): value is string => Boolean(value)),
            summary ? 'No readiness tags' : 'Not reported',
            { limit: compact ? 3 : undefined },
          )}
        </div>
      );
    }

    if (Array.isArray(answer.items)) {
      const items = collectStringList(answer.items);
      if (items.length > 0) {
        return renderChipList(items, 'Not reported', {
          limit: compact ? 3 : undefined,
        });
      }
    }

    return renderResultFallback(answer, compact);
  }

  const scalarValue = sanitizeVisibleText(String(result.answer));
  return scalarValue ? (
    compact ? (
      truncateVisibleText(scalarValue, 180)
    ) : (
      scalarValue
    )
  ) : (
    <QuietState label="Not reported" />
  );
}

function formatPreviewValue(value: unknown) {
  const stringValue = sanitizeVisibleText(value);
  if (stringValue) {
    return stringValue;
  }

  const numericValue = readNumber(value);
  if (numericValue !== null) {
    return formatNumber(numericValue);
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (value && typeof value === 'object') {
    return truncateVisibleText(JSON.stringify(value), 120);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return 'Not reported';
}

function metricCandidateEntries(
  decisionInput: ResearchDecisionIngestionPreview,
) {
  return Object.entries(decisionInput.measured_metric_candidates).slice(0, 6);
}

function visibleColumns(review: ResearchReviewDetail) {
  return review.columns.filter((column) => column.visible);
}

function paperCompletionSummary(
  paperId: string,
  columns: ResearchColumnDefinition[],
  cells: Map<string, ResearchExtractionResult>,
) {
  return columns
    .filter((column) => column.column_id !== 'paper')
    .reduce(
      (summary, column) => {
        const result = cells.get(resultKey(paperId, column.column_id));
        if (!result) {
          summary.queued += 1;
          return summary;
        }

        if (result.status === 'invalid') {
          summary.invalid += 1;
        } else {
          summary.completed += 1;
        }

        summary.traces += resultTraceCount(result);
        return summary;
      },
      { completed: 0, invalid: 0, queued: 0, traces: 0 },
    );
}

function paperStatusFilterValue(
  paperId: string,
  columns: ResearchColumnDefinition[],
  cells: Map<string, ResearchExtractionResult>,
): Exclude<ResearchPaperStatusFilter, 'all'> {
  const summary = paperCompletionSummary(paperId, columns, cells);
  if (summary.invalid > 0) {
    return 'attention';
  }

  if (summary.queued > 0) {
    return 'queued';
  }

  return 'completed';
}

function matchesPaperSearchQuery(
  paper: ResearchPaperMetadata,
  searchQuery: string,
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  const searchHaystack = [
    sanitizeVisibleText(paper.title),
    sanitizeVisibleText(paper.doi),
    sanitizeVisibleText(paper.journal),
    sanitizeVisibleText(paper.publisher),
    sanitizeVisibleText(paper.abstract_text),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase();

  return searchHaystack.includes(normalizedQuery);
}

function ResearchReviewRow({
  activeGroup,
  activeGroupColumns,
  cells,
  columns,
  expanded,
  onToggleExpanded,
  paper,
}: {
  activeGroup: (typeof RESEARCH_TABLE_GROUPS)[number];
  activeGroupColumns: ResearchColumnDefinition[];
  cells: Map<string, ResearchExtractionResult>;
  columns: ResearchColumnDefinition[];
  expanded: boolean;
  onToggleExpanded: () => void;
  paper: ResearchPaperMetadata;
}) {
  const completion = paperCompletionSummary(paper.paper_id, columns, cells);
  const summaryColumn = columns.find(
    (column) => column.column_id === 'summary',
  );
  const insightColumns = activeGroupColumns.filter(
    (column) => column.column_id !== 'summary',
  );
  const results = columns
    .filter((column) => column.column_id !== 'paper')
    .map((column) => cells.get(resultKey(paper.paper_id, column.column_id)))
    .filter(
      (result): result is ResearchExtractionResult => result !== undefined,
    );

  return (
    <article
      className={
        expanded
          ? 'research-review-row research-review-row--expanded'
          : 'research-review-row'
      }
    >
      <div className="research-review-row__main">
        <div className="research-review-row__paper">
          <span className="research-review-row__eyebrow">Paper</span>
          {renderPaperCell(paper, { compact: true })}
          <div className="research-review-table__paper-meta">
            <span>{completion.completed} completed</span>
            <span>{completion.queued} queued</span>
            <span>{completion.invalid} invalid</span>
            <span>{completion.traces} traces</span>
          </div>
        </div>

        <div className="research-review-row__summary">
          <span className="research-review-row__eyebrow">Summary</span>
          <div className="research-review-row__summary-body">
            {summaryColumn ? (
              renderCell(
                summaryColumn,
                cells.get(resultKey(paper.paper_id, summaryColumn.column_id)),
                { compact: true },
              )
            ) : (
              <span className="muted">Not reported</span>
            )}
          </div>
        </div>

        <div className="research-review-row__insights">
          {insightColumns.length > 0 ? (
            insightColumns.map((column) => (
              <div
                className="research-review-row__insight-card"
                key={`${paper.paper_id}-${column.column_id}`}
              >
                <span className="research-review-row__eyebrow">
                  {column.name}
                </span>
                <div className="research-review-row__insight-body">
                  {renderCell(
                    column,
                    cells.get(resultKey(paper.paper_id, column.column_id)),
                    { compact: true },
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="research-review-row__insight-card">
              <span className="research-review-row__eyebrow">
                {activeGroup.label}
              </span>
              <QuietState label="No visible columns in this group" />
            </div>
          )}
        </div>

        <div className="research-review-row__actions">
          <span className="meta-chip">{activeGroup.label}</span>
          <button onClick={onToggleExpanded} type="button">
            {expanded ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      {expanded ? (
        <PaperDetailsPanel
          columns={columns}
          paper={paper}
          results={results}
          variant="inline"
        />
      ) : null}
    </article>
  );
}

function ResearchReviewTable({
  cells,
  columns,
  papers,
}: {
  cells: Map<string, ResearchExtractionResult>;
  columns: ResearchColumnDefinition[];
  papers: ResearchPaperMetadata[];
}) {
  const [expandedPaperId, setExpandedPaperId] = React.useState<string | null>(
    null,
  );
  const [activeGroup, setActiveGroup] =
    React.useState<ResearchColumnGroupKey>('overview');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] =
    React.useState<ResearchPaperStatusFilter>('all');
  const activeGroupConfig =
    RESEARCH_TABLE_GROUPS.find((group) => group.key === activeGroup) ??
    RESEARCH_TABLE_GROUPS[0];
  const activeGroupColumns = React.useMemo(
    () =>
      activeGroupConfig.columnIds.flatMap((columnId) => {
        const column = columns.find((entry) => entry.column_id === columnId);
        return column ? [column] : [];
      }),
    [activeGroupConfig.columnIds, columns],
  );

  const filteredPapers = React.useMemo(() => {
    return papers.filter((paper) => {
      if (statusFilter !== 'all') {
        const paperStatus = paperStatusFilterValue(
          paper.paper_id,
          columns,
          cells,
        );
        if (paperStatus !== statusFilter) {
          return false;
        }
      }

      return matchesPaperSearchQuery(paper, searchQuery);
    });
  }, [cells, columns, papers, searchQuery, statusFilter]);

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPapers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart =
    filteredPapers.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const pagedPapers = filteredPapers.slice(pageStart, pageStart + pageSize);
  const statusCounts = React.useMemo(
    () => ({
      attention: papers.filter(
        (paper) =>
          paperStatusFilterValue(paper.paper_id, columns, cells) ===
          'attention',
      ).length,
      completed: papers.filter(
        (paper) =>
          paperStatusFilterValue(paper.paper_id, columns, cells) ===
          'completed',
      ).length,
      queued: papers.filter(
        (paper) =>
          paperStatusFilterValue(paper.paper_id, columns, cells) === 'queued',
      ).length,
    }),
    [cells, columns, papers],
  );

  React.useEffect(() => {
    if (
      expandedPaperId &&
      !pagedPapers.some((paper) => paper.paper_id === expandedPaperId)
    ) {
      setExpandedPaperId(null);
    }
  }, [expandedPaperId, pagedPapers]);

  return (
    <div className="research-review-table-panel">
      <div className="research-review-table-toolbar">
        <div className="research-review-table-toolbar__filters">
          <label className="research-review-table-toolbar__field">
            <span>Search papers</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Title, DOI, journal, publisher"
              type="search"
              value={searchQuery}
            />
          </label>
          <label className="research-review-table-toolbar__field">
            <span>Status</span>
            <select
              onChange={(event) =>
                setStatusFilter(event.target.value as ResearchPaperStatusFilter)
              }
              value={statusFilter}
            >
              <option value="all">All papers</option>
              <option value="completed">Completed only</option>
              <option value="queued">Queued only</option>
              <option value="attention">Needs attention</option>
            </select>
          </label>
          <label className="research-review-table-toolbar__field research-review-table-toolbar__field--compact">
            <span>Rows per page</span>
            <select
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              {[25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="research-review-table-toolbar__meta">
          <div className="workspace-chip-list compact">
            <span className="meta-chip">
              {filteredPapers.length} of {papers.length} papers
            </span>
            <span className="meta-chip">
              {statusCounts.completed} completed
            </span>
            <span className="meta-chip">{statusCounts.queued} queued</span>
            <span className="meta-chip">
              {statusCounts.attention} attention
            </span>
          </div>
          <div className="research-review-table-toolbar__pagination">
            <span>
              {filteredPapers.length === 0
                ? 'No matching papers'
                : `Showing ${pageStart + 1}-${Math.min(
                    pageStart + pageSize,
                    filteredPapers.length,
                  )} of ${filteredPapers.length}`}
            </span>
            <div className="workspace-action-row">
              <button
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((currentValue) => Math.max(1, currentValue - 1))
                }
                type="button"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((currentValue) =>
                    Math.min(totalPages, currentValue + 1),
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="research-review-group-bar">
        <div className="research-review-group-bar__copy">
          <strong>{activeGroupConfig.label}</strong>
          <span>{activeGroupConfig.description}</span>
        </div>
        <div
          aria-label="Research review column groups"
          className="research-review-group-bar__actions"
          role="tablist"
        >
          {RESEARCH_TABLE_GROUPS.map((group) => {
            const isActive = group.key === activeGroup;

            return (
              <button
                aria-selected={isActive}
                className={
                  isActive
                    ? 'research-review-group-trigger research-review-group-trigger--active'
                    : 'research-review-group-trigger'
                }
                key={group.key}
                onClick={() => setActiveGroup(group.key)}
                role="tab"
                type="button"
              >
                <span>{group.label}</span>
                <span className="research-review-group-trigger__badge">
                  {group.columnIds.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {pagedPapers.length === 0 ? (
        <WorkspaceEmptyState
          description="No papers match the current search or status filters."
          title="No matching papers"
        />
      ) : (
        <div className="research-review-row-list">
          {pagedPapers.map((paper) => {
            const expanded = expandedPaperId === paper.paper_id;

            return (
              <ResearchReviewRow
                activeGroup={activeGroupConfig}
                activeGroupColumns={activeGroupColumns}
                cells={cells}
                columns={columns}
                expanded={expanded}
                key={paper.paper_id}
                onToggleExpanded={() =>
                  setExpandedPaperId((currentValue) =>
                    currentValue === paper.paper_id ? null : paper.paper_id,
                  )
                }
                paper={paper}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResearchPaperBrowser({
  cells,
  columns,
  papers,
}: {
  cells: Map<string, ResearchExtractionResult>;
  columns: ResearchColumnDefinition[];
  papers: ResearchPaperMetadata[];
}) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] =
    React.useState<ResearchPaperStatusFilter>('all');

  const filteredPapers = React.useMemo(
    () =>
      papers.filter((paper) => {
        if (statusFilter !== 'all') {
          const paperStatus = paperStatusFilterValue(
            paper.paper_id,
            columns,
            cells,
          );
          if (paperStatus !== statusFilter) {
            return false;
          }
        }

        return matchesPaperSearchQuery(paper, searchQuery);
      }),
    [cells, columns, papers, searchQuery, statusFilter],
  );

  React.useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPapers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart =
    filteredPapers.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const pagedPapers = filteredPapers.slice(pageStart, pageStart + pageSize);

  return (
    <div className="research-review-table-panel">
      <div className="research-review-table-toolbar">
        <div className="research-review-table-toolbar__filters">
          <label className="research-review-table-toolbar__field">
            <span>Search papers</span>
            <input
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Title, DOI, journal, publisher"
              type="search"
              value={searchQuery}
            />
          </label>
          <label className="research-review-table-toolbar__field">
            <span>Status</span>
            <select
              onChange={(event) =>
                setStatusFilter(event.target.value as ResearchPaperStatusFilter)
              }
              value={statusFilter}
            >
              <option value="all">All papers</option>
              <option value="completed">Completed only</option>
              <option value="queued">Queued only</option>
              <option value="attention">Needs attention</option>
            </select>
          </label>
          <label className="research-review-table-toolbar__field research-review-table-toolbar__field--compact">
            <span>Cards per page</span>
            <select
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              {[12, 24, 48].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="research-review-table-toolbar__meta">
          <div className="workspace-chip-list compact">
            <span className="meta-chip">
              {filteredPapers.length} of {papers.length} papers
            </span>
          </div>
          <div className="research-review-table-toolbar__pagination">
            <span>
              {filteredPapers.length === 0
                ? 'No matching papers'
                : `Showing ${pageStart + 1}-${Math.min(
                    pageStart + pageSize,
                    filteredPapers.length,
                  )} of ${filteredPapers.length}`}
            </span>
            <div className="workspace-action-row">
              <button
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((currentValue) => Math.max(1, currentValue - 1))
                }
                type="button"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((currentValue) =>
                    Math.min(totalPages, currentValue + 1),
                  )
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {pagedPapers.length === 0 ? (
        <WorkspaceEmptyState
          description="No papers match the current search or status filters."
          title="No matching papers"
        />
      ) : (
        <div className="workspace-card-list research-review-paper-browser-grid">
          {pagedPapers.map((paper) => (
            <PaperDetailsPanel
              columns={columns}
              key={paper.paper_id}
              paper={paper}
              results={columns
                .filter((column) => column.column_id !== 'paper')
                .map((column) =>
                  cells.get(resultKey(paper.paper_id, column.column_id)),
                )
                .filter(
                  (result): result is ResearchExtractionResult =>
                    result !== undefined,
                )}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  variant = 'card',
}: {
  columns: ResearchColumnDefinition[];
  paper: ResearchPaperMetadata;
  results: ResearchExtractionResult[];
  variant?: 'card' | 'inline';
}) {
  const visibleResultRows = columns
    .filter((column) => column.column_id !== 'paper')
    .map((column) => ({
      column,
      result: results.find((result) => result.column_id === column.column_id),
    }));

  const content = (
    <div className="research-review-paper-detail">
      <div className="research-review-paper-detail__header">
        <div>
          <h3>{sanitizeVisibleText(paper.title) ?? 'Untitled paper'}</h3>
          <p>
            {sanitizeVisibleText(paper.abstract_text) ?? 'No abstract stored.'}
          </p>
        </div>
        <div className="workspace-chip-list compact">
          {paperMetaChips(paper).map((item) => (
            <span className="meta-chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <DenseTableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Column</TableHeaderCell>
              <TableHeaderCell>Details</TableHeaderCell>
              <TableHeaderCell>Confidence</TableHeaderCell>
              <TableHeaderCell>Trace</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {visibleResultRows.map(({ column, result }) => (
              <TableRow key={`${paper.paper_id}-${column.column_id}`}>
                <TableCell>
                  <strong>{column.name}</strong>
                </TableCell>
                <TableCell>{renderCell(column, result)}</TableCell>
                <TableCell>{result?.confidence ?? 'queued'}</TableCell>
                <TableCell>{resultTraceCount(result)} trace(s)</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DenseTableShell>
    </div>
  );

  if (variant === 'inline') {
    return content;
  }

  return <WorkspaceDataCard>{content}</WorkspaceDataCard>;
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
          <div className="research-evidence-pack-summary">
            <article className="research-evidence-pack-summary__item">
              <span>Evidence Records</span>
              <strong>{decisionInput.evidence_records.length}</strong>
              <p>Reviewed evidence records available for intake.</p>
            </article>
            <article className="research-evidence-pack-summary__item">
              <span>Metric Candidates</span>
              <strong>
                {Object.keys(decisionInput.measured_metric_candidates).length}
              </strong>
              {metricCandidateEntries(decisionInput).length > 0 ? (
                <div className="research-evidence-pack-summary__list">
                  {metricCandidateEntries(decisionInput).map(([key, value]) => (
                    <span key={key}>
                      <b>{key}</b> {formatPreviewValue(value)}
                    </span>
                  ))}
                </div>
              ) : (
                <QuietState label="No measured metrics reported" />
              )}
            </article>
            <article className="research-evidence-pack-summary__item">
              <span>Missing Data</span>
              <strong>{decisionInput.missing_data.length}</strong>
              {decisionInput.missing_data.length > 0 ? (
                renderChipList(decisionInput.missing_data, 'No missing data')
              ) : (
                <QuietState label="No missing data flagged" />
              )}
            </article>
            <article className="research-evidence-pack-summary__item">
              <span>Assumptions</span>
              <strong>{decisionInput.assumptions.length}</strong>
              {decisionInput.assumptions.length > 0 ? (
                renderChipList(decisionInput.assumptions, 'No assumptions')
              ) : (
                <QuietState label="No assumptions stated" />
              )}
            </article>
          </div>
          <details className="research-evidence-pack-raw">
            <summary>Raw decision preview</summary>
            <pre className="code-block payload-preview">
              {JSON.stringify(
                {
                  evidence_records: decisionInput.evidence_records.length,
                  measured_metric_candidates:
                    decisionInput.measured_metric_candidates,
                  missing_data: decisionInput.missing_data,
                  assumptions: decisionInput.assumptions,
                },
                null,
                2,
              )}
            </pre>
          </details>
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
  return (
    <div className="workspace-page research-review-workspace">
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
          <WorkspaceSection
            className="research-review-table-section"
            title="Review table"
            eyebrow="Living table"
          >
            <ResearchReviewTable
              cells={cells}
              columns={columns}
              papers={review.papers}
            />
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
            <ResearchPaperBrowser
              cells={cells}
              columns={columns}
              papers={review.papers}
            />
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
