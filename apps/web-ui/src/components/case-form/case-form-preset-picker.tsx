'use client';

import * as React from 'react';

import type { CaseIntakePreset } from '@/lib/case-intake';

import { WorkspaceDataCard } from '@/components/workspace-chrome';
import { formatToken } from '@/lib/formatting';

void React;

export interface CaseFormPresetPickerProps {
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  presets: CaseIntakePreset[];
}

export function CaseFormPresetPicker({
  activePresetId,
  onApplyPreset,
  presets,
}: CaseFormPresetPickerProps) {
  return (
    <WorkspaceDataCard tone="accent">
      <div className="workspace-data-card__header">
        <div>
          <span className="badge subtle">Accelerators</span>
          <h3>Validated presets</h3>
        </div>
        {activePresetId ? (
          <span className="meta-chip">Preset active</span>
        ) : null}
      </div>
      <div className="workspace-card-list">
        {presets.map((preset) => {
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
                  onClick={() => onApplyPreset(preset.id)}
                  type="button"
                >
                  {isActive ? 'Reload preset' : 'Load preset'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </WorkspaceDataCard>
  );
}
