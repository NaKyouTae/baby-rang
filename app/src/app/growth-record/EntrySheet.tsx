'use client';

import { useEffect, useState } from 'react';
import {
  FieldDef,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
} from './types';
import HorizontalNumberPicker from './HorizontalNumberPicker';
import DateTimeDragPicker from './DateTimeDragPicker';
import TimePickerModal from './TimePickerModal';
import ConfirmModal from '@/components/ConfirmModal';

function rangeFor(field: FieldDef): { min: number; max: number; step: number; decimals: number } {
  switch (field.unit) {
    case 'ml':
      return { min: 0, max: 500, step: 5, decimals: 0 };
    case 'g':
      return { min: 0, max: 500, step: 5, decimals: 0 };
    case '분':
      return { min: 0, max: 240, step: 1, decimals: 0 };
    case '℃':
      return { min: 35, max: 42, step: 0.1, decimals: 1 };
    default:
      return { min: 0, max: 1000, step: 1, decimals: 0 };
  }
}

interface Props {
  childId: string;
  type: GrowthType;
  initial?: GrowthRecord | null;
  defaultDate: string; // YYYY-MM-DD
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowLocalInput(date: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function nowFullLocalInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function parseLocal(s: string) {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) {
    const d = new Date();
    return {
      y: d.getFullYear(),
      mo: d.getMonth() + 1,
      d: d.getDate(),
      h: d.getHours(),
      mi: d.getMinutes(),
    };
  }
  return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
}

function fmtLocal(y: number, mo: number, d: number, h: number, mi: number) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}`;
}

function formatHourMin(s: string): string {
  const { h, mi } = parseLocal(s);
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${String(mi).padStart(2, '0')}`;
}

