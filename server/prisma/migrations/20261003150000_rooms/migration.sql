-- 아이 방과 그 안에 놓인 가구.
-- 카탈로그(room_items)는 "그게 무엇인가", 여기는 "어디에 놓였는가"를 들고 있다.

CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    -- 방 전체 배경. 좌표가 없어 배치가 아니라 방의 속성으로 둔다.
    "roomItemId" TEXT,
    -- 공동 양육자가 동시에 편집할 때 덮어쓰기를 막는 낙관적 잠금
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rooms_childId_key" ON "rooms"("childId");
CREATE INDEX "rooms_roomItemId_idx" ON "rooms"("roomItemId");

CREATE TABLE "room_placements" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    -- 타일 좌표. 픽셀로 저장하면 타일 크기나 기기가 바뀔 때 전부 어긋난다.
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "direction" "RoomDirection" NOT NULL DEFAULT 'SOUTH',
    "flipX" BOOLEAN NOT NULL DEFAULT false,
    "zOffset" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_placements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "room_placements_roomId_idx" ON "room_placements"("roomId");
CREATE INDEX "room_placements_itemId_idx" ON "room_placements"("itemId");

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_childId_fkey"
    FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomItemId_fkey"
    FOREIGN KEY ("roomItemId") REFERENCES "room_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "room_placements" ADD CONSTRAINT "room_placements_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "room_placements" ADD CONSTRAINT "room_placements_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "room_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
