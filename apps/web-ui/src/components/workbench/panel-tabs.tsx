'use client';

import * as React from 'react';

import { Tabs } from '@/components/ui/tabs';

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
    <Tabs
      items={tabs.map((tab) => ({
        value: tab.id,
        label: tab.label,
        badge: tab.badge,
      }))}
      label={label}
      onValueChange={(nextTab) => onChange(nextTab as T)}
      value={activeTab}
    />
  );
}
