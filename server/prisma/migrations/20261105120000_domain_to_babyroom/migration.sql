-- 도메인을 baby-rang.spectrify.kr → babyroom.spectrify.kr 로 바꾸고,
-- 20261104100000_rename_to_babyroom 이 놓친 테이블의 옛 이름도 함께 정리한다.
--
-- 그 마이그레이션은 faqs 만 손봤는데 notices·banners 에도 사람이 넣은
-- 사용자 노출 문구가 있다. 실제로 운영 DB 의 공지 제목이 아직
-- '아기랑에 오신걸 환영합니다.' 였다.
--
-- 어드민에서 고쳐 둔 문구를 되돌리지 않도록 통째로 다시 넣지 않고 낱말만 바꾼다.
-- 해당 낱말이 없는 행은 updatedAt 까지 그대로 둔다(WHERE 로 걸러낸다).
--
-- 도메인은 'baby-rang' 이 아니라 호스트 전체를 넘긴다 — 저장소 이름이나
-- 패키지명처럼 바뀌지 않은 'baby-rang' 이 섞여 들어가지 않게.

UPDATE "faqs"
SET "question"  = REPLACE(REPLACE("question", 'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "answer"    = REPLACE(REPLACE("answer",   'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "updatedAt" = NOW()
WHERE "question" LIKE '%baby-rang.spectrify.kr%' OR "answer" LIKE '%baby-rang.spectrify.kr%'
   OR "question" LIKE '%아기랑%'                  OR "answer" LIKE '%아기랑%';

UPDATE "notices"
SET "title"     = REPLACE(REPLACE("title",   'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "content"   = REPLACE(REPLACE("content", 'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "updatedAt" = NOW()
WHERE "title" LIKE '%baby-rang.spectrify.kr%' OR "content" LIKE '%baby-rang.spectrify.kr%'
   OR "title" LIKE '%아기랑%'                  OR "content" LIKE '%아기랑%';

-- banners.subtitle 은 nullable 이라 REPLACE 가 NULL 을 그대로 돌려준다(덮어써도 안전).
UPDATE "banners"
SET "title"    = REPLACE(REPLACE("title",    'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "subtitle" = REPLACE(REPLACE("subtitle", 'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'), '아기랑', '베이비룸'),
    "linkUrl"  = REPLACE("linkUrl", 'baby-rang.spectrify.kr', 'babyroom.spectrify.kr'),
    "updatedAt" = NOW()
WHERE "title"    LIKE '%baby-rang.spectrify.kr%' OR "title"    LIKE '%아기랑%'
   OR "subtitle" LIKE '%baby-rang.spectrify.kr%' OR "subtitle" LIKE '%아기랑%'
   OR "linkUrl"  LIKE '%baby-rang.spectrify.kr%';
