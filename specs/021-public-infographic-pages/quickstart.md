# Quickstart - Public Infographic Pages

## Goals

- verify the new public overview hub and six topic routes
- verify the overview hero keeps the explanatory paragraph under the subtitle while the CTA remains large, centered, and visually distinct on the right at desktop widths
- confirm the public educational pages stay outside the signed-in workspace chrome
- verify landing-board and topic-board modal interactions
- verify that public dialogs use the larger floating shell and the shared four-card technical brief structure
- verify the requested public palette family mapping across landing boards and all six topic routes
- verify that public overview copy, topic rationale cards, and dialog bodies now describe BES choices through explicit wastewater, stack, evidence, and uncertainty variables
- keep desktop route assertions and mobile infographic snapshots current after the infographic-first topic-page redesign

## Preconditions

- dependencies installed with `pnpm install`
- web UI can run locally with the current workspace env setup

## Setup

1. Run `pnpm --filter @metrev/web-ui lint`.
2. Run focused public-route tests after implementation.
3. Run the public Playwright suite against the local-view runtime when route visuals, dialogs, or copy change.
4. Start the web UI locally for browser verification if needed.

## Happy path

1. Open `/` as an anonymous visitor and confirm the overview hub renders the fixed public header, a readable upper section, and six landing boards.
2. Confirm the explanatory paragraph now sits inside the hero under the subtitle and that the `Start evaluation` CTA is a larger right-side button on desktop.
3. Click each landing board and confirm a larger floating explanation opens and closes cleanly.
4. Open `/learn/problem`, `/learn/technology`, `/learn/stack`, `/learn/comparison`, `/learn/impact`, and `/learn/metrev`.
5. Confirm each route shows one themed infographic-first card with a route marker, six clickable nodes, and bottom tag pills that follow the route palette family.
6. Confirm the topic-strip nodes progress from stronger to lighter tones inside the same palette family for that page.
7. Click at least one infographic point on each route and confirm the floating explanation opens with fuller copy.
8. Confirm the dialog shows the same four section labels across landing and topic routes: `System function`, `Engineering pressure`, `Decision risk`, and `What METREV checks`.
9. Confirm the overview, topic rationale cards, and open dialogs mention route-specific engineering variables instead of generic slogans.

## Failure path

1. Open a `/learn/*` route while signed in.
2. Confirm the app sidebar does not wrap the page.
3. Confirm the fixed public header still renders correctly while signed in.
4. If workspace chrome appears, fix the public-route bypass behavior in `AppShell`.

## Edge case

1. Open an invalid route such as `/learn/not-a-topic`.
2. Confirm the route resolves to `notFound()`.
3. Verify the public nav still points only to the supported topic pages.

## Verification commands and checks

- `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/public-topic-page.test.tsx`
- `pnpm exec playwright test tests/e2e/public-routes.spec.ts`
- `pnpm --filter @metrev/web-ui lint`
- `pnpm --filter @metrev/web-ui build`

## Validation notes

- Focused SSR checks passed for `tests/web-ui/public-topic-page.test.tsx` and `tests/web-ui/public-landing.test.tsx` during the infographic-first topic-page implementation pass.
- `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/public-topic-page.test.tsx` passed again after the hero CTA move plus the shared palette/readability parity update.
- `pnpm --filter @metrev/web-ui lint` passed after the shared topic-page refactor and spec reconciliation.
- `pnpm --filter @metrev/web-ui build` passed and generated the updated public routes successfully.
- `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/public-topic-page.test.tsx` passed after the shared public-dialog model was expanded to the four-card technical structure.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3016' pnpm exec playwright test tests/e2e/public-routes.spec.ts --grep 'desktop structure'` passed against a fresh host-side web UI instance and confirmed the larger desktop dialog shell plus the shared landing/topic section structure.
- A live manual interaction check on `/learn/metrev` from a fresh `next dev` instance confirmed the topic-card nodes still open the floating detail dialog cleanly from the new PNG-style layout.
- A live production-browser check on `http://127.0.0.1:3016/` confirmed the landing problem dialog renders the larger floating shell and the new four-card technical brief content.
- `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/public-topic-page.test.tsx` passed after the BES copy-propagation pass refreshed the overview hero and topic rationale content.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3016' pnpm exec playwright test tests/e2e/public-routes.spec.ts --grep 'public routes - desktop structure'` passed after the BES copy-propagation pass and confirmed the richer dialog prose renders cleanly across the overview plus all six topic routes.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3016' pnpm exec playwright test tests/e2e/public-routes.spec.ts --grep 'mobile snapshots' --update-snapshots` refreshed the mobile public-route baselines for the current public-route state.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3016' pnpm exec playwright test tests/e2e/public-routes.spec.ts` passed after the snapshot refresh, leaving the full public-route E2E suite green for this dialog-refinement pass.
- `pnpm run local:view:up` completed successfully and exposed the full local runtime on `http://127.0.0.1:3012` for Playwright validation.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3012' pnpm exec playwright test tests/e2e/public-routes.spec.ts --grep 'desktop structure'` passed against the clean local-view runtime.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3012' pnpm exec playwright test tests/e2e/public-routes.spec.ts --update-snapshots` refreshed the mobile public-route baselines to match the redesigned infographic-first pages.
- `PLAYWRIGHT_BASE_URL='http://127.0.0.1:3012' pnpm exec playwright test tests/e2e/public-routes.spec.ts` passed after the snapshot refresh, leaving the full public-route E2E suite green.
