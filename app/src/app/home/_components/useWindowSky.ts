'use client';

import { useEffect, useState } from 'react';
import { getLastKnownPosition, getSharedPosition } from '@/hooks/appCache';
import { conditionOf, phaseAt, type SkyCondition, type WindowSky } from './windowSky';

/** 날씨를 다시 받는 간격. 기상청 초단기실황이 한 시간 단위라 자주 받을 필요가 없다. */
const WEATHER_REFRESH_MS = 30 * 60_000;

type Position = { lat: number; lng: number };

/**
 * 위치 권한이 이미 있을 때만 새 좌표를 받는다. 홈에 들어올 때마다 권한 창을 띄우지 않기 위해서다.
 * 권한을 물을 수 없는 환경이면 마지막으로 받아 둔 좌표만 쓴다.
 */
async function currentPosition(): Promise<Position | null> {
  const last = getLastKnownPosition();
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (status?.state !== 'granted') return last;
    const p = await getSharedPosition();
    return { lat: p.lat, lng: p.lng };
  } catch {
    return last;
  }
}

async function fetchCondition(pos: Position): Promise<SkyCondition | null> {
  try {
    const res = await fetch(`/api/weather?lat=${pos.lat}&lng=${pos.lng}&mode=lite`);
    if (!res.ok) return null;
    const data = (await res.json()) as { weather?: { sky?: string; pty?: string } };
    return data.weather ? conditionOf(data.weather.sky, data.weather.pty) : null;
  } catch {
    return null;
  }
}

/**
 * 창문 밖 하늘 — 현재 위치의 날씨와 기기 시각의 시간대.
 * 방에 날씨 창문이 있을 때만(enabled) 날씨를 받는다. 위치나 날씨를 못 받으면 맑음으로 둔다.
 */
export function useWindowSky(enabled: boolean): WindowSky {
  const [condition, setCondition] = useState<SkyCondition>('clear');
  const [phase, setPhase] = useState(() => phaseAt(new Date()));

  // 시간대는 날씨와 상관없이 1분마다 확인한다
  useEffect(() => {
    const t = setInterval(() => setPhase(phaseAt(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      setPhase(phaseAt(new Date()));
      const pos = await currentPosition();
      if (!pos || !alive) return;
      const next = await fetchCondition(pos);
      if (next && alive) setCondition(next);
    };
    void load();
    const t = setInterval(load, WEATHER_REFRESH_MS);
    // 앱으로 돌아오면 그사이 바뀐 날씨·시간대를 반영한다
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);

  return { condition, phase };
}
