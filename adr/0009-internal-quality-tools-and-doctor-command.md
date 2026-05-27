# ADR 0009 — Internal Quality Tools and Doctor Command

## Status

Proposed (spec 037, Phase 0).

## Context

METREV has many specialized scripts (`evidence:canonicalize`, `evidence:benchmark:refresh`, `research:hard-prune`, `evidence:quality-report`, `evidence:readiness-report`, `evidence:expand-table-ready-corpus`) but no top-down view of corpus quality, no honest PDF inspection, no audit explainability for a single record, and no single health command for operators. Today, diagnosing "is the local view healthy?" or "why isn't this record table-ready?" requires reading multiple scripts.

## Decision

1. Add platform-integrated quality CLIs under `packages/database/scripts/`:
   - `corpus-score.ts` (`pnpm run evidence:corpus-score`)
   - `research-coverage-report.ts` (`pnpm run research:coverage-report`)
   - `pdf-inspect.ts` (`pnpm run pdf:inspect`)
   - `audit-explain.ts` (`pnpm run audit:explain`)
2. Add a layout-audit script `pnpm run ui:layout-audit` (Playwright-based) — Phase 2.
3. Add a single health command `pnpm run metrev:doctor` (`--quick`, `--full`, `--json`).
4. Conventions for all new tools:
   - Default to `--dry-run` when destructive.
   - Emit both human-readable text and `--json` payload.
   - Honor `DATABASE_URL` and print the target DB before any work.
   - Exit code: `0` PASS, `1` FAIL, `2` WARN.
   - No new long-running service; everything is a one-shot script.

## Alternatives

- **One big monolithic CLI** (`metrev <subcommand>`): rejected; pnpm script names already namespace cleanly and existing scripts follow this convention.
- **A new admin UI dashboard for diagnostics**: rejected v1; UI work is reserved for evidence/research/quality workspaces, not yet for ops.
- **External service for health checks**: rejected; out of project's minimal-infra constraint.

## Consequences

- Six new top-level pnpm scripts.
- New script files under `packages/database/scripts/` and root `scripts/`.
- `docs/runtime-tooling-setup.md` must list the new commands.
- Operators can answer "why is this empty?" and "is this corpus healthy?" without source-diving.

## Validation

- Unit tests for scoring math and audit-explain decision chains.
- Smoke runs of each command against the local view with both default and `--json` output.
- `metrev:doctor --quick` returns within reasonable latency on a populated local DB.
