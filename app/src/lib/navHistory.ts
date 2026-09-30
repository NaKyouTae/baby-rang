'use client';

// 앱 안에서 "뒤로 갈 곳이 있는지" 판단한다.
//
// 초기 화면 설정이 켜져 있으면 /home 에서 router.replace 로 그 화면에 바로 내려앉는다
// (InitialScreenRedirect). replace 는 히스토리를 남기지 않으므로, 그 화면에서
// router.back() 을 불러도 아무 일도 일어나지 않는다 — 뒤로가기 버튼이 먹통이 된다.
//
// push 는 history.length 를 늘리고 replace 는 늘리지 않는다는 점을 이용한다.
// 앱이 뜬 시점의 길이를 기록해 두고, 그보다 늘었으면 앱 안에서 이동한 것이다.

let baseline: number | null = null;

/** 앱이 처음 뜬 시점의 히스토리 길이를 기록한다. 루트에서 한 번만 부른다. */
export function captureHistoryBaseline(): void {
  if (baseline !== null) return;
  if (typeof window === 'undefined') return;
  baseline = window.history.length;
}

/**
 * 앱 안에서 이동한 적이 있는지.
 *
 * false 면 뒤로 갈 곳이 없다는 뜻이다 — 초기 화면으로 바로 내려앉았거나,
 * 새로고침·딥링크로 그 화면에 처음 들어온 경우다.
 */
export function canGoBack(): boolean {
  if (typeof window === 'undefined') return false;
  if (baseline === null) return false;
  return window.history.length > baseline;
}
