# Planning Contract Note — Supplier Runtime Mapping

> Planning-only artifact. This note captures feature-scoped examples, mappings, and proposed deltas for review. It is not a canonical schema source.

## Purpose

Document the supplier drift across the domain dictionary, runtime output, and Prisma persistence so the Phase 3 relational delta stays explicit instead of being inferred during implementation.

## Current state

- canonical owner files: `bioelectrochem_agent_kit/domain/suppliers/supplier-normalization.yml`, `bioelectrochem_agent_kit/domain/suppliers/supplier-catalog.template.yml`, `bioelectro-copilot-contracts/contracts/output_contract.yaml`
- current status: `canonical change required`

## Current drift

The runtime currently preserves supplier information in three incompatible shapes:

- intake preferences under `supplier_context.*`
- reviewed shortlist output under `decision_output.supplier_shortlist[*]`
- persistence fields under `CaseRecord.supplierContext`, `EvaluationRecord.decisionOutput`, and `EvidenceRecord.supplierName`

This means category, region, shortlist status, and supplier identity are not yet first-class or queryable in PostgreSQL.

## Mapping table

| Domain or output field                                        | Current runtime field                                                                               | Current Prisma persistence                                                                               | Drift                                                                            | Phase 3 relational delta                                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `supplier_context.current_suppliers`                          | `normalized_case.cross_cutting_layers.risk_and_maturity.supplier_context.current_suppliers`         | `CaseRecord.supplierContext.current_suppliers` JSON array                                                | No supplier identity, category, or region normalization                          | Add `Supplier` plus `CaseSupplierPreference` with `preference_type=current`                                |
| `supplier_context.preferred_suppliers`                        | `normalized_case.cross_cutting_layers.risk_and_maturity.supplier_context.preferred_suppliers`       | `CaseRecord.supplierContext.preferred_suppliers` JSON array                                              | Preference is name-only and not auditable by supplier record                     | Add `Supplier` plus `CaseSupplierPreference` with `preference_type=preferred`                              |
| `supplier_context.excluded_suppliers`                         | `normalized_case.cross_cutting_layers.risk_and_maturity.supplier_context.excluded_suppliers`        | `CaseRecord.supplierContext.excluded_suppliers` JSON array                                               | Exclusions are not tied to canonical supplier identity                           | Add `Supplier` plus `CaseSupplierPreference` with `preference_type=excluded`                               |
| `supplier_preference_notes`                                   | `normalized_case.cross_cutting_layers.risk_and_maturity.supplier_context.supplier_preference_notes` | `CaseRecord.supplierContext.supplier_preference_notes` JSON string                                       | Note has no relational link to the preference entries it explains                | Add `note` and `source_state` columns on `CaseSupplierPreference`                                          |
| `supplier_shortlist[*].category`                              | `decision_output.supplier_shortlist[*].category`                                                    | `EvaluationRecord.decisionOutput.supplier_shortlist[*].category` JSON string                             | Runtime categories are free-form and drift from canonical supplier normalization | Add `SupplierShortlistItem.category` constrained to canonical categories                                   |
| `supplier_shortlist[*].candidate_path`                        | `decision_output.supplier_shortlist[*].candidate_path`                                              | `EvaluationRecord.decisionOutput.supplier_shortlist[*].candidate_path` JSON string                       | Candidate identity collapses supplier name, fallback label, and path semantics   | Add nullable `supplierId` plus `candidate_label` on `SupplierShortlistItem`                                |
| `supplier_shortlist[*].fit_note`                              | `decision_output.supplier_shortlist[*].fit_note`                                                    | `EvaluationRecord.decisionOutput.supplier_shortlist[*].fit_note` JSON string                             | Reviewed rationale is not queryable outside the JSON blob                        | Add `fitNote` column on `SupplierShortlistItem`                                                            |
| `supplier_shortlist[*].missing_information_before_commitment` | `decision_output.supplier_shortlist[*].missing_information_before_commitment`                       | `EvaluationRecord.decisionOutput.supplier_shortlist[*].missing_information_before_commitment` JSON array | Missing information is not normalized for downstream review workflows            | Add `missingInformation` JSON column on `SupplierShortlistItem`                                            |
| `evidence_records[*].supplier_name`                           | `audit_record.typed_evidence[*].supplier_name`                                                      | `EvidenceRecord.supplierName` string                                                                     | Evidence can mention a supplier but cannot link to a canonical supplier row      | Add nullable `supplierId` foreign key on `EvidenceRecord` while retaining `supplierName` during transition |

## Validation notes

- this note must stay planning-only until the Phase 3 relational work is approved
- any promoted canonical change must align the domain supplier normalization files, hardened contracts, and relevant tests

## Open questions

- Which supplier fields should become mandatory before a shortlist item can be persisted relationally?
- Does the future relational model need a canonical category enum in the hardened contracts layer before persistence changes land?

## Promotion steps

1. Approve the Phase 3 relational supplier design and promote any hardened boundary changes into `bioelectro-copilot-contracts/contracts/` and aligned domain files.
2. Apply the aligned runtime persistence changes and re-run the relevant contract and runtime validation suites.
