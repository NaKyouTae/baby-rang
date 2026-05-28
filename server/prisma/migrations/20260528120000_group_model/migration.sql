-- ============================================================================
-- Group model migration
--
-- 의도:
--   - 아이는 한 user에 종속(소유권) → 그룹에 속하는 모델로 변경
--   - share_codes / shared_access (child 단위 권한) → groups / group_members
--     (그룹 단위 권한 — 그룹의 모든 멤버가 그룹의 모든 아이에 동등 접근)
--   - 성장기록 작성자(userId)는 nullable + SetNull — 탈퇴해도 기록 보존,
--     UI에서는 "(탈퇴한 회원)"으로 표시
--
-- 데이터 보존:
--   - 기존 user별 1인 그룹 자동 생성 (기존 share_code의 code 재사용)
--   - 기존 child.userId → 해당 user의 그룹id로 이전
--   - 기존 shared_access의 grantedTo → 코드 주인의 그룹에 member로 합류
--
-- 순서가 중요:
--   1) 새 테이블 생성 (FK 없이)
--   2) 데이터 backfill
--   3) children 컬럼 교체 (nullable groupId 추가 → 채우기 → NOT NULL)
--   4) 옛 테이블/FK 정리
--   5) 새 FK 부착
-- ============================================================================

-- 1. groups / group_members 신설 (FK는 마지막에 부착)
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");
CREATE INDEX "groups_ownerId_idx" ON "groups"("ownerId");
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");
CREATE INDEX "group_members_userId_idx" ON "group_members"("userId");

-- 2. 기존 user별로 1인 그룹 자동 생성
--    - 기존 share_codes의 code가 있으면 재사용 (사용자가 외부에 공유한 코드를 깨뜨리지 않기 위함)
--    - 없으면 user.id의 일부로부터 6자리 코드를 만들어 부여
--      (I/O/0/1을 N/P/Q/S로 치환해 가독성 유지. 충돌 시 운영에서 admin으로 재발급 가능)
INSERT INTO "groups" ("id", "ownerId", "code", "createdAt")
SELECT
    gen_random_uuid()::text,
    u.id,
    COALESCE(
        sc.code,
        UPPER(TRANSLATE(
            SUBSTRING(REPLACE(u.id, '-', ''), 1, 6),
            'oilOIL01',
            'PRSPRSNS'
        ))
    ),
    COALESCE(sc."createdAt", u."createdAt")
FROM "users" u
LEFT JOIN "share_codes" sc ON sc."userId" = u.id;

-- 3. 모든 그룹의 owner를 group_members에도 등록
INSERT INTO "group_members" ("id", "groupId", "userId", "joinedAt")
SELECT gen_random_uuid()::text, g.id, g."ownerId", g."createdAt"
FROM "groups" g;

-- 4. shared_access의 grantedTo를 코드 주인의 그룹 멤버로 흡수
--    (한 명이 한 user의 여러 child에 접근 가능했어도 DISTINCT로 한 번만 합류)
INSERT INTO "group_members" ("id", "groupId", "userId", "joinedAt")
SELECT DISTINCT
    gen_random_uuid()::text,
    g.id,
    sa."grantedToId",
    MIN(sa."createdAt") OVER (PARTITION BY g.id, sa."grantedToId")
FROM "shared_access" sa
JOIN "groups" g ON g."ownerId" = sa."sharedById"
ON CONFLICT ("groupId", "userId") DO NOTHING;

-- 5. children: groupId 컬럼 추가(nullable) → 채우기 → NOT NULL
ALTER TABLE "children" ADD COLUMN "groupId" TEXT;

UPDATE "children" c
SET "groupId" = g.id
FROM "groups" g
WHERE g."ownerId" = c."userId";

ALTER TABLE "children" ALTER COLUMN "groupId" SET NOT NULL;

-- 6. children.userId 제거 (FK → 컬럼 순)
ALTER TABLE "children" DROP CONSTRAINT "children_userId_fkey";
ALTER TABLE "children" DROP COLUMN "userId";
CREATE INDEX "children_groupId_idx" ON "children"("groupId");

-- 7. growth_records.userId nullable + FK CASCADE → SET NULL
--    (작성자가 탈퇴해도 기록 자체는 그룹의 자산으로 보존)
ALTER TABLE "growth_records" DROP CONSTRAINT "growth_records_userId_fkey";
ALTER TABLE "growth_records" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "growth_records" ADD CONSTRAINT "growth_records_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. physical_growths.userId nullable + FK CASCADE → SET NULL
ALTER TABLE "physical_growths" DROP CONSTRAINT "physical_growths_userId_fkey";
ALTER TABLE "physical_growths" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "physical_growths" ADD CONSTRAINT "physical_growths_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. 옛 테이블 제거 (FK 먼저, 그 다음 테이블)
ALTER TABLE "share_codes" DROP CONSTRAINT "share_codes_userId_fkey";
ALTER TABLE "shared_access" DROP CONSTRAINT "shared_access_childId_fkey";
ALTER TABLE "shared_access" DROP CONSTRAINT "shared_access_grantedToId_fkey";
ALTER TABLE "shared_access" DROP CONSTRAINT "shared_access_sharedById_fkey";
DROP TABLE "shared_access";
DROP TABLE "share_codes";

-- 10. 새 테이블 FK 부착
--     groups.ownerId는 NO ACTION — 탈퇴 흐름에서 코드가 명시적으로 ownership을
--     다른 멤버로 이양해야만 user 삭제가 성공 (데이터 보호 가드).
ALTER TABLE "groups" ADD CONSTRAINT "groups_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "children" ADD CONSTRAINT "children_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
