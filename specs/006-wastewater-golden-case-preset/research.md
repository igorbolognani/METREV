# Research Notes — Wastewater Golden Case Preset

## Goal

Identify the smallest preset payload that makes the minimal intake form produce a meaningful deterministic wastewater-treatment evaluation without changing the canonical rules or contracts.

## Questions

- Which structured fields must the preset carry beyond the visible intake form to generate a nontrivial deterministic output?
- Which recommendation IDs are stable enough to assert in regression tests for a golden-case smoke scenario?

## Inputs consulted

- docs: existing feature packs for the intake-adjacent runtime slices
- repo files: `apps/web-ui/src/components/case-form.tsx`, `packages/domain-contracts/src/normalize.ts`, `packages/rule-engine/src/index.ts`, `bioelectro-copilot-contracts/contracts/rules/diagnostics.yaml`, and `bioelectro-copilot-contracts/contracts/rules/improvements.yaml`
- experiments: current intake form only exposes a minimal field slice, while normalization and rule execution accept richer stack, metric, supplier, and typed-evidence input

## Findings

- The current intake form can stay minimal if a preset contributes the richer structured fields through the payload builder instead of expanding the visible form immediately.
- A wastewater-treatment preset can deterministically trigger `diag_001`, `diag_002`, `diag_003`, and `diag_004` by combining weak biofilm maturity, low power density, high internal resistance or fouling risk, and low sensor data quality.
- Those diagnostics map directly to the stable improvement IDs `imp_001`, `imp_002`, `imp_003`, and `imp_004`, which are better regression anchors than brittle full-score ordering.
- The preset must explain that it injects hidden structured context, otherwise the evaluation could appear to rely on unsupported invisible assumptions.

## Decisions

- Keep the change UI-local by extracting a reusable payload helper instead of expanding the route or schema surface.
- Surface the preset with explicit messaging about the richer hidden stack, metric, supplier, and typed-evidence context it carries.
- Assert concrete recommendation IDs in tests and avoid full ranking assertions.

## Open blockers

- None in the current repository design.
- Manual browser submission remains a follow-through step because this environment can open the page but not automate authenticated form interaction end to end.

## Impact on plan

- The helper must merge preset-backed hidden payload fields with the visible intake state without letting the preset silently override the fields the user can edit.
- The tests should validate both the built raw payload and the deterministic recommendation set so the preset remains trustworthy as a smoke scenario.
