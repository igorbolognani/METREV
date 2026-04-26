'use client';

import * as React from 'react';

import type { CaseIntakeFormValues } from '@/lib/case-intake';

import { ChipInput } from '@/components/ui/chip-input';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

const painPointSuggestions = [
  'weak monitoring',
  'unstable startup',
  'high internal resistance',
  'cathode flooding risk',
  'membrane fouling',
  'gas handling detail incomplete',
];

export interface CaseFormOperationStepProps {
  conductivityError?: string | null;
  formValues: CaseIntakeFormValues;
  hydraulicRetentionTimeError?: string | null;
  influentTypeError?: string;
  onFieldChange: (field: keyof CaseIntakeFormValues, value: string) => void;
  painPointsError?: string;
  phError?: string | null;
  substrateProfileError?: string;
  temperatureError?: string | null;
}

export function CaseFormOperationStep({
  conductivityError,
  formValues,
  hydraulicRetentionTimeError,
  influentTypeError,
  onFieldChange,
  painPointsError,
  phError,
  substrateProfileError,
  temperatureError,
}: CaseFormOperationStepProps) {
  return (
    <div className="workspace-form-layout">
      <WorkspaceDataCard>
        <span className="badge subtle">Step 9</span>
        <h3>Operating envelope</h3>
        <div className="workspace-form-grid workspace-form-grid--two">
          <ChipInput
            className="workspace-form-field--wide"
            error={painPointsError}
            hint="Press Enter or comma to create each pain-point chip."
            label="Current pain points"
            onValueChange={(value) => onFieldChange('painPoints', value)}
            placeholder="Add a pain point"
            suggestions={painPointSuggestions}
            value={formValues.painPoints}
          />
          <Input
            error={influentTypeError}
            label="Influent type"
            onChange={(event) =>
              onFieldChange('influentType', event.target.value)
            }
            placeholder="high-strength food-processing wastewater"
            value={formValues.influentType}
          />
          <Textarea
            className="workspace-form-field--wide"
            error={substrateProfileError}
            label="Substrate profile"
            onChange={(event) =>
              onFieldChange('substrateProfile', event.target.value)
            }
            placeholder="Describe biodegradability, solids profile, or sidestream composition."
            value={formValues.substrateProfile}
          />
          <Textarea
            className="workspace-form-field--wide"
            hint="Describe the operating mode, recirculation logic, or shift pattern that constrains this run."
            label="Operating regime"
            onChange={(event) =>
              onFieldChange('operatingRegime', event.target.value)
            }
            placeholder="Continuous recirculation with batch cleaning stopouts"
            value={formValues.operatingRegime ?? ''}
          />
          <Input
            error={temperatureError ?? undefined}
            hint="Inline validation runs as soon as the field is populated."
            label="Temperature"
            onChange={(event) =>
              onFieldChange('temperature', event.target.value)
            }
            unit="°C"
            value={formValues.temperature}
          />
          <Input
            error={phError ?? undefined}
            label="pH"
            onChange={(event) => onFieldChange('ph', event.target.value)}
            unit="pH"
            value={formValues.ph}
          />
          <Input
            error={conductivityError ?? undefined}
            label="Conductivity"
            onChange={(event) =>
              onFieldChange('conductivity', event.target.value)
            }
            unit="mS/cm"
            value={formValues.conductivity}
          />
          <Input
            error={hydraulicRetentionTimeError ?? undefined}
            label="Hydraulic retention time"
            onChange={(event) =>
              onFieldChange('hydraulicRetentionTime', event.target.value)
            }
            unit="h"
            value={formValues.hydraulicRetentionTime}
          />
        </div>
      </WorkspaceDataCard>

      <WorkspaceDataCard tone="warning">
        <span className="badge subtle">Validation posture</span>
        <h3>Keep the envelope explicit</h3>
        <p>
          These values feed normalization, plausibility checks, simulation
          enrichment, and the audit trail. Unit-aware numeric fields should stay
          sparse rather than approximate.
        </p>
      </WorkspaceDataCard>
    </div>
  );
}
