-- CreateEnum
CREATE TYPE "ExternalSourceType" AS ENUM ('OPENALEX', 'CROSSREF', 'SUPPLIER_PROFILE', 'MARKET_SNAPSHOT', 'MANUAL');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExternalSourceState" AS ENUM ('RAW', 'PARSED', 'NORMALIZED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ExternalEvidenceReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ExternalSourceRecord" (
    "id" TEXT NOT NULL,
    "sourceType" "ExternalSourceType" NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "sourceCategory" TEXT,
    "doi" TEXT,
    "publisher" TEXT,
    "publishedAt" TIMESTAMP(3),
    "asOf" TIMESTAMP(3),
    "abstractText" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalEvidenceCatalogItem" (
    "id" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengthLevel" TEXT NOT NULL,
    "provenanceNote" TEXT NOT NULL,
    "reviewStatus" "ExternalEvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "sourceState" "ExternalSourceState" NOT NULL DEFAULT 'PARSED',
    "applicabilityScope" JSONB NOT NULL,
    "extractedClaims" JSONB NOT NULL,
    "tags" TEXT[],
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalEvidenceCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "sourceType" "ExternalSourceType" NOT NULL,
    "triggerMode" TEXT NOT NULL,
    "query" TEXT,
    "status" "IngestionRunStatus" NOT NULL,
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsStored" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalSourceRecord_sourceType_publishedAt_idx" ON "ExternalSourceRecord"("sourceType", "publishedAt");

-- CreateIndex
CREATE INDEX "ExternalSourceRecord_doi_idx" ON "ExternalSourceRecord"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSourceRecord_sourceType_sourceKey_key" ON "ExternalSourceRecord"("sourceType", "sourceKey");

-- CreateIndex
CREATE INDEX "ExternalEvidenceCatalogItem_reviewStatus_evidenceType_idx" ON "ExternalEvidenceCatalogItem"("reviewStatus", "evidenceType");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEvidenceCatalogItem_sourceRecordId_evidenceType_tit_key" ON "ExternalEvidenceCatalogItem"("sourceRecordId", "evidenceType", "title");

-- CreateIndex
CREATE INDEX "IngestionRun_sourceType_startedAt_idx" ON "IngestionRun"("sourceType", "startedAt");

-- AddForeignKey
ALTER TABLE "ExternalEvidenceCatalogItem" ADD CONSTRAINT "ExternalEvidenceCatalogItem_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