export default function EntrySheet({
  childId,
  type,
  initial,
  defaultDate,
  onClose,
  onSaved,
}: Props) {
  const cfg = TYPE_CONFIG[type];
  const [startAt, setStartAt] = useState(
    initial ? toLocalInput(initial.startAt) : nowLocalInput(defaultDate),
  );
  const [endAt, setEndAt] = useState(
    initial?.endAt ? toLocalInput(initial.endAt) : '',
  );
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [data, setData] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    const src = (initial?.data ?? {}) as Record<string, unknown>;
    cfg.fields.forEach((f) => {
      if (src[f.key] != null) d[f.key] = String(src[f.key]);
      else if (f.kind === 'segmented' && f.options) d[f.key] = f.options[0].value;
    });
    return d;
  });
  const initialUrls: string[] = (() => {
    const arr = initial?.imageUrls && initial.imageUrls.length > 0
      ? initial.imageUrls
      : initial?.imageUrl
        ? [initial.imageUrl]
        : [];
    return arr.slice(0, 5);
  })();
  const [keepUrls, setKeepUrls] = useState<string[]>(initialUrls);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const totalImages = keepUrls.length + newFiles.length;
  const canAddImage = totalImages < 5;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function handleSave() {
    if (!startAt) return;
    setSaving(true);
    try {
      const fd = new FormData();
      if (!initial) fd.append('childId', childId);
      fd.append('type', type);
      fd.append('startAt', new Date(startAt).toISOString());
      if (cfg.hasEnd && endAt) {
        fd.append('endAt', new Date(endAt).toISOString());
      } else if (initial && !cfg.hasEnd) {
        fd.append('endAt', '');
      }
      fd.append('memo', memo);
      const cleanData: Record<string, unknown> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (v === '' || v == null) return;
        const f = cfg.fields.find((x) => x.key === k);
        cleanData[k] = f?.kind === 'number' ? Number(v) : v;
      });
      fd.append('data', JSON.stringify(cleanData));
      // 다중 이미지: 유지할 기존 url 목록 + 새 파일들
      fd.append('keepImageUrls', JSON.stringify(keepUrls));
      newFiles.forEach((f) => fd.append('images', f));

      const url = initial ? `/api/growth-records/${initial.id}` : '/api/growth-records';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (res.ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!initial) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!initial) return;
    setDeleteConfirmOpen(false);
    const res = await fetch(`/api/growth-records/${initial.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{cfg.emoji}</span>
            <h2 className="text-base font-bold text-gray-900">{cfg.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-900">시작 시간</label>
              {cfg.hasEnd && (
                endAt ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEndModal(true)}
                      className="text-xs font-semibold text-blue-600 active:text-blue-800"
                    >
                      ~ {formatHourMin(endAt)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEndAt('')}
                      className="text-[11px] text-gray-400 active:text-gray-600"
                      aria-label="완료 시간 지우기"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEndAt(nowFullLocalInput())}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 active:bg-blue-100"
                    >
                      지금 완료
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEndAt(nowFullLocalInput());
                        setShowEndModal(true);
                      }}
                      className="text-xs font-semibold text-gray-500 active:text-gray-700"
                    >
                      + 완료 시간
                    </button>
                  </div>
                )
              )}
            </div>
            <DateTimeDragPicker value={startAt} onChange={setStartAt} />
          </div>

          {cfg.hasEnd && showEndModal && (() => {
            const base = endAt || nowFullLocalInput();
            const { y, mo, d, h, mi } = parseLocal(base);
            return (
              <TimePickerModal
                open={showEndModal}
                year={y}
                month={mo}
                day={d}
                hour={h}
                minute={mi}
                onClose={() => setShowEndModal(false)}
                onConfirm={(nmo, nd, nh, nm) =>
                  setEndAt(fmtLocal(y, nmo, nd, nh, nm))
                }
              />
            );
          })()}

          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {f.label}
                {f.unit && (
                  <span className="ml-1.5 text-xs font-medium text-gray-400">
                    ({f.unit})
                  </span>
                )}
              </label>
              {f.kind === 'segmented' && f.options ? (
                <div className="grid grid-cols-3 gap-2">
                  {f.options.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setData({ ...data, [f.key]: o.value })}
                      className={`py-3 rounded-xl text-sm font-medium transition ${
                        data[f.key] === o.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : f.kind === 'number' ? (
                (() => {
                  const r = rangeFor(f);
                  const current = data[f.key] !== undefined && data[f.key] !== ''
                    ? Number(data[f.key])
                    : r.min;
                  return (
                    <div className="rounded-xl bg-gray-50 p-2">
                      <HorizontalNumberPicker
                        value={current}
                        min={r.min}
                        max={r.max}
                        step={r.step}
                        decimals={r.decimals}
                        itemWidth={56}
                        format={(v) =>
                          r.decimals > 0 ? v.toFixed(r.decimals) : String(v)
                        }
                        onChange={(v) =>
                          setData({ ...data, [f.key]: String(v) })
                        }
                      />
                    </div>
                  );
                })()
              ) : (
                <input
                  type="text"
                  value={data[f.key] ?? ''}
                  onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm"
                />
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              메모
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full px-3 py-3 rounded-xl bg-gray-50 text-sm resize-none"
              placeholder="메모를 입력하세요"
            />
          </div>

          {/* 사진 추가 기능 임시 비활성화
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-gray-900">사진</label>
              <span className="text-[11px] text-gray-400">{totalImages}/5</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {keepUrls.map((url) => (
                <div
                  key={url}
                  className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setKeepUrls(keepUrls.filter((u) => u !== url))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center"
                    aria-label="이미지 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {newFiles.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-gray-100"
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setNewFiles(newFiles.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[11px] flex items-center justify-center"
                      aria-label="이미지 삭제"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              {canAddImage && (
                <label className="shrink-0 w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer active:bg-gray-100">
                  <span className="text-2xl leading-none">＋</span>
                  <span className="text-[10px] mt-1">사진 추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []).filter(
                        (f) => f.type.startsWith('image/'),
                      );
                      if (picked.length === 0) return;
                      const remaining = 5 - totalImages;
                      setNewFiles([...newFiles, ...picked.slice(0, remaining)]);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          */}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-semibold"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirmOpen}
        emoji="🗑️"
        title={'이 기록을 삭제할까요?'}
        description={'삭제한 기록은 다시 복구할 수 없어요.'}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
