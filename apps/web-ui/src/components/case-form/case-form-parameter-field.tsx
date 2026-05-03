'use client';

import * as React from 'react';

import type { CaseIntakeParameterMode } from '@/lib/case-intake';

import { Select } from '@/components/ui/select';

void React;

export interface CaseFormParameterFieldProps {
  children: React.ReactNode;
  className?: string;
  confidenceImpact: 'low' | 'medium' | 'high';
  defaultRationale?: string;
  hasSystemDefault: boolean;
  mode: CaseIntakeParameterMode;
  onModeChange: (mode: CaseIntakeParameterMode) => void;
  unit?: string;
}

export function CaseFormParameterField({
  children,
  className,
  confidenceImpact,
  defaultRationale,
  hasSystemDefault,
  mode,
  onModeChange,
  unit,
}: CaseFormParameterFieldProps) {
  const options = [
    {
      label: 'Client value',
      value: 'client',
      description:
        'Use the value entered below in the active deterministic run.',
    },
    ...(hasSystemDefault
      ? [
          {
            label: 'Use system default',
            value: 'system_default',
            description:
              defaultRationale ??
              'Use the backend default and keep it explicit in the audit trail.',
          },
        ]
      : []),
    {
      label: 'Exclude from current run',
      value: 'exclude',
      description:
        'Keep this parameter visible in the audit trail without using it as active input.',
    },
  ];

  const modeNote =
    mode === 'system_default'
      ? (defaultRationale ??
        'The backend default remains explicit in defaults used and audit output.')
      : mode === 'exclude'
        ? 'This parameter is omitted from the active run input but remains audit-visible.'
        : 'Client-provided values stay explicit in the deterministic run input.';

  return (
    <div
      className={['workspace-parameter-field', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="workspace-parameter-field__toolbar">
        <span className="badge subtle">Parameter control</span>
        <Select
          label="Parameter mode"
          onValueChange={(nextValue) =>
            onModeChange(nextValue as CaseIntakeParameterMode)
          }
          options={options}
          value={mode}
        />
      </div>
      {children}
      <div className="workspace-chip-list compact">
        {unit ? <span className="meta-chip">Unit {unit}</span> : null}
        <span className="meta-chip meta-chip--accent">
          Confidence impact {confidenceImpact}
        </span>
        {hasSystemDefault ? (
          <span className="meta-chip meta-chip--warning">
            System default available
          </span>
        ) : null}
      </div>
      <p className="workspace-parameter-field__note">{modeNote}</p>
    </div>
  );
}
