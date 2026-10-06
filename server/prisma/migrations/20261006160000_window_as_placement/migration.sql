-- 창문을 고정 슬롯에서 배치로 옮긴다.
-- 벽 아무 데나 걸 수 있어야 해서 더 이상 방의 속성이 아니다.

-- 이미 걸어 둔 창문은 벽 왼쪽 위에 배치로 옮겨 둔다. 그냥 컬럼을 지우면 사라진다.
INSERT INTO "room_placements" ("id", "roomId", "itemId", "tileX", "tileY", "direction", "flipX", "zOffset", "createdAt")
SELECT gen_random_uuid()::text, r."id", r."windowItemId", 1, 2, 'SOUTH', false, 0, CURRENT_TIMESTAMP
FROM "rooms" r
WHERE r."windowItemId" IS NOT NULL;

ALTER TABLE "rooms" DROP CONSTRAINT IF EXISTS "rooms_windowItemId_fkey";
ALTER TABLE "rooms" DROP COLUMN IF EXISTS "windowItemId";
