# ADR-001 — Spatial runtime boundary

Status: proposed. Date: 2026-09-27.

The Node/TypeScript service owns identity, normalized cases, capability resolution, jobs, persistence and reports. A separate numerical process should own spatial mesh, assembly, solves and large fields. The boundary carries a versioned input, a bounded result manifest, structured failures and artifact references. The restricted 1D TypeScript solver remains an explicit development capability and is not a substitute for the proposed 2D/3D process.

Candidate: Python numerical sidecar, because the proposed FEM toolchain has Python interfaces. Alternative: a native module inside Node, which couples numerical dependencies and long solves to the product runtime. Decision is deferred until a pinned runtime/container can parse a case and return a verified manufactured solution. No sidecar is deployed by this ADR.

Exit gate: establish environment compatibility, request/response protocol, timeout/cancel semantics, failure and version handling, and deterministic reproducibility before promoting P04.
