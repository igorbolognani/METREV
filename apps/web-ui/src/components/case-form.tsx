'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ExternalEvidenceCatalogItemSummary } from '@metrev/domain-contracts';

import { AcceptedEvidenceSelector } from '@/components/accepted-evidence-selector';
import { evaluateCase } from '@/lib/api';
import {
    buildCaseInputFromFormValues,
    caseIntakePresets,
    defaultCaseIntakeFormValues,
    findCaseIntakePreset,
} from '@/lib/case-intake';

function formatToken(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function CaseForm() {
  const router = useRouter();
  const [formValues, setFormValues] = useState(defaultCaseIntakeFormValues);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [selectedCatalogEvidence, setSelectedCatalogEvidence] = useState<
    ExternalEvidenceCatalogItemSummary[]
  >([]);

  const mutation = useMutation({
    mutationFn: evaluateCase,
    onSuccess: (result) => {
      router.push(`/evaluations/${result.evaluation_id}`);
    },
  });

  const activePreset = findCaseIntakePreset(activePresetId);

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
    setSelectedCatalogEvidence([]);
    mutation.reset();
  }

  function resetForm() {
    setFormValues(defaultCaseIntakeFormValues);
    setActivePresetId(null);
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
    <form className="grid" onSubmit={handleSubmit}>
      <section className="panel nested-panel grid">
        <div className="stack split compact">
          <div>
            <span className="badge">Golden cases</span>
            <h2>Validated intake presets</h2>
          </div>
          {activePreset ? (
            <span className="badge subtle">Preset active</span>
          ) : null}
        </div>
        <p className="muted">
          Each preset injects structured stack blocks, measured metrics,
          supplier context, and typed-evidence metadata beyond the visible form
          fields so the deterministic evaluation can reach a richer rule path.
          Visible edits remain authoritative for the inputs you can change here.
        </p>
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
                <p className="muted">
                  {formatToken(preset.formValues.technologyFamily)} ·{' '}
                  {formatToken(preset.formValues.architectureFamily)}
                </p>
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
                <p className="muted">
                  Expected highlights:{' '}
                  {preset.expectedRecommendationIds.join(', ')}
                </p>
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
        <div className="hero-actions">
          <button className="secondary" type="button" onClick={resetForm}>
            Reset form
          </button>
        </div>
      </section>

      <div className="grid two">
        <label>
          Case identifier
          <input
            value={formValues.caseId}
            onChange={(event) => updateField('caseId', event.target.value)}
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
            <option value="microbial_fuel_cell">Microbial fuel cell</option>
            <option value="microbial_electrolysis_cell">
              Microbial electrolysis cell
            </option>
            <option value="microbial_electrochemical_technology">
              Microbial electrochemical technology
            </option>
          </select>
        </label>
      </div>

      <div className="grid two">
        <label>
          Architecture family
          <input
            value={formValues.architectureFamily}
            onChange={(event) =>
              updateField('architectureFamily', event.target.value)
            }
            placeholder="single_chamber, two_chamber, modular..."
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
      </div>

      <label>
        Deployment context
        <input
          value={formValues.deploymentContext}
          onChange={(event) =>
            updateField('deploymentContext', event.target.value)
          }
          placeholder="pilot retrofit, industrial validation, lab scale..."
        />
      </label>

      <label>
        Current pain points
        <textarea
          value={formValues.painPoints}
          onChange={(event) => updateField('painPoints', event.target.value)}
          placeholder="comma-separated issues such as high internal resistance, weak monitoring, unstable startup"
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

      <section className="panel nested-panel grid">
        <div>
          <span className="badge">Typed evidence</span>
          <h2>Optional intake evidence</h2>
          <p className="muted">
            Supplier claims and benchmarks stay explicit. If you add one here,
            it will flow into the evidence and provenance layer.
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

      <AcceptedEvidenceSelector
        selectedEvidence={selectedCatalogEvidence}
        onSelectionChange={setSelectedCatalogEvidence}
      />

      <div className="grid two">
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
          Temperature (°C)
          <input
            value={formValues.temperature}
            onChange={(event) => updateField('temperature', event.target.value)}
            placeholder="25"
          />
        </label>
      </div>

      <label>
        pH
        <input
          value={formValues.ph}
          onChange={(event) => updateField('ph', event.target.value)}
          placeholder="7.0"
        />
      </label>

      {mutation.error ? (
        <p className="error">{mutation.error.message}</p>
      ) : null}

      <div className="hero-actions">
        <button disabled={mutation.isPending} type="submit">
          {mutation.isPending
            ? 'Evaluating...'
            : 'Run deterministic evaluation'}
        </button>
      </div>
    </form>
  );
}
