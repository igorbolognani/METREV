# Research Notes - Client Dashboard And Research Intelligence

## Current dashboard state

- `buildDashboardWorkspace` in `apps/api-server/src/presenters/workspace-presenters.ts` currently derives the client dashboard mostly from `listEvaluations()` output.
- The dashboard summary and trend visuals are synthetic sequences based on run counts, confidence counts, and model-status counts, not richer client decision posture.
- `DashboardWorkspaceView` in `apps/web-ui/src/components/dashboard-workspace.tsx` renders oversized summary rails and sparklines that take substantial vertical space while saying little about readiness, missing data, defaults, or next actions.

## Reports behavior

- `/reports` is a standalone route in `apps/web-ui/src/app/reports/page.tsx`.
- The dashboard already has a reports tab, but it only renders a small recent-reports list and still pushes users into the standalone route for fuller registry behavior.
- The user’s complaint about dead-end navigation is grounded: the route fallback is not framed as part of the main workspace flow.

## Evaluation reset gap

- The Fastify evaluation routes expose list and get handlers only.
- `EvaluationRepository` supports save, get, list, and history behavior, but no delete/reset method exists.
- Prisma cascade ownership under `EvaluationRecord` already covers simulation artifacts, source/claim usages, workspace snapshots, report conversations, shortlist items, and audit events, which makes a guarded local reset feasible without hand-deleting every dependent row.

## Parameter-state gap

- The stack configurator already exposes unit-aware numeric inputs in places like the operating-envelope step.
- Domain files such as `property-dictionary.yml`, `defaults.yml`, and `plausible-ranges.yml` already define units, missing behavior, and defaults posture for several fields.
- The current runtime contract still represents inputs mostly as sparse raw values rather than explicit parameter states that can distinguish system default, client value, included, or excluded.

## Research warehouse gap

- Research APIs and scripts can grow metadata and staged records, but the active data model does not yet provide first-class table, row, column, or cell traces.
- Review creation, staging, and extraction limits remain bounded in current contracts.
- The warehouse can now queue and track a 30,000-record bootstrap more easily than it can justify 30,000 accepted structured articles.
- Accepted research should remain a gated reviewed asset before it influences stack comparison, presets, or agent behavior.

## UX guidance from the request

- The client dashboard should feel like operational scientific software, not like a decorative marketing dashboard.
- Panels should be compact and information-dense, with side-by-side sections, tabs, and fixed-height boards where possible.
- Accessibility and readability must improve across all signed-in pages.
