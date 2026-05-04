-- Canonical scientific evidence decision layer.
-- This migration is additive: existing accepted catalog records, placeholder facts,
-- and placeholder benchmark rows are preserved as lineage but marked out of the
-- decision-ready benchmark path until canonicalization backfills them.

ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "extractionRunId" TEXT;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "canonicalKey" TEXT;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "normalizationRuleId" TEXT;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "decisionReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "extractionSource" TEXT;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "missingFields" JSONB;
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "qualityFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ScientificEvidenceFact" ADD COLUMN "sourceTextHash" TEXT;

ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "extractionRunId" TEXT;
ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "canonicalKey" TEXT;
ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "normalizationRuleId" TEXT;
ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "decisionReady" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "EvidenceBenchmarkRecord" ADD COLUMN "sourceTextHash" TEXT;

UPDATE "ScientificEvidenceFact"
SET
  "decisionReady" = false,
  "extractionSource" = COALESCE("extractionSource", "factLayer")
WHERE "factLayer" = 'ingestion_claim_placeholder';

UPDATE "EvidenceBenchmarkRecord"
SET "decisionReady" = false
WHERE jsonb_extract_path_text("payload", 'source') = 'ingestion_claim_placeholder';

CREATE TABLE "EvidenceCanonicalizationRun" (
  "id" TEXT NOT NULL,
  "triggerMode" TEXT NOT NULL,
  "status" "IngestionRunStatus" NOT NULL,
  "targetTotal" INTEGER,
  "batchSize" INTEGER,
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
  "recordsCanonicalExtracted" INTEGER NOT NULL DEFAULT 0,
  "recordsInsufficientSource" INTEGER NOT NULL DEFAULT 0,
  "recordsNeedsFullText" INTEGER NOT NULL DEFAULT 0,
  "recordsNeedsReview" INTEGER NOT NULL DEFAULT 0,
  "recordsFailed" INTEGER NOT NULL DEFAULT 0,
  "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
  "canonicalFactsStored" INTEGER NOT NULL DEFAULT 0,
  "benchmarkRecordsStored" INTEGER NOT NULL DEFAULT 0,
  "checkpoint" JSONB,
  "summary" JSONB NOT NULL,
  "failureDetail" JSONB,
  "snapshotCutoff" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceCanonicalizationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceBenchmarkAggregate" (
  "id" TEXT NOT NULL,
  "extractionRunId" TEXT,
  "systemType" TEXT,
  "application" TEXT,
  "componentType" TEXT,
  "material" TEXT,
  "membraneSeparator" TEXT,
  "operatingConditionKey" TEXT,
  "metricType" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "normalizedUnit" TEXT NOT NULL,
  "publicationYear" INTEGER,
  "evidenceQuality" TEXT,
  "scale" TEXT,
  "trl" INTEGER,
  "recordCount" INTEGER NOT NULL,
  "minValue" DOUBLE PRECISION,
  "p25Value" DOUBLE PRECISION,
  "medianValue" DOUBLE PRECISION,
  "p75Value" DOUBLE PRECISION,
  "p90Value" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "meanValue" DOUBLE PRECISION,
  "confidenceCoverage" DOUBLE PRECISION,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceBenchmarkAggregate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScientificEvidenceFact_extractionRunId_idx" ON "ScientificEvidenceFact"("extractionRunId");
CREATE INDEX "ScientificEvidenceFact_canonicalKey_idx" ON "ScientificEvidenceFact"("canonicalKey");
CREATE INDEX "ScientificEvidenceFact_decisionReady_metricType_idx" ON "ScientificEvidenceFact"("decisionReady", "metricType");
CREATE INDEX "ScientificEvidenceFact_sourceTextHash_idx" ON "ScientificEvidenceFact"("sourceTextHash");
CREATE INDEX "ScientificEvidenceFact_confidence_idx" ON "ScientificEvidenceFact"("confidence");

CREATE INDEX "EvidenceBenchmarkRecord_extractionRunId_idx" ON "EvidenceBenchmarkRecord"("extractionRunId");
CREATE INDEX "EvidenceBenchmarkRecord_canonicalKey_normalizedUnit_idx" ON "EvidenceBenchmarkRecord"("canonicalKey", "normalizedUnit");
CREATE INDEX "EvidenceBenchmarkRecord_decisionReady_metricType_idx" ON "EvidenceBenchmarkRecord"("decisionReady", "metricType");
CREATE INDEX "EvidenceBenchmarkRecord_sourceTextHash_idx" ON "EvidenceBenchmarkRecord"("sourceTextHash");

CREATE INDEX "EvidenceCanonicalizationRun_triggerMode_status_updatedAt_idx" ON "EvidenceCanonicalizationRun"("triggerMode", "status", "updatedAt");
CREATE INDEX "EvidenceCanonicalizationRun_status_updatedAt_idx" ON "EvidenceCanonicalizationRun"("status", "updatedAt");
CREATE INDEX "EvidenceCanonicalizationRun_snapshotCutoff_idx" ON "EvidenceCanonicalizationRun"("snapshotCutoff");

CREATE INDEX "EvidenceBenchmarkAggregate_extractionRunId_idx" ON "EvidenceBenchmarkAggregate"("extractionRunId");
CREATE INDEX "EvidenceBenchmarkAggregate_canonicalKey_normalizedUnit_idx" ON "EvidenceBenchmarkAggregate"("canonicalKey", "normalizedUnit");
CREATE INDEX "EvidenceBenchmarkAggregate_systemType_componentType_material_idx" ON "EvidenceBenchmarkAggregate"("systemType", "componentType", "material");
CREATE INDEX "EvidenceBenchmarkAggregate_metricType_normalizedUnit_idx" ON "EvidenceBenchmarkAggregate"("metricType", "normalizedUnit");
CREATE INDEX "EvidenceBenchmarkAggregate_publicationYear_idx" ON "EvidenceBenchmarkAggregate"("publicationYear");
CREATE INDEX "EvidenceBenchmarkAggregate_evidenceQuality_idx" ON "EvidenceBenchmarkAggregate"("evidenceQuality");
CREATE INDEX "EvidenceBenchmarkAggregate_scale_idx" ON "EvidenceBenchmarkAggregate"("scale");
CREATE INDEX "EvidenceBenchmarkAggregate_trl_idx" ON "EvidenceBenchmarkAggregate"("trl");

ALTER TABLE "ScientificEvidenceFact"
ADD CONSTRAINT "ScientificEvidenceFact_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "EvidenceCanonicalizationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceBenchmarkRecord"
ADD CONSTRAINT "EvidenceBenchmarkRecord_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "EvidenceCanonicalizationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceBenchmarkAggregate"
ADD CONSTRAINT "EvidenceBenchmarkAggregate_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "EvidenceCanonicalizationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
