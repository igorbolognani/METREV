'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { CaseFormContextStep } from '@/components/case-form/case-form-context-step';
import { CaseFormOperationStep } from '@/components/case-form/case-form-operation-step';
import { CaseFormPresetPicker } from '@/components/case-form/case-form-preset-picker';
import { CaseFormReviewSubmitStep } from '@/components/case-form/case-form-review-submit-step';
import { CaseFormStepper } from '@/components/case-form/case-form-stepper';
import { CaseFormSuppliersEvidenceStep } from '@/components/case-form/case-form-suppliers-evidence-step';
import {
    WorkspaceDataCard,
    WorkspaceSection,
    WorkspaceStatCard,
} from '@/components/workspace-chrome';
import {
    clearPendingSubmission,
    clearSubmissionError,
    loadDraftInput,
    loadSubmissionError,
    saveDraftInput,
    savePendingSubmission,
} from '@/lib/case-draft';
import {
    caseFormSteps,
    caseFormStepValues,
    getCaseFormStepIndex,
    useCaseFormStep,
    type CaseFormStep,
} from '@/lib/case-form-query-state';
import {
    buildCaseInputFromFormValues,
    caseIntakePresets,
    defaultCaseIntakeFormValues,
    findCaseIntakePreset,
    type CaseIntakeFormValues,
} from '@/lib/case-intake';
import { formatToken } from '@/lib/formatting';

const numberFieldLabels: Record<
  'temperature' | 'ph' | 'conductivity' | 'hydraulicRetentionTime',
  string
> = {
  conductivity: 'Conductivity',
  hydraulicRetentionTime: 'Hydraulic retention time',
  ph: 'pH',
  temperature: 'Temperature',
};

function getNumberFieldError(value: string, label: string): string | null {
  if (!value.trim()) {
    return null;
  }

  return Number.isFinite(Number(value))
    ? null
    : `${label} must be a valid number.`;
}

