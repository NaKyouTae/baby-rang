-- 보석을 받게 한 사람. 어드민 보석함에서 가족 대표 대신 실제로 기록·시청·결제한 사람을 보여준다.
ALTER TABLE "coin_ledgers" ADD COLUMN "userId" TEXT;

ALTER TABLE "coin_ledgers" ADD CONSTRAINT "coin_ledgers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 기존 행 채우기.

-- 결제: 결제한 사람.
UPDATE "coin_ledgers" l SET "userId" = p."userId"
FROM "payments" p
WHERE l."paymentId" = p."id" AND l."userId" IS NULL;

-- 가입: 그룹을 만든 사람(가입한 본인).
UPDATE "coin_ledgers" l SET "userId" = g."ownerId"
FROM "groups" g
WHERE l."groupId" = g."id" AND l."reason" = 'SIGNUP' AND l."userId" IS NULL;

-- 광고: 같은 가족의 지급된 시청 건 중 지급 시각이 가장 가까운 것.
UPDATE "coin_ledgers" l SET "userId" = (
    SELECT a."userId" FROM "ad_rewards" a
    WHERE a."groupId" = l."groupId" AND a."status" = 'REWARDED'
      AND a."rewardedAt" BETWEEN l."createdAt" - INTERVAL '1 minute' AND l."createdAt" + INTERVAL '1 minute'
    ORDER BY ABS(EXTRACT(EPOCH FROM a."rewardedAt" - l."createdAt"))
    LIMIT 1
)
WHERE l."reason" = 'AD_REWARD' AND l."userId" IS NULL;

-- 기록 보상: 같은 트랜잭션에서 만든 기록이라 createdAt 이 (거의) 같다. 가장 가까운 기록의 작성자.
UPDATE "coin_ledgers" l SET "userId" = (
    SELECT r."userId" FROM (
        SELECT gr."userId", gr."createdAt" FROM "growth_records" gr
        JOIN "children" c ON c."id" = gr."childId"
        WHERE c."groupId" = l."groupId"
          AND gr."createdAt" BETWEEN l."createdAt" - INTERVAL '1 minute' AND l."createdAt" + INTERVAL '1 minute'
        UNION ALL
        SELECT pg."userId", pg."createdAt" FROM "physical_growths" pg
        JOIN "children" c ON c."id" = pg."childId"
        WHERE c."groupId" = l."groupId"
          AND pg."createdAt" BETWEEN l."createdAt" - INTERVAL '1 minute' AND l."createdAt" + INTERVAL '1 minute'
    ) r
    WHERE r."userId" IS NOT NULL
    ORDER BY ABS(EXTRACT(EPOCH FROM r."createdAt" - l."createdAt"))
    LIMIT 1
)
WHERE l."reason" = 'REWARD' AND l."userId" IS NULL;
