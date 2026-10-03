'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BTN,
  SCALE,
  buildBackground,
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
}

/** 방 좌표계 기준 이동 속도(픽셀/초). 아기 걸음이라 느리다. */
const SPEED = 11;

const TEXT = '#4A3B2C';
const TEXT_DIM = '#8A775F';

/** 떠 있는 높이(px). sin 한 주기 동안 0 → LIFT → 0. */
const LIFT = 5;

export default function PixelScreen(props: Props) {
  const { months, pose, childName, onAction, onPet } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [fontReady, setFontReady] = useState(false);

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

    const bg = buildBackground(L);
    const buttons = new Map(L.buttons.map((b) => [b.id, buildButton(b.id, false)]));
    const pressedSprites = new Map(L.buttons.map((b) => [b.id, buildButton(b.id, true)]));
    const shadows = Array.from({ length: LIFT + 1 }, (_, i) => buildButtonShadow(i));
    const idle = buildFrames(months, pose, 'idle');
    const walk = buildFrames(months, pose, 'walk');
    const roams = canRoam(pose);

    let x = (L.walk.x0 + L.walk.x1) / 2;
    let y = (L.walk.y0 + L.walk.y1) / 2;
    let targetX = x;
    let targetY = y;
    let facing: 1 | -1 = 1;
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
            if (Math.abs(dx) > 0.4) facing = dx > 0 ? 1 : -1;
          }
        }
      }

      ctx.clearRect(0, 0, L.w, L.h);
      ctx.drawImage(bg, 0, 0);

      // 아이 — 발 위치가 기준점이라 위로 GROUND 만큼 올려 붙인다
      const frames = walking ? walk : idle;
      const frame = frames[Math.floor((now / 1000) * FRAME_FPS) % frames.length];
      const left = Math.round(x - SPRITE / 2);
      const top = Math.round(y - GROUND);
      if (facing === -1) {
        ctx.save();
        ctx.translate(left + SPRITE, top);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(frame, left, top);
      }

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

      if (pressed && now > pressedUntil) pressed = null;

      // 떠 있는 버튼 — 그림자는 바닥에 고정하고 버튼만 올라간다
      for (const b of L.buttons) {
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

      const cardTextX = L.card.x + 30 + (L.card.w - 34) / 2;
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


  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const L = layoutRef.current;
    const canvas = canvasRef.current;
    if (!L || !canvas) return;
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * L.w;
    const ny = ((e.clientY - r.top) / r.height) * L.h;
    const hit = hitButton(L, nx, ny);
    if (hit) {
      pressRef.current(hit.id, performance.now() + 120);
      onAction(hit.id);
      return;
    }
    heartRef.current();
    onPet();
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
          onPointerDown={handlePointer}
          aria-label={`${childName}의 방`}
          className="w-full h-full"
          // 이게 없으면 브라우저가 보간해서 픽셀 아트가 뭉개진다
          style={{ imageRendering: 'pixelated', touchAction: 'manipulation' }}
        />
      )}
    </div>
  );
}
