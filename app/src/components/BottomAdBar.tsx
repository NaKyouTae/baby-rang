"use client";

import { useCallback, useEffect, useRef } from "react";
import KakaoAdBanner from "./ads/KakaoAdBanner";
import { APP_AD_SLOT_ID } from "./ads/AppAdSlotReporter";
import { useAppBannerMode } from "./ads/adConfig";

const BOTTOM_AD_UNIT = "DAN-mFffxN7OmFUS6FZt";

/**
 * 화면 하단에 고정되는 배너 광고 자리. 모든 페이지가 이 하나를 같이 쓴다.
 *
 * 페이지마다 따로 광고 자리를 만들지 않는다. 같은 id 의 슬롯이 둘 생기면
 * AppAdSlotReporter 가 엉뚱한 쪽을 잰다. 하단에 고정 버튼이나 여백이 있는 화면은
 * --bottom-nav-space 만큼 띄워서 이 바에 가리지 않게 한다.
 */
export default function BottomAdBar() {
  const contentRef = useRef<HTMLDivElement>(null);
  const filledRef = useRef(false);
  const mode = useAppBannerMode();

  // 슬롯 높이를 실제 소재 높이에 맞춘다. 미노출(no-fill)이면 0 으로 접어 흰 여백을 없앤다.
  // 애드핏 소재는 50px 고정이 아니다. 일부는 가로폭 비율로 높이를 정하고, iOS 에서는 가로폭을
  // 100% 가 아닌 소재 최소 폭으로 잡아 50px 보다 낮게 그려진다. 50px 로 박아 두면 그 차이만큼
  // 배너 아래에 빈 띠가 남는다.
  // --bottom-nav-space 도 같은 변수를 쓰므로 콘텐츠 하단 패딩까지 함께 맞춰진다.
  const applyHeight = useCallback(() => {
    const measured = Math.ceil(contentRef.current?.getBoundingClientRect().height ?? 0);
    // 채워졌는데 아직 크기가 안 잡혔으면 기본 50px 를 유지한다.
    const height = filledRef.current ? measured || 50 : 0;
    document.documentElement.style.setProperty("--bottom-ad-banner-height", `${height}px`);
  }, []);

  const handleAdFilled = useCallback(
    (filled: boolean) => {
      filledRef.current = filled;
      applyHeight();
    },
    [applyHeight],
  );

  // 앱에서는 웹 광고 대신 네이티브 배너 자리를 다룬다. 띄울 배너가 있으면 기본 높이(50px)로 비워 두고,
  // 없으면 접는다. 판별 전(pending)에는 기본 높이 그대로 둬 화면이 들썩이지 않게 한다.
  useEffect(() => {
    if (mode === "admob" || mode === "adfit") handleAdFilled(true);
    else if (mode === "none") handleAdFilled(false);
  }, [mode, handleAdFilled]);

  // 소재가 늦게 커지거나 회전으로 폭이 바뀌어도 따라간다.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (filledRef.current) applyHeight();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyHeight]);

  return (
    <div
      // 에러/404 화면이 이 속성으로 하단 바를 숨긴다.
      data-bottom-nav-root
      // 화면 맨 아래에 바로 붙인다. 세이프에어리어(홈 인디케이터) 만큼 띄우면 광고 아래에
      // 빈 띠가 남는다. 위쪽 요소들은 --bottom-nav-space 로 이 바와의 간격을 잡는다.
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
    >
      <div
        id={APP_AD_SLOT_ID}
        className="w-full bg-white"
        style={{ height: "var(--bottom-ad-banner-height)", overflow: "hidden" }}
      >
        {/* 슬롯은 높이를 변수로 고정하므로, 소재 자체 높이는 안쪽 래퍼로 잰다 */}
        <div ref={contentRef} className="w-full flex justify-center">
          {mode === "web" && (
            <KakaoAdBanner unit={BOTTOM_AD_UNIT} onFilledChange={handleAdFilled} />
          )}
        </div>
      </div>
    </div>
  );
}
