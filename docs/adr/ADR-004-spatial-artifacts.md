# ADR-004 — Spatial result artifacts

Status: proposed. Date: 2026-09-27. Implementation update: 2026-09-28.

Persist run identity, input hash, model/runtime version, status, summary metrics, field manifest, units, coordinate frame, provenance and access policy in PostgreSQL. Store large mesh and field arrays in an external artifact store with content hash and an immutable manifest. The existing JSON case result can hold small sampled 1D series but must not contain full 2D/3D fields.

Evaluate XDMF/HDF5 or another documented mesh/field pairing against visualization, parallel output, version compatibility, object storage and reproducible reload. Database blobs and unversioned file paths are rejected as a default for large runs.

`packages/spatial-artifact-store` implements a development-only local filesystem adapter for planar `msh4` mesh artifacts. It validates the spatial-input-v2 and successful sidecar manifest binding, streams and hashes mesh bytes, stores content-addressed objects with private permissions, writes immutable owner/request manifests, and verifies ownership and hashes on reload. `spatial-simulation-result-v1` now defines compact domain, mesh, field, unit, statistic, conservation, convergence, warning and artifact-hash metadata; field arrays remain external. PostgreSQL now has an owner-scoped run lifecycle record and repository, with optimistic state transitions and idempotency. These are development prerequisites, not a selected or deployed production field provider. Field artifact write/read, authenticated API access and visualization remain pending.

Gate: write, hash, reload, authorize and visualize one verified spatial field while preserving metadata and failure behavior. The local mesh adapter covers only mesh write/hash/reload and owner/request authorization; the full gate is not satisfied.
