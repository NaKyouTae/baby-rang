'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';
import PageHeader from '@/components/PageHeader';

type ParentRole = 'mom' | 'dad' | 'grandmother' | 'grandfather' | 'caregiver' | 'other' | '';

const ROLE_OPTIONS: { value: ParentRole; label: string }[] = [
  { value: 'mom', label: '엄마' },
  { value: 'dad', label: '아빠' },
  { value: 'grandmother', label: '할머니' },
  { value: 'grandfather', label: '할아버지' },
  { value: 'caregiver', label: '아이돌보미' },
  { value: 'other', label: '기타' },
];

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

  const canSubmit = nickname.trim().length > 0 && parentRole !== '' && !submitting;

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
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader
        title="내 정보"
        variant="back"
        onAction={() => router.push('/settings')}
      />

      <main className="flex-1 px-6 pt-4 space-y-6">
        {/* 이메일 */}
        <section>
          <p className="text-sm font-medium text-gray-700 mb-2">이메일</p>
          <div className="w-full rounded-xl bg-gray-100 px-4 py-3.5">
            <p className="text-sm text-gray-400">{user?.email || '-'}</p>
          </div>
        </section>

        {/* 닉네임 */}
        <section>
          <p className="text-sm font-medium text-gray-700 mb-2">
            닉네임 <span className="text-red-500">*</span>
          </p>
          <div className="w-full rounded-xl bg-gray-100 px-4 py-3.5">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="앱에서 사용할 닉네임"
              maxLength={20}
              className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>
        </section>

        {/* 관계 */}
        <section>
          <p className="text-sm font-medium text-gray-700 mb-3">
            관계 <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setParentRole(value)}
                className={`px-4 h-[28px] rounded-[20px] text-sm font-medium border transition-colors ${
                  parentRole === value
                    ? 'text-white border-transparent'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
                style={
                  parentRole === value
                    ? { backgroundColor: palette.teal, borderColor: palette.teal }
                    : undefined
                }
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      </main>

      {/* 하단 고정 저장 버튼 — BottomNav 위 24px 간격 */}
      <div className="fixed bottom-[calc(var(--safe-area-bottom)+112px)] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-6">
        <button
          onClick={handleSave}
          disabled={!canSubmit}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-bold disabled:opacity-40"
          style={{ backgroundColor: palette.teal }}
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
