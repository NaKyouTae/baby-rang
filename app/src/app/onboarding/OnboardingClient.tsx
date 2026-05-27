'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomSheet from '@/components/BottomSheet';
import FormInput from '@/components/FormInput';
import WheelDatePickerModal from '@/components/WheelDatePickerModal';
import { useAuth } from '@/hooks/useAuth';
import { calcChildAge, toKstYmd } from '@/lib/childAge';
import { palette } from '@/lib/colors';

type ParentRole =
  | 'mom'
  | 'dad'
  | 'grandmother'
  | 'grandfather'
  | 'caregiver'
  | 'other'
  | '';

type Gender = 'male' | 'female';

const ROLE_OPTIONS: { value: Exclude<ParentRole, ''>; label: string }[] = [
  { value: 'mom', label: '엄마' },
  { value: 'dad', label: '아빠' },
  { value: 'grandmother', label: '할머니' },
  { value: 'grandfather', label: '할아버지' },
  { value: 'caregiver', label: '돌보미' },
  { value: 'other', label: '기타' },
];

type ChildDraft = {
  key: string;
  name: string;
  gender: Gender;
  birthDate: string;
  dueDate: string;
};

type TermKey = 'service' | 'privacy' | 'marketing' | 'thirdParty';
type Term = { key: TermKey; required: boolean; label: string; href?: string };

const TERMS: Term[] = [
  { key: 'service', required: true, label: '이용약관 동의', href: '/settings/terms' },
  { key: 'privacy', required: true, label: '개인정보 수집 및 이용 동의', href: '/settings/privacy' },
  { key: 'marketing', required: false, label: '마케팅 정보 수신 동의', href: '/settings/marketing' },
  { key: 'thirdParty', required: false, label: '개인정보 제3자 제공 동의', href: '/settings/third-party' },
];

const newKey = () => Math.random().toString(36).slice(2);

function formatBirthDate(d: string): string {
  const ymd = toKstYmd(d);
  return ymd ? ymd.replace(/-/g, '. ') + '.' : '';
}

