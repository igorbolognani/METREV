# Research Notes - Canonical Evidence Full-Text Hardening

## Initial findings

- The canonical evidence layer already exists in Prisma schema and runtime code.
- `pnpm run db:migrate:deploy` succeeded after hardening the canonical evidence migration SQL to use explicit PostgreSQL-friendly statements.
- The existing canonicalizer only supports `--full-text=existing` or `none`; it does not yet attempt external hydration.
- The repository already contains a reusable full-text hydrator in `packages/research-intelligence/src/fulltext/source-content.ts`.
- The repository already contains a robust local persistence pattern for source artifacts and text chunks in `packages/database/src/source-artifacts.ts`.
- The current LLM adapter supports `disabled`, `stub`, and `ollama`; this makes Ollama the lowest-risk path for schema-validated supplementation.

## Validated observations

- The editor diagnostics on the migration file were not confirmed as a real Prisma migration failure in the current environment.
- Case evaluation already consumes database-limited benchmark slices, so hydrate and LLM work do not need a new UI or route shape to become useful.
- Benchmark aggregate refresh currently relies on `decisionReady`, `canonicalKey`, `normalizedUnit`, and `normalizedValue`; adding a `metricType` guard is a safe robustness improvement because the aggregate model requires it.
- The broadened `schema_validated` path should remain whitelist-based: numeric candidates need deterministic unit normalization, while qualitative candidates are limited to exact-span system, reactor, material, limitation, and scientific-theory categories.

## Design constraints

- Do not persist license-uncertain or policy-blocked full text by default.
- Do not invent facts from hydrated text or LLM output; every persisted candidate needs source hash, locator, and evidence validation.
- Do not let LLM supplementation bypass deterministic normalization or missing-field disclosure.
- Do not allow free-form LLM qualitative categories to become new benchmark dimensions without a contract/domain review.

## Validation executed in this implementation batch

- PASS `pnpm run db:migrate:deploy`
- PASS `pnpm exec vitest run tests/runtime/canonicalize-scientific-evidence-runtime.test.ts`
- PASS `pnpm exec vitest run tests/runtime/refresh-evidence-benchmarks.test.ts`
- PASS `pnpm exec vitest run tests/runtime/canonical-scientific-evidence.test.ts tests/runtime/canonicalize-scientific-evidence-runtime.test.ts tests/runtime/refresh-evidence-benchmarks.test.ts`
- PASS `pnpm --filter @metrev/llm-adapter build`
- PASS `pnpm --filter @metrev/database build`
- PASS local Docker DB `pnpm run db:migrate:deploy` with explicit `localhost:5436` URLs: no pending migrations.
- PASS local Docker DB `pnpm run evidence:canonicalize -- --limit=5 --batch-size=5 --replace-placeholders=true --full-text=hydrate --llm-mode=disabled`: 5 processed, 5 canonical extracted, 23 canonical facts, 7 benchmark records.
- PASS local Docker DB `pnpm run evidence:benchmark:refresh`: 2247 aggregate rows inserted.
- PASS local Docker DB `pnpm run evidence:quality-report`: latest canonicalization run completed with integrity flags true.
- INFO local Ollama endpoint `http://127.0.0.1:11434/v1/models` was unavailable, so live `schema_validated` provider validation was not executed in this batch; focused tests cover measurement and qualitative acceptance/rejection behavior.
