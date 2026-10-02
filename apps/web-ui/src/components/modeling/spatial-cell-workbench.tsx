'use client';
import * as React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export function SpatialCellWorkbench() {
  const [source, setSource] = useState('');
  const [evaluationId, setEvaluationId] = useState('');
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
  const [slice, setSlice] = useState(0);
  const [probe, setProbe] = useState<number | null>(null);
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
    setProbe(null);
    if (!run?.result) {
      setMeshAsset(null);
      setFieldAsset(null);
      return;
    }
    let cancelled = false;
    setSelected(run.result.fields[0]?.field_id ?? '');
    setSlice(0);
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
    setProbe(null);
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
  const values = data?.values ?? [];
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 0;
  const extent = mesh
    ? mesh.centers_m.reduce(
        (m, c, i) => [
          Math.max(m[0], c[0] + mesh.sizes_m[i][0] / 2),
          Math.max(m[1], c[1] + mesh.sizes_m[i][1] / 2),
        ],
        [0, 0],
      )
    : [1, 1];
  const nz = mesh?.shape[2] ?? 1;
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
        disabled={busy || active || !source.trim()}
        onClick={() =>
          void act(async () =>
            createSpatialCellRun(
              structuredCellInputSchema.parse(JSON.parse(source)),
              evaluationId.trim() || undefined,
            ),
          )
        }
      >
        Queue cell run
      </button>
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
              {run.dimension === 3 && (
                <label className="block">
                  3D mesh · XY slice {slice + 1}/{nz}
                  <input
                    aria-label="Z slice"
                    type="range"
                    min={0}
                    max={nz - 1}
                    step={1}
                    value={slice}
                    onChange={(event) => {
                      setSlice(Number(event.target.value));
                      setProbe(null);
                    }}
                  />
                </label>
              )}
              {mesh && data && (
                <>
                  <p>
                    {data.id} · {data.unit} · range {minimum.toPrecision(5)}–
                    {maximum.toPrecision(5)} ·{' '}
                    {run.dimension === 3
                      ? 'XY slice of the solved 3D mesh'
                      : 'solved 2D mesh'}
                  </p>
                  <svg
                    viewBox="0 0 700 420"
                    role="img"
                    aria-label={`${data.id} numerical cell field`}
                    className="w-full rounded border bg-slate-50"
                  >
                    {data.cells.map((cell, index) => {
                      if (
                        cell >= mesh.centers_m.length ||
                        (run.dimension === 3 && cell % nz !== slice)
                      )
                        return null;
                      const c = mesh.centers_m[cell],
                        s = mesh.sizes_m[cell];
                      const hue =
                        240 *
                        (1 -
                          (maximum === minimum
                            ? 0.5
                            : (data.values[index] - minimum) /
                              (maximum - minimum)));
                      return (
                        <rect
                          key={cell}
                          tabIndex={0}
                          role="button"
                          aria-label={`Probe cell ${cell}`}
                          onClick={() => setProbe(cell)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setProbe(cell);
                            }
                          }}
                          x={20 + (660 * (c[0] - s[0] / 2)) / extent[0]}
                          y={400 - (380 * (c[1] + s[1] / 2)) / extent[1]}
                          width={(660 * s[0]) / extent[0]}
                          height={(380 * s[1]) / extent[1]}
                          fill={`hsl(${hue} 75% 50%)`}
                          stroke="white"
                          strokeWidth=".25"
                        >
                          <title>{`Cell ${cell}: ${data.values[index]} ${data.unit}`}</title>
                        </rect>
                      );
                    })}
                  </svg>
                  {probe !== null && data.cells.includes(probe) && (
                    <p role="status">
                      Cell {probe} · region{' '}
                      {
                        run.input_snapshot.geometry.layers[
                          mesh.region_index[probe]
                        ].tag
                      }{' '}
                      · center ({mesh.centers_m[probe].join(', ')}) m ·{' '}
                      {data.values[data.cells.indexOf(probe)]} {data.unit}
                    </p>
                  )}
                </>
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
