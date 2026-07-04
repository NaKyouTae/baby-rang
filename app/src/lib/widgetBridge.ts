interface WidgetBridgeWindow {
  webkit?: {
    messageHandlers?: {
      reloadWidget?: { postMessage: (msg: unknown) => void };
    };
  };
  BabyRangWidget?: { reloadWidget?: () => void };
}

/**
 * 네이티브 래퍼(iOS WKWebView / Android) 안에서 홈·잠금화면 위젯을 즉시 새로고침하도록 요청한다.
 * 기록 저장/삭제 직후 호출하면 위젯이 다음 주기(5분±)를 기다리지 않고 최신 값으로 갱신된다.
 * 일반 브라우저에서는 네이티브 핸들러가 없어 아무 일도 하지 않는다.
 */
export function reloadWidget(): void {
  try {
    const w = window as unknown as WidgetBridgeWindow;
    const ios = w.webkit?.messageHandlers?.reloadWidget;
    if (ios) {
      ios.postMessage('reload');
      return;
    }
    w.BabyRangWidget?.reloadWidget?.();
  } catch {
    // 위젯은 부가 기능 — 실패해도 앱 동작에 영향 없음
  }
}
