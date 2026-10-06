'use client';

import { useEffect, useRef, useState } from 'react';
import { TILE, scaleFor, tilesAcross } from './tiles';
import { getSprite, preloadSprites, type Placement } from './placements';
import { buildRoom, layout, type Layout } from './scene';
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
  /** 자리가 고정된 슬롯. 좌표가 없어 배치가 아니라 방의 속성이다. */
  wallpaperUrl: string | null;
  flooringUrl: string | null;
  placements: Placement[];
  /** 꾸미기 모드에서만 가구를 집을 수 있다. */
  editing: boolean;
  onMovePlacement: (id: string, tileX: number, tileY: number) => void;
  onLongPressPlacement: (placement: Placement) => void;
  onPet: () => void;
}

/** 방 좌표계 기준 이동 속도(픽셀/초). 아기 걸음이라 느리다. */
const SPEED = 11;

/**
 * 아이 방 캔버스.
 *
 * UI(카드·버튼·탭바)는 전부 DOM 으로 올라간다. 캔버스는 방·가구·아이만 그린다.
 * 둘을 한 캔버스에 그리면 한글 글자를 픽셀로 찍어야 하고, 접근성도 잃는다.
 */
export default function PixelScreen(props: Props) {
  const {
    months,
    pose,
    childName,
    wallpaperUrl,
    flooringUrl,
    placements,
    editing,
    onMovePlacement,
    onLongPressPlacement,
    onPet,
  } = props;

  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // 드래그 중인 가구. 렌더 루프가 테두리를 그리려고 읽는다.
  const dragIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ tx: 0, ty: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(false);

  const layoutRef = useRef<Layout | null>(null);
  const petRef = useRef<() => void>(() => {});

  // 배치와 슬롯을 ref 로 들고 있는다. deps 에 넣으면 가구를 놓을 때마다
  // 렌더 루프가 다시 서면서 아이 위치가 초기화된다.
  const placementsRef = useRef(placements);
  useEffect(() => {
    placementsRef.current = placements;
    preloadSprites(placements.map((p) => p.imageUrl));
  }, [placements]);

  const slotsRef = useRef({ wallpaperUrl, flooringUrl });
  useEffect(() => {
    slotsRef.current = { wallpaperUrl, flooringUrl };
    preloadSprites([wallpaperUrl, flooringUrl]);
  }, [wallpaperUrl, flooringUrl]);

  // 화면을 꽉 채우되 픽셀이 균일하도록, 배율을 폭에서 계산하고 크기는 내림한다
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      const scale = scaleFor(r.width);
      setSize({ w: Math.floor(r.width / scale), h: Math.floor(r.height / scale) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!size) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const scale = scaleFor(canvas.getBoundingClientRect().width || size.w);
    const safeBottom = (() => {
      const v = parseFloat(css.getPropertyValue('--safe-area-bottom'));
      return Number.isFinite(v) ? Math.round(v / scale) : 0;
    })();

    const L: Layout = layout(size.w, size.h, safeBottom);
    layoutRef.current = L;

    const roomLayer = buildRoom(L);
    const FACINGS: Facing[] = ['down', 'up', 'side'];
    const idle = new Map(FACINGS.map((f) => [f, buildFrames(months, pose, 'idle', f)]));
    const walk = new Map(FACINGS.map((f) => [f, buildFrames(months, pose, 'walk', f)]));
    const roams = canRoam(pose);

    let x = (L.walk.x0 + L.walk.x1) / 2;
    let y = (L.walk.y0 + L.walk.y1) / 2;
    let targetX = x;
    let targetY = y;
    // 톱다운이라 방향이 넷이다. side 스프라이트는 오른쪽 기준이고 왼쪽은 반전해서 쓴다.
    let facing: Facing = 'down';
    let flip = false;
    let walking = false;
    let restUntil = 0;
    const hearts: { x: number; y: number; at: number }[] = [];

    petRef.current = () => {
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

      // 기본 방 — 회색 벽과 바닥. 벽지·바닥재를 고르면 그 위에 덮인다.
      const slots = slotsRef.current;
      ctx.drawImage(roomLayer, 0, 0);

      // 벽지·바닥재 — 자리가 고정돼 있어 벽/바닥 전체를 타일로 채운다
      const tileFill = (url: string | null, y0: number, y1: number) => {
        const img = url ? getSprite(url) : null;
        if (!img) return;
        for (let ty = y0; ty < y1; ty += TILE) {
          for (let tx = 0; tx < L.w; tx += TILE) ctx.drawImage(img, tx, ty, TILE, TILE);
        }
      };
      // 디자인 비율 — 벽지 4 : 바닥 6 (338px : 506px)
      const wallBottom = Math.round(L.h * 0.4);
      tileFill(slots.wallpaperUrl, 0, wallBottom);
      tileFill(slots.flooringUrl, wallBottom, L.h);

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
          // 러그는 밟고 지나가는 것이라 항상 맨 아래에 깐다
          depth: p.category === 'RUG' ? -1 : (p.tileY + p.tileH) * TILE,
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

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, months, pose]);

  /* ---------------- 입력 ---------------- */

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

    // 가구를 집는 건 꾸미기 모드에서만. 홈에서 끌리면 실수로 방이 바뀐다.
    const target = editing ? pickPlacement(L, nx, ny) : null;
    if (target) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragIdRef.current = target.id;
      movedRef.current = false;
      // 집은 지점과 가구 왼쪽 위의 차이를 기억해야 손가락으로 순간이동하지 않는다
      dragOffsetRef.current = {
        tx: (nx - (L.offsetX + target.tileX * TILE)) / TILE,
        ty: (ny - target.tileY * TILE) / TILE,
      };
      clearLongPress();
      longPressRef.current = setTimeout(() => {
        if (movedRef.current) return;
        dragIdRef.current = null;
        onLongPressPlacement(target);
      }, 600);
      return;
    }

    if (editing) return;
    petRef.current();
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
    const clampedX = Math.min(Math.max(tx, 0), tilesAcross(L.w) - target.tileW);
    const clampedY = Math.min(Math.max(ty, 0), Math.floor(L.h / TILE) - target.tileH);
    if (clampedX === target.tileX && clampedY === target.tileY) return;
    movedRef.current = true;
    clearLongPress();
    // 겹침은 막지 않는다. 포개 놓을지는 꾸미는 사람이 정한다.
    onMovePlacement(id, clampedX, clampedY);
  };

  const handlePointerUp = () => {
    clearLongPress();
    dragIdRef.current = null;
  };

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
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
