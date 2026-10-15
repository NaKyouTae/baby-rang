-- 솟는 칸은 그림만 위로 키우는 값이라 세로 칸과 다를 게 거의 없다. 세로 칸 하나로 합친다.
-- 이미 놓인 가구가 화면에서 그대로 보이도록, 솟는 칸만큼 놓인 자리를 위로 올리고 세로 칸을 늘린다.
UPDATE "room_placements" AS p
SET "tileY" = p."tileY" - i."spriteLiftY"
FROM "room_items" AS i
WHERE p."itemId" = i."id" AND i."spriteLiftY" > 0;

UPDATE "room_items" SET "tileH" = "tileH" + "spriteLiftY" WHERE "spriteLiftY" > 0;

ALTER TABLE "room_items" DROP COLUMN "spriteLiftY";
