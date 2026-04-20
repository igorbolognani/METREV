-- AlterTable
ALTER TABLE "EvaluationRecord"
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationRecord_idempotencyKey_key" ON "EvaluationRecord"("idempotencyKey");
