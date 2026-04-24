# Historical Cleanup Notes

This document consolidates the useful historical context previously kept in root-level cleanup notes.

It is background material only. For active repository-authority, workflow, and structure decisions, use `docs/repository-authority-map.md` and `specs/015-repository-authority-and-structure-consolidation/`.

## Earlier structural sanitation outcomes

An earlier cleanup wave completed the following repository-level adjustments without changing the product thesis:

1. Fixed invalid JSON in `copilot_project_starter_detailed/.vscode/mcp.json`.
2. Added `copilot_project_starter_detailed/.vscode/mcp.template.jsonc` for optional local template usage.
3. Moved duplicate root-level exports into `archive/legacy-root-duplicates/` as a temporary holding area during that wave; those duplicates were later retired after owner files were confirmed.
4. Rewrote key files under `bioelectro-copilot-contracts/contracts/` to align them with the canonical vocabulary in `bioelectrochem_agent_kit/domain/`.
5. Added `bioelectro-copilot-contracts/contracts/VOCABULARY_ALIGNMENT.md` to make legacy-to-canonical mappings explicit.
6. Replaced the root `README.md` with a structure-level explanation of repository roles.
7. Updated the bioelectrochemical scope ADR to accepted status where that marker was present.

## Earlier manual contract review findings

The remaining rule files under `bioelectro-copilot-contracts/contracts/rules/` were manually reviewed against these canonical anchors:

- `bioelectro-copilot-contracts/contracts/input_schema.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/stack.yaml`
- `bioelectro-copilot-contracts/contracts/ontology/evidence_schema.yaml`
- `bioelectro-copilot-contracts/contracts/VOCABULARY_ALIGNMENT.md`

### Files that remained aligned or acceptably generic

- `assumptions.yaml`
- `defaults.yaml`
- `compatibility.yaml`
- `evidence_score.yaml` after evidence-type clarification
- `ranges.yaml` after clarifying that it is a diagnostic threshold language rather than an intake plausibility contract
- `scoring.yaml` after renaming `criteria` to `dimensions`
- `sensitivity.yaml` after aligning tracked factors with canonical field names

### Files that needed direct correction in that wave

- `diagnostics.yaml`
- `improvements.yaml`
- `failure_modes.yaml`

Those files previously carried compact or legacy-style vocabulary and were corrected to reference canonical stack block names explicitly.

## Durable package decision captured from that wave

Short-term recommendation: keep `bioelectro-copilot-contracts/` separate.

Rationale:

- It preserves a useful distinction between exploratory domain and workflow assets versus formal contracts.
- It supports future API, storage, and validation boundaries.
- It avoids prematurely collapsing domain scaffolding and contract hardening into one folder before validation discipline is stable.

A later merge becomes reasonable only after schema validation is enforced and the contracts have stabilized across real cases.

## Durable lessons retained

- Keep canonical ontology and hardened contracts explicit so the repository does not teach two vocabularies at once.
- Prefer mechanical drift detection through tests and validation checks over one-off human review.
- Treat cleanup narratives as historical context once their decisions have been promoted into maintained owner surfaces.
