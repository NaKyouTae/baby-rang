'use client';

import { useCallback, useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { refreshChildrenCache } from '@/hooks/useChildren';
import { palette } from '@/lib/colors';

const ROLE_LABELS: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  grandmother: '할머니',
  grandfather: '할아버지',
  caregiver: '돌보미',
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

interface GroupMemberUser {
  id: string;
  nickname: string | null;
  email: string | null;
  profileImage: string | null;
  parentRole: string | null;
}

interface GroupMember {
  userId: string;
  joinedAt: string;
  isOwner: boolean;
  user: GroupMemberUser;
}

interface GroupChild {
  id: string;
  name: string;
}

interface Group {
  id: string;
  code: string;
  isOwner: boolean;
  ownerId: string;
  members: GroupMember[];
  children: GroupChild[];
}

type Tab = 'mine' | 'received';

function MemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: GroupMember;
  canRemove: boolean;
  onRemove?: () => void;
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt={roleLabel ?? ''} width={24} height={24} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[16px] font-medium text-black truncate">
            {member.user.nickname ?? '사용자'}
          </p>
          {roleLabel && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {roleLabel}
            </span>
          )}
          {member.isOwner && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: '#0000000A', color: '#000' }}
            >
              소유자
            </span>
          )}
        </div>
        {member.user.email && (
          <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
        )}
      </div>
      {canRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="내보내기"
          className="shrink-0 text-gray-400 active:text-gray-600 p-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </li>
  );
}

