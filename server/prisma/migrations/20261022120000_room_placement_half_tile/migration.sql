-- 가구를 반 칸(0.5) 단위로 놓을 수 있게 좌표를 실수로 바꾼다. 기존 정수 좌표는 그대로 옮겨진다.
ALTER TABLE "room_placements" ALTER COLUMN "tileX" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tileY" SET DATA TYPE DOUBLE PRECISION;
