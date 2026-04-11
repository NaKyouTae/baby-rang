# ── Build Stage ──
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
RUN corepack enable

WORKDIR /build

# pnpm workspace 매니페스트 (의존성 캐시 레이어)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json app/package.json

RUN pnpm install --filter app... --frozen-lockfile

# 소스 복사
COPY app app

# Next.js standalone 빌드
RUN pnpm --filter app build

# ── Runtime Stage ──
FROM node:20-alpine

RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul
ENV NODE_ENV=production

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# standalone 출력 복사
COPY --from=builder /build/app/.next/standalone ./
COPY --from=builder /build/app/.next/static ./app/.next/static
COPY --from=builder /build/app/public ./app/public

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

CMD ["node", "app/server.js"]
