/**
 * 위치 권한 설정 화면으로 이동을 시도합니다.
 *
 * 1. 네이티브 WebView 브릿지가 있으면 네이티브 설정 화면을 엽니다.
 * 2. 브라우저 환경이면 위치 권한을 다시 요청합니다.
 *    - 'prompt' 상태: 브라우저 권한 팝업이 다시 뜹니다.
 *    - 'denied' 상태: 브라우저가 차단했으므로 안내 메시지를 표시합니다.
 */
export function openLocationSettings(callbacks?: {
  onGranted?: (pos: GeolocationPosition) => void;
  onDenied?: () => void;
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
        showSettingsGuide();
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
      showSettingsGuide();
      callbacks?.onDenied?.();
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
  );
}

function showSettingsGuide() {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS) {
    alert("위치 권한을 변경하려면\n설정 > Safari > 위치에서 변경해 주세요.");
  } else {
    alert("위치 권한을 변경하려면\n브라우저 주소창 왼쪽 자물쇠 아이콘 >\n위치 권한을 허용으로 변경해 주세요.");
  }
}
