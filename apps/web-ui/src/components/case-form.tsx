'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { AcceptedEvidenceSelector } from '@/components/accepted-evidence-selector';
import { PanelTabs } from '@/components/workbench/panel-tabs';
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
  buildCaseInputFromFormValues,
  caseIntakePresets,
  defaultCaseIntakeFormValues,
  findCaseIntakePreset,
  type CaseIntakeFormValues,
} from '@/lib/case-intake';
import { formatToken } from '@/lib/formatting';

type IntakeTab =
  | 'context'
  | 'operation'
  | 'suppliers'
  | 'evidence'
  | 'assumptions';

const numberFieldLabels: Record<
  'temperature' | 'ph' | 'conductivity' | 'hydraulicRetentionTime',
  string
> = {
  temperature: 'Temperature',
  ph: 'pH',
  conductivity: 'Conductivity',
  hydraulicRetentionTime: 'Hydraulic retention time',
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

export function CaseForm() {
  const router = useRouter();
  const [formValues, setFormValues] = React.useState<CaseIntakeFormValues>(
    defaultCaseIntakeFormValues,
  );
  const [activePresetId, setActivePresetId] = React.useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = React.useState<IntakeTab>('context');
  const [selectedCatalogEvidence, setSelectedCatalogEvidence] = React.useState<
    ExternalEvidenceCatalogItemSummary[]
  >([]);
  const [submissionError, setSubmissionError] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const storedDraft = loadDraftInput();
    const storedError = loadSubmissionError();

    if (storedDraft) {
      setFormValues(storedDraft.formValues);
      setActivePresetId(storedDraft.activePresetId);
      setSelectedCatalogEvidence(storedDraft.selectedCatalogEvidence);
    }

    if (storedError) {
      setSubmissionError(storedError);
      clearSubmissionError();
    }
  }, []);

  React.useEffect(() => {
    saveDraftInput({
      formValues,
      activePresetId,
      selectedCatalogEvidence,
    });
  }, [activePresetId, formValues, selectedCatalogEvidence]);

  const activePreset = findCaseIntakePreset(activePresetId);
  const manualEvidenceCount =
    formValues.evidenceTitle.trim() && formValues.evidenceSummary.trim() ? 1 : 0;
  const evidenceCount = selectedCatalogEvidence.length + manualEvidenceCount;
  const preferredSupplierCount = countCommaSeparated(formValues.preferredSuppliers);
  const assumptionCount = countCommaSeparated(formValues.assumptionsNote);
  const numericFieldErrors = {
    temperature: getNumberFieldError(
      formValues.temperature,
      numberFieldLabels.temperature,
    ),
    ph: getNumberFieldError(formValues.ph, numberFieldLabels.ph),
    conductivity: getNumberFieldError(
      formValues.conductivity,
      numberFieldLabels.conductivity,
    ),
    hydraulicRetentionTime: getNumberFieldError(
      formValues.hydraulicRetentionTime,
      numberFieldLabels.hydraulicRetentionTime,
    ),
  };
  const hasNumericErrors = Object.values(numericFieldErrors).some(Boolean);
  const tabs = [
    { id: 'context', label: 'Case context' },
    { id: 'operation', label: 'Operating conditions' },
    { id: 'suppliers', label: 'Supplier context' },
    { id: 'evidence', label: 'Evidence', badge: evidenceCount },
    { id: 'assumptions', label: 'Assumptions', badge: assumptionCount || undefined },
  ] as const;

  function updateField<Field extends keyof CaseIntakeFormValues>(
    field: Field,
    value: CaseIntakeFormValues[Field],
  ) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyPreset(presetId: string) {
    const preset = findCaseIntakePreset(presetId);
    if (!preset) {
      return;
    }

    setFormValues(preset.formValues);
    setActivePresetId(preset.id);
    setSelectedCatalogEvidence([]);
    setActiveTab('context');
    setSubmissionError(null);
  }

  function resetForm() {
    setFormValues(defaultCaseIntakeFormValues);
    setActivePresetId(null);
    setSelectedCatalogEvidence([]);
    setActiveTab('context');
    setSubmissionError(null);
    clearPendingSubmission();
    clearSubmissionError();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasNumericErrors) {
      setSubmissionError(
        'One or more numeric fields are invalid. Fix the highlighted fields before submitting.',
      );
      return;
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
    clearSubmissionError();
    saveDraftInput({
      formValues,
      activePresetId,
      selectedCatalogEvidence,
    });
    savePendingSubmission({
      idempotencyKey,
      payload,
      createdAt: new Date().toISOString(),
    });

    router.push('/cases/new/submitting');
  }

  return (
    <form className="workspace-page" onSubmit={handleSubmit}>
      <section className="workspace-stats-grid" aria-label="Input deck summary">
        <WorkspaceStatCard
          label="Scenario"
          value={`${formatToken(formValues.technologyFamily)} / ${formatToken(formValues.primaryObjective)}`}
          detail={formValues.architectureFamily || 'Architecture still open.'}
          tone="accent"
        />
        <WorkspaceStatCard
          label="Operating envelope"
          value={
            formValues.temperature || formValues.ph
              ? `${formValues.temperature || '?'} °C · pH ${formValues.ph || '?'}`
              : 'Still incomplete'
          }
          detail={
            formValues.conductivity || formValues.hydraulicRetentionTime
              ? `${formValues.conductivity || '?'} mS/cm · ${formValues.hydraulicRetentionTime || '?'} h`
              : 'Conductivity and retention time are not set yet.'
          }
        />
        <WorkspaceStatCard
          label="Supplier context"
          value={`${preferredSupplierCount} preferred`}
          detail={`${countCommaSeparated(formValues.currentSuppliers)} current supplier entries recorded.`}
        />
        <WorkspaceStatCard
          label="Evidence"
          value={`${evidenceCount} attached`}
          detail="Accepted catalog evidence and manual typed support remain explicit in the payload."
          tone="warning"
        />
      </section>

      <WorkspaceSection
        eyebrow="Input deck"
        title={formValues.caseId.trim() || activePreset?.label || 'Draft a new evaluation'}
        description="Capture context, operating envelope, supplier posture, evidence, and assumptions in one predictable flow before handing the case into the deterministic workspace."
        actions={
          <>
            <button className="secondary" type="button" onClick={resetForm}>
              Reset draft
            </button>
            <Link className="button secondary" href="/evidence/review">
              Review evidence queue
            </Link>
          </>
        }
      >
        <div className="workspace-data-card workspace-data-card--default">
          <div className="workspace-data-card__header">
            <div>
              <span className="badge subtle">Workflow sections</span>
              <h3>One navigation system, one drafting surface</h3>
            </div>
            <span className="meta-chip">
              {activePreset ? 'Preset loaded' : 'Manual draft'}
            </span>
          </div>
          <PanelTabs
            activeTab={activeTab}
            label="Input deck sections"
            onChange={setActiveTab}
            tabs={tabs}
          />
        </div>

        {submissionError ? <p className="error">{submissionError}</p> : null}

        {activeTab === 'context' ? (
          <div className="workspace-form-layout">
            <WorkspaceDataCard>
              <span className="badge subtle">Case context</span>
              <div className="workspace-form-grid workspace-form-grid--two">
                <label>
                  Case identifier
                  <input
                    value={formValues.caseId}
                    onChange={(event) => updateField('caseId', event.target.value)}
                    placeholder="optional case id"
                  />
                </label>
                <label>
                  Technology family
                  <select
                    value={formValues.technologyFamily}
                    onChange={(event) =>
                      updateField('technologyFamily', event.target.value)
                    }
                  >
                    <option value="microbial_fuel_cell">Microbial fuel cell</option>
                    <option value="microbial_electrolysis_cell">
                      Microbial electrolysis cell
                    </option>
                    <option value="microbial_electrochemical_technology">
                      Microbial electrochemical technology
                    </option>
                  </select>
                </label>
                <label>
                  Architecture family
                  <input
                    value={formValues.architectureFamily}
                    onChange={(event) =>
                      updateField('architectureFamily', event.target.value)
                    }
                    placeholder="single_chamber, dual_chamber, modular..."
                  />
                </label>
                <label>
                  Primary objective
                  <select
                    value={formValues.primaryObjective}
                    onChange={(event) =>
                      updateField('primaryObjective', event.target.value)
                    }
                  >
                    <option value="wastewater_treatment">Wastewater treatment</option>
                    <option value="hydrogen_recovery">Hydrogen recovery</option>
                    <option value="nitrogen_recovery">Nitrogen recovery</option>
                    <option value="sensing">Sensing</option>
                    <option value="low_power_generation">Low power generation</option>
                    <option value="biogas_synergy">Biogas synergy</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label>
                  Current TRL
                  <input
                    value={formValues.currentTrl}
                    onChange={(event) =>
                      updateField('currentTrl', event.target.value)
                    }
                    placeholder="lab, bench, pilot, field"
                  />
                </label>
                <label>
                  Decision horizon
                  <input
                    value={formValues.decisionHorizon}
                    onChange={(event) =>
                      updateField('decisionHorizon', event.target.value)
                    }
                    placeholder="3-month validation, pilot-to-scale..."
                  />
                </label>
                <label className="workspace-form-field--wide">
                  Deployment context
                  <textarea
                    value={formValues.deploymentContext}
                    onChange={(event) =>
                      updateField('deploymentContext', event.target.value)
                    }
                    placeholder="Where the system is being evaluated, what environment matters, and what success means."
                  />
                </label>
                <label className="workspace-form-field--wide">
                  Current pain points
                  <textarea
                    value={formValues.painPoints}
                    onChange={(event) =>
                      updateField('painPoints', event.target.value)
                    }
                    placeholder="comma-separated issues such as high internal resistance, unstable startup, weak monitoring"
                  />
                </label>
              </div>
            </WorkspaceDataCard>

            <WorkspaceDataCard tone="accent">
              <div className="workspace-data-card__header">
                <div>
                  <span className="badge subtle">Accelerators</span>
                  <h3>Validated presets</h3>
                </div>
                {activePreset ? <span className="meta-chip">Preset active</span> : null}
              </div>
              <div className="workspace-card-list">
                {caseIntakePresets.map((preset) => {
                  const isActive = activePresetId === preset.id;

                  return (
                    <article
                      className={`workspace-inline-card${isActive ? ' active' : ''}`}
                      key={preset.id}
                    >
                      <div className="workspace-data-card__header">
                        <div>
                          <h3>{preset.label}</h3>
                          <p>{preset.description}</p>
                        </div>
                        <span className="meta-chip">
                          {formatToken(preset.formValues.primaryObjective)}
                        </span>
                      </div>
                      <div className="workspace-chip-list compact">
                        {preset.focusAreas.map((entry) => (
                          <span className="meta-chip" key={entry}>
                            {entry}
                          </span>
                        ))}
                      </div>
                      <div className="workspace-action-row">
                        <button
                          className={isActive ? '' : 'secondary'}
                          type="button"
                          onClick={() => applyPreset(preset.id)}
                        >
                          {isActive ? 'Reload preset' : 'Load preset'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </WorkspaceDataCard>
          </div>
        ) : null}

        {activeTab === 'operation' ? (
          <WorkspaceDataCard>
            <span className="badge subtle">Operating conditions</span>
            <div className="workspace-form-grid workspace-form-grid--two">
              <label>
                Influent type
                <input
                  value={formValues.influentType}
                  onChange={(event) => updateField('influentType', event.target.value)}
                  placeholder="industrial wastewater, sidestream, synthetic feed..."
                />
              </label>
              <label>
                Membrane presence
                <input
                  value={formValues.membranePresence}
                  onChange={(event) =>
                    updateField('membranePresence', event.target.value)
                  }
                  placeholder="present, absent, unknown..."
                />
              </label>
              <label className="workspace-form-field--wide">
                Substrate profile
                <textarea
                  value={formValues.substrateProfile}
                  onChange={(event) =>
                    updateField('substrateProfile', event.target.value)
                  }
                  placeholder="Describe biodegradability, solids profile, or sidestream composition."
                />
              </label>
              <label>
                Temperature (°C)
                <input
                  value={formValues.temperature}
                  onChange={(event) => updateField('temperature', event.target.value)}
                  placeholder="25"
                />
                {numericFieldErrors.temperature ? (
                  <span className="field-error">{numericFieldErrors.temperature}</span>
                ) : null}
              </label>
              <label>
                pH
                <input
                  value={formValues.ph}
                  onChange={(event) => updateField('ph', event.target.value)}
                  placeholder="7.0"
                />
                {numericFieldErrors.ph ? (
                  <span className="field-error">{numericFieldErrors.ph}</span>
                ) : null}
              </label>
              <label>
                Conductivity (mS/cm)
                <input
                  value={formValues.conductivity}
                  onChange={(event) =>
                    updateField('conductivity', event.target.value)
                  }
                  placeholder="8"
                />
                {numericFieldErrors.conductivity ? (
                  <span className="field-error">{numericFieldErrors.conductivity}</span>
                ) : null}
              </label>
              <label>
                Hydraulic retention time (h)
                <input
                  value={formValues.hydraulicRetentionTime}
                  onChange={(event) =>
                    updateField('hydraulicRetentionTime', event.target.value)
                  }
                  placeholder="12"
                />
                {numericFieldErrors.hydraulicRetentionTime ? (
                  <span className="field-error">
                    {numericFieldErrors.hydraulicRetentionTime}
                  </span>
                ) : null}
              </label>
            </div>
          </WorkspaceDataCard>
        ) : null}

        {activeTab === 'suppliers' ? (
          <WorkspaceDataCard>
            <span className="badge subtle">Supplier context</span>
            <div className="workspace-form-grid workspace-form-grid--two">
              <label>
                Current suppliers
                <input
                  value={formValues.currentSuppliers}
                  onChange={(event) =>
                    updateField('currentSuppliers', event.target.value)
                  }
                  placeholder="comma-separated incumbent suppliers"
                />
              </label>
              <label>
                Preferred suppliers
                <input
                  value={formValues.preferredSuppliers}
                  onChange={(event) =>
                    updateField('preferredSuppliers', event.target.value)
                  }
                  placeholder="comma-separated shortlist candidates"
                />
              </label>
            </div>
            <p className="muted">
              Supplier preferences stay explicit and are carried into the evaluation
              audit trail and shortlist recommendations.
            </p>
          </WorkspaceDataCard>
        ) : null}

        {activeTab === 'evidence' ? (
          <div className="workspace-form-layout">
            <AcceptedEvidenceSelector
              selectedEvidence={selectedCatalogEvidence}
              onSelectionChange={setSelectedCatalogEvidence}
            />

            <WorkspaceDataCard tone="warning">
              <span className="badge subtle">Manual typed evidence</span>
              <div className="workspace-form-grid workspace-form-grid--two">
                <label>
                  Evidence type
                  <select
                    value={formValues.evidenceType}
                    onChange={(event) =>
                      updateField(
                        'evidenceType',
                        event.target.value as typeof formValues.evidenceType,
                      )
                    }
                  >
                    <option value="internal_benchmark">Internal benchmark</option>
                    <option value="literature_evidence">Literature evidence</option>
                    <option value="supplier_claim">Supplier claim</option>
                    <option value="engineering_assumption">
                      Engineering assumption
                    </option>
                    <option value="derived_heuristic">Derived heuristic</option>
                  </select>
                </label>
                <label>
                  Strength level
                  <select
                    value={formValues.evidenceStrength}
                    onChange={(event) =>
                      updateField(
                        'evidenceStrength',
                        event.target.value as typeof formValues.evidenceStrength,
                      )
                    }
                  >
                    <option value="weak">Weak</option>
                    <option value="moderate">Moderate</option>
                    <option value="strong">Strong</option>
                  </select>
                </label>
                <label className="workspace-form-field--wide">
                  Evidence title
                  <input
                    value={formValues.evidenceTitle}
                    onChange={(event) =>
                      updateField('evidenceTitle', event.target.value)
                    }
                    placeholder="Pilot baseline, supplier datasheet, internal trial..."
                  />
                </label>
                <label className="workspace-form-field--wide">
                  Evidence summary
                  <textarea
                    value={formValues.evidenceSummary}
                    onChange={(event) =>
                      updateField('evidenceSummary', event.target.value)
                    }
                    placeholder="Short description of the evidence and why it matters to this run."
                  />
                </label>
              </div>
            </WorkspaceDataCard>
          </div>
        ) : null}

        {activeTab === 'assumptions' ? (
          <WorkspaceDataCard>
            <span className="badge subtle">Assumptions and defaults</span>
            <label className="workspace-form-field--wide">
              Working assumptions
              <textarea
                value={formValues.assumptionsNote}
                onChange={(event) =>
                  updateField('assumptionsNote', event.target.value)
                }
                placeholder="Comma-separated assumptions that must remain explicit in the deterministic run."
              />
            </label>
            <div className="workspace-detail-grid">
              <WorkspaceDataCard tone="warning">
                <h3>Why this matters</h3>
                <p>
                  Defaults, missing data, supplier claims, and low-strength evidence
                  will remain explicit in the resulting workspace and report.
                </p>
              </WorkspaceDataCard>
              <WorkspaceDataCard>
                <h3>Expected handoff</h3>
                <p>
                  Submitting this form triggers normalization, validation, simulation
                  enrichment, deterministic rules, output validation, and workspace
                  preparation before the result page opens.
                </p>
              </WorkspaceDataCard>
            </div>
          </WorkspaceDataCard>
        ) : null}

        <div className="workspace-submit-row">
          <div>
            <strong>Ready to run</strong>
            <p>
              Submission remains synchronous in this phase, but the next screen will
              show a deterministic progress flow and preserve the draft if anything
              fails.
            </p>
          </div>
          <button type="submit">Run deterministic evaluation</button>
        </div>
      </WorkspaceSection>
    </form>
  );
}
