-- CreateTable
CREATE TABLE "SimulationArtifactRecord" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "derivedObservations" JSONB NOT NULL,
    "series" JSONB NOT NULL,
    "assumptions" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "provenance" JSONB NOT NULL,
    "failureDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationArtifactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationArtifactRecord_evaluationId_key" ON "SimulationArtifactRecord"("evaluationId");

-- CreateIndex
CREATE INDEX "SimulationArtifactRecord_status_createdAt_idx" ON "SimulationArtifactRecord"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SimulationArtifactRecord" ADD CONSTRAINT "SimulationArtifactRecord_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
