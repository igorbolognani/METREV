import { createHash, randomUUID } from 'node:crypto';

export const CANONICAL_FACT_LAYER = 'canonical_scientific_fact_v1';
export const CANONICAL_EXTRACTOR_VERSION = 'canonical-deterministic-v1';

export const CANONICALIZATION_STATUSES = {
  CANONICAL_EXTRACTED: 'canonical_extracted',
  INSUFFICIENT_SOURCE: 'insufficient_source',
  NEEDS_FULL_TEXT: 'needs_full_text',
  NEEDS_REVIEW: 'needs_review',
  EXTRACTION_FAILED: 'extraction_failed',
};

export const REQUIRED_CANONICAL_FIELDS = [
  'system_type',
  'reactor_type',
  'anode_material',
  'cathode_material',
  'membrane_separator',
  'catalyst',
  'current_collector',
  'substrate_wastewater_type',
  'inoculum_biology',
  'ph',
  'temperature',
  'conductivity',
  'cod',
  'hrt',
  'current_density',
  'power_density',
  'coulombic_efficiency',
  'hydrogen_production',
  'methane_biogas_relationship',
  'contaminant_removal_efficiency',
  'scale',
  'trl_maturity',
  'cost_indicators',
  'operating_constraints',
  'reported_limitations',
  'failure_modes',
  'reported_tradeoffs',
];

const NUMBER_PATTERN = '(-?\\d+(?:[.,]\\d+)?)';
const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+/;

const SYSTEM_TYPE_RULES = [
  {
    canonical: 'MFC',
    patterns: [
      /\bmicrobial fuel cells?\b/i,
      /\bMFCs?\b/,
      /\bbioelectricity\b/i,
    ],
  },
  {
    canonical: 'MEC',
    patterns: [
      /\bmicrobial electrolysis cells?\b/i,
      /\bMECs?\b/,
      /\bbiohydrogen\b/i,
    ],
  },
  {
    canonical: 'MET',
    patterns: [/\bmicrobial electrochemical technolog(?:y|ies)\b/i, /\bMETs?\b/],
  },
  {
    canonical: 'MDC',
    patterns: [/\bmicrobial desalination cells?\b/i, /\bMDCs?\b/],
  },
  {
    canonical: 'BES',
    patterns: [/\bbioelectrochemical systems?\b/i, /\bBESs?\b/],
  },
  {
    canonical: 'bioelectrochemical_system',
    patterns: [/\bbioelectrochemical\b/i],
  },
];

const REACTOR_RULES = [
  ['single_chamber', /\bsingle[-\s]?chamber\b/i],
  ['two_chamber', /\b(?:two|dual)[-\s]?chamber\b/i],
  ['air_cathode', /\bair[-\s]?cathode\b/i],
  ['membrane_less', /\bmembrane[-\s]?less\b/i],
  ['tubular', /\btubular\b/i],
  ['upflow', /\bup[-\s]?flow\b/i],
  ['stacked', /\bstack(?:ed)?\b/i],
];

const MATERIAL_RULES = [
  ['carbon_felt', /\bcarbon felt\b/i],
  ['carbon_cloth', /\bcarbon cloth\b/i],
  ['graphite', /\bgraphite(?: felt| fiber| plate| rod| brush)?\b/i],
  ['activated_carbon', /\bactivated carbon\b/i],
  ['stainless_steel', /\bstainless steel\b|\bSS\s?(?:mesh|wool|plate)?\b/i],
  ['nafion', /\bNafion\b/i],
  ['cation_exchange_membrane', /\bcation exchange membrane\b|\bCEM\b/i],
  ['anion_exchange_membrane', /\banion exchange membrane\b|\bAEM\b/i],
  ['pt_c', /\bPt\/C\b|\bplatinum on carbon\b/i],
  ['platinum', /\bplatinum\b|\bPt\b/i],
  ['manganese_dioxide', /\bmanganese dioxide\b|\bMnO2\b/i],
  ['biochar', /\bbiochar\b/i],
  ['graphene', /\bgraphene\b/i],
  ['carbon_nanotube', /\bcarbon nanotubes?\b|\bCNTs?\b/i],
  ['nickel', /\bnickel\b|\bNi\b/i],
  ['titanium', /\btitanium\b|\bTi\b/i],
];

const SUBSTRATE_RULES = [
  ['domestic_wastewater', /\bdomestic wastewater\b/i],
  ['industrial_wastewater', /\bindustrial wastewater\b/i],
  ['wastewater', /\bwastewater\b/i],
  ['acetate', /\bacetate\b/i],
  ['glucose', /\bglucose\b/i],
  ['sludge', /\bsludge\b/i],
  ['urine', /\burine\b/i],
  ['leachate', /\bleachate\b/i],
];

