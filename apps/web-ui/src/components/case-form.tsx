'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { RawCaseInput } from '@metrev/domain-contracts';

import { evaluateCase } from '@/lib/api';

type EvidenceRecordInput = NonNullable<
  RawCaseInput['evidence_records']
>[number];

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function CaseForm() {
  const router = useRouter();
  const [caseId, setCaseId] = useState('');
  const [technologyFamily, setTechnologyFamily] = useState(
    'microbial_fuel_cell',
  );
  const [architectureFamily, setArchitectureFamily] = useState('');
  const [primaryObjective, setPrimaryObjective] = useState(
    'wastewater_treatment',
  );
  const [deploymentContext, setDeploymentContext] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [influentType, setInfluentType] = useState('');
  const [temperature, setTemperature] = useState('');
  const [ph, setPh] = useState('');
  const [preferredSuppliers, setPreferredSuppliers] = useState('');
  const [evidenceType, setEvidenceType] =
    useState<EvidenceRecordInput['evidence_type']>('internal_benchmark');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [evidenceStrength, setEvidenceStrength] =
    useState<EvidenceRecordInput['strength_level']>('moderate');

  const mutation = useMutation({
    mutationFn: async (payload: RawCaseInput) => evaluateCase(payload),
    onSuccess: (result) => {
      router.push(`/evaluations/${result.evaluation_id}`);
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: RawCaseInput = {
      case_id: caseId || undefined,
      technology_family: technologyFamily,
      architecture_family: architectureFamily || undefined,
      primary_objective: primaryObjective,
      business_context: {
        deployment_context: deploymentContext || undefined,
      },
      technology_context: {
        current_pain_points: painPoints
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      },
      feed_and_operation: {
        influent_type: influentType || undefined,
        temperature_c: parseOptionalNumber(temperature),
        pH: parseOptionalNumber(ph),
      },
      supplier_context: {
        current_suppliers: [],
        preferred_suppliers: preferredSuppliers
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        excluded_suppliers: [],
      },
      evidence_records:
        evidenceTitle.trim() && evidenceSummary.trim()
          ? [
              {
                evidence_type: evidenceType,
                title: evidenceTitle.trim(),
                summary: evidenceSummary.trim(),
                applicability_scope: {
                  architecture_family: architectureFamily || 'unspecified',
                  primary_objective: primaryObjective,
                },
                strength_level: evidenceStrength,
                provenance_note:
                  'Captured directly during runtime intake and preserved as typed evidence.',
                quantitative_metrics: {},
                operating_conditions: {},
                block_mapping: [],
                limitations: [],
                contradiction_notes: [],
                tags: ['runtime-intake'],
              },
            ]
          : undefined,
    };

    await mutation.mutateAsync(payload);
  }

  return (
    <form className="grid" onSubmit={handleSubmit}>
      <div className="grid two">
        <label>
          Case identifier
          <input
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            placeholder="optional"
          />
        </label>
        <label>
          Technology family
          <select
            value={technologyFamily}
            onChange={(event) => setTechnologyFamily(event.target.value)}
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
            value={architectureFamily}
            onChange={(event) => setArchitectureFamily(event.target.value)}
            placeholder="single_chamber, two_chamber, modular..."
          />
        </label>
        <label>
          Primary objective
          <select
            value={primaryObjective}
            onChange={(event) => setPrimaryObjective(event.target.value)}
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
          value={deploymentContext}
          onChange={(event) => setDeploymentContext(event.target.value)}
          placeholder="pilot retrofit, industrial validation, lab scale..."
        />
      </label>

      <label>
        Current pain points
        <textarea
          value={painPoints}
          onChange={(event) => setPainPoints(event.target.value)}
          placeholder="comma-separated issues such as high internal resistance, weak monitoring, unstable startup"
        />
      </label>

      <label>
        Preferred suppliers
        <input
          value={preferredSuppliers}
          onChange={(event) => setPreferredSuppliers(event.target.value)}
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
              value={evidenceType}
              onChange={(event) =>
                setEvidenceType(
                  event.target.value as EvidenceRecordInput['evidence_type'],
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
              value={evidenceStrength}
              onChange={(event) =>
                setEvidenceStrength(
                  event.target.value as EvidenceRecordInput['strength_level'],
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
            value={evidenceTitle}
            onChange={(event) => setEvidenceTitle(event.target.value)}
            placeholder="Pilot baseline, supplier datasheet, internal trial..."
          />
        </label>

        <label>
          Evidence summary
          <textarea
            value={evidenceSummary}
            onChange={(event) => setEvidenceSummary(event.target.value)}
            placeholder="Short description of the evidence and why it matters to this decision run"
          />
        </label>
      </section>

      <div className="grid two">
        <label>
          Influent type
          <input
            value={influentType}
            onChange={(event) => setInfluentType(event.target.value)}
            placeholder="industrial wastewater, sidestream, synthetic feed..."
          />
        </label>
        <label>
          Temperature (°C)
          <input
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            placeholder="25"
          />
        </label>
      </div>

      <label>
        pH
        <input
          value={ph}
          onChange={(event) => setPh(event.target.value)}
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
