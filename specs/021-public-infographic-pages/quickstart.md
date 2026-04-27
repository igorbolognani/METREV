# Quickstart - Public Infographic Pages

## Goals

- verify the new public overview hub and six topic routes
- confirm the public educational pages stay outside the signed-in workspace chrome
- keep desktop route assertions and mobile infographic snapshots current

## Preconditions

- dependencies installed with `pnpm install`
- web UI can run locally with the current workspace env setup

## Setup

1. Run `pnpm --filter @metrev/web-ui lint`.
2. Run focused public-route tests after implementation.
3. Run the public Playwright suite against the local-view runtime when route visuals or copy change.
4. Start the web UI locally for browser verification if needed.

## Happy path

1. Open `/` as an anonymous visitor and confirm the overview hub renders six topic links.
2. Open `/learn/problem`, `/learn/technology`, `/learn/stack`, `/learn/comparison`, `/learn/impact`, and `/learn/metrev`.
3. Confirm each route shows one infographic board with numbered panels, legends, and readable BES-specific explanations.

## Failure path

1. Open a `/learn/*` route while signed in.
2. Confirm the app sidebar does not wrap the page.
3. If workspace chrome appears, fix the public-route bypass behavior in `AppShell`.

## Edge case

1. Open an invalid route such as `/learn/not-a-topic`.
2. Confirm the route resolves to `notFound()`.
3. Verify the public nav still points only to the supported topic pages.

## Verification commands and checks

- `pnpm exec vitest run tests/web-ui/public-landing.test.tsx tests/web-ui/public-topic-page.test.tsx`
- `pnpm exec playwright test tests/e2e/public-routes.spec.ts`
- `pnpm --filter @metrev/web-ui lint`
- `pnpm --filter @metrev/web-ui build`
