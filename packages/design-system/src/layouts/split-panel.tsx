import type { ReactNode } from 'react';

import { cx } from '../utils';

export function SplitPanel({
  left,
  right,
  ratio = '45-55',
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: '40-60' | '45-55' | '50-50';
  className?: string;
}) {
  return (
    <div
      className={cx('metrev-split-panel', `metrev-split-${ratio}`, className)}
    >
      <div className="metrev-split-left">{left}</div>
      <div className="metrev-split-right">{right}</div>
    </div>
  );
}
