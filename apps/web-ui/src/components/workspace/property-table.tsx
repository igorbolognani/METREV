import * as React from 'react';

export interface PropertyTableRow {
  label: string;
  source?: string | null;
  unit?: string | null;
  value: string;
}

export function PropertyTable({
  caption,
  rows,
}: {
  caption?: string;
  rows: PropertyTableRow[];
}) {
  return (
    <div className="property-table-shell">
      <table className="property-table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
            <th scope="col">Unit</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.label}-${row.value}`}>
              <th scope="row">{row.label}</th>
              <td>{row.value}</td>
              <td>{row.unit ?? '-'}</td>
              <td>{row.source ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

void React;
