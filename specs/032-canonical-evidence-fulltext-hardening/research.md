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

## Design constraints

- Do not persist license-uncertain or policy-blocked full text by default.
- Do not invent facts from hydrated text or LLM output; every persisted candidate needs source hash, locator, and evidence validation.
- Do not let LLM supplementation bypass deterministic normalization or missing-field disclosure.

## Validation executed in this implementation batch

- PASS `pnpm run db:migrate:deploy`
- PASS `pnpm exec vitest run tests/runtime/canonicalize-scientific-evidence-runtime.test.ts`
- PASS `pnpm exec vitest run tests/runtime/refresh-evidence-benchmarks.test.ts`
- PASS `pnpm exec vitest run tests/runtime/canonical-scientific-evidence.test.ts tests/runtime/canonicalize-scientific-evidence-runtime.test.ts tests/runtime/refresh-evidence-benchmarks.test.ts`
- PASS `pnpm --filter @metrev/llm-adapter build`
- PASS `pnpm --filter @metrev/database build`
