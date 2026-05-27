import type { ReactNode } from 'react';

import { cx } from '../utils';

export interface InstrumentPanelProps {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function InstrumentPanel({
  title,
  meta,
  children,
  footer,
  className,
}: InstrumentPanelProps) {
  return (
    <section className={cx('metrev-panel', className)}>
      {(title || meta) && (
        <header className="metrev-panel-header">
          <div className="metrev-panel-title">{title}</div>
          {meta && <div className="metrev-panel-meta">{meta}</div>}
        </header>
      )}
      <div className="metrev-panel-body">{children}</div>
      {footer && <footer className="metrev-panel-footer">{footer}</footer>}
    </section>
  );
}
