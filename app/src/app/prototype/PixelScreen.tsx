'use client';

import { useEffect, useRef, useState } from 'react';
import { ROOM_W_TILES, SCALE, TILE, WALL_TILES } from './tiles';
import { getSprite, overlaps, preloadSprites, type Placement } from './placements';
import {
  BTN,
  buildRoom,
  buildUi,
  buildEditUi,
  hitRect,
  hitDecorate,
  buildButton,
  buildButtonShadow,
  hitButton,
  layout,
  type ActionId,
  type Layout,
} from './scene';
import {
  FRAME_FPS,
  GROUND,
  SPRITE,
  buildFrames,
  canRoam,
  type Facing,
  type PixelPose,
} from './pixelSprite';

interface Props {
  months: number;
  pose: PixelPose;
  childName: string;
  ageLabel: string;
  poseLabel: string;
  stats: { label: string; value: string }[];
  onAction: (id: ActionId) => void;
  onPet: () => void;
  onDecorate: () => void;
  /** 편집(꾸미기) 모드. 기록 버튼과 정보 카드를 치우고 닫기·저장만 남긴다. */
  editing: boolean;
  onCloseEdit: () => void;
  onSaveEdit: () => void;
  /** 편집 중 빈 바닥을 탭했을 때 — 아이템 목록을 연다. */
  onPickSpot: () => void;
  /** 편집 모드 분류 탭을 눌렀을 때. */
  onPickCategory: (category: string) => void;
  /** 방 전체 배경 그림. 없으면 코드로 그린 방을 쓴다. */
  roomImageUrl: string | null;
  placements: Placement[];
  onMovePlacement: (id: string, tileX: number, tileY: number) => void;
  onRemovePlacement: (id: string) => void;
}

/** 방 좌표계 기준 이동 속도(픽셀/초). 아기 걸음이라 느리다. */
const SPEED = 11;

const TEXT = '#4A3B2C';
const TEXT_DIM = '#8A775F';

/** 바닥에 깔리는 분류. 그리기 순서에서 항상 맨 아래로 간다. */
const FLAT_CATEGORIES = new Set(['RUG', 'FLOORING']);

/** 떠 있는 높이(px). sin 한 주기 동안 0 → LIFT → 0. */
const LIFT = 5;

