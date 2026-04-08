'use client';

import { useState } from 'react';
import MinuteWheel from './MinuteWheel';
import TimePickerModal from './TimePickerModal';

interface Props {
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (v: string) => void;
}

function parse(s: string) {
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

function fmt(y: number, mo: number, d: number, h: number, mi: number) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}`;
}

function dateLabel(y: number, mo: number, d: number) {
  const target = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === -1) return '어제';
  if (diff === 1) return '내일';
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${mo}월 ${d}일 (${days[target.getDay()]})`;
}

export default function DateTimeDragPicker({ value, onChange }: Props) {
  const { y, mo, d, h, mi } = parse(value);
  const totalMin = h * 60 + mi;

  const setMinutes = (minutes: number) => {
    const nh = Math.floor(minutes / 60);
    const nm = minutes % 60;
    onChange(fmt(y, mo, d, nh, nm));
  };

  const shiftDay = (delta: number) => {
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() + delta);
    onChange(
      fmt(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), h, mi),
    );
  };

  const setNow = () => {
    const now = new Date();
    onChange(
      fmt(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
      ),
    );
  };

  const period = h < 12 ? '오전' : '오후';
  const [showTimeModal, setShowTimeModal] = useState(false);

  return (
    <div className="rounded-2xl bg-gray-50 p-3 space-y-2">
      <MinuteWheel
        value={totalMin}
        onChange={setMinutes}
        onOverflow={(delta) => shiftDay(delta)}
        onTap={() => setShowTimeModal(true)}
      />

      {/* 한 줄: 날짜 라벨 · 오전/오후 · 지금 */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 text-[11px] font-semibold text-gray-700">
          {dateLabel(y, mo, d)}
        </span>
        <span className="text-xs font-bold text-gray-900">{period}</span>
        <button
          type="button"
          onClick={setNow}
          className="px-2.5 py-1 rounded-full bg-white shadow-sm text-[11px] font-semibold text-gray-700 active:bg-gray-100"
        >
          🕒 지금
        </button>
      </div>

      <TimePickerModal
        open={showTimeModal}
        year={y}
        month={mo}
        day={d}
        hour={h}
        minute={mi}
        onClose={() => setShowTimeModal(false)}
        onConfirm={(nmo, nd, nh, nm) => onChange(fmt(y, nmo, nd, nh, nm))}
      />
    </div>
  );
}
