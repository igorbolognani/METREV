# ADR-005 — Async simulation jobs

Status: accepted as a product boundary; implementation partial. Date: 2026-09-27.

2D/3D solves execute outside Fastify request handlers. A request validates a versioned case and creates a queued job; a worker owns execution, heartbeat, cancellation, bounded retries, resource limits and artifact publication. The API exposes status, failure detail and results by job identity. Existing synchronous 0D and restricted 1D paths remain within their declared limits.

Implementation update (2026-09-28): PostgreSQL stores validated input snapshots with normalized SHA-256 identity, atomic queue claims, expiring leases, heartbeat renewal, cooperative cancellation, expired-lease recovery and bounded retry lineage. Fastify now exposes owner-scoped status, cancel, retry and field-artifact routes with role checks and byte-hash verification. Creation and retry require an explicitly injected solver admission; the production app has none. A separate spatial-worker package runs a configured executor with progress, heartbeat and a cooperative wall-clock deadline. No PDE solver, production field store or deployment CPU/memory isolation is registered, so spatial execution remains unavailable.

An in-request solve would tie numerical runtime, memory and request timeout to a web worker. A detached process without persisted job state cannot reliably recover or explain a failed run. Gate: durable lifecycle and exactly identified results across restart, cancellation and failure, plus auth and resource tests. Queue technology is undecided.
