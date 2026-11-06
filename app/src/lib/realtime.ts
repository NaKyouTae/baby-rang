'use client';

import { io, type Socket } from 'socket.io-client';
import { useEffect, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

/** 서버 GrowthRecordChange 와 같은 모양 — 소켓 이벤트 'growth-record' */
export interface GrowthRecordChange<R = unknown> {
  childId: string;
  action: 'created' | 'updated' | 'deleted';
  recordId: string;
  /** created·updated 의 저장된 기록. deleted 면 null. */
  record: R | null;
  /** 홈의 '마지막 수면·수유·기저귀' — 서버가 계산한 값을 그대로 쓴다 */
  summary: {
    lastFeedingAt: string | null;
    lastSleepAt: string | null;
    lastDiaperAt: string | null;
    canEndSleep: boolean;
    pendingSleepRecordId: string | null;
  };
  /** 홈에서 반응 애니메이션을 보여 줄 변경 — 새 기록, 또는 진행 중이던 수면의 종료 */
  react: boolean;
  actor: { userId: string; label: string };
}

type ChangeHandler = (change: GrowthRecordChange) => void;

/**
 * 같은 아이를 보는 기기끼리 기록 변경을 실시간으로 나눈다.
 * 소켓은 앱 전체에 하나만 열고, 화면들이 보고 싶은 아이를 등록하면 그 목록을 서버에 알린다.
 * 연결이 끊겼다 다시 붙으면 그 사이 놓친 변경이 있을 수 있어 onResync 로 다시 받게 한다.
 */
let socket: Socket | null = null;
const watchers = new Map<string, Set<ChangeHandler>>();
const resyncHandlers = new Set<() => void>();
let connectedOnce = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function sendWatch() {
  if (socket?.connected) socket.emit('watch', { childIds: [...watchers.keys()] });
}

function ensureSocket() {
  if (socket || typeof window === 'undefined') return;
  socket = io(API_URL, {
    // long-polling 은 요청마다 같은 서버 인스턴스로 가야 해서(sticky session) 여러 대에서 깨진다.
    // WebView·브라우저 모두 websocket 을 지원하므로 처음부터 websocket 으로만 붙는다.
    transports: ['websocket'],
    // 다시 연결할 때마다 새 티켓을 받는다(티켓은 2분 뒤 만료).
    auth: (cb) => {
      fetch('/api/realtime/ticket', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => cb({ ticket: data?.ticket }))
        .catch(() => cb({}));
    },
  });
  socket.on('connect', () => {
    sendWatch();
    if (connectedOnce) resyncHandlers.forEach((h) => h());
    connectedOnce = true;
  });
  socket.on('disconnect', (reason) => {
    // 서버가 끊은 경우(티켓을 못 받았거나 만료)는 socket.io 가 스스로 다시 붙지 않는다.
    if (reason !== 'io server disconnect' || retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (watchers.size > 0) socket?.connect();
    }, 10_000);
  });
  socket.on('growth-record', (change: GrowthRecordChange) => {
    watchers.get(change.childId)?.forEach((h) => h(change));
  });
}

/** 저장 요청에 실어 보낼 헤더 — 서버가 이 기기에는 같은 변경을 다시 보내지 않는다 */
export function realtimeHeaders(): Record<string, string> {
  return socket?.id ? { 'x-socket-id': socket.id } : {};
}

function watchChild(childId: string, handler: ChangeHandler) {
  ensureSocket();
  let set = watchers.get(childId);
  const isNew = !set;
  if (!set) watchers.set(childId, (set = new Set()));
  set.add(handler);
  if (isNew) sendWatch();
  return () => {
    set.delete(handler);
    if (set.size === 0 && watchers.get(childId) === set) {
      watchers.delete(childId);
      sendWatch();
    }
  };
}

/**
 * 그 아이의 기록이 다른 기기에서 바뀌면 handler 를 부른다(이 기기에서 저장한 것은 오지 않는다).
 * onResync — 연결이 끊겼다 다시 붙었을 때. 그동안 놓친 변경이 있을 수 있으니 다시 받는다.
 */
export function useGrowthRecordChanges(
  childId: string | undefined,
  handler: ChangeHandler,
  onResync?: () => void,
) {
  const handlerRef = useRef(handler);
  const resyncRef = useRef(onResync);
  useEffect(() => {
    handlerRef.current = handler;
    resyncRef.current = onResync;
  });

  useEffect(() => {
    if (!childId) return;
    const stop = watchChild(childId, (change) => handlerRef.current(change));
    const resync = () => resyncRef.current?.();
    resyncHandlers.add(resync);
    return () => {
      stop();
      resyncHandlers.delete(resync);
    };
  }, [childId]);
}
