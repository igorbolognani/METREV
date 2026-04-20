# Research Notes — Analyst UX System

## Goal

Define the safest way to turn the current evaluation surface into a denser, clearer analyst workbench without introducing a new UI framework or changing runtime contracts.

## Questions

- Can the current custom CSS surface support a stronger analytical hierarchy without a component-library migration?
- How should simulation and evidence be framed so they remain explicit but secondary to deterministic output?

## Inputs consulted

- docs: feature packs 007, 008, and 009; root README; authority runtime hardening notes
- repo files: `apps/web-ui/src/components/evaluation-cockpit.tsx`, `apps/web-ui/src/app/globals.css`, evidence-review components, workbench helpers
- experiments: SSR-safe web test coverage for summary, modeling, degraded-model, and compare states

## Findings

- The current custom CSS surface can support a much stronger analytical hierarchy as long as comparison, status framing, and evidence labels become first-class primitives.
- Simulation enrichment must be presented as optional modeled evidence with explicit status and confidence so it never looks like the canonical deterministic output.

## Decisions

- Keep the analyst UX upgrade on the current Next.js plus custom CSS stack.
- Reuse the same workbench language across evaluation detail, comparison, and evidence review instead of building page-specific one-offs.

## Open blockers

- Responsive polish still depends on manual local validation in the live browser.
- The visual system should stay additive and not drift into a new vocabulary that competes with runtime contracts.

## Impact on plan

- Shared workbench primitives and helper functions are preferable to route-local styling.
- Web tests must keep the SSR path stable while the interface grows denser.
