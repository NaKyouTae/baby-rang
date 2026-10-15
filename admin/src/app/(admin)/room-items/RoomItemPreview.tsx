"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  actorDepth,
  actorSprite,
  createActor,
  createProp,
  propDepth,
  propSprite,
  updateActor,
  updateWorld,
  type Prop,
  type World,
} from "../modeling/babyActor";
import { BEHAVIORS, type Affordance, type Behavior } from "../modeling/babySprite";

/**
 * 아이템을 앱 방에 놓았을 때의 미리보기.
 *
 * 앱 홈(PixelScreen)과 같은 규칙으로 그린다 — 16px 타일, 벽 4 : 바닥 6,
 * 새로 놓을 때 처음 나타나는 자리, 바닥 칸 아래 끝 기준의 앞뒤 순서,
 * 아기가 쓰는 자리(바닥 칸)와 공·보행기 처리. 아기 행동은 앱과 같은 엔진(babyActor)을 돌린다.
 * 앱 규칙이 바뀌면 여기도 같이 맞춰야 한다.
 */

const TILE = 16;
const WALL_TILES = 8;
// 앱 방의 논리 크기. 390×844 화면을 2배로 그릴 때와 같다.
const W = 12 * TILE;
const H = 26 * TILE;
const WALL_BOTTOM = Math.round(H * 0.4);
// 앱이 아기가 다니는 범위로 쓰는 값(scene.ts layout). 하단 안전 영역은 아이폰 기준 34.
const WALK = { x0: 1.5 * TILE, x1: W - 1.5 * TILE, y0: (WALL_TILES + 5) * TILE, y1: H - 34 - 46 };
// 모달 높이 안에 스크롤 없이 들어가는 표시 배율
const DISPLAY = 1.1;
const COLOR = { wall: "#EEF0F1", floor: "#DFE0E1" };

/** DB 쓰임새 → 엔진 쓰임새. 앱 PixelScreen 의 AFFORDANCE_OF 와 같다. */
const AFFORDANCE_OF: Record<string, Affordance> = {
  HOLD: "hold",
  SOFT_FLOOR: "soft",
  BALL: "ball",
  PUSH_WALKER: "walker",
  PLAY: "play",
  SLEEP: "bed",
};
/** 쓰임새를 비워 뒀을 때 앱이 분류로 짐작하는 값. 앱 PixelScreen 의 CATEGORY_AFFORDANCE 와 같다. */
const CATEGORY_AFFORDANCE: Partial<Record<string, Affordance[]>> = {
  FURNITURE: ["hold"],
  BED: ["hold", "bed"],
  RUG: ["soft"],
  TOY: ["play"],
};

/** 그 쓰임새로 나오는 행동 — 꼭 있어야 하는 행동(needs)과 그 위에서 하는 행동(boost) */
function behaviorsFor(aff: Affordance[]): Behavior[] {
  return BEHAVIORS.filter((b) => (b.needs && aff.includes(b.needs)) || (b.boost && aff.includes(b.boost)));
}

type Props = {
  category: string;
  surface: string;
  tileW: number;
  tileH: number;
  imageUrl: string;
  /** 어드민에서 고른 쓰임새(DB 값). 비우면 분류로 짐작한다. */
  affordances: string[];
};

