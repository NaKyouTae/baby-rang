"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildRoom, cribFront, type Buf, type Facing, type Gender } from "../modeling/babySprite";
import { actorDepth, actorSprite, createActor, updateActor, updateWorld, type World } from "../modeling/babyActor";
import { carryTarget } from "../modeling/caretaker";
import { MOM_CX, MOM_G, MOM_H, MOM_W, momFrame, type MomPose } from "../modeling/momSprite";
import { startTrip, tripPose, updateTrip, TRIP_LABEL, type MomTrip } from "../modeling/momCarry";

/** 엄마가 다 들어가도록 아기 모델 방보다 크게 잡는다 */
const ROOM_W = 176;
const ROOM_H = 132;
const ROOM_WALL = 22;
const RUG = { x0: 14, x1: 74, y0: 86, y1: 122 };
const BED = { x0: 112, x1: 162, y0: 52, y1: 84 };
const FREE = { x0: 14, x1: ROOM_W - 14, y0: ROOM_WALL + 14, y1: ROOM_H - 4 };
/** 엄마가 나간 뒤 다음에 들어오기까지(ms) */
const NEXT_TRIP_MS = 2500;
/** 업는 시안은 아직 기지 못하는 아기만 — 홈의 보호자 손과 같은 대상 */
const MAX_MONTH = 7;

const GENDERS: { key: Gender; label: string }[] = [
  { key: "female", label: "여아" },
  { key: "male", label: "남아" },
];

function toCanvas(buf: Buf): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = buf.w;
  c.height = buf.h;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.w, buf.h), 0, 0);
  return c;
}

const momCache = new Map<string, HTMLCanvasElement>();
function momImage(p: MomPose) {
  const key = `${p.facing}:${p.step}:${(p.squat ?? 0).toFixed(2)}:${p.baby ?? ""}`;
  let img = momCache.get(key);
  if (!img) {
    img = toCanvas(momFrame(p));
    momCache.set(key, img);
  }
  return img;
}

function drawFlipped(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, flip: boolean) {
  if (!flip) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w, y);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

export default function MomModelingClient() {
  const [playing, setPlaying] = useState(true);
  return (
    <div className="space-y-4">
      <PageHeader
        title="엄마 모델"
        description="아직 기지 못하는 아기를 엄마가 포대기로 업어(어부바) 다른 자리로 옮겨 주는 시안입니다. 앱 홈에서도 이 엄마가 아기를 옮깁니다."
        actions={
          <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "일시정지" : "재생"}
          </Button>
        }
      />
      <CarryCard playing={playing} />
      <PosesCard playing={playing} />
    </div>
  );
}

