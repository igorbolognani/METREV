'use client';
import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CaseSpatialControls } from './case-spatial-controls';
import { SpatialFieldViewer } from './spatial-field-viewer';
import { SpatialCellConfigurator } from './spatial-cell-configurator';
import {
  structuredCellInputSchema,
  STRUCTURED_CELL_LIMITS,
  buildStructuredCellDevelopmentReport,
  renderStructuredCellDevelopmentReport,
  type StructuredCellRunView,
} from '@metrev/domain-contracts/browser';
import {
  readCellMesh,
  readCellField,
  type CellMesh,
  type CellField,
} from '@/lib/spatial-cell-field';
import {
  createSpatialCellRun,
  fetchSpatialRun,
  cancelSpatialRun,
  fetchSpatialArtifact,
} from '@/lib/spatial-api';
import {
  compareSpatialRunSummaries,
  type SpatialRunComparison,
} from '@/lib/spatial-run-comparison';

export function SpatialCellWorkbench({
  initialEvaluationId = '',
}: {
  initialEvaluationId?: string;
}) {
  const [source, setSource] = useState('');
  const [evaluationId, setEvaluationId] = useState(initialEvaluationId);
  const [runId, setRunId] = useState('');
  const [run, setRun] = useState<StructuredCellRunView | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState('');
  const [meshAsset, setMeshAsset] = useState<{
    runId: string;
    digest: string;
    value: CellMesh;
  } | null>(null);
  const [fieldAsset, setFieldAsset] = useState<{
    runId: string;
    digest: string;
    value: CellField;
  } | null>(null);
  const [comparisonRunId, setComparisonRunId] = useState('');
  const [comparisonBusy, setComparisonBusy] = useState(false);
  const [comparisonError, setComparisonError] = useState('');
  const [comparison, setComparison] = useState<{
    currentRunId: string;
    result: SpatialRunComparison;
  } | null>(null);
  const manifest = run?.result?.fields.find((f) => f.field_id === selected);
  const mesh =
    meshAsset?.runId === run?.id &&
    meshAsset?.digest === run?.result?.mesh.artifact.sha256
      ? (meshAsset?.value ?? null)
      : null;
  const data =
    fieldAsset?.runId === run?.id &&
    fieldAsset?.digest === manifest?.artifact.sha256
      ? (fieldAsset?.value ?? null)
      : null;
  const active =
    run !== null && !['completed', 'failed', 'cancelled'].includes(run.status);
  const currentComparison =
    comparison && run && comparison.currentRunId === run.id
      ? comparison.result
      : null;
  useEffect(() => {
    if (!run || !active) return;
    let cancelled = false;
    const timer = setInterval(() => {
      void fetchSpatialRun(run.id)
        .then((value) => {
          if (!cancelled) setRun(value);
        })
        .catch((reason) => {
          if (!cancelled) setError(String(reason));
        });
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [run, active]);
  useEffect(() => {
    setMeshAsset(null);
    setFieldAsset(null);
    if (!run?.result) {
      setMeshAsset(null);
      setFieldAsset(null);
      return;
    }
    let cancelled = false;
    setSelected(run.result.fields[0]?.field_id ?? '');
    void fetchSpatialArtifact(run.id, null, run.result.mesh.artifact.sha256)
      .then((value) => {
        if (!cancelled)
          setMeshAsset({
            runId: run.id,
            digest: run.result!.mesh.artifact.sha256,
            value: readCellMesh(value, run),
          });
      })
      .catch((reason) => {
        if (!cancelled) setError(String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [run]);
  useEffect(() => {
    const field = run?.result?.fields.find((f) => f.field_id === selected);
    if (!run || !field || !mesh) return;
    let cancelled = false;
    setFieldAsset(null);
    void fetchSpatialArtifact(run.id, field.field_id, field.artifact.sha256)
      .then((value) => {
        const parsed = readCellField(value, mesh, field, run);
        if (!cancelled)
          setFieldAsset({
            runId: run.id,
            digest: field.artifact.sha256,
            value: parsed,
          });
      })
      .catch((reason) => {
        if (!cancelled) setError(String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [run, selected, mesh]);
  async function act(action: () => Promise<StructuredCellRunView>) {
    setBusy(true);
    setError('');
    try {
      const next = await action();
      setRun(next);
      setRunId(next.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }
  async function compareRun() {
    if (!run || !comparisonRunId.trim()) return;
    setComparisonBusy(true);
    setComparisonError('');
    setComparison(null);
    try {
      const other = await fetchSpatialRun(comparisonRunId.trim());
      setComparison({
        currentRunId: run.id,
        result: compareSpatialRunSummaries(run, other),
      });
    } catch (reason) {
      setComparisonError(
        reason instanceof Error ? reason.message : String(reason),
      );
    } finally {
      setComparisonBusy(false);
    }
  }
  function download(format: 'json' | 'md') {
    if (!run?.result) return;
    const report = buildStructuredCellDevelopmentReport(run);
    const content =
      format === 'json'
        ? JSON.stringify(report, null, 2)
        : renderStructuredCellDevelopmentReport(report);
    const url = URL.createObjectURL(
      new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/markdown',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrev-spatial-${run.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/modeling">← Modeling workbench</Link>
      <h1 className="text-2xl font-semibold">Spatial cell development</h1>
      <p>
        Source-backed steady MFC/MEC cells in 2D or 3D. This restricted
        supporting-electrolyte model is informational and has no independent
        experimental validation.
      </p>
      <ul className="list-disc pl-6">
        {STRUCTURED_CELL_LIMITS.map((limit) => (
          <li key={limit}>{limit}</li>
        ))}
      </ul>
      <label className="block">
        Cell input JSON
        <input
          type="file"
          accept="application/json,.json"
          className="block"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              if (file.size > 2 * 1024 * 1024) {
                setError('Input exceeds 2 MB');
                return;
              }
              void file.text().then(setSource);
            }
          }}
        />
        <textarea
          aria-label="Cell input JSON"
          className="mt-2 min-h-48 w-full rounded border p-3 font-mono text-sm"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder="Import a complete sourced spatial-cell-input-v1. No measurements are filled automatically."
        />
      </label>
      <SpatialCellConfigurator source={source} onChange={setSource} />
      <label className="block">
        Related evaluation ID (optional)
        <input
          className="ml-2 rounded border p-2"
          value={evaluationId}
          onChange={(event) => setEvaluationId(event.target.value)}
        />
      </label>
      <button
        className="rounded border p-2"
        disabled={busy || active || !source.trim() || !!evaluationId.trim()}
        onClick={() =>
          void act(async () =>
            createSpatialCellRun(
              structuredCellInputSchema.parse(JSON.parse(source)),
            ),
          )
        }
      >
        Queue cell run
      </button>
      {!!evaluationId.trim() && (
        <CaseSpatialControls
          key={evaluationId}
          evaluationId={evaluationId}
          source={source}
          disabled={busy || active}
          onRun={(next) => {
            setRun(next);
            setRunId(next.id);
          }}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Saved run ID"
          className="rounded border p-2"
          value={runId}
          onChange={(event) => setRunId(event.target.value)}
          placeholder="Saved run ID"
        />
        <button
          className="rounded border p-2"
          disabled={busy || !runId.trim()}
          onClick={() => void act(() => fetchSpatialRun(runId.trim()))}
        >
          Reload run
        </button>
        {active && run && (
          <button
            className="rounded border p-2"
            onClick={() => void act(() => cancelSpatialRun(run.id))}
          >
            Cancel run
          </button>
        )}
      </div>
      <section
        className="space-y-3 rounded border p-4"
        aria-label="Spatial run comparison"
      >
        <h2 className="text-xl">Compare spatial run summaries</h2>
        <p>
          Compare deterministic metadata and field summaries from two completed
          runs. The profile, dimension, system, physical geometry, field IDs,
          domains and units must match. This view does not interpolate or remap
          meshes and does not compare experimental measurements or affect
          decision eligibility.
        </p>
        <label className="block">
          Second saved run ID
          <input
            aria-label="Second saved run ID"
            className="ml-2 rounded border p-2"
            value={comparisonRunId}
            onChange={(event) => setComparisonRunId(event.target.value)}
            placeholder="Second saved run ID"
          />
        </label>
        <button
          className="rounded border p-2"
          disabled={
            comparisonBusy ||
            run?.status !== 'completed' ||
            !run.result ||
            !comparisonRunId.trim()
          }
          onClick={() => void compareRun()}
        >
          Compare summaries
        </button>
        {comparisonError && (
          <p role="alert">Could not load comparison run: {comparisonError}</p>
        )}
        {currentComparison && (
          <div aria-live="polite" className="space-y-2">
            {currentComparison.eligible ? (
              <>
                <p role="status">
                  Summary comparison available. A: {currentComparison.runA.id} (
                  {currentComparison.runA.meshCellCount} mesh cells); B:{' '}
                  {currentComparison.runB.id} (
                  {currentComparison.runB.meshCellCount} mesh cells). Δ is B −
                  A. Decision eligible: false.
                </p>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Metric</th>
                      <th>Run A</th>
                      <th>Run B</th>
                      <th>Δ (B − A)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentComparison.metrics.flatMap((metric) =>
                      (
                        [
                          [
                            'minimum',
                            metric.runA.minimum,
                            metric.runB.minimum,
                            metric.deltaBMinusA.minimum,
                            metric.unit,
                          ],
                          [
                            'maximum',
                            metric.runA.maximum,
                            metric.runB.maximum,
                            metric.deltaBMinusA.maximum,
                            metric.unit,
                          ],
                          [
                            'mean',
                            metric.runA.mean,
                            metric.runB.mean,
                            metric.deltaBMinusA.mean,
                            metric.unit,
                          ],
                          [
                            'integral',
                            metric.runA.integral,
                            metric.runB.integral,
                            metric.deltaBMinusA.integral,
                            metric.integralUnit,
                          ],
                        ] as const
                      ).map(([label, a, b, delta, unit]) => (
                        <tr key={`${metric.fieldId}-${label}`}>
                          <td>{metric.fieldId}</td>
                          <td>{label}</td>
                          <td>
                            {a.toPrecision(6)} {unit}
                          </td>
                          <td>
                            {b.toPrecision(6)} {unit}
                          </td>
                          <td>
                            {delta.toPrecision(6)} {unit}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
                <ul className="list-disc pl-6 text-sm">
                  {currentComparison.metrics.map((metric) => (
                    <li key={`${metric.fieldId}-sample-count`}>
                      {metric.fieldId}: {metric.runA.sampleCount} /{' '}
                      {metric.runB.sampleCount} summarized cells; integral
                      measure {metric.integrationMeasure}.
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div role="alert">
                <p>These runs are not eligible for summary comparison:</p>
                <ul className="list-disc pl-6">
                  {currentComparison.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {run && (
        <section className="space-y-3">
          <h2 className="text-xl">Run {run.id}</h2>
          <p>
            {run.dimension}D · {run.status} · {run.progress}%
          </p>
          {run.failure && (
            <p role="alert">
              {run.failure.message}. Retained fields are diagnostic results.
            </p>
          )}
          {run.result && (
            <>
              <button
                className="rounded border p-2"
                onClick={() => download('json')}
              >
                Download development report JSON
              </button>
              <button
                className="rounded border p-2"
                onClick={() => download('md')}
              >
                Download development report Markdown
              </button>
              <p>
                Diagnostic role:{' '}
                {run.status === 'completed'
                  ? 'modeled development result'
                  : 'failed run diagnostics'}
                . Decision eligible: false.
              </p>
              {run.result.convergence.map((c) => (
                <p key={c.solver_id}>
                  Termination: {c.termination_reason} · final scaled residual{' '}
                  {c.history[
                    c.history.length - 1
                  ].nonlinear_residual.toExponential(3)}{' '}
                  · tolerance {c.absolute_tolerance.toExponential(3)}
                </p>
              ))}
              <label className="block">
                Numerical field{' '}
                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  {run.result.fields.map((f) => (
                    <option key={f.field_id} value={f.field_id}>
                      {f.field_id} ({f.unit})
                    </option>
                  ))}
                </select>
              </label>
              {mesh && data && (
                <SpatialFieldViewer
                  key={`${run.id}-${manifest?.artifact.sha256}`}
                  run={run}
                  mesh={mesh}
                  data={data}
                />
              )}
              {run.result.cell_circuit && (
                <p>
                  Current{' '}
                  {run.result.cell_circuit.anodic_current_A.toPrecision(5)} A ·
                  collector voltage{' '}
                  {run.result.cell_circuit.collector_voltage_V.toPrecision(5)} V
                  ·{' '}
                  {run.system === 'MEC'
                    ? `electrical input ${run.result.cell_circuit.mec_electrical_input_W} W`
                    : `signed generated output ${run.result.cell_circuit.mfc_generated_power_W} W`}
                </p>
              )}
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Balance</th>
                    <th>Relative residual</th>
                    <th>Gate</th>
                  </tr>
                </thead>
                <tbody>
                  {run.result.conservation_residuals.map((r) => (
                    <tr key={r.balance_id}>
                      <td>{r.balance_id}</td>
                      <td>{r.relative_residual.toExponential(3)}</td>
                      <td>{r.passed ? 'Passed' : 'Failed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}
    </main>
  );
}
