'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import BottomSheet from '@/components/BottomSheet';
import ChildSelector from '@/components/ChildSelector';
import ConfirmModal from '@/components/ConfirmModal';
import NoChildCard from '@/components/NoChildCard';
import { useLoginPrompt } from '@/components/LoginPromptProvider';
import PageHeader from '@/components/PageHeader';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';
import GrowthChart from './GrowthChart';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';
import type { MetricType, Gender } from './growthStandards';

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

type ViewTab = 'chart' | 'records';

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso: string): string {
  const d = iso.slice(0, 10);
  const [y, m, dd] = d.split('-');
  return `${y}. ${m}. ${dd}`;
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

const METRIC_TABS: { key: MetricType; label: string }[] = [
  { key: 'height', label: '키' },
  { key: 'weight', label: '체중' },
  { key: 'head', label: '머리둘레' },
];

function resolveGender(child: Child): Gender {
  const g = child.gender?.toLowerCase();
  if (g === 'female' || g === 'f' || g === '여' || g === '여아') return 'female';
  return 'male';
}

export default function PhysicalGrowthClient() {
  const { children: childList, isLoaded } = useChildren();
  const { openLoginPrompt } = useLoginPrompt();
  const [selected, setSelected] = useState<Child | null>(null);
  const [records, setRecords] = useState<PhysicalGrowthRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // 탭 상태
  const [viewTab, setViewTab] = useState<ViewTab>('chart');
  const [activeMetric, setActiveMetric] = useState<MetricType>('height');

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

  useEffect(() => {
    if (!showForm) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [showForm]);

  useEffect(() => {
    if (isLoaded && childList.length > 0 && !selected) {
      setSelected(childList[0]);
    }
  }, [isLoaded, childList, selected]);

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

  const noChild = !selected;

  return (
    <main className="bg-white pb-32">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white">
        <PageHeader title="성장" variant="back" />
        <div className="px-5 pb-3">
          {noChild ? (
            <NoChildCard loginMessage="로그인하고 우리 아기의 성장 기록을 확인하세요." />
          ) : (
            <ChildSelector
              children={childList}
              selected={selected}
              onSelect={setSelected}
            />
          )}
        </div>
      </header>

      <section className="pt-2 flex justify-center">
        <KakaoAdBanner unit="DAN-Fm093TsMO8DEkFC3" />
      </section>

      {/* 성장도표 / 기록 탭 전환 */}
      <div className="px-5 mt-3">
        <div className="flex h-[38px] bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewTab('chart')}
            className={`flex-1 h-[30px] rounded-lg text-[14px] transition-colors ${
              viewTab === 'chart'
                ? 'bg-white text-black font-medium shadow-sm'
                : 'text-gray-500 font-normal'
            }`}
          >
            성장도표
          </button>
          <button
            type="button"
            onClick={() => setViewTab('records')}
            className={`flex-1 h-[30px] rounded-lg text-[14px] transition-colors ${
              viewTab === 'records'
                ? 'bg-white text-black font-medium shadow-sm'
                : 'text-gray-500 font-normal'
            }`}
          >
            기록
          </button>
        </div>
      </div>

      {/* ── 성장도표 탭 ── */}
      {viewTab === 'chart' && (
        <div className="px-5 mt-4">
          {/* 지표 선택 탭 (키/체중/머리둘레) */}
          <div className="flex gap-2 mb-6">
            {METRIC_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMetric(tab.key)}
                className={`flex-1 h-[30px] rounded-lg text-[12px] font-medium transition-colors ${
                  activeMetric === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 성장 도표 차트 — 비로그인/아기 미등록 시에도 WHO 기준 곡선만 표시 */}
          <GrowthChart
            gender={selected ? resolveGender(selected) : 'male'}
            metric={activeMetric}
            birthDate={selected?.birthDate ?? todayString()}
            records={selected ? records : []}
          />

          {/* 성장도표 안내 문구 */}
          <ul className="mt-6 space-y-1 text-[10px] font-normal text-gray-500">
            <li className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>기록을 추가하면 성장 곡선에 표시됩니다</span>
            </li>
            <li className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>2017 소아청소년 성장도표 기준(0-36개월: WHO Growth Standards)</span>
            </li>
          </ul>
        </div>
      )}

      {/* ── 기록 탭 ── */}
      {viewTab === 'records' && (
        <>

      {/* 기록 목록 */}
      <div className="px-5 mt-6">
        {loading && records.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="rounded-[8px] border border-dotted border-gray-200 px-5 py-12 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-empty-record.svg"
                alt=""
                width={20}
                height={20}
                aria-hidden="true"
              />
            </div>
            <p className="mt-[10px] text-[14px] font-medium text-black">
              아직 등록된 기록이 없어요.
            </p>
            <p className="mt-[4px] text-[12px] font-normal text-gray-500">
              우리 아기의 성장을 기록해 보세요.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {records.map((record) => {
            const days = selected
              ? daysSinceBirth(selected.birthDate, record.measuredAt)
              : 0;
            return (
                <div
                  key={record.id}
                  className="relative bg-white rounded-lg p-4 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1">
                      <span className="bg-primary-500 text-white text-[12px] font-medium leading-none h-4 px-1 py-0.5 rounded flex items-center">
                        D+{days}
                      </span>
                      <span className="text-[12px] font-normal text-black">
                        {formatDateShort(record.measuredAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] font-normal text-gray-500">
                      <button
                        type="button"
                        onClick={() => handleEdit(record)}
                        className="active:text-gray-700"
                      >
                        수정
                      </button>
                      <span aria-hidden="true" className="w-px h-2.5 bg-gray-200" />
                      <button
                        type="button"
                        onClick={() => setDeletingId(record.id)}
                        className="active:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <div className="bg-gray-100 rounded py-[9px] text-center">
                      <p className="text-[10px] font-normal text-gray-500 leading-none">키</p>
                      <p className="mt-2 leading-none">
                        {record.heightCm != null ? (
                          <>
                            <span className="text-[12px] font-medium text-black">
                              {record.heightCm}
                            </span>
                            <span className="text-[10px] font-normal text-gray-500 ml-0.5">
                              cm
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-100 rounded py-[9px] text-center">
                      <p className="text-[10px] font-normal text-gray-500 leading-none">체중</p>
                      <p className="mt-2 leading-none">
                        {record.weightKg != null ? (
                          <>
                            <span className="text-[12px] font-medium text-black">
                              {record.weightKg}
                            </span>
                            <span className="text-[10px] font-normal text-gray-500 ml-0.5">
                              kg
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-100 rounded py-[9px] text-center">
                      <p className="text-[10px] font-normal text-gray-500 leading-none">머리둘레</p>
                      <p className="mt-2 leading-none">
                        {record.headCircumCm != null ? (
                          <>
                            <span className="text-[12px] font-medium text-black">
                              {record.headCircumCm}
                            </span>
                            <span className="text-[10px] font-normal text-gray-500 ml-0.5">
                              cm
                            </span>
                          </>
                        ) : (
                          <span className="text-[12px] text-gray-400">-</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {record.memo && (
                    <div className="mt-2.5 bg-gray-100 rounded px-3 py-2">
                      <p className="text-[10px] font-normal text-black">
                        {record.memo}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      </>
      )}

      {/* + 기록 FAB — 하단 네비게이션 위 16px */}
      {!showForm && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 px-5 pointer-events-none flex justify-end"
          style={{ bottom: 'var(--bottom-nav-space)' }}
        >
          <button
            type="button"
            onClick={() => {
              if (noChild) {
                openLoginPrompt('로그인하고 우리 아기의 성장 기록을 시작하세요.');
                return;
              }
              resetForm();
              setShowForm(true);
            }}
            className="pointer-events-auto flex items-center h-[32px] rounded-full bg-primary-500 text-white text-[12px] font-medium shadow-lg active:scale-95 transition-transform"
            style={{ padding: '10px 12px', gap: '6px' }}
            aria-label="성장 기록 추가"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            기록
          </button>
        </div>
      )}

      {/* 입력 바텀시트 */}
      <BottomSheet
        open={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        maxHeight="90dvh"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-[16px] font-medium text-black">
            {editingId ? '성장 기록 수정' : '성장 기록하기'}
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="w-5 h-5 flex items-center justify-center text-black"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-0 space-y-3">
          {/* 측정일 */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">
              측정일 <span className="text-red-500">*</span>
            </p>
            <button
              type="button"
              onClick={() => setDatePickerOpen(true)}
              className="w-full h-[48px] px-3 rounded-[4px] border border-gray-200 text-[14px] text-left text-gray-900 bg-white active:bg-gray-50"
            >
              {formatDate(measuredAt)}.
            </button>
          </div>

          {/* 키 */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">
              키(cm)
            </p>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="51"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="w-full h-[48px] px-3 rounded-[4px] border border-gray-200 text-[14px] text-gray-900 placeholder:font-normal placeholder:text-gray-400"
            />
          </div>

          {/* 몸무게 */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">
              몸무게(kg)
            </p>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="3.09"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full h-[48px] px-3 rounded-[4px] border border-gray-200 text-[14px] text-gray-900 placeholder:font-normal placeholder:text-gray-400"
            />
          </div>

          {/* 머리둘레 */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">
              머리둘레(cm)
            </p>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="41"
              value={headCircumCm}
              onChange={(e) => setHeadCircumCm(e.target.value)}
              className="w-full h-[48px] px-3 rounded-[4px] border border-gray-200 text-[14px] text-gray-900 placeholder:font-normal placeholder:text-gray-400"
            />
          </div>

          {/* 메모 */}
          <div>
            <p className="text-[12px] font-medium text-gray-500 mb-2">
              메모
            </p>
            <input
              type="text"
              placeholder="병원 정기검진 등"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full h-[48px] px-3 rounded-[4px] border border-gray-200 text-[14px] text-gray-900 placeholder:font-normal placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="flex-1 h-[48px] rounded-[4px] bg-gray-100 text-gray-600 font-semibold text-[15px] active:opacity-80"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-[48px] rounded-[4px] bg-primary-500 text-white font-semibold text-[15px] active:opacity-80 disabled:opacity-40"
          >
            {saving ? '저장 중...' : editingId ? '수정' : '저장'}
          </button>
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
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M29.1788 6.44333H4M26.7099 10.146L26.0286 20.3658C25.7665 24.2966 25.6361 26.262 24.355 27.4604C23.0738 28.6587 21.1024 28.66 17.1626 28.66H16.0163C12.0764 28.66 10.1051 28.66 8.82393 27.4604C7.54275 26.262 7.41096 24.2966 7.15028 20.3658L6.46898 10.146" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8.44336 6.44334H8.60629C9.20235 6.4281 9.77995 6.23335 10.2635 5.88454C10.7471 5.53574 11.1142 5.04909 11.3167 4.48825L11.3671 4.33571L11.5108 3.90469C11.6337 3.53593 11.6959 3.35226 11.7774 3.19527C11.9376 2.88775 12.1676 2.62205 12.449 2.41937C12.7304 2.21671 13.0552 2.08274 13.3977 2.02814C13.5709 2 13.765 2 14.153 2H19.0259C19.414 2 19.608 2 19.7813 2.02814C20.1237 2.08274 20.4486 2.21671 20.73 2.41937C21.0114 2.62205 21.2414 2.88775 21.4017 3.19527C21.4831 3.35226 21.5453 3.53593 21.6682 3.90469L21.8118 4.33571C21.9996 4.95966 22.3878 5.50432 22.9163 5.88534C23.4448 6.26637 24.0843 6.46248 24.7356 6.44334" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        }
        title="기록 삭제하기"
        description={'기록을 삭제할까요?\n삭제하면 다시 되돌릴 수 없어요.'}
        confirmLabel="삭제하기"
        cancelLabel="취소"
        onConfirm={() => deletingId && handleDelete(deletingId)}
        onClose={() => setDeletingId(null)}
      />
    </main>
  );
}
