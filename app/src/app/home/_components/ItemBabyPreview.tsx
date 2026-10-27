'use client';

import { useEffect, useRef } from 'react';
import { BEHAVIORS, buildFrames, CX, G, type BehaviorId, type Gender } from './babySprite';

/** 배지에 보여 줄 아기 그림 범위(방 픽셀). 아기 그림 칸(48×44)에서 몸이 있는 가운데 아래쪽만 잘라 1:1 로 찍는다. */
const CROP = { w: 28, h: 28 };

const cache = new Map<string, HTMLCanvasElement[]>();

/** (행동, 개월수, 성별) 한 벌의 프레임. 같은 조합은 한 번만 굽는다(아이템 칸마다 같은 아기가 반복된다). */
function framesFor(id: BehaviorId, months: number, gender: Gender) {
  const key = `${id}:${months}:${gender}`;
  let list = cache.get(key);
  if (!list) {
    const b = BEHAVIORS.find((x) => x.id === id)!;
    const facing = b.facings.includes('side') ? 'side' : b.facings[0];
    list = buildFrames(id, months, gender, facing, { noProps: true }).map((f) => {
      const c = document.createElement('canvas');
      c.width = f.w;
      c.height = f.h;
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.w, f.h), 0, 0);
      return c;
    });
    cache.set(key, list);
  }
  return list;
}

/**
 * 꾸미기 시트 아이템 칸 모서리의 작은 아기 — 이 아이템을 놓으면 아기가 하는 행동을 우리 아이 개월수·성별로 보여 준다.
 * 아직 그 행동을 할 개월이 아니면 첫 장면에 멈춰 흐리게 둔다.
 */
export default function ItemBabyPreview({
  behavior,
  months,
  gender,
  ready,
}: {
  behavior: BehaviorId;
  months: number;
  gender: Gender;
  ready: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const frames = framesFor(behavior, months, gender);
    const b = BEHAVIORS.find((x) => x.id === behavior)!;
    let i = 0;
    // 몸이 그림 칸 가운데 아래(발밑 G)에 있어 그 둘레만 자른다. 누워 자는 그림은 위쪽까지 차 있어 조금 위로 올린다.
    const sx = CX - CROP.w / 2;
    const sy = behavior === 'sleep' ? G - 34 : G - CROP.h + 2;
    const draw = () => {
      ctx.clearRect(0, 0, CROP.w, CROP.h);
      ctx.drawImage(frames[i % frames.length], sx, sy, CROP.w, CROP.h, 0, 0, CROP.w, CROP.h);
    };
    draw();
    if (!ready) return;
    const t = setInterval(() => {
      i++;
      draw();
    }, 1000 / b.fps);
    return () => clearInterval(t);
  }, [behavior, months, gender, ready]);

  return (
    <canvas
      ref={ref}
      width={CROP.w}
      height={CROP.h}
      aria-hidden
      className="block"
      style={{ width: CROP.w, height: CROP.h, imageRendering: 'pixelated', opacity: ready ? 1 : 0.45 }}
    />
  );
}
