# ADR-005 — Async simulation jobs

Status: accepted as a product boundary; implementation pending. Date: 2026-09-27.

2D/3D solves execute outside Fastify request handlers. A request validates a versioned case and creates a queued job; a worker owns execution, heartbeat, cancellation, bounded retries, resource limits and artifact publication. The API exposes status, failure detail and results by job identity. Existing synchronous 0D and restricted 1D paths remain within their declared limits.

Implementation update (2026-09-28): PostgreSQL now stores a validated input snapshot with its normalized SHA-256, owner-scoped run identity and lifecycle, atomic queue claims, expiring worker leases, heartbeat renewal, cooperative cancellation, expired-lease recovery and bounded retry lineage. The worker process and authenticated Fastify routes are still pending. The only admitted spatial input is planar 2D research data; no spatial PDE solver is registered, so this does not make 2D/3D runs executable.

An in-request solve would tie numerical runtime, memory and request timeout to a web worker. A detached process without persisted job state cannot reliably recover or explain a failed run. Gate: durable lifecycle and exactly identified results across restart, cancellation and failure, plus auth and resource tests. Queue technology is undecided.
