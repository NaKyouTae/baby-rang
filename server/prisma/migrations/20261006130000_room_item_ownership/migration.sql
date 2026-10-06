-- 꾸미기 재화와 보유 목록.
-- 아이가 아니라 그룹이 갖는다 — 둘째가 태어났다고 가구를 다시 살 이유가 없다.
ALTER TABLE "groups" ADD COLUMN "coins" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "room_item_ownerships" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "source" "RoomItemUnlock" NOT NULL DEFAULT 'PURCHASE',
    -- 살 때 낸 금액. 나중에 가격이 바뀌어도 거래 기록은 그대로 남아야 한다.
    "pricePaid" INTEGER,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_item_ownerships_pkey" PRIMARY KEY ("id")
);

-- 같은 아이템을 두 번 사지 못하게 막는다.
CREATE UNIQUE INDEX "room_item_ownerships_groupId_itemId_key" ON "room_item_ownerships"("groupId", "itemId");
CREATE INDEX "room_item_ownerships_groupId_idx" ON "room_item_ownerships"("groupId");

ALTER TABLE "room_item_ownerships" ADD CONSTRAINT "room_item_ownerships_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_item_ownerships" ADD CONSTRAINT "room_item_ownerships_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "room_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
