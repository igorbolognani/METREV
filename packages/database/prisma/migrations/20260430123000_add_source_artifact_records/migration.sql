-- CreateTable
CREATE TABLE "SourceArtifactRecord" (
    "id" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "localPath" TEXT,
    "fileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,
    "pageCount" INTEGER,
    "extractionMethod" TEXT NOT NULL,
    "ingestionStatus" TEXT NOT NULL,
    "title" TEXT,
    "doi" TEXT,
    "license" TEXT,
    "accessStatus" "ExternalAccessStatus" NOT NULL DEFAULT 'UNKNOWN',
    "metadataQuality" JSONB NOT NULL,
    "veracityScore" JSONB NOT NULL,
    "failureMessage" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceArtifactRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceTextChunkRecord" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "pageNumber" INTEGER,
    "text" TEXT NOT NULL,
    "sourceLocator" TEXT NOT NULL,
    "charStart" INTEGER,
    "charEnd" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceTextChunkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceArtifactRecord_fileHash_key" ON "SourceArtifactRecord"("fileHash");

-- CreateIndex
CREATE INDEX "SourceArtifactRecord_sourceRecordId_idx" ON "SourceArtifactRecord"("sourceRecordId");

-- CreateIndex
CREATE INDEX "SourceArtifactRecord_ingestionStatus_importedAt_idx" ON "SourceArtifactRecord"("ingestionStatus", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceTextChunkRecord_artifactId_chunkIndex_key" ON "SourceTextChunkRecord"("artifactId", "chunkIndex");

-- CreateIndex
CREATE INDEX "SourceTextChunkRecord_sourceRecordId_pageNumber_idx" ON "SourceTextChunkRecord"("sourceRecordId", "pageNumber");

-- AddForeignKey
ALTER TABLE "SourceArtifactRecord" ADD CONSTRAINT "SourceArtifactRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceTextChunkRecord" ADD CONSTRAINT "SourceTextChunkRecord_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "SourceArtifactRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceTextChunkRecord" ADD CONSTRAINT "SourceTextChunkRecord_sourceRecordId_fkey" FOREIGN KEY ("sourceRecordId") REFERENCES "ExternalSourceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
