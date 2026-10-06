-- 재화 입출금 원장.
-- groups.coins 는 빨리 읽으려고 둔 잔액 캐시이고, 사실은 이 원장이 진짜다.
CREATE TABLE "coin_ledgers" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "paymentId" TEXT,
    "itemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_ledgers_pkey" PRIMARY KEY ("id")
);

-- 결제 한 건이 두 번 적립되는 사고를 막는다.
CREATE UNIQUE INDEX "coin_ledgers_paymentId_key" ON "coin_ledgers"("paymentId");
CREATE INDEX "coin_ledgers_groupId_createdAt_idx" ON "coin_ledgers"("groupId", "createdAt");

ALTER TABLE "coin_ledgers" ADD CONSTRAINT "coin_ledgers_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
