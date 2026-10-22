'use client';

import { useEffect, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { refreshChildrenCache, type Child } from '@/hooks/useChildren';
import { toKstYmd } from '@/lib/childAge';
import ConfirmModal from './ConfirmModal';

type SheetGender = 'unknown' | 'male' | 'female';

const GENDERS: { value: SheetGender; label: string }[] = [
  { value: 'unknown', label: '모름' },
  { value: 'male', label: '남아' },
  { value: 'female', label: '여아' },
];

/**
 * 숫자만 받아 "YYYY. MM. DD" 로 보여준다.
 * 구분자는 다음 숫자가 들어온 뒤에만 붙인다 — 끝에 미리 붙여 두면
 * 지우기를 눌렀을 때 구분자만 지워졌다가 다시 붙어서 숫자가 안 지워진다.
 */
function formatDigits(digits: string): string {
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  const joined = [y, m, d].filter(Boolean).join('. ');
  // 다 채우면 디자인처럼 끝에 마침표를 붙인다("2025. 12. 09.").
  return digits.length === 8 ? `${joined}.` : joined;
}

/** 8자리 숫자 → 실제로 있는 날짜면 YYYY-MM-DD, 아니면 빈 문자열. */
function digitsToYmd(digits: string): string {
  if (digits.length !== 8) return '';
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(y, m - 1, d));
  // 2월 30일 같은 값은 Date 가 다음 달로 넘겨 버린다. 되돌려 비교해서 걸러낸다.
  if (y < 1900 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function todayYmd(): string {
  return toKstYmd(new Date().toISOString());
}

interface Props {
  open: boolean;
  /** 없으면 등록, 있으면 수정. */
  child: Child | null;
  onClose: () => void;
}

/**
 * 마이페이지에서 아기 정보를 등록·수정·삭제하는 바텀시트.
 *
 * 출생일과 출산예정일을 한 칸으로 받는다. 아직 안 태어났으면 미래 날짜를 고르면 된다.
 */
export default function ChildSheet({ open, child, onClose }: Props) {
  const isEdit = child !== null;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<SheetGender>('male');
  // 선택한 날짜를 YYYYMMDD 숫자로 보관한다. 저장할 날짜는 여기서 계산한다.
  const [birthDigits, setBirthDigits] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // 열 때마다 대상 아이 값으로 다시 채운다.
  useEffect(() => {
    if (!open) return;
    setName(child?.name ?? '');
    setGender(
      child?.gender === 'female' || child?.gender === 'unknown'
        ? child.gender
        : 'male',
    );
    setBirthDigits((child?.birthDate ?? '').replace(/-/g, ''));
    setConfirmOpen(false);
    setBusy(false);
  }, [open, child]);

  const birthDate = digitsToYmd(birthDigits);
  const birthInvalid = birthDigits.length === 8 && birthDate === '';
  const canSave = name.trim().length > 0 && birthDate !== '' && !busy;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('gender', gender);
    formData.append('birthDate', birthDate);
    try {
      const res = await fetch(isEdit ? `/api/children/${child.id}` : '/api/children', {
        method: isEdit ? 'PUT' : 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error();
      await refreshChildrenCache();
      onClose();
    } catch {
      alert('저장하지 못했어요.\n잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!child || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/children/${child.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await refreshChildrenCache();
      onClose();
    } catch {
      alert('삭제하지 못했어요.\n잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BottomSheet
        // 삭제 확인 중에는 시트를 내려 두고, 취소하면 입력하던 그대로 다시 띄운다.
        open={open && !confirmOpen}
        onClose={() => !busy && onClose()}
        variant="sheet"
        ariaLabel={isEdit ? '아기 정보 수정하기' : '아기 정보 등록하기'}
        surfaceClassName="bg-[#FDFDFE] !rounded-t-[16px]"
      >
        <div className="flex flex-col gap-[16px] items-center px-[20px] pt-[8px] pb-[max(var(--safe-area-bottom),20px)] overflow-y-auto">
          <span className="h-[4px] w-[36px] shrink-0 rounded-full bg-[#121212]" />
          <p className="w-full text-center text-[#121212] text-[16px] leading-[1.4]">
            {isEdit ? '아기 정보 수정하기' : '아기 정보 등록하기'}
          </p>

          <div className="w-full flex flex-col gap-[10px] py-[8px]">
            <Field label="이름(닉네임)">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="아기 이름을 입력하세요."
                maxLength={20}
                className="w-full h-[52px] px-[20px] rounded-[4px] border border-[#808991] bg-[#FDFDFE] text-[#121212] text-[16px] leading-none outline-none placeholder:text-[#BBC0C5] focus:border-[#121212]"
              />
            </Field>

            <Field label="성별">
              <div role="radiogroup" aria-label="성별" className="w-full flex rounded-[4px] border border-[#808991] overflow-hidden">
                {GENDERS.map((g, i) => {
                  const selected = gender === g.value;
                  // 선택 위치와 관계없이 두 구분선을 유지한다.
                  // 한 버튼에 border-l/r을 함께 주면 손그림 테두리 규칙이 한쪽 선을 덮는다.
                  const sideBorder = i > 0 ? 'border-l border-[#808991]' : '';
                  return (
                    <button
                      key={g.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setGender(g.value)}
                      className={`flex-1 min-w-0 h-[52px] px-[20px] text-[16px] leading-none ${sideBorder} ${
                        selected ? 'bg-[#2C2C2C] text-[#FDFDFE]' : 'text-[#808991]'
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="출생일/출산예정일">
              <div className="relative w-full">
                <div
                  className={`w-full h-[52px] px-[20px] rounded-[4px] border bg-[#FDFDFE] flex items-center text-left text-[16px] leading-none tabular-nums ${
                    birthInvalid ? 'border-[#FF4040]' : 'border-[#808991]'
                  } ${birthDigits ? 'text-[#121212]' : 'text-[#BBC0C5]'}`}
                >
                  {birthDigits ? formatDigits(birthDigits) : formatDigits(todayYmd().replace(/-/g, ''))}
                </div>
                <input
                  type="date"
                  aria-label="출생일/출산예정일 날짜 선택"
                  aria-invalid={birthInvalid}
                  disabled={busy}
                  value={birthDate || ''}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  min="1900-01-01"
                  max="2100-12-31"
                  // 데스크톱 브라우저는 투명한 날짜 칸을 눌러도 달력 아이콘이 아니면 선택 창이 안 열린다. 직접 연다.
                  onClick={(event) => {
                    try {
                      event.currentTarget.showPicker?.();
                    } catch {
                      /* 지원하지 않거나 막힌 브라우저는 기본 동작에 맡긴다 */
                    }
                  }}
                  onChange={(event) => {
                    if (event.target.value) setBirthDigits(event.target.value.replace(/-/g, ''));
                  }}
                />
              </div>
              {birthInvalid && (
                <p className="w-full text-[#FF4040] text-[12px] leading-[1.4]">
                  없는 날짜예요. 다시 확인해 주세요.
                </p>
              )}
            </Field>
          </div>

          {/* 수정일 때는 디자인대로 취소 · 삭제 · 저장하기 세 칸 */}
          <div className="w-full flex gap-[10px]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
            >
              취소
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
              >
                삭제
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!canSave}
              className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
            >
              저장하기
            </button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmModal
        open={open && confirmOpen}
        showThumbnail={false}
        title="아기 정보를 삭제할까요?"
        description={
          <>
            쌓아온 육아 기록이 모두 사라져요.
            <br />
            삭제된 기록은 다시 복구할 수 없어요.
          </>
        }
        confirmLabel="삭제하기"
        onCancel={() => !busy && setConfirmOpen(false)}
        onConfirm={remove}
        busy={busy}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col gap-[8px]">
      <p className="w-full text-[#808991] text-[14px] leading-[1.4]">{label}</p>
      {children}
    </div>
  );
}