const INOCULUM_RULES = [
  ['anaerobic_sludge', /\banaerobic sludge\b/i],
  ['activated_sludge', /\bactivated sludge\b/i],
  ['mixed_culture', /\bmixed culture\b/i],
  ['electroactive_biofilm', /\belectroactive biofilm\b|\belectrogenic biofilm\b/i],
  ['geobacter', /\bGeobacter\b/i],
  ['shewanella', /\bShewanella\b/i],
];

const SCALE_RULES = [
  ['bench', /\bbench(?:\s|-)?scale\b|\blab(?:oratory)?(?:\s|-)?scale\b/i],
  ['pilot', /\bpilot(?:\s|-)?scale\b/i],
  ['field', /\bfield(?:\s|-)?scale\b/i],
  ['full_scale', /\bfull(?:\s|-)?scale\b|\bcommercial(?:\s|-)?scale\b/i],
];

const LIMITATION_PATTERN =
  /\b(limitation|limited by|constraint|challenge|drawback|bottleneck|fouling|crossover|instability|toxicity|decline|failure|trade[-\s]?off|cost barrier|scale[-\s]?up risk)\b/i;

const METRIC_RULES = [
  {
    canonicalKey: 'power_density_w_m2',
    fieldKey: 'power_density',
    factType: 'performance_metric',
    metricType: 'power_density',
    label: 'power\\s+density|maximum\\s+power|power\\s+output',
    units: 'mW\\s*(?:\\/|per)\\s*m(?:2|\\^2|\\u00b2)|W\\s*(?:\\/|per)\\s*m(?:2|\\^2|\\u00b2)',
  },
  {
    canonicalKey: 'current_density_a_m2',
    fieldKey: 'current_density',
    factType: 'performance_metric',
    metricType: 'current_density',
    label: 'current\\s+density|current\\s+output',
    units: 'mA\\s*(?:\\/|per)\\s*cm(?:2|\\^2|\\u00b2)|A\\s*(?:\\/|per)\\s*m(?:2|\\^2|\\u00b2)',
  },
  {
    canonicalKey: 'coulombic_efficiency_pct',
    fieldKey: 'coulombic_efficiency',
    factType: 'performance_metric',
    metricType: 'coulombic_efficiency',
    label: 'coulombic\\s+efficien(?:cy|cies)|\\bCE\\b',
    units: '%|percent|pct',
  },
  {
    canonicalKey: 'cod_mg_l',
    fieldKey: 'cod',
    factType: 'operating_condition',
    metricType: 'cod',
    operatingConditionKey: 'influent_cod_mg_l',
    label: '\\bCOD\\b|chemical\\s+oxygen\\s+demand',
    units: 'mg\\s*(?:\\/|per)\\s*L|g\\s*(?:\\/|per)\\s*L',
  },
  {
    canonicalKey: 'hydraulic_retention_time_h',
    fieldKey: 'hrt',
    factType: 'operating_condition',
    metricType: 'hydraulic_retention_time',
    operatingConditionKey: 'hydraulic_retention_time_h',
    label: 'hydraulic\\s+retention\\s+time|\\bHRT\\b',
    units: 'h|hr|hrs|hour|hours|d|day|days',
  },
  {
    canonicalKey: 'conductivity_ms_cm',
    fieldKey: 'conductivity',
    factType: 'operating_condition',
    metricType: 'conductivity',
    operatingConditionKey: 'conductivity_ms_cm',
    label: 'conductivity',
    units: 'mS\\s*(?:\\/|per)\\s*cm|uS\\s*(?:\\/|per)\\s*cm|\\u00b5S\\s*(?:\\/|per)\\s*cm',
  },
  {
    canonicalKey: 'temperature_c',
    fieldKey: 'temperature',
    factType: 'operating_condition',
    metricType: 'temperature',
    operatingConditionKey: 'temperature_c',
    label: 'temperature|operat(?:ed|ing)\\s+at',
    units: '\\u00b0?C|C|\\u00b0?F|F|K',
  },
  {
    canonicalKey: 'ph',
    fieldKey: 'ph',
    factType: 'operating_condition',
    metricType: 'ph',
    operatingConditionKey: 'ph',
    label: '\\bpH\\b',
    units: '',
    unitless: true,
  },
  {
    canonicalKey: 'contaminant_removal_efficiency_pct',
    fieldKey: 'contaminant_removal_efficiency',
    factType: 'performance_metric',
    metricType: 'removal_efficiency',
    label: 'removal\\s+efficien(?:cy|cies)|COD\\s+removal|contaminant\\s+removal',
    units: '%|percent|pct',
  },
  {
    canonicalKey: 'hydrogen_production_ml_l_d',
    fieldKey: 'hydrogen_production',
    factType: 'performance_metric',
    metricType: 'hydrogen_production',
    label: 'hydrogen\\s+production|hydrogen\\s+rate|biohydrogen',
    units:
      'mL\\s*(?:\\/|per)\\s*L\\s*(?:\\/|per)\\s*d|mL\\s*L-1\\s*d-1|L\\s*(?:\\/|per)\\s*L\\s*(?:\\/|per)\\s*d',
  },
  {
    canonicalKey: 'methane_biogas_relationship',
    fieldKey: 'methane_biogas_relationship',
    factType: 'performance_metric',
    metricType: 'methane_biogas_relationship',
    label: 'methane|biogas',
    units: '%|percent|pct|mL\\s*(?:\\/|per)\\s*L\\s*(?:\\/|per)\\s*d',
  },
  {
    canonicalKey: 'energy_input_kwh_m3',
    fieldKey: 'energy_input',
    factType: 'economic_or_operating_metric',
    metricType: 'energy_input',
    label: 'energy\\s+input|energy\\s+consumption',
    units: 'kWh\\s*(?:\\/|per)\\s*m(?:3|\\^3)',
  },
  {
    canonicalKey: 'cost_indicator_usd',
    fieldKey: 'cost_indicators',
    factType: 'economic_or_operating_metric',
    metricType: 'cost_indicator',
    label: 'cost|CAPEX|OPEX',
    units: 'USD|\\$',
  },
  {
    canonicalKey: 'trl',
    fieldKey: 'trl_maturity',
    factType: 'maturity_metric',
    metricType: 'trl',
    label: '\\bTRL\\b|technology\\s+readiness\\s+level',
    units: '',
    unitless: true,
  },
];

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeKey(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function parseNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function hashText(value) {
  return createHash('sha256').update(String(value ?? '')).digest('hex');
}

function shortSnippet(text, index = 0, length = 220) {
  const start = Math.max(0, index - 80);
  return normalizeWhitespace(text.slice(start, index + length));
}

function sentenceForMatch(text, index) {
  const before = text.lastIndexOf('.', index);
  const after = text.indexOf('.', index);
  const start = before >= 0 ? before + 1 : Math.max(0, index - 160);
  const end = after >= 0 ? after + 1 : Math.min(text.length, index + 220);
  return normalizeWhitespace(text.slice(start, end));
}

function clipText(value, maxLength = 80_000) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > maxLength
    ? normalized.slice(0, maxLength)
    : normalized;
}

