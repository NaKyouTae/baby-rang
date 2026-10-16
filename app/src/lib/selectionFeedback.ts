interface FeedbackWindow {
  webkit?: { messageHandlers?: { selectionFeedback?: { postMessage: (value: null) => void } } };
  Android?: { selectionFeedback?: () => void };
}

/** 앱에서는 선택 햅틱, 지원하는 웹 브라우저에서는 짧은 진동을 사용한다. */
export function selectionFeedback() {
  const bridge = window as unknown as FeedbackWindow;
  try {
    if (bridge.webkit?.messageHandlers?.selectionFeedback) {
      bridge.webkit.messageHandlers.selectionFeedback.postMessage(null);
    } else if (bridge.Android?.selectionFeedback) {
      bridge.Android.selectionFeedback();
    } else {
      navigator.vibrate?.(5);
    }
  } catch {
    // 햅틱 미지원/비활성 상태여도 값 선택은 계속 동작한다.
  }
}
