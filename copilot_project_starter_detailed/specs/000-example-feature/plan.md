# Implementation Plan — Example Feature

## Summary
Create and maintain a spec-first example folder that demonstrates how a feature moves from specification to planning to executable tasks.

## Affected areas
- specs/_templates
- specs/000-example-feature
- repository instructions if workflow changes

## Architecture / design notes
This example is documentation and workflow scaffolding only. It should remain framework-agnostic.

## Contracts affected
- None

## Data model changes
- None

## Implementation steps
1. Add templates for spec, plan, tasks, and quickstart.
2. Add an example feature folder that uses the templates.
3. Keep language generic so it applies to any project type.

## Test strategy
- unit: not applicable
- integration: not applicable
- e2e/manual: verify that a developer can copy and adapt the example

## Rollback / safety
Low risk. Revert or simplify the example if it becomes too prescriptive.