/** 방에서 엄마가 아기를 업어 옮기는 모습 */
function CarryCard({ playing }: { playing: boolean }) {
  const [month, setMonth] = useState(4);
  const [gender, setGender] = useState<Gender>("female");
  const [night, setNight] = useState(false);
  const [label, setLabel] = useState("");
  const [go, setGo] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const control = useRef<{ go?: () => void }>({});

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const world: World = {
      bounds: FREE,
      spots: [
        { id: "soft", aff: ["soft"], ...RUG },
        { id: "bed", aff: ["bed"], ...BED, box: BED },
      ],
      props: [],
      novel: new Set(),
      night,
    };
    const room = toCanvas(buildRoom(ROOM_W, ROOM_H, ROOM_WALL, undefined, { rug: RUG, bed: BED }));
    const rail = toCanvas(cribFront(ROOM_W, ROOM_H, BED));
    const actor = createActor(month, gender, 44, 104, performance.now() + 300);
    let trip: MomTrip | null = null;
    let nextAt = performance.now() + 1200;
    let last = "";
    const report = (s: string) => {
      if (s !== last) setLabel((last = s));
    };
    const begin = (now: number) => {
      if (trip) return;
      const to = carryTarget(actor, world, !!world.night);
      if (to) trip = startTrip(actor, to, now, world, ROOM_W);
    };
    control.current.go = () => begin(performance.now());

    const draw = (now: number) => {
      ctx.drawImage(room, 0, 0);
      const pose = trip ? tripPose(trip) : null;
      const layers: { depth: number; paint: () => void }[] = [];
      if (!pose?.hideBaby) {
        const s = actorSprite(actor);
        // 업고 내리는 동안 들린 아기는 엄마 등 뒤에 그린다
        const depth = trip && actor.held ? trip.y - 0.5 : actorDepth(actor);
        layers.push({ depth, paint: () => drawFlipped(ctx, s.img, s.left, s.top, s.width, s.height, s.flip) });
        if (actor.inBed) layers.push({ depth: BED.y1 + 0.6, paint: () => ctx.drawImage(rail, 0, 0) });
      }
      if (trip && pose) {
        const m = trip;
        const img = momImage({
          facing: pose.facing,
          step: pose.step,
          squat: Math.round(pose.squat * 8) / 8,
          baby: pose.loaded ? gender : null,
          blink: now % 3200 < 140,
        });
        layers.push({
          depth: m.y,
          paint: () => drawFlipped(ctx, img, Math.round(m.x) - MOM_CX, Math.round(m.y) - MOM_G, MOM_W, MOM_H, pose.flip),
        });
      }
      layers.sort((a, b) => a.depth - b.depth).forEach((l) => l.paint());
    };

    let prev = performance.now();
    updateActor(actor, prev, 0, world);
    draw(prev);
    report("아기가 노는 중");
    if (!playing) return () => (control.current.go = undefined);

    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      if (!trip && now >= nextAt) begin(now);
      if (trip && updateTrip(trip, now, dt, world)) {
        trip = null;
        nextAt = now + NEXT_TRIP_MS;
      }
      updateWorld(world, dt);
      updateActor(actor, now, dt, world);
      report(trip ? TRIP_LABEL[trip.phase] : "아기가 노는 중");
      draw(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      control.current.go = undefined;
    };
  }, [month, gender, night, playing]);

  useEffect(() => {
    if (go) control.current.go?.();
  }, [go]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row">
        <canvas
          ref={ref}
          width={ROOM_W}
          height={ROOM_H}
          className="w-full max-w-[528px] shrink-0 rounded-lg border border-border"
          style={{ imageRendering: "pixelated", aspectRatio: `${ROOM_W} / ${ROOM_H}` }}
          aria-label="엄마가 아기를 업어 옮기는 모습"
        />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <div className="text-sm font-semibold">지금</div>
            <div className="mt-1 text-sm text-muted-foreground">{label}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">아기</span>
            <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="아기 성별">
              {GENDERS.map((g) => (
                <Button
                  key={g.key}
                  size="sm"
                  variant={gender === g.key ? "default" : "ghost"}
                  className="h-7 px-3"
                  onClick={() => setGender(g.key)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={MAX_MONTH}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-32 accent-[var(--color-primary)]"
              aria-label="개월"
            />
            <span className="text-sm font-medium tabular-nums">{month}개월</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setGo((g) => g + 1)} disabled={!playing}>
              지금 업어 옮기기
            </Button>
            <Button size="sm" variant={night ? "default" : "outline"} onClick={() => setNight((n) => !n)}>
              {night ? "밤 — 침대로만" : "낮"}
            </Button>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>아기와 가까운 벽 쪽에서 걸어 들어와, 아기에게 등을 대고 쪼그려 앉아 포대기로 업습니다.</li>
            <li>낮에는 놀이매트·침대·빈 바닥 중 한 곳, 밤에는 침대로 옮깁니다(홈과 같은 규칙).</li>
            <li>침대에 눕힐 때는 침대 앞에 서서 내려놓고, 다 옮기면 가까운 벽 쪽으로 걸어 나갑니다.</li>
            <li>여기서는 나간 뒤 몇 초 만에 다시 들어옵니다. 홈에서는 10~20분 간격이고, 엄마는 한 번에 한 아이만 옮깁니다.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

const POSES: { label: string; facing: Facing; baby: boolean; flip?: boolean; squat?: boolean }[] = [
  { label: "앞", facing: "down", baby: false },
  { label: "뒤", facing: "up", baby: false },
  { label: "옆", facing: "side", baby: false },
  { label: "앞 · 업고", facing: "down", baby: true },
  { label: "뒤 · 업고", facing: "up", baby: true },
  { label: "옆 · 업고", facing: "side", baby: true },
  { label: "쪼그려 앉기", facing: "side", baby: false, squat: true },
  { label: "업고 일어나기", facing: "side", baby: true, squat: true },
];

/** 방향·자세별 엄마 그림 — 걷기와 쪼그려 앉기를 되풀이한다 */
function PosesCard({ playing }: { playing: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">엄마 그림</h2>
          <Badge variant="secondary" className="text-[11px]">
            {MOM_W}×{MOM_H}px · 포대기
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {POSES.map((p) => (
            <figure key={p.label} className="flex flex-col items-center gap-1">
              <PoseCanvas pose={p} playing={playing} />
              <figcaption className="text-center text-[11px] text-muted-foreground">{p.label}</figcaption>
            </figure>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PoseCanvas({ pose, playing }: { pose: (typeof POSES)[number]; playing: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const paint = (now: number) => {
      ctx.clearRect(0, 0, MOM_W, MOM_H);
      ctx.fillStyle = "#EEDDC4";
      ctx.fillRect(0, 0, MOM_W, MOM_H);
      let squat = 0;
      let step = 1;
      if (pose.squat) {
        // 1.6초마다 앉았다 일어난다
        const u = (now % 1600) / 1600;
        squat = Math.round((u < 0.5 ? u * 2 : 2 - u * 2) * 8) / 8;
      } else {
        step = Math.floor(now / 160) % 4;
      }
      const img = momImage({ facing: pose.facing, step, squat, baby: pose.baby ? "female" : null, blink: now % 3000 < 140 });
      ctx.drawImage(img, 0, 0);
    };
    paint(0);
    if (!playing) return;
    let raf = 0;
    const tick = (now: number) => {
      paint(now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pose, playing]);
  return (
    <canvas
      ref={ref}
      width={MOM_W}
      height={MOM_H}
      className="rounded-md border border-border"
      style={{ width: MOM_W * 2, height: MOM_H * 2, imageRendering: "pixelated" }}
      aria-label={`엄마 ${pose.label}`}
    />
  );
}
