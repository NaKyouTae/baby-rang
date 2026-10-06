-- 방 타입(ROOM) 제거.
--
-- 방은 하나뿐이고 그 안의 벽지·바닥만 교체하는 구조로 정리했다.
-- 방 전체 배경 그림이라는 개념이 사라져 분류와 컬럼을 같이 걷어낸다.

-- 이미 등록된 방 타입 아이템은 벽지로 옮긴다. 지우면 그 아이템을 쓰던 방이 깨진다.
UPDATE "room_items" SET "category" = 'WALLPAPER' WHERE "category" = 'ROOM';

-- 방 배경 슬롯 제거
ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_roomItemId_fkey";
DROP INDEX IF EXISTS "rooms_roomItemId_idx";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "roomItemId";

-- Postgres 는 enum 값을 지울 수 없어 타입을 다시 만든다.
ALTER TYPE "RoomItemCategory" RENAME TO "RoomItemCategory_old";
CREATE TYPE "RoomItemCategory" AS ENUM ('FURNITURE', 'DECOR', 'RUG', 'WINDOW', 'TOY', 'WALLPAPER', 'FLOORING', 'BED');
ALTER TABLE "room_items"
  ALTER COLUMN "category" TYPE "RoomItemCategory"
  USING ("category"::text::"RoomItemCategory");
DROP TYPE "RoomItemCategory_old";
