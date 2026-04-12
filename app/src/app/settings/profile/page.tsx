'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type ParentRole = 'mom' | 'dad' | '';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isLoaded, isAuthenticated, refresh } = useAuth();

  const [nickname, setNickname] = useState('');
  const [parentRole, setParentRole] = useState<ParentRole>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) {
      router.replace('/home');
      return;
    }
    setNickname(user?.nickname ?? '');
    setParentRole(((user?.parentRole as ParentRole) ?? '') || '');
  }, [isLoaded, isAuthenticated, user, router]);

  const canSubmit =
    nickname.trim().length > 0 && (parentRole === 'mom' || parentRole === 'dad') && !submitting;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          parentRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '저장 중 오류가 발생했어요.');
      }
      await refresh();
      setToast('저장되었어요');
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.');
    } finally {
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

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)]">
        <button
          type="button"
          onClick={() => router.push('/settings')}
          aria-label="뒤로가기"
          className="p-2"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          내 정보
        </h1>
      </header>

      <main className="flex-1 mx-4 mt-4 space-y-4">
        {/* 프로필 사진 / 이메일 */}
        <section className="rounded-2xl bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.nickname ?? '프로필'}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-gray-400">이메일</p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.email || '-'}
            </p>
          </div>
        </section>

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

        {/* 역할 */}
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

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </main>

      {/* 하단 고정 저장 버튼 (BottomNav 위) */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4">
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40"
        >
          {submitting ? '저장 중...' : '저장'}
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
