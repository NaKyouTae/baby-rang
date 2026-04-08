'use client';

import { useEffect, useState } from 'react';

interface DatePickerModalProps {
  open: boolean;
  value?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  min?: string; // YYYY-MM-DD
  onClose: () => void;
  onConfirm: (date: string) => void;
  title?: string;
}

type Mode = 'days' | 'months' | 'years';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function parseDateStr(s?: string): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

export default function DatePickerModal({
  open,
  value,
  max,
  min,
  onClose,
  onConfirm,
  title = '날짜 선택',
}: DatePickerModalProps) {
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<{ y: number; m: number; d: number } | null>(null);
  const [mode, setMode] = useState<Mode>('days');

  // 모달 열릴 때 초기값 동기화
  useEffect(() => {
    if (open) {
      const init = parseDateStr(value) ?? {
        y: today.getFullYear(),
        m: today.getMonth() + 1,
        d: today.getDate(),
      };
      setViewYear(init.y);
      setViewMonth(init.m);
      setSelected(parseDateStr(value));
      setMode('days');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const maxParsed = parseDateStr(max);
  const minParsed = parseDateStr(min);

  const isDayOutOfRange = (y: number, m: number, d: number) => {
    if (maxParsed) {
      if (y > maxParsed.y) return true;
      if (y === maxParsed.y && m > maxParsed.m) return true;
      if (y === maxParsed.y && m === maxParsed.m && d > maxParsed.d) return true;
    }
    if (minParsed) {
      if (y < minParsed.y) return true;
      if (y === minParsed.y && m < minParsed.m) return true;
      if (y === minParsed.y && m === minParsed.m && d < minParsed.d) return true;
    }
    return false;
  };

  const isMonthOutOfRange = (y: number, m: number) => {
    if (maxParsed) {
      if (y > maxParsed.y) return true;
      if (y === maxParsed.y && m > maxParsed.m) return true;
    }
    if (minParsed) {
      if (y < minParsed.y) return true;
      if (y === minParsed.y && m < minParsed.m) return true;
    }
    return false;
  };

  const isYearOutOfRange = (y: number) => {
    if (maxParsed && y > maxParsed.y) return true;
    if (minParsed && y < minParsed.y) return true;
    return false;
  };

  const goPrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (d: number) => {
    if (isDayOutOfRange(viewYear, viewMonth, d)) return;
    setSelected({ y: viewYear, m: viewMonth, d });
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm(toDateStr(selected.y, selected.m, selected.d));
    onClose();
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear - 25 + i);

  // 모드별 헤더 타이틀
  const headerTitle =
    mode === 'days'
      ? `${viewYear}년 ${viewMonth}월`
      : mode === 'months'
      ? `${viewYear}년`
      : '연도 선택';

  const handleHeaderClick = () => {
    if (mode === 'days') setMode('months');
    else if (mode === 'months') setMode('years');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      {/* 백드롭 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* 시트 */}
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl shadow-xl pb-[max(env(safe-area-inset-bottom),16px)] mb-3 sm:mb-0">
        {/* 핸들 */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between px-5 py-2">
          {mode === 'days' ? (
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 text-gray-500 active:bg-gray-100 rounded-full"
              aria-label="이전 달"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <span className="w-9" />
          )}

          <button
            type="button"
            onClick={handleHeaderClick}
            disabled={mode === 'years'}
            className="text-base font-bold text-gray-900 px-3 py-1.5 rounded-lg active:bg-gray-100 flex items-center gap-1 disabled:opacity-100"
          >
            {headerTitle}
            {mode !== 'years' && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {mode === 'days' ? (
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 text-gray-500 active:bg-gray-100 rounded-full"
              aria-label="다음 달"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>

        {/* DAYS 모드 */}
        {mode === 'days' && (
          <>
            <div className="grid grid-cols-7 px-3 mt-1">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`text-center text-xs font-medium py-2 ${
                    i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                  }`}
                >
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
              {cells.map((d, idx) => {
                if (d === null) return <div key={`e-${idx}`} />;
                const out = isDayOutOfRange(viewYear, viewMonth, d);
                const isSelected =
                  selected &&
                  selected.y === viewYear &&
                  selected.m === viewMonth &&
                  selected.d === d;
                const isToday =
                  today.getFullYear() === viewYear &&
                  today.getMonth() + 1 === viewMonth &&
                  today.getDate() === d;
                const dow = (firstDayOfWeek + d - 1) % 7;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={out}
                    onClick={() => handleSelectDay(d)}
                    className="flex items-center justify-center py-1.5"
                  >
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-full text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary-500 text-white font-bold'
                          : out
                          ? 'text-gray-200'
                          : isToday
                          ? 'text-primary-500 font-bold border border-primary-200'
                          : dow === 0
                          ? 'text-red-500'
                          : dow === 6
                          ? 'text-blue-500'
                          : 'text-gray-800'
                      }`}
                    >
                      {d}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* MONTHS 모드 */}
        {mode === 'months' && (
          <div className="grid grid-cols-3 gap-2 px-5 py-4">
            {MONTH_LABELS.map((label, i) => {
              const m = i + 1;
              const out = isMonthOutOfRange(viewYear, m);
              const isCurrent = viewMonth === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setViewMonth(m);
                    setMode('days');
                  }}
                  className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                    isCurrent
                      ? 'bg-primary-500 text-white'
                      : out
                      ? 'text-gray-200'
                      : 'text-gray-800 active:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* YEARS 모드 */}
        {mode === 'years' && (
          <div className="max-h-72 overflow-y-auto px-5 py-2">
            <div className="grid grid-cols-4 gap-2">
              {yearOptions.map((y) => {
                const out = isYearOutOfRange(y);
                const isCurrent = viewYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    disabled={out}
                    onClick={() => {
                      setViewYear(y);
                      setMode('months');
                    }}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      isCurrent
                        ? 'bg-primary-500 text-white'
                        : out
                        ? 'text-gray-200'
                        : 'text-gray-800 active:bg-gray-100'
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 확인 버튼 */}
        <div className="px-5 pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-3 rounded-xl gradient-btn text-white text-sm font-bold disabled:opacity-40"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
