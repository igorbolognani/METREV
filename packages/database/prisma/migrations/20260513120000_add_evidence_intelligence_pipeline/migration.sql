CREATE TABLE "EvidenceQualityAuditReport" (
  "id" TEXT NOT NULL,
  "triggerMode" TEXT NOT NULL,
  "coverageMatrix" JSONB NOT NULL,
  "gaps" JSONB NOT NULL,
  "outliers" JSONB NOT NULL,
  "readinessScores" JSONB NOT NULL,
  "funnelMetrics" JSONB NOT NULL,
  "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvidenceQualityAuditReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceDiscoveryTarget" (
  "id" TEXT NOT NULL,
  "auditReportId" TEXT,
  "gapId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "providers" TEXT[],
  "priority" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "recordsFound" INTEGER NOT NULL DEFAULT 0,
  "recordsStaged" INTEGER NOT NULL DEFAULT 0,
  "failureDetail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "EvidenceDiscoveryTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceAcquisitionAttempt" (
  "id" TEXT NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "foundUrl" TEXT,
  "foundAccessStatus" TEXT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EvidenceAcquisitionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EvidenceQualityAuditReport_triggerMode_createdAt_idx" ON "EvidenceQualityAuditReport"("triggerMode", "createdAt");
CREATE INDEX "EvidenceDiscoveryTarget_status_priority_idx" ON "EvidenceDiscoveryTarget"("status", "priority");
CREATE INDEX "EvidenceDiscoveryTarget_auditReportId_idx" ON "EvidenceDiscoveryTarget"("auditReportId");
CREATE INDEX "EvidenceDiscoveryTarget_gapId_idx" ON "EvidenceDiscoveryTarget"("gapId");
CREATE INDEX "EvidenceAcquisitionAttempt_sourceRecordId_strategy_idx" ON "EvidenceAcquisitionAttempt"("sourceRecordId", "strategy");
CREATE INDEX "EvidenceAcquisitionAttempt_status_createdAt_idx" ON "EvidenceAcquisitionAttempt"("status", "createdAt");

ALTER TABLE "EvidenceDiscoveryTarget"
  ADD CONSTRAINT "EvidenceDiscoveryTarget_auditReportId_fkey"
  FOREIGN KEY ("auditReportId") REFERENCES "EvidenceQualityAuditReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceAcquisitionAttempt"
  ADD CONSTRAINT "EvidenceAcquisitionAttempt_sourceRecordId_fkey"
  FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
