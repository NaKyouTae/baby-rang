-- 소품은 앱에서 자유롭게 겹쳐 놓을 수 있어서, 가구마다 위에 올릴 수 있는지 정할 필요가 없다.
ALTER TABLE "room_items" DROP COLUMN "canStack";
