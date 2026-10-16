'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

/**
 * 홈 위에 겹쳐 뜨는 전체 화면(마이페이지·보석함)을 주소에 올린다.
 *
 * 상태로만 들고 있으면 마이페이지에서 약관 페이지로 갔다가 뒤로 왔을 때
 * 홈이 새로 그려지면서 마이페이지가 사라진다. 기기 뒤로가기도 화면을 닫지 않고 앱을 벗어난다.
 * 열 때 히스토리를 한 칸 쌓고 닫을 때 한 칸 되돌리면 브라우저 뒤로가기와 똑같이 움직인다.
 *
 * gems=1 은 토스 결제를 마치고 돌아오는 주소이기도 하다 — 같은 뜻이라 그대로 쓴다.
 */
export type Panel = 'my' | 'gems';

/** 우리가 쌓은 칸인지 표시. 없으면 주소로 바로 들어온 것이라 뒤로 가면 앱을 벗어난다. */
const MARK = 'homePanel';

function readPanels(): Record<Panel, boolean> {
  const p = new URLSearchParams(location.search);
  return { my: p.get('my') === '1', gems: p.get('gems') === '1' };
}

function urlWith(panel: Panel, on: boolean) {
  const p = new URLSearchParams(location.search);
  if (on) p.set(panel, '1');
  else p.delete(panel);
  const qs = p.toString();
  return `${location.pathname}${qs ? `?${qs}` : ''}`;
}

/** pushState·replaceState 는 popstate 를 내지 않는다. 우리가 바꿀 때 직접 알린다. */
const CHANGE = 'homepanelchange';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

/** 스냅샷은 같은 값이면 같아야 해서 객체 대신 문자열로 낸다. */
function getSnapshot() {
  const { my, gems } = readPanels();
  return `${my ? 1 : 0}${gems ? 1 : 0}`;
}

// 서버는 주소의 쿼리를 모른다. 하이드레이션 때만 닫힌 채로 맞춘다.
const getServerSnapshot = () => '00';

function notify() {
  window.dispatchEvent(new Event(CHANGE));
}

export function useHistoryPanels() {
  // 주소를 첫 렌더부터 읽는다. effect 에서 읽으면 약관 화면에서 뒤로 왔을 때
  // 닫힌 홈이 한 번 그려진 뒤에 마이페이지가 열려, 홈을 거쳐 돌아오는 것처럼 보인다.
  // 앱 안에서 이동해 다시 마운트될 때는 하이드레이션이 아니라 바로 클라이언트 값을 쓴다.
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const open = useMemo<Record<Panel, boolean>>(
    () => ({ my: snapshot[0] === '1', gems: snapshot[1] === '1' }),
    [snapshot],
  );

  const openPanel = useCallback((panel: Panel) => {
    if (readPanels()[panel]) return;
    // Next 가 pushState 를 감싸서 라우터 내부 상태를 이 객체에 채워 넣는다
    history.pushState({ [MARK]: panel }, '', urlWith(panel, true));
    notify();
  }, []);

  const closePanel = useCallback((panel: Panel) => {
    if ((history.state as Record<string, unknown> | null)?.[MARK] === panel) {
      // 열 때 쌓은 칸을 되돌린다. 상태는 popstate 에서 맞춰진다.
      history.back();
      return;
    }
    // 새로고침·결제 복귀·약관에서 돌아온 경우처럼 칸 없이 열려 있었다 — 주소만 지운다.
    history.replaceState({}, '', urlWith(panel, false));
    notify();
  }, []);

  return { open, openPanel, closePanel };
}
