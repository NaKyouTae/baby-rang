-- 보상형 광고 시청 기록. AdMob 서버 콜백(SSV)이 확인돼야 보석을 준다.
CREATE TABLE "ad_rewards" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardedAt" TIMESTAMP(3),

    CONSTRAINT "ad_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_rewards_transactionId_key" ON "ad_rewards"("transactionId");
CREATE INDEX "ad_rewards_groupId_createdAt_idx" ON "ad_rewards"("groupId", "createdAt");

ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
