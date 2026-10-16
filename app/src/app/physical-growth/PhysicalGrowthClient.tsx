'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelectedChild, type Child } from '@/hooks/useChildren';
import { useRefreshOnForeground } from '@/hooks/useRefreshOnForeground';
import BottomSheet from '@/components/BottomSheet';
import ConfirmModal from '../home/_components/ConfirmModal';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';
import GrowthChart from './GrowthChart';
import PixelTabBar, { TAB_BAR_HEIGHT } from '../home/_components/PixelTabBar';
import ChildSwitcher from '../home/_components/ChildSwitcher';
import { BOX, NoChildBox, PIXEL_FONT, PIXEL_FONT_HREF } from '../growth-record/pixelUi';
import { calcChildAge } from '@/lib/childAge';
import { groupTwins } from '@/lib/twins';

/** 선택된 칸 — #FFD200 10% 를 흰 바탕 위에 겹쳐 불투명하게 칠한다(패턴 탭과 같은 색). */
const SELECTED_BG = 'linear-gradient(rgba(255,210,0,0.1), rgba(255,210,0,0.1)), #FDFDFE';
import type { MetricType, Gender } from './growthStandards';
import Loading from '@/components/Loading';

interface PhysicalGrowthRecord {
  id: string;
  childId: string;
  measuredAt: string;
  heightCm: number | null;
  weightKg: number | null;
  headCircumCm: number | null;
  memo: string | null;
  createdAt: string;
}

/** 위 탭 — 키·체중은 성장 도표, 기록은 기록 목록. */
type ViewTab = 'height' | 'weight' | 'records';

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateShort(iso: string): string {
  const d = iso.slice(0, 10);
  const [y, m, dd] = d.split('-');
  return `${y.slice(2)}.${m}.${dd}`;
}

/** 출생일과 측정일 사이의 D+일수 (출생일 당일 = D+1, 한국식). */
function daysSinceBirth(birthDate: string, measuredAt: string): number {
  const birthYmd = toKstYmd(birthDate);
  const measuredYmd = toKstYmd(measuredAt);
  const birth = kstYmdToLocalMidnight(birthYmd).getTime();
  const measured = kstYmdToLocalMidnight(measuredYmd).getTime();
  if (Number.isNaN(birth) || Number.isNaN(measured)) return 1;
  return Math.max(1, Math.floor((measured - birth) / 86400000) + 1);
}

const VIEW_TABS: { key: ViewTab; label: string }[] = [
  { key: 'height', label: '키' },
  { key: 'weight', label: '체중' },
  { key: 'records', label: '기록' },
];

/** 기록 줄의 첫 줄 — 있는 값만 '･' 로 잇는다. */
function recordValues(r: PhysicalGrowthRecord): string[] {
  const parts: string[] = [];
  if (r.heightCm != null) parts.push(`키 ${r.heightCm}cm`);
  if (r.weightKg != null) parts.push(`체중 ${r.weightKg}kg`);
  if (r.headCircumCm != null) parts.push(`머리둘레 ${r.headCircumCm}cm`);
  return parts;
}

/** 시트 입력칸 — 회색 테두리, 높이 52, 글자 16. */
const FIELD =
  'w-full h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] text-[16px] leading-none text-[#121212] placeholder:text-[#BBC0C5] outline-none';
const FIELD_LABEL = 'text-[14px] leading-[1.4] text-[#808991]';

function resolveGender(child: Child): Gender {
  const g = child.gender?.toLowerCase();
  if (g === 'female' || g === 'f' || g === '여' || g === '여아') return 'female';
  return 'male';
}

