# ADR 0008 — Admin UI Density and Layout Rules

## Status

Proposed (spec 037, Phase 0).

## Context

`apps/web-ui/src/app/globals.css` sets `overflow-x: hidden` on `.app-main` and `.app-layout--workspace-density`. Admin pages (Evidence Explorer, Review Gate, Quality, Research Reviews) put dense card/grid/table layouts inside split grids, so wide content gets clipped instead of scrolling locally. Operators must zoom the browser to ~50% to see actions and tables, which violates the project's auditability promise (controls and traces must be visible at normal zoom).

## Decision

1. Stop clipping admin pages globally. Apply density rules via `.app-layout--admin-density` modifier instead of the generic `.workspace-density`.
2. Allow horizontal overflow only inside containers marked `data-layout-scroll="true"` and class `.workspace-scroll-x` (or known shells: `DenseTableShell`, payload preview, heatmap, document preview).
3. Enforce `min-width: 0` on grid/flex children for `.workspace-split-grid`, `.workspace-detail-grid`, `.workspace-stack-grid`.
4. Add a `.workspace-mono-overflow` utility for DOI/URL/identifier wrapping (`word-break: break-word; overflow-wrap: anywhere`).
5. Split grids collapse to a single column at ≤1440px on admin density, unless explicitly opted out.
6. Toolbar rows wrap; tab strips overflow inside their own shell, not the page.
7. Report/print page (`.app-main--report`) keeps fixed 1180px width — unchanged.
8. Layout audit (Phase 2) is the durable enforcement mechanism.

## Alternatives

- **Leave clipping in place, redesign components individually**: rejected; the root cause is a global rule and a per-component fix would drift.
- **Use CSS container queries everywhere**: deferred; current Tailwind/CSS variable approach is consistent and adequate.
- **Force min-width via JS**: rejected; CSS is sufficient.

## Consequences

- Admin pages may show horizontal scrollbars inside tables/heatmaps/payloads — intentional.
- Some component tests need updated DOM expectations.
- One density token system across admin pages; report/marketing pages untouched.
- Long DOIs/URLs no longer escape their containers.

## Validation

- `pnpm run ui:layout-audit` PASS for 11 routes × 4 viewports.
- Vitest UI tests assert presence of `data-layout-scroll` markers and chip wrap utility on critical components.
