'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import DatePickerModal from '@/components/DatePickerModal';
import { useAuth } from '@/hooks/useAuth';

type ParentRole = 'mom' | 'dad' | '';
type Gender = 'male' | 'female' | '';

type ChildDraft = {
  key: string;
  name: string;
  gender: Gender;
  birthDate: string;
};

const newChild = (): ChildDraft => ({
  key: Math.random().toString(36).slice(2),
  name: '',
  gender: '',
  birthDate: '',
});

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded, isAuthenticated, refresh } = useAuth();

  const [nickname, setNickname] = useState('');
  const [parentRole, setParentRole] = useState<ParentRole>('');
  const [children, setChildren] = useState<ChildDraft[]>([]);
  const [datePickerFor, setDatePickerFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 카카오 닉네임 자동 기입
  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    if (user?.nickname && !nickname) {
      setNickname(user.nickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAuthenticated, user]);

  const canSubmit = nickname.trim().length > 0 && parentRole !== '' && !submitting;

  const updateChild = (key: string, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const addChildRow = () => setChildren((prev) => [...prev, newChild()]);
  const removeChildRow = (key: string) =>
    setChildren((prev) => prev.filter((c) => c.key !== key));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const validChildren = children
      .filter((c) => c.name.trim() && c.gender && c.birthDate)
      .map((c) => ({
        name: c.name.trim(),
        gender: c.gender,
        birthDate: c.birthDate,
      }));

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          parentRole,
          children: validChildren,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '가입 처리 중 오류가 발생했어요.');
      }
      await refresh();
      router.replace('/home');
    } catch (e: any) {
      setError(e?.message || '오류가 발생했어요.');
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

  const datePickerChild = children.find((c) => c.key === datePickerFor);

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50 pb-32">
      {/* 헤더 */}
      <header className="px-5 pt-[max(env(safe-area-inset-top),24px)] pb-2">
        <p className="text-xs text-primary-600 font-semibold">회원가입</p>
        <h1 className="mt-1 text-2xl font-extrabold text-gray-900 leading-tight">
          아기랑에 오신 걸 환영해요
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          몇 가지만 알려주시면 바로 시작할 수 있어요.
        </p>
      </header>

      <main className="flex-1 mx-4 mt-4 space-y-4">
        {/* 카카오 프로필 표시 */}
        {user && (
          <div className="rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-primary-50 shrink-0">
              {user.profileImage ? (
                <Image src={user.profileImage} alt="프로필" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🙂</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-gray-400">카카오 계정</p>
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.email || user.nickname || '카카오 로그인됨'}
              </p>
            </div>
          </div>
        )}

        {/* 닉네임 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-gray-500">
            닉네임 <span className="text-primary-600">*</span>
          </label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="앱에서 사용할 닉네임"
            maxLength={20}
            className="mt-2 w-full text-base font-bold text-gray-900 placeholder-gray-300 border-b border-gray-200 pb-1.5 outline-none focus:border-gray-400 bg-transparent"
          />
        </section>

        {/* 성별(부모 역할) */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500">
            역할 <span className="text-primary-600">*</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setParentRole('mom')}
              className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                parentRole === 'mom'
                  ? 'bg-pink-50 border-pink-300 text-pink-600'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              🤱 엄마
            </button>
            <button
              type="button"
              onClick={() => setParentRole('dad')}
              className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                parentRole === 'dad'
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-gray-50 border-gray-100 text-gray-400'
              }`}
            >
              👨 아빠
            </button>
          </div>
        </section>

        {/* 아이 등록 (선택, 여러 명) */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">우리 아이 (선택)</p>
            <span className="text-[10px] text-gray-300">지금 등록하지 않아도 돼요</span>
          </div>

          <div className="mt-3 space-y-3">
            {children.map((c) => (
              <div key={c.key} className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={c.name}
                    onChange={(e) => updateChild(c.key, { name: e.target.value })}
                    placeholder="아이 이름"
                    className="flex-1 min-w-0 text-sm font-bold text-gray-900 placeholder-gray-300 border-b border-gray-200 pb-0.5 outline-none focus:border-gray-400 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => removeChildRow(c.key)}
                    className="p-1.5 text-gray-300"
                    aria-label="아이 삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateChild(c.key, { gender: 'male' })}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                      c.gender === 'male'
                        ? 'bg-blue-50 text-blue-500 font-semibold'
                        : 'bg-white text-gray-400 border border-gray-100'
                    }`}
                  >
                    남자아이
                  </button>
                  <button
                    type="button"
                    onClick={() => updateChild(c.key, { gender: 'female' })}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                      c.gender === 'female'
                        ? 'bg-pink-50 text-pink-500 font-semibold'
                        : 'bg-white text-gray-400 border border-gray-100'
                    }`}
                  >
                    여자아이
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDatePickerFor(c.key)}
                  className={`w-full text-left text-sm font-bold border-b border-gray-200 pb-1 outline-none bg-transparent ${
                    c.birthDate ? 'text-gray-900' : 'text-gray-300'
                  }`}
                >
                  {c.birthDate ? c.birthDate.replace(/-/g, '. ') : '생년월일 선택'}
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addChildRow}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 active:bg-gray-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              아이 추가하기
            </button>
          </div>
        </section>

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
      </main>

      {/* 하단 고정 CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-[max(env(safe-area-inset-bottom),16px)] px-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
        >
          {submitting ? '가입 중...' : '아기랑 시작하기'}
        </button>
      </div>

      {/* 생년월일 모달 */}
      <DatePickerModal
        open={datePickerFor !== null}
        value={datePickerChild?.birthDate || ''}
        max={new Date().toISOString().slice(0, 10)}
        onClose={() => setDatePickerFor(null)}
        onConfirm={(d) => {
          if (datePickerFor) updateChild(datePickerFor, { birthDate: d });
        }}
      />
    </div>
  );
}
