"use client";

import { useSyncExternalStore } from "react";

// 네이티브 앱(WebView) 안에서 열렸는지 판별한다.
//
// iOS 앱은 WKWebView 에 openSettings 등의 메시지 핸들러를 등록하고,
// 안드로이드 네이티브 앱은 Android 브리지 객체를 주입하므로 그 존재로 구분한다.
// settings 화면의 위치 권한 분기와 같은 방식이다.
//
// ⚠️ isAndroidApp(TWA 판별)과 혼동하지 말 것.
//    TWA 는 Chrome 이 그대로 렌더하는 구조라 브리지를 주입하지 않으므로
//    여기서는 false 로 나온다. 둘은 서로 다른 것을 판별한다.

type NativeBridgeWindow = Window & {
  webkit?: { messageHandlers?: Record<string, unknown> };
  Android?: Record<string, unknown>;
};

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as NativeBridgeWindow;
  return !!(
    w.webkit?.messageHandlers?.openSettings || w.Android?.openLocationSettings
  );
}

// 브리지 주입 여부는 마운트 후 바뀌지 않으므로 구독할 대상이 없다.
const subscribe = () => () => {};
// 서버에서는 판별이 불가능하다. 하이드레이션 불일치를 피하려고 false 로 맞춘다.
const getServerSnapshot = () => false;

/** 네이티브 앱 여부 훅. */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribe, isNativeApp, getServerSnapshot);
}

/**
 * iOS 앱(WKWebView) 안인지.
 *
 * 네이티브가 메시지 핸들러를 하나라도 등록하면 webkit.messageHandlers 가 생긴다.
 * Android TWA 는 Chrome 이 그대로 렌더하므로 여기 걸리지 않는다.
 *
 * ⚠️ "인앱결제를 쓸 수 있는가"와는 다른 질문이다. 그건 브릿지가 있는 빌드인지까지
 *    봐야 하므로 appStoreBilling.ts 의 isAppStoreBillingAvailable 을 쓸 것.
 *
 * 반환값이 `null` 이면 아직 판별 전(SSR·하이드레이션)이다.
 * 결제 UI는 확정된 뒤에만 노출해야 한다.
 */
export function isIosApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as NativeBridgeWindow;
  return Boolean(w.webkit?.messageHandlers);
}

// 서버 렌더 시점에는 판별할 수 없다. false 로 단정하면 iOS 앱에서 결제 UI가
// 한 프레임 스쳐 보일 수 있어서, 확정 전을 뜻하는 null 을 돌려준다.
const getIosServerSnapshot = () => null;

/** iOS 앱 여부 훅. 판별 전에는 null. */
export function useIsIosApp(): boolean | null {
  return useSyncExternalStore(subscribe, isIosApp, getIosServerSnapshot);
}
