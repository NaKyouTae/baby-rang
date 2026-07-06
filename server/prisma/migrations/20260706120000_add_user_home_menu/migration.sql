-- AlterTable: 초기 화면(첫 진입) 설정 컬럼 추가.
-- 앱/웹 진입 시 처음 보여줄 화면의 menuId. null이면 기본값(홈).
ALTER TABLE "users" ADD COLUMN "appHomeMenu" TEXT;
ALTER TABLE "users" ADD COLUMN "webHomeMenu" TEXT;
