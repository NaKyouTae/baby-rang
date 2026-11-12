'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { track } from '@/lib/analytics';
import { isRewardedAdAvailable, showRewardedAd } from '@/lib/rewardedAd';

/** 광고를 닫은 뒤 서버 지급(SSV 콜백)을 기다리는 횟수와 간격. 보통 몇 초 안에 온다. */
const POLL_TRIES = 10;
const POLL_INTERVAL_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 브리지 주입 여부는 마운트 후 바뀌지 않는다.
const subscribe = () => () => {};
const getServerSnapshot = () => false;

/**
 * 보석함의 '광고 보고 보석 1개'.
 *
 * 보석은 서버가 AdMob 콜백을 확인하고 준다. 여기서는 광고를 띄우고, 지급될 때까지
 * 잠깐 물어본 뒤 잔액을 다시 읽게 할 뿐이다.
 */
export function useAdReward({
  open,
  childId,
  onCharged,
}: {
  open: boolean;
  childId?: string;
  onCharged: () => void;
}) {
  const bridgeReady = useSyncExternalStore(subscribe, isRewardedAdAvailable, getServerSnapshot);
  const available = bridgeReady && !!childId;
  /** 오늘 남은 횟수. 조회 전이면 null. */
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const loadQuota = useCallback(async () => {
    if (!childId) return;
    try {
      const res = await fetch(`/api/ad-rewards/quota/${childId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const d = await res.json();
      if (typeof d.remaining === 'number') setRemaining(d.remaining);
    } catch {
      // 못 읽으면 버튼은 그대로 두고, 누를 때 서버가 한도를 다시 본다.
    }
  }, [childId]);

  useEffect(() => {
    if (open && available) void loadQuota();
  }, [open, available, loadQuota]);

  const watch = useCallback(async () => {
    if (busy || !available || !childId) return;
    setBusy(true);
    try {
      const startRes = await fetch(`/api/ad-rewards/start/${childId}`, { method: 'POST' });
      const started = await startRes.json().catch(() => ({}));
      if (!startRes.ok || !started.id) {
        throw new Error(started?.message ?? '잠시 후 다시 시도해 주세요.');
      }

      const earned = await showRewardedAd(started.id, started.userId);
      if (!earned) return;

      for (let i = 0; i < POLL_TRIES; i++) {
        await sleep(POLL_INTERVAL_MS);
        const res = await fetch(`/api/ad-rewards/${started.id}`, { cache: 'no-store' });
        const d = res.ok ? await res.json() : null;
        if (d?.status === 'REWARDED') {
          track('ad_reward', { coins: 1 });
          return;
        }
        if (d?.status === 'LIMITED') {
          alert('오늘 받을 수 있는 보석을 모두 받았어요.');
          return;
        }
      }
      // 콜백이 늦는 경우. 서버가 받으면 그때 지급되니 다음에 잔액을 읽을 때 보인다.
      alert('보석이 곧 들어와요. 잠시 후 확인해 주세요.');
    } catch (e) {
      alert(e instanceof Error ? e.message : '광고를 불러오지 못했어요.');
    } finally {
      setBusy(false);
      onCharged();
      void loadQuota();
    }
  }, [busy, available, childId, onCharged, loadQuota]);

  return { available, remaining, busy, watch };
}
