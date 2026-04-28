'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';

const ROLE_LABELS: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  grandmother: '할머니',
  grandfather: '할아버지',
  caregiver: '아이돌보미',
  other: '기타',
};

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  mom: { bg: '#FF2D5514', text: '#FF2D55' },
  dad: { bg: '#007AFF14', text: '#007AFF' },
  grandmother: { bg: '#FF950014', text: '#FF9500' },
  grandfather: { bg: '#34C75914', text: '#34C759' },
  caregiver: { bg: '#A2845E14', text: '#A2845E' },
  other: { bg: '#515C6614', text: '#515C66' },
};

const ROLE_ICONS: Record<string, string> = {
  mom: '/icon-mom.svg',
  dad: '/icon-dad.svg',
  grandmother: '/icon-grandmother.svg',
  grandfather: '/icon-grandfather.svg',
  caregiver: '/icon-caregiver.svg',
  other: '/icon-other.svg',
};

interface SharedUser {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole: string | null;
}

interface ShareMember {
  user: SharedUser;
  children: { id: string; name: string }[];
  accessIds?: string[];
}

interface MyShareData {
  code: string;
  members: ShareMember[];
}

type Tab = 'mine' | 'received';

function MemberCard({
  member,
  onRemove,
}: {
  member: ShareMember;
  onRemove: () => void;
}) {
  const role = member.user.parentRole ?? 'other';
  const roleLabel = ROLE_LABELS[role];
  const badge = ROLE_BADGE_STYLES[role] ?? ROLE_BADGE_STYLES.other;
  const iconSrc = ROLE_ICONS[role] ?? ROLE_ICONS.other;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white overflow-hidden"
        style={{ border: `1px solid ${palette.teal}` }}
      >
        <img src={iconSrc} alt={roleLabel ?? ''} width={24} height={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[16px] font-medium text-black truncate">{member.user.nickname ?? '사용자'}</p>
          {roleLabel && (
            <span
              className="shrink-0 rounded-sm px-1.5 h-4 inline-flex items-center text-xs font-medium"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {roleLabel}
            </span>
          )}
        </div>
        <p className="text-xs font-normal text-gray-500 truncate mt-1.5">
          {member.children.map((c) => c.name).join(', ')}{member.user.email ? ` / ${member.user.email}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0"
        aria-label="삭제"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
}

export default function SharingPage() {
  const [tab, setTab] = useState<Tab>('mine');
  const [myShare, setMyShare] = useState<MyShareData | null>(null);
  const [sharedWithMe, setSharedWithMe] = useState<ShareMember[]>([]);
  const [loading, setLoading] = useState(true);

  // 코드 입력
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // 멤버 삭제 확인
  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ userId: string; name: string } | null>(null);

  // 공유 나가기 확인
  const [leaveTarget, setLeaveTarget] = useState<{ accessIds: string[]; name: string } | null>(null);

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
        setJoinCode('');
        setJoinError('');
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
    const results = await Promise.all(
      leaveTarget.accessIds.map((id) =>
        fetch(`/api/shares/access/${id}`, { method: 'DELETE' }),
      ),
    );
    if (results.every((r) => r.ok)) {
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
                    className="flex-1 h-8 rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
                  >
                    {copied ? '복사됨!' : '코드 복사'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareCode}
                    className="flex-1 h-8 rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
                  >
                    코드 공유
                  </button>
                </div>
              </div>
            )}

            {/* 멤버 목록 */}
            {myShare && myShare.members.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {myShare.members.map((member) => (
                  <MemberCard
                    key={member.user.id}
                    member={member}
                    onRemove={() => setRemoveMemberTarget({ userId: member.user.id, name: member.user.nickname ?? '사용자' })}
                  />
                ))}
              </ul>
            )}

            {/* 빈 상태 */}
            {myShare && myShare.members.length === 0 && (
              <div className="mt-6 rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
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
            {/* 코드 입력 */}
            <div>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="공유 받은 코드를 입력해 주세요."
                maxLength={6}
                className="w-full h-[44px] rounded-lg border border-gray-200 bg-white px-4 text-center text-sm font-medium text-black tracking-[0.25em] placeholder:tracking-normal placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
              />
              {joinError && (
                <p className="mt-1 text-center text-xs text-red-500">{joinError}</p>
              )}
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joining}
                className="mt-2.5 w-full h-8 rounded bg-gray-400 text-xs font-semibold text-white disabled:opacity-50 active:bg-gray-500"
              >
                {joining ? '참여 중...' : '확인'}
              </button>
            </div>

            {sharedWithMe.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 mb-2.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-black">공유 받은 기록이 없어요.</p>
                <p className="text-xs font-normal text-gray-500 mt-1">공유 코드를 입력하면 기록을 함께 관리할 수 있어요.</p>
              </div>
            ) : (
              <ul className="mt-6 space-y-2.5">
                {sharedWithMe.map((item) => (
                  <MemberCard
                    key={item.user.id}
                    member={item}
                    onRemove={() => setLeaveTarget({ accessIds: item.accessIds ?? [], name: item.user.nickname ?? '사용자' })}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* 멤버 내보내기 확인 */}
      <ConfirmModal
        open={!!removeMemberTarget}
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
        }
        title="공유 해제하기"
        description={`공유를 중단하시겠어요?\n언제든 다시 연결 가능해요.`}
        confirmLabel="해제하기"
        cancelLabel="취소"
        onClose={() => setRemoveMemberTarget(null)}
        onConfirm={handleRemoveMember}
      />

      {/* 공유 해제 확인 */}
      <ConfirmModal
        open={!!leaveTarget}
        icon={
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
        }
        title="공유 해제하기"
        description={`공유를 중단하시겠어요?\n언제든 다시 연결 가능해요.`}
        confirmLabel="해제하기"
        cancelLabel="취소"
        onClose={() => setLeaveTarget(null)}
        onConfirm={handleLeave}
      />
    </div>
  );
}
