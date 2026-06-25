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
import BottomSheet from '@/components/BottomSheet';
import ConfirmModal from '@/components/ConfirmModal';
import RecordDefaultsSheet, { RecordDefaultsMode } from './RecordDefaultsSheet';
import {
  getBabyFoodDefaultUnit,
  getDiaperDefaultKind,
  isWithinNightRange,
} from './recordDefaults';

function rangeFor(
  field: FieldDef,
  overrideUnit?: string,
): { min: number; max: number; step: number; decimals: number } {
  const unit = overrideUnit ?? field.unit;
  switch (unit) {
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

function nowFullLocalInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function localInputFromMs(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [endAt, setEndAt] = useState(() => {
    if (initial?.endAt) return toLocalInput(initial.endAt);
    if (cfg.showEndPicker) {
      return initial ? toLocalInput(initial.startAt) : nowLocalInput(defaultDate);
    }
    return '';
  });
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [data, setData] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    const src = (initial?.data ?? {}) as Record<string, unknown>;
    const prev = (!initial && lastRecord?.data ? lastRecord.data : {}) as Record<string, unknown>;
    const seedSec = (key: string) => {
      if (src[key] != null) d[key] = String(src[key]);
      else if (prev[key] != null) d[key] = String(prev[key]);
    };
    if (type === 'BREASTFEEDING') {
      seedSec('leftSec');
      seedSec('rightSec');
    }
    cfg.fields.forEach((f) => {
      if (src[f.key] != null) {
        d[f.key] = String(src[f.key]);
        return;
      }
      if (f.key === 'amount' && f.units) {
        // BABY_FOOD 마이그레이션: amountG/amountMl → amount
        if (src.amountG != null) d[f.key] = String(src.amountG);
        else if (src.amountMl != null) d[f.key] = String(src.amountMl);
        else if (prev[f.key] != null) d[f.key] = String(prev[f.key]);
        return;
      }
      // 새 기록 생성 시 사용자 기본값 적용 (이전 기록 값보다 우선)
      if (!initial && type === 'SLEEP' && f.key === 'kind') {
        const now = new Date();
        d[f.key] = isWithinNightRange(now.getHours(), now.getMinutes())
          ? 'NIGHT'
          : 'NAP';
        return;
      }
      if (!initial && type === 'DIAPER' && f.key === 'kind') {
        d[f.key] = getDiaperDefaultKind();
        return;
      }
      if (prev[f.key] != null) {
        d[f.key] = String(prev[f.key]);
      } else if (f.kind === 'segmented' && f.options) {
        d[f.key] = f.options[0].value;
      }
    });

    // PUMPING 커스텀 필드 초기화 (좌우/동시 모드 + 값)
    if (type === 'PUMPING') {
      const init = (initial ? src : prev) as Record<string, unknown>;
      const pumpingMode =
        init.pumpingMode === 'BOTH' || init.pumpingMode === 'LR'
          ? (init.pumpingMode as string)
          : 'LR';
      const volumeMode =
        init.volumeMode === 'BOTH' || init.volumeMode === 'LR'
          ? (init.volumeMode as string)
          : 'LR';
      d.pumpingMode = pumpingMode;
      d.volumeMode = volumeMode;
      if (init.leftMin != null) d.leftMin = String(init.leftMin);
      if (init.rightMin != null) d.rightMin = String(init.rightMin);
      if (init.leftSec != null) d.leftSec = String(init.leftSec);
      if (init.rightSec != null) d.rightSec = String(init.rightSec);
      // 동시 모드는 양쪽 값을 동일하게 유지
      if (pumpingMode === 'BOTH') {
        const v = d.leftMin ?? d.rightMin ?? '';
        if (v) {
          d.leftMin = v;
          d.rightMin = v;
        }
        const sv = d.leftSec ?? d.rightSec ?? '';
        if (sv) {
          d.leftSec = sv;
          d.rightSec = sv;
        }
      }
      if (init.leftMl != null) d.leftMl = String(init.leftMl);
      if (init.rightMl != null) d.rightMl = String(init.rightMl);
      if (init.amountMl != null) d.amountMl = String(init.amountMl);
    }

    return d;
  });
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>(() => {
    const u: Record<string, string> = {};
    const src = (initial?.data ?? {}) as Record<string, unknown>;
    cfg.fields.forEach((f) => {
      if (!f.units || f.units.length === 0) return;
      const saved = src[`${f.key}Unit`];
      if (typeof saved === 'string' && f.units.includes(saved)) {
        u[f.key] = saved;
      } else if (f.key === 'amount') {
        if (src.amountG != null && f.units.includes('g')) u[f.key] = 'g';
        else if (src.amountMl != null && f.units.includes('ml')) u[f.key] = 'ml';
        else if (!initial && type === 'BABY_FOOD') u[f.key] = getBabyFoodDefaultUnit();
        else u[f.key] = f.units[0];
      } else {
        u[f.key] = f.units[0];
      }
    });
    return u;
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [pickerField, setPickerField] = useState<FieldDef | null>(null);
  const [settingsMode, setSettingsMode] = useState<RecordDefaultsMode | null>(null);

  function getSettingsModeFor(fieldKey: string): RecordDefaultsMode | null {
    if (type === 'BABY_FOOD' && fieldKey === 'amount') return 'babyfood';
    if (type === 'DIAPER' && fieldKey === 'kind') return 'diaper';
    if (type === 'SLEEP' && fieldKey === 'kind') return 'sleepNight';
    return null;
  }

  // 분 단위 필드별 스톱워치 상태. baseSec=일시정지 누적, startMs=실행 중일 때 시작 시각
  type TimerState = { baseSec: number; startMs: number | null };
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [, forceTick] = useState(0);

  useEffect(() => {
    const anyRunning = Object.values(timers).some((t) => t.startMs !== null);
    if (!anyRunning) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [timers]);

  const fieldRows = useMemo(() => pairFields(cfg.fields), [cfg.fields]);

  function getElapsedSec(key: string): number {
    const t = timers[key];
    if (!t) return 0;
    if (t.startMs === null) return t.baseSec;
    return t.baseSec + Math.floor((Date.now() - t.startMs) / 1000);
  }

  function toggleTimer(...keys: string[]) {
    if (keys.length === 0) return;
    const primaryKey = keys[0];
    setTimers((prev) => {
      const t = prev[primaryKey] ?? { baseSec: 0, startMs: null };
      const newState: TimerState =
        t.startMs === null
          ? { baseSec: t.baseSec, startMs: Date.now() }
          : { baseSec: t.baseSec + Math.floor((Date.now() - t.startMs) / 1000), startMs: null };
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = newState;
      });
      return next;
    });
  }

  function clearTimer(...keys: string[]) {
    setTimers((prev) => {
      let changed = false;
      const next = { ...prev };
      keys.forEach((k) => {
        if (k in next) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }

  function fmtMmSs(totalSec: number): string {
    const safe = Math.max(0, Math.floor(totalSec));
    const m = Math.floor(safe / 60);
    const s = safe % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

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
      const merged: Record<string, string> = { ...data };
      // 타이머가 동작 중이거나 일시정지된 키는 실행 중 경과초를 합산해
      // 분(整) + 초(0~59)를 함께 보존한다.
      for (const [k, t] of Object.entries(timers)) {
        const elapsed = t.startMs !== null
          ? t.baseSec + Math.floor((Date.now() - t.startMs) / 1000)
          : t.baseSec;
        if (k.endsWith('Min')) {
          merged[k] = String(Math.floor(elapsed / 60));
          merged[k.slice(0, -3) + 'Sec'] = String(elapsed % 60);
        } else {
          merged[k] = String(Math.round(elapsed / 60));
        }
      }
      const cleanData: Record<string, unknown> = {};
      if (type === 'PUMPING') {
        const pumpingMode = (merged.pumpingMode === 'BOTH' ? 'BOTH' : 'LR') as
          | 'LR'
          | 'BOTH';
        const volumeMode = (merged.volumeMode === 'BOTH' ? 'BOTH' : 'LR') as
          | 'LR'
          | 'BOTH';
        cleanData.pumpingMode = pumpingMode;
        cleanData.volumeMode = volumeMode;
        const setNum = (key: string, value: string | undefined) => {
          if (value === undefined || value === '' || value == null) return;
          const n = Number(value);
          if (!Number.isNaN(n)) cleanData[key] = n;
        };
        if (pumpingMode === 'BOTH') {
          const v = merged.leftMin ?? merged.rightMin;
          setNum('leftMin', v);
          setNum('rightMin', v);
          const sv = merged.leftSec ?? merged.rightSec;
          setNum('leftSec', sv);
          setNum('rightSec', sv);
        } else {
          setNum('leftMin', merged.leftMin);
          setNum('rightMin', merged.rightMin);
          setNum('leftSec', merged.leftSec);
          setNum('rightSec', merged.rightSec);
        }
        if (volumeMode === 'BOTH') {
          setNum('amountMl', merged.amountMl);
        } else {
          setNum('leftMl', merged.leftMl);
          setNum('rightMl', merged.rightMl);
        }
      } else {
        Object.entries(merged).forEach(([k, v]) => {
          if (v === '' || v == null) return;
          const f = cfg.fields.find((x) => x.key === k);
          if (f) {
            cleanData[k] = f.kind === 'number' ? Number(v) : v;
          } else if (
            (k === 'leftSec' || k === 'rightSec') &&
            type === 'BREASTFEEDING'
          ) {
            const n = Number(v);
            if (!Number.isNaN(n)) cleanData[k] = n;
          }
        });
        cfg.fields.forEach((f) => {
          if (!f.units || f.units.length === 0) return;
          if (cleanData[f.key] == null) return;
          cleanData[`${f.key}Unit`] = selectedUnits[f.key] ?? f.units[0];
        });
      }
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

  function elapsedSecondsFromStart(): number {
    const start = new Date(startAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - start) / 1000));
  }

  function durationMinutes(): number {
    if (!endAt) return 0;
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    return Math.max(0, Math.round((e - s) / 60000));
  }

  function setDurationMinutes(min: number) {
    const startMs = new Date(startAt).getTime();
    setEndAt(localInputFromMs(startMs + min * 60000));
  }

  function fillNowEnd() {
    setEndAt(nowFullLocalInput());
  }

  function fillNow(field: FieldDef, mirrorKey?: string) {
    const r = rangeFor(field);
    const maxSec = r.max * 60;
    const clampedSec = Math.min(maxSec, elapsedSecondsFromStart());
    const mins = String(Math.floor(clampedSec / 60));
    const secs = String(clampedSec % 60);
    const secKey = secKeyFor(field.key);
    const mirrorSecKey = mirrorKey ? secKeyFor(mirrorKey) : null;
    setData((prev) => {
      const next = { ...prev, [field.key]: mins };
      if (secKey) next[secKey] = secs;
      if (mirrorKey) next[mirrorKey] = mins;
      if (mirrorSecKey) next[mirrorSecKey] = secs;
      return next;
    });
    setTimers((prev) => {
      const newState: TimerState = { baseSec: clampedSec, startMs: null };
      const next = { ...prev, [field.key]: newState };
      if (mirrorKey) next[mirrorKey] = newState;
      return next;
    });
  }

  function formatFieldValue(f: FieldDef, raw: string | undefined): string {
    if (raw === undefined || raw === '') return '0';
    const r = rangeFor(f);
    const n = Number(raw);
    return r.decimals > 0 ? n.toFixed(r.decimals) : String(n);
  }

  function getDisplaySeconds(key: string): number {
    if (key in timers) return getElapsedSec(key);
    const raw = data[key];
    if (!raw || raw === '') return 0;
    const min = Number(raw);
    if (Number.isNaN(min)) return 0;
    if (key.endsWith('Min')) {
      const secKey = key.slice(0, -3) + 'Sec';
      const sec = Number(data[secKey] ?? 0);
      return min * 60 + (Number.isNaN(sec) ? 0 : sec);
    }
    return min * 60;
  }

  function secKeyFor(key: string): string | null {
    return key.endsWith('Min') ? key.slice(0, -3) + 'Sec' : null;
  }

  function renderTimerField(f: FieldDef, mirrorKey?: string) {
    const running = timers[f.key]?.startMs != null;
    const seconds = getDisplaySeconds(f.key);
    const toggleKeys = mirrorKey ? [f.key, mirrorKey] : [f.key];
    return (
      <div>
        <button
          type="button"
          onClick={() => setPickerField(f)}
          className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-left text-sm font-normal text-app-black tabular-nums active:bg-gray-50"
        >
          {seconds > 0 ? (
            <span className="text-app-black">{fmtMmSs(seconds)}</span>
          ) : (
            <span className="text-gray-400">00:00</span>
          )}
        </button>
        <div className="mt-2 flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => toggleTimer(...toggleKeys)}
            className={`flex-1 h-11 rounded-[4px] flex items-center justify-center transition ${
              running
                ? 'bg-primary-500/10 border border-primary-500 text-primary-500'
                : 'bg-gray-200 text-gray-500 active:bg-gray-300'
            }`}
            aria-label={running ? '타이머 일시정지' : '타이머 시작'}
          >
            {running ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M1.3335 4.00016C1.3335 2.74283 1.3335 2.11483 1.72416 1.72416C2.11483 1.3335 2.74283 1.3335 4.00016 1.3335C5.2575 1.3335 5.8855 1.3335 6.27616 1.72416C6.66683 2.11483 6.66683 2.74283 6.66683 4.00016V12.0002C6.66683 13.2575 6.66683 13.8855 6.27616 14.2762C5.8855 14.6668 5.2575 14.6668 4.00016 14.6668C2.74283 14.6668 2.11483 14.6668 1.72416 14.2762C1.3335 13.8855 1.3335 13.2575 1.3335 12.0002V4.00016ZM9.3335 4.00016C9.3335 2.74283 9.3335 2.11483 9.72416 1.72416C10.1148 1.3335 10.7428 1.3335 12.0002 1.3335C13.2575 1.3335 13.8855 1.3335 14.2762 1.72416C14.6668 2.11483 14.6668 2.74283 14.6668 4.00016V12.0002C14.6668 13.2575 14.6668 13.8855 14.2762 14.2762C13.8855 14.6668 13.2575 14.6668 12.0002 14.6668C10.7428 14.6668 10.1148 14.6668 9.72416 14.2762C9.3335 13.8855 9.3335 13.2575 9.3335 12.0002V4.00016Z" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M14.2725 6.23521C14.5927 6.40549 14.8605 6.65967 15.0473 6.97054C15.2341 7.2814 15.3328 7.63722 15.3328 7.99988C15.3328 8.36254 15.2341 8.71836 15.0473 9.02922C14.8605 9.34009 14.5927 9.59427 14.2725 9.76455L5.73117 14.4092C4.35584 15.1579 2.6665 14.1845 2.6665 12.6452V3.35521C2.6665 1.81521 4.35584 0.842546 5.73117 1.58988L14.2725 6.23521Z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={() => fillNow(f, mirrorKey)}
            className="flex-1 h-11 rounded-[4px] bg-gray-200 text-sm font-normal text-gray-600 active:bg-gray-300 leading-tight"
          >
            지금<br />완료
          </button>
        </div>
      </div>
    );
  }

  function renderNumberField(
    f: FieldDef,
    opts?: { showNowButton?: boolean; mirrorKey?: string },
  ) {
    if (opts?.showNowButton) {
      return renderTimerField(f, opts?.mirrorKey);
    }
    const hasValue = data[f.key] && data[f.key] !== '' && data[f.key] !== '0';
    const placeholder = f.placeholder ?? '0';
    return (
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setPickerField(f)}
          className="flex-1 min-w-0 px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-left text-sm font-normal text-app-black tabular-nums active:bg-gray-50"
        >
          {hasValue ? (
            <span className="text-app-black">{formatFieldValue(f, data[f.key])}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>
        {f.units && f.units.length > 0 && (
          <div className="shrink-0 flex rounded-[4px] border border-gray-200 overflow-hidden">
            {f.units.map((u) => {
              const active = selectedUnits[f.key] === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() =>
                    setSelectedUnits((prev) => ({ ...prev, [f.key]: u }))
                  }
                  className={`px-4 text-sm font-normal text-gray-600 transition ${
                    active
                      ? 'bg-primary-500/10'
                      : 'bg-white active:bg-gray-50'
                  }`}
                >
                  {u}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderFieldHeader(f: FieldDef) {
    const showUnitInHeader = !f.units && !!f.unit;
    const mode = getSettingsModeFor(f.key);
    return (
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">{f.label}</span>
        <div className="flex items-baseline gap-2">
          {showUnitInHeader && (
            <span className="text-xs font-medium text-gray-400">({f.unit})</span>
          )}
          {f.showSettingsLink && mode && (
            <button
              type="button"
              onClick={() => setSettingsMode(mode)}
              className="text-xs font-medium text-gray-400 underline active:text-gray-600"
            >
              설정
            </button>
          )}
        </div>
      </div>
    );
  }

  const startParsed = parseLocal(startAt);

  return (
    <>
    <BottomSheet open onClose={onClose} variant="sheet" ariaLabel={cfg.label}>
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-base font-medium text-app-black">{cfg.label}</h2>
          {initial ? (
            <button
              onClick={handleDelete}
              className="w-9 h-9 -mr-2 flex items-center justify-center text-app-black active:text-app-red"
              aria-label="삭제"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.0832 4.99993H2.9165M15.694 7.08326L15.3107 12.8333C15.1632 15.0449 15.0898 16.1508 14.369 16.8249C13.6482 17.4991 12.539 17.4999 10.3223 17.4999H9.67734C7.46067 17.4999 6.3515 17.4999 5.63067 16.8249C4.90984 16.1508 4.83567 15.0449 4.689 12.8333L4.30567 7.08326M7.6415 3.33326C7.81367 2.84532 8.13295 2.42279 8.55534 2.12392C8.97772 1.82505 9.48241 1.66455 9.99984 1.66455C10.5173 1.66455 11.022 1.82505 11.4443 2.12392C11.8667 2.42279 12.186 2.84532 12.3582 3.33326" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
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
          )}
        </div>

        <div className="overflow-y-auto px-4 py-2 space-y-3">
          <div>
            <div className="flex items-baseline mb-2">
              <span className="text-xs font-medium text-gray-500">측정일시</span>
              <span className="ml-1 text-xs font-medium text-app-red">*</span>
            </div>
            <button
              type="button"
              onClick={() => setShowStartModal(true)}
              className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-left text-sm font-normal text-app-black tabular-nums active:bg-gray-50"
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

          {cfg.showEndPicker && (
            <div>
              <div className="flex items-baseline mb-2">
                <span className="text-xs font-medium text-gray-500">종료일시</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-left text-sm font-normal text-app-black tabular-nums active:bg-gray-50"
              >
                {formatDisplayDate(endAt || startAt)}
              </button>
            </div>
          )}

          {cfg.showEndPicker && showEndModal && (() => {
            const endParsed = parseLocal(endAt || startAt);
            return (
              <TimePickerModal
                open={showEndModal}
                year={endParsed.y}
                month={endParsed.mo}
                day={endParsed.d}
                hour={endParsed.h}
                minute={endParsed.mi}
                onClose={() => setShowEndModal(false)}
                onConfirm={(nmo, nd, nh, nm) =>
                  setEndAt(fmtLocal(endParsed.y, nmo, nd, nh, nm))
                }
              />
            );
          })()}

          {cfg.showDuration && (
            <div>
              <div className="flex items-baseline mb-2">
                <span className="text-xs font-medium text-gray-500">시간</span>
              </div>
              <div className="flex items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setShowDurationPicker(true)}
                  className="flex-1 min-w-0 px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-left text-sm font-normal text-app-black tabular-nums active:bg-gray-50"
                >
                  {(() => {
                    const mins = durationMinutes();
                    return (
                      <span className={mins > 0 ? 'text-app-black' : 'text-gray-400'}>
                        {mins}
                        <span className="ml-0.5 text-gray-400">분</span>
                      </span>
                    );
                  })()}
                </button>
                <button
                  type="button"
                  onClick={fillNowEnd}
                  className="shrink-0 px-3 rounded-[4px] bg-gray-200 text-sm font-normal text-gray-600 active:bg-gray-300 leading-tight"
                  style={{ minWidth: 56 }}
                >
                  지금<br />완료
                </button>
              </div>
            </div>
          )}

          {type === 'PUMPING' && (() => {
            const pumpingMode = (data.pumpingMode === 'BOTH' ? 'BOTH' : 'LR') as
              | 'LR'
              | 'BOTH';
            const volumeMode = (data.volumeMode === 'BOTH' ? 'BOTH' : 'LR') as
              | 'LR'
              | 'BOTH';
            const leftMinField: FieldDef = {
              key: 'leftMin',
              label: '왼쪽',
              kind: 'number',
              unit: '분',
            };
            const rightMinField: FieldDef = {
              key: 'rightMin',
              label: '오른쪽',
              kind: 'number',
              unit: '분',
            };
            const leftMlField: FieldDef = {
              key: 'leftMl',
              label: '왼쪽 유축량',
              kind: 'number',
              unit: 'ml',
            };
            const rightMlField: FieldDef = {
              key: 'rightMl',
              label: '오른쪽 유축량',
              kind: 'number',
              unit: 'ml',
            };
            const amountMlField: FieldDef = {
              key: 'amountMl',
              label: '유축량',
              kind: 'number',
              unit: 'ml',
            };

            const changePumpingMode = (value: 'LR' | 'BOTH') => {
              setData((prev) => {
                const next: Record<string, string> = { ...prev, pumpingMode: value };
                if (value === 'BOTH') {
                  // 동시: 오른쪽을 왼쪽 값과 동기화
                  next.rightMin = prev.leftMin ?? '';
                  next.rightSec = prev.leftSec ?? '';
                }
                return next;
              });
              if (value === 'BOTH') {
                setTimers((prev) => {
                  const lt = prev.leftMin;
                  const next = { ...prev };
                  if (lt) next.rightMin = { ...lt };
                  else if (next.rightMin) delete next.rightMin;
                  return next;
                });
              }
            };

            const changeVolumeMode = (value: 'LR' | 'BOTH') => {
              setData((prev) => ({ ...prev, volumeMode: value }));
            };

            const segOption = (active: boolean, idx: number) =>
              `flex-1 py-3 text-sm font-normal text-gray-600 transition ${
                idx > 0 ? 'border-l border-gray-200' : ''
              } ${active ? 'bg-primary-500/10' : 'bg-white active:bg-gray-50'}`;

            const MODE_OPTIONS: { value: 'LR' | 'BOTH'; label: string }[] = [
              { value: 'LR', label: '좌우' },
              { value: 'BOTH', label: '동시' },
            ];

            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">유축</span>
                    </div>
                    <div className="flex rounded-[4px] border border-gray-200 overflow-hidden">
                      {MODE_OPTIONS.map((o, idx) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => changePumpingMode(o.value)}
                          className={segOption(pumpingMode === o.value, idx)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">유축량</span>
                    </div>
                    <div className="flex rounded-[4px] border border-gray-200 overflow-hidden">
                      {MODE_OPTIONS.map((o, idx) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => changeVolumeMode(o.value)}
                          className={segOption(volumeMode === o.value, idx)}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {renderFieldHeader(leftMinField)}
                    {renderNumberField(leftMinField, {
                      showNowButton: true,
                      mirrorKey: pumpingMode === 'BOTH' ? 'rightMin' : undefined,
                    })}
                  </div>
                  <div>
                    {renderFieldHeader(rightMinField)}
                    {renderNumberField(rightMinField, {
                      showNowButton: true,
                      mirrorKey: pumpingMode === 'BOTH' ? 'leftMin' : undefined,
                    })}
                  </div>
                </div>

                {volumeMode === 'LR' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      {renderFieldHeader(leftMlField)}
                      {renderNumberField(leftMlField)}
                    </div>
                    <div>
                      {renderFieldHeader(rightMlField)}
                      {renderNumberField(rightMlField)}
                    </div>
                  </div>
                ) : (
                  <div>
                    {renderFieldHeader(amountMlField)}
                    {renderNumberField(amountMlField)}
                  </div>
                )}
              </>
            );
          })()}

          {type !== 'PUMPING' && fieldRows.map((row, idx) => {
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
                  <div className="flex rounded-[4px] border border-gray-200 overflow-hidden">
                    {f.options.map((o, idx) => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setData({ ...data, [f.key]: o.value })}
                        className={`flex-1 py-3 text-sm font-normal text-gray-600 transition ${
                          idx > 0 ? 'border-l border-gray-200' : ''
                        } ${
                          data[f.key] === o.value
                            ? 'bg-primary-500/10'
                            : 'bg-white active:bg-gray-50'
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
                    className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-sm font-normal text-app-black placeholder:text-gray-400 placeholder:font-normal"
                  />
                )}
              </div>
            );
          })}

          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">메모</div>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-3 rounded-[4px] border border-gray-200 bg-white text-sm font-normal text-app-black placeholder:text-gray-400 placeholder:font-normal"
              placeholder=""
            />
          </div>
        </div>

        <div
          className="px-4 pt-2 flex gap-[10px]"
          style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-[8px] bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12 rounded-[8px] bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 active:opacity-90"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
    </BottomSheet>

      {pickerField && (() => {
        const activeUnit = pickerField.units
          ? selectedUnits[pickerField.key] ?? pickerField.units[0]
          : pickerField.unit;
        const r = rangeFor(pickerField, activeUnit);
        const raw = data[pickerField.key];
        let current: number = r.min;
        if (raw !== undefined && raw !== '') {
          current = Number(raw);
        } else if (pickerField.placeholder) {
          const parsed = Number(pickerField.placeholder);
          if (!Number.isNaN(parsed) && parsed >= r.min && parsed <= r.max) {
            current = parsed;
          }
        }
        return (
          <WheelPickerModal
            open={true}
            title={pickerField.label}
            value={current}
            min={r.min}
            max={r.max}
            step={r.step}
            decimals={r.decimals}
            format={(v) => {
              const num = r.decimals > 0 ? v.toFixed(r.decimals) : String(v);
              return activeUnit ? `${num}${activeUnit}` : num;
            }}
            onClose={() => setPickerField(null)}
            onConfirm={(v) => {
              const value = String(v);
              const pumpingBothSyncMin =
                type === 'PUMPING' &&
                data.pumpingMode === 'BOTH' &&
                (pickerField.key === 'leftMin' || pickerField.key === 'rightMin');
              const secKey = secKeyFor(pickerField.key);
              setData((prev) => {
                const next = { ...prev, [pickerField.key]: value };
                // 휠 피커는 분 단위만 선택하므로, 분이 갱신되면 초는 0으로 초기화
                if (secKey) next[secKey] = '0';
                if (pumpingBothSyncMin) {
                  next.leftMin = value;
                  next.rightMin = value;
                  next.leftSec = '0';
                  next.rightSec = '0';
                }
                return next;
              });
              if (pumpingBothSyncMin) {
                clearTimer('leftMin', 'rightMin');
              } else {
                clearTimer(pickerField.key);
              }
            }}
          />
        );
      })()}

      {showDurationPicker && (() => {
        const r = { min: 0, max: 720, step: 1, decimals: 0 };
        const current = durationMinutes();
        return (
          <WheelPickerModal
            open={true}
            title="시간"
            value={current}
            min={r.min}
            max={r.max}
            step={r.step}
            decimals={r.decimals}
            format={(v) => `${v}분`}
            onClose={() => setShowDurationPicker(false)}
            onConfirm={(v) => setDurationMinutes(v)}
          />
        );
      })()}

      <ConfirmModal
        open={deleteConfirmOpen}
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-trash.svg" alt="" width={32} height={32} />
          </div>
        }
        title="기록 삭제하기"
        description={'기록을 삭제할까요?\n삭제하면 다시 되돌릴 수 없어요.'}
        confirmLabel="삭제하기"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirmOpen(false)}
      />

      {settingsMode && (
        <RecordDefaultsSheet
          mode={settingsMode}
          onClose={() => setSettingsMode(null)}
          onSaved={() => {
            if (initial) return;
            if (settingsMode === 'babyfood') {
              setSelectedUnits((prev) => ({
                ...prev,
                amount: getBabyFoodDefaultUnit(),
              }));
            } else if (settingsMode === 'diaper') {
              setData((prev) => ({ ...prev, kind: getDiaperDefaultKind() }));
            } else if (settingsMode === 'sleepNight') {
              const now = new Date();
              const kind = isWithinNightRange(now.getHours(), now.getMinutes())
                ? 'NIGHT'
                : 'NAP';
              setData((prev) => ({ ...prev, kind }));
            }
          }}
        />
      )}
    </>
  );
}
