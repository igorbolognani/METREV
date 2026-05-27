import type { ReactNode } from 'react';

import { cx } from '../utils';

export function ScientificSection({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('metrev-section', className)}>
      {eyebrow && <span className="metrev-section-eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {children}
    </section>
  );
}