function dedupeSegments(segments) {
  const seen = new Set();
  const deduped = [];

  for (const segment of segments) {
    const text = clipText(segment.text);
    if (text.length < 8) {
      continue;
    }

    const key = `${segment.source}:${hashText(text)}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({
      ...segment,
      text,
      sourceTextHash: hashText(text),
    });
  }

  return deduped;
}

function collectSegments(record, options = {}) {
  const sourceRecord = record.sourceRecord ?? {};
  const segments = [
    {
      source: 'title',
      text: [record.title, sourceRecord.title].filter(Boolean).join('. '),
      locator: 'title',
      confidence: 0.62,
    },
    {
      source: 'abstract',
      text: [record.summary, sourceRecord.abstractText]
        .filter(Boolean)
        .join('. '),
      locator: 'abstract_or_summary',
      confidence: 0.72,
    },
  ];

  for (const claim of record.claims ?? []) {
    segments.push({
      source: 'claim',
      text: [claim.content, claim.sourceSnippet].filter(Boolean).join('. '),
      locator: claim.sourceLocator ?? 'claim',
      claimId: claim.id,
      confidence: Math.max(0.45, Math.min(0.88, claim.confidence ?? 0.7)),
    });
  }

  if (options.fullTextMode === 'existing') {
    for (const chunk of sourceRecord.sourceTextChunks ?? []) {
      segments.push({
        source: 'full_text_chunk',
        text: chunk.text,
        locator: chunk.sourceLocator ?? `chunk:${chunk.chunkIndex}`,
        confidence: 0.8,
      });
    }
  }

  return dedupeSegments(segments);
}

export function inferSystemType(text) {
  for (const rule of SYSTEM_TYPE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return rule.canonical;
    }
  }

  return null;
}

function inferComponent(sentence) {
  if (/\bcurrent collector\b|\binterconnect\b|\bmesh\b/i.test(sentence)) {
    return 'current_collector';
  }

  if (/\bmembrane\b|\bseparator\b|\bCEM\b|\bAEM\b|\bNafion\b/i.test(sentence)) {
    return 'membrane_separator';
  }

  if (/\bcatalyst\b|\bPt\/C\b|\bplatinum\b|\bMnO2\b/i.test(sentence)) {
    return 'catalyst';
  }

  if (/\bcathode\b/i.test(sentence)) {
    return 'cathode';
  }

  if (/\banode\b/i.test(sentence)) {
    return 'anode';
  }

  return 'material_unspecified';
}

function inferNearestComponent(text, materialIndex) {
  const componentRules = [
    ['current_collector', /\bcurrent collector\b|\binterconnect\b|\bmesh\b/gi],
    ['membrane_separator', /\bmembrane\b|\bseparator\b|\bCEM\b|\bAEM\b|\bNafion\b/gi],
    ['catalyst', /\bcatalyst\b|\bPt\/C\b|\bplatinum\b|\bMnO2\b/gi],
    ['cathode', /\bcathode\b/gi],
    ['anode', /\banode\b/gi],
  ];
  let nearest = null;

  for (const [component, pattern] of componentRules) {
    for (const match of text.matchAll(pattern)) {
      const matchIndex = match.index ?? 0;
      const distance = Math.abs(matchIndex - materialIndex);
      if (!nearest || distance < nearest.distance) {
        nearest = { component, distance };
      }
    }
  }

  return nearest?.component ?? inferComponent(text);
}

function inferComponentForMaterial(canonicalMaterial, text, materialIndex = 0) {
  if (
    canonicalMaterial === 'nafion' ||
    canonicalMaterial === 'cation_exchange_membrane' ||
    canonicalMaterial === 'anion_exchange_membrane'
  ) {
    return 'membrane_separator';
  }

  if (
    canonicalMaterial === 'pt_c' ||
    canonicalMaterial === 'platinum' ||
    canonicalMaterial === 'manganese_dioxide'
  ) {
    return 'catalyst';
  }

  return inferNearestComponent(text, materialIndex);
}

export function canonicalizeMaterial(value) {
  const text = normalizeWhitespace(value);

  for (const [canonical, pattern] of MATERIAL_RULES) {
    if (pattern.test(text)) {
      return canonical;
    }
  }

  return null;
}

function normalizeUnitToken(unit) {
  return normalizeWhitespace(unit)
    .replace(/\u00b5/g, 'u')
    .replace(/\u00b0/g, '')
    .replace(/\u00b2/g, '2')
    .replace(/\^/g, '')
    .replace(/per/gi, '/')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function normalizeScientificMeasurement({ canonicalKey, value, unit }) {
  const numericValue = parseNumber(value);
  const normalizedUnit = normalizeUnitToken(unit);

  if (numericValue === null) {
    return {
      normalizedValue: null,
      normalizedUnit: null,
      normalizationRuleId: null,
      qualityFlags: ['non_numeric_value'],
    };
  }

  switch (canonicalKey) {
    case 'power_density_w_m2':
      if (normalizedUnit === 'mw/m2') {
        return {
          normalizedValue: numericValue / 1000,
          normalizedUnit: 'W/m2',
          normalizationRuleId: 'research_metric.power_density_w_m2.mw_m2_to_w_m2',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'w/m2') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'W/m2',
          normalizationRuleId: 'research_metric.power_density_w_m2.identity',
          qualityFlags: [],
        };
      }
      break;
    case 'current_density_a_m2':
      if (normalizedUnit === 'ma/cm2') {
        return {
          normalizedValue: numericValue * 10,
          normalizedUnit: 'A/m2',
          normalizationRuleId: 'research_metric.current_density_a_m2.ma_cm2_to_a_m2',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'a/m2') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'A/m2',
          normalizationRuleId: 'research_metric.current_density_a_m2.identity',
          qualityFlags: [],
        };
      }
      break;
    case 'cod_mg_l':
      if (normalizedUnit === 'mg/l') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'mg/L',
          normalizationRuleId: 'research_metric.cod_mg_l.identity',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'g/l') {
        return {
          normalizedValue: numericValue * 1000,
          normalizedUnit: 'mg/L',
          normalizationRuleId: 'research_metric.cod_mg_l.g_l_to_mg_l',
          qualityFlags: [],
        };
      }
      break;
    case 'hydraulic_retention_time_h':
      if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(normalizedUnit)) {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'h',
          normalizationRuleId: 'research_metric.hrt_h.identity',
          qualityFlags: [],
        };
      }
      if (['d', 'day', 'days'].includes(normalizedUnit)) {
        return {
          normalizedValue: numericValue * 24,
          normalizedUnit: 'h',
          normalizationRuleId: 'research_metric.hrt_h.days_to_h',
          qualityFlags: [],
        };
      }
      break;
    case 'conductivity_ms_cm':
      if (normalizedUnit === 'ms/cm') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'mS/cm',
          normalizationRuleId: 'research_metric.conductivity_ms_cm.identity',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'us/cm') {
        return {
          normalizedValue: numericValue / 1000,
          normalizedUnit: 'mS/cm',
          normalizationRuleId: 'research_metric.conductivity_ms_cm.us_cm_to_ms_cm',
          qualityFlags: [],
        };
      }
      break;
    case 'temperature_c':
      if (normalizedUnit === 'c') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'C',
          normalizationRuleId: 'research_metric.temperature_c.identity',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'k') {
        return {
          normalizedValue: numericValue - 273.15,
          normalizedUnit: 'C',
          normalizationRuleId: 'research_metric.temperature_c.k_to_c',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'f') {
        return {
          normalizedValue: ((numericValue - 32) * 5) / 9,
          normalizedUnit: 'C',
          normalizationRuleId: 'research_metric.temperature_c.f_to_c',
          qualityFlags: [],
        };
      }
      break;
    case 'coulombic_efficiency_pct':
    case 'contaminant_removal_efficiency_pct':
      if (['%', 'percent', 'pct'].includes(normalizedUnit)) {
        return {
          normalizedValue: numericValue,
          normalizedUnit: '%',
          normalizationRuleId: `research_metric.${canonicalKey}.identity`,
          qualityFlags: [],
        };
      }
      break;
    case 'hydrogen_production_ml_l_d':
      if (normalizedUnit === 'ml/l/d' || normalizedUnit === 'mll-1d-1') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'mL/L/d',
          normalizationRuleId: 'research_metric.hydrogen_production_ml_l_d.identity',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'l/l/d') {
        return {
          normalizedValue: numericValue * 1000,
          normalizedUnit: 'mL/L/d',
          normalizationRuleId: 'research_metric.hydrogen_production_ml_l_d.l_l_d_to_ml_l_d',
          qualityFlags: [],
        };
      }
      break;
    case 'energy_input_kwh_m3':
      if (normalizedUnit === 'kwh/m3') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'kWh/m3',
          normalizationRuleId: 'research_metric.energy_input_kwh_m3.identity',
          qualityFlags: [],
        };
      }
      break;
    case 'ph':
      return {
        normalizedValue: numericValue,
        normalizedUnit: 'pH',
        normalizationRuleId: 'research_metric.ph.identity',
        qualityFlags: [],
      };
    case 'trl':
      return {
        normalizedValue: Math.round(numericValue),
        normalizedUnit: 'TRL',
        normalizationRuleId: 'research_metric.trl.identity',
        qualityFlags: numericValue < 1 || numericValue > 9 ? ['trl_out_of_range'] : [],
      };
    case 'cost_indicator_usd':
      return {
        normalizedValue: numericValue,
        normalizedUnit: 'USD',
        normalizationRuleId: 'research_metric.cost_indicator_usd.identity',
        qualityFlags: [],
      };
    case 'methane_biogas_relationship':
      if (['%', 'percent', 'pct'].includes(normalizedUnit)) {
        return {
          normalizedValue: numericValue,
          normalizedUnit: '%',
          normalizationRuleId: 'research_metric.methane_biogas_relationship.percent_identity',
          qualityFlags: [],
        };
      }
      if (normalizedUnit === 'ml/l/d') {
        return {
          normalizedValue: numericValue,
          normalizedUnit: 'mL/L/d',
          normalizationRuleId: 'research_metric.methane_biogas_relationship.ml_l_d_identity',
          qualityFlags: [],
        };
      }
      break;
    default:
      break;
  }

  return {
    normalizedValue: numericValue,
    normalizedUnit: unit ? normalizeWhitespace(unit) : null,
    normalizationRuleId: null,
    qualityFlags: ['unsupported_unit'],
  };
}

function createBaseFact({
  record,
  segment,
  factType,
  fieldKey,
  canonicalKey,
  confidence,
  systemType,
  reactorType,
  componentType,
  material,
  metricType,
  operatingConditionKey,
  evidenceQuality,
  originalValue,
  originalUnit,
  normalizedValue,
  normalizedText,
  normalizedUnit,
  normalizationRuleId,
  qualityFlags = [],
  missingFields = [],
  snippet,
  locator,
  claimId,
}) {
  const boundedConfidence = Math.max(0, Math.min(0.98, confidence));
  const flags = [...new Set(qualityFlags.filter(Boolean))];

  if (boundedConfidence < 0.55) {
    flags.push('low_confidence');
  }

  return {
    id: randomUUID(),
    sourceRecordId: record.sourceRecordId ?? record.sourceRecord?.id,
    catalogItemId: record.id,
    claimId: claimId ?? segment.claimId ?? null,
    factLayer: CANONICAL_FACT_LAYER,
    factType,
    fieldKey,
    canonicalKey,
    normalizationRuleId,
    decisionReady:
      boundedConfidence >= 0.55 &&
      !flags.includes('unsupported_unit') &&
      !flags.includes('normalization_conflict'),
    extractionSource: segment.source,
    missingFields,
    qualityFlags: flags,
    sourceTextHash: segment.sourceTextHash,
    originalValue: originalValue ?? null,
    originalUnit: originalUnit ?? null,
    normalizedValue: normalizedValue ?? null,
    normalizedText: normalizedText ?? null,
    normalizedUnit: normalizedUnit ?? null,
    uncertainty: flags.includes('low_confidence') ? 'low_confidence' : null,
    confidence: boundedConfidence,
    extractionStatus: 'canonical_extracted',
    normalizationStatus: normalizationRuleId ? 'normalized' : 'canonical_text',
    systemType: systemType ?? null,
    reactorType: reactorType ?? null,
    componentType: componentType ?? null,
    material: material ?? null,
    metricType: metricType ?? null,
    operatingConditionKey: operatingConditionKey ?? null,
    evidenceQuality: evidenceQuality ?? null,
    payload: {
      source: CANONICAL_FACT_LAYER,
      extractor_version: CANONICAL_EXTRACTOR_VERSION,
      extraction_source: segment.source,
      locator: locator ?? segment.locator,
      snippet: normalizeWhitespace(snippet ?? segment.text).slice(0, 500),
      no_fabrication: true,
    },
  };
}

function findMetricMatches(text, rule) {
  const unitGroup = rule.unitless ? '' : `\\s*(${rule.units})`;
  const after = new RegExp(
    `(?:${rule.label})[^\\d-]{0,120}${NUMBER_PATTERN}${unitGroup}`,
    'gi',
  );
  const before = rule.unitless
    ? null
    : new RegExp(
        `${NUMBER_PATTERN}\\s*(${rule.units})[^.\\n;]{0,120}(?:${rule.label})`,
        'gi',
      );
  const matches = [];

  for (const pattern of [after, before].filter(Boolean)) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1];
      const unit = rule.unitless ? '' : match[2] ?? '';
      if (value) {
        matches.push({
          value,
          unit,
          index: match.index ?? 0,
          raw: match[0],
        });
      }
    }
  }

  return matches;
}

function extractMetricFacts(record, segments, context) {
  const facts = [];
  const seen = new Set();

  for (const segment of segments) {
    for (const rule of METRIC_RULES) {
      for (const match of findMetricMatches(segment.text, rule)) {
        const normalized = normalizeScientificMeasurement({
          canonicalKey: rule.canonicalKey,
          value: match.value,
          unit: match.unit,
        });
        const normalizedValue =
          normalized.normalizedValue === null
            ? null
            : Number(normalized.normalizedValue.toFixed(6));
        const uniqueKey = [
          rule.canonicalKey,
          normalizedValue,
          normalized.normalizedUnit,
          segment.sourceTextHash,
          match.index,
        ].join('|');

        if (seen.has(uniqueKey)) {
          continue;
        }
        seen.add(uniqueKey);

        const confidenceBoost =
          normalized.normalizationRuleId && normalizedValue !== null ? 0.1 : 0;
        const confidence = Math.min(0.95, segment.confidence + confidenceBoost);
        const qualityFlags = [...normalized.qualityFlags];

        if (rule.canonicalKey === 'ph' && (normalizedValue < 0 || normalizedValue > 14)) {
          qualityFlags.push('ph_out_of_range');
        }

        facts.push(
          createBaseFact({
            record,
            segment,
            factType: rule.factType,
            fieldKey: rule.fieldKey,
            canonicalKey: rule.canonicalKey,
            confidence,
            systemType: context.systemType,
            evidenceQuality: context.evidenceQuality,
            metricType: rule.metricType,
            operatingConditionKey: rule.operatingConditionKey,
            originalValue: match.value,
            originalUnit: match.unit || null,
            normalizedValue,
            normalizedUnit: normalized.normalizedUnit,
            normalizationRuleId: normalized.normalizationRuleId,
            qualityFlags,
            snippet: sentenceForMatch(segment.text, match.index),
          }),
        );
      }
    }
  }

  return facts;
}

function extractSystemTypeFacts(record, segments, context) {
  const facts = [];
  const seen = new Set();

  for (const segment of segments) {
    for (const rule of SYSTEM_TYPE_RULES) {
      if (!rule.patterns.some((pattern) => pattern.test(segment.text))) {
        continue;
      }

      const key = `system_type:${rule.canonical}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      facts.push(
        createBaseFact({
          record,
          segment,
          factType: 'technical_field',
          fieldKey: 'system_type',
          canonicalKey: key,
          confidence: Math.min(0.9, segment.confidence + 0.08),
          systemType: rule.canonical,
          evidenceQuality: context.evidenceQuality,
          normalizedText: rule.canonical,
          normalizationRuleId: 'ontology.system_type.bioelectrochemical_v1',
          snippet: sentenceForMatch(segment.text, 0),
        }),
      );
    }
  }

  return facts;
}

