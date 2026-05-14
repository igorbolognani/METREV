# Contract Note — Admin UI Density Rules

Planning-only document. Canonical owner: `apps/web-ui/src/app/globals.css` + admin density tokens.

## Goal

Make admin/evidence/research/quality pages comfortable at 100% browser zoom for 1280×800 and larger. Stop hiding broken layouts behind `.app-main { overflow-x: hidden }`.

## Rules

1. **No global horizontal clipping for admin pages.** `.app-layout--admin-density .app-main` does not set `overflow-x: hidden`.
2. **Allowed scroll containers** carry `data-layout-scroll="true"`. Only these are permitted to overflow horizontally on admin pages.
   - `.workspace-scroll-x` (utility).
   - `DenseTableShell` and `DashboardTableShell` / `DetailTableShell`.
   - `.workspace-payload-shell` (JSON payload preview).
   - `.workspace-heatmap-shell`.
   - `.workspace-document-preview` (future document intel).
3. **Grid/flex children** in `.workspace-split-grid`, `.workspace-detail-grid`, `.workspace-stack-grid` must set `min-width: 0` so inner scroll containers can scroll instead of inflating the parent.
4. **Long text tokens** (DOI, URL, identifier, extracted chips) carry the `.workspace-mono-overflow` utility: `word-break: break-word; overflow-wrap: anywhere; max-width: 100%`.
5. **Stackable split grids**: `workspace-split-grid` collapses to single column at `max-width: 1440px` for admin density; explicit `--always` modifier opts out.
6. **Toolbar rows** wrap (`flex-wrap: wrap; gap: var(--space-2)`); never force horizontal scroll on toolbar.
7. **Tab strips** use `overflow-x: auto` inside their own shell when they exceed width; never push the page.

## Allowed overflow attribute

`<div data-layout-scroll="true" class="workspace-scroll-x">…</div>`

The layout audit (Phase 2) tolerates overflow only inside elements matching `[data-layout-scroll="true"]` or their descendants.

## Density modifier classes

- `.app-layout--admin-density` — applied on admin shell.
- `.workspace-density--admin` — opt-in finer-grain density on a section.

## Out of scope

- Vertical scroll: unchanged.
- Report/print page (`.app-main--report`) keeps fixed width.
- Public/marketing routes: unchanged.

## Migration steps

1. Add tokens + utilities to `globals.css` (Phase 1, T1.1).
2. Mark allowed containers (`data-layout-scroll="true"`) across affected components (T1.10).
3. Layout audit fails until rule 1 + rule 2 are satisfied for all 11 routes × 4 viewports.
