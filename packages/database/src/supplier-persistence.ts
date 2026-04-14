import type { EvaluationResponse } from '@metrev/domain-contracts';

export type SupplierPreferenceType = 'CURRENT' | 'PREFERRED' | 'EXCLUDED';
export type SupplierSourceState = 'NORMALIZED' | 'REVIEWED';

export interface SupplierRecordInput {
  normalizedName: string;
  displayName: string;
  category: string | null;
  region: string | null;
  metadata: {
    observed_categories: string[];
    source_labels: string[];
  };
}

export interface CaseSupplierPreferenceInput {
  supplierNormalizedName: string | null;
  supplierLabel: string;
  preferenceType: SupplierPreferenceType;
  note: string | null;
  sourceState: SupplierSourceState;
}

export interface SupplierShortlistItemInput {
  supplierNormalizedName: string | null;
  candidateLabel: string;
  category: string;
  fitNote: string;
  missingInformation: string[];
  reviewStatus: SupplierSourceState;
}

export interface EvidenceSupplierLinkInput {
  evidenceId: string;
  supplierNormalizedName: string | null;
}

export interface SupplierPersistencePlan {
  suppliers: SupplierRecordInput[];
  casePreferences: CaseSupplierPreferenceInput[];
  shortlistItems: SupplierShortlistItemInput[];
  evidenceLinks: EvidenceSupplierLinkInput[];
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function normalizeSupplierLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function toSupplierRecord(
  label: string | null | undefined,
  options: { allowDescriptive: boolean; category?: string | null },
): SupplierRecordInput | null {
  if (!label?.trim()) {
    return null;
  }

  const displayName = label.trim();
  const normalizedDisplayName = displayName.toLowerCase();
  const looksDescriptive =
    displayName.includes(',') ||
    normalizedDisplayName.includes('shortlist') ||
    normalizedDisplayName.includes('package');

  if (!options.allowDescriptive && looksDescriptive) {
    return null;
  }

  return {
    normalizedName: normalizeSupplierLabel(displayName),
    displayName,
    category: options.category ?? null,
    region: null,
    metadata: {
      observed_categories: options.category ? [options.category] : [],
      source_labels: [displayName],
    },
  };
}

function mergeSupplierRecords(
  records: SupplierRecordInput[],
): SupplierRecordInput[] {
  const merged = new Map<string, SupplierRecordInput>();

  for (const record of records) {
    const existing = merged.get(record.normalizedName);

    if (!existing) {
      merged.set(record.normalizedName, record);
      continue;
    }

    merged.set(record.normalizedName, {
      normalizedName: record.normalizedName,
      displayName: existing.displayName,
      category: existing.category ?? record.category,
      region: existing.region ?? record.region,
      metadata: {
        observed_categories: dedupeStrings([
          ...existing.metadata.observed_categories,
          ...record.metadata.observed_categories,
        ]),
        source_labels: dedupeStrings([
          ...existing.metadata.source_labels,
          ...record.metadata.source_labels,
        ]),
      },
    });
  }

  return [...merged.values()];
}

function buildCasePreferences(
  evaluation: EvaluationResponse,
): CaseSupplierPreferenceInput[] {
  const supplierContext =
    evaluation.normalized_case.cross_cutting_layers.risk_and_maturity
      .supplier_context;
  const note = supplierContext.supplier_preference_notes ?? null;
  const entries = [
    ...supplierContext.current_suppliers.map((supplierLabel) => ({
      supplierLabel,
      preferenceType: 'CURRENT' as const,
    })),
    ...supplierContext.preferred_suppliers.map((supplierLabel) => ({
      supplierLabel,
      preferenceType: 'PREFERRED' as const,
    })),
    ...supplierContext.excluded_suppliers.map((supplierLabel) => ({
      supplierLabel,
      preferenceType: 'EXCLUDED' as const,
    })),
  ];

  const uniqueEntries = new Map<string, CaseSupplierPreferenceInput>();

  for (const entry of entries) {
    const supplierRecord = toSupplierRecord(entry.supplierLabel, {
      allowDescriptive: true,
    });
    const key = `${entry.preferenceType}:${entry.supplierLabel.trim()}`;

    uniqueEntries.set(key, {
      supplierNormalizedName: supplierRecord?.normalizedName ?? null,
      supplierLabel: entry.supplierLabel.trim(),
      preferenceType: entry.preferenceType,
      note,
      sourceState: 'NORMALIZED',
    });
  }

  return [...uniqueEntries.values()];
}

function buildShortlistItems(
  evaluation: EvaluationResponse,
): SupplierShortlistItemInput[] {
  return evaluation.decision_output.supplier_shortlist.map((entry) => {
    const supplierRecord = toSupplierRecord(entry.candidate_path, {
      allowDescriptive: false,
      category: entry.category,
    });

    return {
      supplierNormalizedName: supplierRecord?.normalizedName ?? null,
      candidateLabel: entry.candidate_path,
      category: entry.category,
      fitNote: entry.fit_note,
      missingInformation: entry.missing_information_before_commitment,
      reviewStatus: 'REVIEWED',
    };
  });
}

function buildEvidenceLinks(
  evaluation: EvaluationResponse,
): EvidenceSupplierLinkInput[] {
  return evaluation.audit_record.typed_evidence.map((evidenceRecord) => {
    const supplierRecord = toSupplierRecord(evidenceRecord.supplier_name, {
      allowDescriptive: false,
    });

    return {
      evidenceId: evidenceRecord.evidence_id,
      supplierNormalizedName: supplierRecord?.normalizedName ?? null,
    };
  });
}

export function deriveSupplierPersistencePlan(
  evaluation: EvaluationResponse,
): SupplierPersistencePlan {
  const casePreferences = buildCasePreferences(evaluation);
  const shortlistItems = buildShortlistItems(evaluation);
  const evidenceLinks = buildEvidenceLinks(evaluation);

  const supplierRecords = mergeSupplierRecords([
    ...casePreferences.flatMap((entry) =>
      entry.supplierNormalizedName
        ? [
            toSupplierRecord(entry.supplierLabel, {
              allowDescriptive: true,
            })!,
          ]
        : [],
    ),
    ...shortlistItems.flatMap((entry) =>
      entry.supplierNormalizedName
        ? [
            toSupplierRecord(entry.candidateLabel, {
              allowDescriptive: false,
              category: entry.category,
            })!,
          ]
        : [],
    ),
    ...evaluation.audit_record.typed_evidence.flatMap((evidenceRecord) => {
      const supplierRecord = toSupplierRecord(evidenceRecord.supplier_name, {
        allowDescriptive: false,
      });
      return supplierRecord ? [supplierRecord] : [];
    }),
  ]);

  return {
    suppliers: supplierRecords,
    casePreferences,
    shortlistItems,
    evidenceLinks,
  };
}