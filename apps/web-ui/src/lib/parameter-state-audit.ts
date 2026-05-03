import type {
  ParameterStateAudit,
  RawCaseInput,
} from '@metrev/domain-contracts';

import { caseIntakeParameterConfigs } from '@/lib/case-intake';
import { formatToken } from '@/lib/formatting';

const parameterStateLabelByKey = Object.fromEntries(
  Object.values(caseIntakeParameterConfigs).map((config) => [
    config.parameterKey,
    config.label,
  ]),
);

function summarizeParameterState(rawInput: RawCaseInput) {
  const entries = Object.values(rawInput.parameter_state ?? {});

  return {
    total: entries.length,
    client_values: entries.filter(
      (entry) => entry.included && entry.value_source === 'client',
    ).length,
    system_defaults: entries.filter(
      (entry) => entry.included && entry.value_source === 'system_default',
    ).length,
    excluded: entries.filter((entry) => !entry.included).length,
    unresolved: entries.filter(
      (entry) => entry.included && entry.value_source === 'unset',
    ).length,
  };
}

function normalizeParameterUnit(unit?: string | null): string | null {
  if (!unit || unit === 'unitless') {
    return null;
  }

  return unit;
}

function formatParameterValue(value: unknown, unit?: string | null): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const rendered = Number.isInteger(value) ? String(value) : value.toFixed(2);
    return unit ? `${rendered} ${unit}` : rendered;
  }

  if (typeof value === 'string' && value.trim()) {
    return unit ? `${value} ${unit}` : value;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null) {
    return 'Unset';
  }

  return 'Unavailable';
}

export function buildParameterStateAuditViewModel(
  rawInput: RawCaseInput,
): ParameterStateAudit {
  return {
    summary: summarizeParameterState(rawInput),
    entries: Object.entries(rawInput.parameter_state ?? {}).map(
      ([key, entry]) => {
        const unit = normalizeParameterUnit(entry.unit ?? null);

        return {
          key,
          label: parameterStateLabelByKey[key] ?? formatToken(key),
          included: entry.included,
          value_source: entry.value_source,
          value_label: !entry.included
            ? 'Excluded from the active run input.'
            : entry.value_source === 'unset'
              ? 'Included without a resolved value.'
              : formatParameterValue(entry.value, unit),
          unit,
          confidence_impact: entry.confidence_impact ?? null,
          default_rationale: entry.default_rationale ?? null,
          audit_note: entry.audit_note ?? null,
          evidence_refs: entry.evidence_refs ?? [],
        };
      },
    ),
  };
}
