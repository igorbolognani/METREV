# Feature Specification — CI Workflow Semantic Lint

## Objective

Add a promoted semantic validation gate for GitHub Actions workflows so root CI
automation is checked for workflow syntax and expression semantics, not only for
formatting and string-level regression coverage.

## Why

The root automation surface already has focused formatting and workflow-assets
regression coverage, but it still lacks a semantic checker that understands the
GitHub Actions language itself. The next low-risk hardening step is to add a
dedicated `actionlint` gate through the official container and expose it as a
first-class CI step.

## Primary users

- maintainers editing root workflows and automation scripts
- reviewers who need fast feedback when workflow syntax or expression semantics
  drift

## Affected layers

- domain semantics: no change
- contract boundary: no change
- runtime adapters: no change
- UI: no change
- infrastructure: GitHub Actions workflow validation and root automation docs
- docs and workflow: promoted validation gates and workflow-assets coverage

## Scope

### In

- add a dedicated repository script for workflow semantic lint
- run the semantic lint gate in the main `CI` workflow
- extend workflow-assets regression coverage for the new gate
- document the promoted semantic gate and add a durable feature pack

### Out

- scheduled application validation
- dependency review workflows
- repo-wide formatting hardening beyond the focused workflow-assets surface

## Functional requirements

1. The repository must expose a dedicated workflow semantic lint command.
2. The semantic lint command must use the official `actionlint` toolchain in a
   reproducible way.
3. The main `CI` workflow must run the semantic lint gate as an explicit named
   step.
4. The workflow-assets regression test must fail if the new semantic lint gate
   or its script disappears or drifts from the promoted posture.
5. The canonical runtime-tooling and workflow docs must describe why the new
   gate exists.

## Acceptance criteria

- [x] `package.json` exposes `pnpm run lint:workflow-semantics`.
- [x] `scripts/run-workflow-semantic-lint.mjs` runs the official
      `rhysd/actionlint` container.
- [x] `.github/workflows/ci.yml` runs the workflow semantic lint gate as an
      explicit step.
- [x] `tests/runtime/workflow-assets.test.ts` protects the new script and CI
      posture.
- [x] `WORKFLOW.md`, `docs/internal-feature-workflow.md`, and
      `docs/runtime-tooling-setup.md` reflect the promoted semantic gate.

## Clarifications and open questions

- The slice uses the official `actionlint` container rather than a globally
  installed local binary so the invocation stays reproducible across CI and
  contributor machines with Docker.
- Dependabot semantic validation remains out of scope for this slice; the goal
  is GitHub Actions workflow semantics first.

## Risks / unknowns

- Docker must remain available where the local semantic lint command runs.
- If `actionlint` introduces stricter checks in future releases, the pinned
  image version should move intentionally rather than drifting automatically.
