# ADR-005 — Async simulation jobs

Status: accepted as a product boundary; implementation pending. Date: 2026-09-27.

2D/3D solves execute outside Fastify request handlers. A request validates a versioned case and creates a queued job; a worker owns execution, heartbeat, cancellation, bounded retries, resource limits and artifact publication. The API exposes status, failure detail and results by job identity. Existing synchronous 0D and restricted 1D paths remain within their declared limits.

Implementation update (2026-09-28): PostgreSQL now has a spatial-run identity/status/progress/version/hash record and an owner-scoped repository with ordered lifecycle transitions. This is persistent lifecycle metadata only; there is no queue consumer, Fastify route, heartbeat, retry policy or spatial solver yet.

An in-request solve would tie numerical runtime, memory and request timeout to a web worker. A detached process without persisted job state cannot reliably recover or explain a failed run. Gate: durable lifecycle and exactly identified results across restart, cancellation and failure, plus auth and resource tests. Queue technology is undecided.
