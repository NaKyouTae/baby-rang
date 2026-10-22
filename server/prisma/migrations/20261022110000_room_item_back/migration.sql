-- 가구를 뒤로 돌려 놓기 — 아이템에 뒷모습 그림을 두고, 배치 방향에 BACK 을 더한다.
-- 뒷모습은 정면과 칸 수가 같아 칸 수 컬럼은 따로 두지 않는다.
ALTER TYPE "RoomFacing" ADD VALUE 'BACK';

ALTER TABLE "room_items" ADD COLUMN "backImageUrl" TEXT;
