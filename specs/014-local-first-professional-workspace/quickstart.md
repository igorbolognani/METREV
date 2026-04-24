# Quickstart — Local-First Professional Workspace

## Goals

- validate the dedicated local-first route flow from dashboard to report/export without relying on production services
- confirm that backend-owned workspace responses keep defaults, missing data, evidence posture, uncertainty, and runtime versions explicit across every surface

## Preconditions

- the local runtime is up with `pnpm run local:view:up`
- seeded local users are available for analyst and viewer sessions

## Setup

1. Run `pnpm run local:view:status`.
2. Open `http://localhost:3012/login`.
3. Sign in as an analyst and keep a viewer account ready for read-only checks if needed.

## Route map

- `/`: operational dashboard
- `/cases/new`: input deck
- `/cases/new/submitting`: deterministic progress screen
- `/evaluations/[id]`: evaluation workspace
- `/cases/[caseId]/history`: case history
- `/evaluations/[id]/compare/[baselineId]`: pairwise comparison
- `/evaluations/[id]/report`: printable report
- `/evidence/review`: evidence review board
- `/evidence/review/[id]`: evidence detail

## Wireframes

### Dashboard

```text
[Operational dashboard header | New evaluation | Evidence review]
[Saved runs KPI] [High-confidence KPI] [Model coverage KPI] [Pending evidence KPI]
[Latest run summary + CTA to result/history]
[Recent runs list]
[Evidence backlog list]
```

### Input deck

```text
[Summary stats row]
[Input deck header | Reset draft | Review evidence queue]
[Single tab/navigation system]
[Case context / Operating conditions / Supplier context / Evidence / Assumptions]
[Submit row with deterministic handoff messaging]
```

### Submitting / progress

```text
[Analysis in progress header]
[Current stage KPI] [Total stages KPI]
[Normalize intake]
[Validate input]
[Run simulation enrichment]
[Run deterministic rules]
[Validate output]
[Prepare workspace]
```

### Evaluation workspace

```text
[Evaluation workspace header | Compare | Case history | Report | Export JSON | Export CSV]
[Decision posture] [Delivery readiness] [Uncertainty frame] [Critical gap]
[Brief cards]
[Lead action]
[Tabs: Summary / Evidence / Modeling / Audit]
```

### Case history

```text
[Case history header | Open latest workspace]
[Timeline of saved runs with compare CTA]
[Audit trail]
[Attached evidence]
```

### Comparison page

```text
[Comparison header | Current result | Baseline result]
[Current run summary] [Baseline run summary]
[Metric delta cards]
[Recommendation ordering delta]
[Supplier / material delta]
```

### Evidence review

```text
[Evidence review header | Open input deck]
[Pending / Accepted / Rejected / Total KPIs]
[Search + review-state tabs]
[Spotlight records]
[Full evidence catalog]
```

### Printable report

```text
[Printable report header | Print / Save as PDF]
[Stack diagnosis]
[Prioritized improvements]
[Impact map]
[Supplier shortlist]
[Phased roadmap]
[Defaults / missing data / confidence summary]
```

## Happy path

1. Start on `/` and confirm the dashboard shows workspace KPIs, recent runs, evidence backlog, and clear CTAs.
2. Open `/cases/new`, complete the input deck, attach accepted evidence, and submit the case.
3. Confirm `/cases/new/submitting` shows the deterministic stages until the backend returns the created evaluation.
4. Land on `/evaluations/[id]` and verify compare, case history, report, JSON export, and CSV export actions are visible.
5. Open `/cases/[caseId]/history` and compare the current evaluation with a prior run.
6. Open `/evidence/review`, inspect a record, accept it, return to the input deck, and confirm accepted evidence can be attached explicitly.
7. Open `/evaluations/[id]/report` and use `Print / Save as PDF` to validate the browser-native report path.

## Failure path

1. Enter invalid numeric data in the input deck and confirm the form surfaces a recoverable error before submission.
2. Trigger a submission failure and confirm the progress route persists the draft, stores an actionable error, and returns the user to `/cases/new`.
3. Confirm defaults, missing data, evidence posture, and uncertainty remain explicit on the result surface even when the run is degraded.

## Edge case

1. Submit the same payload twice with the same `Idempotency-Key`.
2. Confirm the backend returns the same evaluation instead of creating a duplicate.
3. Recheck dashboard, history, and exports on a narrow viewport to confirm hierarchy and actions remain readable.

## Verification commands and checks

- `pnpm run validate:fast`
- `pnpm run validate:local`
- `pnpm run local:view:status`
