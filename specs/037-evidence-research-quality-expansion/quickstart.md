# Quickstart — Spec 037

## Local prerequisites

- pnpm install completed.
- `pnpm run local:view:up` running (web on 3012, api on 4012, postgres on 5436).
- Database bootstrapped: `pnpm run db:bootstrap`.

## First-batch loop (Phase 0 → 1 → 2)

1. Capture baseline screenshots:

   ```bash
   pnpm exec playwright test tests/e2e/layout-audit.spec.ts --update-snapshots || true
   ```

   (Once Phase 2 script lands, prefer `pnpm run ui:layout-audit`.)

2. Apply Phase 1 UI corrections; run focused web-ui tests:

   ```bash
   pnpm run test:js -- tests/web-ui
   ```

3. Run layout audit:

   ```bash
   pnpm run ui:layout-audit
   ```

   Inspect `test-results/layout-audit/summary.json` and PNGs.

## Phase 3+ loop

- After contract changes: `pnpm run test:js`.
- After audit changes: `pnpm run evidence:quality-report` and inspect the new `funnels` block.
- After research-cell changes: `pnpm run research:hard-prune -- --dryRun --reviewLimit=5`.
- After document-intelligence wiring: `pnpm run pdf:inspect -- <artifactId>`.

## Final validation

```bash
pnpm run test:js
pnpm run test:db
pnpm run test:e2e
pnpm run ui:layout-audit
pnpm run validate:local:smoke
pnpm run metrev:doctor --full --json
```

## Environment flags

- `METREV_DOCINTEL_ENABLED=1` — opt into new document-intelligence parser.
- `METREV_AUDIT_FUNNELS_V2=1` — opt into 5-funnel audit payload while back-compat is kept (remove after Phase 3 lands stable).
