'use client';

import * as React from 'react';

import type { BulkEvidenceReviewSummary } from '@/lib/evidence-review-actions';

import { Dialog } from '@/components/ui/dialog';

void React;

function getDialogTitle(result: BulkEvidenceReviewSummary): string {
  if (result.failed.length === 0) {
    return 'Bulk review complete';
  }

  if (result.succeededIds.length === 0) {
    return 'Bulk review failed';
  }

  return 'Bulk review partially completed';
}

export interface EvidenceReviewBulkResultDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  result: BulkEvidenceReviewSummary | null;
}

export function EvidenceReviewBulkResultDialog({
  onOpenChange,
  open,
  result,
}: EvidenceReviewBulkResultDialogProps) {
  if (!result) {
    return null;
  }

  return (
    <Dialog
      description="The queue will refetch after every batch so the rendered state stays backend-authoritative."
      footer={
        <button onClick={() => onOpenChange(false)} type="button">
          Close summary
        </button>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={getDialogTitle(result)}
    >
      <div className="evidence-review-result-grid">
        <article className="workspace-inline-card">
          <h3>Attempted</h3>
          <p>{result.attemptedIds.length} record(s)</p>
        </article>
        <article className="workspace-inline-card">
          <h3>Succeeded</h3>
          <p>{result.succeededIds.length} record(s)</p>
        </article>
        <article className="workspace-inline-card">
          <h3>Failed</h3>
          <p>{result.failed.length} record(s)</p>
        </article>
      </div>

      {result.succeededIds.length > 0 ? (
        <div className="evidence-review-cell-stack">
          <h3>Succeeded IDs</h3>
          <ul className="evidence-review-result-list">
            {result.succeededIds.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.failed.length > 0 ? (
        <div className="evidence-review-cell-stack">
          <h3>Failed IDs</h3>
          <ul className="evidence-review-result-list">
            {result.failed.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.id}</strong>
                <span>{entry.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Dialog>
  );
}
