'use client';

import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { WorkspaceEmptyState } from '@/components/workspace-chrome';

void React;

interface ClaimRow {
  claim: string;
  detail: string;
  key: string;
  source: string;
}

function formatUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function buildClaimRow(value: unknown, index: number): ClaimRow {
  if (typeof value === 'string') {
    return {
      claim: value,
      detail: 'Literal imported claim',
      key: `claim-${index}`,
      source: 'Unstructured import',
    };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const claim =
      (typeof record.claim === 'string' && record.claim) ||
      (typeof record.statement === 'string' && record.statement) ||
      (typeof record.title === 'string' && record.title) ||
      `Structured claim ${index + 1}`;
    const source =
      (typeof record.scope === 'string' && record.scope) ||
      (typeof record.context === 'string' && record.context) ||
      (typeof record.block === 'string' && record.block) ||
      'Imported record';
    const detail =
      (typeof record.supporting_evidence === 'string' &&
        record.supporting_evidence) ||
      (typeof record.detail === 'string' && record.detail) ||
      Object.entries(record)
        .filter(
          ([key]) =>
            ![
              'claim',
              'statement',
              'title',
              'scope',
              'context',
              'block',
            ].includes(key),
        )
        .slice(0, 2)
        .map(([key, entryValue]) => `${key}: ${formatUnknown(entryValue)}`)
        .join(' · ') ||
      'Structured claim payload available in raw disclosure.';

    return {
      claim,
      detail,
      key: String(record.id ?? `claim-${index}`),
      source,
    };
  }

  return {
    claim: `Claim ${index + 1}`,
    detail: formatUnknown(value),
    key: `claim-${index}`,
    source: 'Fallback JSON rendering',
  };
}

export interface EvidenceClaimsTableProps {
  claims: unknown[];
}

export function EvidenceClaimsTable({ claims }: EvidenceClaimsTableProps) {
  if (claims.length === 0) {
    return (
      <WorkspaceEmptyState
        description="No extracted claims were stored for this evidence record."
        title="No structured claims"
      />
    );
  }

  const rows = claims.map((claim, index) => buildClaimRow(claim, index));

  return (
    <div className="detail-table-shell">
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Claim</TableHeaderCell>
            <TableHeaderCell>Detail</TableHeaderCell>
            <TableHeaderCell>Source</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <div className="detail-table-stack detail-table-stack--wide">
                  <strong>{row.claim}</strong>
                </div>
              </TableCell>
              <TableCell>{row.detail}</TableCell>
              <TableCell>{row.source}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
