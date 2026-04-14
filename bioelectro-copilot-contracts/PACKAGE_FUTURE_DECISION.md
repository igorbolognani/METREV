# Package future decision

## Current decision

Keep `bioelectro-copilot-contracts/` separate from exploratory domain scaffolding for now.

## Rationale

This separation is intentional, not accidental.

It preserves a useful distinction between:

- **exploratory domain and workflow assets**, where naming and decomposition may still evolve,
- and **formal contracts**, where naming should be conservative, explicit, and stable enough to support validation.

That distinction matters because contracts are the layer most likely to later become:

- API payload shapes,
- storage schema boundaries,
- validation targets,
- test fixtures,
- and compatibility promises across tooling.

If exploratory scaffolding and hardened contracts are collapsed too early, the repository becomes easier to read in the short term but harder to govern in the medium term. Vocabulary drift becomes harder to spot because everything appears to belong to one conceptual bucket.

## What this avoids

Keeping the package separate currently avoids three common failure modes:

1. **Premature convergence**
   - unvalidated exploratory naming gets treated as if it were production-grade contract vocabulary.

2. **Silent contract drift**
   - rules, examples, reports, and future code may adopt slightly different terms for the same concept.

3. **False schema stability**
   - the folder layout suggests hardening before actual validation discipline exists.

## When a merge becomes reasonable

A later merge or stronger consolidation becomes reasonable only after all of the following are true:

- schema validation is actively enforced,
- canonical names have survived multiple real case evaluations,
- tests catch vocabulary drift automatically,
- and contract changes are governed as explicit compatibility decisions rather than casual refactors.

## Practical rule for now

Until validation and stability are real, use this policy:

- exploratory domain scaffolding may remain richer and more expressive,
- but `bioelectro-copilot-contracts/contracts/` is the authoritative contract boundary,
- and rule files under `contracts/rules/` must align only to the contracts ontology.

## Why this file exists

This note prevents future cleanup work from collapsing the folders for aesthetic reasons alone.

A merge may still be the correct future move.
It is just **not the correct move yet**.
