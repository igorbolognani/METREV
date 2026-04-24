-- CreateEnum
CREATE TYPE "ResearchReviewStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResearchExtractionJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ResearchExtractionResultStatus" AS ENUM ('VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "ResearchEvidencePackStatus" AS ENUM ('DRAFT', 'REVIEWED');

-- CreateTable
CREATE TABLE "ResearchReview" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" "ResearchReviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReviewPaper" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadataSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchReviewPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReviewColumn" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "columnGroup" TEXT NOT NULL,
    "columnType" TEXT NOT NULL,
    "answerStructure" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "outputSchemaKey" TEXT NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchReviewColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchExtractionJob" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "status" "ResearchExtractionJobStatus" NOT NULL DEFAULT 'QUEUED',
    "extractorVersion" TEXT NOT NULL,
    "failureDetail" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchExtractionResult" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "status" "ResearchExtractionResultStatus" NOT NULL,
    "answer" JSONB NOT NULL,
    "evidenceTrace" JSONB NOT NULL,
    "confidence" TEXT NOT NULL,
    "missingFields" TEXT[],
    "validationErrors" TEXT[],
    "normalizedPayload" JSONB NOT NULL,
    "extractorVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchExtractionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEvidencePack" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ResearchEvidencePackStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceResultIds" TEXT[],
    "payload" JSONB NOT NULL,
    "decisionInput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchEvidencePack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchReview_status_updatedAt_idx" ON "ResearchReview"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ResearchReviewPaper_sourceRecordId_idx" ON "ResearchReviewPaper"("sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchReviewPaper_reviewId_sourceRecordId_key" ON "ResearchReviewPaper"("reviewId", "sourceRecordId");

-- CreateIndex
CREATE INDEX "ResearchReviewColumn_reviewId_visible_position_idx" ON "ResearchReviewColumn"("reviewId", "visible", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchReviewColumn_reviewId_columnId_key" ON "ResearchReviewColumn"("reviewId", "columnId");

-- CreateIndex
CREATE INDEX "ResearchExtractionJob_reviewId_status_createdAt_idx" ON "ResearchExtractionJob"("reviewId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchExtractionJob_paperId_columnId_key" ON "ResearchExtractionJob"("paperId", "columnId");

-- CreateIndex
CREATE INDEX "ResearchExtractionResult_reviewId_status_idx" ON "ResearchExtractionResult"("reviewId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchExtractionResult_paperId_columnId_key" ON "ResearchExtractionResult"("paperId", "columnId");

-- CreateIndex
CREATE INDEX "ResearchEvidencePack_reviewId_status_idx" ON "ResearchEvidencePack"("reviewId", "status");

-- AddForeignKey
ALTER TABLE "ResearchReviewPaper" ADD CONSTRAINT "ResearchReviewPaper_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ResearchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReviewPaper" ADD CONSTRAINT "ResearchReviewPaper_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReviewColumn" ADD CONSTRAINT "ResearchReviewColumn_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ResearchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionJob" ADD CONSTRAINT "ResearchExtractionJob_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ResearchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionJob" ADD CONSTRAINT "ResearchExtractionJob_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchReviewPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionJob" ADD CONSTRAINT "ResearchExtractionJob_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ResearchReviewColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionResult" ADD CONSTRAINT "ResearchExtractionResult_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ResearchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionResult" ADD CONSTRAINT "ResearchExtractionResult_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchReviewPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExtractionResult" ADD CONSTRAINT "ResearchExtractionResult_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ResearchReviewColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvidencePack" ADD CONSTRAINT "ResearchEvidencePack_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ResearchReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
