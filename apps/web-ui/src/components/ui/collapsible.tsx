'use client';

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';

function joinClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export interface CollapsibleProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  countBadge?: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  title?: string;
  trigger?: React.ReactNode;
}

export function Collapsible({
  children,
  className,
  contentClassName,
  countBadge,
  defaultOpen,
  meta,
  onOpenChange,
  open,
  title,
  trigger,
}: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root
      className={joinClassNames('ui-collapsible', className)}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      open={open}
    >
      <CollapsiblePrimitive.Trigger
        className="ui-collapsible__trigger"
        type="button"
      >
        {trigger ? (
          trigger
        ) : (
          <>
            <span className="ui-collapsible__title-row">
              <span className="ui-collapsible__indicator" aria-hidden="true" />
              <span className="ui-collapsible__title">{title}</span>
            </span>
            <span className="ui-collapsible__meta-row">
              {meta ? (
                <span className="ui-collapsible__meta">{meta}</span>
              ) : null}
              {countBadge !== undefined ? (
                <Badge size="sm" variant="muted">
                  {countBadge}
                </Badge>
              ) : null}
            </span>
          </>
        )}
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content
        className={joinClassNames('ui-collapsible__content', contentClassName)}
      >
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
