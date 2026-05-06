# Quickstart - Full-Text Research Intelligence

## Goals

- Reproduce the local `034` execution path over the existing warehouse baseline, including the explicit local hard-delete cleanup when requested.
- Validate the warehouse eligibility, canonical evidence, benchmark refresh, quality report, and internal/admin research-review surfaces with objective commands.

## Preconditions

- Dependencies installed with `pnpm install`.
- The local Prisma/PostgreSQL runtime is reachable and contains the expected warehouse baseline for this environment.
- Ports for the local-view stack are available, or overrides are exported before startup.

## Setup

1. Generate the Prisma client and ensure migrations are current:

```bash
pnpm prisma:generate
pnpm run db:migrate:deploy
```

2. Start the local runtime stack:

```bash
pnpm run local:view:up
pnpm run local:view:status
```

3. Run the narrow research API regression before wider execution:

```bash
pnpm exec vitest run tests/runtime/research-api.test.ts
```

## Happy path

1. Run the focused database and advanced research-validation suites:

```bash
pnpm run test:db
pnpm run test:advanced
```

2. Run the whole-repo baseline checks:

```bash
pnpm run lint
pnpm run test:js
pnpm run test:python
pnpm run build
pnpm run validate:fast
```

3. Run the canonical evidence path over a bounded warehouse slice, then refresh benchmarks and print the quality report:

```bash
pnpm run evidence:canonicalize -- --limit=25 --batch-size=25 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled
pnpm run evidence:benchmark:refresh
pnpm run evidence:quality-report
```

The expected result is a local runtime with warehouse eligibility, canonical evidence, benchmark refresh, and quality reporting exercised. When the hard-prune path is used, non-eligible or fixture-like local research source rows are deleted from the local Docker database and a clean extracted review is created from retained records.

4. For the explicit local hard-delete cleanup, run dry-run first and inspect the counts before executing:

```bash
pnpm run research:hard-prune -- --dryRun --reviewLimit=100
pnpm run research:hard-prune -- --execute --reviewLimit=<eligible-record-count>
```

Validated local execution on 2026-05-06 retained `2784` eligible MFC/MEC/MET source records, deleted `125572` non-eligible or fixture-like source records, created review `cmotramks00007di0yzza87hu`, saved `52896` extraction results, left `0` queued/running/failed jobs, and left `0` Playwright/fixture research sources or reviews in the local database.

## Failure path

1. If the local-view stack fails to start, check port collisions and Docker/Compose health first:

```bash
pnpm run local:view:status
docker compose logs --tail=200
```

2. If canonicalization or benchmark refresh fails, rerun on a smaller bounded slice first and inspect the latest quality report before widening the batch size:

```bash
pnpm run evidence:canonicalize -- --limit=5 --batch-size=5 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled
pnpm run evidence:quality-report
```

3. If local warehouse totals differ from the expected prompt snapshot, record the live measured totals in the feature artifacts rather than forcing the database into a synthetic count.

## Edge case

1. Live search in the research-review create UI is intentionally capped to 15 fetched results.
2. A 25-paper or 100-paper review must therefore be validated through warehouse/backfill/preset paths rather than through the live search results alone.
3. The browser validation is incomplete until the large-review path is exercised and recorded explicitly.

## Verification commands and checks

- `pnpm exec vitest run tests/runtime/research-api.test.ts`
- `pnpm run test:db`
- `pnpm run test:advanced`
- `pnpm run lint`
- `pnpm run test:js`
- `pnpm run test:python`
- `pnpm run build`
- `pnpm run validate:fast`
- `pnpm run evidence:canonicalize -- --limit=25 --batch-size=25 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled`
- `pnpm run evidence:benchmark:refresh`
- `pnpm run evidence:quality-report`
- `pnpm run local:view:up`
- `pnpm run research:hard-prune -- --dryRun --reviewLimit=100`
- `pnpm run research:hard-prune -- --execute --reviewLimit=<eligible-record-count>`
- `pnpm exec playwright test tests/e2e/local-first-workspace.spec.ts`
