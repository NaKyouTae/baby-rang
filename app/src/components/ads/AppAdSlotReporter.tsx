"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** BottomNav 가 비워 두는 앱 배너 슬롯의 DOM id. */
export const APP_AD_SLOT_ID = "app-ad-slot";

type MessageHandler = { postMessage: (body: unknown) => void };
type NativeBridgeWindow = Window & {
  webkit?: { messageHandlers?: Record<string, MessageHandler | undefined> };
};

/**
 * 네이티브 앱에 "이 화면에서 앱 배너를 어디에 놓아야 하는지" 를 알려준다.
 *
 * 앱 배너(AdMob)는 네이티브 뷰라서 WebView 안에 넣을 수 없다.
 * 좌표를 네이티브에 하드코딩하면 하단바 CSS 치수나 기기 safe area 가 바뀔 때마다
 * 어긋나고, 하단 네비를 숨기는 화면에서는 배너가 엉뚱한 위치에 뜬다.
 * 그래서 웹이 실제 슬롯을 재서 보내고 네이티브는 그 값만 따른다.
 *
 * 슬롯이 없는 화면(하단 네비 숨김)에서는 visible: false 를 보내 배너를 숨기게 한다.
 * 웹 브라우저에서는 브리지가 없으므로 아무 일도 하지 않는다.
 */
export default function AppAdSlotReporter() {
  const pathname = usePathname();

  useEffect(() => {
    const handler = (window as NativeBridgeWindow).webkit?.messageHandlers?.adSlot;
    if (!handler) return;

    const report = () => {
      const el = document.getElementById(APP_AD_SLOT_ID);
      if (!el) {
        handler.postMessage({ visible: false });
        return;
      }
      const rect = el.getBoundingClientRect();
      handler.postMessage({
        visible: rect.height > 0,
        // 뷰포트 하단에서 슬롯 하단까지의 거리. CSS px = pt 이므로 그대로 쓴다.
        bottomInset: window.innerHeight - rect.bottom,
        height: rect.height,
        // 가로 위치도 함께 보낸다. iPad 처럼 화면이 콘텐츠 셸보다 넓으면
        // 배너가 화면 전체 폭을 쓰면서 콘텐츠 기둥 밖으로 튀어나온다.
        width: rect.width,
        left: rect.left,
      });
    };

    report();

    // 하단바는 편집 모드 진입, 광고 no-fill, 회전 등으로 높이가 바뀐다.
    // 슬롯 자체와 body 를 같이 관찰해 변화를 놓치지 않는다.
    const observer = new ResizeObserver(report);
    const el = document.getElementById(APP_AD_SLOT_ID);
    if (el) observer.observe(el);
    observer.observe(document.body);
    window.addEventListener("resize", report);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [pathname]);

  return null;
}
