import type {
  ResearchEvidenceTrace,
  ResearchMetricMeasurement,
} from '@metrev/domain-contracts';

interface MetricRule {
  aliases: string[];
  canonicalUnit: string;
  metricKey: string;
  multipliers: Record<string, { ruleId: string; multiplier: number }>;
}

const metricRules: MetricRule[] = [
  {
    metricKey: 'power_density_w_m2',
    canonicalUnit: 'W/m2',
    aliases: ['power density', 'power output'],
    multipliers: {
      'mw/m2': {
        ruleId: 'research_metric.power_density.mw_m2_to_w_m2',
        multiplier: 0.001,
      },
      'w/m2': {
        ruleId: 'research_metric.power_density.w_m2_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'current_density_a_m2',
    canonicalUnit: 'A/m2',
    aliases: ['current density'],
    multipliers: {
      'a/m2': {
        ruleId: 'research_metric.current_density.a_m2_identity',
        multiplier: 1,
      },
      'ma/cm2': {
        ruleId: 'research_metric.current_density.ma_cm2_to_a_m2',
        multiplier: 10,
      },
    },
  },
  {
    metricKey: 'coulombic_efficiency_pct',
    canonicalUnit: '%',
    aliases: ['coulombic efficiency', ' ce '],
    multipliers: {
      '%': {
        ruleId: 'research_metric.coulombic_efficiency.percent_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'cod_removal_pct',
    canonicalUnit: '%',
    aliases: ['cod removal', 'chemical oxygen demand'],
    multipliers: {
      '%': {
        ruleId: 'research_metric.cod_removal.percent_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'internal_resistance_ohm',
    canonicalUnit: 'ohm',
    aliases: ['internal resistance', 'ohmic resistance'],
    multipliers: {
      ohm: {
        ruleId: 'research_metric.internal_resistance.ohm_identity',
        multiplier: 1,
      },
      ohms: {
        ruleId: 'research_metric.internal_resistance.ohm_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'voltage_v',
    canonicalUnit: 'V',
    aliases: ['voltage', 'ocv', 'open circuit voltage'],
    multipliers: {
      v: {
        ruleId: 'research_metric.voltage.v_identity',
        multiplier: 1,
      },
      mv: {
        ruleId: 'research_metric.voltage.mv_to_v',
        multiplier: 0.001,
      },
    },
  },
];

const metricValuePattern =
  /\b(\d+(?:\.\d+)?)\s?(mW\/m2|W\/m2|mA\/cm2|A\/m2|mV|V|%|ohms?|mg\/L|g\/L)(?=\s|[,.;)]|$)/gi;

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

function includesAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function inferRule(text: string, unit: string): MetricRule | null {
  const normalizedText = ` ${text.toLowerCase()} `;
  const normalizedUnit = normalizeUnit(unit);

  if (normalizedUnit === 'mw/m2' || normalizedUnit === 'w/m2') {
    return metricRules.find((rule) => rule.metricKey === 'power_density_w_m2') ?? null;
  }

  if (normalizedUnit === 'a/m2' || normalizedUnit === 'ma/cm2') {
    return metricRules.find((rule) => rule.metricKey === 'current_density_a_m2') ?? null;
  }

  if (normalizedUnit === 'v' || normalizedUnit === 'mv') {
    return metricRules.find((rule) => rule.metricKey === 'voltage_v') ?? null;
  }

  if (normalizedUnit === 'ohm' || normalizedUnit === 'ohms') {
    return metricRules.find((rule) => rule.metricKey === 'internal_resistance_ohm') ?? null;
  }

  if (normalizedUnit === '%') {
    if (
      includesAny(normalizedText, ['cod removal', 'chemical oxygen demand'])
    ) {
      return metricRules.find((rule) => rule.metricKey === 'cod_removal_pct') ?? null;
    }

    if (includesAny(normalizedText, ['coulombic efficiency', ' ce '])) {
      return metricRules.find(
        (rule) => rule.metricKey === 'coulombic_efficiency_pct',
      ) ?? null;
    }

    return null;
  }

  const aliasMatch = metricRules.find((rule) =>
    rule.aliases.some((alias) => normalizedText.includes(alias)),
  );
  if (aliasMatch) {
    return aliasMatch;
  }

  return null;
}

export function normalizeMetricMeasurement(input: {
  evidenceTrace: ResearchEvidenceTrace;
  sourceText: string;
  unit: string;
  value: number;
}): ResearchMetricMeasurement {
  const rule = inferRule(input.sourceText, input.unit);
  const normalizedUnit = normalizeUnit(input.unit);
  const conversion = rule?.multipliers[normalizedUnit];

  return {
    metric_key: rule?.metricKey ?? 'unclassified_metric',
    original_value: input.value,
    original_unit: input.unit,
    normalized_value: conversion ? input.value * conversion.multiplier : null,
    normalized_unit: conversion ? rule.canonicalUnit : null,
    normalization_rule_id: conversion ? conversion.ruleId : null,
    evidence_trace: input.evidenceTrace,
  };
}

export function extractMetricMeasurements(input: {
  source: ResearchEvidenceTrace['source'];
  sourceDocumentId: string;
  sourceText: string;
}): ResearchMetricMeasurement[] {
  const measurements: ResearchMetricMeasurement[] = [];
  const text = input.sourceText;

  for (const match of text.matchAll(metricValuePattern)) {
    const value = Number(match[1]);
    const unit = match[2];
    const start = Math.max(0, (match.index ?? 0) - 100);
    const end = Math.min(text.length, (match.index ?? 0) + match[0].length + 100);
    const classificationStart = Math.max(0, (match.index ?? 0) - 80);
    const classificationText = text
      .slice(classificationStart, (match.index ?? 0) + match[0].length)
      .trim();
    const span = text.slice(start, end).trim();

    if (!Number.isFinite(value)) {
      continue;
    }

    measurements.push(
      normalizeMetricMeasurement({
        value,
        unit,
        sourceText: classificationText || span,
        evidenceTrace: {
          source: input.source,
          source_document_id: input.sourceDocumentId,
          text_span: span || match[0],
          source_locator: input.source,
          page_number: null,
        },
      }),
    );
  }

  return measurements;
}
