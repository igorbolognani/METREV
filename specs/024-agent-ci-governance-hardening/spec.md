# Feature Specification — Agent And CI Governance Hardening

## Objective

Reconcile the repository's agent-and-CI governance story with the real active
root workflow surface, then harden the existing CI, validation, and discovery
paths without creating duplicate authority layers.

## Why

The repo already owns the root workflow assets that a stale audit described as
missing. The immediate need is therefore not asset creation, but discoverable
documentation, executable regression coverage, and low-risk CI improvements.

## Primary users

- maintainers evolving METREV's AI-assisted workflow surface
- reviewers who need one authoritative story for workflow, CI, and validation

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: no product behavior change
- UI: no change
- infrastructure: CI workflow and promoted validation scripts
- docs and workflow: root workflow discoverability and feature-pack coverage

## Scope

### In

- record the corrected inventory in a durable feature pack
- harden root CI with a formatting gate and uploaded full-stack artifacts
- align the local Playwright install script with CI
- extend workflow-asset regression coverage to include CI expectations
- document the lightweight multi-agent execution pattern in the root workflow docs

### Out

- new specialist domain agents or skills
- CodeQL, Dependabot, coverage publishing, or Dockerfile lockfile tightening

## Functional requirements

1. The feature pack must record that the root `.github` workflow assets and CI already exist.
2. CI must keep the promoted fast, local, and advanced gates while adding a focused workflow-formatting check.
3. CI must preserve inspectable artifacts for Playwright and local validation failures.
4. The local Playwright install helper must match the CI browser install posture.
5. Workflow drift around CI gates must fail in a focused runtime test.
6. Root workflow docs must explain the safe multi-agent pattern without introducing a control-plane design.

## Acceptance criteria

- [x] `specs/024-agent-ci-governance-hardening/` exists with the required durable artifacts.
- [x] `.github/workflows/ci.yml` includes the focused workflow-formatting gate and artifact uploads.
- [x] `package.json` aligns `test:e2e:install` with the CI Playwright install command.
- [x] `tests/runtime/workflow-assets.test.ts` enforces the promoted CI expectations.
- [x] `WORKFLOW.md`, `docs/internal-feature-workflow.md`, `docs/repository-authority-map.md`, and `docs/runtime-tooling-setup.md` describe the active workflow and CI surface consistently.

## Clarifications and open questions

- `AGENTS.md` remains stable in this slice because the workflow detail already lives in the root operational and instruction surfaces.
- This slice documents a safe multi-agent pattern but does not implement a scheduler, budget engine, or worktree daemon.

## Risks / unknowns

- Overlapping with existing 023 workflow hardening would create duplicate narratives if the new spec does not explicitly scope itself as a follow-on reconciliation slice.
- CI artifact paths must stay aligned with the real Playwright and local validation outputs to avoid false confidence.
