'use client';
import * as React from 'react';
import { useState } from 'react';
import {
  structuredCellInputSchema,
  type CaseSpatialRequest,
  type StructuredCellRunView,
} from '@metrev/domain-contracts/browser';
import {
  fetchCaseSpatialPlan,
  fetchCaseSpatialRuns,
  fetchSpatialRun,
} from '@/lib/spatial-api';

const blocks = [
  'reactor_architecture',
  'anode_biofilm_support',
  'cathode_catalyst_support',
  'membrane_or_separator',
] as const;
export function CaseSpatialControls({
  evaluationId,
  source,
  disabled,
  onRun,
}: {
  evaluationId: string;
  source: string;
  disabled: boolean;
  onRun: (run: StructuredCellRunView) => void;
}) {
  const [model, setModel] = useState(
    'structured-cell-supporting-electrolyte-v1',
  );
  const [maps, setMaps] = useState<
    Record<string, (typeof blocks)[number] | ''>
  >({});
  const [extraPhysics, setExtraPhysics] = useState('');
  const [plan, setPlan] = useState<Awaited<
    ReturnType<typeof fetchCaseSpatialPlan>
  > | null>(null);
  const [recent, setRecent] = useState<Awaited<
    ReturnType<typeof fetchCaseSpatialRuns>
  > | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<{
    fingerprint: string;
    key: string;
  } | null>(null);
  const mounted = React.useRef(true);
  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  let input: ReturnType<typeof structuredCellInputSchema.parse> | undefined;
  try {
    if (source.trim())
      input = structuredCellInputSchema.parse(JSON.parse(source));
  } catch {
    /* The parent retains the editable invalid input. */
  }
  const current = JSON.stringify([
    evaluationId,
    source,
    model,
    maps,
    extraPhysics,
  ]);
  const currentPlan = fingerprint === current ? plan : null;
  const request = (): CaseSpatialRequest => ({
    model_id: model,
    dimension: input?.dimension ?? 2,
    required_physics: [
      'trace_species_transport',
      'liquid_charge',
      'solid_charge',
      'electrode_reactions',
      'circuit',
      'continuous_interfaces',
      ...extraPhysics
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ],
    ...(input ? { input } : {}),
    ...(input && input.geometry.layers.every((l) => maps[l.tag])
      ? {
          component_domains: input.geometry.layers.map((l) => ({
            domain_tag: l.tag,
            stack_block: maps[l.tag] as (typeof blocks)[number],
          })),
        }
      : {}),
  });
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded border p-4"
      aria-label="Case spatial composition"
    >
      <h2 className="text-xl">Case spatial composition</h2>
      <p>
        The saved evaluation supplies the immutable stack identity. Scientific
        geometry, transport and kinetic values come from the complete sourced
        cell input. Results remain development observations.
      </p>
      <label className="block">
        Requested case profile{' '}
        <select
          aria-label="Requested case profile"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded border p-2"
        >
          <option value="structured-cell-supporting-electrolyte-v1">
            Restricted steady supporting-electrolyte cell
          </option>
          <option value="biofilm-2d-electrode-research-v1">
            General 2D biofilm research profile
          </option>
          <option value="cell-3d-multiphysics-research-v1">
            General 3D multiphysics research profile
          </option>
        </select>
      </label>
      <p>
        Requested dimension: {input?.dimension ?? 'supply cell input'}D. The
        case must explicitly declare a planar architecture and separator
        presence.
      </p>
      <label className="block">
        Additional required physics{' '}
        <input
          aria-label="Additional required physics"
          className="rounded border p-2"
          value={extraPhysics}
          onChange={(e) => setExtraPhysics(e.target.value)}
          placeholder="e.g. hydraulics, fixed_membrane_charge"
        />
      </label>
      {input && (
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Numerical domain</th>
              <th>Case stack component</th>
            </tr>
          </thead>
          <tbody>
            {input.geometry.layers.map((l) => (
              <tr key={l.tag}>
                <td>
                  {l.tag} · {l.kind}
                </td>
                <td>
                  <select
                    aria-label={`Case component for ${l.tag}`}
                    value={maps[l.tag] ?? ''}
                    onChange={(e) =>
                      setMaps((m) => ({
                        ...m,
                        [l.tag]: e.target.value as (typeof blocks)[number],
                      }))
                    }
                    className="rounded border p-2"
                  >
                    <option value="">Select component</option>
                    {blocks.map((b) => (
                      <option key={b} value={b}>
                        {b.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border p-2"
          disabled={busy || !evaluationId.trim()}
          onClick={() =>
            void perform(async () => {
              const value = await fetchCaseSpatialPlan(
                evaluationId.trim(),
                request(),
              );
              setPlan(value);
              setFingerprint(current);
            })
          }
        >
          Check case composition
        </button>
        <button
          className="rounded border p-2"
          disabled={busy || disabled || currentPlan?.status !== 'ready'}
          onClick={() =>
            void perform(async () => {
              const key =
                intent?.fingerprint === current
                  ? intent.key
                  : crypto.randomUUID();
              setIntent({ fingerprint: current, key });
              const value = await fetchCaseSpatialPlan(
                evaluationId.trim(),
                request(),
                true,
                key,
              );
              setPlan(value);
              setFingerprint(current);
              if (value.run) {
                const run = await fetchSpatialRun(value.run.id);
                if (mounted.current) onRun(run);
                setRecent(await fetchCaseSpatialRuns(evaluationId.trim()));
              }
            })
          }
        >
          Queue case run
        </button>
        <button
          className="rounded border p-2"
          disabled={busy || !evaluationId.trim()}
          onClick={() =>
            void perform(async () =>
              setRecent(await fetchCaseSpatialRuns(evaluationId.trim())),
            )
          }
        >
          Reload case runs
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {currentPlan && (
        <div>
          <p>
            Composition status: {currentPlan.status}. Decision eligible: false.
          </p>
          <ul>
            {[
              ...currentPlan.resolution.missing_inputs,
              ...currentPlan.resolution.missing_modules,
              ...currentPlan.resolution.unsupported_configuration,
            ].map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
          {currentPlan.resolution.equation_graph && (
            <>
              <p>
                {currentPlan.resolution.equation_graph.cell_count} cells ·{' '}
                {currentPlan.resolution.equation_graph.algebraic_state_count}{' '}
                algebraic states · sparse Newton coupling
              </p>
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th>Equation</th>
                    <th>Domains</th>
                    <th>States and units</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPlan.resolution.equation_graph.nodes.map((n) => (
                    <tr key={n.id}>
                      <td>{n.equation_id}</td>
                      <td>{n.domain_tags.join(', ')}</td>
                      <td>
                        {n.states
                          .map((s) => `${s.id} [${s.unit}] (${s.role})`)
                          .join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
      {recent && (
        <div>
          <p>Most recent {recent.limit} case runs</p>
          <ul>
            {recent.runs.map((r) => (
              <li key={r.id}>
                <button
                  className="underline"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const run = await fetchSpatialRun(r.id);
                      if (mounted.current) onRun(run);
                    })
                  }
                >
                  {r.dimension}D · {r.status} · {r.id}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
