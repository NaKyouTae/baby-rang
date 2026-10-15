-- 꾸미기 아이템은 가격만으로 무료/유료를 가린다. 획득 방법(unlock)은 없앤다.
-- 보상·이벤트로 주는 경로는 만든 적이 없고, 판단은 늘 'FREE 인가' 하나뿐이었다.

-- 기본 제공이던 아이템은 가격이 적혀 있어도 무료였다. 그 뜻을 그대로 옮긴다.
UPDATE "room_items" SET "priceCoins" = 0 WHERE "unlock" = 'FREE' OR "priceCoins" IS NULL;

ALTER TABLE "room_items"
  ALTER COLUMN "priceCoins" SET DEFAULT 0,
  ALTER COLUMN "priceCoins" SET NOT NULL,
  DROP COLUMN "unlock";

-- 보유는 이제 구매로만 생긴다. 어떻게 얻었는지 따로 적을 필요가 없다.
ALTER TABLE "room_item_ownerships" DROP COLUMN "source";

DROP TYPE "RoomItemUnlock";
