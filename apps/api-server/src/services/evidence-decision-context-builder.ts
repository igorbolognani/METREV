import { randomUUID } from 'node:crypto';

import type { EvidenceBenchmarkSlice } from '@metrev/database';
import {
    evidenceDecisionContextSchema,
    type DerivedObservation,
    type EvidenceDecisionContext,
    type NormalizedCaseInput,
} from '@metrev/domain-contracts';

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export class EvidenceDecisionContextBuilder {
  systemTypeForTechnologyFamily(value: string): string {
    switch (value) {
      case 'microbial_fuel_cell':
        return 'MFC';
      case 'microbial_electrolysis_cell':
        return 'MEC';
      default:
        return 'MET';
    }
  }

  canonicalMaterialToken(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    if (normalized.includes('carbon_felt')) {
      return 'carbon_felt';
    }
    if (normalized.includes('carbon_cloth')) {
      return 'carbon_cloth';
    }
    if (normalized.includes('activated_carbon')) {
      return 'activated_carbon';
    }
    if (normalized.includes('graphite')) {
      return 'graphite';
    }
    if (normalized.includes('nafion')) {
      return 'nafion';
    }
    if (normalized.includes('stainless_steel')) {
      return 'stainless_steel';
    }

    return [
      'unknown',
      'needs_classification',
      'present',
      'absent',
      'none',
      'not_stated',
    ].includes(normalized)
      ? null
      : normalized;
  }

  metricTypesForObjective(value: string): string[] {
    switch (value) {
      case 'hydrogen_recovery':
        return ['hydrogen_production', 'current_density', 'energy_input'];
      case 'biogas_synergy':
        return ['methane_biogas_relationship', 'removal_efficiency'];
      case 'nitrogen_recovery':
        return ['removal_efficiency', 'current_density'];
      case 'low_power_generation':
        return ['power_density', 'current_density'];
      default:
        return ['removal_efficiency', 'power_density', 'current_density'];
    }
  }

  deriveStackFilters(normalizedCase: NormalizedCaseInput): {
    componentTypes: string[];
    materials: string[];
    metricTypes: string[];
    systemType: string;
  } {
    const stackBlocks = normalizedCase.stack_blocks as Record<
      string,
      Record<string, unknown>
    >;
    const anodeMaterial = this.canonicalMaterialToken(
      stackBlocks.anode_biofilm_support?.material_family,
    );
    const cathodeMaterial = this.canonicalMaterialToken(
      stackBlocks.cathode_catalyst_support?.catalyst_family ??
        stackBlocks.cathode_catalyst_support?.material_family,
    );
    const membraneMaterial = this.canonicalMaterialToken(
      stackBlocks.membrane_or_separator?.type,
    );

    return {
      componentTypes: dedupeStrings([
        ...(anodeMaterial ? ['anode'] : []),
        ...(cathodeMaterial ? ['cathode', 'catalyst'] : []),
        ...(membraneMaterial ? ['membrane_separator'] : []),
      ]),
      materials: dedupeStrings(
        [anodeMaterial, cathodeMaterial, membraneMaterial].filter(
          (value): value is string => Boolean(value),
        ),
      ),
      metricTypes: this.metricTypesForObjective(
        normalizedCase.primary_objective,
      ),
      systemType: this.systemTypeForTechnologyFamily(
        normalizedCase.technology_family,
      ),
    };
  }

  buildObservation(input: {
    aggregateCount: number;
    evidenceCount: number;
  }): DerivedObservation {
    return {
      observation_id: `evidence-benchmark-slice-${randomUUID()}`,
      key: 'evidence_benchmark_slice_count',
      label: 'Decision evidence benchmark slice',
      value: input.aggregateCount,
      unit: null,
      source_kind: 'measured',
      confidence_level: input.aggregateCount > 0 ? 'medium' : 'low',
      decision_relevance: 'informational',
      provenance_note: `Database benchmark retrieval returned ${input.aggregateCount} aggregate range(s) and ${input.evidenceCount} top evidence record(s); the full corpus was not loaded or sent to the LLM.`,
      assumptions: [],
      missing_dependencies:
        input.aggregateCount > 0
          ? []
          : ['canonical decision-ready benchmark aggregates'],
    };
  }

  build(input: {
    benchmarkSlice: EvidenceBenchmarkSlice;
    componentTypes: string[];
    materials: string[];
    metricTypes: string[];
    normalizedCase: NormalizedCaseInput;
    systemType: string;
  }): EvidenceDecisionContext {
    const systemType = evidenceDecisionContextSchema.shape.system_type.parse(
      input.systemType,
    );
    const sourceRefs = dedupeStrings(
      input.benchmarkSlice.evidence.map(
        (record) => `catalog:${record.catalog_item_id}`,
      ),
    );
    const missingDependencies = dedupeStrings([
      ...(input.benchmarkSlice.summary.aggregate_count > 0
        ? []
        : ['canonical decision-ready benchmark aggregates']),
      ...(input.benchmarkSlice.summary.evidence_count > 0
        ? []
        : ['accepted decision-ready evidence records']),
    ]);

    return {
      case_id: input.normalizedCase.case_id,
      technology_family: input.normalizedCase.technology_family,
      system_type: systemType,
      primary_objective: input.normalizedCase.primary_objective,
      query: {
        system_type: systemType,
        application: input.normalizedCase.primary_objective,
        component_types: input.componentTypes,
        materials: input.materials,
        metric_types: input.metricTypes,
        limit: input.benchmarkSlice.summary.limited_to,
        decision_ready_only: true,
      },
      benchmark_ranges: input.benchmarkSlice.aggregates,
      matched_evidence: input.benchmarkSlice.evidence,
      material_comparisons: [],
      operating_window_signals: [],
      failure_mode_signals: [],
      cost_signals: [],
      supplier_signals: [],
      regulatory_social_signals: [],
      uncertainty_summary: {
        confidence_level:
          input.benchmarkSlice.summary.aggregate_count > 0 ? 'medium' : 'low',
        summary:
          input.benchmarkSlice.summary.aggregate_count > 0
            ? `Retrieved ${input.benchmarkSlice.summary.aggregate_count} decision-ready benchmark aggregate range(s) and ${input.benchmarkSlice.summary.evidence_count} top evidence record(s) for this case.`
            : 'No decision-ready benchmark aggregates matched the current case filters.',
        missing_dependencies: missingDependencies,
        excluded_evidence_reasons: [
          'Pending, rejected, supplier-only, or non-decision-ready evidence was excluded from this decision context.',
        ],
      },
      excluded_evidence_summary: [
        {
          key: 'non_decision_ready_evidence_excluded',
          label: 'Excluded non-decision-ready evidence',
          summary:
            'Pending, rejected, supplier-only, low-trace, or non-normalized evidence was excluded before scoring.',
          evidence_refs: [],
        },
      ],
      provenance_note:
        'EvidenceDecisionContext was built from decision-ready benchmark aggregates and accepted catalog evidence only; the full corpus was not loaded or sent to the LLM.',
      source_refs: sourceRefs,
      builder_version: 'evidence_decision_context_builder.v1',
    };
  }
}
