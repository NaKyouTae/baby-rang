'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '@/components/BottomSheet';
import { calcChildAge } from '@/lib/childAge';
import { useSelectedChild } from '@/hooks/useChildren';
import PixelScreen from './PixelScreen';
import DecorateSheet, { type RoomItem } from './DecorateSheet';
import { preloadSprites, type Placement } from './placements';
import { ROOM_W_TILES, WALL_TILES } from './tiles';
import { POSE_LABEL, poseForMonths } from './pixelSprite';
import type { ActionId } from './scene';

/** 로그인/아이 등록 전에도 화면을 볼 수 있게 두는 미리보기용 아이. */
const DEMO = { name: '아기', birthDate: demoBirthDate(14) };

function demoBirthDate(monthsAgo: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

/** 배치를 임시로 담아두는 브라우저 저장소 키. 서버 저장이 생기면 사라진다. */
const STORAGE_KEY = 'babyrang.prototype.placements';
/** 방 타입은 좌표가 없는 배경이라 배치와 따로 저장한다. 한 방에 하나뿐이다. */
const ROOM_KEY = 'babyrang.prototype.room';

/**
 * 저장해 둔 배치를 읽는다.
 * 첫 렌더에서 바로 쓰려고 effect 가 아니라 useState 초기값으로 넣는다 —
 * effect 에서 setState 하면 빈 방이 한 번 그려졌다가 덮인다.
 */
function loadSavedRoom(): { id: string; imageUrl: string | null } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ROOM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadSavedPlacements(): Placement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Placement[]) : [];
  } catch {
    // 저장값이 깨졌으면 빈 방으로 시작한다
    return [];
  }
}

const ACTION_LABEL: Record<ActionId, string> = {
  feeding: '수유',
  sleep: '수면',
  diaper: '기저귀',
  growth: '키·몸무게',
  wonder: '원더윅스',
  test: '기질검사',
};

