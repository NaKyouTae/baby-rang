'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChildren } from '@/hooks/useChildren';
import { calcChildAge } from '@/lib/childAge';
import ConfirmModal from '@/components/ConfirmModal';
import { palette } from '@/lib/colors';

interface ShareMember {
  id: string;
  userId: string;
  user: { id: string; nickname: string | null; profileImage: string | null };
}

interface OwnedShare {
  id: string;
  childId: string;
  code: string;
  isActive: boolean;
  child: { id: string; name: string; gender: string; birthDate: string; profileImage: string | null };
  members: ShareMember[];
}

interface JoinedItem {
  id: string; // membership id
  shareId: string;
  share: {
    id: string;
    child: { id: string; name: string; gender: string; birthDate: string; profileImage: string | null };
    owner: { id: string; nickname: string | null; profileImage: string | null };
  };
}

type Tab = 'owned' | 'joined';

export default function SharingPage() {
  const router = useRouter();
  const { children } = useChildren();
  const [tab, setTab] = useState<Tab>('owned');
  const [ownedShares, setOwnedShares] = useState<OwnedShare[]>([]);
  const [joinedItems, setJoinedItems] = useState<JoinedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 코드 입력 모달
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // 코드 생성 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [creating, setCreating] = useState(false);

  // 멤버 삭제 확인
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ shareId: string; memberId: string; name: string } | null>(null);

  // 공유 나가기 확인
  const [leaveTarget, setLeaveTarget] = useState<{ shareId: string; memberId: string; childName: string } | null>(null);

  // 코드 복사 피드백
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownedRes, joinedRes] = await Promise.all([
        fetch('/api/shares'),
        fetch('/api/shares/joined'),
      ]);
      if (ownedRes.ok) setOwnedShares(await ownedRes.json());
      if (joinedRes.ok) setJoinedItems(await joinedRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 내 아이 중 아직 공유 코드가 없는 아이들
  const ownChildren = children.filter((c) => !('isShared' in c && (c as unknown as Record<string, boolean>).isShared));
  const unsharedChildren = ownChildren.filter(
    (c) => !ownedShares.some((s) => s.childId === c.id)
  );

  const handleCreate = async () => {
    if (!selectedChildId || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: selectedChildId }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setSelectedChildId('');
        await fetchData();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/shares/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      if (res.ok) {
        setJoinOpen(false);
        setJoinCode('');
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setJoinError(data.message || '공유 코드를 확인해주세요.');
      }
    } catch {
      setJoinError('오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = async (share: OwnedShare) => {
    try {
      await navigator.clipboard.writeText(share.code);
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleRegenerate = async (shareId: string) => {
    const res = await fetch(`/api/shares/${shareId}/regenerate`, { method: 'PATCH' });
    if (res.ok) await fetchData();
  };

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    const { shareId, memberId } = removeMemberTarget;
    const res = await fetch(`/api/shares/${shareId}/members/${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      setRemoveMemberTarget(null);
      await fetchData();
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    const { shareId, memberId } = leaveTarget;
    const res = await fetch(`/api/shares/${shareId}/members/${memberId}`, { method: 'DELETE' });
    if (res.ok) {
      setLeaveTarget(null);
      await fetchData();
    }
  };

  const handleDeleteShare = async (shareId: string) => {
    const res = await fetch(`/api/shares/${shareId}`, { method: 'DELETE' });
    if (res.ok) await fetchData();
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white px-6">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-white px-3 pt-[var(--safe-area-top)] pb-3 border-b border-gray-100 -mx-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full active:bg-gray-100"
          aria-label="뒤로 가기"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.black} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-[16px] font-semibold text-gray-900">기록 공유</h1>
      </header>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 bg-white -mx-6">
        {(['owned', 'joined'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-400'
            }`}
          >
            {t === 'owned' ? '내 공유' : '참여 중'}
          </button>
        ))}
      </div>

      <div className="flex-1 pt-4 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" />
            ))}
          </div>
        ) : tab === 'owned' ? (
          /* ───── 내 공유 탭 ───── */
          <>
            {/* 공유 코드 생성 버튼 */}
            {unsharedChildren.length > 0 && (
              <button
                type="button"
                onClick={() => { setCreateOpen(true); setSelectedChildId(unsharedChildren[0]?.id ?? ''); }}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white active:bg-gray-800"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                공유 코드 만들기
              </button>
            )}

            {ownedShares.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">아직 공유한 기록이 없어요</p>
                <p className="text-sm text-gray-500">공유 코드를 만들어 가족에게 전달해보세요</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {ownedShares.map((share) => (
                  <li key={share.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    {/* 아이 정보 */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
                        {share.child.profileImage ? (
                          <img src={share.child.profileImage} alt={share.child.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-gray-900 truncate">{share.child.name}</p>
                        <p className="text-xs text-gray-400">
                          {(() => { const { months, extraDays } = calcChildAge(share.child.birthDate); return `${months}개월 ${extraDays}일`; })()}
                        </p>
                      </div>
                    </div>

                    {/* 공유 코드 */}
                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 mb-3">
                      <span className="flex-1 text-center text-lg font-bold tracking-[0.3em] text-gray-900">{share.code}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(share)}
                        className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white active:bg-gray-800"
                      >
                        {copiedId === share.id ? '복사됨' : '복사'}
                      </button>
                    </div>

                    {/* 멤버 목록 */}
                    {share.members.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">참여 멤버 ({share.members.length}명)</p>
                        <ul className="space-y-2">
                          {share.members.map((m) => (
                            <li key={m.id} className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
                                {m.user.profileImage ? (
                                  <img src={m.user.profileImage} alt="" className="h-7 w-7 rounded-full object-cover" />
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                )}
                              </div>
                              <span className="flex-1 text-sm text-gray-700 truncate">{m.user.nickname ?? '사용자'}</span>
                              <button
                                type="button"
                                onClick={() => setRemoveMemberTarget({ shareId: share.id, memberId: m.id, name: m.user.nickname ?? '사용자' })}
                                className="text-xs text-red-400 active:text-red-600"
                              >
                                내보내기
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 액션 버튼들 */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRegenerate(share.id)}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-600 active:bg-gray-50"
                      >
                        코드 재발급
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteShare(share.id)}
                        className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-400 active:bg-red-50"
                      >
                        공유 중지
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          /* ───── 참여 중 탭 ───── */
          <>
            {/* 코드 입력 버튼 */}
            <button
              type="button"
              onClick={() => { setJoinOpen(true); setJoinCode(''); setJoinError(''); }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white active:bg-gray-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              공유 코드 입력
            </button>

            {joinedItems.length === 0 ? (
              <div className="mt-16 flex flex-col items-center gap-4 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">참여 중인 공유가 없어요</p>
                <p className="text-sm text-gray-500">공유 코드를 입력해 기록을 함께 작성해보세요</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {joinedItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
                      {item.share.child.profileImage ? (
                        <img src={item.share.child.profileImage} alt={item.share.child.name} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">{item.share.child.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.share.owner.nickname ?? '사용자'}님이 공유
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveTarget({ shareId: item.share.id, memberId: item.id, childName: item.share.child.name })}
                      className="shrink-0 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 active:bg-gray-50"
                    >
                      나가기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 공유 코드 생성 모달 */}
      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6" onClick={() => setCreateOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-center text-lg font-bold text-gray-900 mb-4">공유할 아이 선택</h2>
            <ul className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {unsharedChildren.map((child) => (
                <li key={child.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 border-2 transition-colors ${
                      selectedChildId === child.id ? 'bg-primary-50 border-primary-400' : 'bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
                      {child.profileImage ? (
                        <img src={child.profileImage} alt={child.name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">{child.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!selectedChildId || creating}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50 active:bg-gray-800"
              >
                {creating ? '생성 중...' : '코드 생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 코드 입력 모달 */}
      {joinOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-6" onClick={() => setJoinOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-center text-lg font-bold text-gray-900 mb-2">공유 코드 입력</h2>
            <p className="text-center text-sm text-gray-500 mb-4">전달받은 6자리 코드를 입력하세요</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="예: A3K7NP"
              maxLength={6}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-gray-900 placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-base placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary-400"
              autoFocus
            />
            {joinError && (
              <p className="mt-2 text-center text-xs text-red-500">{joinError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setJoinOpen(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joining}
                className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50 active:bg-gray-800"
              >
                {joining ? '참여 중...' : '참여하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 내보내기 확인 */}
      <ConfirmModal
        open={!!removeMemberTarget}
        emoji="👋"
        title={`${removeMemberTarget?.name}님을 내보낼까요?`}
        description="내보내면 더 이상 기록을 볼 수 없어요."
        confirmLabel="내보내기"
        cancelLabel="취소"
        variant="danger"
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMember}
      />

      {/* 나가기 확인 */}
      <ConfirmModal
        open={!!leaveTarget}
        emoji="👋"
        title={`${leaveTarget?.childName} 공유에서 나갈까요?`}
        description="나가면 더 이상 기록을 볼 수 없어요."
        confirmLabel="나가기"
        cancelLabel="취소"
        variant="danger"
        onClose={() => setLeaveTarget(null)}
        onConfirm={handleLeave}
      />
    </div>
  );
}
