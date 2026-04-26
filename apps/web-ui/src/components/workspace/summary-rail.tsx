import type { ReactNode } from 'react';
import * as React from 'react';

type SummaryRailTone =
  | 'default'
  | 'accent'
  | 'warning'
  | 'success'
  | 'critical';

export interface SummaryRailItem {
  detail: string;
  footer?: ReactNode;
  key: string;
  label: string;
  tone?: SummaryRailTone;
  value: ReactNode;
}

export function SummaryRail({
  items,
  label = 'Summary metrics',
}: {
  items: SummaryRailItem[];
  label?: string;
}) {
  return (
    <section aria-label={label} className="summary-rail">
      {items.map((item) => (
        <article
          className={`summary-rail__item summary-rail__item--${item.tone ?? 'default'}`}
          key={item.key}
        >
          <span className="summary-rail__label">{item.label}</span>
          <strong className="summary-rail__value">{item.value}</strong>
          <p className="summary-rail__detail">{item.detail}</p>
          {item.footer ? (
            <div className="summary-rail__footer">{item.footer}</div>
          ) : null}
        </article>
      ))}
    </section>
  );
}

void React;
