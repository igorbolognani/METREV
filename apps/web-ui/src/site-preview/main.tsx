import * as React from 'react';
import { createRoot } from 'react-dom/client';

import {
  evaluateSimulationEnrichment,
  INTERNAL_MODEL_VERSION,
} from '../../../../packages/electrochem-models/src/index';
import type {
  EvaluationResponse,
  NormalizedCaseInput,
} from '@metrev/domain-contracts';
import { SimulationSvgExplorer } from '../components/evaluation/simulation-svg-explorer';
import {
  prepareSiteScenarioRun,
  type CodUnit,
  type SiteScenarioId,
} from './scenario-runner';

import './site-preview.css';
import '../app/globals.css';

type ScenarioSet = {
  source_kind: 'test_fixture';
  source_ref: string;
  note: string;
  scenarios: Record<SiteScenarioId, NormalizedCaseInput>;
};

type SiteSimulation = NonNullable<EvaluationResponse['simulation_enrichment']>;

type FormValues = {
  codValue: string;
  codUnit: CodUnit;
  phValue: string;
  biosensorConcentration: string;
};

type StoredRun = {
  scenarioId: SiteScenarioId;
  values: FormValues;
  savedAt: string;
};

type RunState =
  | { status: 'completed'; simulation: SiteSimulation; assumptions: string[] }
  | { status: 'insufficient_data'; missingInputs: string[] };

const STORAGE_KEY = 'metrev-site-preview-last-run-v1';

const scenarioLabels: Record<SiteScenarioId, string> = {
  mfc_wastewater: 'MFC · wastewater treatment',
  mec_wastewater: 'MEC · wastewater treatment',
  biosensor_standalone: 'Standalone electrochemical biosensor',
  mfc_integrated_biosensor: 'MFC · integrated biosensor',
  mec_integrated_biosensor: 'MEC · integrated biosensor',
};

