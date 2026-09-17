"use client";

import { useIsNativeApp } from "@/lib/isNativeApp";
import { APP_AD_SLOT_ID } from "./AppAdSlotReporter";

/**
 * 하단 네비가 없는 화면에서 네이티브 앱 배너(AdMob)가 놓일 자리.
 *
 * 앱 배너는 화면에 고정된 네이티브 오버레이라 스크롤을 따라가지 못한다.
 * 그래서 인라인 웹 광고와 같은 위치가 아니라 화면 하단 고정으로 잡는다.
 *
 * 웹 브라우저에서는 아무것도 렌더하지 않는다.
 * 기존 인라인 카카오 광고가 그대로 노출되므로 브라우저 쪽 동작은 그대로다.
 *
 * ⚠️ 하단 네비가 보이는 화면에서는 쓰면 안 된다.
 *    BottomNav 가 이미 같은 id 의 슬롯을 렌더해 id 가 중복된다.
 *    (AppAdSlotReporter 는 getElementById 로 하나만 집는다)
 */
export default function AppBannerSlot() {
  const inNativeApp = useIsNativeApp();
  if (!inNativeApp) return null;

  // 배너 높이는 하단바와 같은 값을 쓴다(globals.css).
  const bottomPadding = "max(var(--safe-area-bottom), 16px)";

  return (
    <>
      {/* 고정 배너에 콘텐츠 끝부분이 가리지 않도록 흐름에 자리를 만든다. */}
      <div
        aria-hidden
        style={{
          height: `calc(var(--bottom-ad-banner-height) + ${bottomPadding})`,
        }}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 bg-white"
        style={{ paddingBottom: bottomPadding }}
      >
        <div
          id={APP_AD_SLOT_ID}
          className="w-full"
          style={{ height: "var(--bottom-ad-banner-height)" }}
        />
      </div>
    </>
  );
}
