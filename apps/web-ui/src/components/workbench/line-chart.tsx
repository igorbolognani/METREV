'use client';

import type { SimulationSeries } from '@metrev/domain-contracts';
import * as React from 'react';

void React;

export function LineChart({
  series,
  label,
}: {
  series: SimulationSeries;
  label: string;
}) {
  const width = 320;
  const height = 180;
  const visiblePoints = series.points.filter(
    (point) => typeof point.y === 'number' && point.y !== null,
  );

  if (visiblePoints.length === 0) {
    return <div className="wb-chart-empty">Unavailable</div>;
  }

  const xMin = Math.min(...visiblePoints.map((point) => point.x));
  const xMax = Math.max(...visiblePoints.map((point) => point.x));
  const yMin = Math.min(...visiblePoints.map((point) => point.y as number));
  const yMax = Math.max(...visiblePoints.map((point) => point.y as number));
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(yMax - yMin, 1);
  const path = visiblePoints
    .map((point, index) => {
      const x = ((point.x - xMin) / xSpan) * width;
      const y = height - (((point.y as number) - yMin) / ySpan) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="wb-line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" />
        {visiblePoints.map((point) => {
          const x = ((point.x - xMin) / xSpan) * width;
          const y = height - (((point.y as number) - yMin) / ySpan) * height;

          return (
            <circle
              key={`${series.series_id}-${point.x}`}
              cx={x}
              cy={y}
              r="3.5"
            />
          );
        })}
      </svg>
      <p className="muted">
        {series.x_axis.label} vs {series.y_axis.label}
      </p>
    </div>
  );
}
