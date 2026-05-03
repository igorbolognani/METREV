# Feature Specification - Logged-In UI And Admin Separation

## Objective

Refactor the signed-in METREV experience so client-facing stack input, decision outputs, and internal/admin intelligence are clearly separated. The first implementation milestone must make the logged-in workspace easier to read and navigate, with a particular focus on the stack configurator, typography, and the distinction between input state and generated outputs.

## Why

The current runtime already has deterministic evaluation, evidence review, research staging, warehouse growth, and confidence/provenance machinery. The main usability failure is presentation: the client workflow does not clearly show what the user is entering, what the system will generate later, and which internal evidence or warehouse tools belong only to analyst/admin operations.

## Primary users

- clients and analysts configuring a stack and reviewing generated decision outputs
- analysts and admins managing evidence review, research staging, warehouse quality, and confidence posture

## Related owner specs

- `specs/020-metrev-three-phase-product-plan/` remains the active product roadmap owner.
- `specs/017-full-big-data-workspace/` remains the big-data and workspace baseline.
- `specs/019-research-intelligence-review-table-engine/` remains the active research-intelligence implementation owner.
- `specs/028-metrev-data-metadata-intelligence/` remains the metadata/data-readiness owner.

## Scope

### In

- stricter signed-in IA between client workspace and admin intelligence surfaces
- larger, clearer, more professional logged-in typography and panel hierarchy
- stack configurator redesign so the active input step stays close to its controls
- explicit preflight/readiness framing that does not pretend to be final output
- clearer dashboard framing around start input, continue evaluations, and open reports
- focused test coverage for navigation grouping and stack configurator behavior

### Out

- replacing the deterministic evaluation pipeline or confidence logic
- inventing browser-only optimization heuristics that bypass backend-owned reasoning
- broad public-route redesign, which remains owned by `specs/021-public-infographic-pages/`
- full admin intelligence console completion in the same first slice

## Functional requirements

1. Signed-in navigation must distinguish client workflow routes from internal/admin intelligence routes.
2. The stack configurator must keep navigation, presets, and readiness support separate from the active input panel.
3. The stack configurator must label generated outputs as post-submit results, not as current-page inputs.
4. Client-facing workspace routes must not foreground raw evidence warehouse actions.
5. Internal/admin routes must continue to enforce role-based access.
6. The redesign must preserve autosave, draft restore, preset loading, URL-backed step navigation, and deterministic submission behavior.

## Acceptance criteria

- [x] `specs/029-logged-in-ui-admin-separation/` contains the maintained feature pack artifacts.
- [x] Sidebar navigation uses clearer client/admin grouping labels.
- [x] `/cases/new` uses a compact step navigator that remains near the active input panel.
- [x] The preset library no longer pushes the step navigator out of immediate reach.
- [x] `/cases/new` includes an explicit preflight/readiness preview that separates current inputs from generated outputs.
- [x] Focused web tests cover the new stack configurator framing and navigation grouping.
- [x] The standard fast validation gate still passes after the slice lands.

## Guardrails

- Keep domain semantics in `bioelectrochem_agent_kit/domain/`.
- Keep validation, persistence, and API-facing shapes in `bioelectro-copilot-contracts/contracts/` and `packages/domain-contracts/`.
- Keep business logic, readiness reasoning, and confidence posture backend-owned when they exceed simple UI state summaries.
- Do not imply that internal warehouse data is automatically client-visible or production-ready without explicit provenance and validation.
