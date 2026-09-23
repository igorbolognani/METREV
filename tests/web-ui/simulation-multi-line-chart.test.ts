import type { SimulationSeries } from '@metrev/domain-contracts';
import { describe, expect, it } from 'vitest';

import { groupSimulationSeriesByAxis } from '@/components/charts/simulation-multi-line-chart';

function series(input: {
  id: string;
  xKey?: string;
  xUnit?: string | null;
  yLabel: string;
  yUnit: string | null;
}): SimulationSeries {
  return {
    series_id: input.id,
    title: input.id,
    series_type: 'trend_line',
    x_axis: {
      key: input.xKey ?? 'time_s',
      label: input.xKey === 'distance_m' ? 'Distance' : 'Time',
      unit: input.xUnit ?? (input.xKey === 'distance_m' ? 'm' : 's'),
    },
    y_axis: {
      key: input.id,
      label: input.yLabel,
      unit: input.yUnit,
    },
    points: [{ x: 0, y: 1, meta: {} }],
    source_kind: 'modeled',
    provenance_note: 'Test series.',
  };
}

describe('simulation chart axis grouping', () => {
  it('keeps different physical units on separate charts and combines matching units', () => {
    const groups = groupSimulationSeriesByAxis([
      series({ id: 'cod', yLabel: 'COD', yUnit: 'kgCOD/m3' }),
      series({ id: 'anode-ph', yLabel: 'Anode pH', yUnit: 'pH' }),
      series({ id: 'cathode-ph', yLabel: 'Cathode pH', yUnit: 'pH' }),
      series({ id: 'current', yLabel: 'Current', yUnit: 'A' }),
    ]);

    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.yAxis.unit)).toEqual([
      'kgCOD/m3',
      'pH',
      'A',
    ]);
    expect(
      groups.find((group) => group.yAxis.unit === 'pH')?.series,
    ).toHaveLength(2);
  });

  it('separates equal y units when their x axes have different units', () => {
    const groups = groupSimulationSeriesByAxis([
      series({ id: 'per-time', yLabel: 'Current', yUnit: 'A' }),
      series({
        id: 'per-distance',
        xKey: 'distance_m',
        yLabel: 'Current',
        yUnit: 'A',
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.xAxis.unit)).toEqual(['s', 'm']);
  });
});
