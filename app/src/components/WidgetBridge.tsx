'use client';

import { useEffect } from 'react';

// 위젯이 직접 호출할 백엔드 base URL. NEXT_PUBLIC_ 이라 브라우저에 인라인됨.
// ⚠️ 프로덕션에선 기기에서 접근 가능한 공개 API URL이어야 함(위젯이 직접 호출하므로).
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type Payload = { widgetToken: string; apiBaseUrl: string };

/**
 * 네이티브 래퍼(iOS WKWebView / Android Capacitor) 안에서 실행될 때만 동작.
 * 로그인 상태면 위젯 토큰을 발급받아 네이티브로 전달 → 네이티브가 App Group /
 * SharedPreferences에 저장하고 홈 화면 위젯을 갱신한다.
 * 웹 브라우저에서는 네이티브 핸들러가 없으므로 아무 일도 하지 않는다.
 */
export default function WidgetBridge() {
  useEffect(() => {
    const w = window as unknown as {
      webkit?: { messageHandlers?: { saveWidgetData?: { postMessage: (m: Payload) => void } } };
      BabyRangWidget?: { saveWidgetData?: (json: string) => void };
    };
    const ios = w.webkit?.messageHandlers?.saveWidgetData;
    const android = w.BabyRangWidget;
    if (!ios && !android) return; // 네이티브 래퍼가 아님(일반 브라우저)

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/widget/token', { method: 'POST' });
        if (!res.ok) return; // 미로그인 등
        const { widgetToken } = (await res.json()) as { widgetToken?: string };
        if (cancelled || !widgetToken) return;

        const payload: Payload = { widgetToken, apiBaseUrl: API_BASE };
        if (ios) ios.postMessage(payload);
        else if (android?.saveWidgetData) android.saveWidgetData(JSON.stringify(payload));
      } catch {
        // 위젯은 부가 기능 — 실패해도 앱 동작에 영향 없음
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
