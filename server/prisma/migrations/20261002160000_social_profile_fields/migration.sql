-- 소셜(카카오/네이버) 동의항목으로 받는 회원 정보로 사용자 필드를 정리한다.
--
-- nickname → name: 기존 데이터를 버리지 않기 위해 컬럼을 이름만 바꾼다.
-- 기존 회원의 name 에는 닉네임이 들어 있지만, 전화번호(phone)가 비어 있으므로
-- 다음 접속 때 추가 정보 화면에서 소셜 실명으로 덮어쓰게 된다.
ALTER TABLE "users" RENAME COLUMN "nickname" TO "name";

-- 전화번호(필수 동의항목). 01012345678 형태로 정규화해 저장한다.
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
-- 성별/연령대(선택 동의항목). 미동의면 null.
ALTER TABLE "users" ADD COLUMN "gender" TEXT;
ALTER TABLE "users" ADD COLUMN "ageRange" TEXT;

-- birthYear 는 수집 경로가 없었고(온보딩/설정 어디서도 입력받지 않음)
-- 연령대(ageRange)가 그 자리를 대신하므로 제거한다.
ALTER TABLE "users" DROP COLUMN "birthYear";

-- 네이버 연동해제용 refresh token. 네이버는 카카오의 admin key 같은
-- 서버 단독 해제 수단이 없어, 탈퇴 시 쓸 토큰을 보관해야 한다.
ALTER TABLE "accounts" ADD COLUMN "refreshToken" TEXT;
