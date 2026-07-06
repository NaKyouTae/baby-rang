-- 초기 화면 설정을 앱/웹 분리에서 단일 값으로 통합.
-- 기존 appHomeMenu 값을 살려 homeMenu로 이관한 뒤 두 컬럼 제거.
ALTER TABLE "users" ADD COLUMN "homeMenu" TEXT;
UPDATE "users" SET "homeMenu" = COALESCE("appHomeMenu", "webHomeMenu");
ALTER TABLE "users" DROP COLUMN "appHomeMenu";
ALTER TABLE "users" DROP COLUMN "webHomeMenu";
