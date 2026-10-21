-- 가구를 옆으로 돌려 놓기 — 아이템에 옆모습 그림·칸 수, 배치에 방향을 둔다.
-- 기존 배치는 모두 정면(FRONT)이라 지금 꾸며 둔 방은 그대로 보인다.
CREATE TYPE "RoomFacing" AS ENUM ('FRONT', 'SIDE');

ALTER TABLE "room_items" ADD COLUMN "sideImageUrl" TEXT,
ADD COLUMN "sideTileW" INTEGER,
ADD COLUMN "sideTileH" INTEGER;

ALTER TABLE "room_placements" ADD COLUMN "facing" "RoomFacing" NOT NULL DEFAULT 'FRONT';
