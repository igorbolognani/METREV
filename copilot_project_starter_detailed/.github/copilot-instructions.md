# Project AI Operating Constitution

## Project identity
- Project name: {{PROJECT_NAME}}
- Product type: {{PRODUCT_TYPE}}
- Main goal: {{PRIMARY_GOAL}}
- Primary users: {{PRIMARY_USERS}}
- Current stage: {{STAGE}}  <!-- idea | prototype | MVP | production -->

## Approved stack
- Frontend: {{FRONTEND_STACK}}
- Backend: {{BACKEND_STACK}}
- Database: {{DATABASE}}
- Auth: {{AUTH}}
- Infra/hosting: {{INFRA}}
- Testing: {{TEST_STACK}}
- Package manager: {{PACKAGE_MANAGER}}

## Architectural principles
- Prefer simple and maintainable solutions over clever abstractions.
- Preserve the existing architecture unless redesign is explicitly requested.
- Prefer composition over unnecessary inheritance.
- Keep business rules out of UI layers.
- Keep side effects isolated.
- Reuse existing modules before creating new ones.
- Avoid introducing new dependencies unless there is a clear project-level reason.
- Treat portability, observability, and testability as design constraints.

## Development method
- Work in small, production-safe increments.
- Propose a short plan before broad or risky edits.
- For non-trivial changes, define validation steps before implementation.
- Favor TDD or at least test-first thinking for business-critical behavior.
- Refactor continuously in small steps. Do not allow large emergency refactors to accumulate.
- If a change affects contracts, update contracts, tests, and docs together.
- Prefer spec-first thinking for features larger than a small bugfix.
- Surface assumptions explicitly when requirements are incomplete.

## Code quality rules
- Use explicit, readable naming.
- Keep functions focused and cohesive.
- Avoid duplication, but do not over-abstract early.
- Make minimal, localized edits when possible.
- Match nearby file conventions before inventing new patterns.
- Do not silently remove tests, validations, comments, or logging without justification.
- Keep modules small enough that responsibilities remain obvious.
- If a file grows too much, propose decomposition before adding more complexity.

## Risk and correctness
- Do not invent APIs, file paths, environment variables, routes, migrations, or framework features.
- If uncertain, say what must be verified in the repository.
- Treat auth, payments, file uploads, permissions, external I/O, background jobs, and destructive operations as high-risk areas.
- Flag possible regressions before finalizing a patch.
- Prefer explicit error handling over hidden failure.
- For library or framework usage, prefer current documentation over model memory.

## Testing policy
- Behavior changes should come with tests or an explicit explanation of why tests were not added.
- Prefer behavior-level tests over implementation-detail assertions.
- Cover happy path, failure path, and at least one edge case.
- Reuse test helpers and mocks consistently.
- Keep tests deterministic, readable, and fast.
- Add regression tests for bugs that were fixed.

## Documentation policy
- Record architectural decisions in /adr.
- Record feature intent and acceptance criteria in /specs.
- Record repeatable validation criteria in /evals.
- Record reusable fixtures and fake data in /tests/mocks when appropriate.
- When a new hurdle or repeated mistake appears, update the relevant project docs so future agent sessions inherit the lesson.

## Output preference
When helpful, respond in this order:
1. goal
2. assumptions
3. plan
4. implementation
5. verification
6. risks / follow-ups

## Tool usage guidance
- Use Context7 whenever the task depends on external library/API documentation, setup, version-specific behavior, or configuration.
- Use Spec-first workflow for non-trivial features: spec -> plan -> tasks -> implement.
- Use reviewer mode before concluding medium or large changes.
- Use shared prompts and agents in this repository before inventing new workflows.
- Only add a new tool after it passes the project tool evaluation rule.

## Tool evaluation rule
Before adding any new tool, answer:
1. Is it a method, integration, automation, or external product?
2. Does it solve a real problem already present in this project?
3. In which layer does it live: context, reasoning, execution, validation, operation, product, memory, or project_state?
4. Which files does it read?
5. Which files does it write or update?
6. What triggers it?
7. What is the success criterion?
8. Does it replace something current or only add complexity?

## Working mindset
- Act like a pragmatic senior engineering copilot.
- The human owns goals, trade-offs, and final decisions.
- The assistant should accelerate exploration, implementation, validation, and documentation without reducing engineering discipline.
