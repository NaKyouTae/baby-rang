'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FieldDef,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
} from './types';
import TimePickerModal from './TimePickerModal';
import WheelPickerModal from './WheelPickerModal';
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
  lastRecord?: GrowthRecord | null;
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

function formatDisplayDate(s: string): string {
  const { y, mo, d, h, mi } = parseLocal(s);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}. ${p(mo)}. ${p(d)}. ${p(h)}:${p(mi)}`;
}

type FieldRow =
  | { kind: 'single'; field: FieldDef }
  | { kind: 'pair'; left: FieldDef; right: FieldDef };

function pairFields(fields: FieldDef[]): FieldRow[] {
  const rows: FieldRow[] = [];
  let i = 0;
  while (i < fields.length) {
    const a = fields[i];
    const b = fields[i + 1];
    const isPair =
      a && b &&
      a.kind === 'number' && b.kind === 'number' &&
      a.unit === b.unit &&
      a.key.startsWith('left') && b.key.startsWith('right');
    if (isPair) {
      rows.push({ kind: 'pair', left: a, right: b });
      i += 2;
    } else {
      rows.push({ kind: 'single', field: a });
      i += 1;
    }
  }
  return rows;
}

export default function EntrySheet({
  childId,
  type,
  initial,
  lastRecord,
  defaultDate,
  onClose,
  onSaved,
}: Props) {
  const cfg = TYPE_CONFIG[type];
  const [startAt, setStartAt] = useState(
    initial ? toLocalInput(initial.startAt) : nowLocalInput(defaultDate),
  );
  // endAt 컬럼은 유지하지만 UI 에서 노출하지 않는다.
  // 편집 시 기존 값을 그대로 전송하기 위해 보관.
  const [endAt] = useState(
    initial?.endAt ? toLocalInput(initial.endAt) : '',
  );
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [data, setData] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    const src = (initial?.data ?? {}) as Record<string, unknown>;
    const prev = (!initial && lastRecord?.data ? lastRecord.data : {}) as Record<string, unknown>;
    cfg.fields.forEach((f) => {
      if (src[f.key] != null) d[f.key] = String(src[f.key]);
      else if (prev[f.key] != null) d[f.key] = String(prev[f.key]);
      else if (f.kind === 'segmented' && f.options) d[f.key] = f.options[0].value;
    });
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [pickerField, setPickerField] = useState<FieldDef | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const fieldRows = useMemo(() => pairFields(cfg.fields), [cfg.fields]);

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
      fd.append('keepImageUrls', JSON.stringify([]));

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

  function elapsedMinutesFromStart(): number {
    const start = new Date(startAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.round((now - start) / 60000));
  }

  function fillNow(field: FieldDef) {
    const mins = elapsedMinutesFromStart();
    const r = rangeFor(field);
    const clamped = Math.min(r.max, Math.max(r.min, mins));
    setData({ ...data, [field.key]: String(clamped) });
  }

  function formatFieldValue(f: FieldDef, raw: string | undefined): string {
    if (raw === undefined || raw === '') return '0';
    const r = rangeFor(f);
    const n = Number(raw);
    return r.decimals > 0 ? n.toFixed(r.decimals) : String(n);
  }

  function formatWheelItem(f: FieldDef, v: number): string {
    const r = rangeFor(f);
    const num = r.decimals > 0 ? v.toFixed(r.decimals) : String(v);
    return f.unit ? `${num}${f.unit}` : num;
  }

  function renderNumberField(f: FieldDef, opts?: { showNowButton?: boolean }) {
    const showNow = opts?.showNowButton;
    return (
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setPickerField(f)}
          className="flex-1 min-w-0 px-3 py-3 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-900 tabular-nums active:bg-gray-50"
        >
          {data[f.key] && data[f.key] !== '' && data[f.key] !== '0' ? (
            <span className="text-gray-900">{formatFieldValue(f, data[f.key])}</span>
          ) : (
            <span className="text-gray-400">0</span>
          )}
        </button>
        {showNow && (
          <button
            type="button"
            onClick={() => fillNow(f)}
            className="shrink-0 px-3 rounded-xl bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-700 active:bg-gray-200 leading-tight"
            style={{ minWidth: 56 }}
          >
            지금<br />완료
          </button>
        )}
      </div>
    );
  }

  function renderFieldHeader(f: FieldDef) {
    return (
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">{f.label}</span>
        {f.unit && (
          <span className="text-xs font-medium text-gray-400">({f.unit})</span>
        )}
      </div>
    );
  }

  const startParsed = parseLocal(startAt);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col pb-[var(--safe-area-bottom)]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900">{cfg.label}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-2 space-y-5">
          <div>
            <div className="flex items-baseline mb-2">
              <span className="text-sm font-semibold text-gray-700">측정일시</span>
              <span className="ml-1 text-sm font-semibold text-red-500">*</span>
            </div>
            <button
              type="button"
              onClick={() => setShowStartModal(true)}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-left text-sm text-gray-900 tabular-nums active:bg-gray-50"
            >
              {formatDisplayDate(startAt)}
            </button>
          </div>

          {showStartModal && (
            <TimePickerModal
              open={showStartModal}
              year={startParsed.y}
              month={startParsed.mo}
              day={startParsed.d}
              hour={startParsed.h}
              minute={startParsed.mi}
              onClose={() => setShowStartModal(false)}
              onConfirm={(nmo, nd, nh, nm) =>
                setStartAt(fmtLocal(startParsed.y, nmo, nd, nh, nm))
              }
            />
          )}

          {fieldRows.map((row, idx) => {
            if (row.kind === 'pair') {
              const showNow = row.left.unit === '분';
              return (
                <div key={`pair-${idx}`} className="grid grid-cols-2 gap-3">
                  <div>
                    {renderFieldHeader(row.left)}
                    {renderNumberField(row.left, { showNowButton: showNow })}
                  </div>
                  <div>
                    {renderFieldHeader(row.right)}
                    {renderNumberField(row.right, { showNowButton: showNow })}
                  </div>
                </div>
              );
            }
            const f = row.field;
            return (
              <div key={f.key}>
                {renderFieldHeader(f)}
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
                  renderNumberField(f)
                ) : (
                  <input
                    type="text"
                    value={data[f.key] ?? ''}
                    onChange={(e) =>
                      setData({ ...data, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  />
                )}
              </div>
            );
          })}

          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">메모</div>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full px-3 py-3 rounded-xl border border-gray-200 bg-white text-sm resize-none"
              placeholder=""
            />
          </div>
        </div>

        <div className="px-5 pt-3 pb-3 flex gap-2">
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3.5 rounded-xl bg-red-50 text-red-600 text-sm font-semibold active:bg-red-100"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3.5 rounded-xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 active:bg-primary-600"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {pickerField && (() => {
        const r = rangeFor(pickerField);
        const current =
          data[pickerField.key] !== undefined && data[pickerField.key] !== ''
            ? Number(data[pickerField.key])
            : r.min;
        return (
          <WheelPickerModal
            open={true}
            title={pickerField.label}
            value={current}
            min={r.min}
            max={r.max}
            step={r.step}
            decimals={r.decimals}
            format={(v) => formatWheelItem(pickerField, v)}
            onClose={() => setPickerField(null)}
            onConfirm={(v) => setData({ ...data, [pickerField.key]: String(v) })}
          />
        );
      })()}

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
