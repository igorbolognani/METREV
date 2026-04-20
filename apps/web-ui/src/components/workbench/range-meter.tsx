'use client';

import * as React from 'react';

void React;

export function RangeMeter({
  value,
  min,
  max,
  target,
}: {
  value: number | null;
  min: number;
  max: number;
  target: readonly [number, number];
}) {
  const valuePercent =
    value === null ? null : ((value - min) / Math.max(max - min, 1)) * 100;
  const targetStart = ((target[0] - min) / Math.max(max - min, 1)) * 100;
  const targetWidth = ((target[1] - target[0]) / Math.max(max - min, 1)) * 100;

  return (
    <div className="wb-range-meter" aria-hidden="true">
      <span
        className="wb-range-meter-target"
        style={{ left: `${targetStart}%`, width: `${targetWidth}%` }}
      />
      {valuePercent !== null ? (
        <span
          className="wb-range-meter-value"
          style={{ left: `${valuePercent}%` }}
        />
      ) : null}
    </div>
  );
}
