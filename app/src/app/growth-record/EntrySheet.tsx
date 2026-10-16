'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FieldDef,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  recordTitle,
} from './types';
import BottomSheet from '@/components/BottomSheet';
import WheelPickerModal from './WheelPickerModal';
import DateTimeWheelModal from './DateTimeWheelModal';
import { openNativeDateTimePicker } from '@/lib/nativeDateTimePicker';
import { numberPickerOptions, openNativeNumberPicker } from '@/lib/nativeNumberPicker';
import { useAppOverlayLock } from '@/components/ads/appOverlay';
import { loadRecentAmounts, mergeRecentAmounts, storeRecentAmounts, type RecentAmount } from './recentAmounts';
import ConfirmModal from '../home/_components/ConfirmModal';
import RecordDefaultsSheet, { RecordDefaultsMode } from './RecordDefaultsSheet';
import {
  getDiaperDefaultKind,
  isWithinNightRange,
} from './recordDefaults';
import { reloadWidget } from '@/lib/widgetBridge';
import Loading from '@/components/Loading';

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

function formatDisplayDate(s: string): string {
  const { y, mo, d, h, mi } = parseLocal(s);
  const p = (n: number) => String(n).padStart(2, '0');
  // Figma: "26.04.23 13:01"
  return `${p(y % 100)}.${p(mo)}.${p(d)} ${p(h)}:${p(mi)}`;
}

/** 입력칸 — 높이 52, 회색 테두리, 16px 글자 (Figma button_large) */
const FIELD_BOX =
  'h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] flex items-center text-left text-[16px] leading-none text-[#121212] tabular-nums active:bg-[#F7F8F9]';
/** 입력 이름(측정일시·수유량 등) */
const FIELD_LABEL = 'text-[14px] leading-[1.4] text-[#808991]';
/** 입력칸 옆 52px 정사각 '지금 완료' 버튼 */
const NOW_BUTTON =
  'shrink-0 size-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[16px] leading-[1.4] text-[#121212] text-center active:translate-y-px';

