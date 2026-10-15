'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Notice {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
}

interface Props {
  open: boolean;
  onBack: () => void;
}

/** 26.04.23 14:36 */
function formatDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 공지사항 — /settings/notices 의 기능을 픽셀 디자인으로 다시 깐 화면.
 *
 * 한 번에 하나만 펼친다. 로그인한 사람에게만 안 읽은 공지에 빨간 점을 찍고,
 * 펼치면 읽음으로 남긴다.
 */
export default function NoticesScreen({ open, onBack }: Props) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Notice[] | null>(null);
  const [error, setError] = useState(false);
  const [readIds, setReadIds] = useState<Set<string> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notices', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setItems(data.notices ?? []);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let cancelled = false;
    fetch('/api/notices/read-ids', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // 못 받아 오면 점을 아예 안 찍는다 — 다 안 읽은 것처럼 보이는 편이 더 나쁘다
        if (!cancelled && Array.isArray(d?.ids)) setReadIds(new Set(d.ids));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, isAuthenticated]);

  const toggle = useCallback(
    (id: string) => {
      const opening = openId !== id;
      setOpenId(opening ? id : null);
      if (opening && isAuthenticated && readIds && !readIds.has(id)) {
        setReadIds((prev) => new Set(prev).add(id));
        fetch(`/api/notices/${id}/read`, { method: 'POST' }).catch(() => {});
      }
    },
    [openId, isAuthenticated, readIds],
  );

  if (!open) return null;

  return (
    <div
      // 마이페이지(z-20) 는 덮고 하단 광고(z-50) 아래로 깔린다
      className="absolute inset-0 z-[25] bg-[#F7F8F9] flex flex-col gap-[10px] px-[20px]"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 목록 끝이 가리지 않는다.
        paddingBottom:
          'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 20px)',
      }}
    >
      <div className={`${BOX} h-[50px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={onBack} aria-label="뒤로" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <p className="text-[#121212] text-[16px] leading-none">공지사항</p>
        {/* 디자인의 오른쪽 X 는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
        <span className="size-[24px]" />
      </div>

      <div className={`${BOX} flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col`}>
        {items === null ? null : items.length === 0 ? (
          <p className="m-auto p-[10px] text-center text-[#808991] text-[14px] leading-[1.4]">
            {error ? '공지사항을 불러오지 못했습니다.' : '공지사항이 없습니다.'}
          </p>
        ) : (
          <ul>
            {items.map((n) => {
              const expanded = openId === n.id;
              const unread = readIds !== null && !readIds.has(n.id);
              return (
                <li key={n.id} className="border-b border-[#121212]">
                  <button
                    type="button"
                    onClick={() => toggle(n.id)}
                    aria-expanded={expanded}
                    className="w-full flex items-center gap-[20px] p-[10px] text-left"
                  >
                    <span className="flex-1 min-w-0 flex flex-col gap-[4px] leading-[1.4]">
                      <span className="flex items-start gap-[4px]">
                        <span className="text-[#121212] text-[16px] break-words min-w-0">
                          {n.title}
                        </span>
                        {unread && (
                          <span
                            aria-label="안 읽음"
                            className="size-[4px] shrink-0 mt-[2px] rounded-full bg-[#FF4040]"
                          />
                        )}
                      </span>
                      <span className="text-[#808991] text-[14px] tabular-nums">
                        {formatDate(n.publishedAt)}
                      </span>
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/icons/chevron-${expanded ? 'up' : 'down'}.svg`}
                      alt=""
                      width={24}
                      height={24}
                      className="block shrink-0"
                    />
                  </button>
                  {expanded && (
                    <p className="border-t border-[#121212] p-[10px] text-[#121212] text-[14px] leading-[1.4] whitespace-pre-wrap break-words">
                      {n.content}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
