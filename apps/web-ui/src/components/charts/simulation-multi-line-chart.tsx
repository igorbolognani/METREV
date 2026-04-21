'use client';

import type { SimulationSeries } from '@metrev/domain-contracts';
import * as React from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { WorkspaceEmptyState } from '@/components/workspace-chrome';

void React;

const chartColors = [
  '#1f6f5f',
  '#b76e24',
  '#2b5e8d',
  '#8a1f11',
  '#5b4bb2',
  '#2f7d6d',
];

export interface SimulationChartRow {
  x: number;
  xLabel: string;
  [key: string]: number | string | null;
}

export interface SimulationMultiLineChartProps {
  height?: number;
  series?: SimulationSeries[];
}

function axisLabel(
  axis: SimulationSeries['x_axis'] | SimulationSeries['y_axis'],
) {
  return axis.unit ? `${axis.label} (${axis.unit})` : axis.label;
}

export function buildSimulationChartRows(
  series: SimulationSeries[],
): SimulationChartRow[] {
  const rows = new Map<string, SimulationChartRow>();

  series.forEach((entry) => {
    entry.points.forEach((point) => {
      const key = String(point.x);
      const existingRow = rows.get(key);

      if (existingRow) {
        existingRow[entry.series_id] = point.y;
        return;
      }

      rows.set(key, {
        x: point.x,
        xLabel: point.label ?? String(point.x),
        [entry.series_id]: point.y,
      });
    });
  });

  return [...rows.values()].sort((left, right) => left.x - right.x);
}

export function SimulationMultiLineChart({
  height = 320,
  series,
}: SimulationMultiLineChartProps) {
  if (!series?.length || series.every((entry) => entry.points.length === 0)) {
    return (
      <WorkspaceEmptyState
        title="No modeled series"
        description="This evaluation did not produce chartable simulation series."
      />
    );
  }

  const rows = buildSimulationChartRows(series);
  const referenceSeries = series[0];
  const xAxisLabel = axisLabel(referenceSeries.x_axis);
  const yAxisLabel = axisLabel(referenceSeries.y_axis);

  return (
    <div className="evaluation-chart-shell">
      <ResponsiveContainer height={height} width="100%">
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{ top: 16, right: 24, bottom: 12, left: 12 }}
        >
          <CartesianGrid
            stroke="rgba(110, 95, 72, 0.16)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="xLabel"
            label={{ value: xAxisLabel, offset: -2, position: 'insideBottom' }}
            minTickGap={18}
            tickLine={false}
          />
          <YAxis
            label={{
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle' },
              value: yAxisLabel,
            }}
            tickLine={false}
            width={76}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(255, 250, 242, 0.96)',
              border: '1px solid rgba(110, 95, 72, 0.16)',
              borderRadius: 16,
            }}
            formatter={(value, name) => [value ?? 'n/a', name]}
            labelFormatter={(label) => `${xAxisLabel}: ${label}`}
          />
          <Legend />
          {series.map((entry, index) => (
            <Line
              activeDot={{ r: 5 }}
              connectNulls={false}
              dataKey={entry.series_id}
              dot={false}
              key={entry.series_id}
              name={entry.title}
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={2.5}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
