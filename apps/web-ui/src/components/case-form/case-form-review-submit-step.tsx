'use client';

import * as React from 'react';

import type {
  ExternalEvidenceCatalogItemSummary,
  ResearchDecisionIngestionPreview,
} from '@metrev/domain-contracts';

import type {
  AdvancedInputJsonField,
  CaseIntakeFormValues,
  CaseIntakePreset,
} from '@/lib/case-intake';

import { Textarea } from '@/components/ui/textarea';
import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

function splitCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function renderSummaryChips(values: string[], emptyMessage: string) {
  if (values.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="workspace-chip-list compact">
      {values.map((entry) => (
        <span className="meta-chip" key={entry}>
          {entry}
        </span>
      ))}
    </div>
  );
}

export interface CaseFormReviewSubmitStepProps {
  advancedInputErrors: Partial<Record<AdvancedInputJsonField, string>>;
  activePreset: CaseIntakePreset | undefined;
  evidenceCount: number;
  formValues: CaseIntakeFormValues;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
  preferredSupplierCount: number;
  researchDecisionInput: ResearchDecisionIngestionPreview | null;
  researchPackError: string | null;
  researchPackId: string | null;
  researchPackLoading: boolean;
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[];
  stackSummary: Array<{ key: string; label: string; value: string }>;
  warningMessages: string[];
}

