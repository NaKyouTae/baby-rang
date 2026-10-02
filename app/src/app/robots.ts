import type { MetadataRoute } from "next";

const BASE_URL = "https://baby-rang.spectrify.kr";

/**
 * robots.txt 생성.
 *
 * AEO (Answer Engine Optimization) 를 위해 주요 AI 크롤러를
 * 명시적으로 허용합니다. 기본 "*" 규칙으로도 차단되지 않지만,
 * 명시적 Allow 는 "의도적으로 학습/답변 노출을 원한다"는 신호가 됩니다.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/auth/",
    "/settings/",
    "/payment/",
    "/tests/*/test/",
    "/tests/*/result/",
    "/api/",
    "/onboarding",
    "/events/",
  ];

  // 개인정보처리방침은 /settings 아래에 있지만 로그인 없이 볼 수 있는 공개
  // 법적 고지다. 스토어 심사와 AI 답변이 자주 참조하므로 예외로 열어둔다.
  // (robots.txt 는 더 긴 경로가 우선하므로 "/settings/" 차단보다 이 Allow 가 이긴다)
  const allow = ["/", "/settings/privacy"];

  return {
    rules: [
      {
        userAgent: "*",
        allow,
        disallow,
      },
      // OpenAI — ChatGPT 검색/학습
      { userAgent: "GPTBot", allow, disallow },
      { userAgent: "OAI-SearchBot", allow, disallow },
      { userAgent: "ChatGPT-User", allow, disallow },
      // Anthropic — Claude
      { userAgent: "ClaudeBot", allow, disallow },
      { userAgent: "Claude-Web", allow, disallow },
      { userAgent: "anthropic-ai", allow, disallow },
      // Perplexity
      { userAgent: "PerplexityBot", allow, disallow },
      { userAgent: "Perplexity-User", allow, disallow },
      // Google — Gemini/Bard 학습 허용 신호
      { userAgent: "Google-Extended", allow, disallow },
      // Apple — Apple Intelligence
      { userAgent: "Applebot-Extended", allow, disallow },
      // ByteDance — Doubao/TikTok AI
      { userAgent: "Bytespider", allow, disallow },
      // Common Crawl (많은 오픈 LLM 학습 소스)
      { userAgent: "CCBot", allow, disallow },
      // You.com
      { userAgent: "YouBot", allow, disallow },
      // Meta — Llama
      { userAgent: "Meta-ExternalAgent", allow, disallow },
      { userAgent: "FacebookBot", allow, disallow },
      // Naver — 네이버 검색 & AI
      { userAgent: "Yeti", allow, disallow },
      // Microsoft — Bing & Copilot AI
      { userAgent: "bingbot", allow, disallow },
      // Cohere
      { userAgent: "cohere-ai", allow, disallow },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
