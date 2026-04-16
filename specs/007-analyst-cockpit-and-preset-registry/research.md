# Research Notes — Analyst Cockpit And Preset Registry

## Goal

Map a second golden-case preset from the domain assets and identify the highest-leverage evaluation-detail UX refactor that improves relevance and explainability without changing the deterministic engine or API shape.

## Questions

- Which existing domain golden case best fits the second preset for the current runtime intake surface?
- Which current evaluation-detail weaknesses are structural rather than merely stylistic?

## Inputs consulted

- docs: prior feature packs and the internal workflow notes
- repo files: `apps/web-ui/src/lib/case-intake.ts`, `apps/web-ui/src/components/case-form.tsx`, `apps/web-ui/src/components/evaluation-result-view.tsx`, `apps/web-ui/src/app/globals.css`, `packages/rule-engine/src/index.ts`
- domain assets: `bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml`

## Findings

- The existing nitrogen-recovery golden case is the safest second preset because it already exists in the domain layer and maps onto the current objective options in the runtime intake UI.
- The current evaluation detail route already contains enough data, but it remains too report-like: narrative metadata appears too early, recommendation IDs dominate action labels, and comparison cues are weak.
- The strongest immediate UX improvement is a cockpit-style hierarchy that promotes top actions, confidence drivers, and compact comparison views ahead of narrative, provenance, and pipeline trace detail.

## Decisions

- Use a preset registry rather than another one-off preset branch.
- Keep the cockpit redesign on the current custom CSS surface rather than adding a charting or component library in this slice.

## Open blockers

- None for the preset registry.
- The cockpit refactor still needs implementation and manual validation.

## Impact on plan

- The preset path should be generalized first so the second scenario does not deepen UI branching.
- The cockpit refactor should focus on hierarchy and comparison, not on adding even more raw report sections.
