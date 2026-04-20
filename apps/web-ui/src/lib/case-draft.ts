import type { RawCaseInput } from '@metrev/domain-contracts';
import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import type { CaseIntakeFormValues } from '@/lib/case-intake';

export const intakeDraftStorageKey = 'metrev:intake-draft';
export const intakeSubmissionStorageKey = 'metrev:intake-submission';
export const intakeSubmissionErrorStorageKey = 'metrev:intake-submission-error';

export interface StoredCaseFormDraft {
  formValues: CaseIntakeFormValues;
  activePresetId: string | null;
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[];
}

export interface StoredIntakeSubmission {
  idempotencyKey: string;
  payload: RawCaseInput;
  createdAt: string;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function saveDraftInput(payload: StoredCaseFormDraft): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(intakeDraftStorageKey, JSON.stringify(payload));
}

export function loadDraftInput(): StoredCaseFormDraft | null {
  if (!isBrowser()) {
    return null;
  }

  const value = window.sessionStorage.getItem(intakeDraftStorageKey);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredCaseFormDraft;
  } catch {
    return null;
  }
}

export function clearDraftInput(): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(intakeDraftStorageKey);
}

export function savePendingSubmission(
  submission: StoredIntakeSubmission,
): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(
    intakeSubmissionStorageKey,
    JSON.stringify(submission),
  );
}

export function loadPendingSubmission(): StoredIntakeSubmission | null {
  if (!isBrowser()) {
    return null;
  }

  const value = window.sessionStorage.getItem(intakeSubmissionStorageKey);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredIntakeSubmission;
  } catch {
    return null;
  }
}

export function clearPendingSubmission(): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(intakeSubmissionStorageKey);
}

export function saveSubmissionError(message: string): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(intakeSubmissionErrorStorageKey, message);
}

export function loadSubmissionError(): string | null {
  if (!isBrowser()) {
    return null;
  }

  const value = window.sessionStorage.getItem(intakeSubmissionErrorStorageKey);
  return value?.trim() || null;
}

export function clearSubmissionError(): void {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(intakeSubmissionErrorStorageKey);
}
