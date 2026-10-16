"use client";

import { useEffect, useState } from "react";
import { useIsNativeApp } from "@/lib/isNativeApp";
import { useIsAndroidApp } from "@/lib/isAndroidApp";

/** 앱 하단 네이티브 배너의 광고 네트워크. 네이티브 브리지와 주고받는 이름 그대로다. */
export type AppAdNetwork = "admob" | "adfit";

/**
 * 하단 광고 자리를 어떻게 쓸지.
 * - web: 웹 브라우저. 카카오 애드핏 웹 광고를 띄운다.
 * - admob / adfit: 앱. 자리를 비워 두고 그 네이티브 배너를 얹게 한다.
 * - none: 앱인데 띄울 배너가 없다(TWA, 고른 네트워크를 모르는 예전 빌드). 자리를 접는다.
 * - pending: 아직 판별 전. 자리는 기본 높이로 두고 아무 광고도 부르지 않는다.
 *
 * 앱에 카카오 웹 광고를 넣지 않는 이유: 웹 광고 단위를 앱 WebView 에 띄우면 정책 위반 소지가 있다.
 */
export type AppBannerMode = "web" | "pending" | "none" | AppAdNetwork;

type BannerBridgeWindow = Window & {
  Android?: { bannerNetworks?: () => string; reportAdSlot?: unknown };
  webkit?: { messageHandlers?: { adSlot?: unknown } };
  __babyrangBannerNetworks?: unknown;
};

/**
 * 이 앱 빌드가 띄울 수 있는 네이티브 배너.
 * 새 빌드는 목록을 알려준다(Android 는 브리지 메서드, iOS 는 문서 시작 때 심는 전역값).
 * 알려주지 않는데 배너 슬롯을 받는 예전 빌드는 AdMob 뿐이다.
 */
function nativeBannerNetworks(): AppAdNetwork[] {
  if (typeof window === "undefined") return [];
  const w = window as BannerBridgeWindow;
  let list: unknown[] | null = null;
  if (typeof w.Android?.bannerNetworks === "function") {
    list = w.Android.bannerNetworks().split(",");
  } else if (Array.isArray(w.__babyrangBannerNetworks)) {
    list = w.__babyrangBannerNetworks;
  } else if (w.webkit?.messageHandlers?.adSlot || typeof w.Android?.reportAdSlot === "function") {
    list = ["admob"];
  }
  return (list ?? []).filter((n): n is AppAdNetwork => n === "admob" || n === "adfit");
}

// 어드민 광고 설정. 앱 실행 중 한 번만 받는다(바뀌면 다음 실행부터 반영).
// undefined = 받는 중, null = 못 받음.
let cachedNetwork: AppAdNetwork | null | undefined;
let inflight: Promise<AppAdNetwork | null> | null = null;

function fetchAppAdNetwork(): Promise<AppAdNetwork | null> {
  inflight ??= fetch("/api/app-settings")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { adNetwork?: string } | null) => {
      const n = data?.adNetwork;
      return n === "GOOGLE" ? "admob" : n === "KAKAO" ? "adfit" : null;
    })
    .catch(() => null)
    .then((n) => {
      cachedNetwork = n;
      return n;
    });
  return inflight;
}

/** 어드민에서 고른 앱 광고 네트워크. enabled 가 false 면(웹 브라우저) 받지 않는다. */
function useAppAdNetwork(enabled: boolean): AppAdNetwork | null | undefined {
  const [network, setNetwork] = useState(cachedNetwork);
  useEffect(() => {
    if (!enabled || cachedNetwork !== undefined) return;
    let alive = true;
    void fetchAppAdNetwork().then((n) => {
      if (alive) setNetwork(n);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return network;
}

/** 하단 광고 자리를 어떻게 쓸지(AppBannerMode). */
export function useAppBannerMode(): AppBannerMode {
  const inNativeApp = useIsNativeApp();
  // 하이드레이션 동안은 null 이다. 그 사이 웹 광고를 부르면 앱에서도 한 번 요청이 나간다.
  const inAndroidApp = useIsAndroidApp();
  const inApp = inNativeApp || inAndroidApp === true;
  const network = useAppAdNetwork(inApp);

  if (inAndroidApp === null) return "pending";
  if (!inApp) return "web";
  const supported = nativeBannerNetworks();
  if (supported.length === 0) return "none";
  if (network === undefined) return "pending";
  // 설정을 못 받았으면 띄우지 않는다. 정지된 네트워크를 부르는 것보다 안전하다.
  if (network === null) return "none";
  return supported.includes(network) ? network : "none";
}