/** 소변/대변/둘다, 낮잠/밤잠 같은 고르기 칸 */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-[4px] border border-[#808991] overflow-hidden">
      {options.map((o, idx) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 min-w-0 h-[50px] px-[10px] text-[16px] leading-none transition ${
            idx > 0 ? 'border-l border-[#808991]' : ''
          } ${
            value === o.value
              ? 'bg-[#2C2C2C] text-[#FDFDFE]'
              : 'bg-[#FDFDFE] text-[#808991] active:bg-[#F7F8F9]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 앱은 네이티브 휠, 브라우저·구버전 앱은 웹 휠을 연다. */
function RecordNumberPicker({ label, value, min, max, step = 1, decimals = 0, unit, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  decimals?: number; unit?: string; onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [nativePending, setNativePending] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  useAppOverlayLock(nativePending);
  useEffect(() => () => cancelRef.current?.(), []);
  function showPicker() {
    if (nativePending || open) return;
    const options = numberPickerOptions(value, min, max, step, decimals, unit);
    const cancel = openNativeNumberPicker(label, options, value, (result) => {
      cancelRef.current = null;
      setNativePending(false);
      if (result.error) setOpen(true);
      else if (result.value !== null) onChange(result.value);
    });
    if (cancel) { cancelRef.current = cancel; setNativePending(true); }
    else setOpen(true);
  }
  return (
    <>
      <button type="button" aria-label={label} aria-haspopup="dialog"
        onClick={showPicker} disabled={nativePending} className="absolute inset-0 w-full h-full" />
      {open && createPortal(<WheelPickerModal open title={label} value={value} min={min} max={max}
        step={step} decimals={decimals}
        format={(v) => `${decimals ? v.toFixed(decimals) : v}${unit ?? ''}`}
        onClose={() => setOpen(false)} onConfirm={onChange} />, document.body)}
    </>
  );
}

function RecordDateTimePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [nativePending, setNativePending] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  useAppOverlayLock(nativePending);
  useEffect(() => () => cancelRef.current?.(), []);
  return <>
    <button type="button" aria-label={label} aria-haspopup="dialog" disabled={nativePending}
      className="absolute inset-0 w-full h-full" onClick={() => {
        if (nativePending || open) return;
        const cancel = openNativeDateTimePicker(label, value, result => {
          cancelRef.current = null;
          setNativePending(false);
          if (result.error) setOpen(true);
          else if (result.value !== null) onChange(result.value);
        });
        if (cancel) { cancelRef.current = cancel; setNativePending(true); }
        else setOpen(true);
      }} />
    {open && createPortal(<DateTimeWheelModal title={label} value={value} onClose={() => setOpen(false)} onConfirm={onChange} />, document.body)}
  </>;
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
      if (type === 'BABY_FOOD' && f.key === 'amount') {
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
        else u[f.key] = f.units[0];
      } else {
        u[f.key] = f.units[0];
      }
    });
    return u;
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 먹은 양(수유류 amountMl / 이유식 amount)을 입력받는 타입에서, 최근 먹은 양 5개를 빠른 입력 링크로 제공
  const usesAmountField = useMemo(
    () =>
      type === 'PUMPING' ||
      cfg.fields.some((f) => f.key === 'amountMl' || f.key === 'amount'),
    [type, cfg.fields],
  );
  const [recentAmounts, setRecentAmounts] = useState<RecentAmount[]>(() => loadRecentAmounts(childId, type));
  const recentAmountsRef = useRef(recentAmounts);
  function rememberAmount(fieldKey: string, value: number, unit: string) {
    if (!['amount', 'amountMl', 'leftMl', 'rightMl'].includes(fieldKey) || value <= 0) return;
    const next = mergeRecentAmounts([{ value, unit }], recentAmountsRef.current);
    recentAmountsRef.current = next;
    setRecentAmounts(next);
    storeRecentAmounts(childId, type, next);
  }
  const [pumpingAmountTarget, setPumpingAmountTarget] = useState<'leftMl' | 'rightMl'>('leftMl');

  useEffect(() => {
    if (!usesAmountField || !childId) return;
    let cancelled = false;
    const historyAtRequest = recentAmountsRef.current;
    (async () => {
      try {
        const res = await fetch(
          `/api/growth-records/recent-amounts?childId=${encodeURIComponent(childId)}&type=${encodeURIComponent(type)}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          amounts?: { value: number; unit: string }[];
        };
        if (!cancelled && Array.isArray(json.amounts)) {
          const next = recentAmountsRef.current === historyAtRequest
            ? mergeRecentAmounts(type === 'BABY_FOOD' ? json.amounts.map(a => ({ ...a, unit: 'ml' })) : json.amounts, recentAmountsRef.current)
            : mergeRecentAmounts(recentAmountsRef.current, type === 'BABY_FOOD' ? json.amounts.map(a => ({ ...a, unit: 'ml' })) : json.amounts);
          recentAmountsRef.current = next;
          setRecentAmounts(next);
          storeRecentAmounts(childId, type, next);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usesAmountField, childId, type]);

  const [settingsMode, setSettingsMode] = useState<RecordDefaultsMode | null>(null);

  function getSettingsModeFor(fieldKey: string): RecordDefaultsMode | null {
    if (type === 'DIAPER' && fieldKey === 'kind') return 'diaper';
    if (type === 'SLEEP' && fieldKey === 'kind') return 'sleepNight';
    return null;
  }

  // 분 단위 필드별 스톱워치 상태. baseSec=일시정지 누적, startMs=실행 중일 때 시작 시각
  type TimerState = { baseSec: number; startMs: number | null };
  const [timers, setTimers] = useState<Record<string, TimerState>>({});
  const [, forceTick] = useState(0);

  useEffect(() => {
    const running = Object.values(timers).filter((t) => t.startMs !== null);
    if (!running.length) return;
    const signature = () => running.map((t) => Math.floor((Date.now() - t.startMs!) / 1000)).join(',');
    let previous = signature();
    let frame: number;
    const update = () => {
      const next = signature();
      if (next !== previous) {
        previous = next;
        forceTick((n) => n + 1);
      }
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
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
    const now = Date.now();
    const initialSeconds = getDisplaySeconds(primaryKey);
    setTimers((prev) => {
      const t = prev[primaryKey] ?? { baseSec: initialSeconds, startMs: null };
      const newState: TimerState =
        t.startMs === null
          ? { baseSec: t.baseSec, startMs: now }
          : { baseSec: t.baseSec + Math.floor((now - t.startMs) / 1000), startMs: null };
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
      if (type === 'BABY_FOOD') cleanData.amountUnit = 'ml';
      fd.append('data', JSON.stringify(cleanData));
      fd.append('keepImageUrls', JSON.stringify([]));

      const url = initial ? `/api/growth-records/${initial.id}` : '/api/growth-records';
      const method = initial ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, body: fd });
      if (res.ok) {
        reloadWidget();
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
      reloadWidget();
      onSaved();
      onClose();
    }
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

  function renderFieldPicker(f: FieldDef) {
    const activeUnit = f.units ? selectedUnits[f.key] ?? f.units[0] : f.unit;
    const r = rangeFor(f, activeUnit);
    const raw = data[f.key];
    const fallback = (f.key === 'amountMl' || f.key === 'amount') && recentAmounts.length
      ? recentAmounts[0].value : Number(f.placeholder ?? r.min);
    const current = raw !== undefined && raw !== '' ? Number(raw) : fallback;
    return <RecordNumberPicker label={f.label} value={Number.isFinite(current) ? current : r.min}
      {...r} unit={activeUnit} onChange={(v) => {
        rememberAmount(f.key, v, activeUnit ?? 'ml');
        const value = String(v);
        const sync = type === 'PUMPING' && data.pumpingMode === 'BOTH' &&
          (f.key === 'leftMin' || f.key === 'rightMin');
        const secKey = secKeyFor(f.key);
        setData((prev) => {
          const next = { ...prev, [f.key]: value };
          if (secKey) next[secKey] = '0';
          if (sync) {
            next.leftMin = value; next.rightMin = value;
            next.leftSec = '0'; next.rightSec = '0';
          }
          return next;
        });
        if (sync) clearTimer('leftMin', 'rightMin');
        else clearTimer(f.key);
      }} />;
  }

  function renderTimerField(f: FieldDef, mirrorKey?: string) {
    const running = timers[f.key]?.startMs != null;
    const seconds = getDisplaySeconds(f.key);
    const toggleKeys = mirrorKey ? [f.key, mirrorKey] : [f.key];
    // 한 줄: [값] [재생/일시정지] — 모유수유·유축
    return (
      <div className="flex items-stretch gap-[10px]">
        <div className={`${FIELD_BOX} relative flex-1 min-w-0`}>
          {renderFieldPicker(f)}
          {running || seconds > 0 ? (
            <span className="text-[#121212]">{fmtMmSs(seconds)}</span>
          ) : (
            <span className="text-[#BBC0C5]">0</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleTimer(...toggleKeys)}
          className={`shrink-0 size-[52px] rounded-[4px] border flex items-center justify-center active:translate-y-px ${
            running
              ? 'border-[#3078C9] bg-[rgba(48,120,201,0.1)]'
              : 'border-[#121212] bg-[#EEF0F1]'
          }`}
          aria-label={running ? '타이머 일시정지' : '타이머 시작'}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={running ? '/icons/pause-solid.svg' : '/icons/play.svg'}
            alt=""
            width={20}
            height={20}
            className="block"
            aria-hidden="true"
          />
        </button>
      </div>
    );
  }

  function renderNumberField(
    f: FieldDef,
    opts?: { showTimer?: boolean; mirrorKey?: string },
  ) {
    if (opts?.showTimer) {
      return renderTimerField(f, opts?.mirrorKey);
    }
    const hasValue = data[f.key] && data[f.key] !== '' && data[f.key] !== '0';
    const placeholder = f.placeholder ?? '0';
    return (
      <div className="flex items-stretch gap-[10px]">
        <div className={`${FIELD_BOX} relative flex-1 min-w-0`}>
          {renderFieldPicker(f)}
          {hasValue ? (
            <span className="text-[#121212]">{formatFieldValue(f, data[f.key])}</span>
          ) : (
            <span className="text-[#BBC0C5]">{placeholder}</span>
          )}
        </div>
        {f.units && f.units.length > 0 && (
          <div className="shrink-0 flex rounded-[4px] border border-[#808991] overflow-hidden">
            {f.units.map((u, idx) => {
              const active = selectedUnits[f.key] === u;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() =>
                    setSelectedUnits((prev) => ({ ...prev, [f.key]: u }))
                  }
                  className={`h-[50px] px-[16px] text-[16px] leading-none transition ${
                    idx > 0 ? 'border-l border-[#808991]' : ''
                  } ${
                    active
                      ? 'bg-[#2C2C2C] text-[#FDFDFE]'
                      : 'bg-[#FDFDFE] text-[#808991] active:bg-[#F7F8F9]'
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

  // 입력칸 아래에 최근 먹은 양을 링크형 칩으로 노출 — 클릭 시 해당 값(+단위) 자동 입력
  function renderRecentAmounts(fieldKey: string) {
    if (recentAmounts.length === 0) return null;
    // 표시는 값 내림차순(원본 배열은 최신순 유지 → 피커 기본값에 사용)
    const sorted = [...recentAmounts].sort((a, b) => b.value - a.value);
    const hasUnits = !!cfg.fields.find((f) => f.key === fieldKey)?.units?.length;
    return (
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
        {sorted.map((a) => (
          <button
            key={`${a.value}-${a.unit}`}
            type="button"
            onClick={() => {
              rememberAmount(fieldKey, a.value, a.unit);
              setData((prev) => ({ ...prev, [fieldKey]: String(a.value) }));
              if (type === 'PUMPING' && (fieldKey === 'leftMl' || fieldKey === 'rightMl')) {
                setPumpingAmountTarget(fieldKey === 'leftMl' ? 'rightMl' : 'leftMl');
              }
              // 단위가 있는 필드(이유식)는 기록 당시 단위까지 함께 반영
              if (hasUnits) {
                setSelectedUnits((prev) => ({ ...prev, [fieldKey]: a.unit }));
              }
            }}
            className="text-[14px] leading-[1.4] text-[#3078C9] underline active:opacity-60 tabular-nums"
          >
            {a.value}
            {a.unit}
          </button>
        ))}
      </div>
    );
  }

  /** 입력 이름 — "수유량(ml)", "왼쪽(분)" 처럼 단위를 괄호로 붙이고, 설정이 있으면 오른쪽에 '설정' 링크. */
  function renderFieldHeader(f: FieldDef) {
    const unit = f.units ? (selectedUnits[f.key] ?? f.units[0]) : f.unit;
    const mode = getSettingsModeFor(f.key);
    return (
      <div className="flex items-center justify-between gap-[10px] text-[14px] leading-[1.4] text-[#808991]">
        <span className="flex-1 min-w-0">
          {f.label}
          {unit ? `(${unit})` : ''}
        </span>
        {f.showSettingsLink && mode && (
          <button
            type="button"
            onClick={() => setSettingsMode(mode)}
            className="shrink-0 underline active:text-[#121212]"
          >
            설정
          </button>
        )}
      </div>
    );
  }


  return (
    <>
    <BottomSheet pixel open onClose={onClose} variant="sheet" ariaLabel={recordTitle(type)}>
        {/* 손잡이 + 제목 */}
        <div className="shrink-0 flex flex-col items-center gap-[16px] pt-[8px] px-[20px]">
          <div className="h-[4px] w-[36px] rounded-full bg-[#121212]" aria-hidden="true" />
          <h2 className="w-full text-center text-[16px] leading-[1.4] font-normal text-[#121212]">
            {recordTitle(type)}
          </h2>
        </div>

        <div className="overflow-y-auto px-[20px] pt-[24px] pb-[8px] flex flex-col gap-[10px]">
          <div className="flex flex-col gap-[8px]">
            <span className={FIELD_LABEL}>측정일시</span>
            <div className={`${FIELD_BOX} relative w-full`}>
              {formatDisplayDate(startAt)}
              <RecordDateTimePicker label="측정일시" value={startAt} onChange={setStartAt} />
            </div>
          </div>

          {cfg.showEndPicker && (
            <div className="flex flex-col gap-[8px]">
              <span className={FIELD_LABEL}>종료일시</span>
              <div className={`${FIELD_BOX} relative w-full`}>
                {formatDisplayDate(endAt || startAt)}
                <RecordDateTimePicker label="종료일시" value={endAt || startAt} onChange={setEndAt} />
              </div>
            </div>
          )}

          {cfg.showDuration && (
            <div className="flex flex-col gap-[8px]">
              <span className={FIELD_LABEL}>시간</span>
              <div className="flex items-stretch gap-[10px]">
                <div className={`${FIELD_BOX} relative flex-1 min-w-0`}>
                  <RecordNumberPicker label="시간" value={durationMinutes()} min={0} max={720}
                    unit="분" onChange={setDurationMinutes} />
                  {(() => {
                    const mins = durationMinutes();
                    return mins > 0 ? (
                      <span className="text-[#121212]">{mins}분</span>
                    ) : (
                      <span className="text-[#BBC0C5]">0</span>
                    );
                  })()}
                </div>
                <button type="button" onClick={fillNowEnd} className={NOW_BUTTON}>
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
              placeholder: '왼쪽',
            };
            const rightMlField: FieldDef = {
              key: 'rightMl',
              label: '오른쪽 유축량',
              kind: 'number',
              unit: 'ml',
              placeholder: '오른쪽',
            };
            const amountMlField: FieldDef = {
              key: 'amountMl',
              label: '유축량',
              kind: 'number',
              unit: 'ml',
            };

            return (
              <>
                <div className="flex flex-col gap-[8px]">
                  {renderFieldHeader(leftMinField)}
                  {renderNumberField(leftMinField, {
                    showTimer: true,
                    mirrorKey: pumpingMode === 'BOTH' ? 'rightMin' : undefined,
                  })}
                </div>
                <div className="flex flex-col gap-[8px]">
                  {renderFieldHeader(rightMinField)}
                  {renderNumberField(rightMinField, {
                    showTimer: true,
                    mirrorKey: pumpingMode === 'BOTH' ? 'leftMin' : undefined,
                  })}
                </div>

                {volumeMode === 'LR' ? (
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(amountMlField)}
                    <div className="grid grid-cols-2 gap-[8px]">
                      {renderNumberField(leftMlField)}
                      {renderNumberField(rightMlField)}
                    </div>
                    {renderRecentAmounts(pumpingAmountTarget)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(amountMlField)}
                    {renderNumberField(amountMlField)}
                    {renderRecentAmounts('amountMl')}
                  </div>
                )}
              </>
            );
          })()}

          {type !== 'PUMPING' && fieldRows.map((row, idx) => {
            if (row.kind === 'pair') {
              const showTimer = row.left.unit === '분';
              // 왼쪽·오른쪽은 위아래로 한 줄씩 (Figma 모유수유)
              return (
                <div key={`pair-${idx}`} className="flex flex-col gap-[10px]">
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(row.left)}
                    {renderNumberField(row.left, { showTimer })}
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(row.right)}
                    {renderNumberField(row.right, { showTimer })}
                  </div>
                </div>
              );
            }
            const f = row.field;
            return (
              <div key={f.key} className="flex flex-col gap-[8px]">
                {renderFieldHeader(f)}
                {f.kind === 'segmented' && f.options ? (
                  <Segmented
                    options={f.options}
                    value={data[f.key]}
                    onChange={(v) => setData({ ...data, [f.key]: v })}
                  />
                ) : f.kind === 'number' ? (
                  <>
                    {renderNumberField(f)}
                    {(f.key === 'amountMl' || f.key === 'amount') &&
                      renderRecentAmounts(f.key)}
                  </>
                ) : (
                  <input
                    type="text"
                    value={data[f.key] ?? ''}
                    onChange={(e) =>
                      setData({ ...data, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    className="w-full h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] text-[16px] text-[#121212] placeholder:text-[#BBC0C5]"
                  />
                )}
              </div>
            );
          })}

          {!['FORMULA', 'BREASTFEEDING', 'PUMPED_FEEDING', 'PUMPING', 'BABY_FOOD', 'SLEEP', 'DIAPER'].includes(type) && (
          <div className="flex flex-col gap-[8px]">
            <span className={FIELD_LABEL}>메모</span>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] text-[16px] text-[#121212] placeholder:text-[#BBC0C5]"
              placeholder=""
            />
          </div>
          )}
        </div>

        <div
          className="shrink-0 px-[20px] pt-[16px] flex gap-[10px]"
          style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 20px)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
          >
            취소
          </button>
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
            >
              삭제
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 min-w-0 h-[52px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none flex items-center justify-center active:translate-y-px disabled:opacity-60"
          >
            {saving ? <Loading size={18} label="저장 중" /> : '저장하기'}
          </button>
        </div>
    </BottomSheet>

      <ConfirmModal
        open={deleteConfirmOpen}
        showThumbnail={false}
        title="기록을 삭제할까요?"
        description={'삭제한 기록은 다시 불러올 수 없어요.\n삭제 후에는 패턴에 반영되지 않아요.'}
        confirmLabel="삭제하기"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {settingsMode && (
        <RecordDefaultsSheet
          mode={settingsMode}
          onClose={() => setSettingsMode(null)}
          onSaved={() => {
            if (initial) return;
            if (settingsMode === 'diaper') {
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
