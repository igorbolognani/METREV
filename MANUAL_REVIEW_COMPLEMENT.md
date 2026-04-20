# Manual review complement

Historical note: this complement records a completed manual review from an earlier cleanup wave. Use `docs/repository-authority-map.md` and `specs/015-repository-authority-and-structure-consolidation/` for active repository-structure decisions.

This complement closes the main remaining review points after the structural sanitation pass.

## What was manually reviewed

The remaining files under `bioelectro-copilot-contracts/contracts/rules/` were reviewed against the canonical vocabulary declared in:

- `bioelectro-copilot-contracts/contracts/input_schema.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/stack.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/VOCABULARY_ALIGNMENT.md`

## Main findings

### Still aligned or acceptably generic

- `assumptions.yaml`
- `defaults.yaml`
- `compatibility.yaml`
- `evidence_score.yaml` after clarification of evidence-type behavior
- `ranges.yaml` after clarifying that it is a diagnostic threshold language rather than an intake plausibility contract
- `scoring.yaml` after renaming `criteria` to `dimensions` for consistency
- `sensitivity.yaml` after aligning tracked factors with canonical field names

### Needed direct correction

- `diagnostics.yaml`
- `improvements.yaml`
- `failure_modes.yaml`

These three files still carried compact or legacy-style vocabulary and now explicitly reference canonical stack block names.

## Package decision

Short-term recommendation: keep `bioelectro-copilot-contracts/` separate.

Rationale:

- It preserves a useful distinction between exploratory domain/workflow assets and formal contracts.
- It supports later API, storage, and validation boundaries.
- It avoids prematurely collapsing domain scaffolding and contract hardening into one folder before validation discipline exists.

A later merge becomes reasonable only after schema validation is already enforced and the contracts have stabilized across real cases.

## What to insert into the repository

1. Add `bioelectro-copilot-contracts/contracts/rules/README.md`.
2. Replace the corrected rule files in `bioelectro-copilot-contracts/contracts/rules/`.
3. Add `tests/contracts/test_canonical_vocabulary.py`.
4. Add `bioelectro-copilot-contracts/PACKAGE_FUTURE_DECISION.md`.

## Why this matters

This closes the main residual drift path:

- canonical ontology says one thing,
- rule files say another,
- AI then learns both.

With these inserts, the repo becomes much more explicit about which vocabulary is authoritative and starts to make drift mechanically detectable instead of relying only on human review.
