'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import ChildSelector from '@/components/ChildSelector';
import EmptyChildState from '@/components/EmptyChildState';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import { kstYmdToLocalMidnight, toKstYmd } from '@/lib/childAge';
import GrowthChart from './GrowthChart';
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

  if (isLoaded && childList.length === 0) {
    return (
      <EmptyChildState
        emoji="📏"
        title="성장 측정을 시작해보세요"
        description={
          <>
            우리 아기를 등록하면
            <br />
            키, 몸무게, 머리둘레를 기록할 수 있어요.
          </>
        }
      />
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-32">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex items-center justify-between px-5 h-[56px]">
          <h1 className="text-[18px] font-bold text-gray-900">성장 측정</h1>
        </div>
        {childList.length > 0 && selected && (
          <div className="px-5 pb-3">
            <ChildSelector
              children={childList}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        )}
      </header>

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
      {viewTab === 'chart' && selected && (
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

          {/* 성장 도표 차트 */}
          <GrowthChart
            gender={resolveGender(selected)}
            metric={activeMetric}
            birthDate={selected.birthDate}
            records={records}
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
          <div className="text-center py-12">
            <p className="text-[14px] text-gray-400">
              아직 기록이 없어요.
              <br />
              성장 기록을 추가해보세요!
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
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] flex flex-col pb-[var(--safe-area-bottom)]">
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
          </div>

          <WheelDatePickerModal
            open={datePickerOpen}
            value={measuredAt}
            max={todayString()}
            onClose={() => setDatePickerOpen(false)}
            onConfirm={(d) => setMeasuredAt(d)}
          />
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 mx-6 w-full max-w-[320px]">
            <p className="text-[15px] font-semibold text-gray-900 text-center mb-1">
              기록을 삭제할까요?
            </p>
            <p className="text-[13px] text-gray-500 text-center mb-5">
              삭제된 기록은 복구할 수 없어요.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 h-[44px] rounded-xl bg-gray-100 text-gray-600 font-semibold text-[14px] active:opacity-80"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deletingId)}
                className="flex-1 h-[44px] rounded-xl bg-red-500 text-white font-semibold text-[14px] active:opacity-80"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
