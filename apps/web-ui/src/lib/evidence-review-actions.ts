import type {
  ExternalEvidenceReviewAction,
  ExternalEvidenceReviewRequest,
} from '@metrev/domain-contracts';

import { reviewExternalEvidenceCatalogItem } from '@/lib/api';

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unknown review error';
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
  const payload: ExternalEvidenceReviewRequest = trimmedNote
    ? { action, note: trimmedNote }
    : { action };

  const settled = await Promise.allSettled(
    ids.map(async (id) => {
      await reviewExternalEvidenceCatalogItem(id, payload);
      return id;
    }),
  );

  const failed: BulkEvidenceReviewFailure[] = [];
  const succeededIds: string[] = [];

  settled.forEach((result, index) => {
    const id = ids[index];

    if (!id) {
      return;
    }

    if (result.status === 'fulfilled') {
      succeededIds.push(result.value);
      return;
    }

    failed.push({
      id,
      message: getErrorMessage(result.reason),
    });
  });

  return {
    action,
    attemptedIds: ids,
    failed,
    note: trimmedNote,
    succeededIds,
  };
}
