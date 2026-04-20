# Repository Sanitation Summary

Historical note: this summary documents an earlier cleanup wave, is now complemented by `specs/015-repository-authority-and-structure-consolidation/`, and should not be treated as the active repository-authority surface.

This repository snapshot applies a focused structural cleanup without changing the product thesis.

## What was changed

1. Fixed invalid JSON in `copilot_project_starter_detailed/.vscode/mcp.json`.
2. Added `copilot_project_starter_detailed/.vscode/mcp.template.jsonc` for commented template usage.
3. Moved duplicate root-level exports into `archive/legacy-root-duplicates/` as a temporary holding area for that earlier wave.
4. Rewrote `bioelectro-copilot-contracts/contracts/` key files to align with the canonical vocabulary already used in `bioelectrochem_agent_kit/domain/`.
5. Added `bioelectro-copilot-contracts/contracts/VOCABULARY_ALIGNMENT.md` to make legacy-to-canonical mapping explicit.
6. Replaced the root `README.md` with a structure-level explanation of repository roles.
7. Updated the bioelectrochemical scope ADR to accepted status when that status marker was present.

## What was intentionally not changed in that earlier wave

- The six-agent decomposition.
- The overall product direction as a decision-support platform rather than a first-principles simulator.
- Existing prompts, skills, and evaluation scaffolding.
- Historical export artifacts, which were preserved at the time instead of deleted.

The clearly redundant archive copies from that temporary holding area were later retired under `specs/015-repository-authority-and-structure-consolidation/` after the remaining owner files were confirmed.

## Remaining manual review points

- Inspect all remaining files under `bioelectro-copilot-contracts/contracts/rules/` to confirm they still reflect the canonical vocabulary after future edits.
- Decide whether `bioelectro-copilot-contracts/` should remain a separate package or be merged into a single product repository structure later.
- Consider adding schema validation tests so drift is caught automatically.
