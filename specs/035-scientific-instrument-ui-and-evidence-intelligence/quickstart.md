# Quickstart - Scientific Instrument UI and Evidence Intelligence

## Goals

- Run the evidence intelligence pipeline and inspect audit/discovery/readiness state.
- Use the redesigned UI from landing page through evaluation, evidence quality, research, and reports.

## Preconditions

- Dependencies are installed with `pnpm install`.
- Prisma client is generated with `pnpm prisma:generate`.
- A local or configured Postgres database is available for database validation.
- Local app testing uses the Docker-backed local view stack.
- `.env.example` has been copied to `.env` or equivalent shell variables are exported for local runtime settings.

## Setup

1. Apply database migrations with `pnpm run db:migrate:dev` in development or `pnpm run db:migrate:deploy` for local-view style validation.
2. Seed local users and baseline data with `pnpm run db:bootstrap` or the E2E bootstrap path when running Playwright.
3. Keep real `AUTH_SECRET`, LLM provider keys, and hosted database credentials in `.env`, shell exports, a local secret manager, or GitHub Secrets. Do not put real values into committed examples.
4. Set `METREV_UNPAYWALL_EMAIL`, `METREV_RESEARCH_WORKER_EVIDENCE_DISCOVERY_LIMIT`, and `METREV_RESEARCH_WORKER_EVIDENCE_ACQUISITION_LIMIT` when you need to tune evidence discovery or acquisition. Keep `METREV_RESEARCH_WORKER_EVIDENCE_DISCOVERY_AUTO_RUN=false` for stable local review sessions, and set it to `true` only when a quality-audit gap should automatically trigger provider discovery.
5. Build or start the local stack with `pnpm run local:view:up` after implementation validation.

## Happy path

1. Sign in as an analyst or admin.
2. Open Home and confirm the mission control status, evidence readiness summary, attention panel, and quick actions render.
3. Open Evaluate, configure a case, and run an evaluation.
4. Inspect the results cockpit for confidence, diagnosis, evidence context, recommendations, impact, suppliers, roadmap, and audit.
5. Open Evidence Quality and run or inspect an audit report.
6. Confirm coverage, gaps, readiness, funnel metrics, and outliers appear.

## Failure path

1. Use a case whose evidence readiness is insufficient.
2. Run evaluation.
3. Confirm missing data or provenance notes include evidence readiness limitations.
4. Confirm confidence and uncertainty messaging remain explicit and auditable.

## Edge case

1. Use a source record with stored source artifacts or text chunks but missing `pdfUrl` and `xmlUrl`.
2. Run acquisition/discovery checks.
3. Confirm the system treats traceable artifacts as available full-text evidence instead of over-fetching solely because URL fields are absent.

## Verification commands and checks

- `pnpm run validate:fast`
- `pnpm run validate:advanced`
- `pnpm run validate:db`
- `pnpm run test:db`
- `pnpm run test:e2e`
- `pnpm run validate:local:smoke`
- Manual browser review at `http://localhost:3012` after `pnpm run local:view:up`
