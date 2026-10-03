'use client';
import * as React from 'react';
import { useState } from 'react';
import type { StructuredCellRunView } from '@metrev/domain-contracts/browser';
import type { CellField, CellMesh } from '@/lib/spatial-cell-field';
import {
  cellLineProfile,
  fieldProfileCSV,
  fieldSliceCells,
  slicePlanes,
  type SlicePlane,
} from '@/lib/spatial-field-view';

export function SpatialFieldViewer({
  run,
  mesh,
  data,
}: {
  run: StructuredCellRunView;
  mesh: CellMesh;
  data: CellField;
}) {
  const [plane, setPlane] = useState<SlicePlane>('XY');
  const [slice, setSlice] = useState(0);
  const [domain, setDomain] = useState('all');
  const [probe, setProbe] = useState(data.cells[0]);
  const [profileAxis, setProfileAxis] = useState(0);
  const axes = slicePlanes[plane];
  const sliceCount = mesh.shape[axes.fixed] ?? 1;
  const layerTags = run.input_snapshot.geometry.layers.map(
    (layer) => layer.tag,
  );
  const cells = fieldSliceCells(
    mesh,
    data,
    plane,
    slice,
    domain === 'all' ? null : Number(domain),
  );
  const minimum = Math.min(...data.values),
    maximum = Math.max(...data.values);
  const extent = mesh.shape.map((_, axis) =>
    Math.max(
      ...mesh.centers_m.map(
        (center, cell) => center[axis] + mesh.sizes_m[cell][axis] / 2,
      ),
    ),
  );
  const profile = cellLineProfile(mesh, data, probe, profileAxis);
  const coordinateMax = extent[profileAxis];
  const profileY = (value: number) =>
    170 -
    140 * (maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum));
  function exportCSV() {
    const manifest = run.result!.fields.find(
      (field) => field.field_id === data.id,
    )!;
    const content = fieldProfileCSV({
      mesh,
      field: data,
      probe,
      axis: profileAxis,
      domainTags: layerTags,
      binding: {
        run_id: run.id,
        input_sha256: run.input_sha256,
        mesh_sha256: run.result!.mesh.artifact.sha256,
        field_sha256: manifest.artifact.sha256,
        numerical_status: run.status,
      },
    });
    const url = URL.createObjectURL(
      new Blob([content], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `metrev-${run.id}-${data.id}-profile.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="space-y-3" aria-label="Solved field viewer">
      <div className="flex flex-wrap gap-4">
        {mesh.shape.length === 3 && (
          <>
            <label>
              Slice plane{' '}
              <select
                aria-label="Slice plane"
                value={plane}
                onChange={(event) => {
                  setPlane(event.target.value as SlicePlane);
                  setSlice(0);
                }}
              >
                {Object.keys(slicePlanes).map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              3D mesh · {plane} slice {slice + 1}/{sliceCount}
              <input
                aria-label={plane === 'XY' ? 'Z slice' : 'Slice index'}
                type="range"
                min={0}
                max={sliceCount - 1}
                step={1}
                value={slice}
                onChange={(event) => setSlice(Number(event.target.value))}
              />
            </label>
          </>
        )}
        <label>
          Visible domain{' '}
          <select
            aria-label="Visible domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
          >
            <option value="all">All field domains</option>
            {layerTags.map((tag, index) => (
              <option key={tag} value={index}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {data.id} · {data.unit} · range {minimum.toPrecision(5)}–
        {maximum.toPrecision(5)} ·{' '}
        {mesh.shape.length === 3
          ? `${plane} slice of the solved 3D mesh`
          : 'solved 2D mesh'}
      </p>
      <div aria-label="Field color legend" className="flex items-center gap-3">
        <span>{minimum.toPrecision(5)}</span>
        <span
          className="h-4 w-48"
          style={{
            background:
              'linear-gradient(to right,hsl(240 75% 50%),hsl(120 75% 50%),hsl(0 75% 50%))',
          }}
        />
        <span>
          {maximum.toPrecision(5)} {data.unit}
        </span>
      </div>
      <svg
        viewBox="0 0 700 420"
        role="img"
        aria-label={`${data.id} numerical cell field`}
        className="w-full rounded border bg-slate-50"
      >
        {cells.map(({ cell, value }) => {
          const center = mesh.centers_m[cell],
            size = mesh.sizes_m[cell];
          const hue =
            240 *
            (1 -
              (maximum === minimum
                ? 0.5
                : (value - minimum) / (maximum - minimum)));
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
              x={
                45 +
                (620 * (center[axes.horizontal] - size[axes.horizontal] / 2)) /
                  extent[axes.horizontal]
              }
              y={
                370 -
                (330 * (center[axes.vertical] + size[axes.vertical] / 2)) /
                  extent[axes.vertical]
              }
              width={(620 * size[axes.horizontal]) / extent[axes.horizontal]}
              height={(330 * size[axes.vertical]) / extent[axes.vertical]}
              fill={`hsl(${hue} 75% 50%)`}
              stroke={probe === cell ? 'black' : 'white'}
              strokeWidth={probe === cell ? 1.5 : 0.25}
            >
              <title>{`Cell ${cell}: ${value} ${data.unit}`}</title>
            </rect>
          );
        })}
        <text x="45" y="391">
          0
        </text>
        <text x="490" y="391">
          {'xyz'[axes.horizontal]} (m) ·{' '}
          {extent[axes.horizontal].toExponential(3)}
        </text>
        <text x="7" y="30">
          {'xyz'[axes.vertical]} (m)
        </text>
        <text x="45" y="22">
          {extent[axes.vertical].toExponential(3)}
        </text>
      </svg>
      <p role="status" aria-label="Selected cell probe">
        Cell {probe} · region {layerTags[mesh.region_index[probe]]} · center (
        {mesh.centers_m[probe].join(', ')}) m ·{' '}
        {data.values[data.cells.indexOf(probe)]} {data.unit}
      </p>
      <label>
        Profile axis{' '}
        <select
          aria-label="Profile axis"
          value={profileAxis}
          onChange={(event) => setProfileAxis(Number(event.target.value))}
        >
          {mesh.shape.map((_, axis) => (
            <option key={axis} value={axis}>
              {'xyz'[axis]}
            </option>
          ))}
        </select>
      </label>
      <p>
        Grid-axis profile through the selected cell. Samples are cell values;
        gaps mark domains where this field is absent.
      </p>
      <svg
        viewBox="0 0 700 210"
        role="img"
        aria-label="Numerical line profile"
        className="w-full rounded border"
      >
        {profile.slice(1).map((sample, index) => {
          const previous = profile[index];
          return sample.value !== null && previous.value !== null ? (
            <line
              key={sample.cell}
              x1={45 + (620 * previous.coordinate_m) / coordinateMax}
              y1={profileY(previous.value)}
              x2={45 + (620 * sample.coordinate_m) / coordinateMax}
              y2={profileY(sample.value)}
              stroke="blue"
            />
          ) : null;
        })}
        {profile.map((sample) =>
          sample.value === null ? null : (
            <circle
              key={sample.cell}
              cx={45 + (620 * sample.coordinate_m) / coordinateMax}
              cy={profileY(sample.value)}
              r="3"
              fill="blue"
            >
              <title>{`${sample.coordinate_m} m: ${sample.value} ${data.unit}`}</title>
            </circle>
          ),
        )}
        <text x="45" y="198">
          {'xyz'[profileAxis]} (m) · 0–{coordinateMax.toExponential(3)}
        </text>
        <text x="45" y="20">
          {data.unit} · {minimum.toPrecision(5)}–{maximum.toPrecision(5)}
        </text>
      </svg>
      <button className="rounded border p-2" onClick={exportCSV}>
        Export profile CSV
      </button>
    </section>
  );
}
