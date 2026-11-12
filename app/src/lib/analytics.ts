// GA4 이벤트 전송. 태그 설치는 layout.tsx 의 gtag-init 이 맡는다.
//
// gtag.js 는 afterInteractive 로 늦게 뜬다. 그 전에 부른 이벤트도 잃지 않도록
// gtag-init 과 같은 방식으로 dataLayer 에 쌓아 둔다(스크립트가 뜨면 차례로 보낸다).
// gtag 는 배열이 아니라 arguments 객체를 받아야 해서 function 선언으로 만든다.

import { isNativeApp, isIosApp } from './isNativeApp';
import { isAndroidApp } from './isAndroidApp';

type GtagWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  const w = window as GtagWindow;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () {
      // eslint-disable-next-line prefer-rest-params -- gtag.js 는 arguments 객체만 알아본다
      w.dataLayer!.push(arguments);
    };
  }
  w.gtag(...args);
}

/** GA4 맞춤 이벤트. 실패해도 화면 흐름에 영향이 없어야 하므로 예외를 삼킨다. */
export function track(name: string, params?: Record<string, string | number | boolean>) {
  try {
    gtag('event', name, params);
  } catch {
    /* 분석 실패는 무시 */
  }
}

export type AnalyticsPlatform = 'ios' | 'android' | 'web';

/** 앱(WebView)과 웹 방문을 GA 에서 나눠 보기 위한 실행 환경. */
export function detectPlatform(): AnalyticsPlatform {
  if (isIosApp()) return 'ios';
  if (isNativeApp() || isAndroidApp()) return 'android';
  return 'web';
}

export function setUserProperties(props: Record<string, string>) {
  try {
    gtag('set', 'user_properties', props);
  } catch {
    /* 분석 실패는 무시 */
  }
}
