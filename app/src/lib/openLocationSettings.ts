/**
 * 위치 권한 설정 화면으로 이동을 시도합니다.
 *
 * 1. 네이티브 WebView 브릿지가 있으면 네이티브 설정 화면을 엽니다.
 * 2. 브라우저 환경이면 위치 권한을 다시 요청합니다.
 *    - 'prompt' 상태: 브라우저 권한 팝업이 다시 뜹니다.
 *    - 'denied' 상태: onBrowserDenied 콜백을 호출합니다.
 */
export function openLocationSettings(callbacks?: {
  onGranted?: (pos: GeolocationPosition) => void;
  onDenied?: () => void;
  /** 브라우저에서 위치 권한이 차단된 경우 호출 (모달 표시용) */
  onBrowserDenied?: () => void;
}) {
  // 1) 네이티브 WebView 브릿지 (추후 네이티브 래핑 시 자동 연결)
  const w = window as any;
  if (w.webkit?.messageHandlers?.openSettings) {
    w.webkit.messageHandlers.openSettings.postMessage("location");
    return;
  }
  if (w.Android?.openLocationSettings) {
    w.Android.openLocationSettings();
    return;
  }

  // 2) 브라우저 Permissions API로 현재 상태 확인
  if (navigator.permissions) {
    navigator.permissions.query({ name: "geolocation" }).then((status) => {
      if (status.state === "prompt") {
        // 아직 묻지 않은 상태 → 권한 팝업 트리거
        navigator.geolocation.getCurrentPosition(
          (pos) => callbacks?.onGranted?.(pos),
          () => callbacks?.onDenied?.(),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
        );
      } else if (status.state === "denied") {
        callbacks?.onBrowserDenied?.();
        callbacks?.onDenied?.();
      } else {
        // granted
        navigator.geolocation.getCurrentPosition(
          (pos) => callbacks?.onGranted?.(pos),
          () => callbacks?.onDenied?.(),
        );
      }
    });
    return;
  }

  // 3) Permissions API 미지원 → 바로 요청 시도
  navigator.geolocation.getCurrentPosition(
    (pos) => callbacks?.onGranted?.(pos),
    () => {
      callbacks?.onBrowserDenied?.();
      callbacks?.onDenied?.();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
  );
}

function isPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** 브라우저/PWA 환경에서 위치 권한 안내 메시지 반환 */
export function getLocationSettingsGuide(): { title: string; description: string } {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const pwa = isPWA();

  if (isIOS && pwa) {
    return {
      title: "위치 권한 변경 안내",
      description: "아이폰 설정에서 위치 권한을 변경해 주세요.\n\n설정 > 아기랑 > 위치 > 허용",
    };
  }
  if (isIOS) {
    return {
      title: "위치 권한 변경 안내",
      description: "Safari 브라우저의 위치 권한을 변경해 주세요.\n\n설정 > Safari > 위치 > 허용",
    };
  }
  if (pwa) {
    return {
      title: "위치 권한 변경 안내",
      description: "Chrome 앱의 위치 권한을 변경해 주세요.\n\n설정 > 앱 > Chrome > 권한 > 위치 > 허용",
    };
  }
  return {
    title: "위치 권한 변경 안내",
    description: "브라우저의 위치 권한을 변경해 주세요.\n\n주소창 왼쪽 자물쇠 아이콘 > 위치 > 허용",
  };
}