function readSavedRun(): StoredRun | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const value = JSON.parse(stored) as StoredRun;
    if (
      !Object.hasOwn(scenarioLabels, value.scenarioId) ||
      typeof value.values?.codValue !== 'string' ||
      typeof value.values?.phValue !== 'string' ||
      typeof value.values?.biosensorConcentration !== 'string'
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function defaultsForScenario(input: NormalizedCaseInput): FormValues {
  const operation = input.mechanistic_model?.operation;
  const sensor = input.stack_blocks.sensors_and_analytics.biosensor;
  return {
    codValue:
      operation?.influent_cod_kg_m3?.value === undefined
        ? ''
        : String(operation.influent_cod_kg_m3.value),
    codUnit: 'kgCOD/m3',
    phValue:
      operation?.influent_ph?.value === undefined
        ? ''
        : String(operation.influent_ph.value),
    biosensorConcentration:
      sensor?.concentration?.value === undefined
        ? ''
        : String(sensor.concentration.value),
  };
}

function runScenario(
  input: NormalizedCaseInput,
  scenarioId: SiteScenarioId,
  values: FormValues,
): RunState {
  const prepared = prepareSiteScenarioRun({
    scenarioId,
    normalizedCase: input,
    codValue: values.codValue,
    codUnit: values.codUnit,
    phValue: values.phValue,
    biosensorConcentration: values.biosensorConcentration,
  });
  if (prepared.status === 'insufficient_data') {
    return {
      status: 'insufficient_data',
      missingInputs: prepared.missingInputs,
    };
  }

  const simulation = evaluateSimulationEnrichment({
    normalizedCase: prepared.normalizedCase,
  });
  if (simulation.status !== 'completed') {
    const solverMissingInputs = simulation.failure_detail?.missing_inputs;
    return {
      status: 'insufficient_data',
      missingInputs: Array.isArray(solverMissingInputs)
        ? solverMissingInputs.map(String)
        : ['The solver did not produce a complete result.'],
    };
  }
  return {
    status: 'completed',
    simulation,
    assumptions: prepared.enteredAssumptions,
  };
}

function SitePreview() {
  const savedRun = React.useMemo(() => readSavedRun(), []);
  const [scenarios, setScenarios] = React.useState<ScenarioSet | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [scenarioId, setScenarioId] = React.useState<SiteScenarioId>(
    savedRun?.scenarioId ?? 'mfc_wastewater',
  );
  const [values, setValues] = React.useState<FormValues>(
    savedRun?.values ?? {
      codValue: '',
      codUnit: 'kgCOD/m3',
      phValue: '',
      biosensorConcentration: '',
    },
  );
  const [run, setRun] = React.useState<RunState | null>(null);
  const [runTimestamp, setRunTimestamp] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    fetch('/scenarios.json')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<ScenarioSet>;
      })
      .then((payload) => {
        if (!active) return;
        setScenarios(payload);
        const initialScenario = savedRun?.scenarioId ?? 'mfc_wastewater';
        const initialValues =
          savedRun?.values ??
          defaultsForScenario(payload.scenarios[initialScenario]);
        setScenarioId(initialScenario);
        setValues(initialValues);
        setRun(
          runScenario(
            payload.scenarios[initialScenario],
            initialScenario,
            initialValues,
          ),
        );
        setRunTimestamp(savedRun?.savedAt ?? new Date().toISOString());
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            `Could not load the test-fixture scenarios: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });
    return () => {
      active = false;
    };
  }, [savedRun]);

  const scenario = scenarios?.scenarios[scenarioId];
  const scenarioHasCell = scenarioId !== 'biosensor_standalone';
  const scenarioHasSensor = scenarioId.includes('biosensor');

  function changeScenario(nextScenarioId: SiteScenarioId) {
    setScenarioId(nextScenarioId);
    setRun(null);
    setValues(
      scenarios
        ? defaultsForScenario(scenarios.scenarios[nextScenarioId])
        : {
            codValue: '',
            codUnit: 'kgCOD/m3',
            phValue: '',
            biosensorConcentration: '',
          },
    );
    setNotice(null);
  }

  function runCurrentScenario(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scenarios || !scenario) return;
    const nextRun = runScenario(scenario, scenarioId, values);
    setRun(nextRun);
    setRunTimestamp(new Date().toISOString());
    setNotice(null);
  }

  function saveRunLocally() {
    if (!run || run.status !== 'completed') return;
    const nextSavedRun = {
      scenarioId,
      values,
      savedAt: new Date().toISOString(),
    } satisfies StoredRun;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSavedRun));
      setRunTimestamp(nextSavedRun.savedAt);
      setNotice(
        'Saved in this browser. Reload the page to restore and rerun it.',
      );
    } catch {
      setNotice('This browser did not allow local storage for the saved run.');
    }
  }

  function downloadReport() {
    if (!run || run.status !== 'completed') return;
    const report = {
      report_type: 'site-preview-test-fixture-run',
      scenario: scenarioLabels[scenarioId],
      model_version: INTERNAL_MODEL_VERSION,
      generated_at: runTimestamp,
      input_origin: 'test_fixture plus user-entered assumptions',
      scientific_status: 'not independently validated',
      input_values: values,
      input_assumptions: run.assumptions,
      simulation: run.simulation,
      notes: [
        'This output is generated by the METREV mechanistic solver from test-fixture parameters.',
        'Editable values are assumptions, not wastewater measurements.',
        'This report is not persisted to a METREV server or database.',
      ],
    };
    const file = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metrev-${scenarioId}-test-fixture-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="site-preview-shell">
      <header className="site-preview-heading">
        <div>
          <span className="badge subtle">
            METREV · private simulation preview
          </span>
          <h1>MFC · MEC · wastewater · electrochemical biosensors</h1>
          <p>
            Run the current METREV mechanistic solver for five explicit test
            scenarios, inspect its process diagram and modeled loss balances.
          </p>
        </div>
      </header>

      <aside className="site-preview-notice" aria-label="Scientific status">
        <strong>Test-fixture demonstration, not scientific validation.</strong>{' '}
        Each default is tagged as a test fixture. Values you edit become
        assumptions. No field measurement, reviewed literature dataset,
        independent calibration or experimental validation is attached. Results
        remain lumped, isothermal and 0D.
      </aside>

      <section className="site-preview-runner" aria-labelledby="runner-title">
        <div className="site-preview-runner__heading">
          <div>
            <h2 id="runner-title">Run the solver</h2>
            <p>
              Choose one scenario, edit its visible boundary inputs, then run
              it.
            </p>
          </div>
          <span className="site-preview-model-version">
            {INTERNAL_MODEL_VERSION}
          </span>
        </div>

        {loadError ? (
          <p className="site-preview-error" role="alert">
            {loadError}
          </p>
        ) : null}

        <form className="site-preview-form" onSubmit={runCurrentScenario}>
          <label>
            Scenario
            <select
              disabled={!scenarios}
              onChange={(event) =>
                changeScenario(event.target.value as SiteScenarioId)
              }
              value={scenarioId}
            >
              {Object.entries(scenarioLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {scenarioHasCell ? (
            <>
              <label>
                Influent COD
                <span className="site-preview-input-row">
                  <input
                    inputMode="decimal"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        codValue: event.target.value,
                      }))
                    }
                    value={values.codValue}
                  />
                  <select
                    aria-label="COD unit"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        codUnit: event.target.value as CodUnit,
                      }))
                    }
                    value={values.codUnit}
                  >
                    <option value="kgCOD/m3">kg COD/m³</option>
                    <option value="mgCOD/L">mg COD/L</option>
                    <option value="gCOD/m3">g COD/m³</option>
                    <option value="mgBOD/L">mg BOD/L (incompatible)</option>
                  </select>
                </span>
              </label>
              <label>
                Influent pH
                <input
                  inputMode="decimal"
                  max="14"
                  min="0"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      phValue: event.target.value,
                    }))
                  }
                  value={values.phValue}
                />
              </label>
            </>
          ) : null}

          {scenarioHasSensor ? (
            <label>
              Biosensor concentration (
              {scenario?.stack_blocks.sensors_and_analytics.biosensor
                ?.concentration_unit ?? 'mg/L'}
              )
              <input
                inputMode="decimal"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    biosensorConcentration: event.target.value,
                  }))
                }
                value={values.biosensorConcentration}
              />
            </label>
          ) : null}

          <div className="site-preview-actions">
            <button
              className="site-preview-primary"
              disabled={!scenarios}
              type="submit"
            >
              Run solver
            </button>
            <button
              disabled={!run || run.status !== 'completed'}
              onClick={saveRunLocally}
              type="button"
            >
              Save in this browser
            </button>
            <button
              disabled={!run || run.status !== 'completed'}
              onClick={downloadReport}
              type="button"
            >
              Download JSON report
            </button>
          </div>
        </form>

        {notice ? (
          <p className="site-preview-success" role="status">
            {notice}
          </p>
        ) : null}

        {run?.status === 'insufficient_data' ? (
          <section
            className="site-preview-error"
            aria-live="polite"
            role="status"
          >
            <strong>insufficient_data</strong>
            <ul>
              {run.missingInputs.map((missingInput) => (
                <li key={missingInput}>{missingInput}</li>
              ))}
            </ul>
            <p>The solver did not return a modeled result for this input.</p>
          </section>
        ) : null}

        {run?.status === 'completed' ? (
          <p className="site-preview-success" role="status">
            Solver completed · outputs below are modeled.{' '}
            {runTimestamp ? `Run saved locally at ${runTimestamp}.` : ''}
          </p>
        ) : null}
      </section>

      {run?.status === 'completed' ? (
        <>
          <aside className="site-preview-fixture-note">
            <strong>Run basis:</strong> {scenarioLabels[scenarioId]}; remaining
            parameters come from test fixtures. Edited values in this run are
            assumptions. This browser preview does not contact an API, provider
            or database.
          </aside>
          <SimulationSvgExplorer simulation={run.simulation} />
        </>
      ) : null}
    </main>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Site root element is missing.');
createRoot(root).render(
  <React.StrictMode>
    <SitePreview />
  </React.StrictMode>,
);
