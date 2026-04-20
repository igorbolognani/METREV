'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { AcceptedEvidenceSelector } from '@/components/accepted-evidence-selector';
import { PanelTabs } from '@/components/workbench/panel-tabs';
import { evaluateCase } from '@/lib/api';
import {
  buildCaseInputFromFormValues,
  caseIntakePresets,
  defaultCaseIntakeFormValues,
  findCaseIntakePreset,
} from '@/lib/case-intake';

void React;

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function populatedCount(value: string) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean).length;
}

type IntakeTab = 'scenario' | 'conditions' | 'evidence';

export function CaseForm() {
  const router = useRouter();
  const [formValues, setFormValues] = React.useState(
    defaultCaseIntakeFormValues,
  );
  const [activePresetId, setActivePresetId] = React.useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = React.useState<IntakeTab>('scenario');
  const [selectedCatalogEvidence, setSelectedCatalogEvidence] = React.useState<
    ExternalEvidenceCatalogItemSummary[]
  >([]);

  const mutation = useMutation({
    mutationFn: evaluateCase,
    onSuccess: (result) => {
      router.push(`/evaluations/${result.evaluation_id}`);
    },
  });

  const activePreset = findCaseIntakePreset(activePresetId);
  const manualEvidenceCount =
    formValues.evidenceTitle.trim() && formValues.evidenceSummary.trim()
      ? 1
      : 0;
  const totalEvidenceCount =
    selectedCatalogEvidence.length + manualEvidenceCount;
  const summaryCards = [
    {
      key: 'context',
      label: 'Context',
      value: `${formatToken(formValues.technologyFamily)} · ${formatToken(
        formValues.primaryObjective,
      )}`,
      detail:
        formValues.deploymentContext.trim() ||
        'Deployment scope still needs to be stated explicitly.',
      tone: 'accent',
    },
    {
      key: 'configuration',
      label: 'Configuration',
      value: formValues.architectureFamily.trim() || 'Architecture still open',
      detail:
        formValues.membranePresence.trim() || 'Membrane posture not recorded',
      tone: 'neutral',
    },
    {
      key: 'operating',
      label: 'Operating envelope',
      value:
        formValues.temperature.trim() || formValues.ph.trim()
          ? `${formValues.temperature || 'temp?'} °C · pH ${formValues.ph || '?'}`
          : 'Temperature and pH pending',
      detail:
        formValues.conductivity.trim() ||
        formValues.hydraulicRetentionTime.trim()
          ? `${formValues.conductivity || '?'} mS/cm · ${formValues.hydraulicRetentionTime || '?'} h HRT`
          : 'Conductivity and retention time not set',
      tone: 'success',
    },
    {
      key: 'evidence',
      label: 'Evidence',
      value: `${totalEvidenceCount} attached`,
      detail:
        totalEvidenceCount > 0
          ? 'Manual and reviewed evidence stay explicit in the payload.'
          : 'No supporting evidence is attached yet.',
      tone: 'copper',
    },
  ] as const;
  const tabs = [
    {
      id: 'scenario',
      label: 'Scenario',
      badge: formatToken(formValues.technologyFamily).split(' ').at(0),
    },
    {
      id: 'conditions',
      label: 'Conditions',
      badge:
        formValues.temperature.trim() || formValues.ph.trim() ? 'set' : 'open',
    },
    {
      id: 'evidence',
      label: 'Evidence',
      badge: totalEvidenceCount,
    },
  ] as const;

  function updateField<Field extends keyof typeof formValues>(
    field: Field,
    value: (typeof formValues)[Field],
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
    setActiveTab('scenario');
    setSelectedCatalogEvidence([]);
    mutation.reset();
  }

  function resetForm() {
    setFormValues(defaultCaseIntakeFormValues);
    setActivePresetId(null);
    setActiveTab('scenario');
    setSelectedCatalogEvidence([]);
    mutation.reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildCaseInputFromFormValues(
      formValues,
      activePreset,
      selectedCatalogEvidence,
    );

    await mutation.mutateAsync(payload);
  }

  return (
    <form className="input-workspace" onSubmit={handleSubmit}>
      <section className="panel input-workspace__main">
        <div className="input-workspace__header">
          <div>
            <span className="badge">Input deck</span>
            <h2>Scenario setup</h2>
            <p className="muted">
              Build the run definition in focused tabs so drafting stays dense,
              reviewable, and ready to hand off into the decision workspace.
            </p>
          </div>
          <button className="secondary" type="button" onClick={resetForm}>
            Reset form
          </button>
        </div>

        <div className="input-toolbar">
          <div className="workspace-chip-list compact">
            <span className="meta-chip">
              {formatToken(formValues.technologyFamily)}
            </span>
            <span className="meta-chip">
              {populatedCount(formValues.preferredSuppliers)} preferred
              suppliers
            </span>
            <span className="meta-chip">{totalEvidenceCount} evidence</span>
            <span className="meta-chip meta-chip--accent">
              {activePreset ? 'preset loaded' : 'manual draft'}
            </span>
          </div>
          <PanelTabs
            activeTab={activeTab}
            label="Input deck sections"
            onChange={setActiveTab}
            tabs={tabs}
          />
        </div>

        <section className="input-scene-grid" aria-label="Scenario preview">
          {summaryCards.map((card) => (
            <article
              className={`input-scene-card input-scene-card--${card.tone}`}
              key={card.key}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </section>

        <div className="disabled-feature-card">
          <div>
            <strong>Public documentary enrichment</strong>
            <p className="muted">
              Boundary preserved. The current runtime remains local-first and
              only attaches reviewed external evidence explicitly.
            </p>
          </div>
          <span className="meta-chip meta-chip--warning">disabled</span>
        </div>

        {activeTab === 'scenario' ? (
          <div className="entry-tabpanel">
            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Context</h3>
                  <p>
                    Case identity, objective, maturity, and deployment scope.
                  </p>
                </div>
              </div>
              <div className="form-grid form-grid--dense">
                <label>
                  Case identifier
                  <input
                    value={formValues.caseId}
                    onChange={(event) =>
                      updateField('caseId', event.target.value)
                    }
                    placeholder="optional"
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
                    <option value="microbial_fuel_cell">
                      Microbial fuel cell
                    </option>
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
                    <option value="wastewater_treatment">
                      Wastewater treatment
                    </option>
                    <option value="hydrogen_recovery">Hydrogen recovery</option>
                    <option value="nitrogen_recovery">Nitrogen recovery</option>
                    <option value="sensing">Sensing</option>
                    <option value="low_power_generation">
                      Low power generation
                    </option>
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
                    placeholder="3-month validation, pilot_to_scale_path..."
                  />
                </label>
                <label className="label-span-2">
                  Deployment context
                  <textarea
                    value={formValues.deploymentContext}
                    onChange={(event) =>
                      updateField('deploymentContext', event.target.value)
                    }
                    placeholder="pilot retrofit, industrial validation, lab scale..."
                  />
                </label>
                <label className="label-span-2">
                  Current pain points
                  <textarea
                    value={formValues.painPoints}
                    onChange={(event) =>
                      updateField('painPoints', event.target.value)
                    }
                    placeholder="comma-separated issues such as high internal resistance, weak monitoring, unstable startup"
                  />
                </label>
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
                <label className="label-span-2">
                  Working assumptions
                  <textarea
                    value={formValues.assumptionsNote}
                    onChange={(event) =>
                      updateField('assumptionsNote', event.target.value)
                    }
                    placeholder="comma-separated assumptions that should remain visible in the deterministic run"
                  />
                </label>
              </div>
            </section>

            <section className="form-section form-section--soft">
              <div className="form-section__header">
                <div>
                  <h3>Validated golden cases</h3>
                  <p>
                    Load a structured preset when you want deterministic smoke
                    coverage with richer stack blocks, evidence, and measured
                    metrics than the visible form alone provides.
                  </p>
                </div>
                {activePreset ? (
                  <span className="meta-chip">preset active</span>
                ) : null}
              </div>
              <div className="preset-grid">
                {caseIntakePresets.map((preset) => {
                  const isActive = activePresetId === preset.id;

                  return (
                    <article
                      className={`preset-card${isActive ? ' active' : ''}`}
                      key={preset.id}
                    >
                      <div className="stack split compact">
                        <h3>{preset.label}</h3>
                        <span className="badge subtle">
                          {formatToken(preset.formValues.primaryObjective)}
                        </span>
                      </div>
                      <p className="muted">{preset.description}</p>
                      <div className="section-group">
                        <h4>Focus areas</h4>
                        <ul className="pill-list">
                          {preset.focusAreas.map((entry) => (
                            <li className="pill" key={entry}>
                              {entry}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="muted">Source: {preset.sourceReference}</p>
                      <div className="hero-actions">
                        <button
                          className="secondary"
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
            </section>
          </div>
        ) : null}

        {activeTab === 'conditions' ? (
          <div className="entry-tabpanel">
            <section className="form-section">
              <div className="form-section__header">
                <div>
                  <h3>Feed and reactor envelope</h3>
                  <p>
                    Record the operating anchors the rule engine and optional
                    model layer can actually use.
                  </p>
                </div>
              </div>
              <div className="form-grid form-grid--dense">
                <label>
                  Influent type
                  <input
                    value={formValues.influentType}
                    onChange={(event) =>
                      updateField('influentType', event.target.value)
                    }
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
                    placeholder="present, absent, separator unknown..."
                  />
                </label>
                <label className="label-span-2">
                  Substrate profile
                  <textarea
                    value={formValues.substrateProfile}
                    onChange={(event) =>
                      updateField('substrateProfile', event.target.value)
                    }
                    placeholder="Short description of biodegradability, solids profile, or sidestream composition"
                  />
                </label>
                <label>
                  Temperature (°C)
                  <input
                    value={formValues.temperature}
                    onChange={(event) =>
                      updateField('temperature', event.target.value)
                    }
                    placeholder="25"
                  />
                </label>
                <label>
                  pH
                  <input
                    value={formValues.ph}
                    onChange={(event) => updateField('ph', event.target.value)}
                    placeholder="7.0"
                  />
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
                </label>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'evidence' ? (
          <div className="entry-tabpanel">
            <AcceptedEvidenceSelector
              selectedEvidence={selectedCatalogEvidence}
              onSelectionChange={setSelectedCatalogEvidence}
            />

            <section className="panel nested-panel grid">
              <div>
                <span className="badge">Manual typed evidence</span>
                <h2>Optional analyst-supplied support</h2>
                <p className="muted">
                  Supplier claims, internal benchmarks, and engineering
                  assumptions stay explicit. Nothing is silently merged into the
                  deterministic decision path.
                </p>
              </div>

              <div className="grid two">
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
                    <option value="internal_benchmark">
                      Internal benchmark
                    </option>
                    <option value="literature_evidence">
                      Literature evidence
                    </option>
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
                        event.target
                          .value as typeof formValues.evidenceStrength,
                      )
                    }
                  >
                    <option value="weak">Weak</option>
                    <option value="moderate">Moderate</option>
                    <option value="strong">Strong</option>
                  </select>
                </label>
              </div>

              <label>
                Evidence title
                <input
                  value={formValues.evidenceTitle}
                  onChange={(event) =>
                    updateField('evidenceTitle', event.target.value)
                  }
                  placeholder="Pilot baseline, supplier datasheet, internal trial..."
                />
              </label>

              <label>
                Evidence summary
                <textarea
                  value={formValues.evidenceSummary}
                  onChange={(event) =>
                    updateField('evidenceSummary', event.target.value)
                  }
                  placeholder="Short description of the evidence and why it matters to this decision run"
                />
              </label>
            </section>
          </div>
        ) : null}

        {mutation.error ? (
          <p className="error">{mutation.error.message}</p>
        ) : null}

        <div className="input-workspace__footer">
          <button disabled={mutation.isPending} type="submit">
            {mutation.isPending
              ? 'Evaluating...'
              : 'Run deterministic evaluation'}
          </button>
          <p className="muted">
            Defaults, missing data, evidence mode, and confidence changes remain
            explicit in the resulting workspace.
          </p>
        </div>
      </section>

      <aside
        className="panel input-workspace__aside"
        aria-label="Drafting focus"
      >
        <article className="workspace-brief-card workspace-brief-card--highlight">
          <span>Drafting focus</span>
          <strong>
            {formValues.caseId.trim() ||
              activePreset?.label ||
              'Build the next evaluation'}
          </strong>
          <p>
            Keep setup dense here so the decision workspace, comparison, and
            history surfaces can stay analytical and uncluttered.
          </p>
        </article>

        <div className="workspace-brief-grid">
          {summaryCards.map((card) => (
            <article
              className="workspace-brief-card workspace-brief-card--compact"
              key={card.key}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>

        <article className="workspace-brief-card workspace-brief-card--quiet">
          <span>Current preset</span>
          <strong>{activePreset?.label ?? 'Manual draft in progress'}</strong>
          <p>
            {activePreset?.description ??
              'No golden-case preset is active. Manual drafting controls the visible payload.'}
          </p>
        </article>

        <article className="workspace-brief-card">
          <span>Quick jump</span>
          <strong>Move across drafting sections</strong>
          <div className="workspace-quick-actions">
            {tabs.map((tab) => (
              <button
                className={activeTab === tab.id ? '' : 'ghost-button'}
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <Link className="ghost-button" href="/evidence/review">
              Review evidence queue
            </Link>
          </div>
        </article>
      </aside>
    </form>
  );
}
