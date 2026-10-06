'use client';

import { useCallback, useState } from 'react';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';
import { APP_AD_SLOT_ID } from '@/components/ads/AppAdSlotReporter';

/** 하단 배너 광고 유닛. BottomNav 와 같은 유닛을 쓴다. */
const BOTTOM_AD_UNIT = 'DAN-go0noPJx8cIt6SU7';

/**
 * 화면 하단 광고 자리.
 *
 * - 웹 브라우저: 카카오 애드핏 배너가 들어온다.
 * - 네이티브 앱: 여기는 비워두고 그 위에 네이티브 AdMob 배너가 겹쳐 들어온다.
 *   (AdMob 은 네이티브 SDK 라 WebView 안에서는 못 띄우고,
 *    웹용 AdSense 를 앱 WebView 에 넣는 것은 Google 정책 위반이다.)
 *   슬롯 id 는 네이티브가 위치를 찾는 기준이라 비워도 자리는 남겨야 한다.
 *
 * ⚠️ /prototype 은 BottomNav 를 숨기므로 같은 id 가 중복되지 않는다.
 */
export default function PrototypeAdSlot() {
  const [filled, setFilled] = useState(true);
  const handleFilled = useCallback((v: boolean) => setFilled(v), []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-[#FDFDFE] z-30"
      style={{ paddingBottom: 'max(var(--safe-area-bottom), 0px)' }}
    >
      <div
        id={APP_AD_SLOT_ID}
        className="w-full flex justify-center"
        // 광고가 안 채워져도 앱에서는 자리를 접지 않는다 —
        // 접으면 네이티브 배너가 탭바를 덮는다.
        style={{ height: filled ? 'var(--bottom-ad-banner-height)' : 0, overflow: 'hidden' }}
      >
        <KakaoAdBanner unit={BOTTOM_AD_UNIT} onFilledChange={handleFilled} />
      </div>
    </div>
  );
}
