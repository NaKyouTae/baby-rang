"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppBannerMode } from "./adConfig";
import { isAppOverlayOpen, subscribeAppOverlay } from "./appOverlay";

/** BottomAdBar 가 비워 두는 앱 배너 슬롯의 DOM id. */
export const APP_AD_SLOT_ID = "app-ad-slot";

type MessageHandler = { postMessage: (body: unknown) => void };
type NativeBridgeWindow = Window & {
  webkit?: { messageHandlers?: Record<string, MessageHandler | undefined> };
  // 안드로이드는 @JavascriptInterface 로 노출된다.
  // JS 객체를 그대로 못 넘기므로 JSON 문자열로 보낸다.
  Android?: { reportAdSlot?: (json: string) => void };
};

type SlotPayload = {
  visible: boolean;
  /** 띄울 네트워크. 이걸 모르는 예전 빌드는 무시하고 AdMob 을 띄운다. */
  network?: "admob" | "adfit";
  bottomInset?: number;
  height?: number;
  width?: number;
  left?: number;
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
  const mode = useAppBannerMode();

  useEffect(() => {
    const w = window as NativeBridgeWindow;
    const iosHandler = w.webkit?.messageHandlers?.adSlot;
    const hasAndroid = typeof w.Android?.reportAdSlot === "function";
    if (!iosHandler && !hasAndroid) return;
    const network = mode === "admob" || mode === "adfit" ? mode : null;

    // 플랫폼별 전송 방식을 여기서 흡수한다. 아래 로직은 동일하다.
    const send = (payload: SlotPayload) => {
      if (iosHandler) {
        iosHandler.postMessage(payload);
        return;
      }
      // ⚠️ 안드로이드 브리지는 메서드만 떼어내 호출하면 동작하지 않는다.
      //    수신 객체(window.Android)를 유지한 채 호출해야 한다.
      w.Android?.reportAdSlot?.(JSON.stringify(payload));
    };

    const report = () => {
      // 바텀시트·모달이 열려 있으면 배너를 숨긴다.
      // 배너는 WebView 위에 얹힌 네이티브 뷰라, 그대로 두면 오버레이를 덮어버린다.
      if (isAppOverlayOpen()) {
        send({ visible: false });
        return;
      }

      const el = document.getElementById(APP_AD_SLOT_ID);
      if (!el) {
        send({ visible: false });
        return;
      }
      const rect = el.getBoundingClientRect();
      send({
        visible: rect.height > 0,
        network: network ?? undefined,
        // 뷰포트 하단에서 슬롯 하단까지의 거리. CSS px = pt 이므로 그대로 쓴다.
        bottomInset: window.innerHeight - rect.bottom,
        height: rect.height,
        // 가로 위치도 함께 보낸다. iPad 처럼 화면이 콘텐츠 셸보다 넓으면
        // 배너가 화면 전체 폭을 쓰면서 콘텐츠 기둥 밖으로 튀어나온다.
        width: rect.width,
        left: rect.left,
      });
    };

    // 띄울 네이티브 배너가 없거나(설정한 네트워크를 이 빌드가 모름) 아직 판별 전이면 숨긴다.
    // 예전 빌드는 network 를 무시하고 AdMob 을 띄우므로, 슬롯을 아예 알려주지 않아야 한다.
    if (!network) {
      send({ visible: false });
      return;
    }

    report();

    // 하단바는 편집 모드 진입, 광고 no-fill, 회전 등으로 높이가 바뀐다.
    // 슬롯 자체와 body 를 같이 관찰해 변화를 놓치지 않는다.
    const unsubscribeOverlay = subscribeAppOverlay(report);

    const observer = new ResizeObserver(report);
    const el = document.getElementById(APP_AD_SLOT_ID);
    if (el) observer.observe(el);
    observer.observe(document.body);
    window.addEventListener("resize", report);

    return () => {
      unsubscribeOverlay();
      observer.disconnect();
      window.removeEventListener("resize", report);
    };
  }, [pathname, mode]);

  return null;
}