export default function PixelScreen(props: Props) {
  const { months, pose, childName, onAction, onPet, onDecorate, editing, onCloseEdit, onSaveEdit, onPickSpot, onPickCategory, roomImageUrl, placements, onMovePlacement, onRemovePlacement } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [fontReady, setFontReady] = useState(false);

  // 드래그 중인 가구. 렌더 루프가 테두리를 그리려고 읽는다.
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ tx: 0, ty: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const placementsRef = useRef(placements);
  useEffect(() => {
    placementsRef.current = placements;
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  const roomImageRef = useRef(roomImageUrl);
  useEffect(() => {
    roomImageRef.current = roomImageUrl;
    preloadSprites([roomImageUrl]);
  }, [roomImageUrl]);

  // 렌더 루프 안에서 만들어지는 상태를 이벤트 핸들러가 집어가는 통로
  const layoutRef = useRef<Layout | null>(null);
  const pressRef = useRef<(id: ActionId, until: number) => void>(() => {});
  const heartRef = useRef<() => void>(() => {});

  // 최신 props 를 렌더 루프에 넘긴다. 루프를 다시 세우지 않으려고 ref 로 들고 있는다.
  const liveRef = useRef(props);
  useEffect(() => {
    liveRef.current = props;
  });

  // 픽셀 폰트가 로드되기 전에 그리면 글자가 기본 폰트로 한 번 깜빡인다
  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontReady(true);
    if (typeof document === 'undefined') return;
    document.fonts.load('11px Galmuri11').then(() => document.fonts.load('9px Galmuri9')).then(done, done);
    return () => {
      alive = false;
    };
  }, []);

  // 화면을 꽉 채우되 픽셀이 균일하도록, 네이티브 크기는 정수로 내림한다
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      setSize({ w: Math.floor(r.width / SCALE), h: Math.floor(r.height / SCALE) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size || !fontReady) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const safe = (name: string) => {
      const v = parseFloat(css.getPropertyValue(name));
      return Number.isFinite(v) ? Math.round(v / SCALE) : 0;
    };
    const L: Layout = layout(size.w, size.h, safe('--safe-area-top'), safe('--safe-area-bottom'));

    const roomLayer = buildRoom(L);
    // 두 벌을 미리 구워두고 모드에 따라 골라 쓴다. 매번 다시 구우면 끊긴다.
    const uiLayer = buildUi(L);
    const editUiLayer = buildEditUi(L);
    const buttons = new Map(L.buttons.map((b) => [b.id, buildButton(b.id, false)]));
    const pressedSprites = new Map(L.buttons.map((b) => [b.id, buildButton(b.id, true)]));
    const shadows = Array.from({ length: LIFT + 1 }, (_, i) => buildButtonShadow(i));
    const FACINGS: Facing[] = ['down', 'up', 'side'];
    const idle = new Map(FACINGS.map((f) => [f, buildFrames(months, pose, 'idle', f)]));
    const walk = new Map(FACINGS.map((f) => [f, buildFrames(months, pose, 'walk', f)]));
    const roams = canRoam(pose);

    let x = (L.walk.x0 + L.walk.x1) / 2;
    let y = (L.walk.y0 + L.walk.y1) / 2;
    let targetX = x;
    let targetY = y;
    // 톱다운이라 방향이 넷이다. side 스프라이트는 오른쪽 기준이고 왼쪽은 좌우 반전해서 쓴다.
    let facing: Facing = 'down';
    let flip = false;
    let walking = false;
    let restUntil = 0;
    let pressed: ActionId | null = null;
    let pressedUntil = 0;
    const hearts: { x: number; y: number; at: number }[] = [];

    layoutRef.current = L;
    pressRef.current = (id, until) => {
      pressed = id;
      pressedUntil = until;
    };
    heartRef.current = () => {
      hearts.push({ x, y, at: performance.now() });
      walking = false;
      restUntil = performance.now() + 1800;
    };

    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let prev = performance.now();

    const loop = (now: number) => {
      // 탭 전환 등으로 프레임이 크게 벌어져도 순간이동하지 않게 묶는다
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (roams) {
        if (!walking && now >= restUntil) {
          targetX = L.walk.x0 + Math.random() * (L.walk.x1 - L.walk.x0);
          targetY = L.walk.y0 + Math.random() * (L.walk.y1 - L.walk.y0);
          walking = true;
        } else if (walking) {
          const dx = targetX - x;
          const dy = targetY - y;
          const dist = Math.hypot(dx, dy);
          if (dist < 1.2) {
            walking = false;
            restUntil = now + 1400 + Math.random() * 3200;
          } else {
            x += (dx / dist) * SPEED * dt;
            y += (dy / dist) * SPEED * dt;
            // 더 많이 움직이는 축이 바라보는 방향이 된다
            if (Math.abs(dx) > Math.abs(dy)) {
              facing = 'side';
              flip = dx < 0;
            } else {
              facing = dy > 0 ? 'down' : 'up';
              flip = false;
            }
          }
        }
      }

      ctx.clearRect(0, 0, L.w, L.h);

      // 방 배경 — 고른 그림이 있으면 그걸 쓰고, 없으면 코드로 그린 방을 쓴다.
      const roomUrl = roomImageRef.current;
      const roomImg = roomUrl ? getSprite(roomUrl) : null;
      if (roomImg) {
        // 화면을 꽉 채우되 비율은 지킨다. 늘리면 픽셀이 찌그러진다.
        const scale = Math.max(L.w / roomImg.width, L.h / roomImg.height);
        const dw = Math.ceil(roomImg.width * scale);
        const dh = Math.ceil(roomImg.height * scale);
        ctx.drawImage(roomImg, Math.round((L.w - dw) / 2), Math.round((L.h - dh) / 2), dw, dh);
      } else {
        ctx.drawImage(roomLayer, 0, 0);
      }

      // 가구와 아이를 한 목록에 모아 y 로 정렬한다.
      // 이게 없으면 아이가 항상 가구 앞이나 뒤에만 있어서 평면 그림처럼 보인다.
      const layers: { depth: number; draw: () => void }[] = [];

      for (const p of placementsRef.current) {
        const px0 = L.offsetX + p.tileX * TILE;
        const py0 = (p.tileY - p.spriteLiftY) * TILE;
        const pw = p.tileW * TILE;
        const ph = (p.tileH + p.spriteLiftY) * TILE;
        const img = p.imageUrl ? getSprite(p.imageUrl) : null;
        const dragging = dragIdRef.current === p.id;
        layers.push({
          // 러그·바닥재는 밟고 지나가는 것이지 가려지는 게 아니다.
          // y 로 정렬하면 아이가 러그 뒤로 사라지므로 항상 맨 아래에 깐다.
          depth: FLAT_CATEGORIES.has(p.category) ? -1 : (p.tileY + p.tileH) * TILE,
          draw: () => {
            if (img) {
              ctx.drawImage(img, px0, py0, pw, ph);
            } else {
              // 그림이 아직 없거나 못 불러온 가구. 자리는 보여줘야 옮길 수 있다.
              ctx.fillStyle = 'rgba(122,90,54,.35)';
              ctx.fillRect(px0, py0, pw, ph);
            }
            if (dragging) {
              ctx.strokeStyle = '#FFFBEF';
              ctx.lineWidth = 1;
              ctx.strokeRect(px0 + 0.5, py0 + 0.5, pw - 1, ph - 1);
            }
          },
        });
      }

      // 아이 — 발 위치가 기준점이라 위로 GROUND 만큼 올려 붙인다
      const frames = (walking ? walk : idle).get(facing)!;
      const frame = frames[Math.floor((now / 1000) * FRAME_FPS) % frames.length];
      const left = Math.round(x - SPRITE / 2);
      const top = Math.round(y - GROUND);
      layers.push({
        depth: y,
        draw: () => {
          if (flip) {
            ctx.save();
            ctx.translate(left + SPRITE, top);
            ctx.scale(-1, 1);
            ctx.drawImage(frame, 0, 0);
            ctx.restore();
          } else {
            ctx.drawImage(frame, left, top);
          }
        },
      });

      layers.sort((a, b) => a.depth - b.depth);
      for (const l of layers) l.draw();

      // 하트 — 쓰다듬으면 머리 위로 떠오른다
      for (let i = hearts.length - 1; i >= 0; i--) {
        const age = (now - hearts[i].at) / 1000;
        if (age > 1.1) {
          hearts.splice(i, 1);
          continue;
        }
        const hy = Math.round(hearts[i].y - GROUND - 4 - age * 22);
        const hx = Math.round(hearts[i].x);
        ctx.globalAlpha = Math.max(0, 1 - age);
        ctx.fillStyle = '#FF7E96';
        ctx.fillRect(hx - 2, hy, 2, 2);
        ctx.fillRect(hx + 1, hy, 2, 2);
        ctx.fillRect(hx - 2, hy + 2, 5, 2);
        ctx.fillRect(hx - 1, hy + 4, 3, 1);
        ctx.globalAlpha = 1;
      }

      const isEditing = editingRef.current;
      ctx.drawImage(isEditing ? editUiLayer : uiLayer, 0, 0);

      if (pressed && now > pressedUntil) pressed = null;

      // 떠 있는 버튼 — 그림자는 바닥에 고정하고 버튼만 올라간다.
      // 편집 중에는 전부 치운다. 가구를 끌어야 하는데 버튼이 방해된다.
      for (const b of isEditing ? [] : L.buttons) {
        const t = (now / 1000 + b.phase) / b.period;
        const lift = Math.round(((Math.sin(t * Math.PI * 2) + 1) / 2) * LIFT);
        ctx.drawImage(shadows[lift], Math.round(b.x + BTN / 2 - 10), b.y + BTN + 2);
        const sprite = pressed === b.id ? pressedSprites.get(b.id)! : buttons.get(b.id)!;
        ctx.drawImage(sprite, b.x, b.y - lift);
      }

      /* ---------------- 글자 ---------------- */
      const live = liveRef.current;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isEditing) {
        ctx.font = '11px Galmuri11, monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('저장', L.save.x + L.save.w / 2, L.save.y + L.save.h / 2 + 1);
        ctx.font = '9px Galmuri9, monospace';
        ctx.fillStyle = TEXT;
        for (const t of L.catTabs) {
          ctx.fillText(t.label, t.x + t.w / 2, t.y + t.h / 2 + 1);
        }
        ctx.fillStyle = TEXT_DIM;
        ctx.fillText('가구를 끌어 옮기고, 오른쪽에서 골라 놓으세요', L.w / 2, L.save.y - 10);
        raf = requestAnimationFrame(loop);
        return;
      }

      const cardTextX = L.card.x + 29 + (L.card.w - 33) / 2;
      ctx.font = '11px Galmuri11, monospace';
      ctx.fillStyle = TEXT;
      ctx.fillText(live.childName, cardTextX, L.card.y + 11);
      ctx.font = '9px Galmuri9, monospace';
      ctx.fillStyle = TEXT_DIM;
      ctx.fillText(live.ageLabel, cardTextX, L.card.y + 22);

      live.stats.forEach((s, i) => {
        const chip = L.chips[i];
        if (!chip) return;
        ctx.font = '9px Galmuri9, monospace';
        ctx.fillStyle = TEXT_DIM;
        ctx.fillText(s.label, chip.x + chip.w / 2, chip.y + 7);
        ctx.font = '11px Galmuri11, monospace';
        ctx.fillStyle = TEXT;
        ctx.fillText(s.value, chip.x + chip.w / 2, chip.y + 18);
      });

      ctx.font = '9px Galmuri9, monospace';
      for (const b of L.buttons) {
        // 라벨은 버튼과 같이 뜨지 않는다. 바닥에 붙어 있어야 버튼이 떠오른 게 보인다.
        // 가장자리 버튼은 라벨이 화면 밖으로 나가므로 안쪽으로 당긴다.
        const half = ctx.measureText(b.label).width / 2;
        const cx = Math.min(Math.max(b.x + BTN / 2, half + 2), L.w - half - 2);
        const ly = b.y + BTN + 12;
        ctx.fillStyle = '#FFFDF8';
        ctx.fillText(b.label, cx, ly + 1);
        ctx.fillStyle = TEXT;
        ctx.fillText(b.label, cx, ly);
      }

      ctx.font = '9px Galmuri9, monospace';
      ctx.fillStyle = TEXT_DIM;
      ctx.fillText(live.poseLabel, L.footer.x + L.footer.w / 2, L.footer.y + 9);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, fontReady, months, pose]);


  /** 화면 좌표 → 캔버스(네이티브) 좌표. */
  const toNative = (e: React.PointerEvent<HTMLCanvasElement>, L: Layout) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      nx: ((e.clientX - r.left) / r.width) * L.w,
      ny: ((e.clientY - r.top) / r.height) * L.h,
    };
  };

  /** 그 지점에 놓인 가구. 나중에 놓은 것이 위에 있으므로 뒤에서부터 찾는다. */
  const pickPlacement = (L: Layout, nx: number, ny: number) => {
    const list = placementsRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const x0 = L.offsetX + p.tileX * TILE;
      const y0 = (p.tileY - p.spriteLiftY) * TILE;
      const w = p.tileW * TILE;
      const h = (p.tileH + p.spriteLiftY) * TILE;
      if (nx >= x0 && nx <= x0 + w && ny >= y0 && ny <= y0 + h) return p;
    }
    return null;
  };

  const clearLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    if (!L) return;
    const { nx, ny } = toNative(e, L);

    if (editing) {
      if (hitRect(L.close, nx, ny)) {
        onCloseEdit();
        return;
      }
      if (hitRect(L.save, nx, ny)) {
        onSaveEdit();
        return;
      }
      const tab = L.catTabs.find((t) => hitRect(t, nx, ny));
      if (tab) {
        onPickCategory(tab.id);
        return;
      }
    } else {
      if (hitDecorate(L, nx, ny)) {
        onDecorate();
        return;
      }
      const hit = hitButton(L, nx, ny);
      if (hit) {
        pressRef.current(hit.id, performance.now() + 120);
        onAction(hit.id);
        return;
      }
    }

    // 놓인 가구를 집으면 드래그가 시작된다. 편집 모드에서만 집힌다 —
    // 홈에서 끌리면 아이를 쓰다듬으려다 방이 바뀐다.
    const target = editing ? pickPlacement(L, nx, ny) : null;
    if (target) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIdRef.current = target.id;
      movedRef.current = false;
      // 집은 지점과 가구 왼쪽 위의 차이를 기억해야 가구가 손가락으로 순간이동하지 않는다
      dragOffsetRef.current = {
        tx: (nx - (L.offsetX + target.tileX * TILE)) / TILE,
        ty: (ny - target.tileY * TILE) / TILE,
      };
      // 제자리에서 길게 누르면 치운다
      clearLongPress();
      longPressRef.current = setTimeout(() => {
        if (movedRef.current) return;
        dragIdRef.current = null;
        if (confirm(`'${target.name}' 을 치울까요?`)) onRemovePlacement(target.id);
      }, 600);
      return;
    }

    // 편집 중 빈 곳을 누르면 아이템 목록을 연다. 평소에는 아이를 쓰다듬는다.
    if (editing) {
      onPickSpot();
      return;
    }
    heartRef.current();
    onPet();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    const id = dragIdRef.current;
    if (!L || !id) return;
    const { nx, ny } = toNative(e, L);
    const target = placementsRef.current.find((p) => p.id === id);
    if (!target) return;

    // 타일 격자에 붙인다. 자유 배치로 두면 가구가 미세하게 어긋나 지저분해진다.
    const tx = Math.round((nx - L.offsetX) / TILE - dragOffsetRef.current.tx);
    const ty = Math.round(ny / TILE - dragOffsetRef.current.ty);
    const clampedX = Math.min(Math.max(tx, 0), ROOM_W_TILES - target.tileW);
    const clampedY = Math.min(Math.max(ty, WALL_TILES), Math.floor(L.h / TILE) - target.tileH);
    if (clampedX === target.tileX && clampedY === target.tileY) return;
    movedRef.current = true;
    clearLongPress();
    // 겹치는 자리로는 못 간다. 끌다가 멈추는 느낌이라 어디가 막혔는지 바로 안다.
    if (overlaps(placementsRef.current, target, clampedX, clampedY)) return;
    onMovePlacement(id, clampedX, clampedY);
  };

  const handlePointerUp = () => {
    clearLongPress();
    dragIdRef.current = null;
  };

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다 */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      {size && (
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={`${childName}의 방`}
          className="w-full h-full"
          // 이게 없으면 브라우저가 보간해서 픽셀 아트가 뭉개진다
          style={{ imageRendering: 'pixelated', touchAction: 'manipulation' }}
        />
      )}
    </div>
  );
}
