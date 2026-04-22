'use client';

import * as React from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import type { CaseIntakeFormValues, CaseIntakePreset } from '@/lib/case-intake';

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
  activePreset: CaseIntakePreset | undefined;
  evidenceCount: number;
  formValues: CaseIntakeFormValues;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
  preferredSupplierCount: number;
  selectedCatalogEvidence: ExternalEvidenceCatalogItemSummary[];
}

export function CaseFormReviewSubmitStep({
  activePreset,
  evidenceCount,
  formValues,
  onFieldChange,
  preferredSupplierCount,
  selectedCatalogEvidence,
}: CaseFormReviewSubmitStepProps) {
  const painPoints = splitCommaSeparated(formValues.painPoints);
  const preferredSuppliers = splitCommaSeparated(formValues.preferredSuppliers);
  const currentSuppliers = splitCommaSeparated(formValues.currentSuppliers);

  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Step 4</span>
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

      <div className="case-form-review-grid">
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
