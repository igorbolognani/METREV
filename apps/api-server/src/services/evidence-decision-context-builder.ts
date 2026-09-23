import { randomUUID } from 'node:crypto';

import type { EvidenceBenchmarkSlice } from '@metrev/database';
import {
  evidenceDecisionContextSchema,
  loadEvidenceQualityAuditPolicy,
  type DerivedObservation,
  type EvidenceDecisionContext,
  type NormalizedCaseInput,
  type PrimaryObjective,
  primaryObjectiveSchema,
} from '@metrev/domain-contracts';

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function activePrimaryObjective(value: string): PrimaryObjective {
  const parsed = primaryObjectiveSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return value === 'sensing' ? 'biosensing' : 'wastewater_treatment';
}

function normalizeToken(value: string | null | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function hasDecisionReadyQuality(value: string | null | undefined): boolean {
  return normalizeToken(value) !== 'low';
}

function hasRequiredText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

type BenchmarkEvidence = EvidenceBenchmarkSlice['evidence'][number];

function evidenceAdmissionFailures(record: BenchmarkEvidence): string[] {
  return dedupeStrings([
    normalizeToken(record.review_status) === 'accepted'
      ? ''
      : 'catalog review is not accepted',
    normalizeToken(record.source_state) === 'reviewed'
      ? ''
      : 'catalog source state is not reviewed',
    normalizeToken(record.access_status) === 'closed'
      ? 'source access is closed'
      : '',
    normalizeToken(record.access_status) === 'unknown' &&
    !hasRequiredText(record.source_license)
      ? 'source license or access policy is missing'
      : '',
    hasRequiredText(record.canonical_key) ? '' : 'canonical key is missing',
    typeof record.normalized_value === 'number' &&
    Number.isFinite(record.normalized_value)
      ? ''
      : 'normalized value is missing',
    hasRequiredText(record.normalized_unit) ? '' : 'normalized unit is missing',
    hasRequiredText(record.source_text_hash)
      ? ''
      : 'source text hash is missing',
    hasRequiredText(record.source_locator) ? '' : 'source locator is missing',
    hasDecisionReadyQuality(record.evidence_quality)
      ? ''
      : 'evidence quality is low',
  ]).filter(Boolean);
}

function isAdmissibleEvidence(record: BenchmarkEvidence): boolean {
  return evidenceAdmissionFailures(record).length === 0;
}

function isAdmissibleBenchmarkRange(
  record: EvidenceBenchmarkSlice['aggregates'][number],
): boolean {
  return (
    record.record_count > 0 &&
    typeof record.median_value === 'number' &&
    Number.isFinite(record.median_value) &&
    hasRequiredText(record.canonical_key) &&
    hasRequiredText(record.metric_type) &&
    hasRequiredText(record.normalized_unit) &&
    hasDecisionReadyQuality(record.evidence_quality)
  );
}

export class EvidenceDecisionContextBuilder {
  systemTypeForTechnologyFamily(value: string): string {
    switch (value) {
      case 'microbial_fuel_cell':
        return 'MFC';
      case 'microbial_electrolysis_cell':
        return 'MEC';
      case 'electrochemical_biosensor':
        return 'BIOSENSOR';
      default:
        return 'UNCLASSIFIED';
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

  metricTypesForObjective(value: string, systemType?: string): string[] {
    const normalizedObjective = value === 'sensing' ? 'biosensing' : value;
    const resolvedSystemType = systemType ?? 'UNCLASSIFIED';
    const policy = loadEvidenceQualityAuditPolicy();
    const primary =
      policy.primary_metrics_by_objective[normalizedObjective]?.[
        resolvedSystemType
      ] ?? [];
    const secondary =
      policy.secondary_metrics_by_system[resolvedSystemType] ?? [];

    return [...new Set([...primary, ...secondary])];
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
        activePrimaryObjective(normalizedCase.primary_objective),
        this.systemTypeForTechnologyFamily(normalizedCase.technology_family),
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
    const primaryObjective = activePrimaryObjective(
      input.normalizedCase.primary_objective,
    );
    const benchmarkRanges = input.benchmarkSlice.aggregates.filter(
      isAdmissibleBenchmarkRange,
    );
    const matchedEvidence =
      input.benchmarkSlice.evidence.filter(isAdmissibleEvidence);
    const rejectedEvidence = input.benchmarkSlice.evidence.filter(
      (record) => !isAdmissibleEvidence(record),
    );
    const sourceRefs = dedupeStrings(
      matchedEvidence.map((record) => `catalog:${record.catalog_item_id}`),
    );
    const exclusionReasons = dedupeStrings([
      ...(rejectedEvidence.length > 0
        ? rejectedEvidence.flatMap(evidenceAdmissionFailures)
        : []),
      'Pending, rejected, supplier-only, closed-access, low-trace, low-quality, or non-normalized evidence was excluded from this decision context.',
    ]);
    const missingDependencies = dedupeStrings([
      ...(benchmarkRanges.length > 0
        ? []
        : ['canonical decision-ready benchmark aggregates']),
      ...(matchedEvidence.length > 0
        ? []
        : ['accepted decision-ready evidence records']),
    ]);

    return {
      case_id: input.normalizedCase.case_id,
      technology_family: input.normalizedCase.technology_family,
      system_type: systemType,
      primary_objective: primaryObjective,
      query: {
        system_type: systemType,
        application: primaryObjective,
        component_types: input.componentTypes,
        materials: input.materials,
        metric_types: input.metricTypes,
        limit: input.benchmarkSlice.summary.limited_to,
        decision_ready_only: true,
      },
      benchmark_ranges: benchmarkRanges,
      matched_evidence: matchedEvidence,
      material_comparisons: [],
      operating_window_signals: [],
      failure_mode_signals: [],
      cost_signals: [],
      supplier_signals: [],
      regulatory_social_signals: [],
      uncertainty_summary: {
        confidence_level:
          benchmarkRanges.length > 0 && matchedEvidence.length > 0
            ? 'medium'
            : 'low',
        summary:
          benchmarkRanges.length > 0
            ? `Retrieved ${benchmarkRanges.length} admissible decision-ready benchmark aggregate range(s) and ${matchedEvidence.length} accepted traceable evidence record(s) for this case.`
            : 'No decision-ready benchmark aggregates matched the current case filters.',
        missing_dependencies: missingDependencies,
        excluded_evidence_reasons: exclusionReasons,
      },
      excluded_evidence_summary: [
        {
          key: 'non_decision_ready_evidence_excluded',
          label: 'Excluded non-decision-ready evidence',
          summary:
            rejectedEvidence.length > 0
              ? `${rejectedEvidence.length} benchmark evidence record(s) failed admission checks and were excluded before scoring.`
              : 'Pending, rejected, supplier-only, low-trace, low-quality, closed-access, or non-normalized evidence was excluded before scoring.',
          evidence_refs: rejectedEvidence.map(
            (record) => `catalog:${record.catalog_item_id}`,
          ),
        },
      ],
      provenance_note:
        'EvidenceDecisionContext was built from admissible decision-ready benchmark aggregates and accepted, reviewed, traceable catalog evidence only; the full corpus was not loaded or sent to the LLM.',
      source_refs: sourceRefs,
      builder_version: 'evidence_decision_context_builder.v1',
    };
  }
}
