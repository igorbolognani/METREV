-- Production-scale scientific evidence ingestion and decision database support.
-- This migration is additive: existing source records, catalog items, claims,
-- and analyst decisions are preserved.

ALTER TABLE "ExternalSourceRecord"
ADD COLUMN "normalizedTitle" TEXT,
ADD COLUMN "publicationYear" INTEGER,
ADD COLUMN "firstAuthor" TEXT,
ADD COLUMN "sourceIdentifier" TEXT,
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "metadataHash" TEXT;

UPDATE "ExternalSourceRecord"
SET
  "normalizedTitle" = NULLIF(
    trim(regexp_replace(lower("title"), '[^[:alnum:]]+', ' ', 'g')),
    ''
  ),
  "publicationYear" = EXTRACT(YEAR FROM "publishedAt")::INTEGER,
  "sourceIdentifier" = COALESCE(NULLIF("doi", ''), NULLIF("sourceUrl", ''), "sourceKey"),
  "metadataHash" = md5(
    COALESCE("doi", '') || '|' ||
    COALESCE("sourceUrl", '') || '|' ||
    COALESCE("title", '') || '|' ||
    COALESCE("publisher", '') || '|' ||
    COALESCE("journal", '')
  )
WHERE "normalizedTitle" IS NULL
   OR "publicationYear" IS NULL
   OR "sourceIdentifier" IS NULL
   OR "metadataHash" IS NULL;

ALTER TABLE "ExternalEvidenceCatalogItem"
ADD COLUMN "acceptedBy" TEXT,
ADD COLUMN "acceptancePolicy" TEXT,
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "reviewRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "ingestionMode" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "ingestionBatchId" TEXT,
ADD COLUMN "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "normalizationStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "evidenceQuality" TEXT,
ADD COLUMN "duplicateDecision" JSONB,
ADD COLUMN "decisionSupportMetadata" JSONB;

UPDATE "ExternalEvidenceCatalogItem"
SET
  "acceptedBy" = CASE WHEN "reviewStatus" = 'ACCEPTED' THEN 'legacy_review' ELSE NULL END,
  "acceptancePolicy" = CASE WHEN "reviewStatus" = 'ACCEPTED' THEN 'legacy_manual_acceptance_preserved' ELSE NULL END,
  "acceptedAt" = CASE WHEN "reviewStatus" = 'ACCEPTED' THEN "updatedAt" ELSE NULL END,
  "reviewRequired" = CASE WHEN "reviewStatus" = 'PENDING' THEN true ELSE false END,
  "ingestionMode" = COALESCE("ingestionMode", 'manual'),
  "extractionStatus" = CASE
    WHEN "claimCount" > 0 THEN 'heuristic_extracted'
    ELSE 'not_extracted'
  END,
  "normalizationStatus" = CASE
    WHEN "sourceState" IN ('NORMALIZED', 'REVIEWED') THEN 'normalized'
    ELSE 'pending'
  END,
  "evidenceQuality" = COALESCE(
    "payload" #>> '{veracity_score,level}',
    "payload" #>> '{metadata_quality,level}',
    "strengthLevel"
  ),
  "decisionSupportMetadata" = jsonb_build_object(
    'migration', '20260503120000_production_scale_evidence',
    'preserved_review_status', "reviewStatus",
    'structured_fact_status', CASE WHEN "claimCount" > 0 THEN 'claim_placeholders_ready' ELSE 'awaiting_extraction' END
  )
WHERE "decisionSupportMetadata" IS NULL;

