'use client';

import * as React from 'react';

void React;

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function DenseTableShell({
  children,
  variant = 'detail',
}: {
  children: React.ReactNode;
  variant?: 'dashboard' | 'detail';
}) {
  return (
    <div
      className={
        variant === 'dashboard' ? 'dashboard-table-shell' : 'detail-table-shell'
      }
    >
      {children}
    </div>
  );
}

export function DenseTableStack({
  children,
  variant = 'detail',
  wide = false,
}: {
  children: React.ReactNode;
  variant?: 'dashboard' | 'detail';
  wide?: boolean;
}) {
  const baseClass =
    variant === 'dashboard' ? 'dashboard-table-stack' : 'detail-table-stack';

  return (
    <div className={joinClasses(baseClass, wide && `${baseClass}--wide`)}>
      {children}
    </div>
  );
}

export function DenseTableActions({
  children,
  variant = 'detail',
}: {
  children: React.ReactNode;
  variant?: 'dashboard' | 'detail';
}) {
  return (
    <div
      className={
        variant === 'dashboard'
          ? 'dashboard-table-actions'
          : 'detail-table-actions'
      }
    >
      {children}
    </div>
  );
}

export function DenseChipList({
  emptyMessage,
  values,
}: {
  emptyMessage: string;
  values: string[];
}) {
  if (values.length === 0) {
    return <span className="muted">{emptyMessage}</span>;
  }

  return (
    <div className="workspace-chip-list compact">
      {values.map((value) => (
        <span className="meta-chip" key={value}>
          {value}
        </span>
      ))}
    </div>
  );
}
