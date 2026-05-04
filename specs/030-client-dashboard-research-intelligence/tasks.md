# Task List - Client Dashboard And Research Intelligence

## UX slice

- [ ] Create the `030-client-dashboard-research-intelligence` feature pack artifacts.
- [ ] Add planning-only contract notes for dashboard payloads, parameter state, and research table traces.
- [ ] Add a guarded local evaluation reset command with dry-run/count support.
- [ ] Validate the reset command against the local Docker runtime.
- [ ] Refactor the dashboard presenter to expose compact, client-relevant status groups.
- [ ] Rebuild the dashboard UI with compact panels, meaningful status summaries, and a stronger reports tab.
- [ ] Make `/reports` a route fallback with obvious dashboard/back navigation.
- [ ] Improve the evaluations registry empty state after reset.
- [ ] Add or update focused tests for the reset path, dashboard, reports, and evaluations slice.

## Parameter and preset slice

- [ ] Define canonical parameter-state behavior across defaults, inclusion/exclusion, units, rationale, and audit visibility.
- [ ] Add reusable parameter field controls for the stack configurator.
- [ ] Apply the controls across the 12 stack steps without losing autosave, draft restore, or deterministic submission.
- [ ] Improve preset provenance, units, and default visibility.
- [ ] Add focused tests for parameter-state mapping and case-form rendering.

## Research-intelligence slice

- [ ] Design and implement table/cell-aware source traces and concept persistence.
- [ ] Land the 30,000-record MFC/MEC warehouse target with queued preset controls, scripts, and progress reporting.
- [ ] Keep pending, accepted, and rejected evidence explicitly separated at scale.
- [ ] Promote accepted structured research into comparison/preset-ready services.
- [ ] Add scale, review-gate, and provenance regression coverage.

## Critique and closeout

- [ ] Run the critique pass for scientific honesty, accessibility, and client/admin separation.
- [ ] Update quickstart and verification notes with the validated local commands.