ALTER TABLE "IngestionRun"
ADD COLUMN "targetTotal" INTEGER,
ADD COLUMN "batchSize" INTEGER,
ADD COLUMN "autoAccept" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "recordsAccepted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recordsPendingReview" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recordsRejected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recordsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "duplicatesSkipped" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "EvidenceIngestionAudit" (
  "id" TEXT NOT NULL,
  "ingestionRunId" TEXT,
  "sourceRecordId" TEXT,
  "catalogItemId" TEXT,
  "eventType" TEXT NOT NULL,
  "decision" TEXT,
  "actor" TEXT NOT NULL DEFAULT 'system',
  "reason" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvidenceIngestionAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceDuplicateDecision" (
  "id" TEXT NOT NULL,
  "ingestionRunId" TEXT,
  "matchedSourceRecordId" TEXT,
  "matchedCatalogItemId" TEXT,
  "dedupeKeyType" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvidenceDuplicateDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScientificEvidenceFact" (
  "id" TEXT NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "claimId" TEXT,
  "factLayer" TEXT NOT NULL DEFAULT 'extracted',
  "factType" TEXT NOT NULL,
  "fieldKey" TEXT NOT NULL,
  "originalValue" TEXT,
  "originalUnit" TEXT,
  "normalizedValue" DOUBLE PRECISION,
  "normalizedText" TEXT,
  "normalizedUnit" TEXT,
  "uncertainty" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
  "normalizationStatus" TEXT NOT NULL DEFAULT 'pending',
  "systemType" TEXT,
  "reactorType" TEXT,
  "componentType" TEXT,
  "material" TEXT,
  "metricType" TEXT,
  "operatingConditionKey" TEXT,
  "evidenceQuality" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScientificEvidenceFact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceBenchmarkRecord" (
  "id" TEXT NOT NULL,
  "sourceRecordId" TEXT NOT NULL,
  "catalogItemId" TEXT NOT NULL,
  "factId" TEXT,
  "systemType" TEXT,
  "application" TEXT,
  "componentType" TEXT,
  "material" TEXT,
  "membraneSeparator" TEXT,
  "operatingConditionKey" TEXT,
  "metricType" TEXT,
  "normalizedValue" DOUBLE PRECISION,
  "normalizedUnit" TEXT,
  "publicationYear" INTEGER,
  "evidenceQuality" TEXT,
  "scale" TEXT,
  "trl" INTEGER,
  "costIndicator" TEXT,
  "riskIndicator" TEXT,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EvidenceBenchmarkRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExternalSourceRecord_sourceUrl_idx" ON "ExternalSourceRecord"("sourceUrl");
CREATE INDEX "ExternalSourceRecord_normalizedTitle_publicationYear_firstAuthor_idx" ON "ExternalSourceRecord"("normalizedTitle", "publicationYear", "firstAuthor");
CREATE INDEX "ExternalSourceRecord_publicationYear_idx" ON "ExternalSourceRecord"("publicationYear");
CREATE INDEX "ExternalSourceRecord_contentHash_idx" ON "ExternalSourceRecord"("contentHash");
CREATE INDEX "ExternalSourceRecord_metadataHash_idx" ON "ExternalSourceRecord"("metadataHash");

CREATE INDEX "ExternalEvidenceCatalogItem_acceptedBy_idx" ON "ExternalEvidenceCatalogItem"("acceptedBy");
CREATE INDEX "ExternalEvidenceCatalogItem_acceptedAt_idx" ON "ExternalEvidenceCatalogItem"("acceptedAt");
CREATE INDEX "ExternalEvidenceCatalogItem_ingestionBatchId_idx" ON "ExternalEvidenceCatalogItem"("ingestionBatchId");
CREATE INDEX "ExternalEvidenceCatalogItem_reviewRequired_reviewStatus_idx" ON "ExternalEvidenceCatalogItem"("reviewRequired", "reviewStatus");
CREATE INDEX "ExternalEvidenceCatalogItem_extractionStatus_normalizationStatus_idx" ON "ExternalEvidenceCatalogItem"("extractionStatus", "normalizationStatus");
CREATE INDEX "ExternalEvidenceCatalogItem_evidenceQuality_idx" ON "ExternalEvidenceCatalogItem"("evidenceQuality");

CREATE INDEX "IngestionRun_triggerMode_status_updatedAt_idx" ON "IngestionRun"("triggerMode", "status", "updatedAt");

CREATE INDEX "EvidenceIngestionAudit_ingestionRunId_eventType_idx" ON "EvidenceIngestionAudit"("ingestionRunId", "eventType");
CREATE INDEX "EvidenceIngestionAudit_catalogItemId_eventType_idx" ON "EvidenceIngestionAudit"("catalogItemId", "eventType");
CREATE INDEX "EvidenceIngestionAudit_sourceRecordId_eventType_idx" ON "EvidenceIngestionAudit"("sourceRecordId", "eventType");
CREATE INDEX "EvidenceIngestionAudit_eventType_createdAt_idx" ON "EvidenceIngestionAudit"("eventType", "createdAt");

CREATE INDEX "EvidenceDuplicateDecision_ingestionRunId_idx" ON "EvidenceDuplicateDecision"("ingestionRunId");
CREATE INDEX "EvidenceDuplicateDecision_dedupeKeyType_dedupeKey_idx" ON "EvidenceDuplicateDecision"("dedupeKeyType", "dedupeKey");
CREATE INDEX "EvidenceDuplicateDecision_matchedSourceRecordId_idx" ON "EvidenceDuplicateDecision"("matchedSourceRecordId");
CREATE INDEX "EvidenceDuplicateDecision_matchedCatalogItemId_idx" ON "EvidenceDuplicateDecision"("matchedCatalogItemId");
CREATE INDEX "EvidenceDuplicateDecision_decision_createdAt_idx" ON "EvidenceDuplicateDecision"("decision", "createdAt");

CREATE INDEX "ScientificEvidenceFact_sourceRecordId_idx" ON "ScientificEvidenceFact"("sourceRecordId");
CREATE INDEX "ScientificEvidenceFact_catalogItemId_fieldKey_idx" ON "ScientificEvidenceFact"("catalogItemId", "fieldKey");
CREATE INDEX "ScientificEvidenceFact_claimId_idx" ON "ScientificEvidenceFact"("claimId");
CREATE INDEX "ScientificEvidenceFact_systemType_idx" ON "ScientificEvidenceFact"("systemType");
CREATE INDEX "ScientificEvidenceFact_reactorType_idx" ON "ScientificEvidenceFact"("reactorType");
CREATE INDEX "ScientificEvidenceFact_componentType_material_idx" ON "ScientificEvidenceFact"("componentType", "material");
CREATE INDEX "ScientificEvidenceFact_metricType_idx" ON "ScientificEvidenceFact"("metricType");
CREATE INDEX "ScientificEvidenceFact_operatingConditionKey_idx" ON "ScientificEvidenceFact"("operatingConditionKey");
CREATE INDEX "ScientificEvidenceFact_evidenceQuality_idx" ON "ScientificEvidenceFact"("evidenceQuality");
CREATE INDEX "ScientificEvidenceFact_extractionStatus_normalizationStatus_idx" ON "ScientificEvidenceFact"("extractionStatus", "normalizationStatus");
CREATE INDEX "ScientificEvidenceFact_createdAt_idx" ON "ScientificEvidenceFact"("createdAt");

CREATE INDEX "EvidenceBenchmarkRecord_sourceRecordId_idx" ON "EvidenceBenchmarkRecord"("sourceRecordId");
CREATE INDEX "EvidenceBenchmarkRecord_catalogItemId_idx" ON "EvidenceBenchmarkRecord"("catalogItemId");
CREATE INDEX "EvidenceBenchmarkRecord_factId_idx" ON "EvidenceBenchmarkRecord"("factId");
CREATE INDEX "EvidenceBenchmarkRecord_systemType_application_idx" ON "EvidenceBenchmarkRecord"("systemType", "application");
CREATE INDEX "EvidenceBenchmarkRecord_componentType_material_idx" ON "EvidenceBenchmarkRecord"("componentType", "material");
CREATE INDEX "EvidenceBenchmarkRecord_membraneSeparator_idx" ON "EvidenceBenchmarkRecord"("membraneSeparator");
CREATE INDEX "EvidenceBenchmarkRecord_operatingConditionKey_idx" ON "EvidenceBenchmarkRecord"("operatingConditionKey");
CREATE INDEX "EvidenceBenchmarkRecord_metricType_normalizedUnit_idx" ON "EvidenceBenchmarkRecord"("metricType", "normalizedUnit");
CREATE INDEX "EvidenceBenchmarkRecord_publicationYear_idx" ON "EvidenceBenchmarkRecord"("publicationYear");
CREATE INDEX "EvidenceBenchmarkRecord_evidenceQuality_idx" ON "EvidenceBenchmarkRecord"("evidenceQuality");
CREATE INDEX "EvidenceBenchmarkRecord_scale_idx" ON "EvidenceBenchmarkRecord"("scale");
CREATE INDEX "EvidenceBenchmarkRecord_trl_idx" ON "EvidenceBenchmarkRecord"("trl");

ALTER TABLE "EvidenceIngestionAudit" ADD CONSTRAINT "EvidenceIngestionAudit_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceIngestionAudit" ADD CONSTRAINT "EvidenceIngestionAudit_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceIngestionAudit" ADD CONSTRAINT "EvidenceIngestionAudit_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ExternalEvidenceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceDuplicateDecision" ADD CONSTRAINT "EvidenceDuplicateDecision_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceDuplicateDecision" ADD CONSTRAINT "EvidenceDuplicateDecision_matchedSourceRecordId_fkey" FOREIGN KEY ("matchedSourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceDuplicateDecision" ADD CONSTRAINT "EvidenceDuplicateDecision_matchedCatalogItemId_fkey" FOREIGN KEY ("matchedCatalogItemId") REFERENCES "ExternalEvidenceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScientificEvidenceFact" ADD CONSTRAINT "ScientificEvidenceFact_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScientificEvidenceFact" ADD CONSTRAINT "ScientificEvidenceFact_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ExternalEvidenceCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScientificEvidenceFact" ADD CONSTRAINT "ScientificEvidenceFact_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EvidenceClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EvidenceBenchmarkRecord" ADD CONSTRAINT "EvidenceBenchmarkRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceBenchmarkRecord" ADD CONSTRAINT "EvidenceBenchmarkRecord_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ExternalEvidenceCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceBenchmarkRecord" ADD CONSTRAINT "EvidenceBenchmarkRecord_factId_fkey" FOREIGN KEY ("factId") REFERENCES "ScientificEvidenceFact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
