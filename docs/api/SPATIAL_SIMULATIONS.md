# Spatial simulation job API

Base path: `/api/spatial-simulations`. Every route requires the existing server-side session cookie. The API derives `owner_id` from that session and never accepts it from the request body.

| Method and path               | Minimum role | Purpose                                                       |
| ----------------------------- | ------------ | ------------------------------------------------------------- |
| `POST /`                      | `ANALYST`    | Queue an admitted, hash-bound spatial input                   |
| `GET /:runId`                 | `VIEWER`     | Read run state, progress, failure and result manifest         |
| `DELETE /:runId`              | `ANALYST`    | Request cooperative cancellation                              |
| `POST /:runId/retries`        | `ANALYST`    | Retry a failed run with a new idempotency key                 |
| `GET /:runId/fields/:fieldId` | `VIEWER`     | Stream one completed field artifact after digest verification |

`POST /` accepts `{ "input": <SpatialModelInputV2>, "evaluation_id": null }` and requires an `Idempotency-Key` header (1–128 characters). The input is normalized and SHA-256-bound to the persisted run. Replaying the same key with different input conflicts. `POST /:runId/retries` also requires an idempotency key; retries retain the immutable input and are limited to two per retry lineage.

Run reads, cancellation and retries are owner-scoped. A reader cannot discover another owner's run by ID. Field responses require a completed run and an injected artifact reader. The reader supplies a stream; the API checks its byte count and SHA-256 incrementally into a private temporary file before responding, then streams the verified file and removes it after transfer. This avoids buffering the complete field in API memory and returns a clean integrity error before response headers if the artifact is corrupt. It never accepts or returns an artifact-store filesystem path.

The production app currently has no spatial solver admission or field-artifact reader. Run creation and retries therefore return `503 spatial_execution_unavailable`; field reads return `503 artifact_store_unavailable`. The accepted spatial input schema is planar 2D research data only; this API does not imply that a cell PDE solver exists or that 3D is supported.

## Worker adapter contract

Build with `docker build -f packages/spatial-worker/Dockerfile -t metrev-spatial-worker .` and run in a resource-limited worker container. Set explicit Docker `--cpus` and `--memory` limits, mount the reviewed executor adapter read-only, and configure `METREV_SPATIAL_WORKER_EXECUTOR_MODULE` to its path in the container. For local development, run `pnpm --filter @metrev/spatial-worker start`.

The adapter module exports `spatialSimulationExecutor` with:

```ts
{
  solverVersion: string;
  runtimeVersion: string;
  supports(input): boolean;
  execute({ input, run, signal, reportProgress }): Promise<SpatialSimulationResult>;
}
```

The versions identify the exact solver/runtime build persisted with each run; workers claim only matching queue items, so a deployment cannot silently execute another build's work. The executor must honor `AbortSignal`, report monotonic progress through `preparing_geometry`, `meshing`, `solving` (including the verified mesh SHA-256), and `postprocessing`, then return a contract-valid result manifest. The worker renews its lease, stops when cancellation is requested, and marks work failed when the cooperative wall-clock deadline expires. The executor still needs deployment CPU and memory limits; this package does not supply hard OS-level resource isolation.

Worker settings: `METREV_SPATIAL_WORKER_ID`, `METREV_SPATIAL_WORKER_POLL_MS`, `METREV_SPATIAL_WORKER_MAX_JOBS_PER_CYCLE`, `METREV_SPATIAL_WORKER_LEASE_MS`, and `METREV_SPATIAL_WORKER_TIMEOUT_MS`. Defaults are one job per cycle, a 60-second lease, and a 15-minute execution deadline. The database claim contract caps leases at five minutes and the worker caps deadlines at thirty minutes.
