'use client';

import type { RecommendationRecord } from '@metrev/domain-contracts';
import Link from 'next/link';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from '@/components/ui/table';
import { WorkspaceEmptyState } from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

type RecommendationSortKey =
  | 'title'
  | 'priority_score'
  | 'expected_benefit'
  | 'implementation_effort'
  | 'confidence_level'
  | 'risk_level'
  | 'maturity_level'
  | 'economic_plausibility';

type SortDirection = 'asc' | 'desc';

const levelScore: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function badgeVariantForLevel(
  value?: string,
): 'accepted' | 'info' | 'muted' | 'pending' | 'rejected' {
  switch (value) {
    case 'high':
      return 'accepted';
    case 'medium':
      return 'info';
    case 'low':
      return 'pending';
    default:
      return 'muted';
  }
}

function sortValue(
  recommendation: RecommendationRecord,
  key: RecommendationSortKey,
): number | string {
  switch (key) {
    case 'title':
      return formatToken(recommendation.recommendation_id);
    case 'priority_score':
      return recommendation.priority_score ?? -1;
    case 'expected_benefit':
      return recommendation.expected_benefit;
    case 'implementation_effort':
      return levelScore[recommendation.implementation_effort] ?? 0;
    case 'confidence_level':
      return levelScore[recommendation.confidence_level] ?? 0;
    case 'risk_level':
      return levelScore[recommendation.risk_level] ?? 0;
    case 'maturity_level':
      return levelScore[recommendation.maturity_level] ?? 0;
    case 'economic_plausibility':
      return levelScore[recommendation.economic_plausibility] ?? 0;
    default:
      return '';
  }
}

export function sortRecommendations(
  recommendations: RecommendationRecord[],
  key: RecommendationSortKey,
  direction: SortDirection,
) {
  return [...recommendations].sort((left, right) => {
    const leftValue = sortValue(left, key);
    const rightValue = sortValue(right, key);
    const comparison =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue));

    return direction === 'asc' ? comparison : comparison * -1;
  });
}

function textList(items: string[], emptyMessage: string, ordered = false) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <ListTag className="list-block">
      {items.map((entry) => (
        <li key={entry}>{entry}</li>
      ))}
    </ListTag>
  );
}

function referenceLink(href: string, label: string) {
  return (
    <Link
      className="meta-chip evaluation-link-chip"
      href={href}
      key={`${href}-${label}`}
      onClick={(event) => event.stopPropagation()}
    >
      {label}
    </Link>
  );
}

export interface EvaluationRecommendationsTableProps {
  defaultExpandedIds?: string[];
  evaluationId: string;
  recommendations: RecommendationRecord[];
}

