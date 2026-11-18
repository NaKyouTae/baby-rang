import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import LoginPromptProvider from "@/components/LoginPromptProvider";
import ViewportHeightSetter from "@/components/ViewportHeightSetter";
import NavigationBaseline from "@/components/NavigationBaseline";
import WidgetBridge from "@/components/WidgetBridge";
import AdditionalInfoGate from "@/components/AdditionalInfoGate";
import LoginErrorNotice from "@/components/LoginErrorNotice";
import SplashProvider from "@/components/SplashProvider";
import BottomAdBar from "@/components/BottomAdBar";
import AppAdSlotReporter from "@/components/ads/AppAdSlotReporter";
import AnalyticsBridge from "@/components/AnalyticsBridge";
import AppStorePurchaseRecovery from "@/components/AppStorePurchaseRecovery";
import AndroidPurchaseRecovery from "@/components/AndroidPurchaseRecovery";
import GlobalFooter from "@/components/GlobalFooter";

const SITE_URL = "https://babyroom.spectrify.kr";
// 스토어 등록정보. 구조화 데이터의 sameAs 로 묶어 같은 앱임을 알린다.
const APP_STORE_URL = "https://apps.apple.com/kr/app/id6761984903";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=kr.spectrify.baby_rang";
// 운영사 URL.
//
// spectrify.kr 은 독립된 회사 사이트가 아니라 이 사이트로 308 리디렉트만 한다.
// 구조화 데이터가 리디렉트 주소를 가리키면 AI·검색엔진이 회사를 확인하러 갔을 때
// 빈손으로 돌아오고, 그 탓에 '스펙트럼'이 엉뚱한 대상(자폐 스펙트럼 등)과 섞인다.
// 실제로 내용이 있는 주소를 가리킨다. 회사 소개 페이지가 생기면 그때 바꾼다.
const PUBLISHER_URL = SITE_URL;
const SITE_NAME = "베이비룸";
const SITE_DESCRIPTION =
  "베이비룸은 수유·분유·수면·기저귀·체온·투약을 한 번의 터치로 기록하고, 최근 24시간·3일·7일 기록을 한 장으로 정리한 '기록 요약'으로 소아과 진료 때 바로 보여줄 수 있는 육아 기록 앱입니다. 키·몸무게 WHO 성장 곡선, 원더윅스, 가족 공동 기록, 픽셀 아기방 꾸미기를 함께 제공합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "베이비룸 - 우리 아기의 모든 순간",
    template: "%s | 베이비룸",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "베이비룸",
    "육아",
    "신생아",
    "영유아",
    "육아 기록",
    "육아 기록 앱",
    "수유 기록",
    "수면 기록",
    "기저귀 기록",
    "아기 기록 요약",
    "소아과 진료 기록",
    "아기 체온 기록",
    "아기 투약 기록",
    "아기 성장 기록",
    "WHO 성장 곡선",
    "원더윅스",
    "모유수유",
    "분유",
    "이유식",
    "공동 육아",
    "육아 앱",
  ],
  authors: [{ name: "Spectrify" }],
  creator: "Spectrify",
  publisher: "Spectrify",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
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
    title: "베이비룸 - 우리 아기의 모든 순간",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "베이비룸 - 우리 아기의 모든 순간",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "베이비룸 - 우리 아기의 모든 순간",
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
      // 앞은 예전 주소(baby-rang.spectrify.kr), 뒤는 새 주소(babyroom.spectrify.kr) 등록 코드다.
      // 두 주소가 같은 사이트를 보여 주는 동안은 둘 다 둔다.
      "naver-site-verification": [
        "e195fb3c87061effb7d804eac319ede8bb92c95f",
        "7e86119e6923d49973a91ac2e13e5535e767244b",
      ],
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
  // 베이비룸은 다크모드를 지원하지 않는다. OS/브라우저/WebView 가 다크모드를
  // 자동 적용해 색이 깨지는 것을 막기 위해 라이트로 고정한다. (globals.css :root 의 color-scheme 와 한 쌍)
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // JSON-LD 구조화 데이터
  // AEO (Answer Engine Optimization) 를 위해 여러 스키마를 동시에 제공합니다.
  // AI 검색 엔진(ChatGPT, Claude, Perplexity, Gemini 등)과 Google 이
  // "베이비룸" 서비스를 정확히 이해할 수 있도록 합니다.

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Spectrify",
    alternateName: "스펙트럼",
    url: PUBLISHER_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Spectrify(스펙트럼)는 영유아 육아 앱 '베이비룸'을 만드는 소프트웨어 회사입니다.",
    // 이름만 보고 엉뚱한 대상과 묶이는 것을 막는다.
    //
    // 실측 결과(2026-10-02, Gemini) '스펙트럼이 만든 베이비룸 앱'을 물으면
    // 자폐 스펙트럼 장애 지원 기관으로 답했다. 육아 맥락에서는 그쪽이 훨씬
    // 자연스러운 연상이라 그냥 두면 계속 섞인다.
    // disambiguatingDescription 은 schema.org 가 바로 이 용도로 둔 필드다.
    disambiguatingDescription:
      "자폐 스펙트럼(autism spectrum) 관련 기관이나 치료 서비스와 무관하며, 동명의 유축기 브랜드(Spectra)와도 다른 회사입니다. 영유아 육아 기록·기질 검사 앱 '베이비룸'의 개발사입니다.",
    knowsAbout: [
      "영유아 육아",
      "아기 기질 검사",
      "성장 기록",
      "모바일 앱 개발",
    ],
    sameAs: [APP_STORE_URL, PLAY_STORE_URL, "https://github.com/NaKyouTae"],
  };

  // AI 검색·답변이 그대로 인용하기 좋은 질문·답. llms.txt 의 FAQ 와 같은 내용을 유지한다.
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        q: "소아과 진료 때 아기 수유·수면·배변 기록을 정리해서 보여줄 수 있는 앱이 있나요?",
        a: "베이비룸의 '기록 요약'은 최근 24시간·3일·7일 동안의 수유 횟수와 분유량, 평균 수유 간격, 낮잠·밤잠 시간, 소변·대변 횟수, 최고 체온과 측정 시각, 복용약(해열제 표시)을 한 화면에 정리합니다. 진료실에서 의료진에게 화면을 그대로 보여주면 됩니다. 설정 > 활동 관리 > 기록 요약에서 열 수 있습니다.",
      },
      {
        q: "베이비룸은 어떤 앱인가요?",
        a: "0~36개월 아기를 키우는 부모를 위한 육아 기록 앱입니다. 수유·분유·유축·이유식·수면·기저귀·체온·투약·병원 방문을 한 번의 터치로 기록하고, 패턴 분석과 WHO 성장 곡선, 원더윅스, 기록 요약을 제공합니다. 기록을 남기면 픽셀 아기방에서 아기가 함께 자랍니다.",
      },
      {
        q: "배우자나 조부모와 아기 기록을 같이 쓸 수 있나요?",
        a: "네. 설정 > 활동 관리 > 기록 공유에서 가족을 초대하면 같은 아기의 기록을 함께 남기고 실시간으로 볼 수 있습니다. 쌍둥이·다둥이도 아기별로 관리합니다.",
      },
      {
        q: "베이비룸은 무료인가요?",
        a: "기록·패턴·성장 곡선·기록 요약 등 기본 기능은 무료입니다. 아기방 꾸미기 아이템은 보석으로 사며, 보석은 기록 보상·광고 시청·결제로 얻을 수 있습니다.",
      },
      {
        q: "다른 육아 앱에서 쓰던 기록을 옮길 수 있나요?",
        a: "다른 육아 앱에서 내보낸 텍스트(.txt) 기록을 설정 > 활동 관리 > 데이터 가져오기로 불러올 수 있습니다.",
      },
    ].map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  // 앱 자체를 설명하는 구조화 데이터.
  //
  // Organization·WebSite 만으로는 "베이비룸이 어떤 앱인가"를 말해주지 못한다.
  // '베이비룸'은 아기방을 뜻하는 일반 명사로도 쓰여(가구·인테리어 매장 등), 앱으로
  // 특정되지 않으면 검색·AI 답변에서 엉뚱한 업종과 섞인다.
  // sameAs 로 스토어 등록정보를 묶어 같은 대상임을 명시한다.
  const appLd = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "베이비룸 - 수유·수면 육아 기록",
    alternateName: ["베이비룸", "Babyroom"],
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    applicationCategory: "HealthApplication",
    operatingSystem: "iOS, Android, Web",
    inLanguage: "ko-KR",
    // 스토어 두 곳과 웹을 같은 앱으로 묶는다. installUrl 은 단일 값만 받으므로
    // 대표 1개(Google Play)를 두고 나머지는 sameAs 로 연결한다.
    sameAs: [APP_STORE_URL, PLAY_STORE_URL],
    installUrl: PLAY_STORE_URL,
    downloadUrl: PLAY_STORE_URL,
    featureList: [
      "수유·분유·유축·이유식·수면·기저귀·체온·투약·병원 기록",
      "기록 요약: 최근 24시간·3일·7일 수유·수면·배변·체온·복용약을 한 장으로 정리(소아과 진료용)",
      "하루·주간 육아 패턴 분석",
      "키·몸무게·머리둘레 WHO 성장 곡선과 백분위",
      "원더윅스(정신발달 급등기) 안내",
      "배우자·조부모와 기록 공유(공동 육아)",
      "다둥이·쌍둥이 관리",
      "다른 육아 앱 기록 가져오기",
      "픽셀 아기방 꾸미기",
    ],
    publisher: {
      "@type": "Organization",
      name: "Spectrify",
      alternateName: "스펙트럼",
      url: PUBLISHER_URL,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      description: "무료 설치 · 기질 검사 상세 리포트는 앱 내 구입",
    },
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Babyroom",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ko-KR",
    publisher: {
      "@type": "Organization",
      name: "Spectrify",
      url: PUBLISHER_URL,
    },
  };


  return (
    <html lang="ko" className="h-full">
      <head>
        {/* Pretendard 폰트 — preconnect 로 TLS 핸드셰이크 시간을 줄이고, <link rel="stylesheet"> 로 병렬 다운로드.
            (globals.css @import 보다 first paint 가 빠름) */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* 픽셀 폰트 Galmuri11 의 세로 위치를 피그마에 맞춘 보정판(Galmuri11Fig). 설명은 파일 안에 있다. */}
        <link rel="stylesheet" href="/fonts/galmuri11-fig.css" />
        {/* iOS PWA / 홈 화면 추가 시 흰 화면 대신 보여줄 splash 이미지 */}
        <link rel="apple-touch-startup-image" href="/splash.png" />
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
        {/* Microsoft Clarity (babyroom web) */}
        <Script
          id="clarity-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z9881h68jj");`,
          }}
        />
      </head>
      <body className="min-h-full flex justify-center bg-white" suppressHydrationWarning>
        {/* JSON-LD: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        {/* JSON-LD: MobileApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
        />
        {/* JSON-LD: FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
        {/* JSON-LD: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <ViewportHeightSetter />
        <NavigationBaseline />
        <WidgetBridge />
        {/* 이름·전화번호가 비어 있는 기존 회원을 추가 정보 화면으로 보낸다. */}
        <AdditionalInfoGate />
        <LoginPromptProvider>
          {/* 소셜 로그인 콜백 실패(?loginError=)를 로그인 안내로 되살린다. */}
          <LoginErrorNotice />
          {/* 앱 셸: 실제 보이는 화면(screen.height)에 맞춰, 뷰포트 중앙에 배치한다.
              iPad 등에서 WebView 뷰포트가 화면보다 커서 화면이 그 가운데만 보여줄 때,
              위/아래 fixed 요소(헤더·하단 네비)가 화면 밖으로 잘리는 문제를 해결한다.
              translate(-50%,-50%) 의 transform 이 fixed 자식들의 컨테이닝 블록이 되어
              헤더·네비가 이 셸(=보이는 영역) 기준으로 앵커링된다. */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[430px] overflow-hidden"
            style={{ height: 'var(--app-h, 100dvh)' }}
          >
            <div id="app-scroll-container" className="relative w-full h-full overflow-y-auto overscroll-contain">
              {/* 상태바 영역 배경 — 스크롤 시 콘텐츠가 상태바에 겹치지 않도록 */}
              <div
                aria-hidden
                className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/80 backdrop-blur-md z-[100] pointer-events-none"
                style={{ height: 'var(--safe-area-top)' }}
              />
              <SplashProvider>
                {children}
                {/* 사업자정보 푸터 — 카드사 심사 요건상 전 페이지 하단에 노출 */}
                <GlobalFooter />
              </SplashProvider>
            </div>
            <BottomAdBar />
            <AppAdSlotReporter />
            <AnalyticsBridge />
            <AppStorePurchaseRecovery />
            <AndroidPurchaseRecovery />
          </div>
        </LoginPromptProvider>
      </body>
    </html>
  );
}
