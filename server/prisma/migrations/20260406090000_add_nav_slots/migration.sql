-- CreateTable
CREATE TABLE "nav_slots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "menuId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nav_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nav_slots_userId_idx" ON "nav_slots"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "nav_slots_userId_position_key" ON "nav_slots"("userId", "position");

-- AddForeignKey
ALTER TABLE "nav_slots" ADD CONSTRAINT "nav_slots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
