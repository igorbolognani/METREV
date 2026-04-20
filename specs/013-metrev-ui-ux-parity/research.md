# Research Notes — METREV UI-UX Parity

## Goal

Use the approved UI benchmark to raise METREV's UI density and technical clarity without copying expressive implementation or weakening METREV's provenance posture.

## Questions

- Which benchmark patterns map cleanly onto the current METREV runtime?
- Which surfaces are presentation-limited today, and which ones are blocked by missing summary data?

## Inputs consulted

- benchmark repository: `igorbolognani/UI-UX-SYSTEM`
- current METREV UI code in `apps/web-ui/src/**/*`
- current runtime schemas and workbench helpers
- existing UX specs 007 and 011

## Findings

- The benchmark's strongest reusable patterns are workspace-level landing cards, drafting tabs with a contextual side rail, dedicated workspace pages, dense history/comparison summary, and chart-first results presentation.
- METREV already has enough evaluation and history detail for a large part of the uplift; the main immediate deficit is composition, not deterministic data.
- Some benchmark behaviors, especially portfolio analytics and structured compare deltas, may still require small runtime enrichments later.
- The safest implementation seam for the product refactor is an output-side mapper layer above `evaluation-workbench.ts`, not a backend contract rewrite.

## Decisions

- Adapt benchmark interaction and composition patterns on the current stack rather than cloning its implementation.
- Keep METREV's local-only evidence posture and explicit uncertainty framing visible even when the UI becomes denser.
- Refactor the decision workspace first, then let input, comparison/history, and evidence review inherit the same language.

## Open blockers

- Dashboard parity is partly limited by the thin evaluation-list summary shape.
- History and comparison can become richer, but dedicated diff summaries may eventually need runtime support.

## Impact on plan

- Start with explicit decision presentation mappers and the decision workspace top fold.
- Follow through on input, comparison/history, and evidence review after the decision-first seam is stable.
