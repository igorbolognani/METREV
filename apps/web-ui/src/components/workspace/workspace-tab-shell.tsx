import type { ReactNode } from 'react';
import * as React from 'react';

import { Tabs } from '@/components/ui/tabs';

export interface WorkspaceTabShellItem {
  badge?: string | number;
  label: string;
  value: string;
}

export function WorkspaceTabShell({
  actions,
  activeTab,
  children,
  items,
  label,
  onTabChange,
  summary,
  title,
}: {
  actions?: ReactNode;
  activeTab: string;
  children: ReactNode;
  items: WorkspaceTabShellItem[];
  label: string;
  onTabChange?: (value: string) => void;
  summary?: string;
  title: string;
}) {
  return (
    <section className="workspace-tab-shell">
      <div className="workspace-tab-shell__header">
        <div className="workspace-tab-shell__copy">
          <h2>{title}</h2>
          {summary ? <p>{summary}</p> : null}
        </div>
        {actions ? (
          <div className="workspace-tab-shell__actions">{actions}</div>
        ) : null}
      </div>
      <Tabs
        items={items}
        label={label}
        onValueChange={onTabChange}
        value={activeTab}
      >
        {children}
      </Tabs>
    </section>
  );
}

void React;