export default function PrototypeClient() {
  const { selectedChild } = useSelectedChild();
  const [openAction, setOpenAction] = useState<ActionId | null>(null);
  const [decorating, setDecorating] = useState(false);
  const [sheetCategory, setSheetCategory] = useState('ROOM');
  const [editing, setEditing] = useState(false);
  // 편집에 들어갈 때의 방 상태. X 로 나가면 여기로 되돌린다.
  const snapshotRef = useRef<{
    placements: Placement[];
    roomItem: { id: string; imageUrl: string | null } | null;
  } | null>(null);
  const [placements, setPlacements] = useState<Placement[]>(loadSavedPlacements);
  const [roomItem, setRoomItem] = useState<{ id: string; imageUrl: string | null } | null>(
    loadSavedRoom,
  );
  // 서버의 방 버전. 공동 양육자가 먼저 바꿨으면 저장이 거절된다.
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const roomImageUrl = roomItem?.imageUrl ?? null;

  const child = selectedChild ?? DEMO;
  const isDemo = !selectedChild;
  const age = useMemo(() => calcChildAge(child.birthDate), [child.birthDate]);
  const pose = poseForMonths(age.months);

  // 기록 API 에 아직 안 물렸다. 실제 아이가 선택되면 숫자를 지어내지 않고 비워 둔다.
  const stats = useMemo(
    () => [
      { label: '수유', value: isDemo ? '5회' : '-' },
      { label: '잠', value: isDemo ? '11시간' : '-' },
      { label: '기저귀', value: isDemo ? '7회' : '-' },
    ],
    [isDemo],
  );

  // 배치 저장 API 가 아직 없다. 새로고침에 날아가지 않도록 임시로 브라우저에 둔다.
  // Room/RoomPlacement 테이블이 생기면 이 자리를 서버 호출로 바꾼다.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(placements));
    } catch {
      /* 용량 초과 등은 무시한다 — 다음 저장에서 다시 시도된다 */
    }
  }, [placements]);

  useEffect(() => {
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  // 카탈로그를 한 번 받아 배치 정보를 최신으로 맞춘다.
  // 예전 형식으로 저장된 배치에는 분류가 없어서, 러그인 줄 모르고 아이를 가렸다.
  // 아이템의 이름·칸 수·그림은 카탈로그가 원본이므로 여기서 다시 채운다.
  useEffect(() => {
    fetch('/api/room-items')
      .then((r) => r.json())
      .then((d) => {
        const byId = new Map<string, RoomItem>(
          ((d.items ?? []) as RoomItem[]).map((i) => [i.id, i]),
        );
        setPlacements((prev) =>
          prev.map((p) => {
            const item = byId.get(p.itemId);
            if (!item) return p;
            return {
              ...p,
              name: item.name,
              spriteKey: item.spriteKey,
              imageUrl: item.imageUrl,
              category: item.category,
              tileW: item.tileW,
              tileH: item.tileH,
              spriteLiftY: item.spriteLiftY,
            };
          }),
        );
      })
      .catch(() => {
        /* 카탈로그를 못 받아도 저장된 배치는 그대로 쓴다 */
      });
  }, []);

  // 서버에 저장된 방을 불러온다. 데모(비로그인)는 브라우저 저장만 쓴다.
  const childId = selectedChild?.id;
  useEffect(() => {
    if (!childId) return;
    let alive = true;
    fetch(`/api/rooms/${childId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        type ServerPlacement = {
          id: string;
          itemId: string;
          tileX: number;
          tileY: number;
          item: RoomItem;
        };
        const loaded: Placement[] = (data.placements ?? []).map((p: ServerPlacement) => ({
          id: p.id,
          itemId: p.itemId,
          name: p.item.name,
          spriteKey: p.item.spriteKey,
          imageUrl: p.item.imageUrl,
          category: p.item.category,
          tileX: p.tileX,
          tileY: p.tileY,
          tileW: p.item.tileW,
          tileH: p.item.tileH,
          spriteLiftY: p.item.spriteLiftY,
        }));
        setPlacements(loaded);
        setRoomItem(
          data.room?.roomItem
            ? { id: data.room.roomItem.id, imageUrl: data.room.roomItem.imageUrl }
            : null,
        );
        setVersion(data.version ?? 0);
        preloadSprites([...loaded.map((p) => p.imageUrl), data.room?.roomItem?.imageUrl ?? null]);
      })
      .catch(() => {
        /* 불러오기 실패는 빈 방으로 둔다 — 저장은 여전히 가능하다 */
      });
    return () => {
      alive = false;
    };
  }, [childId]);

  useEffect(() => {
    try {
      if (roomItem) localStorage.setItem(ROOM_KEY, JSON.stringify(roomItem));
      else localStorage.removeItem(ROOM_KEY);
    } catch {
      /* 용량 초과 등은 무시한다 */
    }
  }, [roomItem]);

  const handleAction = useCallback((id: ActionId) => setOpenAction(id), []);
  const handlePet = useCallback(() => {}, []);
  // 꾸미기 버튼 — 바로 적용하지 않고 편집 모드로 들어간다.
  const handleDecorate = useCallback(() => {
    snapshotRef.current = { placements, roomItem };
    setEditing(true);
    setDecorating(true);
  }, [placements, roomItem]);

  // X — 편집 중 바꾼 것을 전부 되돌린다
  const handleCloseEdit = useCallback(() => {
    const snap = snapshotRef.current;
    if (snap) {
      setPlacements(snap.placements);
      setRoomItem(snap.roomItem);
    }
    snapshotRef.current = null;
    setDecorating(false);
    setEditing(false);
  }, []);

  // 저장 — 방 전체를 한 번에 덮어쓴다. 가구 하나씩 보내면 겹침 검사를 매번 전체로
  // 다시 해야 하고, 공동 양육자가 동시에 편집할 때 깨진다.
  const handleSaveEdit = useCallback(async () => {
    // 저장 버튼을 연달아 눌러 같은 내용을 두 번 보내는 걸 막는다
    if (saving) return;
    if (!childId) {
      // 데모(비로그인)는 브라우저 저장만 쓴다
      snapshotRef.current = null;
      setDecorating(false);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${childId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version,
          roomItemId: roomItem?.id ?? null,
          placements: placements.map((p) => ({
            itemId: p.itemId,
            tileX: p.tileX,
            tileY: p.tileY,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message || '저장에 실패했습니다.');
        return;
      }
      setVersion(data.version ?? version + 1);
      snapshotRef.current = null;
      setDecorating(false);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [saving, childId, version, roomItem, placements]);

  const handlePickSpot = useCallback(() => setDecorating(true), []);

  const handlePickCategory = useCallback((category: string) => {
    setSheetCategory(category);
    setDecorating(true);
  }, []);

  // 고른 가구를 방 가운데에 놓는다. 그다음 끌어서 옮기면 된다.
  const handlePick = useCallback((item: RoomItem) => {
    setDecorating(false);
    preloadSprites([item.imageUrl]);

    // 방 타입은 배경이라 '놓는' 게 아니라 '바꾸는' 것이다. 항상 하나만 적용된다.
    if (item.category === 'ROOM') {
      setRoomItem({ id: item.id, imageUrl: item.imageUrl });
      return;
    }

    setPlacements((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemId: item.id,
        name: item.name,
        spriteKey: item.spriteKey,
        imageUrl: item.imageUrl,
        category: item.category,
        tileX: Math.max(0, Math.round((ROOM_W_TILES - item.tileW) / 2)),
        tileY: WALL_TILES + 4,
        tileW: item.tileW,
        tileH: item.tileH,
        spriteLiftY: item.spriteLiftY,
      },
    ]);
  }, []);

  const handleMovePlacement = useCallback((id: string, tileX: number, tileY: number) => {
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, tileX, tileY } : p)));
  }, []);

  const handleRemovePlacement = useCallback((id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <div className="relative h-full overflow-hidden select-none bg-[#C6DAF0]">
      <PixelScreen
        months={age.months}
        pose={pose}
        childName={isDemo ? `${child.name} (데모)` : child.name}
        ageLabel={`D+${age.days} · ${age.months}개월 ${age.extraDays}일`}
        poseLabel={`${age.months}개월 · ${POSE_LABEL[pose]}`}
        stats={stats}
        onAction={handleAction}
        onPet={handlePet}
        onDecorate={handleDecorate}
        editing={editing}
        onCloseEdit={handleCloseEdit}
        onSaveEdit={handleSaveEdit}
        onPickSpot={handlePickSpot}
        onPickCategory={handlePickCategory}
        roomImageUrl={roomImageUrl}
        placements={placements}
        onMovePlacement={handleMovePlacement}
        onRemovePlacement={handleRemovePlacement}
      />

      <DecorateSheet
        open={decorating}
        onClose={() => setDecorating(false)}
        onPick={handlePick}
        category={sheetCategory}
        onChangeCategory={setSheetCategory}
      />

      <BottomSheet
        open={openAction !== null}
        onClose={() => setOpenAction(null)}
        variant="sheet"
        ariaLabel={openAction ? ACTION_LABEL[openAction] : undefined}
        surfaceClassName="bg-[#FFFDF8] border-t-2 border-[#6F5B45]"
      >
        <div
          className="px-5 pt-3 pb-[max(var(--safe-area-bottom),20px)]"
          style={{ fontFamily: 'Galmuri11, monospace' }}
        >
          <div className="w-10 h-1 bg-[#6F5B45] mx-auto mb-4" />
          <h2 className="text-[17px] text-[#4A3B2C]">{openAction && ACTION_LABEL[openAction]}</h2>
          <p className="text-[12px] text-[#8A775F] mt-2 leading-relaxed">
            여기에 {openAction && ACTION_LABEL[openAction]} 입력 폼이 들어간다.
            모든 입력은 이 바텀시트 하나로 통일한다.
          </p>
          <div className="mt-5 h-32 border-2 border-dashed border-[#C2A67C] flex items-center justify-center text-[11px] text-[#A8926F]">
            입력 폼 자리
          </div>
          <button
            type="button"
            onClick={() => setOpenAction(null)}
            className="mt-5 w-full h-11 text-[14px] text-[#FFFDF8] bg-[#6F5B45] border-2 border-[#4A3B2C] active:translate-y-px"
          >
            닫기
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
