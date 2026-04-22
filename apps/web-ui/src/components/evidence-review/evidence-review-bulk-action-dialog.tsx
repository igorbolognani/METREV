'use client';

import type { ExternalEvidenceReviewAction } from '@metrev/domain-contracts';
import * as React from 'react';

import { Dialog } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

void React;

function dialogCopy(action: ExternalEvidenceReviewAction) {
  return action === 'accept'
    ? {
        confirmLabel: 'Accept selection',
        description:
          'Accepted records become available inside the intake wizard and remain explicit in the audit trail.',
        title: 'Accept selected evidence',
      }
    : {
        confirmLabel: 'Reject selection',
        description:
          'Rejected records remain visible for auditability but stay blocked from deterministic intake.',
        title: 'Reject selected evidence',
      };
}

export interface EvidenceReviewBulkActionDialogProps {
  action: ExternalEvidenceReviewAction | null;
  isPending: boolean;
  note: string;
  onConfirm: () => void;
  onNoteChange: (nextValue: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  selectionCount: number;
}

export function EvidenceReviewBulkActionDialog({
  action,
  isPending,
  note,
  onConfirm,
  onNoteChange,
  onOpenChange,
  open,
  selectionCount,
}: EvidenceReviewBulkActionDialogProps) {
  if (!action) {
    return null;
  }

  const copy = dialogCopy(action);

  return (
    <Dialog
      description={`${copy.description} ${selectionCount} record(s) are currently selected.`}
      footer={
        <>
          <button
            className="secondary"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Cancel
          </button>
          <button disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? 'Submitting...' : copy.confirmLabel}
          </button>
        </>
      }
      onOpenChange={onOpenChange}
      open={open}
      title={copy.title}
    >
      <Textarea
        hint="Optional note stored with each review mutation. Leave empty to avoid adding review commentary."
        label="Review note"
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Reason for the batch action, evidence scope concern, or analyst comment"
        value={note}
      />
    </Dialog>
  );
}
