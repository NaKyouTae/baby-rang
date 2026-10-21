'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshChildrenCache } from '@/hooks/useChildren';
import ConfirmModal from './ConfirmModal';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';
/** 고른 탭 — #FFD200 10% 를 흰 바탕 위에 겹쳐 불투명하게 칠한다. */
const SELECTED_BG = 'linear-gradient(rgba(255,210,0,0.1), rgba(255,210,0,0.1)), #FDFDFE';
// 48px 안에 16px 두 글자가 좌우 여백 10px 과 함께는 안 들어간다. 좌우 여백을 빼고 줄바꿈을 막는다.
const SIDE_BUTTON =
  'w-[52px] h-[48px] shrink-0 flex items-center justify-center rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-[1.4] whitespace-nowrap active:translate-y-px disabled:opacity-60';

interface GroupMember {
  userId: string;
  isOwner: boolean;
  user: { id: string; name: string | null; email: string | null };
}

interface Group {
  id: string;
  code: string;
  isOwner: boolean;
  ownerId: string;
  members: GroupMember[];
}

type Tab = 'mine' | 'received';

/** 목록 한 줄. 내 공유면 내보낼 사람, 받은 공유면 공유해 준 사람이다. */
type Row = { key: string; name: string; email: string; groupId: string; userId: string | null };

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 로컬 IP 및 일부 앱 WebView에서는 Clipboard API를 사용할 수 없어 아래 방식으로 재시도한다.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('공유 코드를 복사하지 못했습니다.');
}

interface Props {
  open: boolean;
  onBack: () => void;
}

/**
 * 기록 공유 — /settings/sharing 의 기능을 픽셀 디자인으로 다시 깐 화면.
 *
 * 그룹 개념은 감추고 "내가 공유한 사람 / 나에게 공유한 사람" 으로만 보여준다.
 * 내 공유의 X 는 그 사람을 내보내고, 받은 공유의 X 는 그 그룹에서 나온다.
 */
