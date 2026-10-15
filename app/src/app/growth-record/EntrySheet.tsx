'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FieldDef,
  GrowthRecord,
  GrowthType,
  TYPE_CONFIG,
  recordTitle,
} from './types';
import TimePickerModal from './TimePickerModal';
import WheelPickerModal from './WheelPickerModal';
import BottomSheet from '@/components/BottomSheet';
import ConfirmModal from '../home/_components/ConfirmModal';
import RecordDefaultsSheet, { RecordDefaultsMode } from './RecordDefaultsSheet';
import {
  getBabyFoodDefaultUnit,
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

function fmtLocal(y: number, mo: number, d: number, h: number, mi: number) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}`;
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

  // 먹은 양(수유류 amountMl / 이유식 amount)을 입력받는 타입에서, 최근 먹은 양 5개를 빠른 입력 링크로 제공
  const usesAmountField = useMemo(
    () =>
      type === 'PUMPING' ||
      cfg.fields.some((f) => f.key === 'amountMl' || f.key === 'amount'),
    [type, cfg.fields],
  );
  const [recentAmounts, setRecentAmounts] = useState<
    { value: number; unit: string }[]
  >([]);

  useEffect(() => {
    if (!usesAmountField || !childId) return;
    let cancelled = false;
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
          setRecentAmounts(json.amounts);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [usesAmountField, childId, type]);

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
    // 한 줄: [값] [재생/일시정지] [지금 완료] — Figma 모유수유·유축
    return (
      <div className="flex items-stretch gap-[10px]">
        <button
          type="button"
          onClick={() => setPickerField(f)}
          className={`${FIELD_BOX} flex-1 min-w-0`}
        >
          {seconds > 0 ? (
            <span className="text-[#121212]">{fmtMmSs(seconds)}</span>
          ) : (
            <span className="text-[#BBC0C5]">0</span>
          )}
        </button>
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
        <button
          type="button"
          onClick={() => fillNow(f, mirrorKey)}
          className={NOW_BUTTON}
        >
          지금<br />완료
        </button>
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
      <div className="flex items-stretch gap-[10px]">
        <button
          type="button"
          onClick={() => setPickerField(f)}
          className={`${FIELD_BOX} flex-1 min-w-0`}
        >
          {hasValue ? (
            <span className="text-[#121212]">{formatFieldValue(f, data[f.key])}</span>
          ) : (
            <span className="text-[#BBC0C5]">{placeholder}</span>
          )}
        </button>
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
              setData((prev) => ({ ...prev, [fieldKey]: String(a.value) }));
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

  const startParsed = parseLocal(startAt);

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
            <button
              type="button"
              onClick={() => setShowStartModal(true)}
              className={`${FIELD_BOX} w-full`}
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
            <div className="flex flex-col gap-[8px]">
              <span className={FIELD_LABEL}>종료일시</span>
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className={`${FIELD_BOX} w-full`}
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
            <div className="flex flex-col gap-[8px]">
              <span className={FIELD_LABEL}>시간</span>
              <div className="flex items-stretch gap-[10px]">
                <button
                  type="button"
                  onClick={() => setShowDurationPicker(true)}
                  className={`${FIELD_BOX} flex-1 min-w-0`}
                >
                  {(() => {
                    const mins = durationMinutes();
                    return mins > 0 ? (
                      <span className="text-[#121212]">{mins}분</span>
                    ) : (
                      <span className="text-[#BBC0C5]">0</span>
                    );
                  })()}
                </button>
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

            const MODE_OPTIONS: { value: 'LR' | 'BOTH'; label: string }[] = [
              { value: 'LR', label: '좌우' },
              { value: 'BOTH', label: '동시' },
            ];

            return (
              <>
                {/* 좌우/동시 고르기 — Figma 에는 없지만 기존 기능이라 같은 모양으로 둔다 */}
                <div className="grid grid-cols-2 gap-[8px]">
                  <div className="flex flex-col gap-[8px]">
                    <span className={FIELD_LABEL}>유축</span>
                    <Segmented
                      options={MODE_OPTIONS}
                      value={pumpingMode}
                      onChange={(v) => changePumpingMode(v as 'LR' | 'BOTH')}
                    />
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    <span className={FIELD_LABEL}>유축량</span>
                    <Segmented
                      options={MODE_OPTIONS}
                      value={volumeMode}
                      onChange={(v) => changeVolumeMode(v as 'LR' | 'BOTH')}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-[8px]">
                  {renderFieldHeader(leftMinField)}
                  {renderNumberField(leftMinField, {
                    showNowButton: true,
                    mirrorKey: pumpingMode === 'BOTH' ? 'rightMin' : undefined,
                  })}
                </div>
                <div className="flex flex-col gap-[8px]">
                  {renderFieldHeader(rightMinField)}
                  {renderNumberField(rightMinField, {
                    showNowButton: true,
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
              const showNow = row.left.unit === '분';
              // 왼쪽·오른쪽은 위아래로 한 줄씩 (Figma 모유수유)
              return (
                <div key={`pair-${idx}`} className="flex flex-col gap-[10px]">
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(row.left)}
                    {renderNumberField(row.left, { showNowButton: showNow })}
                  </div>
                  <div className="flex flex-col gap-[8px]">
                    {renderFieldHeader(row.right)}
                    {renderNumberField(row.right, { showNowButton: showNow })}
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

          {/* 메모 — Figma 에는 없지만 기존 기능이라 같은 모양으로 둔다 */}
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

      {pickerField && (() => {
        const activeUnit = pickerField.units
          ? selectedUnits[pickerField.key] ?? pickerField.units[0]
          : pickerField.unit;
        const r = rangeFor(pickerField, activeUnit);
        const raw = data[pickerField.key];
        let current: number = r.min;
        if (raw !== undefined && raw !== '') {
          current = Number(raw);
        } else if (
          (pickerField.key === 'amountMl' || pickerField.key === 'amount') &&
          recentAmounts.length > 0
        ) {
          // 먹은 양: 입력값이 없으면 가장 최근 먹은 양을 기본 선택값으로 연다
          current = recentAmounts[0].value;
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
