-- 실시간 슬롯은 창문 날씨만 남긴다. 아이 사진·성장 기록은 앱에서 쓴 적이 없다.
UPDATE "room_items" SET "dynamicSlot" = NULL WHERE "dynamicSlot" IN ('PHOTO', 'GROWTH');

ALTER TYPE "RoomDynamicSlot" RENAME TO "RoomDynamicSlot_old";
CREATE TYPE "RoomDynamicSlot" AS ENUM ('WEATHER');
ALTER TABLE "room_items"
  ALTER COLUMN "dynamicSlot" TYPE "RoomDynamicSlot" USING ("dynamicSlot"::text::"RoomDynamicSlot");
DROP TYPE "RoomDynamicSlot_old";
