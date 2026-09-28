-- A failed run may have one direct retry. PostgreSQL permits multiple NULL
-- values here, so root runs remain unrestricted. Existing duplicate children
-- deliberately block migration until their lineage has been audited.
DROP INDEX "SpatialSimulationRunRecord_retryOfRunId_idx";
CREATE UNIQUE INDEX "SpatialSimulationRunRecord_retryOfRunId_key"
  ON "SpatialSimulationRunRecord"("retryOfRunId");
