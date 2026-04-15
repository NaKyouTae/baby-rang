import type { Metadata, Viewport } from "next";
import "./globals.css";
import LoginPromptProvider from "@/components/LoginPromptProvider";
import AdSenseScript from "@/components/ads/AdSenseScript";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "아기랑 - 우리 아기의 모든 순간",
    description: SITE_DESCRIPTION,
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
  },
  alternates: {
    canonical: SITE_URL,
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
      <body className="min-h-full flex justify-center bg-white" suppressHydrationWarning>
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
        {/* 첫 페인트 전에 standalone 모드 CSS 변수를 즉시 설정 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement.style;var b=document.body.style;var s=window.matchMedia('(display-mode:standalone)').matches||navigator.standalone;if(s){d.setProperty('--bottom-nav-gap','24px');d.setProperty('--bottom-nav-space','88px')}var vh=window.innerHeight*0.01;b.setProperty('--vh',vh+'px')})()`,
          }}
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
          </div>
          <BottomNavServer />
        </LoginPromptProvider>
      </body>
    </html>
  );
}