export default function OnboardingClient() {
  const router = useRouter();
  const { user, isLoaded, isAuthenticated, refresh } = useAuth();

  const [nickname, setNickname] = useState('');
  const [parentRole, setParentRole] = useState<ParentRole>('');
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [agree, setAgree] = useState<Record<TermKey, boolean>>({
    service: false,
    privacy: false,
    marketing: false,
    thirdParty: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 아기 추가 BottomSheet 상태
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftGender, setDraftGender] = useState<Gender>('male');
  const [draftBirthDate, setDraftBirthDate] = useState('');
  const [draftDueDate, setDraftDueDate] = useState('');
  const [draftDatePickerOpen, setDraftDatePickerOpen] = useState(false);
  const [draftDueDatePickerOpen, setDraftDueDatePickerOpen] = useState(false);

  // 카카오 닉네임 자동 기입
  useEffect(() => {
    if (!isLoaded) return;
    if (isAuthenticated && user?.nickname && !nickname) {
      setNickname(user.nickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAuthenticated, user]);

  const allAgreed = TERMS.every((t) => agree[t.key]);
  const requiredAgreed = TERMS.filter((t) => t.required).every((t) => agree[t.key]);
  const canSubmit =
    nickname.trim().length > 0 && parentRole !== '' && requiredAgreed && !submitting;

  const handleToggleAll = () => {
    const next = !allAgreed;
    setAgree({ service: next, privacy: next, marketing: next, thirdParty: next });
  };
  const handleToggleTerm = (key: TermKey) =>
    setAgree((prev) => ({ ...prev, [key]: !prev[key] }));

  const removeChild = (key: string) =>
    setChildren((prev) => prev.filter((c) => c.key !== key));

  const resetDraftChild = () => {
    setDraftName('');
    setDraftGender('male');
    setDraftBirthDate('');
    setDraftDueDate('');
  };
  const openAddChild = () => {
    resetDraftChild();
    setAddChildOpen(true);
  };
  const saveDraftChild = () => {
    if (!draftName.trim() || !draftBirthDate) return;
    setChildren((prev) => [
      ...prev,
      {
        key: newKey(),
        name: draftName.trim(),
        gender: draftGender,
        birthDate: draftBirthDate,
        dueDate: draftDueDate,
      },
    ]);
    setAddChildOpen(false);
    resetDraftChild();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          parentRole,
          children: children.map((c) => ({
            name: c.name,
            gender: c.gender,
            birthDate: c.birthDate,
            ...(c.dueDate ? { dueDate: c.dueDate } : {}),
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '가입 처리 중 오류가 발생했어요.');
      }
      await refresh();
      router.replace('/home');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.');
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-dvh">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    );
  }

  const canSaveDraft = draftName.trim().length > 0 && draftBirthDate !== '';

  return (
    <div
      className="flex flex-col bg-white"
      style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 120px)' }}
    >
      {/* 헤더 */}
      <header
        className="sticky top-0 z-30 bg-white flex items-center justify-center px-5 py-4"
        style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}
      >
        <h1 className="text-[16px] font-medium text-black">회원가입</h1>
      </header>

      <main className="flex-1 px-6 pt-2 space-y-[24px]">
        {/* 이메일 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">이메일</p>
          <FormInput
            value={user?.email || ''}
            placeholder="이메일이 등록되지 않았어요"
            disabled
            readOnly
          />
        </section>

        {/* 닉네임 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">
            닉네임 <span className="text-red-500">*</span>
          </p>
          <FormInput
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력해 주세요."
            maxLength={20}
          />
        </section>

        {/* 관계 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">
            관계 <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-[8px]">
            {ROLE_OPTIONS.map(({ value, label }) => {
              const active = parentRole === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setParentRole(value)}
                  className={`min-w-[45px] h-[28px] rounded-[20px] text-xs border transition-colors ${
                    active
                      ? 'font-medium text-white border-transparent'
                      : 'font-normal bg-white border-gray-200 text-gray-400'
                  }`}
                  style={{
                    paddingLeft: 12,
                    paddingRight: 12,
                    ...(active
                      ? { backgroundColor: palette.teal, borderColor: palette.teal }
                      : {}),
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 아기 정보 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">아기 정보</p>
          {children.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-gray-200 p-4 flex flex-col items-center justify-center text-center">
              <p className="text-[12px] font-normal text-black leading-relaxed mb-2">
                아기 정보를 입력하고 맞춤형 케어를 시작하세요.
              </p>
              <button
                type="button"
                onClick={openAddChild}
                className="text-[12px] font-medium text-white rounded-[4px] px-3 h-[24px] flex items-center"
                style={{ backgroundColor: palette.teal }}
              >
                아기 추가하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-[10px]">
              {children.map((c) => {
                const { days, months, extraDays } = calcChildAge(c.birthDate);
                return (
                  <div
                    key={c.key}
                    className="relative rounded-[8px] border border-gray-200 bg-gray-100 p-3 flex flex-col items-center justify-center"
                    style={{ minHeight: 132 }}
                  >
                    <button
                      type="button"
                      onClick={() => removeChild(c.key)}
                      aria-label={`${c.name} 삭제`}
                      className="absolute top-1.5 right-1.5 p-1 text-gray-300 active:text-gray-500"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <div
                      className="w-[44px] h-[44px] rounded-full border flex items-center justify-center bg-white"
                      style={{ borderColor: palette.teal }}
                    >
                      <img
                        src={c.gender === 'female' ? '/icon-girl.svg' : '/icon-boy.svg'}
                        alt={c.gender === 'female' ? '여아' : '남아'}
                        width={26}
                        height={26}
                      />
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-black">{c.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-medium text-white px-1.5 h-[16px] flex items-center rounded"
                        style={{ backgroundColor: palette.teal }}
                      >
                        D+{days}
                      </span>
                      <span className="text-[11px] text-black">
                        {months}개월 {extraDays}일
                      </span>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={openAddChild}
                className="rounded-[8px] border border-gray-200 bg-white text-gray-300 flex items-center justify-center active:bg-gray-100"
                style={{ minHeight: 132 }}
                aria-label="아기 추가"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </section>

        {/* 약관 동의 */}
        <section>
          <p className="text-xs font-medium text-gray-500 mb-[8px]">약관 동의</p>
          <div className="rounded-[8px] border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={handleToggleAll}
              className="w-full flex items-center px-4 py-3 border-b border-gray-200 active:bg-gray-50"
            >
              <CheckIcon checked={allAgreed} size={20} />
              <span className="ml-2 text-[14px] font-medium text-black">약관 전체 동의</span>
              <span className="ml-2 text-[11px] text-gray-400">(선택 동의 포함)</span>
            </button>
            <ul className="py-1">
              {TERMS.map((t) => (
                <li key={t.key} className="flex items-center px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTerm(t.key)}
                    className="flex items-center flex-1 min-w-0 active:opacity-70"
                  >
                    <CheckIcon checked={agree[t.key]} size={16} />
                    <span className="ml-2 text-[13px] font-normal text-gray-600 text-left">
                      [{t.required ? '필수' : '선택'}] {t.label}
                    </span>
                  </button>
                  {t.href ? (
                    <Link
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${t.label} 자세히 보기`}
                      className="p-1 text-gray-300"
                    >
                      <ChevronRightIcon />
                    </Link>
                  ) : (
                    <span aria-hidden className="p-1 text-gray-300">
                      <ChevronRightIcon />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </main>

      {/* 하단 고정 저장 버튼 */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white px-6 pt-3"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
      >
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-[4px] text-sm font-bold transition-colors"
          style={{
            backgroundColor: canSubmit ? palette.teal : palette.gray200,
            color: canSubmit ? '#fff' : palette.gray400,
          }}
        >
          {submitting ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* 아기 추가 BottomSheet */}
      <BottomSheet
        open={addChildOpen}
        onClose={() => setAddChildOpen(false)}
        variant="sheet"
        ariaLabel="아기 추가하기"
      >
        <div className="px-6 pt-5">
          <h2 className="text-[16px] font-medium text-black text-center">아기 추가하기</h2>
        </div>
        <div className="px-6 pt-4 space-y-[20px]">
          <section>
            <p className="text-xs font-medium text-gray-500 mb-[8px]">
              이름(닉네임) <span className="text-red-500">*</span>
            </p>
            <FormInput
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="아기 이름을 입력해 주세요."
              maxLength={20}
            />
          </section>
          <section>
            <p className="text-xs font-medium text-gray-500 mb-[8px]">
              성별 <span className="text-red-500">*</span>
            </p>
            <div className="flex gap-[8px]">
              {(['male', 'female'] as const).map((g) => {
                const active = draftGender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setDraftGender(g)}
                    className={`min-w-[64px] h-[32px] rounded-[20px] text-xs border transition-colors ${
                      active
                        ? 'font-medium text-white border-transparent'
                        : 'font-normal bg-white border-gray-200 text-gray-400'
                    }`}
                    style={{
                      paddingLeft: 14,
                      paddingRight: 14,
                      ...(active
                        ? { backgroundColor: palette.teal, borderColor: palette.teal }
                        : {}),
                    }}
                  >
                    {g === 'male' ? '남아' : '여아'}
                  </button>
                );
              })}
            </div>
          </section>
          <section>
            <p className="text-xs font-medium text-gray-500 mb-[8px]">
              출생일 <span className="text-red-500">*</span>
            </p>
            <button
              type="button"
              onClick={() => setDraftDatePickerOpen(true)}
              className="w-full rounded-[4px] border border-gray-200 bg-white px-3 py-3 text-[14px] text-left outline-none focus:border-gray-400 transition-colors"
            >
              <span className={draftBirthDate ? 'text-app-black' : 'text-gray-400'}>
                {draftBirthDate ? formatBirthDate(draftBirthDate) : '출생일을 선택해 주세요.'}
              </span>
            </button>
          </section>
          <section>
            <p className="text-xs font-medium text-gray-500 mb-[8px]">출산예정일</p>
            <button
              type="button"
              onClick={() => setDraftDueDatePickerOpen(true)}
              className="w-full rounded-[4px] border border-gray-200 bg-white px-3 py-3 text-[14px] text-left outline-none focus:border-gray-400 transition-colors"
            >
              <span className={draftDueDate ? 'text-app-black' : 'text-gray-400'}>
                {draftDueDate ? formatBirthDate(draftDueDate) : '출산예정일을 선택해 주세요.'}
              </span>
            </button>
            <p className="text-[11px] text-gray-400 mt-2">
              출산예정일을 입력하면 더 정확한 발달 분석을 확인하실 수 있어요.
            </p>
          </section>
        </div>
        <div
          className="flex gap-2 px-6 pt-5"
          style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 16px)' }}
        >
          <button
            type="button"
            onClick={() => setAddChildOpen(false)}
            className="flex-1 h-12 rounded-[8px] bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={saveDraftChild}
            disabled={!canSaveDraft}
            className="flex-1 h-12 rounded-[8px] text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: palette.teal }}
          >
            추가
          </button>
        </div>
      </BottomSheet>

      <WheelDatePickerModal
        open={draftDatePickerOpen}
        value={draftBirthDate}
        max={new Date().toISOString().slice(0, 10)}
        onClose={() => setDraftDatePickerOpen(false)}
        onConfirm={(d) => setDraftBirthDate(d)}
      />

      <WheelDatePickerModal
        open={draftDueDatePickerOpen}
        value={draftDueDate}
        onClose={() => setDraftDueDatePickerOpen(false)}
        onConfirm={(d) => setDraftDueDate(d)}
      />
    </div>
  );
}

function CheckIcon({ checked, size = 16 }: { checked: boolean; size?: number }) {
  if (checked) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0"
        aria-hidden
      >
        <rect width="16" height="16" rx="8" fill="#3078C9" />
        <path
          d="M4 7.36957L7.48559 10.5L12 5.5"
          stroke="#FDFDFE"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 17"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <rect x="0.5" y="0.5" width="16" height="16" rx="8" fill="#FDFDFE" />
      <rect
        x="0.5"
        y="0.5"
        width="16"
        height="16"
        rx="8"
        stroke="#EEF0F1"
        strokeLinejoin="bevel"
      />
      <path
        d="M4.5 7.86957L7.98559 11L12.5 6"
        stroke="#808991"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
