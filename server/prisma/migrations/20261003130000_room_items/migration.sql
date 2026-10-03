-- 방 꾸미기 아이템 마스터 카탈로그.
-- 운영자가 어드민에서 등록·수정하고, 앱은 여기 등록된 것만 방에 놓을 수 있다.
-- 사용자가 어디에 놓았는지(배치)는 별도 테이블이며 여기에는 "그게 무엇인가"만 둔다.

CREATE TYPE "RoomItemCategory" AS ENUM ('FURNITURE', 'DECOR', 'RUG', 'WINDOW', 'TOY', 'WALLPAPER', 'FLOORING');

-- 어디에 붙는가. 벽에 거는 것과 바닥에 놓는 것은 좌표의 의미가 다르다.
CREATE TYPE "RoomSurface" AS ENUM ('FLOOR', 'WALL', 'ON_TOP');

CREATE TYPE "RoomItemUnlock" AS ENUM ('FREE', 'REWARD', 'PURCHASE', 'EVENT');

-- 픽셀 스프라이트는 방향별 그림이 따로 있다. 임의 각도 회전이 불가능하므로 4방향만 둔다.
CREATE TYPE "RoomDirection" AS ENUM ('SOUTH', 'EAST', 'NORTH', 'WEST');

-- 그림이 실시간 데이터로 바뀌는 슬롯. 창문은 현재 날씨·시간대를 그린다.
CREATE TYPE "RoomDynamicSlot" AS ENUM ('WEATHER', 'PHOTO', 'GROWTH');

CREATE TABLE "room_items" (
    "id" TEXT NOT NULL,
    "spriteKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "RoomItemCategory" NOT NULL,
    "surface" "RoomSurface" NOT NULL DEFAULT 'FLOOR',
    "tileW" INTEGER NOT NULL DEFAULT 1,
    "tileH" INTEGER NOT NULL DEFAULT 1,
    "spriteLiftY" INTEGER NOT NULL DEFAULT 0,
    "directions" "RoomDirection"[] DEFAULT ARRAY['SOUTH']::"RoomDirection"[],
    "flippable" BOOLEAN NOT NULL DEFAULT false,
    "canStack" BOOLEAN NOT NULL DEFAULT false,
    "dynamicSlot" "RoomDynamicSlot",
    "imageUrl" TEXT,
    "unlock" "RoomItemUnlock" NOT NULL DEFAULT 'FREE',
    "priceCoins" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_items_pkey" PRIMARY KEY ("id")
);

-- 코드가 스프라이트를 찾는 키. 표시 이름이 바뀌어도 이건 고정이라 유니크여야 한다.
CREATE UNIQUE INDEX "room_items_spriteKey_key" ON "room_items"("spriteKey");

-- 꾸미기 화면이 분류별로 "지금 노출되는 것"만 읽는 경로에 맞춘 인덱스.
CREATE INDEX "room_items_category_isActive_idx" ON "room_items"("category", "isActive");
