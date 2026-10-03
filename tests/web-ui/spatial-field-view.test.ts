import { describe, expect, it } from 'vitest';
import { structuredCellTopology } from '@metrev/domain-contracts';
import { structuredCellFixture } from '../fixtures/structured-cell';
import {
  cellGridIndex,
  cellLineProfile,
  fieldProfileCSV,
  fieldSliceCells,
} from '../../apps/web-ui/src/lib/spatial-field-view';

function fixture(dimension: 2 | 3 = 3) {
  const input = structuredCellFixture(dimension);
  const mesh = structuredCellTopology(input);
  const field = {
    id: 'liquid_potential',
    unit: 'V',
    cells: mesh.centers_m.map((_, i) => i),
    values: mesh.centers_m.map(
      (center) => center[0] + 2 * center[1] + (center[2] ?? 0),
    ),
  };
  return { input, mesh, field };
}

describe('verified numerical field views', () => {
  it('cuts XY/XZ/YZ using global mesh coordinates and preserves sample identity', () => {
    const { mesh, field } = fixture();
    for (const [plane, fixed, count] of [
      ['XY', 2, mesh.shape[0] * mesh.shape[1]],
      ['XZ', 1, mesh.shape[0] * mesh.shape[2]],
      ['YZ', 0, mesh.shape[1] * mesh.shape[2]],
    ] as const) {
      const samples = fieldSliceCells(mesh, field, plane, 1);
      expect(samples).toHaveLength(count);
      expect(
        samples.every(
          (sample) => cellGridIndex(mesh, sample.cell)[fixed] === 1,
        ),
      ).toBe(true);
      expect(
        samples.every((sample) => sample.value === field.values[sample.cell]),
      ).toBe(true);
    }
    expect(
      fieldSliceCells(mesh, field, 'XY', 0, 2).every(
        (sample) => mesh.region_index[sample.cell] === 2,
      ),
    ).toBe(true);
  });

  it('keeps physical positions and explicit gaps across unavailable electrode domains', () => {
    const { mesh, field } = fixture();
    const cells = field.cells.filter((cell) => mesh.region_index[cell] === 2);
    const subset = {
      ...field,
      id: 'solid_potential_cathode',
      cells,
      values: cells.map((cell) => field.values[cell]),
    };
    const profile = cellLineProfile(mesh, subset, cells[0], 0);
    expect(profile).toHaveLength(mesh.shape[0]);
    expect(profile.filter((sample) => sample.value === null)).toHaveLength(
      mesh.shape[0] - 2,
    );
    profile
      .filter((sample) => sample.value !== null)
      .forEach((sample) =>
        expect(sample.value).toBe(field.values[sample.cell]),
      );
    expect(
      profile.every(
        (sample) => sample.coordinate_m === mesh.centers_m[sample.cell][0],
      ),
    ).toBe(true);
  });

  it('exports scientific units, physical positions and hashes with each profile sample', () => {
    const { input, mesh, field } = fixture(2);
    const csv = fieldProfileCSV({
      mesh,
      field,
      probe: 0,
      axis: 1,
      domainTags: input.geometry.layers.map((layer) => layer.tag),
      binding: {
        run_id: 'run-1',
        input_sha256: 'a'.repeat(64),
        mesh_sha256: 'b'.repeat(64),
        field_sha256: 'c'.repeat(64),
        numerical_status: 'failed',
      },
    });
    const rows = csv.trim().split('\r\n');
    expect(rows).toHaveLength(mesh.shape[1] + 1);
    expect(rows[0]).toContain('"z_m"');
    expect(rows[1]).toContain('"failed_run_diagnostics"');
    expect(rows[1]).toContain('"V"');
    expect(rows.every((row) => row.split(',').length === 15)).toBe(true);
    expect(rows[1]).toContain('"' + 'c'.repeat(64) + '"');
  });

  it('rejects out-of-range cells, slices, axes and 3D planes on 2D meshes', () => {
    const { mesh, field } = fixture(2);
    expect(() => cellGridIndex(mesh, -1)).toThrow();
    expect(() => fieldSliceCells(mesh, field, 'XZ', 0)).toThrow();
    expect(() => fieldSliceCells(mesh, field, 'XY', 1)).toThrow();
    expect(() => cellLineProfile(mesh, field, 0, 2)).toThrow();
  });
});
