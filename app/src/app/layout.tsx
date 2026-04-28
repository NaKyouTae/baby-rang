import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import LoginPromptProvider from "@/components/LoginPromptProvider";
import AdSenseScript from "@/components/ads/AdSenseScript";
// ── 애드센스 승인용 임시 Footer ── 제거 시 아래 <AdSenseFooter /> 도 함께 삭제
import AdSenseFooter from "@/components/ads/AdSenseFooter";
import ViewportHeightSetter from "@/components/ViewportHeightSetter";
import SplashProvider from "@/components/SplashProvider";
import BottomNavServer from "@/components/BottomNavServer";

const SITE_URL = "https://baby-rang.spectrify.kr";
const SITE_NAME = "아기랑";
const SITE_DESCRIPTION =
  "아기랑은 기질 검사, 성장 기록, 원더윅스, 수면추천, 수유실 찾기 등 신생아·영유아 육아에 필요한 모든 정보를 한 곳에서 제공하는 모바일 육아 서비스입니다. 부모가 아이의 매일을 더 잘 이해할 수 있도록 돕습니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "아기랑 - 우리 아기의 모든 순간",
    template: "%s | 아기랑",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "아기랑",
    "육아",
    "신생아",
    "영유아",
    "기질 검사",
    "아기 성장 기록",
    "원더윅스",
    "수면추천",
    "수유실 찾기",
    "모유수유",
    "이유식",
    "육아 앱",
    "육아 기록",
    "부모 앱",
  ],
  authors: [{ name: "Spectrify" }],
  creator: "Spectrify",
  publisher: "Spectrify",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "아기랑 - 우리 아기의 모든 순간",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "아기랑 - 우리 아기의 모든 순간",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "아기랑 - 우리 아기의 모든 순간",
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "7Z5qXHvXmaZVGUrCaUMCuRR5uMGbTCBwG8-fSJMouLE",
    // Naver Search Advisor 등록 후 발급받은 인증 코드를 여기에 입력하세요
    // https://searchadvisor.naver.com → 사이트 추가 → HTML 태그 인증
    other: {
      "naver-site-verification": "e195fb3c87061effb7d804eac319ede8bb92c95f",
      "msvalidate.01": "86D1577698DC11E106738B976A2F460E",
    },
  },
  alternates: {
    canonical: `${SITE_URL}/home`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD 구조화 데이터
  // AEO (Answer Engine Optimization) 를 위해 여러 스키마를 동시에 제공합니다.
  // AI 검색 엔진(ChatGPT, Claude, Perplexity, Gemini 등)과 Google 이
  // "아기랑" 서비스를 정확히 이해할 수 있도록 합니다.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "아기랑은 어떤 서비스인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "아기랑은 0~36개월 아이를 키우는 부모를 위한 통합 육아 웹 서비스입니다. 아이 기질 검사, 성장 기록, 원더윅스 안내, 수면추천, 주변 수유실 찾기 등 일상 육아에 필요한 도구를 한 곳에서 제공합니다.",
        },
      },
      {
        "@type": "Question",
        name: "아기랑은 무료인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "기본 기능은 무료로 사용할 수 있고, 기질 검사 전체 결과 등 일부 프리미엄 기능은 결제 또는 광고 시청을 통해 이용할 수 있습니다.",
        },
      },
      {
        "@type": "Question",
        name: "아기랑의 기질 검사는 어떤 방식인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "아이의 행동·반응 패턴에 대한 질문에 답하면 9가지 차원(활동성, 규칙성, 접근/회피, 적응성, 반응 강도, 반응 역치, 기분, 주의 산만성, 지속성)으로 분석하여 맞춤 양육 가이드를 제공합니다.",
        },
      },
      {
        "@type": "Question",
        name: "아기랑은 어디서 사용할 수 있나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "https://baby-rang.spectrify.kr 에서 모바일 브라우저로 바로 사용할 수 있습니다. 홈 화면에 추가하면 앱처럼 사용 가능하며, 추후 iOS/Android 네이티브 앱으로도 출시 예정입니다.",
        },
      },
      {
        "@type": "Question",
        name: "원더윅스(Wonder Weeks)란 무엇인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "원더윅스는 아기의 정신 발달 도약기를 말합니다. 아기랑에서는 아이의 생년월일을 기반으로 도약기 시기를 자동 계산하고, 각 시기의 특징과 부모가 어떻게 대처하면 좋은지 안내합니다.",
        },
      },
      {
        "@type": "Question",
        name: "아기 수면추천이란 무엇인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "아기의 월령에 맞는 최적의 낮잠 횟수, 활동 시간(깨어있는 시간), 밤잠 권장 시간을 계산해 줍니다. 수면 골든타임을 지키면 아이의 건강한 수면 습관 형성에 도움이 됩니다.",
        },
      },
    ],
  };

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Spectrify",
    url: "https://spectrify.kr",
    logo: `${SITE_URL}/icon.png`,
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Babyrang",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ko-KR",
    publisher: {
      "@type": "Organization",
      name: "Spectrify",
      url: "https://spectrify.kr",
    },
  };

  const mobileAppLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: SITE_NAME,
    alternateName: "Babyrang",
    operatingSystem: "Web, iOS, Android",
    applicationCategory: "ParentingApplication",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "ko-KR",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    featureList: [
      "아기 기질 검사",
      "성장 기록 및 성장 패턴 분석",
      "원더윅스(정신발달 급등기) 안내",
      "수면추천",
      "수유실 찾기",
      "오늘의 육아 요약",
    ],
  };

  return (
    <html lang="ko" className="h-full">
      <head>
        {/* Google AdSense — AdSenseScript 컴포넌트가 클라이언트에서 동적 로드하므로 여기서는 제거 */}
        {/* Google Analytics (gtag.js) — next/script afterInteractive로 hydration mismatch 방지 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-WEH6C2JJB9"
          strategy="afterInteractive"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-WEH6C2JJB9');`,
          }}
        />
      </head>
      <body className="min-h-full flex justify-center bg-white" suppressHydrationWarning>
        {/* JSON-LD: FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        {/* JSON-LD: MobileApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(mobileAppLd) }}
        />
        <ViewportHeightSetter />
        <LoginPromptProvider>
          <div className="relative w-full max-w-[430px] h-screen-safe overflow-y-auto overscroll-contain">
            {/* 상태바 영역 배경 — 스크롤 시 콘텐츠가 상태바에 겹치지 않도록 */}
            <div
              aria-hidden
              className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/80 backdrop-blur-md z-[100] pointer-events-none"
              style={{ height: 'var(--safe-area-top)' }}
            />
            <SplashProvider>
              {children}
            </SplashProvider>
            <AdSenseScript />
            {/* ── 애드센스 승인용 임시 Footer ── 제거 시 import 도 함께 삭제 */}
            <AdSenseFooter />
          </div>
          <BottomNavServer />
        </LoginPromptProvider>
      </body>
    </html>
  );
}
