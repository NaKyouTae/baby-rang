-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "kakaoId" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "profileImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_kakaoId_key" ON "users"("kakaoId");
