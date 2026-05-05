-- Extend source typing for scientific, technical, supplier, market, and regulatory documents.
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'PAPER';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'PATENT';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'DATASHEET';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'MANUAL_SOP';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'TECHNICAL_REPORT';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'SUPPLIER_DOCUMENT';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'CASE_STUDY';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'MARKET_REPORT';
ALTER TYPE "ExternalSourceType" ADD VALUE IF NOT EXISTS 'REGULATORY_REPORT';

CREATE TABLE "EvidenceDecisionContextRecord" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "contextVersion" TEXT NOT NULL,
  "builderVersion" TEXT NOT NULL,
  "systemType" TEXT NOT NULL,
  "primaryObjective" TEXT NOT NULL,
  "query" JSONB NOT NULL,
  "benchmarkRanges" JSONB NOT NULL,
  "matchedEvidence" JSONB NOT NULL,
  "materialComparisons" JSONB NOT NULL,
  "operatingWindowSignals" JSONB NOT NULL,
  "failureModeSignals" JSONB NOT NULL,
  "costSignals" JSONB NOT NULL,
  "supplierSignals" JSONB NOT NULL,
  "regulatorySocialSignals" JSONB NOT NULL,
  "uncertaintySummary" JSONB NOT NULL,
  "excludedEvidenceSummary" JSONB NOT NULL,
  "sourceRefs" TEXT[],
  "provenanceNote" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EvidenceDecisionContextRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EvidenceDecisionContextRecord_evaluationId_key" ON "EvidenceDecisionContextRecord"("evaluationId");
CREATE INDEX "EvidenceDecisionContextRecord_caseId_createdAt_idx" ON "EvidenceDecisionContextRecord"("caseId", "createdAt");
CREATE INDEX "EvidenceDecisionContextRecord_systemType_primaryObjective_idx" ON "EvidenceDecisionContextRecord"("systemType", "primaryObjective");
CREATE INDEX "EvidenceDecisionContextRecord_builderVersion_idx" ON "EvidenceDecisionContextRecord"("builderVersion");

ALTER TABLE "EvidenceDecisionContextRecord"
  ADD CONSTRAINT "EvidenceDecisionContextRecord_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;