import type { ReactNode } from 'react';

import { cx } from '../utils';

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cx('metrev-badge', className)}>{children}</span>;
}
