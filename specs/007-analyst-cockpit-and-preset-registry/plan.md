# Implementation Plan — Analyst Cockpit And Preset Registry

## Summary

Stabilize the active TypeScript config, replace the one-off preset path with a reusable intake registry, add the nitrogen-recovery golden case from the domain assets, and reshape the evaluation detail route into a comparison-first cockpit that makes the deterministic output easier to act on.

## Source-of-truth files

- `tsconfig.json`
- `apps/web-ui/tsconfig.json`
- `apps/web-ui/src/lib/case-intake.ts`
- `apps/web-ui/src/components/case-form.tsx`
- `apps/web-ui/src/components/evaluation-result-view.tsx`
- `apps/web-ui/src/app/globals.css`
- `bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml`
- `tests/runtime/case-intake-preset.test.ts`

## Affected layers and areas

- TypeScript config hygiene for the active runtime
- intake-preset orchestration in the Next.js web app
- evaluation detail presentation in the analyst UI
- workflow artifacts under `specs/`

## Required durable artifacts

- `spec.md`: define the preset-registry and cockpit scope
- `plan.md`: anchor the change to the current runtime boundaries
- `tasks.md`: sequence config, preset, cockpit, and validation work
- `quickstart.md`: document how to validate the two presets and the cockpit manually
- `research.md`: required because the second preset is mapped from domain assets and the cockpit hierarchy is a design-sensitive refactor
- `contracts/`: not required because no canonical contract change is intended in this slice

## Research inputs

- `bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml`
- `apps/web-ui/src/lib/case-intake.ts`
- `apps/web-ui/src/components/evaluation-result-view.tsx`
- `packages/rule-engine/src/index.ts`

## Contracts and canonical owner files

- contracts affected: none intended
- canonical owner files: `packages/domain-contracts/src/schemas.ts`, `bioelectrochem_agent_kit/domain/cases/golden/case-002-digester-sidestream-nitrogen-recovery.yml`
- planning-only notes under `specs/<feature>/contracts/`: not needed

## Data model or boundary changes

No API or database boundary change is intended. The slice stays in the web app and TypeScript config surface while reusing the current deterministic output contract as-is.

## Implementation steps

1. Remove deprecated `baseUrl` usage from the active root and web tsconfig files while preserving the current alias paths.
2. Convert the intake preset flow into a reusable registry and add the nitrogen-recovery golden case mapping plus regression coverage.
3. Rebuild the evaluation detail route into a comparison-first cockpit with stronger hierarchy, denser option views, and secondary audit sections.

## Validation strategy

- unit: extend preset regression coverage for wastewater and nitrogen-recovery scenarios
- integration: run lint, JavaScript tests, and build checks
- e2e/manual: load both presets through `/cases/new` and inspect the resulting evaluation detail flows
- docs/contracts: confirm no canonical contract or ontology owner files changed unexpectedly

## Critique summary

The main risk is solving density with more density. The cockpit should not just rearrange the same content; it needs to promote top decisions and relegate audit detail to secondary sections.

## Refined final plan

Land the config fix and preset registry first, verify the second preset path, then redesign the evaluation route around decision posture, option comparison, and confidence drivers while leaving the deterministic engine and API shape untouched.

## Rollback / safety

If the cockpit redesign underperforms, revert the web-only component and CSS changes while keeping the tsconfig cleanup and preset registry intact.
