'use client';

import { useCallback, useEffect, useState } from 'react';
import { GemIcon } from './icons';

type Tab = 'charge' | 'charges' | 'spends';

type Pack = {
  productType: string;
  /** 묶음 이름에 적힌 수. */
  base: number;
  /** 덤으로 더 주는 수. 0 이면 표시하지 않는다. */
  bonus: number;
  price: number;
};

type ChargeRow = { id: string; coins: number; amount: number; at: string };
type SpendRow = { id: string; name: string; coins: number; at: string };

const TABS: { id: Tab; label: string }[] = [
  { id: 'charge', label: '보석 충전' },
  { id: 'charges', label: '구매 내역' },
  { id: 'spends', label: '사용 내역' },
];

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

/** "26.04.23 14:36" */
function formatAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getFullYear() % 100)}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  coins: number;
  /** 내역 조회에 쓸 아이. 없으면(비로그인 데모) 내역은 비워 둔다. */
  childId?: string;
}

/**
 * 보석함 — 충전 상품과 내역을 한 화면에서 본다.
 *
 * 금액과 지급량은 서버 카탈로그가 정한다. 클라이언트가 보낸 수량으로 적립하면
 * 요청 본문만 고쳐서 공짜로 보석을 받을 수 있다.
 */
export default function GemStore({ open, onClose, coins, childId }: Props) {
  const [tab, setTab] = useState<Tab>('charge');
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [charges, setCharges] = useState<ChargeRow[] | null>(null);
  const [spends, setSpends] = useState<SpendRow[] | null>(null);

  useEffect(() => {
    if (!open || tab !== 'charge' || packs !== null) return;
    let alive = true;
    fetch('/api/rooms/coin-packs')
      .then((r) => (r.ok ? r.json() : { packs: [] }))
      .then((d) => alive && setPacks(d.packs ?? []))
      .catch(() => alive && setPacks([]));
    return () => {
      alive = false;
    };
  }, [open, tab, packs]);

  useEffect(() => {
    // 비로그인 데모는 조회할 아이가 없다 — 내역은 비어 있는 것으로 그린다.
    if (!open || tab === 'charge' || !childId) return;
    if ((tab === 'charges' ? charges : spends) !== null) return;
    let alive = true;
    fetch(`/api/rooms/coin-history/${tab}/${childId}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!alive) return;
        if (tab === 'charges') setCharges(d.items ?? []);
        else setSpends(d.items ?? []);
      })
      .catch(() => {
        if (!alive) return;
        if (tab === 'charges') setCharges([]);
        else setSpends([]);
      });
    return () => {
      alive = false;
    };
  }, [open, tab, childId, charges, spends]);

  const buy = useCallback(() => {
    alert('결제 연결은 아직 붙지 않았습니다.');
  }, []);

  // 닫을 때 탭을 처음으로 되돌린다 — 다시 열었을 때 '사용 내역'이 떠 있으면
  // 충전하러 들어온 사람이 길을 잃는다.
  const close = useCallback(() => {
    setTab('charge');
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 bg-[#F7F8F9] flex flex-col gap-[10px] px-[20px] overflow-hidden"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 목록이 가리지 않는다.
        paddingBottom:
          'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 20px)',
      }}
    >
      <div className={`${BOX} h-[50px] shrink-0 flex items-center justify-between px-[10px]`}>
        {/* 디자인의 왼쪽 화살표는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
        <span className="size-[24px]" />
        <p className="text-[#121212] text-[16px] leading-none">보석함</p>
        <button type="button" onClick={close} aria-label="닫기" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/prototype/icons/close.svg" alt="" width={24} height={24} className="block" />
        </button>
      </div>

      <div className="flex gap-[10px] shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 p-[10px] rounded-[4px] border border-[#121212] text-[#121212] text-[16px] leading-[1.4] ${
              tab === t.id ? 'bg-[rgba(255,210,0,0.1)]' : 'bg-[#FDFDFE]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className={`${BOX} h-[52px] shrink-0 flex gap-[10px] items-center justify-center px-[10px]`}
      >
        <span className="text-[#121212] text-[16px] leading-none tracking-[2px]">내 보석</span>
        <GemIcon size={20} />
        <span className="text-[#121212] text-[16px] leading-none tracking-[2px] tabular-nums">
          {coins}
        </span>
      </div>

      <div className={`${BOX} flex-1 min-h-0 overflow-y-auto`}>
        {tab === 'charge' && <ChargeList packs={packs} onBuy={buy} />}
        {tab === 'charges' && <ChargeHistory rows={childId ? charges : []} />}
        {tab === 'spends' && <SpendHistory rows={childId ? spends : []} />}
      </div>
    </div>
  );
}

/** 목록 한 줄. 디자인상 줄마다 테두리가 있어 선이 겹쳐 보인다. */
const ROW = 'border border-[#121212] w-full p-[10px]';

function ChargeList({ packs, onBuy }: { packs: Pack[] | null; onBuy: () => void }) {
  if (packs === null) return <Notice>불러오는 중</Notice>;

  return (
    <>
      {/* 보석 1개는 광고 보상이라 결제 상품이 아니다 — 서버 카탈로그에 없다. */}
      <div className={`${ROW} h-[66px] flex items-center justify-between`}>
        <span className="flex gap-[10px] items-center">
          <GemIcon size={20} />
          <span className="text-[#121212] text-[16px] leading-none tracking-[2px]">보석 1개</span>
        </span>
        <span className="h-[36px] px-[12px] rounded-[4px] bg-[#EEF0F1] border border-[#BBC0C5] flex items-center justify-center text-[#BBC0C5] text-[14px] leading-none">
          AD
        </span>
      </div>

      {packs.map((p) => (
        <button
          key={p.productType}
          type="button"
          onClick={onBuy}
          className={`${ROW} h-[66px] flex items-center justify-between active:translate-y-px`}
        >
          <span className="flex gap-[10px] items-center">
            <GemIcon size={20} />
            <span className="text-[#121212] text-[16px] leading-none tracking-[2px]">
              보석 {p.base}개{p.bonus > 0 && <span className="text-[#FF4040]"> + {p.bonus}개</span>}
            </span>
          </span>
          <span className="h-[36px] px-[12px] rounded-[4px] bg-[#FFD200] border border-black flex items-center justify-center text-[#121212] text-[14px] leading-none tabular-nums">
            {p.price.toLocaleString()}원
          </span>
        </button>
      ))}
    </>
  );
}

function ChargeHistory({ rows }: { rows: ChargeRow[] | null }) {
  if (rows === null) return <Notice>불러오는 중</Notice>;
  if (!rows.length) return <Notice>구매 내역이 없습니다.</Notice>;

  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className={`${ROW} flex flex-col gap-[4px]`}>
          <p className="text-[#121212] text-[14px] leading-[1.4]">보석 {r.coins}개 충전</p>
          <p className="text-[#808991] text-[12px] leading-[1.4] tabular-nums">
            {r.amount.toLocaleString()}원 · {formatAt(r.at)}
          </p>
        </div>
      ))}
    </>
  );
}

function SpendHistory({ rows }: { rows: SpendRow[] | null }) {
  if (rows === null) return <Notice>불러오는 중</Notice>;
  if (!rows.length) return <Notice>사용 내역이 없습니다.</Notice>;

  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className={`${ROW} flex flex-col gap-[4px]`}>
          <p className="text-[#121212] text-[14px] leading-[1.4]">{r.name} 구매</p>
          <p className="text-[#808991] text-[12px] leading-[1.4] tabular-nums">
            보석 {r.coins}개 · {formatAt(r.at)}
          </p>
        </div>
      ))}
    </>
  );
}

/** 목록이 비었을 때 상자 한가운데 놓는 글. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[#BBC0C5] text-[14px] leading-[1.4]">{children}</p>
    </div>
  );
}