function countCommaSeparated(value: string): number {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

function formatAutosaveTimestamp(value: string | null): string {
  if (!value) {
    return 'Autosave ready';
  }

  return `Autosaved ${new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function stepIssue(condition: boolean, message: string): string[] {
  return condition ? [message] : [];
}

export function CaseForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useCaseFormStep();
  const [formValues, setFormValues] = React.useState<CaseIntakeFormValues>(
    defaultCaseIntakeFormValues,
  );
  const [activePresetId, setActivePresetId] = React.useState<string | null>(
    null,
  );
  const [selectedCatalogEvidence, setSelectedCatalogEvidence] = React.useState<
    ExternalEvidenceCatalogItemSummary[]
  >([]);
  const [draftWasRestored, setDraftWasRestored] = React.useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(null);
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [submissionError, setSubmissionError] = React.useState<string | null>(
    null,
  );
  const [showStepValidation, setShowStepValidation] = React.useState<
    Partial<Record<CaseFormStep, boolean>>
  >({});

  React.useEffect(() => {
    const storedDraft = loadDraftInput();
    const storedError = loadSubmissionError();

    if (storedDraft) {
      setFormValues(storedDraft.formValues);
      setActivePresetId(storedDraft.activePresetId);
      setSelectedCatalogEvidence(storedDraft.selectedCatalogEvidence);
      setDraftWasRestored(true);
    }

    if (storedError) {
      setSubmissionError(storedError);
      clearSubmissionError();
    }

    setHasLoadedDraft(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    saveDraftInput({
      activePresetId,
      formValues,
      selectedCatalogEvidence,
    });
    setLastSavedAt(new Date().toISOString());
  }, [activePresetId, formValues, hasLoadedDraft, selectedCatalogEvidence]);

  const activePreset = findCaseIntakePreset(activePresetId);
  const manualEvidenceCount =
    formValues.evidenceTitle.trim() && formValues.evidenceSummary.trim()
      ? 1
      : 0;
  const evidenceCount = selectedCatalogEvidence.length + manualEvidenceCount;
  const preferredSupplierCount = countCommaSeparated(
    formValues.preferredSuppliers,
  );
  const assumptionCount = countCommaSeparated(formValues.assumptionsNote);
  const numericFieldErrors = {
    conductivity: getNumberFieldError(
      formValues.conductivity,
      numberFieldLabels.conductivity,
    ),
    hydraulicRetentionTime: getNumberFieldError(
      formValues.hydraulicRetentionTime,
      numberFieldLabels.hydraulicRetentionTime,
    ),
    ph: getNumberFieldError(formValues.ph, numberFieldLabels.ph),
    temperature: getNumberFieldError(
      formValues.temperature,
      numberFieldLabels.temperature,
    ),
  };
  const hasNumericErrors = Object.values(numericFieldErrors).some(Boolean);
  const contextIssues = [
    ...stepIssue(
      !formValues.architectureFamily.trim(),
      'Architecture family is required before continuing.',
    ),
    ...stepIssue(
      !formValues.currentTrl.trim(),
      'Current TRL is required before continuing.',
    ),
    ...stepIssue(
      !formValues.decisionHorizon.trim(),
      'Decision horizon is required before continuing.',
    ),
    ...stepIssue(
      !formValues.deploymentContext.trim(),
      'Deployment context is required before continuing.',
    ),
  ];
  const operationIssues = [
    ...stepIssue(
      countCommaSeparated(formValues.painPoints) === 0,
      'Add at least one current pain point before continuing.',
    ),
    ...stepIssue(
      !formValues.influentType.trim(),
      'Influent type is required before continuing.',
    ),
    ...stepIssue(
      !formValues.substrateProfile.trim(),
      'Substrate profile is required before continuing.',
    ),
    ...stepIssue(
      hasNumericErrors,
      'Fix the highlighted numeric fields before continuing.',
    ),
  ];
  const reviewIssues = [...contextIssues, ...operationIssues];
  const stepIssues: Record<CaseFormStep, string[]> = {
    context: contextIssues,
    operation: operationIssues,
    'review-submit': reviewIssues,
    'suppliers-evidence': [],
  };
  const currentStepIndex = getCaseFormStepIndex(currentStep);
  const completedSteps = caseFormStepValues.filter(
    (step, index) => index < currentStepIndex && stepIssues[step].length === 0,
  );
  const currentStepMeta =
    caseFormSteps.find((step) => step.value === currentStep) ??
    caseFormSteps[0];
  const autosaveLabel = formatAutosaveTimestamp(lastSavedAt);
  const contextValidationErrors = {
    currentTrl:
      showStepValidation.context && !formValues.currentTrl.trim()
        ? 'Current TRL is required.'
        : undefined,
    decisionHorizon:
      showStepValidation.context && !formValues.decisionHorizon.trim()
        ? 'Decision horizon is required.'
        : undefined,
    deploymentContext:
      showStepValidation.context && !formValues.deploymentContext.trim()
        ? 'Deployment context is required.'
        : undefined,
  };
  const operationValidationErrors = {
    influentType:
      showStepValidation.operation && !formValues.influentType.trim()
        ? 'Influent type is required.'
        : undefined,
    painPoints:
      showStepValidation.operation &&
      countCommaSeparated(formValues.painPoints) === 0
        ? 'Add at least one pain point.'
        : undefined,
    substrateProfile:
      showStepValidation.operation && !formValues.substrateProfile.trim()
        ? 'Substrate profile is required.'
        : undefined,
  };

  function updateField<Field extends keyof CaseIntakeFormValues>(
    field: Field,
    value: CaseIntakeFormValues[Field],
  ) {
    setStepError(null);
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleStringFieldChange(
    field: keyof CaseIntakeFormValues,
    value: string,
  ) {
    updateField(
      field as keyof CaseIntakeFormValues,
      value as CaseIntakeFormValues[keyof CaseIntakeFormValues],
    );
  }

  function applyPreset(presetId: string) {
    const preset = findCaseIntakePreset(presetId);
    if (!preset) {
      return;
    }

    setFormValues(preset.formValues);
    setActivePresetId(preset.id);
    setSelectedCatalogEvidence([]);
    setCurrentStep('context');
    setSubmissionError(null);
    setStepError(null);
    setShowStepValidation({});
  }

  function resetForm() {
    setFormValues(defaultCaseIntakeFormValues);
    setActivePresetId(null);
    setSelectedCatalogEvidence([]);
    setCurrentStep('context');
    setDraftWasRestored(false);
    setSubmissionError(null);
    setStepError(null);
    setIsSubmitting(false);
    setShowStepValidation({});
    clearPendingSubmission();
    clearSubmissionError();
  }

  function ensureStepIsValid(step: CaseFormStep): boolean {
    const issues = stepIssues[step];
    if (issues.length === 0) {
      return true;
    }

    setShowStepValidation((current) => ({
      ...current,
      [step]: true,
    }));
    setStepError(issues[0] ?? null);
    return false;
  }

  function moveToStep(nextStep: CaseFormStep) {
    const nextIndex = getCaseFormStepIndex(nextStep);

    if (nextIndex <= currentStepIndex) {
      setStepError(null);
      setCurrentStep(nextStep);
      return;
    }

    for (let index = currentStepIndex; index < nextIndex; index += 1) {
      const step = caseFormStepValues[index];
      if (!step || !ensureStepIsValid(step)) {
        return;
      }
    }

    setStepError(null);
    setCurrentStep(nextStep);
  }

  function handlePreviousStep() {
    const previousStep = caseFormStepValues[currentStepIndex - 1];
    if (!previousStep) {
      return;
    }

    setStepError(null);
    setCurrentStep(previousStep);
  }

  function handleNextStep() {
    if (!ensureStepIsValid(currentStep)) {
      return;
    }

    const nextStep = caseFormStepValues[currentStepIndex + 1];
    if (!nextStep) {
      return;
    }

    setStepError(null);
    setCurrentStep(nextStep);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    for (const step of caseFormStepValues) {
      if (!ensureStepIsValid(step)) {
        setCurrentStep(step);
        setSubmissionError(stepIssues[step][0] ?? null);
        return;
      }
    }

    const payload = buildCaseInputFromFormValues(
      formValues,
      activePreset,
      selectedCatalogEvidence,
    );
    const idempotencyKey = window.crypto?.randomUUID()
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setSubmissionError(null);
    setStepError(null);
    setIsSubmitting(true);
    clearSubmissionError();
    saveDraftInput({
      activePresetId,
      formValues,
      selectedCatalogEvidence,
    });
    savePendingSubmission({
      createdAt: new Date().toISOString(),
      idempotencyKey,
      payload,
    });

    router.push('/cases/new/submitting');
  }

  function renderCurrentStep() {
    switch (currentStep) {
      case 'context':
        return (
          <CaseFormContextStep
            currentTrlError={contextValidationErrors.currentTrl}
            decisionHorizonError={contextValidationErrors.decisionHorizon}
            deploymentContextError={contextValidationErrors.deploymentContext}
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
          />
        );
      case 'operation':
        return (
          <CaseFormOperationStep
            conductivityError={numericFieldErrors.conductivity}
            formValues={formValues}
            hydraulicRetentionTimeError={
              numericFieldErrors.hydraulicRetentionTime
            }
            influentTypeError={operationValidationErrors.influentType}
            onFieldChange={handleStringFieldChange}
            painPointsError={operationValidationErrors.painPoints}
            phError={numericFieldErrors.ph}
            substrateProfileError={operationValidationErrors.substrateProfile}
            temperatureError={numericFieldErrors.temperature}
          />
        );
      case 'suppliers-evidence':
        return (
          <CaseFormSuppliersEvidenceStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onSelectionChange={setSelectedCatalogEvidence}
            selectedCatalogEvidence={selectedCatalogEvidence}
          />
        );
      case 'review-submit':
        return (
          <CaseFormReviewSubmitStep
            activePreset={activePreset}
            evidenceCount={evidenceCount}
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            preferredSupplierCount={preferredSupplierCount}
            selectedCatalogEvidence={selectedCatalogEvidence}
          />
        );
      default:
        return null;
    }
  }

  return (
    <form className="workspace-page" onSubmit={handleSubmit}>
      <section className="workspace-stats-grid" aria-label="Input deck summary">
        <WorkspaceStatCard
          detail={formValues.architectureFamily || 'Architecture still open.'}
          label="Scenario"
          tone="accent"
          value={`${formatToken(formValues.technologyFamily)} / ${formatToken(formValues.primaryObjective)}`}
        />
        <WorkspaceStatCard
          detail={
            formValues.conductivity || formValues.hydraulicRetentionTime
              ? `${formValues.conductivity || '?'} mS/cm · ${formValues.hydraulicRetentionTime || '?'} h`
              : 'Conductivity and retention time are not set yet.'
          }
          label="Operating envelope"
          value={
            formValues.temperature || formValues.ph
              ? `${formValues.temperature || '?'} °C · pH ${formValues.ph || '?'}`
              : 'Still incomplete'
          }
        />
        <WorkspaceStatCard
          detail={`${countCommaSeparated(formValues.currentSuppliers)} current supplier entries recorded.`}
          label="Supplier context"
          value={`${preferredSupplierCount} preferred`}
        />
        <WorkspaceStatCard
          detail="Accepted catalog evidence and manual typed support remain explicit in the payload."
          label="Evidence"
          tone="warning"
          value={`${evidenceCount} attached`}
        />
      </section>

      <WorkspaceSection
        actions={
          <>
            <button className="secondary" onClick={resetForm} type="button">
              Reset draft
            </button>
            <Link className="button secondary" href="/evidence/review">
              Review evidence queue
            </Link>
          </>
        }
        description="Capture context, operating envelope, supplier posture, evidence, and assumptions in one predictable flow before handing the case into the deterministic workspace."
        eyebrow="Input deck"
        title={
          formValues.caseId.trim() ||
          activePreset?.label ||
          'Draft a new evaluation'
        }
      >
        <div className="case-form-wizard-shell">
          <div className="case-form-wizard-shell__status">
            <WorkspaceDataCard>
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Wizard status</span>
                  <h3>One navigation system, one drafting surface</h3>
                </div>
                <span className="meta-chip">
                  {activePreset ? 'Preset loaded' : 'Manual draft'}
                </span>
              </div>
              <div className="case-form-status-grid">
                <div>
                  <strong>{currentStepMeta.label}</strong>
                  <p>{currentStepMeta.description}</p>
                </div>
                <div className="case-form-status-meta">
                  <span className="meta-chip">{autosaveLabel}</span>
                  {draftWasRestored ? (
                    <span className="meta-chip">Draft restored</span>
                  ) : null}
                  {assumptionCount > 0 ? (
                    <span className="meta-chip">
                      {assumptionCount} assumption(s)
                    </span>
                  ) : null}
                </div>
              </div>
            </WorkspaceDataCard>

            <CaseFormPresetPicker
              activePresetId={activePresetId}
              onApplyPreset={applyPreset}
              presets={caseIntakePresets}
            />

            <CaseFormStepper
              completedSteps={completedSteps}
              currentStep={currentStep}
              onStepChange={moveToStep}
            />
          </div>

          {renderCurrentStep()}

          <div className="workspace-submit-row case-form-submit-row">
            <div>
              <strong>
                {currentStep === 'review-submit'
                  ? 'Ready to run'
                  : `Next: ${caseFormSteps[currentStepIndex + 1]?.label ?? 'Review & Submit'}`}
              </strong>
              <p>
                Autosave remains active while you move between steps. The review
                step will preserve the draft again before the deterministic
                submission handoff.
              </p>
            </div>
            <div className="case-form-submit-row__actions">
              {currentStepIndex > 0 ? (
                <button
                  className="secondary"
                  onClick={handlePreviousStep}
                  type="button"
                >
                  Previous step
                </button>
              ) : null}
              {currentStep === 'review-submit' ? (
                <button disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? 'Launching evaluation...'
                    : 'Run deterministic evaluation'}
                </button>
              ) : (
                <button onClick={handleNextStep} type="button">
                  Next step
                </button>
              )}
            </div>
          </div>
        </div>

        {stepError ? <p className="error">{stepError}</p> : null}
        {submissionError ? <p className="error">{submissionError}</p> : null}
      </WorkspaceSection>
    </form>
  );
}
