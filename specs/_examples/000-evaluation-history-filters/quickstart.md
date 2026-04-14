# Quickstart — Evaluation History Filters

## Goals

- verify the analyst can narrow evaluation history without leaving the current view
- verify invalid filter combinations fail safely

## Preconditions

- the local runtime stack is running with seeded evaluation history
- the browser session is authenticated as an analyst or reviewer

## Setup

1. Start the local runtime using the repository quickstart.
2. Sign in through the browser.
3. Open the evaluation history view with at least several persisted records.

## Happy path

1. Apply a lifecycle-state filter and confirm the result list narrows.
2. Add an actor filter and confirm the URL updates with the normalized filter state.
3. Refresh the page and confirm the filtered view is restored.

## Failure path

1. Enter a date range where `from` is later than `to`.
2. Submit the filter.
3. Confirm the UI shows a controlled validation error and the server remains healthy.

## Edge case

1. Apply filters that intentionally return zero matching records.
2. Confirm the empty state explains that the query returned no results.
3. Clear one filter and confirm the result list returns without a page reset.

## Verification commands and checks

- relevant API and UI tests pass for valid and invalid filter states
- the final verification notes state whether the filtered response stayed runtime-local or required contract promotion
