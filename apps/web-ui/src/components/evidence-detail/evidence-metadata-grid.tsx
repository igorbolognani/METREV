'use client';

import * as React from 'react';

void React;

export interface EvidenceMetadataField {
  detail?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

export interface EvidenceMetadataGridProps {
  fields: EvidenceMetadataField[];
}

export function EvidenceMetadataGrid({ fields }: EvidenceMetadataGridProps) {
  return (
    <div className="evidence-metadata-grid">
      {fields.map((field) => (
        <article className="workspace-inline-card" key={field.label}>
          <span className="muted">{field.label}</span>
          <strong>{field.value}</strong>
          {field.detail ? <p>{field.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}
