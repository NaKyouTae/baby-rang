'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

interface ShareMember {
  user: { id: string; nickname: string | null; profileImage: string | null };
  children: { id: string; name: string }[];
}

interface MyShareData {
  code: string;
  members: ShareMember[];
}

interface SharedWithMeItem {
  id: string; // accessId
  role: string;
  child: { id: string; name: string; gender: string; birthDate: string; profileImage: string | null };
  sharedBy: { id: string; nickname: string | null; profileImage: string | null };
}

type Tab = 'mine' | 'received';

export default function SharingPage() {
  const [tab, setTab] = useState<Tab>('mine');
  const [myShare, setMyShare] = useState<MyShareData | null>(null);
  const [sharedWithMe, setSharedWithMe] = useState<SharedWithMeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 코드 입력 모달
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // 멤버 삭제 확인
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ userId: string; name: string } | null>(null);

  // 공유 나가기 확인
  const [leaveTarget, setLeaveTarget] = useState<{ accessId: string; childName: string } | null>(null);

  // 코드 복사 피드백
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, sharedRes] = await Promise.all([
        fetch('/api/shares'),
        fetch('/api/shares/joined'),
      ]);
      if (myRes.ok) setMyShare(await myRes.json());
      if (sharedRes.ok) setSharedWithMe(await sharedRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCopyCode = async () => {
    if (!myShare?.code) return;
    try {
      await navigator.clipboard.writeText(myShare.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareCode = async () => {
    if (!myShare?.code) return;
    const shareData = {
      title: '아기랑 기록 공유',
      text: `아기랑에서 기록을 함께 볼 수 있어요.\n공유 코드: ${myShare.code}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      await handleCopyCode();
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

  const handleRemoveMember = async () => {
    if (!removeMemberTarget) return;
    const res = await fetch(`/api/shares/members/${removeMemberTarget.userId}`, { method: 'DELETE' });
    if (res.ok) {
      setRemoveMemberTarget(null);
      await fetchData();
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    const res = await fetch(`/api/shares/access/${leaveTarget.accessId}`, { method: 'DELETE' });
    if (res.ok) {
      setLeaveTarget(null);
      await fetchData();
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* 헤더 */}
      <div className="bg-white">
        <PageHeader title="기록 공유" variant="back" />
      </div>

      {/* 탭 */}
      <div className="flex bg-white">
        {(['mine', 'received'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t
                ? 'text-gray-900 border-b border-gray-900'
                : 'text-gray-400 border-b border-gray-200'
            }`}
          >
            {t === 'mine' ? '내 공유' : '받은 공유'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pt-6 pb-8">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : tab === 'mine' ? (
          /* ───── 내 공유 탭 ───── */
          <>
            {/* 공유 코드 */}
            {myShare && (
              <div>
                <input
                  type="text"
                  value={myShare.code}
                  disabled
                  className="w-full h-[44px] rounded-lg border border-gray-200 bg-gray-100 px-4 text-center text-sm font-medium text-black tracking-[0.25em]"
                />
                <div className="flex gap-2.5 mt-2.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 h-[44px] rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
                  >
                    {copied ? '복사됨!' : '코드 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareCode}
                    className="flex-1 h-[44px] rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
                  >
                    코드 공유
                  </button>
                </div>
              </div>
            )}

            {/* 멤버 목록 */}
            {myShare && myShare.members.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white px-5 py-4">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  공유 멤버 ({myShare.members.length}명)
                </p>
                <ul className="space-y-3">
                  {myShare.members.map((member) => (
                    <li key={member.user.id} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
                        {member.user.profileImage ? (
                          <img src={member.user.profileImage} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.user.nickname ?? '사용자'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {member.children.map((c) => c.name).join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveMemberTarget({ userId: member.user.id, name: member.user.nickname ?? '사용자' })}
                        className="text-xs text-red-400 active:text-red-600"
                      >
                        내보내기
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 빈 상태 */}
            {myShare && myShare.members.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-2.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-black">공유한 기록이 없어요.</p>
                <p className="text-xs font-normal text-gray-500 mt-1">함께 관리하고 싶은 사람에게 코드를 공유해 보세요.</p>
              </div>
            )}
          </>
        ) : (
          /* ───── 받은 공유 탭 ───── */
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

            {sharedWithMe.length === 0 ? (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-gray-900">받은 공유가 없어요.</p>
                <p className="text-sm text-gray-400">공유 코드를 입력해 기록을 함께 작성해보세요.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {sharedWithMe.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
                      {item.child.profileImage ? (
                        <img src={item.child.profileImage} alt={item.child.name} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={palette.gray500} strokeWidth="1.4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">{item.child.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.sharedBy.nickname ?? '사용자'}님이 공유
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeaveTarget({ accessId: item.id, childName: item.child.name })}
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
