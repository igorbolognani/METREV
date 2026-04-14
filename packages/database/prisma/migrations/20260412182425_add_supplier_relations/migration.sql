-- CreateEnum
CREATE TYPE "SupplierPreferenceType" AS ENUM ('CURRENT', 'PREFERRED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "SupplierSourceState" AS ENUM ('RAW', 'PARSED', 'NORMALIZED', 'REVIEWED');

-- AlterTable
ALTER TABLE "EvidenceRecord" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "region" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseSupplierPreference" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierLabel" TEXT NOT NULL,
    "preferenceType" "SupplierPreferenceType" NOT NULL,
    "note" TEXT,
    "sourceState" "SupplierSourceState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseSupplierPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierShortlistItem" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "candidateLabel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fitNote" TEXT NOT NULL,
    "missingInformation" JSONB NOT NULL,
    "reviewStatus" "SupplierSourceState" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_normalizedName_key" ON "Supplier"("normalizedName");

-- CreateIndex
CREATE INDEX "CaseSupplierPreference_caseId_preferenceType_idx" ON "CaseSupplierPreference"("caseId", "preferenceType");

-- CreateIndex
CREATE UNIQUE INDEX "CaseSupplierPreference_caseId_preferenceType_supplierLabel_key" ON "CaseSupplierPreference"("caseId", "preferenceType", "supplierLabel");

-- CreateIndex
CREATE INDEX "SupplierShortlistItem_evaluationId_category_idx" ON "SupplierShortlistItem"("evaluationId", "category");

-- CreateIndex
CREATE INDEX "EvidenceRecord_caseId_supplierId_idx" ON "EvidenceRecord"("caseId", "supplierId");

-- AddForeignKey
ALTER TABLE "CaseSupplierPreference" ADD CONSTRAINT "CaseSupplierPreference_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseSupplierPreference" ADD CONSTRAINT "CaseSupplierPreference_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierShortlistItem" ADD CONSTRAINT "SupplierShortlistItem_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierShortlistItem" ADD CONSTRAINT "SupplierShortlistItem_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRecord" ADD CONSTRAINT "EvidenceRecord_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
