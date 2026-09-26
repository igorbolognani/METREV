'use client';

import * as React from 'react';

import type { SimulationSensitivityAnalysis } from '@metrev/domain-contracts';

import { Badge } from '@/components/ui/badge';

function formatNumber(value: number | null, unit: string | null) {
  if (value === null) return 'Not available';
  const formatted = new Intl.NumberFormat('en', {
    maximumSignificantDigits: 6,
  }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function scenarioStatusLabel(
  status: 'completed' | 'insufficient_data' | 'not_implemented',
) {
  if (status === 'completed') return 'Modeled';
  return status === 'not_implemented' ? 'Solver not implemented' : 'Blocked';
}

export function SimulationSensitivityDetails({
  analysis,
}: {
  analysis: SimulationSensitivityAnalysis | undefined;
}) {
  if (!analysis) return null;

  const statusVariant =
    analysis.status === 'completed'
      ? 'accepted'
      : analysis.status === 'partial'
        ? 'pending'
        : 'muted';

  return (
    <details className="workspace-inline-card simulation-sensitivity">
      <summary>
        One-at-a-time sensitivity
        <Badge variant={statusVariant}>{analysis.status}</Badge>
      </summary>
      <p>{analysis.interpretation}</p>

      {analysis.status === 'not_available' ? (
        <p className="muted">
          No eligible positive uncertainty magnitudes with matching units were
          supplied, so no perturbation scenarios were run.
        </p>
      ) : null}

      {analysis.effects.map((effect) => (
        <details
          className="workspace-inline-card simulation-sensitivity__effect"
          key={effect.parameter_path}
        >
          <summary>
            {effect.parameter_path} ·{' '}
            {formatNumber(effect.nominal_value, effect.unit)}
            {' ± '}
            {formatNumber(effect.reported_uncertainty, effect.unit)}
            <Badge
              variant={
                effect.status === 'completed'
                  ? 'accepted'
                  : effect.status === 'partial'
                    ? 'pending'
                    : 'rejected'
              }
            >
              {effect.status}
            </Badge>
          </summary>
          <p>
            Input source: {effect.source_kind} · {effect.source_ref}
          </p>
          <div className="workspace-scroll-x" data-layout-scroll="true">
            <table className="ui-table simulation-sensitivity__table">
              <thead className="ui-table__head">
                <tr>
                  <th className="ui-table__header-cell" scope="col">
                    Modeled output
                  </th>
                  <th className="ui-table__header-cell" scope="col">
                    Nominal run
                  </th>
                  <th className="ui-table__header-cell" scope="col">
                    Input − uncertainty
                  </th>
                  <th className="ui-table__header-cell" scope="col">
                    Input + uncertainty
                  </th>
                </tr>
              </thead>
              <tbody className="ui-table__body">
                {effect.metrics.map((metric) => (
                  <tr className="ui-table__row" key={metric.key}>
                    <th className="ui-table__cell" scope="row">
                      {metric.label}
                    </th>
                    <td className="ui-table__cell">
                      {formatNumber(metric.nominal_value, metric.unit)}
                    </td>
                    <td className="ui-table__cell">
                      {formatNumber(metric.lower_input_value, metric.unit)}
                    </td>
                    <td className="ui-table__cell">
                      {formatNumber(metric.upper_input_value, metric.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {effect.lower_input_scenario.status !== 'completed' ? (
            <p className="muted">
              Lower-input scenario unavailable:{' '}
              {effect.lower_input_scenario.note}
            </p>
          ) : null}
          {effect.upper_input_scenario.status !== 'completed' ? (
            <p className="muted">
              Upper-input scenario unavailable:{' '}
              {effect.upper_input_scenario.note}
            </p>
          ) : null}
          <p className="muted">
            Scenario status: lower input{' '}
            {scenarioStatusLabel(effect.lower_input_scenario.status)}; upper
            input {scenarioStatusLabel(effect.upper_input_scenario.status)}.
          </p>
        </details>
      ))}

      {analysis.skipped_parameters.length > 0 ? (
        <details>
          <summary>
            Skipped inputs ({analysis.skipped_parameters.length})
          </summary>
          <ul className="list-block">
            {analysis.skipped_parameters.map((item) => (
              <li key={`${item.parameter_path}:${item.reason}`}>
                <strong>{item.parameter_path}:</strong> {item.reason}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </details>
  );
}
