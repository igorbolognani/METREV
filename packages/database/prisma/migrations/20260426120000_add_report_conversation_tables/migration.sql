CREATE TABLE "ReportConversationSession" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "reportSnapshotId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportConversationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportConversationTurn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "selectedSection" TEXT,
    "message" TEXT NOT NULL,
    "narrativeMetadata" JSONB,
    "citations" JSONB,
    "grounding" JSONB,
    "refusalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportConversationTurn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportConversationSession_evaluationId_createdAt_idx" ON "ReportConversationSession"("evaluationId", "createdAt");

CREATE INDEX "ReportConversationTurn_conversationId_createdAt_idx" ON "ReportConversationTurn"("conversationId", "createdAt");

ALTER TABLE "ReportConversationSession" ADD CONSTRAINT "ReportConversationSession_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EvaluationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportConversationTurn" ADD CONSTRAINT "ReportConversationTurn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ReportConversationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

