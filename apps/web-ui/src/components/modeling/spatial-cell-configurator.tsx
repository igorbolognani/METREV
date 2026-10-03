'use client';
import * as React from 'react';
import { useState } from 'react';
import {
  structuredCellInputSchema,
  type StructuredCellInput,
} from '@metrev/domain-contracts/browser';
import {
  structuredCellScientificParameters,
  updateStructuredCellParameter,
  updateStructuredCellResolution,
} from '@/lib/spatial-cell-configuration';

export function SpatialCellConfigurator({
  source,
  onChange,
}: {
  source: string;
  onChange: (source: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  let input: StructuredCellInput;
  try {
    input = structuredCellInputSchema.parse(JSON.parse(source));
  } catch {
    return (
      <p>
        Import a complete sourced cell input to edit its parameters and mesh
        resolution.
      </p>
    );
  }
  const parameters = structuredCellScientificParameters(input);
  const parameter =
    parameters.find((item) => item.path.join('.') === selected) ??
    parameters[0];
  const layerCounts = input.geometry.layers.map((layer) => layer.cells);
  const transverseCounts = input.geometry.transverse_cells;
  function apply(action: () => typeof input) {
    try {
      const next = action();
      onChange(JSON.stringify(next, null, 2));
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }
  return (
    <section
      className="space-y-3 rounded border p-4"
      aria-label="Sourced cell configurator"
    >
      <h2 className="text-xl">Configure imported cell</h2>
      <p>
        {input.dimension}D · {input.system} · {input.geometry.layers.length}{' '}
        regions. Edits preserve physical units and source metadata; unresolved
        constraints prevent applying the change.
      </p>
      <label>
        Scientific parameter{' '}
        <select
          aria-label="Scientific parameter"
          value={parameter.path.join('.')}
          onChange={(event) => setSelected(event.target.value)}
        >
          {parameters.map((item) => (
            <option key={item.path.join('.')} value={item.path.join('.')}>
              {item.path.join('.')} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      <form
        key={parameter.path.join('.') + source}
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const raw = String(form.get('value')).trim();
          if (!raw) {
            setError('A scientific value is required');
            return;
          }
          apply(() =>
            updateStructuredCellParameter(input, parameter.path, {
              value: Number(raw),
              source_kind: String(form.get('source_kind')),
              source_ref: String(form.get('source_ref')),
              source_locator:
                String(form.get('source_locator')) || parameter.source_locator,
            }),
          );
        }}
      >
        <label>
          Value ({parameter.unit}){' '}
          <input
            name="value"
            type="number"
            step="any"
            defaultValue={parameter.value}
            required
            className="rounded border p-2"
          />
        </label>
        <label>
          Source kind{' '}
          <select name="source_kind" defaultValue={parameter.source_kind}>
            {[
              'measured',
              'literature',
              'default',
              'assumption',
              'test_fixture',
            ].map((kind) => (
              <option key={kind}>{kind}</option>
            ))}
          </select>
        </label>
        <label>
          Source reference{' '}
          <input
            name="source_ref"
            defaultValue={parameter.source_ref}
            required
            className="rounded border p-2"
          />
        </label>
        <label>
          Source locator{' '}
          <input
            name="source_locator"
            defaultValue={parameter.source_locator ?? ''}
            className="rounded border p-2"
          />
        </label>
        <button type="submit" className="rounded border p-2">
          Apply sourced parameter
        </button>
      </form>
      <fieldset className="space-y-2">
        <legend>Numerical mesh resolution</legend>
        {input.geometry.layers.map((layer, index) => (
          <label key={layer.tag} className="block">
            {layer.tag} x cells{' '}
            <input
              type="number"
              min={1}
              max={128}
              value={layer.cells}
              onChange={(event) =>
                apply(() =>
                  updateStructuredCellResolution(
                    input,
                    layerCounts.map((count, i) =>
                      i === index ? Number(event.target.value) : count,
                    ),
                    transverseCounts,
                  ),
                )
              }
            />
          </label>
        ))}
        {transverseCounts.map((count, index) => (
          <label key={index} className="block">
            {'yz'[index]} cells{' '}
            <input
              type="number"
              min={1}
              max={64}
              value={count}
              onChange={(event) =>
                apply(() =>
                  updateStructuredCellResolution(
                    input,
                    layerCounts,
                    transverseCounts.map((n, i) =>
                      i === index ? Number(event.target.value) : n,
                    ),
                  ),
                )
              }
            />
          </label>
        ))}
        <p>
          Changing a prescribed-flow mesh requires a new complete face-velocity
          specification. Geometry and fidelity are preserved.
        </p>
      </fieldset>
      {error && <p role="alert">Change rejected: {error}</p>}
    </section>
  );
}