export function CaseFormReviewSubmitStep({
  advancedInputErrors,
  activePreset,
  evidenceCount,
  formValues,
  onFieldChange,
  preferredSupplierCount,
  researchDecisionInput,
  researchPackError,
  researchPackId,
  researchPackLoading,
  selectedCatalogEvidence,
  stackSummary,
  warningMessages,
}: CaseFormReviewSubmitStepProps) {
  const painPoints = splitCommaSeparated(formValues.painPoints);
  const preferredSuppliers = splitCommaSeparated(formValues.preferredSuppliers);
  const currentSuppliers = splitCommaSeparated(formValues.currentSuppliers);
  const researchEvidenceTitles =
    researchDecisionInput?.evidence_records.map((entry) => entry.title) ?? [];

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Step 11</span>
        <h3>Review the deterministic handoff</h3>
        <div className="case-form-review-grid">
          <section className="workspace-inline-card">
            <h3>Context</h3>
            <p>
              {formatToken(formValues.technologyFamily)} ·{' '}
              {formatToken(formValues.primaryObjective)}
            </p>
            <p className="muted">
              {formValues.architectureFamily || 'Architecture not stated'} ·{' '}
              {formValues.currentTrl || 'TRL not stated'}
            </p>
            <p>
              {formValues.deploymentContext ||
                'No deployment context recorded yet.'}
            </p>
          </section>
          <section className="workspace-inline-card">
            <h3>Operating envelope</h3>
            <p>{formValues.influentType || 'Influent type not set yet.'}</p>
            <p className="muted">
              {formValues.substrateProfile ||
                'No substrate profile recorded yet.'}
            </p>
            <div className="workspace-chip-list compact">
              <span className="meta-chip">
                {formValues.temperature || 'n/a'} °C
              </span>
              <span className="meta-chip">pH {formValues.ph || 'n/a'}</span>
              <span className="meta-chip">
                {formValues.conductivity || 'n/a'} mS/cm
              </span>
              <span className="meta-chip">
                {formValues.hydraulicRetentionTime || 'n/a'} h
              </span>
            </div>
          </section>
          <section className="workspace-inline-card">
            <h3>Evidence posture</h3>
            <p>
              {evidenceCount} record(s) will travel with this intake payload.
            </p>
            <p className="muted">
              {selectedCatalogEvidence.length} accepted catalog evidence
              record(s) selected.
            </p>
            <p className="muted">
              {researchPackId
                ? researchPackLoading
                  ? 'Research pack evidence is loading.'
                  : `${researchDecisionInput?.evidence_records.length ?? 0} research-pack evidence record(s) attached.`
                : 'No research pack attached.'}
            </p>
            <p className="muted">
              Manual typed evidence:{' '}
              {formValues.evidenceTitle || 'not provided'}.
            </p>
          </section>
          <section className="workspace-inline-card">
            <h3>Preset and supplier posture</h3>
            <p>{activePreset?.label ?? 'Manual draft'}</p>
            <p className="muted">
              {preferredSupplierCount} preferred supplier chip(s) attached.
            </p>
            <p className="muted">
              Membrane presence: {formValues.membranePresence || 'not stated'}.
            </p>
          </section>
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard>
        <span className="badge subtle">Scientific model inputs</span>
        <h3>Wastewater, reactor, and biosensor parameters</h3>
        <p>
          Paste source-backed JSON objects when parameterizing the model. Each
          model parameter needs a value, SI unit, source kind, and source
          reference. Partial inputs stay visible and return an insufficient-data
          result.
        </p>
        <div className="workspace-form-grid">
          <Textarea
            className="workspace-form-field--wide"
            error={advancedInputErrors.mechanisticModelJson}
            label="Coupled MFC/MEC model input"
            onChange={(event) =>
              onFieldChange('mechanisticModelJson', event.target.value)
            }
            placeholder={
              '{\n  "system_type": "MFC",\n  "...": "Paste the typed mechanistic_model object"\n}'
            }
            rows={8}
            value={formValues.mechanisticModelJson}
          />
          <Textarea
            className="workspace-form-field--wide"
            error={advancedInputErrors.biosensorConfigurationJson}
            label="Electrochemical biosensor configuration"
            onChange={(event) =>
              onFieldChange('biosensorConfigurationJson', event.target.value)
            }
            placeholder={
              '{\n  "deployment_mode": "standalone",\n  "...": "Paste the typed biosensor object"\n}'
            }
            rows={6}
            value={formValues.biosensorConfigurationJson}
          />
          <Textarea
            className="workspace-form-field--wide"
            error={advancedInputErrors.wastewaterQualityJson}
            hint="COD in mgCOD/L is converted to kgCOD/m³ for the model when no case COD is supplied. The original value, unit, source, and conversion rule are retained. Other water-quality fields remain measurement context unless a validated balance is implemented."
            label="Wastewater quality measurements"
            onChange={(event) =>
              onFieldChange('wastewaterQualityJson', event.target.value)
            }
            placeholder={
              '{\n  "cod_mg_cod_l": {\n    "value": 850,\n    "unit": "mgCOD/L",\n    "source_kind": "measured",\n    "source_ref": "lab-sample:WW-001"\n  },\n  "sampling_point": "influent"\n}'
            }
            rows={8}
            value={formValues.wastewaterQualityJson}
          />
        </div>
      </WorkspaceDataCard>

      <div className="case-form-review-grid">
        <WorkspaceDataCard>
          <h3>Stack summary</h3>
          <div className="workspace-chip-list compact">
            {stackSummary.map((entry) => (
              <span className="meta-chip" key={entry.key}>
                {entry.label}: {entry.value}
              </span>
            ))}
          </div>
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Missing or default-sensitive warnings</h3>
          {warningMessages.length > 0 ? (
            <ul className="workspace-bullet-list compact">
              {warningMessages.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              No explicit cockpit warnings are open for the configured stack.
            </p>
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Pain points</h3>
          {renderSummaryChips(painPoints, 'No pain points were added yet.')}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Preferred suppliers</h3>
          {renderSummaryChips(
            preferredSuppliers,
            'No preferred suppliers were added yet.',
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Current suppliers</h3>
          {renderSummaryChips(
            currentSuppliers,
            'No current suppliers were added yet.',
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Accepted evidence selection</h3>
          {selectedCatalogEvidence.length > 0 ? (
            <div className="workspace-chip-list compact">
              {selectedCatalogEvidence.map((entry) => (
                <span className="meta-chip" key={entry.id}>
                  {entry.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No accepted catalog evidence selected.</p>
          )}
        </WorkspaceDataCard>
        <WorkspaceDataCard>
          <h3>Research pack attachment</h3>
          {researchPackError ? (
            <p className="error">{researchPackError}</p>
          ) : researchPackLoading ? (
            <p className="muted">Loading research pack evidence.</p>
          ) : researchEvidenceTitles.length > 0 ? (
            <div className="workspace-chip-list compact">
              {researchEvidenceTitles.map((entry) => (
                <span className="meta-chip" key={entry}>
                  {entry}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No research pack attached.</p>
          )}
        </WorkspaceDataCard>
      </div>

      <WorkspaceDataCard tone="warning">
        <Textarea
          hint="This note remains explicit in the deterministic audit trail. Separate assumptions with commas when you want them split into distinct items."
          label="Working assumptions"
          onChange={(event) =>
            onFieldChange('assumptionsNote', event.target.value)
          }
          placeholder="Pilot skid footprint remains fixed for the current phase, separator strategy is central to recovery credibility"
          value={formValues.assumptionsNote}
        />
      </WorkspaceDataCard>
    </div>
  );
}
