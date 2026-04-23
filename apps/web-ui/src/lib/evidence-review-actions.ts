import type {
  ExternalEvidenceBulkReviewRequest,
  ExternalEvidenceReviewAction,
} from '@metrev/domain-contracts';

import { reviewExternalEvidenceCatalogItems } from '@/lib/api';

export interface BulkEvidenceReviewFailure {
  id: string;
  message: string;
}

export interface BulkEvidenceReviewSummary {
  action: ExternalEvidenceReviewAction;
  attemptedIds: string[];
  failed: BulkEvidenceReviewFailure[];
  note?: string;
  succeededIds: string[];
}

export async function runBulkEvidenceReview({
  action,
  ids,
  note,
}: {
  action: ExternalEvidenceReviewAction;
  ids: string[];
  note?: string;
}): Promise<BulkEvidenceReviewSummary> {
  const trimmedNote = note?.trim();
  const payload: ExternalEvidenceBulkReviewRequest = trimmedNote
    ? { ids, action, note: trimmedNote }
    : { ids, action };
  const response = await reviewExternalEvidenceCatalogItems(payload);

  return {
    action: response.action,
    attemptedIds: response.attempted_ids,
    failed: response.failed,
    note: response.note,
    succeededIds: response.succeeded_ids,
  };
}
