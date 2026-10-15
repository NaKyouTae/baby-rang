"use client";

import { useCallback } from "react";
import KakaoAdBanner from "./ads/KakaoAdBanner";
import { APP_AD_SLOT_ID } from "./ads/AppAdSlotReporter";

const BOTTOM_AD_UNIT = "DAN-go0noPJx8cIt6SU7";

/**
 * 화면 하단에 고정되는 배너 광고 자리. 모든 페이지가 이 하나를 같이 쓴다.
 *
 * 페이지마다 따로 광고 자리를 만들지 않는다. 같은 id 의 슬롯이 둘 생기면
 * AppAdSlotReporter 가 엉뚱한 쪽을 잰다. 하단에 고정 버튼이나 여백이 있는 화면은
 * --bottom-nav-space 만큼 띄워서 이 바에 가리지 않게 한다.
 */
export default function BottomAdBar() {
  // 광고 미노출(no-fill) 시 배너 높이를 0으로 접어 흰 여백 제거.
  // --bottom-nav-space 도 같은 변수를 쓰므로 콘텐츠 하단 패딩까지 함께 줄어든다.
  const handleAdFilled = useCallback((filled: boolean) => {
    document.documentElement.style.setProperty(
      "--bottom-ad-banner-height",
      filled ? "50px" : "0px",
    );
  }, []);

  return (
    <div
      // 에러/404 화면이 이 속성으로 하단 바를 숨긴다.
      data-bottom-nav-root
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div
        id={APP_AD_SLOT_ID}
        className="w-full flex justify-center"
        style={{ height: "var(--bottom-ad-banner-height)", overflow: "hidden" }}
      >
        <KakaoAdBanner unit={BOTTOM_AD_UNIT} onFilledChange={handleAdFilled} />
      </div>
    </div>
  );
}
