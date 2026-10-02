import { NextResponse, after } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/**
 * AI 크롤러 1차 판별.
 *
 * robots.txt 에서 명시적으로 허용한 크롤러와 짝을 이룬다. 값싼 정규식으로
 * 사람 트래픽을 먼저 걸러내고, 최종 판별과 이름 정규화는 서버가 한다
 * (목록이 두 곳에 흩어지지 않도록 서버를 기준으로 둔다).
 */
const AI_CRAWLER =
  /gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|perplexity-user|google-extended|applebot|bytespider|ccbot|youbot|meta-externalagent|facebookbot|cohere-ai/i;

/**
 * AI 크롤러가 어떤 페이지를 읽고 가는지 집계한다.
 *
 * robots.txt 로 허용만 해두면 실제로 오는지 알 수 없어서, AEO 작업이 효과가
 * 있었는지 판단할 근거가 없다. 사람 트래픽은 GA 가 이미 보므로 봇만 센다.
 */
export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';

  if (AI_CRAWLER.test(userAgent)) {
    // after() 로 응답을 보낸 뒤에 기록한다 — 크롤러를 기다리게 하지 않는다.
    after(async () => {
      try {
        await fetch(`${API_URL}/crawler-visits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAgent,
            path: request.nextUrl.pathname,
          }),
        });
      } catch {
        // 통계 수집 실패가 페이지 응답에 영향을 주면 안 된다.
      }
    });
  }

  return NextResponse.next();
}

export const config = {
  // 정적 파일·이미지·API 는 셀 이유가 없다. 크롤러가 읽는 건 문서다.
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|js|css|woff2?)$).*)',
  ],
};
