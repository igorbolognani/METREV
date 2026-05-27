import type { ReactNode } from 'react';

import { cx } from '../utils';

export interface StatusBarItem {
  key: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'healthy' | 'warning' | 'critical' | 'info' | 'neutral';
}

export function StatusBar({
  items,
  className,
}: {
  items: StatusBarItem[];
  className?: string;
}) {
  return (
    <section className={cx('metrev-status-bar', className)}>
      {items.map((item) => (
        <article
          key={item.key}
          className={cx(
            'metrev-status-item',
            item.tone && `metrev-status-${item.tone}`,
          )}
        >
          <span className="metrev-status-label">{item.label}</span>
          <strong className="metrev-status-value">{item.value}</strong>
          {item.detail && (
            <span className="metrev-status-detail">{item.detail}</span>
          )}
        </article>
      ))}
    </section>
  );
}
