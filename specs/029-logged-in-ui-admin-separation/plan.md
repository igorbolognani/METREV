# Implementation Plan - Logged-In UI And Admin Separation

## Summary

Land the first logged-in UX slice in two layers:

1. clarify the signed-in information architecture between client workflow and admin intelligence
2. refactor the stack configurator into a true input workbench with compact navigation, persistent draft context, and an explicit preflight/output boundary

## Source-of-truth files

- `specs/020-metrev-three-phase-product-plan/`
- `apps/web-ui/src/components/app-shell.tsx`
- `apps/web-ui/src/components/app-sidebar.tsx`
- `apps/web-ui/src/components/primary-nav.tsx`
- `apps/web-ui/src/lib/navigation.ts`
- `apps/web-ui/src/components/case-form.tsx`
- `apps/web-ui/src/components/case-form/case-form-stepper.tsx`
- `apps/web-ui/src/components/case-form/case-form-preset-picker.tsx`
- `apps/web-ui/src/app/globals.css`
- `tests/web-ui/case-form.test.tsx`
- `tests/web-ui/navigation.test.tsx`
- `tests/e2e/local-first-workspace.spec.ts`

## Implementation steps

1. Create the feature pack and record the UI/IA problem as an active slice under the product roadmap.
2. Rename the signed-in sidebar groups so the client workflow and admin intelligence are visibly separated.
3. Refactor the stack configurator support column so the step navigator appears first, stays compact, and becomes sticky on wide layouts.
4. Move the large preset deck behind a collapsible preset library so it stops pushing the navigator downward.
5. Add a preflight preview card that explains current blockers, evidence posture, assumptions visibility, and the generated outputs that only appear after deterministic submission.
6. Preserve existing case-form state, autosave, and query-state behavior while changing only the presentation and navigation surface.
7. Update focused component and regression tests, then run narrow validation before broader repository gates.

## Validation strategy

- focused web tests for case-form and navigation grouping first
- targeted e2e flow update for preset-library interaction so future Playwright runs stay aligned
- `pnpm run validate:fast` after the focused checks pass

## Critique summary

The main risk in the first slice is solving the visual density without actually fixing the interaction loop. The safest change is not a cosmetic rewrite; it is a structural change that keeps the step navigator visible, collapses the preset deck, and labels the output boundary explicitly.

The second risk is overstating readiness from the browser alone. The first slice therefore limits the new preview card to current input gaps, evidence counts, assumptions, and output expectations rather than inventing new optimization claims.
