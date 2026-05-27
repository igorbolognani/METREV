import type { FunnelStageCountLike } from '../types';

import { cx } from '../utils';

export function FunnelChart({
  stages,
  className,
}: {
  stages: FunnelStageCountLike[];
  className?: string;
}) {
  const maxCount = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <div className={cx('metrev-funnel', className)}>
      {stages.map((stage) => (
        <div key={stage.stage} className="metrev-funnel-row">
          <span className="metrev-funnel-label">
            {stage.stage.replaceAll('_', ' ')}
          </span>
          <span
            className="metrev-funnel-bar"
            style={{ width: `${Math.max(8, (stage.count / maxCount) * 100)}%` }}
          />
          <strong>{stage.count.toLocaleString()}</strong>
          <span>
            {stage.conversion_rate == null
              ? 'base'
              : `${Math.round(stage.conversion_rate * 100)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}
