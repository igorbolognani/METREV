# Research Notes - Evidence Readiness Cleanup

## Current repo findings

- The admin intelligence routes already exist for evidence explorer, evidence review, and research reviews, but active navigation and admin cards still advertise duplicate top-level `/evidence*` and `/research` pages.
- There is no admin route yet for evidence quality, even though the workspace component and the old top-level page already exist.
- The external evidence detail endpoint currently exposes claims and extracted claims, but not canonical scientific facts or benchmark rows. This makes some accepted records look emptier than the underlying warehouse really is.
- The current quality report shows a gap between accepted records and records with canonical extracted facts. That means `accepted` is broader than `table-ready`.

## Policy guardrails

- Domain semantics remain in `bioelectrochem_agent_kit/domain/` and the runtime contract boundary remains in `bioelectro-copilot-contracts/contracts/`.
- Full-text acquisition must remain lawful. The supported strategies are existing source artifacts/chunks, open-access provider URLs, publisher OA URLs, and analyst-provided local PDFs with explicit access/license metadata.
- Paywall bypass tools and piracy mirrors are out of scope and must not be integrated.

## Example-record implication

- The screenshot article with no abstract and zero structured claims is most likely a metadata-only or not-yet-table-ready record.
- Even if canonical facts exist downstream, the current detail contract cannot show them yet.
- Research-table sparsity can therefore come from both weak source text and insufficient UI/API projection.

## First implementation slice

- Canonicalize route exposure and stale labels.
- Add admin evidence-quality route parity.
- Replace old top-level pages with redirects.
- Remove dead client backfill helpers that no UI surface consumes.

## Follow-up implementation slices

- Extend evidence detail with canonical facts and benchmark rows.
- Build a readiness report for accepted evidence.
- Curate and reprocess the corpus using that readiness signal.
- Improve research table rendering for values, units, traces, and missing-state explanations.