function GroupCard({
  group,
  meId,
  onCopy,
  onShare,
  onRemoveMember,
  onLeave,
  copied,
}: {
  group: Group;
  meId: string;
  onCopy: (code: string) => void;
  onShare: (code: string) => void;
  onRemoveMember: (groupId: string, target: GroupMember) => void;
  onLeave: (group: Group) => void;
  copied: boolean;
}) {
  const otherMembers = group.members.filter((m) => m.userId !== meId);
  const owner = group.members.find((m) => m.userId === group.ownerId);
  const childrenLabel = group.children.length
    ? group.children.map((c) => c.name).join(', ')
    : '아이 없음';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* 그룹 헤더: 아이 이름 + nav */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-black">{childrenLabel}</p>
        {!group.isOwner && owner && (
          <span className="text-xs text-gray-500">
            소유자: {owner.user.nickname ?? '사용자'}
          </span>
        )}
      </div>

      {/* 공유 코드 */}
      <input
        type="text"
        value={group.code}
        disabled
        className="w-full h-[44px] rounded-lg border border-gray-200 bg-gray-100 px-4 text-center text-sm font-medium text-black tracking-[0.25em]"
      />
      <div className="flex gap-2.5 mt-2.5">
        <button
          type="button"
          onClick={() => onCopy(group.code)}
          className="flex-1 h-8 rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
        >
          {copied ? '복사됨!' : '코드 복사'}
        </button>
        <button
          type="button"
          onClick={() => onShare(group.code)}
          className="flex-1 h-8 rounded bg-gray-400 text-xs font-semibold text-white active:bg-gray-500"
        >
          코드 공유
        </button>
      </div>

      {/* 멤버 목록 */}
      {otherMembers.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {otherMembers.map((member) => (
            <MemberRow
              key={member.userId}
              member={member}
              canRemove={group.isOwner}
              onRemove={
                group.isOwner
                  ? () => onRemoveMember(group.id, member)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-gray-500 text-center">
          {group.isOwner
            ? '함께할 사람에게 코드를 공유해 보세요.'
            : '다른 멤버가 없어요.'}
        </p>
      )}

      {/* 본인 액션 */}
      <button
        type="button"
        onClick={() => onLeave(group)}
        className="mt-4 w-full h-8 rounded border border-gray-200 text-xs font-medium text-gray-600 active:bg-gray-50"
      >
        {group.isOwner ? '그룹 닫기' : '그룹에서 나가기'}
      </button>
    </div>
  );
}

export default function SharingPage() {
  const { user } = useAuth();
  const meId = user?.id ?? '';
  const [tab, setTab] = useState<Tab>('mine');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<
    { groupId: string; userId: string; name: string } | null
  >(null);
  const [leaveTarget, setLeaveTarget] = useState<Group | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groups', { cache: 'no-store' });
      if (res.ok) setGroups((await res.json()) as Group[]);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleShareCode = async (code: string) => {
    const shareData = {
      title: '아기랑 기록 공유',
      text: `아기랑에서 기록을 함께 볼 수 있어요.\n공유 코드: ${code}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* cancelled */
      }
    } else {
      await handleCopyCode(code);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || joining) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      if (res.ok) {
        setJoinCode('');
        setJoinError('');
        // 그룹 참여로 접근 가능한 아이가 늘어났으므로 전역 children 캐시를 갱신한다.
        // (재로그인 없이 기록/패턴 페이지에서 바로 프로필이 보이도록)
        await Promise.all([fetchData(), refreshChildrenCache()]);
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
    if (!removeTarget) return;
    const res = await fetch(
      `/api/groups/${removeTarget.groupId}/members/${removeTarget.userId}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      setRemoveTarget(null);
      await fetchData();
    }
  };

  const handleLeave = async () => {
    if (!leaveTarget) return;
    const res = await fetch(`/api/groups/${leaveTarget.id}/me`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setLeaveTarget(null);
      // 그룹 탈퇴로 접근 가능한 아이가 줄었을 수 있으므로 캐시도 갱신한다.
      await Promise.all([fetchData(), refreshChildrenCache()]);
    }
  };

  const myGroups = groups.filter((g) => g.isOwner);
  const receivedGroups = groups.filter((g) => !g.isOwner);
  const currentGroups = tab === 'mine' ? myGroups : receivedGroups;

  return (
    <div className="flex flex-col bg-white">
      <div className="bg-white">
        <PageHeader title="기록 공유" variant="back" />
      </div>

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
            {t === 'mine' ? '내 그룹' : '참여한 그룹'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pt-6 pb-8 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-40 rounded-lg bg-white border border-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : tab === 'mine' ? (
          <>
            {myGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-black">
                  내 그룹이 없어요.
                </p>
                <p className="text-xs font-normal text-gray-500 mt-1">
                  회원가입 시 자동으로 만들어진 그룹이 보여야 해요.
                </p>
              </div>
            ) : (
              myGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  meId={meId}
                  onCopy={handleCopyCode}
                  onShare={handleShareCode}
                  onRemoveMember={(groupId, member) =>
                    setRemoveTarget({
                      groupId,
                      userId: member.userId,
                      name: member.user.nickname ?? '사용자',
                    })
                  }
                  onLeave={(g) => setLeaveTarget(g)}
                  copied={copiedCode === g.code}
                />
              ))
            )}
          </>
        ) : (
          <>
            <div className="mb-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="공유 받은 코드를 입력해 주세요."
                maxLength={6}
                className="w-full h-[44px] rounded-lg border border-gray-200 bg-white px-4 text-center text-sm font-medium text-black tracking-[0.25em] placeholder:tracking-normal placeholder:text-gray-400 placeholder:font-normal focus:outline-none"
              />
              {joinError && (
                <p className="mt-1 text-center text-xs text-red-500">
                  {joinError}
                </p>
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

            {receivedGroups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-black">
                  참여한 그룹이 없어요.
                </p>
                <p className="text-xs font-normal text-gray-500 mt-1">
                  공유 코드를 입력하면 함께 관리할 수 있어요.
                </p>
              </div>
            ) : (
              receivedGroups.map((g) => (
                <GroupCard
                  key={g.id}
                  group={g}
                  meId={meId}
                  onCopy={handleCopyCode}
                  onShare={handleShareCode}
                  onRemoveMember={() => {}}
                  onLeave={(g) => setLeaveTarget(g)}
                  copied={copiedCode === g.code}
                />
              ))
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!removeTarget}
        title="멤버 내보내기"
        description={`${removeTarget?.name ?? '사용자'}님을 그룹에서 내보내시겠어요?\n언제든 다시 초대할 수 있어요.`}
        confirmLabel="내보내기"
        cancelLabel="취소"
        variant="danger"
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
      />

      <ConfirmModal
        open={!!leaveTarget}
        title={
          leaveTarget?.isOwner && leaveTarget?.members.length === 1
            ? '그룹을 닫을까요?'
            : leaveTarget?.isOwner
              ? '그룹에서 나가시겠어요?'
              : '그룹에서 나가시겠어요?'
        }
        description={
          leaveTarget?.isOwner && leaveTarget?.members.length === 1
            ? '마지막 멤버가 나가면 그룹의 모든 아이와 기록이\n영구 삭제됩니다.'
            : leaveTarget?.isOwner
              ? '소유자가 나가면 가장 일찍 합류한 멤버에게\n자동으로 소유권이 넘어가요.'
              : '나가면 이 그룹의 아이와 기록을 더 이상 볼 수 없어요.'
        }
        confirmLabel={
          leaveTarget?.isOwner && leaveTarget?.members.length === 1
            ? '그룹 닫기'
            : '나가기'
        }
        cancelLabel="취소"
        variant="danger"
        onClose={() => setLeaveTarget(null)}
        onConfirm={handleLeave}
      />
    </div>
  );
}
