import type { ReactNode } from 'react';
import * as React from 'react';

export function ChartPanel({
  children,
  meta,
  summary,
  title,
}: {
  children: ReactNode;
  meta?: ReactNode;
  summary?: string;
  title: string;
}) {
  return (
    <article className="chart-panel">
      <div className="chart-panel__header">
        <div>
          <h3>{title}</h3>
          {summary ? <p>{summary}</p> : null}
        </div>
        {meta ? <div className="chart-panel__meta">{meta}</div> : null}
      </div>
      <div className="chart-panel__body">{children}</div>
    </article>
  );
}

void React;
