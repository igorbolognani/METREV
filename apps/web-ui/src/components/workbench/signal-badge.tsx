'use client';

import type { SignalSourceKind } from '@metrev/domain-contracts';
import * as React from 'react';

import { formatToken } from '@/lib/formatting';

void React;

function sourceKindTone(
  kind: SignalSourceKind,
): 'success' | 'warning' | 'accent' | 'muted' {
  switch (kind) {
    case 'measured':
      return 'success';
    case 'modeled':
      return 'accent';
    case 'inferred':
      return 'warning';
    default:
      return 'muted';
  }
}

export function SignalBadge({ kind }: { kind: SignalSourceKind }) {
  return (
    <span className={`wb-signal-badge ${sourceKindTone(kind)}`}>
      {formatToken(kind)}
    </span>
  );
}
