'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChildren, type Child } from '@/hooks/useChildren';
import ChildSelector from '@/components/ChildSelector';
import EmptyChildState from '@/components/EmptyChildState';
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
    setViewTab('records');
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
            우리 아이를 등록하면
            <br />
            키, 몸무게, 머리둘레를 기록할 수 있어요.
          </>
        }
      />
    );
  }

  const isFormValid = !!(heightCm || weightKg || headCircumCm);

  return (
    <main className="min-h-[100dvh] bg-gray-50 pb-32">
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
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewTab('chart')}
            className={`flex-1 h-[36px] rounded-lg text-[13px] font-semibold transition-colors ${
              viewTab === 'chart'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            성장도표
          </button>
          <button
            type="button"
            onClick={() => setViewTab('records')}
            className={`flex-1 h-[36px] rounded-lg text-[13px] font-semibold transition-colors ${
              viewTab === 'records'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
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
          <div className="flex gap-2 mb-4">
            {METRIC_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveMetric(tab.key)}
                className={`flex-1 h-[32px] rounded-lg text-[13px] font-medium transition-colors ${
                  activeMetric === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600'
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
          <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
            2017 소아청소년 성장도표 기준 (0-36개월: WHO Growth Standards)
          </p>

          {/* 기록 추가 버튼 */}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
              setViewTab('records');
            }}
            className="w-full h-[44px] mt-4 rounded-xl bg-primary-500 text-white font-semibold text-[14px] active:opacity-80"
          >
            + 성장 기록 추가
          </button>
        </div>
      )}

      {/* ── 기록 탭 ── */}
      {viewTab === 'records' && (
        <>

      {/* 새 기록 추가 버튼 */}
      {!showForm && (
        <div className="px-5 mt-4">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="w-full h-[48px] rounded-xl bg-primary-500 text-white font-semibold text-[15px] active:opacity-80"
          >
            + 성장 기록 추가
          </button>
        </div>
      )}

      {/* 입력 폼 */}
      {showForm && (
        <div className="px-5 mt-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-[16px] font-bold text-gray-900 mb-4">
              {editingId ? '기록 수정' : '새 기록'}
            </h2>

            {/* 측정일 */}
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-gray-600 mb-1 block">
                측정일
              </span>
              <input
                type="date"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                max={todayString()}
                className="w-full h-[44px] px-3 rounded-lg border border-gray-200 text-[15px] text-gray-900 bg-white"
              />
            </label>

            {/* 키 */}
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-gray-600 mb-1 block">
                키 (cm)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="예: 75.5"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full h-[44px] px-3 rounded-lg border border-gray-200 text-[15px] text-gray-900 placeholder:text-gray-400"
              />
            </label>

            {/* 몸무게 */}
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-gray-600 mb-1 block">
                몸무게 (kg)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="예: 9.8"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full h-[44px] px-3 rounded-lg border border-gray-200 text-[15px] text-gray-900 placeholder:text-gray-400"
              />
            </label>

            {/* 머리둘레 */}
            <label className="block mb-3">
              <span className="text-[13px] font-medium text-gray-600 mb-1 block">
                머리둘레 (cm)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="예: 45.2"
                value={headCircumCm}
                onChange={(e) => setHeadCircumCm(e.target.value)}
                className="w-full h-[44px] px-3 rounded-lg border border-gray-200 text-[15px] text-gray-900 placeholder:text-gray-400"
              />
            </label>

            {/* 메모 */}
            <label className="block mb-4">
              <span className="text-[13px] font-medium text-gray-600 mb-1 block">
                메모 (선택)
              </span>
              <input
                type="text"
                placeholder="예: 병원 정기검진"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full h-[44px] px-3 rounded-lg border border-gray-200 text-[15px] text-gray-900 placeholder:text-gray-400"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1 h-[44px] rounded-xl bg-gray-100 text-gray-600 font-semibold text-[14px] active:opacity-80"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isFormValid || saving}
                className="flex-1 h-[44px] rounded-xl bg-primary-500 text-white font-semibold text-[14px] active:opacity-80 disabled:opacity-40"
              >
                {saving ? '저장 중...' : editingId ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기록 목록 */}
      <div className="px-5 mt-6">
        <h2 className="text-[15px] font-bold text-gray-900 mb-3">
          기록 내역
        </h2>

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
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-gray-900">
                  {formatDate(record.measuredAt)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(record)}
                    className="text-[12px] text-gray-500 active:text-gray-700"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingId(record.id)}
                    className="text-[12px] text-red-400 active:text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {record.heightCm != null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-[11px] text-gray-500">키</p>
                    <p className="text-[15px] font-bold text-gray-900">
                      {record.heightCm}
                      <span className="text-[11px] font-normal text-gray-500 ml-0.5">
                        cm
                      </span>
                    </p>
                  </div>
                )}
                {record.weightKg != null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-[11px] text-gray-500">몸무게</p>
                    <p className="text-[15px] font-bold text-gray-900">
                      {record.weightKg}
                      <span className="text-[11px] font-normal text-gray-500 ml-0.5">
                        kg
                      </span>
                    </p>
                  </div>
                )}
                {record.headCircumCm != null && (
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-[11px] text-gray-500">머리둘레</p>
                    <p className="text-[15px] font-bold text-gray-900">
                      {record.headCircumCm}
                      <span className="text-[11px] font-normal text-gray-500 ml-0.5">
                        cm
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {record.memo && (
                <p className="text-[12px] text-gray-500 mt-2">
                  {record.memo}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      </>
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
