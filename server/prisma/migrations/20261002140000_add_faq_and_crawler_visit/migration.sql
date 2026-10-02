-- 자주 묻는 질문. 어드민에서 등록·수정하고 앱의 /settings/faq 와
-- FAQPage 구조화 데이터가 같은 데이터를 읽는다.
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '일반',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- 공개 목록 조회(분류별 정렬) 경로에 맞춘 인덱스.
CREATE INDEX "faqs_isPublished_category_order_idx" ON "faqs"("isPublished", "category", "order");

-- AI 크롤러 방문 집계. 요청마다 행을 쌓으면 금방 불어나므로
-- (봇, 경로, 날짜) 단위로 합산한다.
CREATE TABLE "crawler_visits" (
    "id" TEXT NOT NULL,
    "bot" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawler_visits_pkey" PRIMARY KEY ("id")
);

-- upsert 의 충돌 대상.
CREATE UNIQUE INDEX "crawler_visits_bot_path_date_key" ON "crawler_visits"("bot", "path", "date");

-- 최근 날짜부터 봇별로 훑는 조회 경로.
CREATE INDEX "crawler_visits_date_bot_idx" ON "crawler_visits"("date" DESC, "bot");
