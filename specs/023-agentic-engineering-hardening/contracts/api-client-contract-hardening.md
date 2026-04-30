# API Client Contract Hardening Note

## Goal

Record the approved boundary pattern for the web UI client after replacing blind
JSON casts with shared contract parsing.

## Canonical owner files

- `packages/domain-contracts/src/schemas.ts`
- `packages/domain-contracts/src/research-schemas.ts`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/research/evidence-pack.schema.yaml`

## Adopted pattern

- The web UI client in `apps/web-ui/src/lib/api.ts` must parse JSON requests and
  responses through the exported `@metrev/domain-contracts` schemas when a
  shared schema already exists.
- The client should throw a boundary-specific error when a server payload is not
  valid JSON or does not satisfy the shared schema.
- The client should serialize request bodies from schema-parsed payloads instead
  of trusting compile-time types alone.

## Why this pattern

- It prevents the web client from silently drifting away from the hardened
  runtime contract boundary.
- It keeps validation logic in one maintained layer instead of duplicating a UI
  schema vocabulary.
- It makes contract drift fail in a focused test before broader runtime or UI
  matrices run.

## Version-lineage scope for this slice

- `evaluation_lineage` source and claim usage records may inherit
  `runtime_versions` from the parent evaluation when the runtime owns that run
  context.
- `workspace_snapshot` records may inherit `runtime_versions` from the parent
  evaluation for the same reason.
- `researchEvidencePack` and `researchDecisionIngestionPreview` may carry
  `runtime_versions` when the API route creates the pack and owns the relevant
  contract, ontology, ruleset, prompt, and extractor-version context.

## Explicit non-goals

- No OpenAPI generation in this slice.
- No client-only schema layer that diverges from `@metrev/domain-contracts`.
- No source-artifact runtime-version field until a concrete runtime owner is
  agreed for that asset.
