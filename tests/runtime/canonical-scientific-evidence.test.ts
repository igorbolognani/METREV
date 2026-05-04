import { describe, expect, it } from 'vitest';

import {
  CANONICAL_FACT_LAYER,
  CANONICALIZATION_STATUSES,
  canonicalizeScientificEvidenceRecord,
  normalizeScientificMeasurement,
} from '../../packages/database/scripts/canonical-scientific-evidence.mjs';

function buildRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'catalog-canonical-test-001',
    sourceRecordId: 'source-canonical-test-001',
    title:
      'Microbial fuel cell benchmark with carbon felt anode and Nafion membrane',
    summary:
      'Single chamber MFC operation used a carbon felt anode, Pt/C catalyst, and stainless steel current collector.',
    evidenceQuality: 'high',
    sourceRecord: {
      id: 'source-canonical-test-001',
      title: 'MFC power density and hydrogen operation',
      abstractText:
        'The microbial fuel cell treated domestic wastewater at pH 7.2, temperature 95 F, conductivity 2500 uS/cm, COD of 1.2 g/L, and HRT 2 days. Power density reached 1200 mW/m2, current density was 2.5 mA/cm2, CE was 72%, hydrogen production reached 0.4 L/L/d, and COD removal efficiency was 84%. Membrane fouling remained the main limitation and scale-up risk.',
      publicationYear: 2025,
      sourceUrl: 'https://example.org/mfc-canonical',
      sourceTextChunks: [
        {
          id: 'chunk-001',
          chunkIndex: 0,
          sourceLocator: 'p1',
          text: 'A two-chamber bioelectrochemical system included an air-cathode reactor and mixed culture inoculum fed with acetate wastewater. TRL 4 was reported.',
        },
      ],
    },
    claims: [
      {
        id: 'claim-001',
        claimType: 'METRIC',
        content: 'Power density reached 1200 mW/m2.',
        confidence: 0.8,
        sourceSnippet: 'Power density reached 1200 mW/m2.',
        sourceLocator: 'abstract',
      },
    ],
    ...overrides,
  };
}

describe('canonical scientific evidence extractor', () => {
  it('extracts canonical system, materials, operating conditions, metrics, and limitations without placeholders', () => {
    const result = canonicalizeScientificEvidenceRecord(buildRecord(), {
      fullTextMode: 'existing',
      llmMode: 'disabled',
    });

    expect(result.status).toBe(
      CANONICALIZATION_STATUSES.CANONICAL_EXTRACTED,
    );
    expect(result.facts.length).toBeGreaterThan(10);
    expect(result.facts.every((fact) => fact.factLayer === CANONICAL_FACT_LAYER))
      .toBe(true);

    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldKey: 'system_type',
          normalizedText: 'MFC',
          decisionReady: true,
        }),
        expect.objectContaining({
          componentType: 'anode',
          material: 'carbon_felt',
          decisionReady: true,
        }),
        expect.objectContaining({
          componentType: 'membrane_separator',
          material: 'nafion',
          decisionReady: true,
        }),
        expect.objectContaining({
          componentType: 'catalyst',
          material: 'pt_c',
          decisionReady: true,
        }),
        expect.objectContaining({
          fieldKey: 'power_density',
          normalizedValue: 1.2,
          normalizedUnit: 'W/m2',
          decisionReady: true,
        }),
        expect.objectContaining({
          fieldKey: 'current_density',
          normalizedValue: 25,
          normalizedUnit: 'A/m2',
          decisionReady: true,
        }),
        expect.objectContaining({
          fieldKey: 'hrt',
          normalizedValue: 48,
          normalizedUnit: 'h',
          decisionReady: true,
        }),
        expect.objectContaining({
          fieldKey: 'reported_limitations',
          normalizedText: expect.stringContaining('fouling'),
        }),
      ]),
    );
  });

  it('normalizes required scientific units and preserves rule ids', () => {
    expect(
      normalizeScientificMeasurement({
        canonicalKey: 'conductivity_ms_cm',
        value: '2500',
        unit: 'uS/cm',
      }),
    ).toMatchObject({
      normalizedValue: 2.5,
      normalizedUnit: 'mS/cm',
      normalizationRuleId:
        'research_metric.conductivity_ms_cm.us_cm_to_ms_cm',
    });
    expect(
      normalizeScientificMeasurement({
        canonicalKey: 'temperature_c',
        value: '95',
        unit: 'F',
      }).normalizedValue,
    ).toBeCloseTo(35, 4);
    expect(
      normalizeScientificMeasurement({
        canonicalKey: 'cod_mg_l',
        value: '1.2',
        unit: 'g/L',
      }),
    ).toMatchObject({
      normalizedValue: 1200,
      normalizedUnit: 'mg/L',
    });
  });

  it('does not fabricate facts when title, abstract, claims, and local chunks lack technical detail', () => {
    const result = canonicalizeScientificEvidenceRecord(
      buildRecord({
        title: 'Editorial note on research collaboration',
        summary: 'This article discusses collaboration trends.',
        sourceRecord: {
          id: 'source-empty',
          title: 'Editorial note',
          abstractText: '',
          publicationYear: 2025,
          sourceUrl: 'https://example.org/editorial',
          sourceTextChunks: [],
        },
        claims: [],
      }),
      {
        fullTextMode: 'existing',
        llmMode: 'disabled',
      },
    );

    expect(result.facts).toHaveLength(0);
    expect(result.status).toBe(CANONICALIZATION_STATUSES.NEEDS_FULL_TEXT);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });
});
