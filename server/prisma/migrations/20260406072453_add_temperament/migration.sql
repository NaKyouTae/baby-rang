-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('newborn', 'before_first', 'after_first');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'PARTIAL_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProductType" AS ENUM ('TEMPERAMENT_REPORT', 'WONDER_WEEKS_PREMIUM', 'NURSING_ROOM_PREMIUM', 'OTHER');

-- CreateTable
CREATE TABLE "temperament_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "ageGroup" "AgeGroup" NOT NULL,
    "childAge" INTEGER,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temperament_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperament_answers" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionNo" INTEGER NOT NULL,
    "dimension" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temperament_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temperament_results" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "primaryType" TEXT NOT NULL,
    "primaryTypeLabel" TEXT NOT NULL,
    "emotionModifier" BOOLEAN NOT NULL DEFAULT false,
    "isReliable" BOOLEAN NOT NULL DEFAULT true,
    "reliabilityMsg" TEXT,
    "scores" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "freeContent" JSONB NOT NULL,
    "paidContent" JSONB,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temperament_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childId" TEXT,
    "orderId" TEXT NOT NULL,
    "productType" "PaymentProductType" NOT NULL,
    "productName" TEXT NOT NULL,
    "productMeta" JSONB,
    "amount" INTEGER NOT NULL,
    "taxFreeAmount" INTEGER NOT NULL DEFAULT 0,
    "vatAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "method" TEXT,
    "paymentKey" TEXT,
    "transactionId" TEXT,
    "receiptUrl" TEXT,
    "cardCompany" TEXT,
    "cardNumberMask" TEXT,
    "cardInstallment" INTEGER,
    "buyerName" TEXT,
    "buyerEmail" TEXT,
    "buyerTel" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "rawRequest" JSONB,
    "rawResponse" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "amount" INTEGER,
    "reason" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "temperament_submissions_childId_completedAt_idx" ON "temperament_submissions"("childId", "completedAt");

-- CreateIndex
CREATE INDEX "temperament_submissions_userId_createdAt_idx" ON "temperament_submissions"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "temperament_answers_submissionId_questionNo_key" ON "temperament_answers"("submissionId", "questionNo");

-- CreateIndex
CREATE UNIQUE INDEX "temperament_results_submissionId_key" ON "temperament_results"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentKey_key" ON "payments"("paymentKey");

-- CreateIndex
CREATE INDEX "payments_userId_createdAt_idx" ON "payments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_productType_idx" ON "payments"("productType");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_createdAt_idx" ON "payment_events"("paymentId", "createdAt");

-- AddForeignKey
ALTER TABLE "temperament_submissions" ADD CONSTRAINT "temperament_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperament_submissions" ADD CONSTRAINT "temperament_submissions_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperament_answers" ADD CONSTRAINT "temperament_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "temperament_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temperament_results" ADD CONSTRAINT "temperament_results_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "temperament_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
