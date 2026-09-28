ALTER TABLE "SpatialSimulationRunRecord"
  ADD COLUMN "inputSnapshot" JSONB,
  ADD COLUMN "workerId" TEXT,
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "cancelRequestedAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retryOfRunId" TEXT;

ALTER TABLE "SpatialSimulationRunRecord"
  ADD CONSTRAINT "SpatialSimulationRunRecord_attempts_check"
    CHECK ("attemptCount" >= 0 AND "maxAttempts" BETWEEN 1 AND 3),
  ADD CONSTRAINT "SpatialSimulationRunRecord_retryCount_check"
    CHECK ("retryCount" BETWEEN 0 AND 2),
  ADD CONSTRAINT "SpatialSimulationRunRecord_retryOfRunId_fkey"
    FOREIGN KEY ("retryOfRunId")
    REFERENCES "SpatialSimulationRunRecord"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SpatialSimulationRunRecord_status_createdAt_queued_idx"
  ON "SpatialSimulationRunRecord"("status", "createdAt", "id")
  WHERE "status" = 'QUEUED' AND "inputSnapshot" IS NOT NULL;

CREATE INDEX "SpatialSimulationRunRecord_leaseExpiresAt_active_idx"
  ON "SpatialSimulationRunRecord"("leaseExpiresAt")
  WHERE "leaseExpiresAt" IS NOT NULL;

CREATE INDEX "SpatialSimulationRunRecord_status_leaseExpiresAt_idx"
  ON "SpatialSimulationRunRecord"("status", "leaseExpiresAt");

CREATE INDEX "SpatialSimulationRunRecord_retryOfRunId_idx"
  ON "SpatialSimulationRunRecord"("retryOfRunId");
