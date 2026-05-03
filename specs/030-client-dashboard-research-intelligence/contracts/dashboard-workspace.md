# Dashboard Workspace Contract Note

## Purpose

Document the expected backend-owned payload changes for the client dashboard refactor before runtime implementation edits land.

## Canonical owner files

- `packages/domain-contracts/src/schemas.ts`
- `apps/api-server/src/presenters/workspace-presenters.ts`

## Proposed additions

- compact status groups for readiness, defaults, missing critical data, output availability, and next actions
- a dashboard reports section that can serve both the dashboard tab and the `/reports` fallback route
- explicit empty-state posture when no evaluations are currently saved in the runtime

## Notes

- keep the payload client-safe and avoid surfacing raw warehouse operations here
- do not move deterministic business logic into the browser; present backend-owned summaries instead
