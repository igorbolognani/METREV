'use client';

import type { SignalSourceKind } from '@metrev/domain-contracts';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { formatToken } from '@/lib/formatting';

void React;

function sourceKindTone(
  kind: SignalSourceKind,
): 'accepted' | 'pending' | 'info' | 'muted' {
  switch (kind) {
    case 'measured':
      return 'accepted';
    case 'modeled':
      return 'info';
    case 'inferred':
      return 'pending';
    default:
      return 'muted';
  }
}

export function SignalBadge({ kind }: { kind: SignalSourceKind }) {
  return (
    <Badge className="wb-signal-badge" variant={sourceKindTone(kind)}>
      {formatToken(kind)}
    </Badge>
  );
}
