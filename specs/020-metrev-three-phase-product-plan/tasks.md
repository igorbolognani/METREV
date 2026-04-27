#n  Tasks - METREV Three-Phase Product Integration

## Phase 0 - Repository Consolidation

- [x] Create `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, `research.md`, and `contracts/report-conversation-boundary.md`.
- [x] Mark 016 as superseded by 017/018/019/020.
- [x] Reconcile 018 wording so evidence explorer/assistant are internal/advanced, not final report chat.
- [x] Record 019 as implemented but awaiting full validation matrix.
- [x] Update repository authority map.
- [x] Update README current MVP status.

## Phase 1 - Public Landing

- [x] Replace public landing copy with science/value narrative.
- [x] Add stack, variables, comparison, ODS/SDG, JTBD, and flow sections.
- [x] Update landing tests.
- [x] Run focused web UI tests.

## Phase 2 - Scientific Instrument Workspace

- [x] Rework navigation order and Advanced/Internal grouping.
- [x] Update navigation tests.
- [x] Reframe dashboard as workspace home.
- [x] Update dashboard tests.
- [x] Reframe evaluation tab labels and add Roadmap & Suppliers plus Report access.
- [x] Render operating window as heatmap.
- [x] Update modeling/evaluation tests.
- [x] Preserve print-safe report behavior.

## Phase 3 - Report-Grounded Conversation

- [x] Add report conversation runtime schemas.
- [x] Add backend report context builder.
- [x] Add conversation persistence path.
- [x] Add `generateReportConversationAnswer`.
- [x] Add report conversation API route.
- [x] Add web API helper and report drawer UI.
- [x] Add focused runtime/API, adapter, and Postgres tests.
- [x] Add browser-level report drawer regressions.

## Data Bootstrap / Pipeline Hardening

- [x] Improve resumable/bootstrap operator output.
- [x] Strengthen DOI/title/hash dedupe.
- [x] Preserve review status on re-ingestion.
- [x] Preserve claim IDs where possible.
- [x] Create/update claim reviews when catalog items are accepted.
- [x] Add/adjust regression tests.

## Validation

- [x] `pnpm run test:python`
- [x] `pnpm run test:js`
- [x] `pnpm run test:db`
- [x] `pnpm run build`
- [x] `pnpm --filter @metrev/database bootstrap:bigdata -- --dryRun --queryLimit=1 --perQueryLimit=2`
- [x] `pnpm run db:bootstrap:bigdata`
- [x] `pnpm run test:e2e`
- [x] `pnpm run validate:fast`
- [x] `pnpm run validate:local`
