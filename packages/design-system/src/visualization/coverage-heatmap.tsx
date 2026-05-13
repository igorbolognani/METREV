import type { CoverageEntryLike } from '../types';

import { cx } from '../utils';

export function CoverageHeatmap({
  entries,
  className,
}: {
  entries: CoverageEntryLike[];
  className?: string;
}) {
  const metrics = Array.from(
    new Set(entries.map((entry) => entry.metric_type)),
  ).sort();
  const rowKeys = Array.from(
    new Set(
      entries.map((entry) =>
        [
          entry.system_type ?? 'any',
          entry.component_type ?? 'any',
          entry.material ?? 'any',
        ].join(' / '),
      ),
    ),
  ).sort();

  return (
    <div
      className={cx('metrev-coverage-heatmap', className)}
      role="table"
      aria-label="Evidence coverage matrix"
    >
      <div className="metrev-heatmap-row metrev-heatmap-head" role="row">
        <span role="columnheader">configuration</span>
        {metrics.map((metric) => (
          <span key={metric} role="columnheader">
            {metric}
          </span>
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div key={rowKey} className="metrev-heatmap-row" role="row">
          <strong role="rowheader">{rowKey}</strong>
          {metrics.map((metric) => {
            const cell = entries.find(
              (entry) =>
                [
                  entry.system_type ?? 'any',
                  entry.component_type ?? 'any',
                  entry.material ?? 'any',
                ].join(' / ') === rowKey && entry.metric_type === metric,
            );
            const level = cell?.coverage_level ?? 'absent';
            return (
              <span
                key={metric}
                role="cell"
                className={cx(
                  'metrev-heatmap-cell',
                  `metrev-coverage-${level}`,
                )}
                title={`${metric}: ${level}`}
              >
                {cell?.record_count ?? 0}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
