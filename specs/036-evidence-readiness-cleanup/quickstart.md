# Quickstart - Evidence Readiness Cleanup

## Goals

- Run the canonical admin evidence/research routes without stale duplicate navigation.
- Curate a table-ready evidence corpus using lawful open-access or local-artifact full text.

## Preconditions

- Dependencies are installed with `pnpm install`.
- The Docker local-view stack is available for browser validation.
- Local Postgres access is available for read-only readiness diagnostics and controlled curation.
- Analyst-provided PDFs, when used, include explicit access and license metadata.

## Setup

1. Start or refresh the local-view stack with `pnpm run local:view:up`.
2. Use read-only Postgres diagnostics or the readiness report to inspect the accepted corpus before destructive changes.
3. Keep lawful acquisition settings in place, including the existing `METREV_UNPAYWALL_EMAIL` and discovery/acquisition limits.

## Happy path

1. Open `/admin/intelligence/evidence/explorer`, `/admin/intelligence/evidence/review`, `/admin/intelligence/evidence/quality`, and `/admin/intelligence/research/reviews`.
2. Confirm old top-level `/evidence*` and `/research` pages redirect to those admin routes.
3. Run the readiness report and keep only technically suitable microbial electrochemical papers.
4. Reprocess the curated set and confirm evidence detail plus research tables show values, units, traces, and state-aware missing-data labels.

## Local curation commands

1. Run a local Postgres backup before destructive pruning.
2. Generate an article-level readiness report with `pnpm run evidence:readiness-report -- --limit=5000 --format=json --output=/tmp/metrev-evidence-readiness-report.json`.
3. Dry-run the lawful expansion plan with `pnpm run evidence:expand-table-ready-corpus -- --target-total=5000 --canonical-limit=1000 --readiness-limit=5000`.
4. Execute the expansion only when network/API limits and local DB capacity are acceptable: `pnpm run evidence:expand-table-ready-corpus -- --execute --target-total=5000 --canonical-limit=1000 --readiness-limit=5000`.
5. Refresh aggregates separately if needed with `pnpm run evidence:benchmark:refresh`.
6. Dry-run strict cleanup with `pnpm run research:hard-prune -- --dryRun --table-ready-only --reviewLimit=100`.
7. Execute strict cleanup with `pnpm run research:hard-prune -- --execute --table-ready-only --reviewLimit=100` only after the backup and dry-run count are acceptable.
8. Rerun the evidence quality audit and local smoke validation.

When running against the Docker local-view database, prefix read/report commands with the same local connection environment used by `research:hard-prune` if the shell does not already export it.

## Failure path

1. Inspect an accepted record that still lacks abstract, full text, canonical facts, or benchmark rows.
2. Use the detail payload and readiness report to determine whether the cause is metadata-only input, missing lawful full text, or extraction failure.
3. Reacquire lawfully if possible; otherwise reject, quarantine, or delete the record from the table-ready corpus.

## Edge case

1. Use a source that lacks upstream PDF/XML URLs but already has local source artifacts and chunks.
2. Confirm readiness and extraction treat those artifacts as valid full-text evidence.
3. Confirm no additional remote acquisition is attempted for that source unless policy requires it.

## Verification commands and checks

- `pnpm exec vitest run tests/runtime/research-prune-script.test.ts`
- `pnpm --filter @metrev/database build`
- `pnpm exec vitest run tests/web-ui/navigation.test.tsx tests/web-ui/command-palette.test.tsx tests/web-ui/advanced-route-pages.test.tsx tests/runtime/web-auth-routing.test.ts tests/web-ui/evaluations-list-view.test.tsx`
- `pnpm exec vitest run tests/runtime/evidence-intelligence-api.test.ts tests/runtime/research-api.test.ts tests/runtime/source-artifacts.test.ts tests/runtime/research-source-content.test.ts tests/runtime/canonicalize-scientific-evidence-runtime.test.ts`
- `pnpm run validate:db`
- `pnpm run validate:local:smoke`
- Manual browser verification at `http://localhost:3012`
