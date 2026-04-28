-- CreateTable: share_codes (사용자당 1개 공유 코드)
CREATE TABLE "share_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shared_access (아이별 공유 접근 권한)
CREATE TABLE "shared_access" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "grantedToId" TEXT NOT NULL,
    "sharedById" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_codes_userId_key" ON "share_codes"("userId");
CREATE UNIQUE INDEX "share_codes_code_key" ON "share_codes"("code");
CREATE UNIQUE INDEX "shared_access_childId_grantedToId_key" ON "shared_access"("childId", "grantedToId");
CREATE INDEX "shared_access_grantedToId_idx" ON "shared_access"("grantedToId");

-- AddForeignKey
ALTER TABLE "share_codes" ADD CONSTRAINT "share_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_grantedToId_fkey" FOREIGN KEY ("grantedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_sharedById_fkey" FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate data: child_shares → share_codes (소유자별 첫 번째 코드 사용)
INSERT INTO "share_codes" ("id", "userId", "code", "createdAt")
SELECT DISTINCT ON ("ownerId")
    gen_random_uuid()::text,
    "ownerId",
    "code",
    "createdAt"
FROM "child_shares"
WHERE "isActive" = true
ORDER BY "ownerId", "createdAt" ASC;

-- Migrate data: child_share_members → shared_access
INSERT INTO "shared_access" ("id", "childId", "grantedToId", "sharedById", "role", "createdAt")
SELECT
    gen_random_uuid()::text,
    cs."childId",
    csm."userId",
    cs."ownerId",
    'editor',
    csm."joinedAt"
FROM "child_share_members" csm
JOIN "child_shares" cs ON cs."id" = csm."shareId"
WHERE cs."isActive" = true
ON CONFLICT ("childId", "grantedToId") DO NOTHING;

-- Drop old tables
DROP TABLE "child_share_members";
DROP TABLE "child_shares";
