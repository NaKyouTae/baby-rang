-- CreateTable
CREATE TABLE "child_shares" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_share_members" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_share_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "child_shares_code_key" ON "child_shares"("code");

-- CreateIndex
CREATE UNIQUE INDEX "child_shares_childId_ownerId_key" ON "child_shares"("childId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "child_share_members_shareId_userId_key" ON "child_share_members"("shareId", "userId");

-- AddForeignKey
ALTER TABLE "child_shares" ADD CONSTRAINT "child_shares_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_shares" ADD CONSTRAINT "child_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_share_members" ADD CONSTRAINT "child_share_members_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "child_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_share_members" ADD CONSTRAINT "child_share_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
