# 016 Metrev UI Refactor Tasks

> Historical reference only. The unchecked stage tasks below are retained as staged UI backlog context and are not active repository execution work.

## Stage 0

- [x] Step 0-A install dependencies and run `pnpm install`
- [x] Step 0-B add exact root tokens and first-sweep replacements in `globals.css`
- [x] Step 0-C create all 14 UI primitives in dependency order
- [x] Step 0-D rebase `workspace-chrome.tsx`, `panel-tabs.tsx`, and `signal-badge.tsx`
- [x] Step 0-E finalize `spec.md`, `plan.md`, `tasks.md`, `quickstart.md`, and `research.md`

## Stage 1

- [ ] Step 1-A create navigation registry and breadcrumb builder
- [ ] Step 1-B create sidebar, breadcrumbs, recent evaluations nav, and command palette components
- [ ] Step 1-C update `layout.tsx` and `providers.tsx`
- [ ] Step 1-D verify automatic breadcrumb coverage for all route patterns
- [ ] Step 1-E convert `primary-nav.tsx` into sidebar-backed legacy wrapper
- [ ] Step 1-F add shell CSS and print-safe suppression rules

## Stage 2

- [ ] Step 2-A create URL state hook for evaluation tabs
- [ ] Step 2-B create all five evaluation tab components
- [ ] Step 2-C create the dense recommendations table with expandable rows
- [ ] Step 2-D create the multi-line simulation chart wrapper
- [ ] Step 2-E create the lazy raw evaluation disclosure
- [ ] Step 2-F recompose `evaluation-result-view.tsx` around the new tabs

## Stage 3

- [ ] Step 3-A create URL state hook for wizard steps
- [ ] Step 3-B create the chip input primitive
- [ ] Step 3-C create preset picker, stepper, and all wizard step components
- [ ] Step 3-D convert `case-form.tsx` into the wizard orchestrator and preserve draft adapters

## Stage 4

- [ ] Step 4-A create URL state hook for evidence review filters
- [ ] Step 4-B create bulk review helper with `Promise.allSettled`
- [ ] Step 4-C create review toolbar, table, and bulk action components
- [ ] Step 4-D replace the evidence board card list with the dense table workflow

## Stage 5

- [ ] Step 5-A create recent runs and evidence backlog tables
- [ ] Step 5-B recompose `dashboard-workspace.tsx` around the new tables and quick links

## Stage 6

- [ ] Step 6-A create metadata grid, claims table, and payload disclosure components
- [ ] Step 6-B recompose `external-evidence-detail.tsx` around structured detail surfaces
- [ ] Step 6-C migrate `case-history-view.tsx` to the workspace-enriched endpoint and structured audit disclosure

## Stage 7

- [ ] Step 7-A create URL state hook for evaluations list filters
- [ ] Step 7-B create evaluations filters, table, and list view
- [ ] Step 7-C create `/evaluations` and expose it through navigation

## Stage 8

- [ ] Step 8-A remove obsolete chart and download helpers only after reference checks
- [ ] Step 8-B finish the token sweep in `globals.css`
- [ ] Step 8-C normalize empty states across the runtime UI
- [ ] Step 8-D verify remaining `fetchCaseHistory` usage
- [ ] Step 8-E touch `next-auth.d.ts` only if new session fields require it
- [ ] Step 8-F run the final validation sequence and capture PASS/FAIL
