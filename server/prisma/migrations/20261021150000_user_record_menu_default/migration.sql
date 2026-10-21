-- 홈 기록 버튼 구성을 가입할 때 앱 기본 구성으로 저장한다.
-- 홈이 기본값을 먼저 그렸다가 사용자 구성으로 바꾸는 깜빡임을 없애기 위해서다.
-- 기존 사용자 중 비어 있는 행은 건드리지 않는다. 기기에만 남아 있는 구성을 앱이 처음 접속할 때 올려 주기 때문이다.
ALTER TABLE "users" ALTER COLUMN "recordMenu" SET DEFAULT ARRAY['pumping', 'pumped', 'diaper', 'breast', 'sleep', 'formula', 'babyfood']::TEXT[];
