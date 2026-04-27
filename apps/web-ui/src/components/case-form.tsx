'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import type {
  ExternalEvidenceCatalogItemSummary,
  ResearchDecisionIngestionPreview,
} from '@metrev/domain-contracts';

import { CaseFormContextStep } from '@/components/case-form/case-form-context-step';
import { CaseFormOperationStep } from '@/components/case-form/case-form-operation-step';
import { CaseFormPresetPicker } from '@/components/case-form/case-form-preset-picker';
import { CaseFormReviewSubmitStep } from '@/components/case-form/case-form-review-submit-step';
import { CaseFormStackDetailStep } from '@/components/case-form/case-form-stack-detail-step';
import { CaseFormStepper } from '@/components/case-form/case-form-stepper';
import { CaseFormSuppliersEvidenceStep } from '@/components/case-form/case-form-suppliers-evidence-step';
import {
  WorkspaceDataCard,
  WorkspacePageHeader,
  WorkspaceSection,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import {
  fetchResearchEvidencePackDecisionInput,
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
  hydrateCaseIntakeFormValues,
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
  const searchParams = useSearchParams();
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
  const [researchDecisionInput, setResearchDecisionInput] =
    React.useState<ResearchDecisionIngestionPreview | null>(null);
  const [researchPackError, setResearchPackError] = React.useState<
    string | null
  >(null);
  const [researchPackLoading, setResearchPackLoading] = React.useState(false);
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
      const storedPreset = findCaseIntakePreset(storedDraft.activePresetId);
      setFormValues(
        hydrateCaseIntakeFormValues(
          storedDraft.formValues,
          storedPreset?.payload,
        ),
      );
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

  const researchPackId = searchParams?.get('researchPackId')?.trim() ?? null;

  React.useEffect(() => {
    let cancelled = false;

    if (!researchPackId) {
      setResearchDecisionInput(null);
      setResearchPackError(null);
      setResearchPackLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setResearchPackLoading(true);
    setResearchPackError(null);

    void fetchResearchEvidencePackDecisionInput(researchPackId)
      .then((decisionInput) => {
        if (cancelled) {
          return;
        }

        setResearchDecisionInput(decisionInput);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setResearchDecisionInput(null);
        setResearchPackError(
          error instanceof Error
            ? error.message
            : 'Research pack could not be loaded.',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setResearchPackLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [researchPackId]);

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
  const researchEvidenceCount =
    researchDecisionInput?.evidence_records.length ?? 0;
  const evidenceCount =
    selectedCatalogEvidence.length +
    manualEvidenceCount +
    researchEvidenceCount;
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
  const reactorIssues = [
    ...stepIssue(
      !formValues.architectureFamily.trim() &&
        !(formValues.reactorArchitectureType ?? '').trim(),
      'Reactor architecture is required before continuing.',
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
  const reviewIssues = [...contextIssues, ...reactorIssues, ...operationIssues];
  const stepIssues: Record<CaseFormStep, string[]> = {
    'context-objective': contextIssues,
    'reactor-architecture': reactorIssues,
    'anode-biofilm': [],
    'cathode-catalyst': [],
    'membrane-separator': [],
    'balance-of-plant': [],
    'sensors-analytics': [],
    'biology-startup': [],
    'operating-envelope': operationIssues,
    'review-submit': reviewIssues,
    'suppliers-constraints': [],
  };
  const currentStepIndex = Math.max(getCaseFormStepIndex(currentStep), 0);
  const completedSteps = caseFormStepValues.filter(
    (step, index) => index < currentStepIndex && stepIssues[step].length === 0,
  );
  const currentStepMeta =
    caseFormSteps.find((step) => step.value === currentStep) ??
    caseFormSteps[0];
  const autosaveLabel = formatAutosaveTimestamp(lastSavedAt);
  const summaryItems = [
    {
      detail:
        formValues.architectureFamily ||
        formValues.reactorArchitectureType ||
        'Architecture still open.',
      key: 'scenario',
      label: 'Scenario',
      tone: 'accent' as const,
      value: `${formatToken(formValues.technologyFamily)} / ${formatToken(formValues.primaryObjective)}`,
    },
    {
      detail:
        formValues.conductivity || formValues.hydraulicRetentionTime
          ? `${formValues.conductivity || '?'} mS/cm - ${formValues.hydraulicRetentionTime || '?'} h`
          : 'Conductivity and retention time are not set yet.',
      key: 'envelope',
      label: 'Operating envelope',
      tone: 'default' as const,
      value:
        formValues.temperature || formValues.ph
          ? `${formValues.temperature || '?'} °C - pH ${formValues.ph || '?'}`
          : 'Still incomplete',
    },
    {
      detail: `${countCommaSeparated(formValues.currentSuppliers)} current supplier entries recorded.`,
      key: 'suppliers',
      label: 'Supplier context',
      tone: 'success' as const,
      value: `${preferredSupplierCount} preferred`,
    },
    {
      detail: researchPackId
        ? 'Accepted catalog evidence, attached research-pack evidence, and manual typed support remain explicit in the payload.'
        : 'Accepted catalog evidence and manual typed support remain explicit in the payload.',
      key: 'evidence',
      label: 'Evidence',
      tone: 'warning' as const,
      value: `${evidenceCount} attached`,
    },
  ];
  const contextValidationErrors = {
    currentTrl:
      showStepValidation['context-objective'] && !formValues.currentTrl.trim()
        ? 'Current TRL is required.'
        : undefined,
    decisionHorizon:
      showStepValidation['context-objective'] &&
      !formValues.decisionHorizon.trim()
        ? 'Decision horizon is required.'
        : undefined,
    deploymentContext:
      showStepValidation['context-objective'] &&
      !formValues.deploymentContext.trim()
        ? 'Deployment context is required.'
        : undefined,
  };
  const operationValidationErrors = {
    influentType:
      showStepValidation['operating-envelope'] &&
      !formValues.influentType.trim()
        ? 'Influent type is required.'
        : undefined,
    painPoints:
      showStepValidation['operating-envelope'] &&
      countCommaSeparated(formValues.painPoints) === 0
        ? 'Add at least one pain point.'
        : undefined,
    substrateProfile:
      showStepValidation['operating-envelope'] &&
      !formValues.substrateProfile.trim()
        ? 'Substrate profile is required.'
        : undefined,
  };
  const stackSummary = [
    {
      key: 'reactor',
      label: 'Reactor',
      value:
        formValues.reactorArchitectureType ||
        formValues.architectureFamily ||
        'Not stated',
    },
    {
      key: 'anode',
      label: 'Anode',
      value: formValues.anodeMaterialFamily || 'Not stated',
    },
    {
      key: 'cathode',
      label: 'Cathode',
      value: formValues.cathodeCatalystFamily || 'Not stated',
    },
    {
      key: 'separator',
      label: 'Separator',
      value:
        formValues.membraneSeparatorType ||
        formValues.membranePresence ||
        'Not stated',
    },
    {
      key: 'sensors',
      label: 'Sensors',
      value: formValues.sensorsVoltageCurrentLogging || 'Not stated',
    },
    {
      key: 'biology',
      label: 'Biology',
      value: formValues.biologyStartupProtocol || 'Not stated',
    },
  ];
  const cockpitWarnings = [
    ...stepIssue(
      !formValues.reactorArchitectureType && !formValues.architectureFamily,
      'Reactor architecture is still unspecified.',
    ),
    ...stepIssue(
      !formValues.anodeMaterialFamily,
      'Anode material family is still unspecified.',
    ),
    ...stepIssue(
      !formValues.cathodeCatalystFamily,
      'Cathode catalyst family is still unspecified.',
    ),
    ...stepIssue(
      !formValues.membraneSeparatorType && !formValues.membranePresence,
      'Membrane or separator posture is still unspecified.',
    ),
    ...stepIssue(
      !formValues.sensorsVoltageCurrentLogging,
      'Sensor logging posture is still unspecified.',
    ),
    ...stepIssue(
      !formValues.biologyStartupProtocol,
      'Startup protocol is still unspecified.',
    ),
  ];

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

    setFormValues(
      hydrateCaseIntakeFormValues(preset.formValues, preset.payload),
    );
    setActivePresetId(preset.id);
    setSelectedCatalogEvidence([]);
    setCurrentStep('context-objective');
    setSubmissionError(null);
    setStepError(null);
    setShowStepValidation({});
  }

  function resetForm() {
    setFormValues(defaultCaseIntakeFormValues);
    setActivePresetId(null);
    setSelectedCatalogEvidence([]);
    setCurrentStep('context-objective');
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
      researchDecisionInput,
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
      case 'context-objective':
        return (
          <CaseFormContextStep
            currentTrlError={contextValidationErrors.currentTrl}
            decisionHorizonError={contextValidationErrors.decisionHorizon}
            deploymentContextError={contextValidationErrors.deploymentContext}
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
          />
        );
      case 'reactor-architecture':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="reactor-architecture"
          />
        );
      case 'anode-biofilm':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="anode-biofilm"
          />
        );
      case 'cathode-catalyst':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="cathode-catalyst"
          />
        );
      case 'membrane-separator':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="membrane-separator"
          />
        );
      case 'balance-of-plant':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="balance-of-plant"
          />
        );
      case 'sensors-analytics':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="sensors-analytics"
          />
        );
      case 'biology-startup':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            step="biology-startup"
          />
        );
      case 'operating-envelope':
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
      case 'suppliers-constraints':
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
            researchDecisionInput={researchDecisionInput}
            researchPackError={researchPackError}
            researchPackId={researchPackId}
            researchPackLoading={researchPackLoading}
            selectedCatalogEvidence={selectedCatalogEvidence}
            stackSummary={stackSummary}
            warningMessages={cockpitWarnings}
          />
        );
      default:
        return null;
    }
  }

  return (
    <form className="workspace-page" onSubmit={handleSubmit}>
      <WorkspacePageHeader
        badge="Stack cockpit"
        chips={[
          autosaveLabel,
          `${currentStepIndex + 1} of ${caseFormStepValues.length} steps`,
        ]}
        description="Configure the current METREV stack block by block before handing the case into the deterministic workspace."
        title={
          formValues.caseId.trim() ||
          activePreset?.label ||
          'Draft a new evaluation'
        }
      />

      <SummaryRail items={summaryItems} label="Stack cockpit summary" />

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
        description="Walk the current stack through architecture, materials, instrumentation, biology, operating conditions, supplier posture, and explicit evidence before the deterministic handoff."
        eyebrow="Stack cockpit"
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
                  <h3>One cockpit, one stack configuration surface</h3>
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
                Autosave remains active while you move between stack sections.
                The review step preserves the draft again before the
                deterministic submission handoff.
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
