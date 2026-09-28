CREATE TYPE "SpatialSimulationRunStatus" AS ENUM (
  'QUEUED',
  'PREPARING_GEOMETRY',
  'MESHING',
  'SOLVING',
  'POSTPROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "SpatialSimulationRunRecord" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "system" TEXT NOT NULL,
  "dimension" INTEGER NOT NULL,
  "inputContractVersion" TEXT NOT NULL,
  "inputSha256" TEXT NOT NULL,
  "solverVersion" TEXT NOT NULL,
  "runtimeVersion" TEXT NOT NULL,
  "meshRequestSha256" TEXT,
  "meshSha256" TEXT,
  "status" "SpatialSimulationRunStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "resultManifest" JSONB,
  "failureDetail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "SpatialSimulationRunRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SpatialSimulationRunRecord_dimension_check" CHECK ("dimension" IN (2, 3)),
  CONSTRAINT "SpatialSimulationRunRecord_progress_check" CHECK ("progress" BETWEEN 0 AND 100),
  CONSTRAINT "SpatialSimulationRunRecord_system_check" CHECK ("system" IN ('MFC', 'MEC')),
  CONSTRAINT "SpatialSimulationRunRecord_inputSha256_check" CHECK ("inputSha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "SpatialSimulationRunRecord_meshRequestSha256_check" CHECK (
    "meshRequestSha256" IS NULL OR "meshRequestSha256" ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT "SpatialSimulationRunRecord_meshSha256_check" CHECK (
    "meshSha256" IS NULL OR "meshSha256" ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT "SpatialSimulationRunRecord_ownerId_fkey" FOREIGN KEY ("ownerId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SpatialSimulationRunRecord_evaluationId_fkey" FOREIGN KEY ("evaluationId")
    REFERENCES "EvaluationRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SpatialSimulationRunRecord_ownerId_idempotencyKey_key"
  ON "SpatialSimulationRunRecord"("ownerId", "idempotencyKey");
CREATE INDEX "SpatialSimulationRunRecord_ownerId_status_createdAt_idx"
  ON "SpatialSimulationRunRecord"("ownerId", "status", "createdAt");
CREATE INDEX "SpatialSimulationRunRecord_evaluationId_createdAt_idx"
  ON "SpatialSimulationRunRecord"("evaluationId", "createdAt");
CREATE INDEX "SpatialSimulationRunRecord_status_updatedAt_idx"
  ON "SpatialSimulationRunRecord"("status", "updatedAt");
