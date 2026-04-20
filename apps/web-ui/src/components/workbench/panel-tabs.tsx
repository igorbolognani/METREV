'use client';

import * as React from 'react';

void React;

export function PanelTabs<T extends string>({
  activeTab,
  tabs,
  onChange,
  label,
}: {
  activeTab: T;
  tabs: ReadonlyArray<{
    id: T;
    label: string;
    badge?: string | number;
  }>;
  onChange: (nextTab: T) => void;
  label: string;
}) {
  return (
    <div className="wb-tablist" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const selected = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            className={`wb-tab${selected ? ' active' : ''}`}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined ? (
              <span className="wb-tab-badge">{tab.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
