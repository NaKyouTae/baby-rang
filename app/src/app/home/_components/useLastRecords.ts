'use client';

import { useCallback, useEffect, useState } from 'react';

interface LastRecords {
  childId: string;
  canEndSleep: boolean;
  sleepAt: string | null;
  feedingAt: string | null;
  diaperAt: string | null;
}

/** "N분 전" / "H시간 M분 전". 디자인이 일 단위로 묶지 않고 시간을 그대로 쌓는다. */
export function formatElapsed(iso: string | null, now: number): string {
  if (!iso) return '기록 없음';
  const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m === 0 ? `${h}시간 전` : `${h}시간 ${m}분 전`;
}

/** 실패하면 undefined — 이전 값을 그대로 두라는 뜻이다. */
async function fetchLastRecords(childId: string): Promise<LastRecords | null | undefined> {
  try {
    const res = await fetch(
      `/api/growth-records/widget-summary?childId=${encodeURIComponent(childId)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    // 접근할 수 없는 아이면 서버가 첫 아이로 바꿔 답한다. 다른 아이 값은 보여주지 않는다.
    if (!data || data.childId !== childId) return null;
    return {
      childId,
      canEndSleep: data.canEndSleep === true,
      sleepAt: data.lastSleepAt,
      feedingAt: data.lastFeedingAt,
      diaperAt: data.lastDiaperAt,
    };
  } catch {
    return undefined;
  }
}

/**
 * 선택된 아이의 마지막 수면·수유·기저귀 시각.
 * 위젯과 같은 서버 계산(widget-summary)을 써서 두 화면의 숫자가 어긋나지 않게 한다.
 */
export function useLastRecords(childId: string | undefined) {
  const [records, setRecords] = useState<LastRecords | null>(null);
  // '몇 분 전'이 멈춰 있지 않도록 1분마다 다시 그린다.
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!childId) return;
    const next = await fetchLastRecords(childId);
    if (next === undefined) return;
    setRecords(next);
    setNow(Date.now());
  }, [childId]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    fetchLastRecords(childId).then((next) => {
      if (!alive || next === undefined) return;
      setRecords(next);
      setNow(Date.now());
    });
    return () => {
      alive = false;
    };
  }, [childId]);

  // 다른 기기·공동 양육자의 기록을 앱으로 돌아올 때 반영한다.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('growth-records-updated', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('growth-records-updated', onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // 아이를 바꾼 직후 새 응답이 오기 전까지 이전 아이 값이 보이지 않게 거른다.
  return { records: records?.childId === childId ? records : null, now, refresh };
}
