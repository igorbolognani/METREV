# Feature Specification — CI Security Automation

## Objective

Add repository-owned security automation for code scanning and dependency update
management without widening the runtime or contract surface.

## Why

METREV now has a maintained CI workflow, but it still lacks dedicated GitHub
automation for static security analysis and dependency update hygiene. The next
low-risk step is to add GitHub-native security workflows and protect them in the
existing workflow-assets regression surface.

## Primary users

- maintainers responsible for keeping dependencies and workflows current
- reviewers who need code-scanning and dependency automation to be visible in the repo

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: no change
- UI: no change
- infrastructure: GitHub workflows and dependency automation
- docs and workflow: root automation inventory and validation coverage

## Scope

### In

- add a root CodeQL workflow for JavaScript/TypeScript and Python
- add a root `dependabot.yml` for GitHub Actions, pnpm/npm workspaces, and Python validation dependencies
- extend workflow-assets regression coverage to protect the new automation files
- update root automation docs and the focused formatting gate to include the new files

### Out

- runtime code changes
- third-party SAST services beyond GitHub-native automation
- automatic merge or auto-approve policy for dependency PRs

## Functional requirements

1. The repository must expose a dedicated CodeQL workflow in `.github/workflows/codeql.yml`.
2. CodeQL must analyze the languages the repo actually contains: `javascript-typescript` and `python`.
3. The repository must expose a root `.github/dependabot.yml` for GitHub Actions, npm/pnpm workspace manifests, and pip dependencies.
4. The focused workflow-assets regression test must fail if those automation files disappear or drift from the promoted posture.
5. The focused workflow-formatting gate must include the new automation files and the new durable spec pack.

## Acceptance criteria

- [x] `.github/workflows/codeql.yml` exists and uses GitHub CodeQL actions for `javascript-typescript` and `python`.
- [x] `.github/dependabot.yml` exists and schedules updates for `github-actions`, `npm`, and `pip`.
- [x] `tests/runtime/workflow-assets.test.ts` asserts the new automation surfaces.
- [x] `docs/repository-authority-map.md` reflects the expanded root automation surface.
- [x] `pnpm run test:workflow-assets` and `pnpm run format:workflow-assets` pass after the change.

## Clarifications and open questions

- This slice uses GitHub-native automation only; no external security SaaS is introduced.
- Dependabot is configured conservatively to reduce PR churn rather than maximize update frequency.

## Risks / unknowns

- Dependabot multi-directory configuration must stay conservative enough to avoid PR flood in the pnpm workspace.
- CodeQL workflow cost must remain bounded, so the workflow is restricted to the languages actually present in the repo.
