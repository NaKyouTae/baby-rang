"use client";

import { useSyncExternalStore } from "react";

// TWA(Trusted Web Activity)로 감싼 Android 앱 안에서 열렸는지 판별한다.
//
// 왜 필요한가:
// Google Play 결제 정책상, Play에서 배포되는 앱 안에서 소비되는 디지털 콘텐츠는
// Google Play 결제를 써야 한다. TWA도 예외가 아니다. Play Billing 연동(Phase 2) 전까지는
// Android 앱 안에서 Toss 결제 경로를 아예 노출하지 않는다.
// 웹 브라우저와 iOS 앱은 영향을 받으면 안 되므로 "TWA만" 정확히 골라내야 한다.
//
// ⚠️ display-mode: standalone 은 쓸 수 없다.
// 홈 화면에 추가한 PWA도 standalone 이라 웹 사용자의 결제까지 막아버린다.
// (ViewportHeightSetter 의 standalone 감지와 목적이 다르므로 재사용하지 않는다.)

const PACKAGE_ID = "kr.spectrify.baby_rang";
const REFERRER_PREFIX = `android-app://${PACKAGE_ID}`;

// ⚠️ localStorage 를 쓰면 안 된다.
// TWA는 기기의 Chrome과 같은 저장소를 공유하므로, 앱에서 한 번 true 가 되면
// 같은 기기의 Chrome 브라우저에서도 결제가 사라진다.
// sessionStorage 는 브라우징 컨텍스트(탭) 단위라 TWA와 브라우저가 서로 격리된다.
const STORAGE_KEY = "baby-rang.isTwa";

// 판별 결과는 세션 내내 바뀌지 않으므로 모듈 스코프에 캐시한다.
// useSyncExternalStore 의 getSnapshot 은 렌더마다 불리는데, 매번 DOM/스토리지를
// 읽을 이유가 없고 부수효과도 한 번만 일어나는 편이 안전하다.
let cached: boolean | undefined;

function detect(): boolean {
  // ① 앱이 웹을 처음 띄우는 순간에만 값이 있다.
  const byReferrer = document.referrer.startsWith(REFERRER_PREFIX);

  // ② twa-manifest 의 startUrl(/home?src=twa)로 들어온 경우.
  //    referrer 는 전체 새로고침 한 번이면 사라지므로 이쪽이 더 확실한 신호다.
  const byStartUrl =
    new URLSearchParams(window.location.search).get("src") === "twa";

  // ③ 안전망: Android + standalone 표시 모드.
  //    홈 화면에 추가한 PWA 도 여기 걸린다. 그 사용자는 결제 버튼을 못 보게 되는데,
  //    브라우저 탭에서는 그대로 결제할 수 있으므로 손실이 제한적이다.
  //    반대로 감지에 실패해 앱 안에서 Toss 결제가 열리면 Play 결제 정책 위반이라
  //    앱이 내려갈 수 있다. 위험의 크기가 다르므로 과탐지 쪽으로 기운다.
  const isAndroid = /android/i.test(window.navigator.userAgent);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  return byReferrer || byStartUrl || (isAndroid && isStandalone);
}

/**
 * TWA 여부를 판별한다. 브라우저에서만 의미가 있다.
 *
 * referrer 는 앱이 웹을 처음 띄우는 순간에만 값이 있고 이후 클라이언트 라우팅에서는
 * 사라지므로, 한 번 확인되면 세션 내내 캐시한다.
 */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  if (cached !== undefined) return cached;

  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) === "1") {
      cached = true;
      return true;
    }
  } catch {
    // 프라이빗 모드 등에서 sessionStorage 접근이 막히면 아래 감지로 넘어간다.
  }

  const detected = detect();
  if (detected) {
    try {
      // 전체 새로고침으로 모듈 캐시가 날아가도 유지되도록 세션에 남긴다.
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 캐시 실패는 무시한다. referrer 가 남아있는 동안에는 계속 감지된다.
    }
  }
  cached = detected;
  return detected;
}

/**
 * 감지에 쓰인 원시 신호들. 앱(WebView) 안에서는 devtools 콘솔을 볼 수 없어서
 * 결제가 막혔을 때 화면에 그대로 띄워 원인을 추적하는 용도다.
 */
export function getDetectionInfo(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  let cached: string | null | undefined;
  try {
    cached = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    cached = "(접근 불가)";
  }
  return {
    detected: isAndroidApp(),
    referrer: document.referrer || "(없음)",
    srcParam: new URLSearchParams(window.location.search).get("src") ?? "(없음)",
    standalone: window.matchMedia("(display-mode: standalone)").matches,
    androidUA: /android/i.test(window.navigator.userAgent),
    sessionCache: cached ?? "(없음)",
    hasDigitalGoods:
      typeof (window as unknown as { getDigitalGoodsService?: unknown })
        .getDigitalGoodsService === "function",
    href: window.location.href,
  };
}

// 값이 세션 중에 변하지 않으므로 구독할 이벤트가 없다.
const subscribe = () => () => {};
// 서버 렌더와 하이드레이션 시점에는 판별이 불가능하다.
const getServerSnapshot = () => null;

/**
 * TWA 여부 훅.
 *
 * 반환값이 `null` 이면 아직 판별 전(SSR·하이드레이션)이라는 뜻이다.
 * 결제 UI는 `false` 로 **확정된 경우에만** 노출해야 한다.
 * 판별 전에 노출하면 앱에서 결제 버튼이 한 프레임 스쳐 보일 수 있고,
 * 그건 정책 위반 소지가 있다. 모르면 감추는 쪽이 안전하다.
 */
export function useIsAndroidApp(): boolean | null {
  return useSyncExternalStore(subscribe, isAndroidApp, getServerSnapshot);
}
