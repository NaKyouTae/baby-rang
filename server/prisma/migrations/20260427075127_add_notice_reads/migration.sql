-- CreateTable
CREATE TABLE "notice_reads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notice_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notice_reads_userId_idx" ON "notice_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notice_reads_userId_noticeId_key" ON "notice_reads"("userId", "noticeId");

-- AddForeignKey
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notice_reads" ADD CONSTRAINT "notice_reads_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
