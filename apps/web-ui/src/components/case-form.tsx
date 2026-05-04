'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import type { Role } from '@metrev/auth';
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
import { Collapsible } from '@/components/ui/collapsible';
import {
    WorkspaceDataCard,
    WorkspacePageHeader,
    WorkspaceSection,
} from '@/components/workspace-chrome';
import { SummaryRail } from '@/components/workspace/summary-rail';
import { fetchResearchEvidencePackDecisionInput } from '@/lib/api';
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
    getCaseIntakeParameterMode,
    hydrateCaseIntakeFormValues,
    type CaseIntakeFormValues,
    type CaseIntakeParameterFieldId,
    type CaseIntakeParameterMode,
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

function canOpenInternalEvidence(role: Role): boolean {
  return role === 'ANALYST' || role === 'ADMIN';
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

const deterministicOutputLabels = [
  'Diagnosis',
  'Recommendations',
  'Modeling',
  'Roadmap & suppliers',
  'Report',
  'Audit',
] as const;

export function CaseForm({ actorRole = 'VIEWER' }: { actorRole?: Role }) {
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

  function resolveParameterSnapshot(
    field: CaseIntakeParameterFieldId,
    value: string | undefined,
    fallback = 'Not stated',
  ): string {
    const mode = getCaseIntakeParameterMode(formValues, field);

    if (mode === 'system_default') {
      return 'System default';
    }

    if (mode === 'exclude') {
      return 'Excluded';
    }

    return value?.trim() ? value : fallback;
  }

  function parameterNeedsExplicitValue(
    field: CaseIntakeParameterFieldId,
    value: string | undefined,
  ): boolean {
    return (
      getCaseIntakeParameterMode(formValues, field) === 'client' &&
      !value?.trim()
    );
  }

  const numericFieldErrors = {
    conductivity:
      getCaseIntakeParameterMode(formValues, 'conductivity') === 'client'
        ? getNumberFieldError(
            formValues.conductivity,
            numberFieldLabels.conductivity,
          )
        : null,
    hydraulicRetentionTime:
      getCaseIntakeParameterMode(formValues, 'hydraulicRetentionTime') ===
      'client'
        ? getNumberFieldError(
            formValues.hydraulicRetentionTime,
            numberFieldLabels.hydraulicRetentionTime,
          )
        : null,
    ph:
      getCaseIntakeParameterMode(formValues, 'ph') === 'client'
        ? getNumberFieldError(formValues.ph, numberFieldLabels.ph)
        : null,
    temperature:
      getCaseIntakeParameterMode(formValues, 'temperature') === 'client'
        ? getNumberFieldError(
            formValues.temperature,
            numberFieldLabels.temperature,
          )
        : null,
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
      parameterNeedsExplicitValue('influentType', formValues.influentType),
      'Influent type is required before continuing.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'substrateProfile',
        formValues.substrateProfile,
      ),
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
    'electrical-interconnect': [],
    'membrane-separator': [],
    'balance-of-plant': [],
    'sensors-analytics': [],
    'biology-startup': [],
    'operating-envelope': operationIssues,
    'review-submit': reviewIssues,
    'suppliers-constraints': [],
  };
  const inputStepValues = caseFormStepValues.filter(
    (step): step is Exclude<CaseFormStep, 'review-submit'> =>
      step !== 'review-submit',
  );
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
          ? `${resolveParameterSnapshot('conductivity', formValues.conductivity, '?')} - ${resolveParameterSnapshot('hydraulicRetentionTime', formValues.hydraulicRetentionTime, '?')}`
          : 'Conductivity and retention time are not set yet.',
      key: 'envelope',
      label: 'Operating envelope',
      tone: 'default' as const,
      value:
        formValues.temperature || formValues.ph
          ? `${resolveParameterSnapshot('temperature', formValues.temperature, '?')} - pH ${resolveParameterSnapshot('ph', formValues.ph, '?')}`
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
      parameterNeedsExplicitValue('influentType', formValues.influentType)
        ? 'Influent type is required.'
        : undefined,
    painPoints:
      showStepValidation['operating-envelope'] &&
      countCommaSeparated(formValues.painPoints) === 0
        ? 'Add at least one pain point.'
        : undefined,
    substrateProfile:
      showStepValidation['operating-envelope'] &&
      parameterNeedsExplicitValue(
        'substrateProfile',
        formValues.substrateProfile,
      )
        ? 'Substrate profile is required.'
        : undefined,
  };
  const stackSummary = [
    {
      key: 'reactor',
      label: 'Reactor',
      value: formValues.architectureFamily.trim()
        ? formValues.architectureFamily
        : resolveParameterSnapshot(
            'reactorArchitectureType',
            formValues.reactorArchitectureType,
          ),
    },
    {
      key: 'anode',
      label: 'Anode',
      value: resolveParameterSnapshot(
        'anodeMaterialFamily',
        formValues.anodeMaterialFamily,
      ),
    },
    {
      key: 'cathode',
      label: 'Cathode',
      value: resolveParameterSnapshot(
        'cathodeCatalystFamily',
        formValues.cathodeCatalystFamily,
      ),
    },
    {
      key: 'separator',
      label: 'Separator',
      value: formValues.membraneSeparatorType?.trim()
        ? resolveParameterSnapshot(
            'membraneSeparatorType',
            formValues.membraneSeparatorType,
          )
        : resolveParameterSnapshot(
            'membranePresence',
            formValues.membranePresence,
          ),
    },
    {
      key: 'electrical',
      label: 'Electrical',
      value: resolveParameterSnapshot(
        'electricalCurrentCollectionStrategy',
        formValues.electricalCurrentCollectionStrategy,
      ),
    },
    {
      key: 'sensors',
      label: 'Sensors',
      value: resolveParameterSnapshot(
        'sensorsVoltageCurrentLogging',
        formValues.sensorsVoltageCurrentLogging,
      ),
    },
    {
      key: 'biology',
      label: 'Biology',
      value: resolveParameterSnapshot(
        'biologyStartupProtocol',
        formValues.biologyStartupProtocol,
      ),
    },
  ];
  const cockpitWarnings = [
    ...stepIssue(
      !formValues.architectureFamily.trim() &&
        parameterNeedsExplicitValue(
          'reactorArchitectureType',
          formValues.reactorArchitectureType,
        ),
      'Reactor architecture is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'anodeMaterialFamily',
        formValues.anodeMaterialFamily,
      ),
      'Anode material family is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'cathodeCatalystFamily',
        formValues.cathodeCatalystFamily,
      ),
      'Cathode catalyst family is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'membraneSeparatorType',
        formValues.membraneSeparatorType,
      ) &&
        parameterNeedsExplicitValue(
          'membranePresence',
          formValues.membranePresence,
        ),
      'Membrane or separator posture is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'sensorsVoltageCurrentLogging',
        formValues.sensorsVoltageCurrentLogging,
      ),
      'Sensor logging posture is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'electricalCurrentCollectionStrategy',
        formValues.electricalCurrentCollectionStrategy,
      ),
      'Electrical current collection strategy is still unspecified.',
    ),
    ...stepIssue(
      parameterNeedsExplicitValue(
        'biologyStartupProtocol',
        formValues.biologyStartupProtocol,
      ),
      'Startup protocol is still unspecified.',
    ),
  ];
  const openInputIssueCount = inputStepValues.filter(
    (step) => stepIssues[step].length > 0,
  ).length;
  const readinessWarnings = [
    ...new Set([
      ...inputStepValues.flatMap((step) => stepIssues[step]),
      ...cockpitWarnings,
    ]),
  ].slice(0, 4);
  const readinessTone = openInputIssueCount > 0 ? 'warning' : 'success';
  const readinessLabel =
    openInputIssueCount > 0
      ? `${openInputIssueCount} required blocker(s)`
      : 'Ready for final review';

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

  function handleParameterModeChange(
    field: CaseIntakeParameterFieldId,
    mode: CaseIntakeParameterMode,
  ) {
    setStepError(null);
    setFormValues((current) => ({
      ...current,
      parameterModes: {
        ...(current.parameterModes ?? {}),
        [field]: mode,
      },
    }));
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

  function handleStepperStepChange(nextStep: CaseFormStep) {
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
            onParameterModeChange={handleParameterModeChange}
            step="reactor-architecture"
          />
        );
      case 'anode-biofilm':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="anode-biofilm"
          />
        );
      case 'cathode-catalyst':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="cathode-catalyst"
          />
        );
      case 'membrane-separator':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="membrane-separator"
          />
        );
      case 'electrical-interconnect':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="electrical-interconnect"
          />
        );
      case 'balance-of-plant':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="balance-of-plant"
          />
        );
      case 'sensors-analytics':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
            step="sensors-analytics"
          />
        );
      case 'biology-startup':
        return (
          <CaseFormStackDetailStep
            formValues={formValues}
            onFieldChange={handleStringFieldChange}
            onParameterModeChange={handleParameterModeChange}
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
            onParameterModeChange={handleParameterModeChange}
            painPointsError={operationValidationErrors.painPoints}
            phError={numericFieldErrors.ph}
            substrateProfileError={operationValidationErrors.substrateProfile}
            temperatureError={numericFieldErrors.temperature}
          />
        );
      case 'suppliers-constraints':
        return (
          <CaseFormSuppliersEvidenceStep
            actorRole={actorRole}
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
        badge="Stack configurator"
        chips={[
          autosaveLabel,
          `${currentStepIndex + 1} of ${caseFormStepValues.length} steps`,
        ]}
        description="Define the stack inputs here. Diagnosis, recommendations, modeling, report, and audit are generated only after deterministic submission."
        title={
          formValues.caseId.trim() || activePreset?.label || 'Configure stack'
        }
      />

      <SummaryRail items={summaryItems} label="Current input snapshot" />

      <WorkspaceSection
        actions={
          <>
            <button className="secondary" onClick={resetForm} type="button">
              Reset input draft
            </button>
            {canOpenInternalEvidence(actorRole) ? (
              <Link className="button secondary" href="/evidence/review">
                Open admin evidence queue
              </Link>
            ) : (
              <p className="muted">
                Evidence review stays internal. Trace accepted records later
                through saved reports and evaluation history.
              </p>
            )}
          </>
        }
        description="Use the active panel to enter stack inputs. Navigation, draft context, presets, and readiness stay on the left so they do not compete with the generated outputs that arrive only after submission."
        eyebrow="Client input"
        title={
          formValues.caseId.trim() ||
          activePreset?.label ||
          'Stack input workbench'
        }
      >
        <div className="case-form-wizard-shell">
          <div className="case-form-wizard-shell__support">
            <CaseFormStepper
              completedSteps={completedSteps}
              currentStep={currentStep}
              onStepChange={handleStepperStepChange}
            />

            <WorkspaceDataCard tone={readinessTone}>
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Preflight preview</span>
                  <h3>Input vs generated output</h3>
                </div>
                <span className="meta-chip">{readinessLabel}</span>
              </div>
              <p>
                This preview only reports current readiness. METREV generates
                diagnosis, recommendations, modeling, report, and audit after
                deterministic submission.
              </p>
              <div className="case-form-preflight-grid">
                <section className="workspace-inline-card">
                  <h3>Readiness signals</h3>
                  <p>
                    {cockpitWarnings.length} stack posture gap(s) still
                    explicit.
                  </p>
                  <p className="muted">
                    {evidenceCount} evidence record(s) and {assumptionCount}{' '}
                    explicit assumption(s) will remain visible in the audit.
                  </p>
                  {readinessWarnings.length > 0 ? (
                    <ul className="workspace-bullet-list compact">
                      {readinessWarnings.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">
                      No explicit blockers are open for the current input state.
                    </p>
                  )}
                </section>
                <section className="workspace-inline-card">
                  <h3>Generated after submit</h3>
                  <div className="workspace-chip-list compact">
                    {deterministicOutputLabels.map((entry) => (
                      <span className="meta-chip" key={entry}>
                        {entry}
                      </span>
                    ))}
                  </div>
                  <p className="muted">
                    Final outputs depend on explicit inputs, evidence posture,
                    defaults, and missing-data disclosure.
                  </p>
                </section>
              </div>
            </WorkspaceDataCard>

            <WorkspaceDataCard>
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Draft status</span>
                  <h3>{currentStepMeta.label}</h3>
                </div>
                <span className="meta-chip">
                  {activePreset ? 'Preset loaded' : 'Manual draft'}
                </span>
              </div>
              <p>{currentStepMeta.description}</p>
              <div className="case-form-status-grid">
                <div>
                  <strong>Autosave and step history stay active</strong>
                  <p>
                    Move between inputs without losing the draft. Review and
                    submit preserves the current state again before the
                    deterministic handoff.
                  </p>
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

            <Collapsible
              countBadge={caseIntakePresets.length}
              defaultOpen={Boolean(activePresetId)}
              meta={
                activePreset?.label ??
                'Choose a validated starting point or keep the draft manual.'
              }
              title="Preset library"
            >
              <CaseFormPresetPicker
                activePresetId={activePresetId}
                embedded
                onApplyPreset={applyPreset}
                presets={caseIntakePresets}
              />
            </Collapsible>
          </div>

          <div className="case-form-wizard-shell__workspace">
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
        </div>

        {stepError ? <p className="error">{stepError}</p> : null}
        {submissionError ? <p className="error">{submissionError}</p> : null}
      </WorkspaceSection>
    </form>
  );
}
