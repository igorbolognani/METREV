'use client';

import * as React from 'react';

import type { CaseIntakeFormValues } from '@/lib/case-intake';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

const technologyFamilyOptions = [
  { label: 'Microbial fuel cell', value: 'microbial_fuel_cell' },
  {
    label: 'Microbial electrolysis cell',
    value: 'microbial_electrolysis_cell',
  },
  {
    label: 'Microbial electrochemical technology',
    value: 'microbial_electrochemical_technology',
  },
] as const;

const primaryObjectiveOptions = [
  { label: 'Wastewater treatment', value: 'wastewater_treatment' },
  { label: 'Hydrogen recovery', value: 'hydrogen_recovery' },
  { label: 'Nitrogen recovery', value: 'nitrogen_recovery' },
  { label: 'Sensing', value: 'sensing' },
  { label: 'Low power generation', value: 'low_power_generation' },
  { label: 'Biogas synergy', value: 'biogas_synergy' },
  { label: 'Other', value: 'other' },
] as const;

const currentTrlSuggestions = ['lab', 'bench', 'pilot', 'field'];

export interface CaseFormContextStepProps {
  currentTrlError?: string;
  decisionHorizonError?: string;
  deploymentContextError?: string;
  formValues: CaseIntakeFormValues;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
}

export function CaseFormContextStep({
  currentTrlError,
  decisionHorizonError,
  deploymentContextError,
  formValues,
  onFieldChange,
}: CaseFormContextStepProps) {
  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Step 1</span>
        <h3>Context & objective</h3>
        <div className="workspace-form-grid workspace-form-grid--two">
          <Input
            hint="Optional case identifier for direct history lookup."
            label="Case identifier"
            onChange={(event) => onFieldChange('caseId', event.target.value)}
            placeholder="WWT-2026-001"
            value={formValues.caseId}
          />
          <Select
            label="Technology family"
            onValueChange={(value) => onFieldChange('technologyFamily', value)}
            options={[...technologyFamilyOptions]}
            value={formValues.technologyFamily}
          />
          <Select
            label="Primary objective"
            onValueChange={(value) => onFieldChange('primaryObjective', value)}
            options={[...primaryObjectiveOptions]}
            value={formValues.primaryObjective}
          />
          <Input
            error={currentTrlError}
            hint={`Suggestions: ${currentTrlSuggestions.join(', ')}`}
            label="Current TRL"
            onChange={(event) =>
              onFieldChange('currentTrl', event.target.value)
            }
            placeholder="pilot"
            value={formValues.currentTrl}
          />
          <Input
            error={decisionHorizonError}
            label="Decision horizon"
            onChange={(event) =>
              onFieldChange('decisionHorizon', event.target.value)
            }
            placeholder="12-month retrofit validation window"
            value={formValues.decisionHorizon}
          />
          <Textarea
            className="workspace-form-field--wide"
            error={deploymentContextError}
            hint="Describe where the system operates, the stakeholders involved, and the success condition for this run."
            label="Deployment context"
            onChange={(event) =>
              onFieldChange('deploymentContext', event.target.value)
            }
            placeholder="Industrial sidestream retrofit at the equalization tank with a go/no-go decision for pilot expansion."
            value={formValues.deploymentContext}
          />
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard tone="success">
        <span className="badge subtle">Framing guidance</span>
        <h3>What this step should make explicit</h3>
        <p>
          Keep the decision frame concrete. The downstream deterministic run
          uses this step to interpret the stack choices, evidence posture,
          missing data, and supplier relevance that follow.
        </p>
      </WorkspaceDataCard>
    </div>
  );
}
