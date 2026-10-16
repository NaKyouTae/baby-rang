-- 홈 기록 버튼 구성을 기기(브라우저 저장소)가 아니라 사용자마다 저장한다.
ALTER TABLE "users" ADD COLUMN "recordMenu" TEXT[] DEFAULT ARRAY[]::TEXT[];
