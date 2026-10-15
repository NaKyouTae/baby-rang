'use client';

import { useEffect, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { useAuth } from '@/hooks/useAuth';
import { setAuthCache } from '@/hooks/appCache';
import { ageRangeLabel, formatPhone, optionalValue } from '@/lib/socialProfile';

type Gender = 'male' | 'female';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남자' },
  { value: 'female', label: '여자' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * 내 정보 — 설정에서 이름 줄을 누르면 뜨는 바텀시트.
 *
 * 성별만 고칠 수 있다(남자/여자). 서버는 로그인 때 성별이 비어 있을 때만 소셜 값으로 채우므로
 * 여기서 고친 값이 다음 로그인에 되돌아가지 않는다.
 * 이름·연락처·연령대는 카카오·네이버 동의항목으로만 들어온다. 앱에서 고치면 소셜 쪽과
 * 어긋난 채 다음 로그인에 그대로 덮어써지므로(syncSocialProfile) 읽기 전용으로 둔다.
 *
 * 받은 항목은 전부 보여준다 — 화면에 쓰지 않는 항목을 받으면
 * 카카오·네이버 심사에서 "불필요한 개인정보 수집"으로 반려된다.
 */
export default function ProfileSheet({ open, onClose }: Props) {
  const { user } = useAuth();
  const saved: Gender | null = user?.gender === 'male' || user?.gender === 'female' ? user.gender : null;
  const [gender, setGender] = useState<Gender | null>(saved);
  const [busy, setBusy] = useState(false);

  // 열 때마다 저장된 값으로 되돌린다 — 고르다가 취소한 값이 남지 않게
  useEffect(() => {
    if (!open) return;
    setGender(saved);
    setBusy(false);
  }, [open, saved]);

  const changed = gender !== null && gender !== saved;

  const save = async () => {
    if (!changed || busy || !user) return;
    setBusy(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender }),
      });
      if (!res.ok) throw new Error();
      setAuthCache(true, { ...user, gender });
      onClose();
    } catch {
      alert('저장하지 못했어요.\n잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  // 연락처·나이대는 고칠 수 없는 칸이라 디자인대로 값을 연한 회색으로 둔다.
  const fields: { label: string; value: string; muted: boolean }[] = [
    // 이메일은 받아서 저장하지만 이 시트에는 띄우지 않는다
    { label: '연락처', value: formatPhone(user?.phone) || '-', muted: true },
    {
      label: '나이대',
      value: optionalValue(ageRangeLabel(user?.ageRange)),
      muted: true,
    },
  ];

  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      variant="sheet"
      ariaLabel="내 정보"
      // 시트 기본 모서리(24px)가 디자인(16px)보다 둥글다
      surfaceClassName="bg-[#FDFDFE] rounded-t-[16px]!"
    >
      <div
        className="flex flex-col gap-[16px] items-center px-[20px] pt-[8px] overflow-y-auto"
        style={{
          paddingBottom: 'max(var(--safe-area-bottom), 20px)',
          fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        }}
      >
        <div className="w-[36px] h-[4px] rounded-[100px] bg-[#121212] shrink-0" />
        <p className="w-full text-center text-[#121212] text-[16px] leading-[1.4]">내 정보</p>

        <div className="w-full flex flex-col gap-[10px] py-[8px]">
          <ReadOnly label="이름(닉네임)" value={user?.name || '-'} muted={!user?.name} />

          <div className="flex flex-col gap-[8px]">
            <p className="text-[#808991] text-[14px] leading-[1.4]">성별</p>
            <div role="radiogroup" aria-label="성별" className="w-full flex rounded-[4px] border border-[#808991] overflow-hidden">
              {GENDERS.map((g) => {
                const selected = gender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setGender(g.value)}
                    className={`flex-1 min-w-0 h-[52px] px-[20px] text-[16px] leading-none ${
                      selected ? 'bg-[#2C2C2C] text-[#FDFDFE]' : 'text-[#808991]'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {fields.map((f) => (
            <ReadOnly key={f.label} label={f.label} value={f.value} muted={f.muted} />
          ))}
        </div>

        <div className="w-full flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!changed || busy}
            className="flex-1 min-w-0 h-[52px] px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
          >
            저장하기
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

/** 소셜 동의항목으로만 들어오는 값 — 고칠 수 없다 */
function ReadOnly({ label, value, muted }: { label: string; value: string; muted: boolean }) {
  return (
    <div className="flex flex-col gap-[8px]">
      <p className="text-[#808991] text-[14px] leading-[1.4]">{label}</p>
      <div className="h-[52px] px-[20px] flex items-center rounded-[4px] border border-[#808991] bg-[#FDFDFE]">
        <span className="text-[16px] leading-none truncate" style={{ color: muted ? '#BBC0C5' : '#121212' }}>
          {value}
        </span>
      </div>
    </div>
  );
}
