-- CreateEnum
CREATE TYPE "ExternalAccessStatus" AS ENUM ('GOLD', 'GREEN', 'HYBRID', 'BRONZE', 'CLOSED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EvidenceClaimType" AS ENUM ('METRIC', 'MATERIAL', 'ARCHITECTURE', 'CONDITION', 'LIMITATION', 'APPLICABILITY', 'ECONOMIC', 'SUPPLIER_CLAIM', 'MARKET_SIGNAL', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceExtractionMethod" AS ENUM ('MANUAL', 'LLM', 'REGEX', 'ML', 'IMPORT_RULE');

-- CreateEnum
CREATE TYPE "OntologyMappingSource" AS ENUM ('AUTO', 'ANALYST', 'IMPORT_RULE');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('PROFILE', 'DATASHEET', 'SPECIFICATION', 'CERTIFICATE', 'MARKET_BRIEF', 'CASE_STUDY', 'PATENT_FILING', 'REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "EvaluationEvidenceUsageType" AS ENUM ('ATTACHED_INPUT', 'INPUT_SUPPORT', 'DIAGNOSTIC_SUPPORT', 'RECOMMENDATION_SUPPORT', 'SUPPLIER_SUPPORT', 'REPORT_CITATION');

-- CreateEnum
CREATE TYPE "WorkspaceSnapshotType" AS ENUM ('DASHBOARD', 'EVALUATION', 'COMPARISON', 'HISTORY', 'EVIDENCE_REVIEW', 'REPORT', 'EXPORT_JSON', 'EXPORT_CSV');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExternalSourceType" ADD VALUE 'EUROPE_PMC';
ALTER TYPE "ExternalSourceType" ADD VALUE 'CURATED_MANIFEST';

-- AlterTable
ALTER TABLE "ExternalEvidenceCatalogItem" ADD COLUMN     "claimCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ExternalSourceRecord" ADD COLUMN     "accessStatus" "ExternalAccessStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "authors" JSONB,
ADD COLUMN     "hashDedup" TEXT,
ADD COLUMN     "ingestionRunId" TEXT,
ADD COLUMN     "journal" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "license" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "xmlUrl" TEXT;

-- AlterTable
ALTER TABLE "IngestionRun" ADD COLUMN     "checkpoint" JSONB,
ADD COLUMN     "failureDetail" JSONB;

-- CreateTable
CREATE TABLE "EvidenceClaim" (
    "id" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "claimType" "EvidenceClaimType" NOT NULL,
    "content" TEXT NOT NULL,
    "extractedValue" TEXT,
    "unit" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "extractionMethod" "EvidenceExtractionMethod" NOT NULL,
    "extractorVersion" TEXT NOT NULL,
    "sourceSnippet" TEXT NOT NULL,
    "sourceLocator" TEXT,
    "pageNumber" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceClaimReview" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "ExternalEvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "analystId" TEXT,
    "analystRole" TEXT,
    "analystNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceClaimReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceOntologyMapping" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "ontologyPath" TEXT NOT NULL,
    "mappingConfidence" DOUBLE PRECISION NOT NULL,
    "mappedBy" "OntologyMappingSource" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenceOntologyMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "trl" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "productId" TEXT,
    "documentType" "SupplierDocumentType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationSourceUsage" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "usageType" "EvaluationEvidenceUsageType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationSourceUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationClaimUsage" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "usageType" "EvaluationEvidenceUsageType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationClaimUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSnapshotRecord" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT,
    "caseId" TEXT,
    "snapshotType" "WorkspaceSnapshotType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceSnapshotRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceClaim_sourceRecordId_claimType_idx" ON "EvidenceClaim"("sourceRecordId", "claimType");

-- CreateIndex
CREATE INDEX "EvidenceClaim_catalogItemId_claimType_idx" ON "EvidenceClaim"("catalogItemId", "claimType");

-- CreateIndex
CREATE INDEX "EvidenceClaim_confidence_createdAt_idx" ON "EvidenceClaim"("confidence", "createdAt");

-- CreateIndex
CREATE INDEX "EvidenceClaimReview_claimId_status_idx" ON "EvidenceClaimReview"("claimId", "status");

-- CreateIndex
CREATE INDEX "EvidenceClaimReview_status_reviewedAt_idx" ON "EvidenceClaimReview"("status", "reviewedAt");

-- CreateIndex
CREATE INDEX "EvidenceOntologyMapping_ontologyPath_idx" ON "EvidenceOntologyMapping"("ontologyPath");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceOntologyMapping_claimId_ontologyPath_key" ON "EvidenceOntologyMapping"("claimId", "ontologyPath");

-- CreateIndex
CREATE INDEX "SupplierProduct_supplierId_category_idx" ON "SupplierProduct"("supplierId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productKey_key" ON "SupplierProduct"("supplierId", "productKey");

-- CreateIndex
CREATE INDEX "SupplierDocument_productId_documentType_idx" ON "SupplierDocument"("productId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierDocument_supplierId_sourceRecordId_key" ON "SupplierDocument"("supplierId", "sourceRecordId");

-- CreateIndex
CREATE INDEX "EvaluationSourceUsage_sourceRecordId_usageType_idx" ON "EvaluationSourceUsage"("sourceRecordId", "usageType");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationSourceUsage_evaluationId_sourceRecordId_usageType_key" ON "EvaluationSourceUsage"("evaluationId", "sourceRecordId", "usageType");

-- CreateIndex
CREATE INDEX "EvaluationClaimUsage_claimId_usageType_idx" ON "EvaluationClaimUsage"("claimId", "usageType");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationClaimUsage_evaluationId_claimId_usageType_key" ON "EvaluationClaimUsage"("evaluationId", "claimId", "usageType");

-- CreateIndex
CREATE INDEX "WorkspaceSnapshotRecord_snapshotType_createdAt_idx" ON "WorkspaceSnapshotRecord"("snapshotType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSnapshotRecord_evaluationId_snapshotType_key" ON "WorkspaceSnapshotRecord"("evaluationId", "snapshotType");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSnapshotRecord_caseId_snapshotType_key" ON "WorkspaceSnapshotRecord"("caseId", "snapshotType");

-- CreateIndex
CREATE INDEX "ExternalSourceRecord_ingestionRunId_idx" ON "ExternalSourceRecord"("ingestionRunId");

-- CreateIndex
CREATE INDEX "ExternalSourceRecord_hashDedup_idx" ON "ExternalSourceRecord"("hashDedup");

-- AddForeignKey
ALTER TABLE "ExternalSourceRecord" ADD CONSTRAINT "ExternalSourceRecord_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaim" ADD CONSTRAINT "EvidenceClaim_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaim" ADD CONSTRAINT "EvidenceClaim_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ExternalEvidenceCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceClaimReview" ADD CONSTRAINT "EvidenceClaimReview_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EvidenceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceOntologyMapping" ADD CONSTRAINT "EvidenceOntologyMapping_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EvidenceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "SupplierProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationSourceUsage" ADD CONSTRAINT "EvaluationSourceUsage_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationSourceUsage" ADD CONSTRAINT "EvaluationSourceUsage_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationClaimUsage" ADD CONSTRAINT "EvaluationClaimUsage_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationClaimUsage" ADD CONSTRAINT "EvaluationClaimUsage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "EvidenceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSnapshotRecord" ADD CONSTRAINT "WorkspaceSnapshotRecord_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSnapshotRecord" ADD CONSTRAINT "WorkspaceSnapshotRecord_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
