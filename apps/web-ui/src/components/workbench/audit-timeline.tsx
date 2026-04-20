'use client';

import * as React from 'react';

void React;

export function AuditTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    detail?: string;
  }>;
}) {
  if (items.length === 0) {
    return <p className="muted empty-state">No audit events were recorded.</p>;
  }

  return (
    <ol className="wb-audit-timeline">
      {items.map((item) => (
        <li key={item.id}>
          <div className="wb-audit-node" />
          <article className="wb-audit-card">
            <strong>{item.title}</strong>
            <p className="muted">{item.subtitle}</p>
            {item.detail ? <p>{item.detail}</p> : null}
          </article>
        </li>
      ))}
    </ol>
  );
}
