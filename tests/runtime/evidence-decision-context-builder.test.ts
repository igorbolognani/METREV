import fixture from '../fixtures/raw-case-input.json';

import { describe, expect, it } from 'vitest';

import type { EvidenceBenchmarkSlice } from '@metrev/database';
import {
  normalizeCaseInput,
  rawCaseInputSchema,
} from '@metrev/domain-contracts';
import { EvidenceDecisionContextBuilder } from '../../apps/api-server/src/services/evidence-decision-context-builder';

function buildNormalizedCase(input: Record<string, unknown> = {}) {
  return normalizeCaseInput(
    rawCaseInputSchema.parse({
      ...fixture,
      ...input,
    }),
  );
}

function buildBenchmarkSlice(): EvidenceBenchmarkSlice {
  return {
    aggregates: [
      {
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_unit: 'W/m2',
        system_type: 'MFC',
        application: 'wastewater_treatment',
        component_type: 'anode',
        material: 'carbon_felt',
        publication_year: 2026,
        evidence_quality: 'high',
        record_count: 4,
        min_value: 0.8,
        p25_value: 0.9,
        median_value: 1,
        p75_value: 1.1,
        p90_value: 1.2,
        max_value: 1.3,
        mean_value: 1,
        confidence_coverage: 0.9,
      },
      {
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_unit: 'W/m2',
        system_type: 'MFC',
        application: 'wastewater_treatment',
        component_type: 'anode',
        material: 'carbon_cloth',
        publication_year: 2026,
        evidence_quality: 'low',
        record_count: 6,
        min_value: 1.2,
        p25_value: 1.3,
        median_value: 1.5,
        p75_value: 1.6,
        p90_value: 1.7,
        max_value: 1.8,
        mean_value: 1.5,
        confidence_coverage: 0.4,
      },
    ],
    evidence: [
      {
        catalog_item_id: 'accepted-traceable-001',
        source_record_id: 'source-accepted-traceable-001',
        title: 'Accepted traceable benchmark evidence',
        review_status: 'accepted',
        source_state: 'reviewed',
        access_status: 'green',
        doi: '10.5555/accepted-traceable',
        source_url: 'https://example.test/accepted-traceable',
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_value: 1,
        normalized_unit: 'W/m2',
        material: 'carbon_felt',
        component_type: 'anode',
        evidence_quality: 'high',
        confidence: 0.86,
        source_text_hash: 'hash-accepted-traceable-001',
        source_locator: 'page:4:table:2',
        publication_year: 2026,
      },
      {
        catalog_item_id: 'pending-untraceable-001',
        source_record_id: 'source-pending-untraceable-001',
        title: 'Pending evidence without locator',
        review_status: 'pending',
        source_state: 'parsed',
        access_status: 'closed',
        doi: null,
        source_url: null,
        canonical_key: 'power_density_w_m2',
        metric_type: 'power_density',
        normalized_value: 1.4,
        normalized_unit: 'W/m2',
        material: 'carbon_cloth',
        component_type: 'anode',
        evidence_quality: 'low',
        confidence: 0.31,
        source_text_hash: null,
        source_locator: null,
        publication_year: 2026,
      },
    ],
    summary: {
      aggregate_count: 2,
      evidence_count: 2,
      limited_to: 12,
    },
  };
}

describe('EvidenceDecisionContextBuilder', () => {
  it('keeps only accepted, reviewed, traceable benchmark evidence in an MFC context', () => {
    const builder = new EvidenceDecisionContextBuilder();
    const normalizedCase = buildNormalizedCase({
      case_id: 'CASE-BUILDER-MFC-001',
    });
    const filters = builder.deriveStackFilters(normalizedCase);
    const context = builder.build({
      benchmarkSlice: buildBenchmarkSlice(),
      componentTypes: filters.componentTypes,
      materials: filters.materials,
      metricTypes: filters.metricTypes,
      normalizedCase,
      systemType: filters.systemType,
    });

    expect(context.system_type).toBe('MFC');
    expect(context.benchmark_ranges).toHaveLength(1);
    expect(context.matched_evidence).toEqual([
      expect.objectContaining({
        catalog_item_id: 'accepted-traceable-001',
        review_status: 'accepted',
        source_state: 'reviewed',
        source_text_hash: 'hash-accepted-traceable-001',
        source_locator: 'page:4:table:2',
      }),
    ]);
    expect(context.source_refs).toEqual(['catalog:accepted-traceable-001']);
    expect(context.excluded_evidence_summary[0]).toEqual(
      expect.objectContaining({
        evidence_refs: ['catalog:pending-untraceable-001'],
      }),
    );
    expect(context.uncertainty_summary.excluded_evidence_reasons).toEqual(
      expect.arrayContaining([
        'catalog review is not accepted',
        'catalog source state is not reviewed',
        'source access is closed',
        'source text hash is missing',
        'source locator is missing',
        'evidence quality is low',
      ]),
    );
  });

  it('derives MEC evidence filters for hydrogen recovery cases', () => {
    const builder = new EvidenceDecisionContextBuilder();
    const normalizedCase = buildNormalizedCase({
      case_id: 'CASE-BUILDER-MEC-001',
      technology_family: 'microbial_electrolysis_cell',
      primary_objective: 'hydrogen_recovery',
    });
    const filters = builder.deriveStackFilters(normalizedCase);

    expect(filters.systemType).toBe('MEC');
    expect(filters.metricTypes).toEqual([
      'hydrogen_production',
      'current_density',
      'energy_input',
    ]);
  });
});
