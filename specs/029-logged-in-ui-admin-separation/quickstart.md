# Quickstart - Logged-In UI And Admin Separation

## Goal

Verify that the signed-in stack configurator is easier to navigate and that the sidebar separates client workflow routes from admin intelligence routes.

## Local checks

1. Open `/login` and sign in with an analyst or admin account.
2. Confirm the sidebar shows `Client workspace` and `Admin intelligence` as distinct route groups.
3. Open `/cases/new`.
4. Confirm the step navigator appears before the preset library and remains reachable while the active input panel stays on the right.
5. Confirm `Preflight preview` explains blockers and post-submit outputs without presenting them as current results.
6. Expand `Preset library`, load a preset, and confirm autosave plus step navigation still work.

## Validation commands

- `pnpm exec vitest run tests/web-ui/case-form.test.tsx tests/web-ui/navigation.test.tsx`
- `pnpm run validate:fast`

## Notes

- This first slice changes structure and language, not the deterministic evaluation engine.
- Internal evidence and research routes remain role-gated while the admin intelligence home is still a later slice.
