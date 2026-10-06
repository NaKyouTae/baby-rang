-- 벽지·바닥재·창문은 자리가 고정돼 있어 '놓는' 게 아니라 '바꾸는' 것이다.
-- 좌표가 없으므로 배치(room_placements)가 아니라 방의 속성으로 둔다.
ALTER TABLE "rooms" ADD COLUMN "wallpaperItemId" TEXT;
ALTER TABLE "rooms" ADD COLUMN "flooringItemId" TEXT;
ALTER TABLE "rooms" ADD COLUMN "windowItemId" TEXT;

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_wallpaperItemId_fkey"
    FOREIGN KEY ("wallpaperItemId") REFERENCES "room_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_flooringItemId_fkey"
    FOREIGN KEY ("flooringItemId") REFERENCES "room_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_windowItemId_fkey"
    FOREIGN KEY ("windowItemId") REFERENCES "room_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
