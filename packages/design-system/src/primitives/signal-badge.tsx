import type { ReactNode } from 'react';

import { cx } from '../utils';

export type SignalLevel =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'info'
  | 'neutral';

export interface SignalBadgeProps {
  level: SignalLevel;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function SignalBadge({
  level,
  children,
  className,
  title,
}: SignalBadgeProps) {
  return (
    <span
      className={cx('metrev-signal-badge', `metrev-signal-${level}`, className)}
      title={title}
    >
      {children}
    </span>
  );
}
