'use client';

import * as React from 'react';

import { Collapsible } from '@/components/ui/collapsible';
import { WorkspaceDataCard } from '@/components/workspace-chrome';

void React;

function prettyUnknown(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export interface PayloadDisclosureCardProps {
  countBadge?: React.ReactNode;
  defaultOpen?: boolean;
  description?: string;
  meta?: React.ReactNode;
  title: string;
  value: unknown;
}

export function PayloadDisclosureCard({
  countBadge,
  defaultOpen = false,
  description,
  meta,
  title,
  value,
}: PayloadDisclosureCardProps) {
  return (
    <WorkspaceDataCard>
      <Collapsible
        countBadge={countBadge}
        defaultOpen={defaultOpen}
        meta={meta}
        title={title}
      >
        {description ? <p className="muted">{description}</p> : null}
        <pre className="code-block">{prettyUnknown(value)}</pre>
      </Collapsible>
    </WorkspaceDataCard>
  );
}
