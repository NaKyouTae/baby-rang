-- 서비스 이름을 '아기랑' → '베이비룸' 으로 바꾼다.
--
-- FAQ 본문은 20261002150000_seed_faqs 에서 한 번 넣고 끝나는 값이라
-- 운영 DB 에 이미 예전 이름이 박혀 있다. 그 마이그레이션은 이미 적용돼
-- 고칠 수 없으므로(체크섬) 여기서 UPDATE 로 덮어쓴다.
--
-- 어드민에서 사람이 고쳐 둔 문구까지 되돌리지 않도록 통째로 다시 넣지 않고,
-- '아기랑' 이라는 낱말만 바꾼다. 해당 낱말이 없는 행은 건드리지 않는다.
UPDATE "faqs"
SET "question"  = REPLACE("question", '아기랑', '베이비룸'),
    "answer"    = REPLACE("answer",   '아기랑', '베이비룸'),
    "updatedAt" = NOW()
WHERE "question" LIKE '%아기랑%'
   OR "answer"   LIKE '%아기랑%';
