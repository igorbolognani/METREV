'use client';

import * as React from 'react';

import type {
    CaseIntakeFormValues,
    CaseIntakeParameterFieldId,
    CaseIntakeParameterMode,
} from '@/lib/case-intake';
import {
    caseIntakeParameterConfigs,
    getCaseIntakeParameterMode,
} from '@/lib/case-intake';

import { CaseFormParameterField } from '@/components/case-form/case-form-parameter-field';
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
  onParameterModeChange: (
    field: CaseIntakeParameterFieldId,
    mode: CaseIntakeParameterMode,
  ) => void;
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
  onParameterModeChange,
  painPointsError,
  phError,
  substrateProfileError,
  temperatureError,
}: CaseFormOperationStepProps) {
  function renderParameterField(
    field: CaseIntakeParameterFieldId,
    children: React.ReactNode,
  ) {
    const parameterConfig = caseIntakeParameterConfigs[field];

    return (
      <CaseFormParameterField
        confidenceImpact={parameterConfig.confidenceImpact}
        defaultRationale={parameterConfig.defaultRationale}
        hasSystemDefault={typeof parameterConfig.defaultValue !== 'undefined'}
        mode={getCaseIntakeParameterMode(formValues, field)}
        onModeChange={(nextMode) => onParameterModeChange(field, nextMode)}
        unit={parameterConfig.unit}
      >
        {children}
      </CaseFormParameterField>
    );
  }

  function renderParameterInput(props: {
    error?: string | null;
    field: CaseIntakeParameterFieldId;
    label: string;
    value: string;
  }) {
    return renderParameterField(
      props.field,
      <Input
        error={props.error ?? undefined}
        hint={
          props.field === 'temperature'
            ? 'Inline validation runs as soon as the field is populated.'
            : undefined
        }
        label={props.label}
        onChange={(event) => onFieldChange(props.field, event.target.value)}
        unit={
          props.field === 'temperature'
            ? '°C'
            : props.field === 'ph'
              ? 'pH'
              : props.field === 'conductivity'
                ? 'mS/cm'
                : 'h'
        }
        value={props.value}
      />,
    );
  }

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
          {renderParameterField(
            'influentType',
            <Input
              error={influentTypeError}
              label="Influent type"
              onChange={(event) =>
                onFieldChange('influentType', event.target.value)
              }
              placeholder="high-strength food-processing wastewater"
              value={formValues.influentType}
            />,
          )}
          {renderParameterField(
            'substrateProfile',
            <Textarea
              className="workspace-form-field--wide"
              error={substrateProfileError}
              label="Substrate profile"
              onChange={(event) =>
                onFieldChange('substrateProfile', event.target.value)
              }
              placeholder="Describe biodegradability, solids profile, or sidestream composition."
              value={formValues.substrateProfile}
            />,
          )}
          {renderParameterField(
            'operatingRegime',
            <Textarea
              className="workspace-form-field--wide"
              hint="Describe the operating mode, recirculation logic, or shift pattern that constrains this run."
              label="Operating regime"
              onChange={(event) =>
                onFieldChange('operatingRegime', event.target.value)
              }
              placeholder="Continuous recirculation with batch cleaning stopouts"
              value={formValues.operatingRegime ?? ''}
            />,
          )}
          {renderParameterInput({
            error: temperatureError,
            field: 'temperature',
            label: 'Temperature',
            value: formValues.temperature,
          })}
          {renderParameterInput({
            error: phError,
            field: 'ph',
            label: 'pH',
            value: formValues.ph,
          })}
          {renderParameterInput({
            error: conductivityError,
            field: 'conductivity',
            label: 'Conductivity',
            value: formValues.conductivity,
          })}
          {renderParameterInput({
            error: hydraulicRetentionTimeError,
            field: 'hydraulicRetentionTime',
            label: 'Hydraulic retention time',
            value: formValues.hydraulicRetentionTime,
          })}
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
