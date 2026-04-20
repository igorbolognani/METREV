'use client';

import type { SignalSourceKind } from '@metrev/domain-contracts';
import * as React from 'react';

import { formatToken, sourceKindTone } from '@/lib/evaluation-workbench';

void React;

export function SignalBadge({ kind }: { kind: SignalSourceKind }) {
  return (
    <span className={`wb-signal-badge ${sourceKindTone(kind)}`}>
      {formatToken(kind)}
    </span>
  );
}
