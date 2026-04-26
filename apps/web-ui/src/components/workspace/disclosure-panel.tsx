import type { ReactNode } from 'react';
import * as React from 'react';

import { Collapsible } from '@/components/ui/collapsible';

export function DisclosurePanel({
  children,
  defaultOpen = false,
  meta,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <Collapsible
      className="disclosure-panel"
      contentClassName="disclosure-panel__content"
      defaultOpen={defaultOpen}
      meta={meta}
      title={title}
    >
      {children}
    </Collapsible>
  );
}

void React;
