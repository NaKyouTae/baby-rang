-- 꾸미기에서 가구 크기를 1~3배로 바꿀 수 있게 한다. 기존 배치는 1배.
ALTER TABLE "room_placements" ADD COLUMN "scale" INTEGER NOT NULL DEFAULT 1;
