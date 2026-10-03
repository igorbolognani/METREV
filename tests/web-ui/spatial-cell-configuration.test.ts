import { describe, expect, it } from 'vitest';
import { structuredCellFixture } from '../fixtures/structured-cell';
import {
  structuredCellScientificParameters,
  updateStructuredCellParameter,
  updateStructuredCellResolution,
} from '../../apps/web-ui/src/lib/spatial-cell-configuration';

describe('source-preserving cell configuration', () => {
  it('changes a declared parameter while preserving units, uncertainty, conditions and input identity', () => {
    const input = structuredCellFixture();
    const original = structuredClone(input);
    const parameter = structuredCellScientificParameters(input).find(
      (item) => item.path.join('.') === 'temperature',
    )!;
    expect(parameter.source_kind).toBe('test_fixture');
    const result = updateStructuredCellParameter(input, parameter.path, {
      value: 300,
      source_kind: 'assumption',
      source_ref: 'user:declared-temperature',
      source_locator: 'test-only configuration',
    });
    expect(input).toEqual(original);
    expect(result.temperature).toMatchObject({
      value: 300,
      unit: 'K',
      source_kind: 'assumption',
      source_ref: 'user:declared-temperature',
    });
    expect(result.temperature.conditions).toEqual(input.temperature.conditions);
    expect(result.dimension).toBe(input.dimension);
    expect(result.model_id).toBe(input.model_id);
  });
  it('refuses missing provenance, nonfinite values, unknown paths and unbalanced reactions', () => {
    const input = structuredCellFixture();
    const patch = {
      value: 300,
      source_kind: 'assumption',
      source_ref: 'user:test',
    };
    expect(() =>
      updateStructuredCellParameter(input, ['temperature'], {
        ...patch,
        source_ref: '',
      }),
    ).toThrow();
    expect(() =>
      updateStructuredCellParameter(input, ['temperature'], {
        ...patch,
        value: NaN,
      }),
    ).toThrow();
    expect(() =>
      updateStructuredCellParameter(input, ['dimension'], patch),
    ).toThrow();
    expect(() =>
      updateStructuredCellParameter(
        input,
        ['electrodes', '0', 'electron_count'],
        { ...patch, value: 2 },
      ),
    ).toThrow();
  });
  it.each([2, 3] as const)(
    'changes %sD numerical counts without fabricating geometry or scientific values',
    (dimension) => {
      const input = structuredCellFixture(dimension);
      const changed = updateStructuredCellResolution(
        input,
        input.geometry.layers.map(() => 3),
        input.geometry.transverse_cells.map(() => 4),
      );
      expect(changed.dimension).toBe(dimension);
      expect(changed.geometry.lengths_m).toEqual(input.geometry.lengths_m);
      expect(changed.species).toEqual(input.species);
      expect(changed.geometry.layers.map((layer) => layer.width_m)).toEqual(
        input.geometry.layers.map((layer) => layer.width_m),
      );
      expect(input.geometry.layers[0].cells).toBe(2);
      expect(() => updateStructuredCellResolution(input, [3], [4])).toThrow();
      expect(() =>
        updateStructuredCellResolution(
          input,
          [128, 128, 128],
          dimension === 3 ? [64, 64] : [64],
        ),
      ).toThrow();
    },
  );
});