export default function PhysicalGrowthClient() {
  const {
    children: childList,
    isLoaded,
    selectedChild: selected,
    selectChild: setSelected,
  } = useSelectedChild();
  const { openLoginPrompt } = useLoginPrompt();
  const [records, setRecords] = useState<PhysicalGrowthRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 탭 상태
  const [viewTab, setViewTab] = useState<ViewTab>('height');
  const activeMetric: MetricType = viewTab === 'weight' ? 'weight' : 'height';

  // 입력 폼
  const [showForm, setShowForm] = useState(false);
  const [measuredAt, setMeasuredAt] = useState(todayString());
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [headCircumCm, setHeadCircumCm] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  // 수정 모드
  const [editingId, setEditingId] = useState<string | null>(null);

  // 삭제 확인
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 날짜 선택 모달
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // 이 페이지는 화면 높이에 고정한다. 기록 목록은 내부에서만 스크롤한다.
  useEffect(() => {
    const appScroller = document.getElementById('app-scroll-container');
    if (!appScroller) return;
    const previousOverflowY = appScroller.style.overflowY;
    const previousOverscrollBehaviorY = appScroller.style.overscrollBehaviorY;
    appScroller.style.overflowY = 'hidden';
    appScroller.style.overscrollBehaviorY = 'none';
    return () => {
      appScroller.style.overflowY = previousOverflowY;
      appScroller.style.overscrollBehaviorY = previousOverscrollBehaviorY;
    };
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [showForm]);

  const fetchRecords = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/physical-growth?childId=${selected.id}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 앱 포그라운드 복귀 시 현재 아이의 기록을 다시 불러온다.
  useRefreshOnForeground(fetchRecords, { enabled: !!selected });

  const resetForm = () => {
    setMeasuredAt(todayString());
    setHeightCm('');
    setWeightKg('');
    setHeadCircumCm('');
    setMemo('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!selected) return;
    if (!heightCm && !weightKg && !headCircumCm) return;
    setSaving(true);

    const body: Record<string, unknown> = {
      childId: selected.id,
      measuredAt,
    };
    if (heightCm) body.heightCm = parseFloat(heightCm);
    if (weightKg) body.weightKg = parseFloat(weightKg);
    if (headCircumCm) body.headCircumCm = parseFloat(headCircumCm);
    if (memo.trim()) body.memo = memo.trim();

    try {
      if (editingId) {
        await fetch(`/api/physical-growth/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/physical-growth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      setShowForm(false);
      await fetchRecords();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: PhysicalGrowthRecord) => {
    setEditingId(record.id);
    setMeasuredAt(record.measuredAt.slice(0, 10));
    setHeightCm(record.heightCm != null ? String(record.heightCm) : '');
    setWeightKg(record.weightKg != null ? String(record.weightKg) : '');
    setHeadCircumCm(
      record.headCircumCm != null ? String(record.headCircumCm) : '',
    );
    setMemo(record.memo ?? '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/physical-growth/${id}`, { method: 'DELETE' });
      setDeletingId(null);
      await fetchRecords();
    } catch {
      // ignore
    }
  };

  if (!isLoaded) return null;

  const noChild = !selected;

  // 아이 카드 — 쌍둥이는 한 카드에 같이(패턴·원더윅스와 같은 카드)
  const twinGroups = groupTwins(childList);
  const currentGroup = selected
    ? (twinGroups.find((g) => g.some((c) => c.id === selected.id)) ?? [selected])
    : null;
  const toGroup = (g: typeof childList) => ({
    key: g[0].id,
    kids: g.map((c) => ({ name: c.name, gender: c.gender })),
  });
  const age = selected ? calcChildAge(selected.birthDate) : null;

  const openAddForm = () => {
    if (noChild) {
      openLoginPrompt('로그인하고 우리 아기의 성장 기록을 시작하세요.');
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  return (
    <main
      className="overflow-hidden flex flex-col gap-[10px] bg-[#F7F8F9] px-[20px]"
      style={{
        // 레이아웃이 높이 없는 div 로 감싸서 h-full 이 풀리지 않는다. 앱 셸 높이를 직접 준다.
        height: 'var(--app-h, 100dvh)',
        fontFamily: PIXEL_FONT,
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 탭바가 가리지 않는다.
        paddingBottom: 'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 10px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 다른 픽셀 화면과 같은 링크다. */}
      <link rel="stylesheet" href={PIXEL_FONT_HREF} />

      {/* 제목 상자 — 오른쪽 + 로 기록 추가 */}
      <header className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <span className="size-[24px] shrink-0" aria-hidden />
        <h1 className="text-[#121212] text-[16px] leading-none font-normal">성장</h1>
        <button
          type="button"
          onClick={openAddForm}
          className="size-[24px] shrink-0 active:translate-y-px"
          aria-label="성장 기록 추가"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/plus.svg" alt="" width={24} height={24} className="block" />
        </button>
      </header>

      {/* 아이 카드 — 쌍둥이는 한 카드에 같이(패턴·원더윅스와 같은 카드) */}
      <div className="shrink-0 flex">
        {currentGroup && age ? (
          <ChildSwitcher
            current={toGroup(currentGroup)}
            groups={twinGroups.map(toGroup)}
            ageParts={[`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`]}
            onSelect={(key) => {
              const next = childList.find((c) => c.id === key);
              if (next) setSelected(next);
            }}
          />
        ) : (
          <NoChildBox
            sub="아기를 추가하면 성장을 기록할 수 있어요"
            loginMessage="로그인하고 우리 아기의 성장 기록을 확인하세요."
          />
        )}
      </div>

      {/* 키 / 체중 / 기록 */}
      <div className="shrink-0 flex gap-[10px]">
        {VIEW_TABS.map((tab) => {
          const on = viewTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setViewTab(tab.key)}
              aria-pressed={on}
              className="flex-1 min-w-0 h-[32px] px-[10px] rounded-[4px] border border-[#121212] text-[#121212] text-[16px] leading-[1.4] whitespace-nowrap active:translate-y-px"
              style={{ background: on ? SELECTED_BG : '#FDFDFE' }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {viewTab !== 'records' ? (
        /* ── 성장 도표 — 비로그인/아기 미등록 시에도 WHO 기준 곡선만 표시 ── */
        <div className={`${BOX} flex-1 min-h-0 overflow-hidden py-[10px] flex flex-col gap-[10px]`}>
          <GrowthChart
            gender={selected ? resolveGender(selected) : 'male'}
            metric={activeMetric}
            birthDate={selected?.birthDate ?? todayString()}
            records={selected ? records : []}
          />
          <ul className="mx-[10px] shrink-0 flex flex-col gap-[4px] list-disc pl-[18px] text-[12px] leading-[1.4] text-[#808991]">
            <li>기록을 추가하면 성장 곡선에 표시됩니다</li>
            <li>2017 소아청소년 성장도표 기준(0-36개월: WHO Growth Standards)</li>
          </ul>
        </div>
      ) : (
        /* ── 기록 목록 ── */
        <div className={`${BOX} flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col`}>
          {loading && records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Loading size={24} className="text-[#808991]" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[14px] leading-[1.4] text-[#808991]">등록된 기록이 없습니다.</p>
            </div>
          ) : (
            records.map((record) => {
              const days = selected ? daysSinceBirth(selected.birthDate, record.measuredAt) : 0;
              const recAge = selected ? calcChildAge(selected.birthDate, new Date(record.measuredAt)) : null;
              const values = recordValues(record);
              const sub = [
                `D+${days}`,
                ...(recAge ? [`${recAge.months}개월 ${recAge.extraDays}일`] : []),
                formatDateShort(record.measuredAt),
              ];
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => handleEdit(record)}
                  className="shrink-0 w-full flex items-center justify-between gap-[10px] p-[10px] border-b border-[#121212] text-left active:bg-[#F7F8F9]"
                  aria-label={`${formatDateShort(record.measuredAt)} 기록 수정`}
                >
                  <span className="min-w-0 flex flex-col gap-[4px] leading-[1.4] whitespace-nowrap">
                    <span className="flex flex-wrap gap-x-[10px] items-center text-[16px] text-[#121212]">
                      {values.map((v, i) => (
                        <span key={v} className="flex gap-[10px] items-center">
                          {i > 0 && <span aria-hidden>･</span>}
                          {v}
                        </span>
                      ))}
                    </span>
                    <span className="flex gap-[10px] items-center text-[14px] text-[#808991]">
                      {sub.map((v, i) => (
                        <span key={i} className="flex gap-[10px] items-center">
                          {i > 0 && <span aria-hidden>･</span>}
                          {v}
                        </span>
                      ))}
                    </span>
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/chevron-right.svg" alt="" width={24} height={24} className="block shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* 탭바는 화면 아래에 떠 있다 — 그 자리만큼 비워 둔다 */}
      <div className="shrink-0" style={{ height: TAB_BAR_HEIGHT }} aria-hidden />

      {/* 기록 추가/수정 바텀시트 */}
      <BottomSheet
        pixel
        variant="sheet"
        open={showForm}
        onClose={closeForm}
        maxHeight="90dvh"
        ariaLabel={editingId ? '기록 수정하기' : '기록 추가하기'}
      >
        <div
          className="flex flex-col items-center gap-[16px] px-[20px] pt-[8px] overflow-y-auto"
          style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 20px)' }}
        >
          <span className="w-[36px] h-[4px] rounded-full bg-[#121212] shrink-0" aria-hidden />
          <h2 className="w-full text-center text-[16px] leading-[1.4] font-normal text-[#121212]">
            {editingId ? '기록 수정하기' : '기록 추가하기'}
          </h2>

          <div className="w-full flex flex-col gap-[10px] py-[8px]">
            {/* 측정일 */}
            <div className="flex flex-col gap-[8px]">
              <p className={FIELD_LABEL}>측정일</p>
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className={`${FIELD} text-left tabular-nums active:bg-[#F7F8F9]`}
              >
                {formatDateShort(measuredAt)}
              </button>
            </div>

            {/* 키 */}
            <div className="flex flex-col gap-[8px]">
              <p className={FIELD_LABEL}>키(cm)</p>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="키를 입력하세요."
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={FIELD}
                aria-label="키(cm)"
              />
            </div>

            {/* 몸무게 */}
            <div className="flex flex-col gap-[8px]">
              <p className={FIELD_LABEL}>몸무게(kg)</p>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="몸무게를 입력하세요."
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={FIELD}
                aria-label="몸무게(kg)"
              />
            </div>
          </div>

          <div className="w-full flex gap-[10px]">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none whitespace-nowrap active:translate-y-px"
            >
              취소
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  const id = editingId;
                  closeForm();
                  setDeletingId(id);
                }}
                className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none whitespace-nowrap active:translate-y-px"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none whitespace-nowrap active:translate-y-px disabled:opacity-60 flex items-center justify-center"
            >
              {saving ? <Loading size={18} label="저장 중" /> : '저장하기'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <WheelDatePickerModal
        open={datePickerOpen}
        value={measuredAt}
        max={todayString()}
        onClose={() => setDatePickerOpen(false)}
        onConfirm={(d) => setMeasuredAt(d)}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={deletingId !== null}
        showThumbnail={false}
        title="성장 기록을 삭제할까요?"
        description={'삭제한 기록은 다시 불러올 수 없어요.\n삭제 후에는 성장 도표에 반영되지 않아요.'}
        confirmLabel="삭제하기"
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onCancel={() => setDeletingId(null)}
      />

      <PixelTabBar active="growth" />
    </main>
  );
}
