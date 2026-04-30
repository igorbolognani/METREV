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
    aliases: ['voltage', 'ocv', 'open circuit voltage', 'potential'],
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
  {
    metricKey: 'hydrogen_production_ml_l_d',
    canonicalUnit: 'mL/L/d',
    aliases: ['hydrogen production', 'h2 production', 'hydrogen rate'],
    multipliers: {
      'ml/l/d': {
        ruleId: 'research_metric.hydrogen_production.ml_l_d_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'hydrogen_yield_mol_mol',
    canonicalUnit: 'mol/mol',
    aliases: ['hydrogen yield', 'h2 yield'],
    multipliers: {
      'mol/mol': {
        ruleId: 'research_metric.hydrogen_yield_mol_mol_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'conductivity_ms_cm',
    canonicalUnit: 'mS/cm',
    aliases: ['conductivity'],
    multipliers: {
      'ms/cm': {
        ruleId: 'research_metric.conductivity.ms_cm_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'organic_loading_kg_cod_m3_d',
    canonicalUnit: 'kgCOD/m3/d',
    aliases: ['organic loading rate', 'olr'],
    multipliers: {
      'kgcod/m3/d': {
        ruleId: 'research_metric.organic_loading.kg_cod_m3_d_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'hydraulic_retention_time_h',
    canonicalUnit: 'h',
    aliases: ['hydraulic retention time', 'hrt'],
    multipliers: {
      h: {
        ruleId: 'research_metric.hrt.hours_identity',
        multiplier: 1,
      },
      hr: {
        ruleId: 'research_metric.hrt.hours_identity',
        multiplier: 1,
      },
      hours: {
        ruleId: 'research_metric.hrt.hours_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'energy_input_kwh_m3',
    canonicalUnit: 'kWh/m3',
    aliases: ['energy input', 'energy consumption'],
    multipliers: {
      'kwh/m3': {
        ruleId: 'research_metric.energy_input.kwh_m3_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'durability_d',
    canonicalUnit: 'days',
    aliases: ['durability', 'operation duration', 'long-term operation'],
    multipliers: {
      day: {
        ruleId: 'research_metric.durability.days_identity',
        multiplier: 1,
      },
      days: {
        ruleId: 'research_metric.durability.days_identity',
        multiplier: 1,
      },
    },
  },
  {
    metricKey: 'trl',
    canonicalUnit: 'TRL',
    aliases: ['trl', 'technology readiness level'],
    multipliers: {
      trl: {
        ruleId: 'research_metric.trl.identity',
        multiplier: 1,
      },
    },
  },
];

const metricValuePattern =
  /\b(?:TRL\s*)?(\d+(?:\.\d+)?)\s?(mW\/m2|W\/m2|mA\/cm2|A\/m2|mV|V|%|ohms?|mg\/L|g\/L|mL\/L\/d|mol\/mol|mS\/cm|kgCOD\/m3\/d|kWh\/m3|h|hr|hours?|days?|TRL)(?=\s|[,.;)]|$)/gi;

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
    if (
      includesAny(normalizedText, [
        'anode potential',
        'cathode potential',
        'electrode potential',
      ])
    ) {
      return {
        metricKey: 'electrode_potential_v',
        canonicalUnit: 'V',
        aliases: ['electrode potential'],
        multipliers: {
          v: {
            ruleId: 'research_metric.voltage.v_identity',
            multiplier: 1,
          },
          mv: {
            ruleId: 'research_metric.electrode_potential.mv_to_v',
            multiplier: 0.001,
          },
        },
      };
    }

    return metricRules.find((rule) => rule.metricKey === 'voltage_v') ?? null;
  }

  if (normalizedUnit === 'ohm' || normalizedUnit === 'ohms') {
    return metricRules.find((rule) => rule.metricKey === 'internal_resistance_ohm') ?? null;
  }

  if (normalizedUnit === '%') {
    if (includesAny(normalizedText, ['ammonium recovery', 'nh4 recovery'])) {
      return {
        metricKey: 'ammonium_recovery_pct',
        canonicalUnit: '%',
        aliases: ['ammonium recovery', 'nh4 recovery'],
        multipliers: {
          '%': {
            ruleId: 'research_metric.ammonium_recovery.percent_identity',
            multiplier: 1,
          },
        },
      };
    }

    if (includesAny(normalizedText, ['current efficiency'])) {
      return {
        metricKey: 'current_efficiency_pct',
        canonicalUnit: '%',
        aliases: ['current efficiency'],
        multipliers: {
          '%': {
            ruleId: 'research_metric.current_efficiency.percent_identity',
            multiplier: 1,
          },
        },
      };
    }

    if (includesAny(normalizedText, ['selectivity', 'product selectivity'])) {
      return {
        metricKey: 'product_selectivity_pct',
        canonicalUnit: '%',
        aliases: ['product selectivity'],
        multipliers: {
          '%': {
            ruleId: 'research_metric.product_selectivity.percent_identity',
            multiplier: 1,
          },
        },
      };
    }

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

  const directUnitMatch = metricRules.find(
    (rule) => rule.multipliers[normalizedUnit],
  );
  if (directUnitMatch) {
    return directUnitMatch;
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
