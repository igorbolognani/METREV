# ADR-001 — Spatial runtime boundary

Status: accepted for an isolated worker process; product deployment pending. Date: 2026-09-27.

The Node/TypeScript service owns identity, normalized cases, capability resolution, jobs, persistence and reports. A separate numerical process should own spatial mesh, assembly, solves and large fields. The boundary carries a versioned input, a bounded result manifest, structured failures and artifact references. The restricted 1D TypeScript solver remains an explicit development capability and is not a substitute for the proposed 2D/3D process.

The Python CLI now exchanges one bounded JSON request and response over stdin/stdout with a typed Node client. The process is launched only by a worker caller, with timeout and abort killing the child. A bounded planar Gmsh mesh request returns physical groups, provenance, runtime metadata and SHA-256 artifact references. Health reports Gmsh availability. The CLI is not wired into Fastify or the case runner and does not solve cell PDEs; these remain blocked on manufactured solutions, async jobs and artifact storage. A native module inside Node would couple numerical dependencies and long solves to the product runtime.

PostgreSQL now provides the durable run input/lease/cancellation/retry boundary. No queue consumer or authenticated spatial route is connected yet, and the isolated worker has no PDE solver.

Exit gate: verify container compatibility, cancellation during a real mesh, reproducibility across environments and manufactured PDE solutions before promoting P04. The caller owns persistence, authorization and a durable artifact store.