export default function RoomItemPreview({ category, surface, tileW, tileH, imageUrl, affordances }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [flip, setFlip] = useState(false);
  const [withBaby, setWithBaby] = useState(true);
  const [behaviorId, setBehaviorId] = useState<string>("");
  const [months, setMonths] = useState(12);

  useEffect(() => {
    setImg(null);
    setFailed(false);
    if (!imageUrl) return;
    const el = new Image();
    el.onload = () => setImg(el);
    el.onerror = () => setFailed(true);
    el.src = imageUrl;
    return () => {
      el.onload = el.onerror = null;
    };
  }, [imageUrl]);

  const surfaceFill = category === "WALLPAPER" || category === "FLOORING";
  const affKey = affordances.join(",");
  const aff = useMemo<Affordance[]>(() => {
    if (surfaceFill) return [];
    const picked = affKey ? affKey.split(",").map((a) => AFFORDANCE_OF[a]).filter(Boolean) : [];
    return picked.length ? picked : (CATEGORY_AFFORDANCE[category] ?? []);
  }, [affKey, category, surfaceFill]);
  const options = useMemo(() => behaviorsFor(aff), [aff]);
  const behavior = options.find((b) => b.id === behaviorId) ?? null;

  // 쓰임새가 바뀌어 고른 행동이 사라지면 첫 행동으로 되돌린다
  useEffect(() => {
    if (behaviorId && !options.some((b) => b.id === behaviorId)) setBehaviorId(options[0]?.id ?? "");
  }, [options, behaviorId]);

  const pickBehavior = (id: string) => {
    setBehaviorId(id);
    const b = options.find((o) => o.id === id);
    // 그 행동이 가장 흔한 개월로 맞춘다. 아이템까지 가려면 기어야 하므로 6개월 밑으로는 내리지 않는다.
    if (b) setMonths(Math.max(b.typical, b.from, b.needs && b.needs !== "bed" ? 6 : 0));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // 앱에서 새로 놓을 때의 자리 — 벽에 거는 것은 벽 쪽, 나머지는 바닥 가운데
    const w = Math.max(1, tileW) * TILE;
    const h = Math.max(1, tileH) * TILE;
    const x0 = Math.max(0, Math.round((W / TILE - Math.max(1, tileW)) / 2)) * TILE;
    const y0 = (surface === "WALL" ? 2 : WALL_TILES + 4) * TILE;
    const x1 = x0 + w;
    const y1 = y0 + h;

    // 앱 PixelScreen.syncWorld 와 같은 규칙으로 아기 세계를 만든다
    const world: World = { bounds: WALK, spots: [], props: [], novel: new Set(), night: false };
    let prop: Prop | null = null;
    // 벽에 걸렸거나 하단 UI 에 가린 아이템은 쓸 수 없다
    const usable = !surfaceFill && aff.length > 0 && !(y1 < WALL_BOTTOM + 4 || y0 > WALK.y1);
    if (usable) {
      if (aff.includes("ball") || aff.includes("walker")) {
        prop = createProp("item", aff.includes("ball") ? "ball" : "walker", (x0 + x1) / 2, Math.min(y1, WALK.y1));
        world.props.push(prop);
      } else {
        const spot = {
          id: "item",
          aff,
          x0: Math.max(x0, WALK.x0),
          x1: Math.min(x1, WALK.x1),
          y0: Math.max(y0, WALL_BOTTOM),
          y1: Math.min(y1, WALK.y1),
        };
        if (spot.x1 - spot.x0 >= 8) world.spots.push(spot);
      }
      world.novel.add("item");
    }

    const baby = withBaby
      ? createActor(months, "female", Math.min(x1 + 20, WALK.x1), Math.min(y1 + 24, WALK.y1), performance.now() + 300)
      : null;
    if (baby && behavior) baby.only = behavior.id;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLOR.wall;
      ctx.fillRect(0, 0, W, WALL_BOTTOM);
      ctx.fillStyle = COLOR.floor;
      ctx.fillRect(0, WALL_BOTTOM, W, H - WALL_BOTTOM);

      // 벽지·바닥재 — 앱처럼 한 칸짜리 그림을 벽/바닥 전체에 깐다
      if (surfaceFill && img) {
        const [fy0, fy1] = category === "WALLPAPER" ? [0, WALL_BOTTOM] : [WALL_BOTTOM, H];
        for (let y = fy0; y < fy1; y += TILE) {
          for (let x = 0; x < W; x += TILE) ctx.drawImage(img, x, y, TILE, TILE);
        }
      }

      const layers: { depth: number; draw: () => void }[] = [];

      if (prop) {
        // 공·보행기는 놓인 자리가 아니라 지금 굴러간 자리에 그린다
        const pr = prop;
        const pflip = pr.flip !== flip;
        layers.push({
          depth: propDepth(pr),
          draw: () => {
            if (!img) {
              const sp = propSprite(pr);
              drawFlipped(ctx, sp.img, sp.left, sp.top, sp.width, sp.img.height, sp.flip);
              return;
            }
            drawFlipped(ctx, img, Math.round(pr.x - w / 2), Math.round(pr.y - h), w, h, pflip);
          },
        });
      } else if (!surfaceFill) {
        layers.push({
          // 러그는 밟고 지나가는 것이라 항상 맨 아래에 깐다
          depth: category === "RUG" ? -1 : y1,
          draw: () => {
            if (img) drawFlipped(ctx, img, x0, y0, w, h, flip);
            else {
              ctx.fillStyle = "rgba(122,90,54,.35)";
              ctx.fillRect(x0, y0, w, h);
            }
            // 차지하는 칸 — 그림이 칸에 맞는지 보이게
            ctx.strokeStyle = "rgba(48,120,201,.7)";
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
            ctx.setLineDash([]);
          },
        });
      }

      if (baby) {
        const sp = actorSprite(baby);
        layers.push({
          depth: actorDepth(baby),
          draw: () => drawFlipped(ctx, sp.img, sp.left, sp.top, sp.width, sp.img.height, sp.flip),
        });
      }

      layers.sort((a, b) => a.depth - b.depth);
      for (const l of layers) l.draw();
    };

    let prev = performance.now();
    if (baby) updateActor(baby, prev, 0, world);
    draw();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      updateWorld(world, dt);
      if (baby) updateActor(baby, now, dt, world);
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [img, category, surface, tileW, tileH, flip, withBaby, surfaceFill, aff, behavior, months]);

  const note = failed
    ? "이미지를 불러오지 못했습니다."
    : surfaceFill
      ? "한 칸짜리 그림이 벽/바닥 전체에 반복해서 깔립니다."
      : !aff.length
        ? "쓰임새가 없어 아기가 이 아이템을 쓰지 않습니다. 점선은 차지하는 칸입니다."
        : behavior
          ? `${months}개월 아기가 '${behavior.label}'만 반복합니다. 점선은 차지하는 칸입니다.`
          : `${months}개월 아기가 앱처럼 행동을 고릅니다. 이 아이템을 쓰는 행동이 더 자주 나옵니다.`;

  return (
    <div className="w-[240px] space-y-2">
      <Label>앱 미리보기</Label>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block rounded-lg ring-1 ring-border"
        style={{ width: W * DISPLAY, height: H * DISPLAY, imageRendering: "pixelated" }}
      />

      {withBaby && options.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            <BehaviorChip on={!behavior} onClick={() => setBehaviorId("")}>
              자유롭게
            </BehaviorChip>
            {options.map((b) => (
              <BehaviorChip key={b.id} on={behavior?.id === b.id} onClick={() => pickBehavior(b.id)}>
                {b.label}
              </BehaviorChip>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={24}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="flex-1"
              aria-label="아기 개월수"
            />
            <span className="w-12 text-right text-xs tabular-nums">{months}개월</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch id="previewFlip" checked={flip} onCheckedChange={setFlip} disabled={surfaceFill} />
          <Label htmlFor="previewFlip" className="text-xs">좌우 반전</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="previewBaby" checked={withBaby} onCheckedChange={setWithBaby} />
          <Label htmlFor="previewBaby" className="text-xs">아기</Label>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}

function BehaviorChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-[11px] ${
        on ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function drawFlipped(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  left: number,
  top: number,
  width: number,
  height: number,
  flip: boolean,
) {
  if (!flip) {
    ctx.drawImage(img, left, top, width, height);
    return;
  }
  ctx.save();
  ctx.translate(left + width, top);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, width, height);
  ctx.restore();
}
