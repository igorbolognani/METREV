'use client';

import * as React from 'react';

void React;

export function Sparkline({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  if (values.length === 0) {
    return <div className="wb-sparkline empty">No history</div>;
  }

  const width = 120;
  const height = 38;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <figure className="wb-sparkline">
      <svg viewBox={`0 0 ${width} ${height}`} aria-label={label} role="img">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
