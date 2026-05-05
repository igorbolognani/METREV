# Quickstart - Canonical Evidence Full-Text Hardening

## Goals

- Validate the canonical evidence migration and run canonicalization with policy-aware full-text hydration.
- Verify that only traceable, policy-allowed hydrated evidence can enter the decision-ready benchmark path.

## Preconditions

- Dependencies installed with `pnpm install`.
- PostgreSQL is available and `DATABASE_URL` plus `DIRECT_URL` point to the intended database.
- The canonical evidence migration has been deployed.
- When using schema-validated supplementation, an Ollama-compatible endpoint is reachable from the runtime and the API key is available in the shell environment when that endpoint requires authentication.

## Setup

1. Apply migrations:

```bash
pnpm run db:migrate:deploy
```

1. Regenerate Prisma client if needed:

```bash
pnpm prisma:generate
```

1. Confirm the default dry-run path:

```bash
pnpm run evidence:canonicalize -- --limit=10 --batch-size=5 --full-text=existing --llm-mode=disabled --dry-run
```

1. If you want the schema-validated Ollama supplement, export the runtime settings before running the command. Keep the real key out of committed files:

```bash
export METREV_LLM_MODE=ollama
export METREV_LLM_BASE_URL=https://ollama.com/v1
export METREV_LLM_MODEL=gpt-oss:20b
export METREV_LLM_TIMEOUT_MS=45000
export METREV_LLM_API_KEY=your_ollama_api_key
```

## Happy path

1. Run canonicalization with full-text hydration enabled:

```bash
pnpm run evidence:canonicalize -- --batch-size=1000 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled
```

1. Refresh benchmark aggregates:

```bash
pnpm run evidence:benchmark:refresh
```

1. Optional: run the Ollama-backed schema-validated supplement after exporting the runtime settings:

```bash
pnpm run evidence:canonicalize -- --batch-size=1000 --replace-placeholders=true --full-text=hydrate --llm-mode=schema_validated
```

1. Inspect the quality report:

```bash
pnpm run evidence:quality-report
```

## Failure path

1. If full-text fetches fail or return insufficient text, rerun with dry-run and a small limit:

```bash
pnpm run evidence:canonicalize -- --limit=5 --batch-size=5 --full-text=hydrate --llm-mode=disabled --dry-run
```

1. Review audit rows and canonicalization status in Prisma Studio.
1. Fall back to `--full-text=existing` if the issue is external connectivity rather than repository logic.

## Edge case

1. If the source access status or license policy blocks persistence, hydrated text should remain outside the decision-ready benchmark path.
2. If Ollama returns unverifiable measurement or qualitative candidates, those candidates should be discarded rather than persisted as benchmarkable facts.
3. Qualitative candidates are limited to approved system type, reactor architecture, material/component, limitation, and scientific-theory fields.
4. Keep `--llm-mode=disabled` as the default operational path unless Ollama validation is explicitly required.

## Verification commands and checks

- `pnpm run db:migrate:deploy`
- `pnpm run evidence:canonicalize -- --limit=10 --batch-size=5 --full-text=hydrate --llm-mode=disabled --dry-run`
- `METREV_LLM_MODE=ollama METREV_LLM_BASE_URL=https://ollama.com/v1 METREV_LLM_MODEL=gpt-oss:20b pnpm run evidence:canonicalize -- --batch-size=1000 --replace-placeholders=true --full-text=hydrate --llm-mode=schema_validated`
- `pnpm run evidence:benchmark:refresh`
- `pnpm run evidence:quality-report`
