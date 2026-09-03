"use client";

import { useSyncExternalStore } from "react";
import { useIsAndroidApp } from "@/lib/isAndroidApp";

const APP_STORE_URL = "https://apps.apple.com/kr/app/id6761984903";

// 값이 세션 중에 변하지 않으므로 구독할 이벤트가 없다. (isAndroidApp 과 같은 패턴)
const subscribe = () => () => {};

/** 네이티브가 주입하는 브릿지가 있으면 iOS 앱 WebView 안이다. */
function getIsIosApp(): boolean {
  const w = window as unknown as {
    webkit?: { messageHandlers?: Record<string, unknown> };
  };
  return Boolean(w.webkit?.messageHandlers);
}

// 서버 렌더·하이드레이션 시점에는 판별할 수 없다.
const getServerSnapshot = () => null;

/**
 * 웹으로 들어온 사용자에게만 iOS 앱 설치를 안내한다.
 *
 * 이미 네이티브 앱(iOS WebView)이나 Android TWA 안에서 보고 있는 사용자에게
 * "앱 다운로드"를 노출하면 어색하므로 그때는 아무것도 렌더하지 않는다.
 * 판별 전에도 감춘다 — 잠깐 보였다 사라지는 편보다 낫다.
 */
export default function AppStoreCta() {
  const isAndroidApp = useIsAndroidApp();
  const isIosApp = useSyncExternalStore(
    subscribe,
    getIsIosApp,
    getServerSnapshot,
  );

  if (isAndroidApp !== false) return null;
  if (isIosApp !== false) return null;

  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5 active:opacity-70"
    >
      <span className="flex flex-col">
        <span className="text-[14px] font-semibold text-app-black">
          아기랑 앱으로 더 편하게
        </span>
        <span className="mt-0.5 text-[12px] text-gray-500">
          App Store에서 다운로드
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-primary-500 px-3.5 py-1.5 text-[13px] font-medium text-white">
        받기
      </span>
    </a>
  );
}
