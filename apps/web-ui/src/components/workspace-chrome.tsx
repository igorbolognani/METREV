'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

void React;

export function WorkspacePageHeader({
  breadcrumb,
  badge,
  title,
  description,
  chips = [],
  actions,
  pageActions,
}: {
  breadcrumb?: ReactNode;
  badge: string;
  title: string;
  description: string;
  chips?: string[];
  actions?: ReactNode;
  pageActions?: ReactNode;
}) {
  const resolvedActions = pageActions ?? actions;

  return (
    <section className="workspace-page-header">
      <div className="workspace-page-header__copy">
        {breadcrumb ? (
          <div className="workspace-page-header__breadcrumb">{breadcrumb}</div>
        ) : null}
        <Badge>{badge}</Badge>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="workspace-page-header__meta">
        {resolvedActions ? (
          <div className="workspace-page-header__actions">
            {resolvedActions}
          </div>
        ) : null}
        {chips.length > 0 ? (
          <div className="workspace-chip-list">
            {chips.map((chip) => (
              <span className="meta-chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function WorkspaceSection({
  className,
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  className?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={['workspace-section', className].filter(Boolean).join(' ')}
    >
      <div className="workspace-section__header">
        <div>
          {eyebrow ? <Badge variant="muted">{eyebrow}</Badge> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? (
          <div className="workspace-section__actions">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function WorkspaceStatCard({
  label,
  value,
  detail,
  tone = 'default',
  footer,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'default' | 'accent' | 'warning' | 'success' | 'critical';
  footer?: ReactNode;
}) {
  return (
    <article className={`workspace-stat-card workspace-stat-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
      {footer ? (
        <div className="workspace-stat-card__footer">{footer}</div>
      ) : null}
    </article>
  );
}

export function WorkspaceDataCard({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'success' | 'critical';
}) {
  return (
    <article className={`workspace-data-card workspace-data-card--${tone}`}>
      {children}
    </article>
  );
}

export function WorkspaceEmptyState({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <div className="workspace-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {primaryHref && primaryLabel ? (
        <Button asChild variant="outline">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function WorkspaceSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="workspace-skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