export function EvaluationRecommendationsTable({
  defaultExpandedIds = [],
  evaluationId,
  recommendations,
}: EvaluationRecommendationsTableProps) {
  const [expandedIds, setExpandedIds] =
    React.useState<string[]>(defaultExpandedIds);
  const [sortKey, setSortKey] =
    React.useState<RecommendationSortKey>('priority_score');
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>('desc');

  const sortedRecommendations = React.useMemo(
    () => sortRecommendations(recommendations, sortKey, sortDirection),
    [recommendations, sortDirection, sortKey],
  );

  if (recommendations.length === 0) {
    return (
      <WorkspaceEmptyState
        title="No recommendations"
        description="The evaluation did not return prioritized improvement options."
      />
    );
  }

  const toggleSort = (nextKey: RecommendationSortKey) => {
    if (nextKey === sortKey) {
      setSortDirection((currentValue) =>
        currentValue === 'asc' ? 'desc' : 'asc',
      );
      return;
    }

    setSortKey(nextKey);
    setSortDirection('desc');
  };

  const toggleExpanded = (recommendationId: string) => {
    setExpandedIds((currentValue) =>
      currentValue.includes(recommendationId)
        ? currentValue.filter((entry) => entry !== recommendationId)
        : [...currentValue, recommendationId],
    );
  };

  const sortIndicator = (key: RecommendationSortKey) =>
    sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕';

  return (
    <div className="evaluation-table-shell">
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Rank</TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('title')}
                type="button"
              >
                <span>Title</span>
                <span>{sortIndicator('title')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('priority_score')}
                type="button"
              >
                <span>Priority</span>
                <span>{sortIndicator('priority_score')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('expected_benefit')}
                type="button"
              >
                <span>Expected Benefit</span>
                <span>{sortIndicator('expected_benefit')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('implementation_effort')}
                type="button"
              >
                <span>Effort</span>
                <span>{sortIndicator('implementation_effort')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('confidence_level')}
                type="button"
              >
                <span>Confidence</span>
                <span>{sortIndicator('confidence_level')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('risk_level')}
                type="button"
              >
                <span>Risk</span>
                <span>{sortIndicator('risk_level')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('maturity_level')}
                type="button"
              >
                <span>Maturity</span>
                <span>{sortIndicator('maturity_level')}</span>
              </button>
            </TableHeaderCell>
            <TableHeaderCell>
              <button
                className="evaluation-sort-trigger"
                onClick={() => toggleSort('economic_plausibility')}
                type="button"
              >
                <span>Economic Plausibility</span>
                <span>{sortIndicator('economic_plausibility')}</span>
              </button>
            </TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {sortedRecommendations.map((recommendation, index) => {
            const expanded = expandedIds.includes(
              recommendation.recommendation_id,
            );

            return (
              <React.Fragment key={recommendation.recommendation_id}>
                <TableRow
                  className="evaluation-recommendation-row"
                  expandable
                  onToggleExpand={() =>
                    toggleExpanded(recommendation.recommendation_id)
                  }
                  selected={expanded}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="evaluation-recommendation-title">
                      <strong>
                        {formatToken(recommendation.recommendation_id)}
                      </strong>
                      <span>{recommendation.evidence_strength_summary}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {recommendation.priority_score ?? 'n/a'}
                  </TableCell>
                  <TableCell>{recommendation.expected_benefit}</TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariantForLevel(
                        recommendation.implementation_effort,
                      )}
                    >
                      {formatToken(recommendation.implementation_effort)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariantForLevel(
                        recommendation.confidence_level,
                      )}
                    >
                      {formatToken(recommendation.confidence_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariantForLevel(recommendation.risk_level)}
                    >
                      {formatToken(recommendation.risk_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariantForLevel(
                        recommendation.maturity_level,
                      )}
                    >
                      {formatToken(recommendation.maturity_level)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={badgeVariantForLevel(
                        recommendation.economic_plausibility,
                      )}
                    >
                      {formatToken(recommendation.economic_plausibility)}
                    </Badge>
                  </TableCell>
                </TableRow>
                {expanded ? (
                  <TableRow className="evaluation-recommendation-detail-row">
                    <TableCell colSpan={9}>
                      <div className="evaluation-recommendation-detail">
                        <div className="evaluation-recommendation-detail-grid">
                          <section className="workspace-inline-card">
                            <h3>Rationale</h3>
                            <p>{recommendation.rationale}</p>
                          </section>
                          <section className="workspace-inline-card">
                            <h3>Provenance notes</h3>
                            {textList(
                              recommendation.provenance_notes ?? [],
                              'No provenance notes were attached to this recommendation.',
                            )}
                          </section>
                        </div>

                        <div className="evaluation-chip-clusters">
                          <div className="evaluation-chip-cluster">
                            <strong>Rule refs</strong>
                            <div className="workspace-chip-list compact">
                              {(recommendation.rule_refs ?? []).length > 0 ? (
                                (recommendation.rule_refs ?? []).map(
                                  (reference) =>
                                    referenceLink(
                                      `/evaluations/${evaluationId}/report#rule-${encodeURIComponent(reference)}`,
                                      reference,
                                    ),
                                )
                              ) : (
                                <span className="muted">No rule refs.</span>
                              )}
                            </div>
                          </div>
                          <div className="evaluation-chip-cluster">
                            <strong>Evidence refs</strong>
                            <div className="workspace-chip-list compact">
                              {(recommendation.evidence_refs ?? []).length >
                              0 ? (
                                (recommendation.evidence_refs ?? []).map(
                                  (reference) =>
                                    referenceLink(
                                      `/evidence/review?q=${encodeURIComponent(reference)}`,
                                      reference,
                                    ),
                                )
                              ) : (
                                <span className="muted">No evidence refs.</span>
                              )}
                            </div>
                          </div>
                          <div className="evaluation-chip-cluster">
                            <strong>Supplier candidates</strong>
                            <div className="workspace-chip-list compact">
                              {(recommendation.supplier_candidates ?? [])
                                .length > 0 ? (
                                (recommendation.supplier_candidates ?? []).map(
                                  (candidate) => (
                                    <span className="meta-chip" key={candidate}>
                                      {candidate}
                                    </span>
                                  ),
                                )
                              ) : (
                                <span className="muted">
                                  No supplier candidates.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="evaluation-recommendation-detail-grid">
                          <section className="workspace-inline-card">
                            <h3>Prerequisite actions</h3>
                            {textList(
                              recommendation.prerequisite_actions ?? [],
                              'No prerequisite actions were attached.',
                              true,
                            )}
                          </section>
                          <section className="workspace-inline-card">
                            <h3>Assumptions</h3>
                            {textList(
                              recommendation.assumptions,
                              'No explicit assumptions were attached.',
                            )}
                          </section>
                        </div>

                        {(recommendation.missing_data_dependencies ?? [])
                          .length > 0 ? (
                          <div className="evaluation-callout evaluation-callout--warning">
                            <strong>Missing data dependencies</strong>
                            {textList(
                              recommendation.missing_data_dependencies,
                              'No missing-data dependency is attached.',
                            )}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
