# Quickstart — Evidence Intelligence Workspace

> Status note: this quickstart remains the maintained internal/advanced evidence workflow for the 018 slice under `specs/020-metrev-three-phase-product-plan/`. Use the 020 pack for repository-wide validation ownership and roadmap status.

## Goals

- validate the current evidence-intelligence slice through the explorer route, warehouse-scoped aggregate cards, assistant brief, and tabbed detail workbench
- confirm that read-first exploration still keeps review posture, provenance, and payload disclosures explicit
- confirm that the dedicated explorer contract exposes grouped tables, warehouse-scoped filtered facets, and current-slice export without overstating assistant certainty

## Preconditions

- the local runtime is up and the workspace can already serve the web UI and API surfaces
- seeded or existing evidence records are available in the local warehouse

## Setup

1. Run `pnpm run local:view:status`.
2. Open `http://localhost:3012/login` and sign in.
3. Navigate to `/evidence/explorer` from the primary navigation.

## Happy path

1. Open `/evidence/explorer` and confirm the explorer shows warehouse aggregate cards, filtered warehouse facets, grouped tables, spotlight records, and the full catalog.
2. Use the search box, review-state tabs, and source-type filter to narrow the explorer without leaving the page.
3. Generate the assistant brief and confirm it exposes summary text, provenance, uncertainty, cited rows, and fallback metadata explicitly.
4. Use the CSV export action and confirm it targets the current filtered slice.
5. Open any evidence record and confirm the detail workbench separates overview, claims, provenance, and payloads into tabs.

## Failure path

1. Open `/evidence/explorer` while the explorer workspace payload is unavailable.
2. Confirm the surface returns an explicit unavailable state rather than a silent empty page.
3. Open a missing record ID and confirm the detail route shows an explicit record-not-found state.

## Edge case

1. Narrow the explorer to a status and source combination that returns no rows.
2. Confirm the grouped tables, facet cards, assistant section, spotlight, and catalog sections render explicit empty states instead of broken tables.
3. Switch back to a broader filter and confirm pagination, export hrefs, assistant generation, and detail links recover without stale selection state.

## Verification commands and checks

- `pnpm vitest run tests/runtime/api.test.ts tests/runtime/llm-adapter.test.ts tests/web-ui/navigation.test.tsx tests/web-ui/external-evidence-explorer.test.tsx tests/web-ui/external-evidence-detail.test.tsx tests/web-ui/api-client.test.ts`
- `pnpm run validate:fast`