export default function SharingScreen({ open, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('mine');
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [copied, setCopied] = useState(false);
  const copyToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [stopTarget, setStopTarget] = useState<Row | null>(null);
  const [stopping, setStopping] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups', { cache: 'no-store' });
      setGroups(res.ok ? ((await res.json()) as Group[]) : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    if (open) void fetchGroups();
  }, [open, fetchGroups]);

  useEffect(
    () => () => {
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
    },
    [],
  );

  const myGroup = groups?.find((g) => g.isOwner) ?? null;
  const code = myGroup?.code ?? '';

  const mineRows: Row[] = (groups ?? [])
    .filter((g) => g.isOwner)
    .flatMap((g) =>
      g.members
        .filter((m) => m.userId !== g.ownerId)
        .map((m) => ({
          key: `${g.id}:${m.userId}`,
          name: m.user.name ?? '사용자',
          email: m.user.email ?? '',
          groupId: g.id,
          userId: m.userId,
        })),
    );

  const receivedRows: Row[] = (groups ?? [])
    .filter((g) => !g.isOwner)
    .map((g) => {
      const owner = g.members.find((m) => m.userId === g.ownerId);
      return {
        key: g.id,
        name: owner?.user.name ?? '사용자',
        email: owner?.user.email ?? '',
        groupId: g.id,
        userId: null,
      };
    });

  const rows = tab === 'mine' ? mineRows : receivedRows;

  const copyCode = async () => {
    if (!code) return;
    try {
      await copyToClipboard(code);
      setCopied(true);
      if (copyToastTimerRef.current) clearTimeout(copyToastTimerRef.current);
      copyToastTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 권한 없음 — 그냥 둔다 */
    }
  };

  const shareCode = async () => {
    if (!code) return;
    if (!navigator.share) {
      await copyCode();
      return;
    }
    try {
      await navigator.share({
        title: '아기랑 기록 공유',
        text: `아기랑에서 기록을 함께 볼 수 있어요.\n공유 코드: ${code}`,
      });
    } catch {
      /* 취소 */
    }
  };

  const join = async () => {
    if (joinCode.length < 6 || joining) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setJoinError(data.message || '공유 코드를 확인해주세요.');
        return;
      }
      setJoinCode('');
      // 볼 수 있는 아이가 늘었으니 전역 아이 목록도 새로 받는다
      await Promise.all([fetchGroups(), refreshChildrenCache()]);
    } catch {
      setJoinError('오류가 발생했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setJoining(false);
    }
  };

  const stopSharing = async () => {
    if (!stopTarget || stopping) return;
    setStopping(true);
    try {
      const url = stopTarget.userId
        ? `/api/groups/${stopTarget.groupId}/members/${stopTarget.userId}`
        : `/api/groups/${stopTarget.groupId}/me`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) return;
      setStopTarget(null);
      await Promise.all([fetchGroups(), refreshChildrenCache()]);
    } finally {
      setStopping(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 bg-[#F7F8F9] flex flex-col gap-[10px] px-[20px]"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 목록 끝이 가리지 않는다.
        paddingBottom:
          'calc(var(--bottom-nav-space) + 20px)',
      }}
    >
      <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={onBack} aria-label="뒤로" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <p className="text-[#121212] text-[16px] leading-none">기록 공유</p>
        {/* 디자인의 오른쪽 X 는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
        <span className="size-[24px]" />
      </div>

      <div className="shrink-0 flex gap-[10px]" role="tablist">
        {(['mine', 'received'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`${BOX} flex-1 min-w-0 h-[32px] px-[10px] flex items-center justify-center text-[#121212] text-[16px] leading-[1.4] text-center`}
            style={tab === t ? { background: SELECTED_BG } : undefined}
          >
            {t === 'mine' ? '내 공유' : '받은 공유'}
          </button>
        ))}
      </div>

      {tab === 'mine' ? (
        <div className="shrink-0 flex gap-[10px]">
          <div className={`${BOX} flex-1 min-w-0 h-[48px] flex items-center justify-center`}>
            <span className="text-[#121212] text-[16px] leading-none tracking-[2px] uppercase truncate">
              {code}
            </span>
          </div>
          <button type="button" onClick={copyCode} disabled={!code} className={SIDE_BUTTON}>
            복사
          </button>
          <button type="button" onClick={shareCode} disabled={!code} className={SIDE_BUTTON}>
            공유
          </button>
        </div>
      ) : (
        <div className="shrink-0 flex flex-col gap-[4px]">
          <div className="flex gap-[10px]">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase().slice(0, 6));
                setJoinError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              placeholder="공유 받은 코드를 입력하세요."
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              className={`${BOX} flex-1 min-w-0 h-[48px] px-[10px] text-center text-[#121212] text-[16px] leading-none tracking-[2px] uppercase placeholder:tracking-normal placeholder:normal-case placeholder:text-[#BBC0C5] focus:outline-none`}
            />
            <button
              type="button"
              onClick={join}
              disabled={joinCode.length < 6 || joining}
              className={SIDE_BUTTON}
            >
              추가
            </button>
          </div>
          {joinError && (
            <p className="text-center text-[12px] leading-[1.4] text-[#E86A6A]">{joinError}</p>
          )}
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div className={`${BOX} absolute inset-0 overflow-y-auto overscroll-contain flex flex-col`}>
          {groups === null ? null : rows.length === 0 ? (
            <p className="m-auto p-[10px] text-center text-[#808991] text-[14px] leading-[1.4]">
              {tab === 'mine' ? '공유한 기록이 없습니다.' : '공유 받은 기록이 없습니다.'}
            </p>
          ) : (
            <ul>
              {rows.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-[10px] p-[10px] border-b border-[#121212]"
                >
                  <div className="min-w-0 flex flex-col gap-[4px] leading-[1.4]">
                    <p className="text-[#121212] text-[16px] truncate">{r.name} 님</p>
                    {r.email && <p className="text-[#808991] text-[14px] truncate">{r.email}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStopTarget(r)}
                    aria-label={`${r.name} 님과 공유 중단`}
                    className="size-[24px] shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/close.svg" alt="" width={24} height={24} className="block" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {copied && (
          <div
            role="status"
            className={`${BOX} absolute top-[10px] left-1/2 z-10 h-[20px] -translate-x-1/2 px-[8px] flex items-center text-[#121212] text-[12px] leading-[1.4] whitespace-nowrap`}
          >
            복사되었어요.
          </div>
        )}
      </div>

      <ConfirmModal
        open={stopTarget !== null}
        showThumbnail={false}
        title="공유를 중단할까요?"
        description={
          stopTarget?.userId ? (
            <>
              새로 등록하는 육아 기록이 공유되지 않아요.
              <br />
              공유는 언제든 다시 연결할 수 있어요.
            </>
          ) : (
            <>
              이 아이의 기록을 더 이상 볼 수 없어요.
              <br />
              공유 코드로 언제든 다시 연결할 수 있어요.
            </>
          )
        }
        confirmLabel="중단하기"
        onCancel={() => setStopTarget(null)}
        onConfirm={stopSharing}
        busy={stopping}
      />
    </div>
  );
}
