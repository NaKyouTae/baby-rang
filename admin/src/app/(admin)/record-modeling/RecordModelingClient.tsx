"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  H,
  RECORD_FPS,
  RECORD_REACTIONS,
  RES,
  W,
  buildRecordFrames,
  type Gender,
  type RecordReaction,
} from "../modeling/babySprite";

const MAX_MONTH = 24;
const SCALE = 4;
const FLOOR = "#EEDDC4";
const GENDERS: { key: Gender; label: string }[] = [
  { key: "female", label: "여아" },
  { key: "male", label: "남아" },
];

export default function RecordModelingClient() {
  const [month, setMonth] = useState(9);
  const [playing, setPlaying] = useState(true);

  return (
    <div>
      <PageHeader
        title="기록 모델"
        description="홈에서 기록을 저장하면 아기가 보여 줄 기록 항목별 행동을 여아/남아로 미리 봅니다. 아직 앱에는 반영하지 않았습니다."
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="range"
                min={0}
                max={MAX_MONTH}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-32 accent-[var(--color-primary)]"
                aria-label="개월수"
              />
              <span className="w-12 font-medium tabular-nums text-foreground">{month}개월</span>
            </label>
            <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? "일시정지" : "재생"}
            </Button>
          </>
        }
      />
      <p className="mb-4 text-xs text-muted-foreground">
        행동을 두 번 보여 준 뒤 두 팔을 들고 하트를 띄우며 기뻐합니다(약 2.7초, 저장 토스트 2.5초와 맞춤). 수면은 자는
        모습만 보여 줍니다. 5개월 미만은 앉지 못해 누워서 하고, 목욕은 받쳐 앉힙니다.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {RECORD_REACTIONS.map((r) => (
          <ReactionCard key={r.key} reaction={r} months={month} playing={playing} />
        ))}
      </div>
    </div>
  );
}

function ReactionCard({ reaction: r, months, playing }: { reaction: RecordReaction; months: number; playing: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">{r.label}</h3>
        <p className="mb-3 line-clamp-2 min-h-8 text-xs text-muted-foreground">{r.note}</p>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <figure key={g.key} className="flex flex-col items-center gap-1">
              <ReactionSprite reaction={r} months={months} gender={g.key} playing={playing} />
              <figcaption className="text-[11px] text-muted-foreground">{g.label}</figcaption>
            </figure>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReactionSprite({
  reaction: r,
  months,
  gender,
  playing,
}: {
  reaction: RecordReaction;
  months: number;
  gender: Gender;
  playing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  // ImageData 는 브라우저에만 있다. 서버 렌더 중에 굽지 않도록 effect 안에서 만든다.
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const frames = buildRecordFrames(r.id, months, gender, r.variant).map(
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
    }, 1000 / RECORD_FPS);
    return () => window.clearInterval(id);
  }, [r.id, r.variant, months, gender, playing]);

  return (
    <canvas
      ref={ref}
      width={W * RES}
      height={H * RES}
      className="rounded-lg border border-border"
      style={{ width: W * SCALE, height: H * SCALE, imageRendering: "pixelated", background: FLOOR }}
      aria-label={`${gender === "female" ? "여아" : "남아"} ${r.label} 반응`}
    />
  );
}
