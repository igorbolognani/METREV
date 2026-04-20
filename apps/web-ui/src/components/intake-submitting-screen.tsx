'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
    WorkspaceEmptyState,
    WorkspacePageHeader,
    WorkspaceSection,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import { evaluateCase } from '@/lib/api';
import {
    clearPendingSubmission,
    loadPendingSubmission,
    saveSubmissionError,
} from '@/lib/case-draft';

export const progressStages = [
  'Normalize intake',
  'Validate input',
  'Run simulation enrichment',
  'Run deterministic rules',
  'Validate output',
  'Prepare workspace',
] as const;

export function IntakeSubmittingScreen() {
  const router = useRouter();
  const [activeStageIndex, setActiveStageIndex] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [submissionFound, setSubmissionFound] = React.useState(true);

  React.useEffect(() => {
    const submission = loadPendingSubmission();

    if (!submission) {
      setSubmissionFound(false);
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(() => {
      setActiveStageIndex((current) =>
        current >= progressStages.length - 1 ? current : current + 1,
      );
    }, 500);

    void evaluateCase(submission.payload, {
      idempotencyKey: submission.idempotencyKey,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        clearPendingSubmission();
        setActiveStageIndex(progressStages.length - 1);
        router.replace(`/evaluations/${result.evaluation_id}`);
      })
      .catch((submissionError: Error) => {
        if (cancelled) {
          return;
        }

        const message =
          submissionError.message ||
          'The evaluation failed before the workspace could be prepared.';
        setError(message);
        saveSubmissionError(message);
        window.setTimeout(() => {
          router.replace('/cases/new');
        }, 1200);
      })
      .finally(() => {
        window.clearInterval(intervalId);
      });

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [router]);

  if (!submissionFound) {
    return (
      <WorkspaceEmptyState
        title="No pending submission"
        description="Return to the input deck and submit a case to start the deterministic evaluation flow."
        primaryHref="/cases/new"
        primaryLabel="Back to input deck"
      />
    );
  }

  return (
    <IntakeSubmittingProgressView
      activeStageIndex={activeStageIndex}
      error={error}
    />
  );
}

export function IntakeSubmittingProgressView({
  activeStageIndex,
  error,
}: {
  activeStageIndex: number;
  error?: string | null;
}) {
  const safeStageIndex = Math.min(
    Math.max(activeStageIndex, 0),
    progressStages.length - 1,
  );

  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        badge="Analysis in progress"
        title="Preparing your evaluation workspace"
        description="The request is still synchronous, but the product now makes each deterministic stage visible while the backend completes the run."
        chips={[
          'Local-first runtime',
          'Deterministic flow',
          'Draft preserved on error',
        ]}
      />

      <section className="workspace-stats-grid">
        <WorkspaceStatCard
          label="Current stage"
          value={progressStages[safeStageIndex]}
          detail="The browser will redirect automatically when the evaluation workspace is ready."
          tone="accent"
        />
        <WorkspaceStatCard
          label="Total stages"
          value={progressStages.length}
          detail="Normalization, validation, enrichment, rules, validation, and workspace preparation."
        />
      </section>

      <WorkspaceSection
        eyebrow="Deterministic progress"
        title="Execution stages"
        description="Every stage listed here corresponds to the runtime flow defined in the new workspace contract."
      >
        <ol className="workspace-progress-list">
          {progressStages.map((stage, index) => {
            const state =
              index < safeStageIndex
                ? 'done'
                : index === safeStageIndex
                  ? 'active'
                  : 'pending';

            return (
              <li className={`workspace-progress-item ${state}`} key={stage}>
                <span className="workspace-progress-item__marker">
                  {index + 1}
                </span>
                <div>
                  <strong>{stage}</strong>
                  <p>
                    {state === 'done'
                      ? 'Completed.'
                      : state === 'active'
                        ? 'Currently running.'
                        : 'Queued next.'}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
        {error ? <p className="error">{error}</p> : null}
      </WorkspaceSection>
    </div>
  );
}
