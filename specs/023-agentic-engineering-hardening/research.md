# Research Notes — Agentic Engineering Hardening

## Goal

Decide which 2026 agentic-engineering patterns should be adopted immediately in
METREV's root workflow surface without turning the repository into a dedicated
agent-orchestration product.

## Questions

- Which external patterns are high-value and low-risk for the repo right now?
- Which patterns should remain deferred until METREV actually needs a larger
  orchestration control plane?

## Inputs consulted

- docs: `AGENTS.md`, `.github/copilot-instructions.md`,
  `docs/internal-feature-workflow.md`, `docs/runtime-tooling-setup.md`
- repo files: root prompts, agents, skills, and workflow docs
- experiments: repository inventory, prompt binding inspection, and root asset
  gap mapping

## Findings

- Akita's agent-clean-code guidance maps well to METREV's existing discipline,
  especially for explicit types, small focused surfaces, deterministic tests,
  and concise instructions.
- Addy Osmani's orchestration guidance is most useful here as process policy:
  plan approval, WIP limits, one-file ownership, and review gates.
- Symphony's highest-value immediate concept is the repo-owned `WORKFLOW.md`
  contract, not a daemon or scheduler.
- Paperclip is useful as a governance reference, but a full company-style
  control plane would be premature for METREV's current stage.

## Decisions

- Adopt a lightweight repo-owned workflow contract now.
- Keep `AGENTS.md` human-curated and treat automated learning capture as
  proposal-only.
- Promote missing root prompts and protect them with executable validation.
- Use shared runtime contract schemas at the web-client boundary instead of
  introducing a second client-only validation layer.
- Prefer additive runtime-version lineage only where the runtime already owns a
  trustworthy version source.
- Defer control-plane features such as budgets, workspaces per issue, and
  always-on orchestration.

## Open blockers

- The current prompt loader behavior must continue honoring file-stem agent
  identifiers for custom agents.
- OpenAPI generation and broader source-artifact version lineage remain future
  work, not part of this hardening slice.

## Impact on plan

- The first implementation slice should focus on workflow policy and validation,
  not on runtime payload changes.
- The follow-up slices can build on the new workflow contract to harden CI,
  client parsing, runtime-version lineage, and review automation without
  introducing a separate agent platform.
