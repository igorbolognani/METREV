# Feature Specification - Canonical Evidence Full-Text Hardening

## Objective

Upgrade the canonical scientific evidence pipeline so accepted catalog records can move beyond `needs_full_text` through auditable external full-text hydration, while keeping decision-ready benchmark facts limited to traceable, validated evidence.

## Why

The current canonical decision layer is structurally in place, but a large portion of accepted records remain blocked in `needs_full_text` because the bulk canonicalizer only uses existing title, abstract, claim, and persisted chunk surfaces. METREV needs a real full-text path and an optional local-only schema-validated LLM supplement without breaking provenance, missing-data transparency, or the no-fabrication rule.

## Primary users

- Analysts who need more accepted literature records to become benchmark-usable without manual fabrication.
- Engineering reviewers who need auditable provenance, policy-aware persistence, and explicit uncertainty handling.

## Affected layers

- domain semantics: existing evidence provenance and uncertainty rules remain authoritative; no ontology rename is planned.
- contract boundary: existing runtime contracts for dashboard and evidence catalog summaries may be extended only if new operator-visible counters become necessary.
- runtime adapters: `packages/database/prisma/schema.prisma`, `packages/database/scripts/`, `packages/database/src/`, `packages/research-intelligence/src/fulltext/`, `packages/llm-adapter/src/`
- UI: no new UI workflow is required initially; existing dashboard and explorer surfaces should continue to consume the same summary and filter contracts.
- infrastructure: Prisma migration `20260504120000_canonical_evidence_decision_layer` and local Postgres validation.
- docs and workflow: `README.md` plus this spec pack.

## Scope

### In

- Harden the canonical evidence migration so it validates cleanly with PostgreSQL-oriented tooling.
- Add a policy-aware `--full-text=hydrate` path that reuses the existing research full-text hydrator.
- Persist hydrated text only when access status, license, and provenance policy allow it.
- Add a local-only `--llm-mode=schema_validated` supplement path using Ollama with strict evidence-span validation for measurements and whitelisted qualitative facts.
- Add focused regression coverage for canonicalization, benchmark refresh, and hydration policy behavior.

### Out

- OpenAI or remote commercial LLM support in this cycle.
- Persisting license-uncertain or policy-blocked full text into the runtime warehouse.
- Replacing deterministic extraction as the canonical baseline path.
- Loading the full corpus into API or UI responses.

## Functional requirements

1. The canonicalizer MUST support a `hydrate` full-text mode that attempts external text retrieval only after deterministic local surfaces prove insufficient.
2. Hydrated text MUST be persisted only when provenance and access policy permit; otherwise it may influence audit status only, not decision-ready benchmark facts.
3. Schema-validated LLM extraction MUST operate as a supplement, not a replacement, and MUST reject outputs whose evidence spans cannot be verified against source text.
4. Qualitative schema-validated facts MUST be limited to approved system, reactor, material, limitation, and scientific-theory categories and MUST NOT create free-form benchmark dimensions.
5. Decision-ready benchmark records MUST remain limited to canonical facts with traceable source hashes, locators, normalization, and `no_fabrication=true` lineage.
6. Benchmark aggregate refresh MUST ignore incomplete benchmark rows that cannot satisfy required aggregate dimensions.

## Acceptance criteria

- [x] The canonical evidence migration applies cleanly through `pnpm run db:migrate:deploy` in the current workspace configuration.
- [x] `pnpm run evidence:canonicalize -- --full-text=hydrate` exists and keeps policy-blocked full text out of the decision-ready path.
- [x] Hydrated allowed full text can move an accepted record from `needs_full_text` to canonical extracted when deterministic facts become available.
- [x] `--llm-mode=schema_validated` works with Ollama only and rejects unverifiable measurement and qualitative evidence spans.
- [x] Focused regression tests cover hydrate success, hydrate block/failure, LLM supplementation, and benchmark refresh filtering.

## Clarifications and open questions

- Access-status and license policy defaults should remain conservative unless explicit repository guidance says otherwise.
- New dashboard counters are optional; avoid expanding public contracts unless the implementation creates a durable operational need.

## Risks / unknowns

- External full-text fetch quality varies by XML, HTML, and PDF source; timeout and low-text failures must not degrade canonicalization correctness.
- Ollama structured extraction may return plausible but weakly grounded candidates; span verification must stay stricter than plausibility.
