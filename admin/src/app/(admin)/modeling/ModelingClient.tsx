"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BEHAVIORS,
  CX,
  G,
  H,
  RES,
  W,
  buildFrames,
  buildRoom,
  cribFront,
  holdingCabinet,
  holdingHalfWidth,
  type Affordance,
  type Behavior,
  type BehaviorId,
  type Buf,
  type Facing,
  type Gender,
} from "./babySprite";
import {
  actorDepth,
  actorSprite,
  createActor,
  createProp,
  dropActor,
  moveHeldActor,
  pickUpActor,
  propDepth,
  propSprite,
  scoreBehaviors,
  updateActor,
  updateWorld,
  type Actor,
  type World,
} from "./babyActor";
import { SD_H, SD_W, sdStand, sdWalk, type SdFrame } from "./stardewSprite";
import { carryTarget, drawHands, startCarry, updateCarry, type Carry } from "./caretaker";

type View = "room" | "still" | "looks";

const MAX_MONTH = 24;
// 방은 홈과 같은 저해상도 격자에 그리고 정수배로 키운다
const ROOM_W = 104;
const ROOM_H = 80;
const ROOM_WALL = 18;
const ROOM_SCALE = 2;
// 스타듀풍은 방과 같은 굵은 픽셀이라 아기가 작다. 제자리 보기는 조금 더 키운다.
const STILL_SCALE = 4;
const FLOOR = "#EEDDC4";
/** 방 픽셀/초. 걸음 박자와 대충 맞춰야 발이 미끄러져 보이지 않는다. */
const SPEED: Partial<Record<BehaviorId, number>> = { crawl: 9, cruise: 7, toddle: 11, walk: 16, run: 30 };
const ITEMS: { key: Affordance; label: string }[] = [
  { key: "hold", label: "서랍장" },
  { key: "soft", label: "러그" },
  { key: "play", label: "블록" },
  { key: "ball", label: "공" },
  { key: "walker", label: "보행기" },
  { key: "bed", label: "침대" },
];
/** 새로 놓은 아이템으로 치는 시간 — 이 동안 그 아이템을 쓰는 행동이 2.5배 자주 나온다 */
const NOVEL_MS = 60_000;

const FACING_LABEL: Record<Facing, string> = { side: "옆", down: "앞", up: "뒤" };
const GENDERS: { key: Gender; label: string }[] = [
  { key: "female", label: "여아" },
  { key: "male", label: "남아" },
];
const LABEL = Object.fromEntries(BEHAVIORS.map((b) => [b.id, b.label])) as Record<BehaviorId, string>;

const rangeLabel = (b: Behavior) => `${b.from}~${b.to === MAX_MONTH ? "24+" : b.to}개월`;
const activeAt = (b: Behavior, month: number) => month >= b.from && month <= b.to;
/** 잡고 걷기는 가구를 따라 좌우로만 움직이므로 자유 이동에서 뺀다. */
const roamsFreely = (b: Behavior) => b.roams && b.id !== "cruise";
const isHolding = (id: BehaviorId) => id === "pullStand" || id === "cruise";
/** 붙잡기를 뺀, 장난감이 필요한 행동 */
const usesToy = (b: Behavior) => !!b.needs && b.needs !== "hold";

