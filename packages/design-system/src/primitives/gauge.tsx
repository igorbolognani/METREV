import type { ConfidenceLevel } from '../types';

import { cx } from '../utils';

export interface ConfidenceGaugeProps {
  value: number;
  level: ConfidenceLevel;
  label?: string;
  className?: string;
}

export function ConfidenceGauge({
  value,
  level,
  label,
  className,
}: ConfidenceGaugeProps) {
  const boundedValue = Math.max(0, Math.min(1, value));
  return (
    <div
      className={cx('metrev-gauge', `metrev-gauge-${level}`, className)}
      aria-label={label ?? `Confidence ${level}`}
    >
      <div className="metrev-gauge-track">
        <div
          className="metrev-gauge-fill"
          style={{ width: `${Math.round(boundedValue * 100)}%` }}
        />
      </div>
      <span className="metrev-gauge-label">
        {label ?? `${level} ${Math.round(boundedValue * 100)}%`}
      </span>
    </div>
  );
}
