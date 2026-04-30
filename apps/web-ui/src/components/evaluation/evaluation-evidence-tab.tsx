'use client';

import type { EvaluationWorkspaceResponse } from '@metrev/domain-contracts';
import * as React from 'react';

import { SignalBadge } from '@/components/workbench/signal-badge';
import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { formatTimestamp, formatToken } from '@/lib/formatting';

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
    | EvaluationWorkspaceResponse['evaluation']['source_usages'][number]
    | EvaluationWorkspaceResponse['evaluation']['claim_usages'][number],
) {
  const targetId =
    'source_document_id' in value ? value.source_document_id : value.claim_id;

  return `${formatToken(value.usage_type)} - ${targetId}${
    value.note ? ` - ${value.note}` : ''
  }`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const text = readString(entry);
    return text ? [text] : [];
  });
}

function formatScore(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}

function formatLevelChip(prefix: string, value: unknown, score: unknown) {
  const level = readString(value);
  const formattedScore = formatScore(readNumber(score));

  if (!level) {
    return null;
  }

  return `${prefix} ${formatToken(level)}${formattedScore ? ` ${formattedScore}` : ''}`;
}

function buildEvidenceQualityChips(record: Record<string, unknown>): string[] {
  const metadataQuality = asRecord(record.metadata_quality);
  const veracityScore = asRecord(record.veracity_score);
  const sourceArtifactIds = readStringArray(record.source_artifact_ids);
  const sourceLocatorRefs = readStringArray(record.source_locator_refs);
  const reviewedClaimLocatorRefs = readStringArray(
    record.reviewed_claim_locator_refs,
  );
  const confidencePenalties = readStringArray(
    veracityScore?.confidence_penalties,
  );

  return [
    formatLevelChip('Metadata', metadataQuality?.level, metadataQuality?.score),
    formatLevelChip('Veracity', veracityScore?.level, veracityScore?.score),
    readString(record.review_status)
      ? `Review ${formatToken(readString(record.review_status) ?? '')}`
      : null,
    sourceArtifactIds.length > 0
      ? `Artifacts ${sourceArtifactIds.slice(0, 2).join(', ')}`
      : null,
    [...sourceLocatorRefs, ...reviewedClaimLocatorRefs].length > 0
      ? `Locators ${[...sourceLocatorRefs, ...reviewedClaimLocatorRefs]
          .slice(0, 3)
          .join(', ')}`
      : null,
    confidencePenalties.length > 0
      ? `Trace caveats ${confidencePenalties.slice(0, 2).join('; ')}`
      : null,
  ].filter((item): item is string => Boolean(item));
}

export function EvaluationEvidenceTab({
  workspace,
}: {
  workspace: EvaluationWorkspaceResponse;
}) {
  const evaluation = workspace.evaluation;

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Typed evidence snapshot</span>
        {evaluation.audit_record.typed_evidence.length > 0 ? (
          <div className="workspace-card-list">
            {evaluation.audit_record.typed_evidence.map((record) => {
              const qualityChips = buildEvidenceQualityChips(
                record as Record<string, unknown>,
              );

              return (
                <article
                  className="workspace-inline-card"
                  key={record.evidence_id}
                >
                  <div className="workspace-data-card__header">
                    <div>
                      <h3>{record.title}</h3>
                      <p>{record.summary}</p>
                    </div>
                    <SignalBadge
                      kind={
                        record.evidence_type === 'internal_benchmark'
                          ? 'measured'
                          : 'inferred'
                      }
                    />
                  </div>
                  <p className="muted">
                    {formatToken(record.evidence_type)} -{' '}
                    {formatToken(record.strength_level)}
                  </p>
                  {qualityChips.length > 0 ? (
                    <div className="workspace-chip-list compact">
                      {qualityChips.map((chip) => (
                        <span className="meta-chip" key={chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted">
            No typed evidence records were attached to this evaluation.
          </p>
        )}
      </WorkspaceDataCard>

      <div className="workspace-detail-grid">
        <WorkspaceDataCard>
          <span className="badge subtle">Persisted source usage</span>
          {listOrEmpty(
            evaluation.source_usages.map((usage) =>
              formatPersistedUsage(usage),
            ),
            'No persisted source usage records were read back for this evaluation.',
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <span className="badge subtle">Persisted claim usage</span>
          {listOrEmpty(
            evaluation.claim_usages.map((usage) => formatPersistedUsage(usage)),
            'No persisted claim usage records were read back for this evaluation.',
          )}
        </WorkspaceDataCard>
      </div>

      <WorkspaceDataCard>
        <span className="badge subtle">Workspace snapshot inventory</span>
        {listOrEmpty(
          evaluation.workspace_snapshots.map(
            (snapshot) =>
              `${formatToken(snapshot.snapshot_type)} - ${formatTimestamp(snapshot.created_at)}`,
          ),
          'No immutable workspace snapshots were read back for this evaluation.',
        )}
      </WorkspaceDataCard>
    </div>
  );
}

void React;
