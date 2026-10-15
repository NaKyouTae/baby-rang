-- 방향은 아이템마다 정하지 않는다. 모든 가구가 좌우 반전(flipX)만으로 방향을 바꾼다.
-- 그림이 정면 한 장뿐이라 동·서·북 방향은 그릴 수 없고, 앱에서 쓴 적도 없다.
ALTER TABLE "room_items"
  DROP COLUMN "directions",
  DROP COLUMN "flippable";

ALTER TABLE "room_placements" DROP COLUMN "direction";

DROP TYPE "RoomDirection";
