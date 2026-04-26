# 016 Metrev UI Refactor Plan

> Status: historical reference only. New product execution should follow `specs/020-metrev-three-phase-product-plan/`.

## Objective

Rebuild the runtime workspace UI in controlled stages so the shell, cockpit, intake flow, evidence review, and history surfaces become more navigable and more contract-transparent without breaking the existing runtime stack.

## Stage Order

1. Stage 0: foundation, tokens, wrappers, and feature-pack artifacts.
2. Stage 1: authenticated shell, sidebar, breadcrumbs, command palette, and layout-safe navigation state.
3. Stage 2: evaluation cockpit decomposition and contract-backed detail surfacing.
4. Stage 3: intake wizardization, autosave preservation, and improved submission affordances.
5. Stage 4: evidence review queue density, bulk actions, and explicit partial-failure UX.
6. Stage 5: evaluations list, filters, sorting, and saved URL state.
7. Stage 6: history and evidence detail restructuring with summary-first disclosure and JSON fallback.
8. Stage 7: chart migration and obsolete surface cleanup only after replacement paths are verified.
9. Stage 8: cross-stage polish, responsive verification, print-mode hardening, and regression coverage.

## Implementation Notes

- Use `nuqs` through the App Router adapter and client hooks for persisted URL state.
- Use Radix primitives through local wrappers so the CSS system stays repo-owned.
- Use `cmdk` for the command palette and `recharts` for runtime chart replacement.
- Keep workspace-specific legacy APIs stable while introducing additive primitive capabilities.

## Validation Strategy

- Run focused build or test commands after each stage.
- Confirm print mode removes shell-only affordances on report routes.
- Confirm list and review surfaces preserve access to contract-backed data and uncertainty framing.

## Stage Summary

### Stage 0

- Files: `apps/web-ui/package.json`, `apps/web-ui/src/app/globals.css`, `apps/web-ui/src/components/ui/*`, `apps/web-ui/src/components/workspace-chrome.tsx`, `apps/web-ui/src/components/workbench/panel-tabs.tsx`, `apps/web-ui/src/components/workbench/signal-badge.tsx`, `specs/016-metrev-ui-refactor/*`
- Dependencies: none
- Done criteria: dependencies installed, build green, all 14 primitives present, exact root tokens present, no Tailwind artifacts

### Stage 1

- Files: `apps/web-ui/src/app/layout.tsx`, `apps/web-ui/src/app/providers.tsx`, `apps/web-ui/src/components/app-sidebar.tsx`, `apps/web-ui/src/components/workspace-breadcrumbs.tsx`, `apps/web-ui/src/components/recent-evaluations-nav.tsx`, `apps/web-ui/src/components/command-palette.tsx`, `apps/web-ui/src/components/primary-nav.tsx`, `apps/web-ui/src/lib/navigation.ts`, `apps/web-ui/src/lib/api.ts`, `apps/web-ui/src/app/globals.css`
- Dependencies: Stage 0
- Done criteria: sidebar persisted, breadcrumbs rendered, command palette navigates, recent evaluations visible, print route suppresses shell

### Stage 2

- Files: evaluation route page, `evaluation-result-view.tsx`, new evaluation tab components, new chart wrapper, `apps/web-ui/src/lib/evaluation-view-query-state.ts`, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: five tabs, URL-backed tab state, multi-line chart across all series, compare select works, raw evaluation disclosure loads lazily

### Stage 3

- Files: `case-form.tsx`, new case-form step components, `chip-input.tsx`, `case-intake.ts`, `case-draft.ts`, `case-form-query-state.ts`, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: preset plus four-step wizard, URL-backed step state, chip inputs active, unit-aware numeric validation, draft autosave indicator visible

### Stage 4

- Files: `external-evidence-review-board.tsx`, evidence review toolbar and table components, `evidence-review-query-state.ts`, `evidence-review-actions.ts`, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: URL-backed filters, dense table, select-all, bulk confirmation dialog, partial-failure summary dialog

### Stage 5

- Files: `dashboard-workspace.tsx`, `recent-runs-table.tsx`, `evidence-backlog-table.tsx`, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: dashboard tables replace card stacks, latest evaluation and case history links surface, top fold stays readable

### Stage 6

- Files: `external-evidence-detail.tsx`, `case-history-view.tsx`, new metadata, claims, and payload disclosure components, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: metadata grid, note-aware review action bar, structured claims fallback, case history uses workspace-enriched endpoint, audit payloads are collapsed by default

### Stage 7

- Files: `apps/web-ui/src/app/evaluations/page.tsx`, evaluations list components, `evaluations-list-query-state.ts`, `primary-nav.tsx`, `apps/web-ui/src/app/globals.css`, related tests
- Dependencies: Stages 0 and 1
- Done criteria: `/evaluations` is live, filters persist in URL, client-side sorting works, sidebar exposes the new destination

### Stage 8

- Files: cleanup targets across charts, history, API helpers, global CSS, and final regression tests
- Dependencies: all prior stages
- Done criteria: obsolete charts removed or unreferenced, downloads helper retained only if still required, no significant hardcoded token duplicates remain, final lint/build/test checks pass
