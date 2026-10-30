'use client';

import { useEffect, useState } from 'react';

/**
 * 기록 화면 날짜 머리를 누르면 뜨는 "과거 기록 보기" 팝업.
 *
 * 디데이(D+n)로 고르거나 날짜로 고른다. 두 칸은 같은 날짜를 가리켜서 하나를 바꾸면 다른 칸도 따라 바뀐다.
 * 날짜 칸은 투명한 date input 을 덮어 OS 날짜 선택 창을 연다(아기 등록 시트와 같은 방식).
 */

interface Props {
  open: boolean;
  /** 열 때 보여줄 날짜 (YYYY-MM-DD) */
  value: string;
  /** 출생일. 디데이 계산과 고를 수 있는 가장 이른 날짜. */
  birthDate: string | null;
  /** 고를 수 있는 가장 늦은 날짜(오늘) */
  max: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
}

const DAY_MS = 86400000;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 출생일이 D+1 */
function dDayOf(birthDate: string, date: string): number {
  const diff = Math.round(
    (new Date(`${date}T00:00:00`).getTime() - new Date(`${birthDate}T00:00:00`).getTime()) / DAY_MS,
  );
  return diff + 1;
}

function dateOfDDay(birthDate: string, dDay: number): string {
  const d = new Date(`${birthDate}T00:00:00`);
  d.setDate(d.getDate() + dDay - 1);
  return toYmd(d);
}

/** "2025-12-09" → "2025. 12. 09." */
function formatDate(date: string): string {
  return `${date.replace(/-/g, '. ')}.`;
}

const FIELD = 'w-full h-[52px] px-[20px] rounded-[4px] border bg-[#FDFDFE] flex items-center text-[#121212] text-[16px] leading-none tabular-nums';

export default function RecordDatePopup({ open, value, birthDate, max, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(value);
  // 디데이 칸은 지우고 다시 쓰는 중간 상태가 있어서 숫자 문자열로 따로 들고 있는다.
  const [dDayText, setDDayText] = useState('');

  useEffect(() => {
    if (!open) return;
    setDate(value);
    setDDayText(birthDate ? String(dDayOf(birthDate, value)) : '');
    // 열릴 때만 초기화한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const pickDate = (next: string) => {
    setDate(next);
    if (birthDate) setDDayText(String(dDayOf(birthDate, next)));
  };

  const dDay = Number(dDayText);
  const dDayInvalid = birthDate !== null && (!dDayText || dDay < 1 || dDay > dDayOf(birthDate, max));
  const dateInvalid = date > max || (birthDate !== null && date < birthDate);
  const invalid = dDayInvalid || dateInvalid;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-label="과거 기록 보기">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-[350px] bg-[#FDFDFE] rounded-[16px] p-[20px] flex flex-col gap-[24px] items-center">
        <div className="w-full flex flex-col gap-[10px] items-center justify-center py-[8px]">
          <p className="w-full text-center text-[#121212] text-[16px] leading-none">과거 기록 보기</p>
          <p className="w-full text-center text-[#808991] text-[14px] leading-[1.6]">원하는 날짜를 선택하세요.</p>

          <div className="w-full flex flex-col gap-[10px] items-start py-[8px]">
            <div className="w-full flex flex-col gap-[8px] items-start">
              <p className="w-full text-[#808991] text-[14px] leading-[1.4]">디데이로 선택하기</p>
              <label className={`${FIELD} ${dDayInvalid ? 'border-[#FF4040]' : 'border-[#808991]'}`}>
                <span>D+</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="디데이"
                  disabled={!birthDate}
                  value={dDayText}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
                    setDDayText(digits);
                    const n = Number(digits);
                    if (birthDate && n >= 1 && n <= dDayOf(birthDate, max)) setDate(dateOfDDay(birthDate, n));
                  }}
                  className="flex-1 min-w-0 h-full bg-transparent outline-none text-[16px] leading-none"
                  style={{ fontFamily: 'inherit' }}
                />
              </label>
            </div>

            <div className="w-full flex flex-col gap-[8px] items-start">
              <p className="w-full text-[#808991] text-[14px] leading-[1.4]">날짜로 선택하기</p>
              <div className="w-full flex gap-[10px] items-start">
                <div className="relative flex-1 min-w-0">
                  <div className={`${FIELD} ${dateInvalid ? 'border-[#FF4040]' : 'border-[#808991]'}`}>
                    {formatDate(date)}
                  </div>
                  <input
                    type="date"
                    aria-label="날짜 선택"
                    value={date}
                    min={birthDate ?? undefined}
                    max={max}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    // 데스크톱 브라우저는 투명한 날짜 칸을 눌러도 달력 아이콘이 아니면 선택 창이 안 열린다. 직접 연다.
                    onClick={(event) => {
                      try {
                        event.currentTarget.showPicker?.();
                      } catch {
                        /* 지원하지 않거나 막힌 브라우저는 기본 동작에 맡긴다 */
                      }
                    }}
                    onChange={(event) => {
                      if (event.target.value) pickDate(event.target.value);
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => pickDate(max)}
                  className="shrink-0 size-[52px] p-[10px] flex items-center justify-center rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-[1.4] whitespace-nowrap active:translate-y-px"
                >
                  오늘
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex gap-[10px] items-start">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(date);
              onClose();
            }}
            disabled={invalid}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