export default function ModelingClient() {
  const [month, setMonth] = useState(9);
  const [playing, setPlaying] = useState(true);
  const [view, setView] = useState<View>("room");

  return (
    <div>
      <PageHeader
        title="아기 모델링"
        description="홈 픽셀 아기의 개월별 행동을 여아/남아로 미리 봅니다."
        actions={
          <>
            <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="보기 방식">
              {(
                [
                  ["room", "방에서 보기"],
                  ["still", "제자리 보기"],
                  ["looks", "시안"],
                ] as const
              ).map(([v, label]) => (
                <Button
                  key={v}
                  size="sm"
                  variant={view === v ? "default" : "ghost"}
                  className="h-7 px-3"
                  onClick={() => setView(v)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "일시정지" : "재생"}
            </Button>
          </>
        }
      />

      {/* 시안 — 처음 손으로 찍은 스타듀풍 걷기 그림. 지금 엔진의 그림체 기준이다. */}
      {view === "looks" ? (
        <StardewCard playing={playing} />
      ) : (
        <>
          <Simulation month={month} onMonth={setMonth} playing={playing} />
          <div className="grid gap-3 lg:grid-cols-2">
            {BEHAVIORS.map((b) => (
              <BehaviorCard key={b.id} behavior={b} playing={playing} view={view} dimmed={!activeAt(b, month)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 개월 시뮬레이션 — 그 개월의 아기가 방에 놓인 아이템에 맞춰 행동을 골라 지낸다. 홈과 같은 엔진이다. */
function Simulation({
  month,
  onMonth,
  playing,
}: {
  month: number;
  onMonth: (m: number) => void;
  playing: boolean;
}) {
  const [items, setItems] = useState<Affordance[]>(["hold", "soft", "play", "ball", "walker", "bed"]);
  const [night, setNight] = useState(false);
  // 방금 켠 아이템 — 홈에서 새로 놓은 가구처럼 한동안 더 자주 쓴다
  const [novel, setNovel] = useState<{ key: Affordance; at: number }[]>([]);
  const [current, setCurrent] = useState<Partial<Record<Gender, string>>>({});
  // 옮겨 주기 시연 — 누를 때마다 숫자가 올라가고, 방마다 아기를 들어 다른 자리로 옮겨 놓는다
  const [carry, setCarry] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);
  const novelKeys = novel.filter((n) => now - n.at < NOVEL_MS).map((n) => n.key);

  const toggle = (key: Affordance) => {
    setItems((list) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]));
    if (!items.includes(key)) {
      setNovel((list) => [...list.filter((n) => n.key !== key), { key, at: Date.now() }]);
    }
  };

  // 이 방 기준 비율 — 엔진이 실제로 쓰는 점수를 그대로 보여준다
  const weights = scoreBehaviors(createActor(month, "female", 0, 0, 0), simWorld(month, items, novelKeys, night), 0);

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-wrap gap-5 p-4">
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <figure key={g.key} className="flex flex-col items-center gap-1">
              <SimRoom
                months={month}
                gender={g.key}
                playing={playing}
                items={items}
                novel={novelKeys}
                night={night}
                carry={carry}
                onBehavior={(label) => setCurrent((c) => ({ ...c, [g.key]: label }))}
              />
              <figcaption className="text-xs text-muted-foreground">
                {g.label}
                {current[g.key] && <span className="font-medium text-foreground"> · {current[g.key]}</span>}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="min-w-56 flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground">개월 시뮬레이션</h2>
            <input
              type="range"
              min={0}
              max={MAX_MONTH}
              value={month}
              onChange={(e) => onMonth(Number(e.target.value))}
              className="w-36 accent-[var(--color-primary)]"
              aria-label="개월수"
            />
            <span className="text-sm font-medium tabular-nums text-foreground">{month}개월</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1" role="group" aria-label="방에 놓을 아이템">
            <span className="mr-1 text-xs text-muted-foreground">방 아이템</span>
            {ITEMS.map((it) => (
              <Button
                key={it.key}
                size="sm"
                variant={items.includes(it.key) ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => toggle(it.key)}
              >
                {it.label}
                {novelKeys.includes(it.key) && items.includes(it.key) && " · 새것"}
              </Button>
            ))}
            <Button
              size="sm"
              variant={night ? "default" : "outline"}
              className="ml-2 h-7 px-2.5 text-xs"
              onClick={() => setNight((n) => !n)}
            >
              {night ? "밤" : "낮"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              onClick={() => setCarry((c) => c + 1)}
              disabled={!playing}
            >
              보호자가 옮겨 주기
            </Button>
          </div>
          {!createActor(month, "female", 0, 0, 0).locomotion && (
            <p className="mb-3 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
              {month}개월은 아직 기지 못해 스스로 자리를 옮기지 않습니다. 보호자 손이 몇 초마다 러그·침대·바닥으로 옮겨 줍니다
              (홈은 10~20분마다, 밤에는 침대로, 잠 기록을 저장하면 침대로). 아기를 꾹 눌러 직접 옮길 수도 있습니다.
            </p>
          )}
          <ul className="space-y-1.5">
            {weights.map((x) => {
              const label = LABEL[x.id];
              const active = Object.values(current).some((c) => c?.startsWith(label));
              return (
                <li key={x.id} className="grid grid-cols-[88px_1fr_36px] items-center gap-2 text-xs">
                  <span className={cn("truncate", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {label}
                  </span>
                  <span className="h-2 rounded-full bg-muted">
                    <span
                      className="block h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(x.w * 100, 2)}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-foreground">{Math.round(x.w * 100)}%</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            행동 점수 = 개월 가중치 × 필요한 아이템이 있는가 × 관련 아이템 가산(러그 2배) × 새 아이템 가산(2.5배) × 밤이면
            침대에서 자기 4배. 아이템이 필요한 행동은 그 개월의 이동 수단으로 아이템까지 간 다음 시작한다.
            아기를 꾹 눌러 끌어다 놓으면 놓은 자리(침대·러그·가구)에 맞는 행동을 바로 시작한다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 스타듀밸리풍 시안 — 손으로 찍은 픽셀 그림. 실제 방 크기와 크게 확대한 것을 같이 보여준다.
 * 지금은 걸음마 아기 앞모습만 있다.
 */
/** 렌더마다 새로 만들면 걷기 애니메이션이 처음으로 돌아간다. 한 번만 굽는다. */
const SD_FRAMES = {
  male: { stand: [sdStand("male")], walk: sdWalk("male") },
  female: { stand: [sdStand("female")], walk: sdWalk("female") },
};

function StardewCard({ playing }: { playing: boolean }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">스타듀밸리풍 시안</h2>
          <Badge variant="secondary" className="text-[11px]">
            손픽셀 16×24
          </Badge>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          픽셀을 한 점씩 직접 찍은 그림입니다. 방과 같은 굵은 픽셀에 타일 1칸 너비. 지금은 걸음마 아기 앞모습(서 있기·걷기)만
          있습니다.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          {GENDERS.map((g) => (
            <div key={g.key} className="flex items-end gap-2">
              <figure className="flex flex-col items-center gap-1">
                <SdCanvas frames={SD_FRAMES[g.key].stand} scale={ROOM_SCALE} playing={false} />
                <figcaption className="text-[11px] text-muted-foreground">{g.label} 실제 크기</figcaption>
              </figure>
              <figure className="flex flex-col items-center gap-1">
                <SdCanvas frames={SD_FRAMES[g.key].stand} scale={6} playing={false} />
                <figcaption className="text-[11px] text-muted-foreground">{g.label} 서 있기</figcaption>
              </figure>
              <figure className="flex flex-col items-center gap-1">
                <SdCanvas frames={SD_FRAMES[g.key].walk} scale={6} playing={playing} />
                <figcaption className="text-[11px] text-muted-foreground">{g.label} 걷기</figcaption>
              </figure>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 손픽셀 프레임을 돌려 그린다. 걷기는 한 프레임 160ms. */
function SdCanvas({ frames, scale, playing }: { frames: SdFrame[]; scale: number; playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const images = frames.map((f) => new ImageData(new Uint8ClampedArray(f.data), f.w, f.h));
    let i = 0;
    const draw = () => {
      ctx.clearRect(0, 0, SD_W, SD_H);
      ctx.putImageData(images[i % images.length], 0, 0);
    };
    draw();
    if (!playing || images.length < 2) return;
    const id = window.setInterval(() => {
      i++;
      draw();
    }, 160);
    return () => window.clearInterval(id);
  }, [frames, playing]);
  return (
    <canvas
      ref={ref}
      width={SD_W}
      height={SD_H}
      className="rounded-md border border-border"
      style={{ width: SD_W * scale, height: SD_H * scale, imageRendering: "pixelated", background: FLOOR }}
    />
  );
}

function BehaviorCard({
  behavior: b,
  playing,
  view,
  dimmed,
}: {
  behavior: Behavior;
  playing: boolean;
  view: View;
  dimmed: boolean;
}) {
  const [facing, setFacing] = useState<Facing>(b.facings[0]);
  const [months, setMonths] = useState(b.typical);
  // 장난감을 쓰는 행동은 엔진으로 보여준다 — 공이 굴러가고 보행기가 따라와야 해서 제자리 그림으로는 부족하다
  const engine = view === "room" && usesToy(b);
  // 방에서 자유롭게 돌아다니는 행동은 이동 방향이 곧 바라보는 방향이다
  const autoFacing = engine || (view === "room" && roamsFreely(b));

  return (
    <Card id={`behavior-${b.id}`} className={cn("scroll-mt-20 transition-opacity", dimmed && "opacity-50")}>
      <CardContent className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{b.label}</h3>
          <Badge variant="secondary" className="text-[11px]">
            {rangeLabel(b)}
          </Badge>
        </div>
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{b.note}</p>

        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {autoFacing ? (
            <span className="text-xs text-muted-foreground">방향은 이동 방향대로 자동</span>
          ) : (
            b.facings.length > 1 && (
              <div className="flex gap-1" role="group" aria-label="방향">
                {b.facings.map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={f === facing ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setFacing(f)}
                  >
                    {FACING_LABEL[f]}
                  </Button>
                ))}
              </div>
            )
          )}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="range"
              min={b.from}
              max={b.to}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-24 accent-[var(--color-primary)]"
              aria-label={`${b.label} 체형 개월수`}
            />
            <span className="tabular-nums text-foreground">{months}개월 체형</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <figure key={g.key} className="flex flex-col items-center gap-1">
              {engine ? (
                <EnginePreview behavior={b} months={months} gender={g.key} playing={playing} />
              ) : view === "room" ? (
                <RoomPreview behavior={b} months={months} gender={g.key} facing={facing} playing={playing} />
              ) : (
                <Sprite behavior={b} months={months} gender={g.key} facing={facing} playing={playing} />
              )}
              <figcaption className="text-[11px] text-muted-foreground">{g.label}</figcaption>
            </figure>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Sprite({
  behavior: b,
  months,
  gender,
  facing,
  playing,
}: {
  behavior: Behavior;
  months: number;
  gender: Gender;
  facing: Facing;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  // ImageData 는 브라우저에만 있다. 서버 렌더 중에 굽지 않도록 effect 안에서 만든다.
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const frames = buildFrames(b.id, months, gender, facing).map(
      (f) => new ImageData(new Uint8ClampedArray(f.data), f.w, f.h),
    );
    let i = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W * RES, H * RES);
      ctx.putImageData(frames[i % frames.length], 0, 0);
    };
    draw();
    if (!playing) return;
    const id = window.setInterval(() => {
      i++;
      draw();
    }, 1000 / b.fps);
    return () => window.clearInterval(id);
  }, [b.id, months, gender, facing, playing, b.fps]);

  return (
    <canvas
      ref={ref}
      width={W * RES}
      height={H * RES}
      className="rounded-lg border border-border"
      style={{ width: W * STILL_SCALE, height: H * STILL_SCALE, imageRendering: "pixelated", background: FLOOR }}
      aria-label={`${gender === "female" ? "여아" : "남아"} ${b.label}`}
    />
  );
}

function toCanvas(buf: Buf): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = buf.w;
  c.height = buf.h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.w, buf.h), 0, 0);
  return c;
}

type CabRect = { x0: number; x1: number; top: number; bottom: number };

/**
 * 프레임 캐시. 가구가 아기 몸과 겹치는 잡기 자세는 아기 위치마다 가구를 같은 자리(스프라이트 좌표)에 그려 넣어야
 * 방의 가구와 픽셀이 정확히 겹친다. 위치는 정수 몇 개뿐이라 그때그때 굽는다.
 */
function frameCache(months: number, gender: Gender, cab: CabRect | null) {
  const cache = new Map<string, HTMLCanvasElement[]>();
  return (id: BehaviorId, f: Facing, ox: number) => {
    const withCab = cab && isHolding(id) && f !== "side";
    const key = withCab ? `${id}:${f}:${ox}` : `${id}:${f}`;
    let list = cache.get(key);
    if (!list) {
      const opts = withCab ? { cabX: [cab.x0 - ox, cab.x1 - ox] as [number, number] } : {};
      list = buildFrames(id, months, gender, f, opts).map(toCanvas);
      cache.set(key, list);
    }
    return list;
  };
}

function drawSprite(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, flip: boolean) {
  const ox = Math.round(x) - CX;
  const oy = Math.round(y) - G;
  // 아기 그림은 RES 배 크기라 논리 크기(W×H)로 줄여 그린다
  if (!flip) {
    ctx.drawImage(img, ox, oy, W, H);
    return;
  }
  ctx.save();
  ctx.translate(ox + W, oy);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
}

/** 이동 방향으로 바라보는 방향을 정한다. 왼쪽은 옆모습을 반전한다. */
function faceToward(dx: number, dy: number, allowed: Facing[]): { facing: Facing; flip: boolean } {
  if (Math.abs(dx) > Math.abs(dy) || !allowed.includes(dy > 0 ? "down" : "up")) {
    return { facing: "side", flip: dx < 0 };
  }
  return { facing: dy > 0 ? "down" : "up", flip: false };
}

const FREE = { x0: 14, x1: ROOM_W - 14, y0: ROOM_WALL + 10, y1: ROOM_H - 4 };

function RoomCanvas({ canvasRef, label }: { canvasRef: React.RefObject<HTMLCanvasElement | null>; label: string }) {
  return (
    <canvas
      ref={canvasRef}
      // 아기를 RES 배 촘촘하게 그리므로 캔버스도 그만큼 촘촘하다. 좌표는 방 픽셀로 쓰고 setTransform 으로 키운다.
      width={ROOM_W * RES}
      height={ROOM_H * RES}
      className="rounded-lg border border-border"
      // touchAction — 시뮬레이션 방에서 아기를 끌 때 화면이 스크롤되지 않게
      style={{ width: ROOM_W * ROOM_SCALE, height: ROOM_H * ROOM_SCALE, imageRendering: "pixelated", touchAction: "none" }}
      aria-label={label}
    />
  );
}

/**
 * 행동 하나를 작은 방에서 보여준다.
 *   돌아다니는 행동 — 임의의 지점으로 걸어갔다가 잠깐 쉰다.
 *   잡고 걷기 — 가구를 따라 좌우로만 오간다.
 *   나머지 — 방 가운데서 제자리 동작.
 */
function RoomPreview({
  behavior: b,
  months,
  gender,
  facing,
  playing,
}: {
  behavior: Behavior;
  months: number;
  gender: Gender;
  facing: Facing;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const free = roamsFreely(b);
    const along = b.id === "cruise" && facing !== "side";
    const cabY = isHolding(b.id) ? holdingCabinet(months, facing) : null;
    // 뒤(벽 가구를 마주 봄)는 벽 바로 앞, 앞(가구가 아기 앞)은 방 아래쪽에 선다
    const homeY = cabY ? (facing === "up" ? ROOM_WALL + 22 : ROOM_H - 6) : Math.round(ROOM_H * 0.72);
    // 가구는 방 가운데 작게. 잡고 걷기 가구만 게걸음으로 오갈 만큼 조금 더 길다.
    const half = b.id === "cruise" ? 22 : holdingHalfWidth(b.id, facing);
    const cab = cabY
      ? { x0: ROOM_W / 2 - half, x1: ROOM_W / 2 + half, top: homeY + cabY.top, bottom: homeY + cabY.bottom }
      : null;
    const room = toCanvas(buildRoom(ROOM_W, ROOM_H, ROOM_WALL, cab ?? undefined));
    const framesFor = frameCache(months, gender, cab);

    const speed = SPEED[b.id] ?? 0;
    const bounds = free ? FREE : { x0: ROOM_W / 2 - half + 9, x1: ROOM_W / 2 + half - 9, y0: homeY, y1: homeY };
    let x = ROOM_W / 2;
    let y = free ? (bounds.y0 + bounds.y1) / 2 : homeY;
    let tx = x;
    let ty = y;
    let cur: Facing = free ? b.facings[0] : facing;
    let flip = false;
    let moving = false;
    let restUntil = 0;
    let frame = 0;
    let frameClock = 0;
    let prev = performance.now();

    const pickTarget = () => {
      for (let tries = 0; tries < 8; tries++) {
        tx = bounds.x0 + Math.random() * (bounds.x1 - bounds.x0);
        ty = bounds.y0 + Math.random() * (bounds.y1 - bounds.y0);
        if (Math.hypot(tx - x, ty - y) > 18) break;
      }
      if (free) ({ facing: cur, flip } = faceToward(tx - x, ty - y, b.facings));
    };

    const draw = () => {
      ctx.drawImage(room, 0, 0);
      const list = framesFor(b.id, cur, Math.round(x) - CX);
      drawSprite(ctx, list[frame % list.length], x, y, flip);
    };

    draw();
    if (!playing) return;

    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;

      if (free || along) {
        if (moving) {
          const dx = tx - x;
          const dy = ty - y;
          const d = Math.hypot(dx, dy);
          const step = speed * dt;
          if (d <= step) {
            x = tx;
            y = ty;
            moving = false;
            restUntil = now + 600 + Math.random() * 1200;
          } else {
            x += (dx / d) * step;
            y += (dy / d) * step;
          }
        } else if (now >= restUntil) {
          pickTarget();
          moving = true;
        }
      }

      // 돌아다니는 행동은 쉬는 동안 첫 프레임에 멈춰 선다
      if (!(free || along) || moving) {
        frameClock += dt;
        while (frameClock >= 1 / b.fps) {
          frameClock -= 1 / b.fps;
          frame++;
        }
      } else {
        frame = 0;
        frameClock = 0;
      }

      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [b, months, gender, facing, playing]);

  return <RoomCanvas canvasRef={ref} label={`${gender === "female" ? "여아" : "남아"} ${b.label} 방 미리보기`} />;
}

/* ------------------------------------------------------------------ 엔진 미리보기 */

const SIM_HOME_Y = ROOM_WALL + 22;
const SIM_CAB = { x0: 62, x1: 98 };
const SIM_RUG = { x0: 8, x1: 50, y0: 52, y1: 75 };
const SIM_TOY = { x: 80, y: 70 };
const SIM_BED = { x0: 54, x1: 98, y0: 44, y1: 72 };

/** 시뮬레이션 방의 아이템 자리. 홈에서는 사용자가 놓은 가구가 이 자리를 대신한다. */
function simWorld(months: number, items: Affordance[], novel: Affordance[], night = false): World {
  const world: World = { bounds: FREE, spots: [], props: [], novel: new Set(novel), night };
  if (items.includes("hold")) {
    const cabY = holdingCabinet(months, "up")!;
    world.spots.push({ id: "hold", aff: ["hold"], ...SIM_CAB, y0: SIM_HOME_Y + cabY.top, y1: SIM_HOME_Y - 2 });
  }
  if (items.includes("soft")) world.spots.push({ id: "soft", aff: ["soft"], ...SIM_RUG });
  if (items.includes("play")) {
    world.spots.push({ id: "play", aff: ["play"], x0: SIM_TOY.x - 4, x1: SIM_TOY.x + 4, y0: SIM_TOY.y - 4, y1: SIM_TOY.y });
  }
  if (items.includes("bed")) world.spots.push({ id: "bed", aff: ["bed"], ...SIM_BED, box: SIM_BED });
  if (items.includes("ball")) world.props.push(createProp("ball", "ball", 40, 64));
  if (items.includes("walker")) world.props.push(createProp("walker", "walker", 34, 42));
  return world;
}

function simRoomCanvas(months: number, items: Affordance[]) {
  const cabY = holdingCabinet(months, "up")!;
  return toCanvas(
    buildRoom(
      ROOM_W,
      ROOM_H,
      ROOM_WALL,
      items.includes("hold") ? { ...SIM_CAB, top: SIM_HOME_Y + cabY.top, bottom: SIM_HOME_Y + cabY.bottom } : undefined,
      {
        rug: items.includes("soft") ? SIM_RUG : undefined,
        toy: items.includes("play") ? SIM_TOY : undefined,
        bed: items.includes("bed") ? SIM_BED : undefined,
      },
    ),
  );
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  s: { img: HTMLCanvasElement; left: number; top: number; width: number; height: number; flip: boolean },
) {
  if (!s.flip) {
    ctx.drawImage(s.img, s.left, s.top, s.width, s.height);
    return;
  }
  ctx.save();
  ctx.translate(s.left + s.width, s.top);
  ctx.scale(-1, 1);
  ctx.drawImage(s.img, 0, 0, s.width, s.height);
  ctx.restore();
}

/** 엔진 한 벌을 캔버스에 돌린다. 장난감과 아기를 y 로 정렬해 앞뒤가 맞게 그린다. */
/** 시뮬레이션에서 보호자 손이 기지 못하는 아기를 옮겨 주는 간격(ms). 홈은 10~20분이지만 보려고 짧게 둔다. */
const SIM_CARRY_GAP = [6_000, 12_000] as const;
/** 홈과 같은 꾹 누르기 시간(ms) */
const PICK_UP_MS = 350;

function runEngine(
  ctx: CanvasRenderingContext2D,
  room: HTMLCanvasElement,
  world: World,
  actor: Actor,
  playing: boolean,
  onLabel?: (label: string) => void,
  /** 홈처럼 아기를 꾹 눌러 옮길 수 있게 하고, 옮겨 주기 시연을 받는다 */
  control?: { carry?: () => void },
) {
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // 침대 앞 난간 — 아기가 침대에 누우면 그 위에 덮어 몸이 침대 안에 들어가 보이게 한다
  const rail = world.spots.some((sp) => sp.aff.includes("bed")) ? toCanvas(cribFront(ROOM_W, ROOM_H, SIM_BED)) : null;
  let lastLabel = "";
  const draw = () => {
    ctx.drawImage(room, 0, 0);
    const layers = [
      ...world.props.map((p) => ({ depth: propDepth(p), s: propSprite(p) })),
      { depth: actorDepth(actor), s: actorSprite(actor) },
    ].sort((x, y) => x.depth - y.depth);
    for (const l of layers) drawLayer(ctx, l.s);
    if (rail && actor.inBed) ctx.drawImage(rail, 0, 0);
  };
  const report = () => {
    if (!onLabel) return;
    const label = actor.held
      ? "안겨서 옮겨지는 중"
      : actor.traveling && actor.next
        ? `${LABEL[actor.next]} 하러 가는 중`
        : LABEL[actor.act];
    if (label !== lastLabel) onLabel((lastLabel = label));
  };
  let prev = performance.now();
  updateActor(actor, prev, 0, world);
  report();
  draw();
  if (!playing) return () => {};

  // 보호자 손 — 홈과 같은 caretaker. 기지 못하는 아기는 몇 초마다 저절로, 옮겨 주기 버튼을 누르면 바로 옮긴다.
  let carry: Carry | null = null;
  let nextCarry = performance.now() + SIM_CARRY_GAP[0];
  const beginCarry = (now: number) => {
    if (carry || actor.held) return;
    const to = carryTarget(actor, world, !!world.night);
    if (to) carry = startCarry(actor, to, now);
    nextCarry = now + SIM_CARRY_GAP[0] + Math.random() * (SIM_CARRY_GAP[1] - SIM_CARRY_GAP[0]);
  };
  if (control) control.carry = () => beginCarry(performance.now());

  // 꾹 눌러 옮기기 — 홈 PixelScreen 과 같은 조작
  const canvas = ctx.canvas;
  let press: { x: number; y: number; timer: ReturnType<typeof setTimeout> | null; picked: boolean } | null = null;
  const toRoom = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * ROOM_W, y: ((e.clientY - r.top) / r.height) * ROOM_H };
  };
  const onDown = (e: PointerEvent) => {
    if (carry) return;
    const p = toRoom(e);
    const s = actorSprite(actor);
    if (p.x < s.left || p.x > s.left + s.width || p.y < s.top || p.y > s.top + s.height) return;
    canvas.setPointerCapture(e.pointerId);
    const cur = { x: p.x, y: p.y, timer: null as ReturnType<typeof setTimeout> | null, picked: false };
    cur.timer = setTimeout(() => {
      cur.timer = null;
      cur.picked = true;
      pickUpActor(actor);
      moveHeldActor(actor, cur.x, cur.y + 6);
    }, PICK_UP_MS);
    press = cur;
  };
  const onMove = (e: PointerEvent) => {
    if (!press) return;
    const p = toRoom(e);
    if (press.picked) moveHeldActor(actor, p.x, p.y + 6);
    else if (Math.hypot(p.x - press.x, p.y - press.y) > 4) end();
  };
  const end = () => {
    if (!press) return;
    if (press.timer) clearTimeout(press.timer);
    if (press.picked) dropActor(actor, performance.now(), world);
    press = null;
  };
  if (control) {
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  let raf = 0;
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    if (control && !actor.locomotion && !press && now >= nextCarry) beginCarry(now);
    if (carry && updateCarry(carry, now, world)) carry = null;
    updateWorld(world, dt);
    updateActor(actor, now, dt, world);
    report();
    draw();
    if (carry) drawHands(ctx, carry, now);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    if (press?.timer) clearTimeout(press.timer);
    if (control) {
      control.carry = undefined;
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", end);
    }
  };
}

/** 개월 시뮬레이션 방 */
function SimRoom({
  months,
  gender,
  playing,
  items,
  novel,
  night,
  carry,
  onBehavior,
}: {
  months: number;
  gender: Gender;
  playing: boolean;
  items: Affordance[];
  novel: Affordance[];
  night: boolean;
  /** 바뀔 때마다 아기를 들어 다른 자리로 옮겨 놓는다(0 은 처음 값이라 무시) */
  carry: number;
  onBehavior: (label: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const control = useRef<{ carry?: () => void }>({});
  const report = useRef(onBehavior);
  useEffect(() => {
    report.current = onBehavior;
  });
  const itemsKey = items.slice().sort().join(",");
  const novelKey = novel.slice().sort().join(",");

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const list = itemsKey ? (itemsKey.split(",") as Affordance[]) : [];
    const world = simWorld(months, list, novelKey ? (novelKey.split(",") as Affordance[]) : [], night);
    const actor = createActor(months, gender, ROOM_W * 0.4, ROOM_H * 0.7, performance.now() + 300);
    return runEngine(ctx, simRoomCanvas(months, list), world, actor, playing, (l) => report.current(l), control.current);
  }, [months, gender, playing, itemsKey, novelKey, night]);

  useEffect(() => {
    if (carry) control.current.carry?.();
  }, [carry]);

  return <RoomCanvas canvasRef={ref} label={`${gender === "female" ? "여아" : "남아"} ${months}개월 시뮬레이션`} />;
}

/** 장난감 행동 카드 — 그 장난감 하나만 놓인 방에서 그 행동만 반복한다. */
function EnginePreview({
  behavior: b,
  months,
  gender,
  playing,
}: {
  behavior: Behavior;
  months: number;
  gender: Gender;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !b.needs) return;
    const items = [b.needs];
    const world = simWorld(months, items, []);
    const actor = createActor(months, gender, ROOM_W * 0.35, ROOM_H * 0.7, performance.now() + 200);
    actor.only = b.id;
    return runEngine(ctx, simRoomCanvas(months, items), world, actor, playing);
  }, [b, months, gender, playing]);

  return <RoomCanvas canvasRef={ref} label={`${gender === "female" ? "여아" : "남아"} ${b.label} 미리보기`} />;
}
