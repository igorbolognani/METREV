# ADR-004 — Spatial result artifacts

Status: proposed. Date: 2026-09-27.

Persist run identity, input hash, model/runtime version, status, summary metrics, field manifest, units, coordinate frame, provenance and access policy in PostgreSQL. Store large mesh and field arrays in an external artifact store with content hash and an immutable manifest. The existing JSON case result can hold small sampled 1D series but must not contain full 2D/3D fields.

Evaluate XDMF/HDF5 or another documented mesh/field pairing against visualization, parallel output, version compatibility, object storage and reproducible reload. Database blobs and unversioned file paths are rejected as a default for large runs. No format or storage provider is deployed by this ADR. Gate: write, hash, reload, authorize and visualize one verified spatial field while preserving metadata and failure behavior.
