# 016 Metrev UI Refactor

## Goal

Deliver a staged UI refactor for the METREV runtime workspace so analysts can navigate, compare, and review evaluations with denser information, clearer workflow state, and explicit access to the contract-backed data already available in the runtime payloads.

## Source Of Truth

- Domain semantics remain owned by `bioelectrochem_agent_kit/domain/`.
- Runtime request and response contracts remain owned by `bioelectro-copilot-contracts/contracts/` and the runtime contract package.
- The work in `apps/web-ui/` must expose those layers more clearly without inventing a competing vocabulary.

## Scope

- Stage 0 establishes UI primitives, CSS tokens, dependency foundations, and durable spec artifacts.
- Stages 1 through 8 reorganize navigation, cockpit structure, intake workflow, evidence review, list/history surfaces, and cleanup in a fixed execution order.
- The refactor preserves the CSS-first design system. Tailwind is out of scope.

## Dependency Decisions

- `recharts` replaces bespoke SVG chart components where the new multi-series modeling surfaces need shared axes, tooltips, and legends.
- `cmdk` powers the global command palette without forcing a visual framework.
- `nuqs` owns serialized UI state for tabs, filters, and wizard steps through App Router adapters and explicit query-state hooks.
- Radix primitives are adopted through local wrappers only. No Tailwind scaffold or generated design system becomes a source of truth.

## Visual Identity

- IBM Plex typography, warm surfaces, and the current METREV palette remain the baseline.
- New `:root` tokens formalize surfaces, status states, spacing, radii, and the shared masthead and score gradients.
- Dense information views should still preserve a clear top fold with hero actions, status cues, and readable empty states.

## Navigation Decisions

- The authenticated runtime shell moves from top navigation to a fixed left sidebar with a persisted collapsed state.
- Breadcrumbs are generated centrally from pathname plus route params instead of manually in each page.
- The global command palette provides fast access to the four top-level destinations, recent evaluations, and recent cases.
- Printable report routes must suppress sidebar, breadcrumbs, and command-palette chrome.

## Data Exposure Priorities

- Evaluation attention items, narrative metadata, full simulation series, confidence and provenance details, compare candidates, supplier gaps, and audit payloads move from hidden or partial states into structured tabs.
- Evidence detail and case history both keep JSON fallback disclosure for unknown or heterogeneous shapes.
- Fetch clients already present in the runtime should be connected to visible UI paths before any cleanup removes old helpers.

## Delivery Order

- Foundation first.
- Shell second.
- Evaluation cockpit third.
- Intake wizard fourth.
- Evidence queue fifth.
- Dashboard density sixth.
- Evidence detail plus case history seventh.
- Evaluations list eighth.
- Cleanup and verification last.

## Constraints

- Implement in the exact stage order agreed with the user.
- Validate each stage before proceeding.
- Keep raw or unknown-shaped payloads visible through structured disclosure plus JSON fallback when needed.
- Do not delete runtime helpers unless they are proven unused and a replacement path is already live.

## Acceptance Criteria

- The runtime shell supports sidebar navigation, breadcrumbs, command-palette entry points, and print-safe routing behavior.
- Evaluation, intake, evidence, list, and history surfaces expose the relevant contract-backed details with clearer hierarchy.
- New shared primitives are accessible, CSS-native, and reusable across the workspace.
- The refactor ships with updated tests or explicit validation coverage for behavior changes.
