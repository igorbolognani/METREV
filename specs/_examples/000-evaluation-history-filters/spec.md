# Feature Specification — Evaluation History Filters

## Objective

Allow analysts to filter evaluation history by lifecycle state, actor, and date range before opening a record.

## Why

Evaluation history becomes hard to audit when analysts must scan long unfiltered timelines to find a specific run or handoff state.

## Primary users

- internal analysts
- engineering reviewers

## Affected layers

- domain semantics: no canonical ontology change expected
- contract boundary: planning review only if the filtered history response becomes part of the hardened boundary
- runtime adapters: API query parsing, repository filtering, and UI state orchestration
- UI: filter controls, empty states, and URL synchronization
- infrastructure: none expected
- docs and workflow: quickstart, tasks, and planning contract note

## Scope

### In

- optional filters for lifecycle state, actor, and date range
- URL-visible filter state so a reviewer can share a filtered view
- clear empty-state and validation behavior for invalid filter combinations

### Out

- new scoring logic or decision behavior
- export, CSV download, or saved filter presets

## Functional requirements

1. Analysts must be able to apply one or more optional filters without losing access to the current history page.
2. Invalid date ranges must return a validation error and must not crash the server or render a broken UI.
3. The filtered view must keep enough context to explain why no results were returned.

## Acceptance criteria

- [ ] A reviewer can open the history view and narrow results by lifecycle state, actor, or date range.
- [ ] An invalid date range surfaces a controlled validation error instead of a server failure.
- [ ] The UI keeps filter state in the URL and restores the filtered view on refresh.

## Clarifications and open questions

- Should date filters be interpreted strictly in UTC or by browser-local time?
- Should the filtered total count reflect the query before or after pagination is applied?

## Risks / unknowns

- Filter semantics may drift if the API and UI normalize dates differently.
- The filtered response may need a hardened contract later if the history view becomes an external boundary.