function extractSimpleVocabularyFacts(record, segments, context, rules, fieldKey, canonicalPrefix) {
  const facts = [];
  const seen = new Set();

  for (const segment of segments) {
    for (const [canonical, pattern] of rules) {
      const match = pattern.exec(segment.text);
      if (!match) {
        continue;
      }

      const key = `${canonicalPrefix}:${canonical}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      facts.push(
        createBaseFact({
          record,
          segment,
          factType: 'technical_field',
          fieldKey,
          canonicalKey: key,
          confidence: Math.min(0.88, segment.confidence + 0.04),
          systemType: context.systemType,
          evidenceQuality: context.evidenceQuality,
          normalizedText: canonical,
          normalizationRuleId: `ontology.${fieldKey}.bioelectrochemical_v1`,
          snippet: sentenceForMatch(segment.text, match.index ?? 0),
        }),
      );
    }
  }

  return facts;
}

function extractMaterialFacts(record, segments, context) {
  const facts = [];
  const seen = new Set();

  for (const segment of segments) {
    for (const [canonical, pattern] of MATERIAL_RULES) {
      for (const match of segment.text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))) {
        const index = match.index ?? 0;
        const sentence = sentenceForMatch(segment.text, index);
        const componentType = inferComponentForMaterial(
          canonical,
          sentence,
          Math.max(0, index - Math.max(0, segment.text.lastIndexOf('.', index))),
        );
        const fieldKey =
          componentType === 'material_unspecified'
            ? 'material'
            : `${componentType}_material`;
        const key = `${componentType}:${canonical}:${segment.sourceTextHash}`;

        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        facts.push(
          createBaseFact({
            record,
            segment,
            factType: 'technical_field',
            fieldKey,
            canonicalKey: `material:${canonical}`,
            confidence: componentType === 'material_unspecified' ? 0.58 : 0.78,
            systemType: context.systemType,
            componentType,
            material: canonical,
            evidenceQuality: context.evidenceQuality,
            normalizedText: canonical,
            normalizationRuleId: 'ontology.material.bioelectrochemical_v1',
            qualityFlags:
              componentType === 'material_unspecified'
                ? ['component_context_missing']
                : [],
            snippet: sentence,
          }),
        );
      }
    }
  }

  return facts;
}

function extractLimitationFacts(record, segments, context) {
  const facts = [];
  const seen = new Set();

  for (const segment of segments) {
    const sentences = segment.text.split(SENTENCE_SPLIT_PATTERN);
    for (const sentence of sentences) {
      if (!LIMITATION_PATTERN.test(sentence)) {
        continue;
      }
      const normalizedSentence = normalizeWhitespace(sentence);
      const key = hashText(normalizedSentence);
      if (seen.has(key) || normalizedSentence.length < 24) {
        continue;
      }
      seen.add(key);

      const fieldKey = /failure|decline|instability|toxicity/i.test(sentence)
        ? 'failure_modes'
        : /trade[-\s]?off/i.test(sentence)
          ? 'reported_tradeoffs'
          : /constraint|limited by|bottleneck/i.test(sentence)
            ? 'operating_constraints'
            : 'reported_limitations';

      facts.push(
        createBaseFact({
          record,
          segment,
          factType: 'limitation',
          fieldKey,
          canonicalKey: `${fieldKey}:${key.slice(0, 16)}`,
          confidence: Math.min(0.82, segment.confidence + 0.02),
          systemType: context.systemType,
          evidenceQuality: context.evidenceQuality,
          normalizedText: normalizedSentence,
          normalizationRuleId: `ontology.${fieldKey}.text_v1`,
          snippet: normalizedSentence,
        }),
      );
    }
  }

  return facts;
}

function computeMissingFields(facts) {
  const present = new Set();

  for (const fact of facts) {
    present.add(fact.fieldKey);
    if (fact.fieldKey.endsWith('_material')) {
      present.add(fact.fieldKey);
    }
    if (fact.componentType === 'anode') {
      present.add('anode_material');
    }
    if (fact.componentType === 'cathode') {
      present.add('cathode_material');
    }
    if (fact.componentType === 'membrane_separator') {
      present.add('membrane_separator');
    }
    if (fact.componentType === 'catalyst') {
      present.add('catalyst');
    }
    if (fact.componentType === 'current_collector') {
      present.add('current_collector');
    }
    if (fact.metricType === 'removal_efficiency') {
      present.add('contaminant_removal_efficiency');
    }
    if (fact.metricType === 'hydraulic_retention_time') {
      present.add('hrt');
    }
    if (fact.metricType === 'trl') {
      present.add('trl_maturity');
    }
  }

  return REQUIRED_CANONICAL_FIELDS.filter((field) => !present.has(field));
}

function attachMissingFields(facts, missingFields) {
  return facts.map((fact) => ({
    ...fact,
    missingFields,
    qualityFlags:
      missingFields.length > 0
        ? [...new Set([...fact.qualityFlags, 'missing_required_fields'])]
        : fact.qualityFlags,
  }));
}

function hasFullTextPotential(record) {
  const sourceRecord = record.sourceRecord ?? {};
  return Boolean(
    sourceRecord.pdfUrl ||
      sourceRecord.xmlUrl ||
      sourceRecord.sourceUrl ||
      (sourceRecord.rawPayload &&
        typeof sourceRecord.rawPayload === 'object' &&
        Object.keys(sourceRecord.rawPayload).length > 0),
  );
}

export function canonicalizeScientificEvidenceRecord(record, options = {}) {
  try {
    const segments = collectSegments(record, options);
    const joinedText = segments.map((segment) => segment.text).join(' ');
    const evidenceQuality = record.evidenceQuality ?? 'unreviewed';
    const systemType = inferSystemType(joinedText);
    const context = { evidenceQuality, systemType };
    let facts = [
      ...extractSystemTypeFacts(record, segments, context),
      ...extractSimpleVocabularyFacts(
        record,
        segments,
        context,
        REACTOR_RULES,
        'reactor_type',
        'reactor_type',
      ),
      ...extractMaterialFacts(record, segments, context),
      ...extractSimpleVocabularyFacts(
        record,
        segments,
        context,
        SUBSTRATE_RULES,
        'substrate_wastewater_type',
        'substrate',
      ),
      ...extractSimpleVocabularyFacts(
        record,
        segments,
        context,
        INOCULUM_RULES,
        'inoculum_biology',
        'inoculum',
      ),
      ...extractSimpleVocabularyFacts(
        record,
        segments,
        context,
        SCALE_RULES,
        'scale',
        'scale',
      ),
      ...extractMetricFacts(record, segments, context),
      ...extractLimitationFacts(record, segments, context),
    ];

    const missingFields = computeMissingFields(facts);
    facts = attachMissingFields(facts, missingFields);

    const decisionReadyFacts = facts.filter((fact) => fact.decisionReady);
    const benchmarkReadyFacts = decisionReadyFacts.filter(
      (fact) =>
        typeof fact.normalizedValue === 'number' ||
        Boolean(fact.metricType) ||
        Boolean(fact.material),
    );
    const unsupportedUnits = facts.filter((fact) =>
      fact.qualityFlags.includes('unsupported_unit'),
    ).length;

    let status = CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED;
    if (facts.length === 0) {
      status = hasFullTextPotential(record)
        ? CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT
        : CANONICALIZATION_STATUSES.INSUFFICIENT_SOURCE;
    } else if (unsupportedUnits > 0 && benchmarkReadyFacts.length === 0) {
      status = CANONICALIZATION_STATUSES.NEEDS_REVIEW;
    }

    return {
      status,
      facts,
      missingFields,
      decisionReadyFacts: decisionReadyFacts.length,
      benchmarkReadyFacts: benchmarkReadyFacts.length,
      qualityFlags: [
        ...new Set(facts.flatMap((fact) => fact.qualityFlags ?? [])),
      ],
      extractorVersion: CANONICAL_EXTRACTOR_VERSION,
      sourceTextHashes: [...new Set(segments.map((segment) => segment.sourceTextHash))],
      usedSegments: segments.length,
    };
  } catch (error) {
    return {
      status: CANONICALIZATION_STATUSES.EXTRACTION_FAILED,
      facts: [],
      missingFields: REQUIRED_CANONICAL_FIELDS,
      decisionReadyFacts: 0,
      benchmarkReadyFacts: 0,
      qualityFlags: ['extraction_exception'],
      extractorVersion: CANONICAL_EXTRACTOR_VERSION,
      sourceTextHashes: [],
      usedSegments: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
