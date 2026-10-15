-- 아이템 쓰임새 — 홈 아기가 방에 놓인 아이템에 맞춰 행동을 고르는 데 쓴다.
-- 비워 둔 아이템은 앱이 분류로 짐작하므로 기존 아이템은 빈 배열로 둔다.
CREATE TYPE "RoomAffordance" AS ENUM ('HOLD', 'SOFT_FLOOR', 'BALL', 'PUSH_WALKER', 'PLAY');

ALTER TABLE "room_items" ADD COLUMN "affordances" "RoomAffordance"[] NOT NULL DEFAULT ARRAY[]::"RoomAffordance"[];
