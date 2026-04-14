# Research Notes — Evaluation History Filters

## Goal

Resolve the implementation details that could drift across API, UI, and review behavior before the feature is planned in detail.

## Questions

- Should date filters be interpreted in UTC or by browser-local time?
- Should filter state participate in the query key and the browser URL at the same time?

## Inputs consulted

- docs: runtime history flow and current internal workflow guide
- repo files: existing API routes, current web history view, and current query-key patterns
- experiments: local filter-state refresh behavior in the browser

## Findings

- UTC ISO date normalization is simpler to validate and less likely to drift across API and UI layers.
- URL-visible filter state helps reviewers share and reproduce the same filtered view.

## Decisions

- Normalize date filters in UTC and document the rule in the implementation plan.
- Include normalized filter state in both the query key and the URL so refresh and sharing stay consistent.

## Open blockers

- Confirm whether the filtered history response needs hardened boundary coverage or can remain runtime-local.
- Confirm the default pagination behavior when filters reduce the result set dramatically.

## Impact on plan

- The API and UI must reuse one normalization rule for dates.
- The planning contract note must stay explicit about whether a canonical contract change is required.
