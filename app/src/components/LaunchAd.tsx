'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { isNativeApp } from '@/lib/isNativeApp';

type Ad = {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  startsAt: string;
  endsAt: string;
  durationSec: number;
  maxPerDay: number;
};

/** 서버에서 받은 목록. 다음 실행 때 기다리지 않고 바로 쓰려고 저장해 둔다. */
const ADS_KEY = 'babyroom.launchAds';
/** 오늘(KST) 본 횟수와 '오늘 하루 보지 않기' */
const SEEN_KEY = 'babyroom.launchAdSeen';
/** 한 번 켤 때 한 번만. 앱이 살아 있는 동안 화면을 옮겨 다녀도 다시 뜨지 않는다. */
const SESSION_KEY = 'launch_ad_checked';
/** 미리 받아 둔 이미지가 이 안에 뜨지 않으면 이번에는 건너뛴다(실행을 붙잡지 않는다) */
const IMAGE_WAIT_MS = 1200;

type Seen = { date: string; counts: Record<string, number>; hidden?: boolean };

const kstDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

function read<T>(storage: Storage, key: string): T | null {
  try {
    const v = storage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage, key: string, value: unknown) {
  try {
    storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    /* 저장이 막혀도 광고만 안 뜰 뿐이다 */
  }
}

function todaySeen(): Seen {
  const s = read<Seen>(localStorage, SEEN_KEY);
  const date = kstDate();
  return s && s.date === date ? s : { date, counts: {} };
}

function pick(ads: Ad[], seen: Seen): Ad | null {
  if (seen.hidden) return null;
  const now = Date.now();
  return (
    ads.find(
      (a) =>
        new Date(a.startsAt).getTime() <= now &&
        new Date(a.endsAt).getTime() > now &&
        (seen.counts[a.id] ?? 0) < a.maxPerDay,
    ) ?? null
  );
}

const sendEvent = (id: string, type: 'impression' | 'click') =>
  fetch(`/api/launch-ads/${encodeURIComponent(id)}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
    keepalive: true,
  }).catch(() => {});

/**
 * 런치 광고. 앱을 새로 켰을 때 네이티브 스플래시 다음에 잠깐 띄우는 홍보 이미지.
 *
 * 앱 배포 없이 어드민(시스템 > 런치 광고)에서 바꾼다. 실행을 기다리게 하지 않으려고
 * 지난번에 받아 둔 목록·이미지로 띄우고, 새 목록은 뒤에서 받아 다음 실행을 위해 저장한다.
 * 그래서 새 광고는 한 번 늦게 보이고, 끈 광고는 새 목록이 오는 즉시 닫힌다.
 */
export default function LaunchAd() {
  const router = useRouter();
  const pathname = usePathname();
  const [ad, setAd] = useState<Ad | null>(null);
  const [left, setLeft] = useState(0);
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    const firstThisLaunch = read<string>(sessionStorage, SESSION_KEY) === null;
    write(sessionStorage, SESSION_KEY, '1');
    let alive = true;

    // 홈으로 켠 경우에만 띄운다. 알림·딥링크로 다른 화면을 바로 연 사람을 막지 않는다.
    if (firstThisLaunch && pathname.startsWith('/home')) {
      const candidate = pick(read<Ad[]>(localStorage, ADS_KEY) ?? [], todaySeen());
      if (candidate) {
        const img = new Image();
        const timer = setTimeout(() => (img.onload = null), IMAGE_WAIT_MS);
        img.onload = () => {
          clearTimeout(timer);
          if (!alive) return;
          const seen = todaySeen();
          seen.counts[candidate.id] = (seen.counts[candidate.id] ?? 0) + 1;
          write(localStorage, SEEN_KEY, seen);
          shownRef.current = candidate.id;
          setLeft(candidate.durationSec);
          setAd(candidate);
          void sendEvent(candidate.id, 'impression');
        };
        img.src = candidate.imageUrl;
      }
    }

    // 다음 실행을 위해 새 목록과 이미지를 받아 둔다
    fetch('/api/launch-ads', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items?: Ad[] } | null) => {
        if (!d?.items) return;
        write(localStorage, ADS_KEY, d.items);
        for (const a of d.items) new Image().src = a.imageUrl;
        // 그사이 꺼졌거나 바뀐 광고는 바로 닫는다
        if (alive && shownRef.current && !d.items.some((a) => a.id === shownRef.current)) setAd(null);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
    // 실행 직후 한 번만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ad) return;
    if (left <= 0) {
      setAd(null); // 남은 시간이 다 되면 닫는다
      return;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [ad, left]);

  const close = useCallback(() => setAd(null), []);
  const hideToday = useCallback(() => {
    const seen = todaySeen();
    write(localStorage, SEEN_KEY, { ...seen, hidden: true });
    setAd(null);
  }, []);

  if (!ad) return null;

  const link = ad.linkUrl?.trim() || null;
  const internal = link?.startsWith('/') ?? false;
  const onImage = () => {
    if (!link) return;
    void sendEvent(ad.id, 'click');
    setAd(null);
    if (internal) router.push(link);
  };

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
  );

  return createPortal(
    <div className="fixed inset-0 z-[1900] bg-[#F1F2F4]" style={{ touchAction: 'none' }}>
      {link && !internal ? (
        // 외부 주소는 새 창 링크로 연다. iOS 앱은 이걸 사파리로 넘긴다.
        <a href={link} target="_blank" rel="noreferrer" onClick={onImage} className="block h-full w-full">
          {image}
        </a>
      ) : (
        <button type="button" onClick={onImage} className="block h-full w-full" aria-label="광고 열기">
          {image}
        </button>
      )}

      <button
        type="button"
        onClick={close}
        className="absolute right-4 rounded-full bg-black/50 px-3 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm"
        style={{ top: 'calc(var(--safe-area-top, 0px) + 12px)' }}
      >
        건너뛰기 {left}
      </button>
      <button
        type="button"
        onClick={hideToday}
        className="absolute left-4 rounded-full bg-black/50 px-3 py-1.5 text-[13px] text-white backdrop-blur-sm"
        style={{ bottom: 'calc(var(--safe-area-bottom, 0px) + 16px)' }}
      >
        오늘 하루 보지 않기
      </button>
    </div>,
    document.body,
  );
}
