# ── Build Stage ──
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl python3 make g++
RUN corepack enable

WORKDIR /build

# pnpm workspace 매니페스트 (의존성 캐시 레이어)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json server/package.json

# devDeps 포함하여 설치 (nest build 에 필요)
RUN pnpm install --filter server... --frozen-lockfile

# 소스 복사
COPY server server

# Prisma Client 생성 + NestJS 빌드
RUN pnpm --filter server exec prisma generate
RUN pnpm --filter server build

# server 패키지를 독립된 평평한 node_modules 로 추출 (prod deps 만)
# → pnpm workspace 의 심링크 문제 회피
RUN pnpm --filter server --legacy deploy --prod /prod/server
# deploy 이후 prod deps 로 Prisma Client 재생성
RUN cd /prod/server && pnpm exec prisma generate

# ── Runtime Stage ──
FROM node:20-alpine

RUN apk add --no-cache tzdata openssl
ENV TZ=Asia/Seoul
ENV NODE_ENV=production

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /build/server/dist ./dist
COPY --from=builder /prod/server/node_modules ./node_modules
COPY --from=builder /prod/server/package.json ./package.json
COPY --from=builder /prod/server/prisma ./prisma
COPY --from=builder /build/server/prisma.config.ts ./prisma.config.ts

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 18080

CMD ["sh", "-c", "echo '--- running prisma migrate deploy ---' && node node_modules/prisma/build/index.js migrate deploy && echo '--- starting nest server ---' && node dist/src/main.js"]
