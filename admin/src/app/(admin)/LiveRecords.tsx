"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type LiveMetrics = {
  records: number;
  recordsToday: number;
  latestRecord: { createdAt: string; type: string } | null;
  at: string;
};

const POLL_MS = 5000;

/** 숫자가 바뀌면 이전 값에서 새 값까지 짧게 올라간다 */
function useCountUp(target: number, ms = 800) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      from.current = target;
      setValue(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/**
 * 총 기록 수 실시간 카운터. 5초마다 서버에 묻고, 늘어나면 숫자가 올라가며 잠깐 강조된다.
 * 탭이 안 보이는 동안에는 묻지 않는다.
 */
export function LiveRecords({ initial, typeLabel }: { initial: LiveMetrics | null; typeLabel: Record<string, string> }) {
  const [data, setData] = useState<LiveMetrics | null>(initial);
  const [bump, setBump] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = async () => {
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch("/api/metrics/live", { cache: "no-store" });
          if (!res.ok) throw new Error();
          const next: LiveMetrics = await res.json();
          if (!alive) return;
          setData((prev) => {
            if (prev && next.records > prev.records) {
              setBump(true);
              setTimeout(() => setBump(false), 1200);
            }
            return next;
          });
          setStale(false);
        } catch {
          if (alive) setStale(true);
        }
      }
      setNow(Date.now());
      if (alive) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const total = useCountUp(data?.records ?? 0);
  const today = useCountUp(data?.recordsToday ?? 0);

  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="relative flex h-2 w-2">
          {!stale && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", stale ? "bg-muted-foreground" : "bg-emerald-500")} />
        </span>
        총 기록 수 · 실시간
        {stale && <span className="text-xs">(연결이 잠시 끊겼어요)</span>}
      </div>
      <div
        className={cn(
          "mt-3 text-5xl font-semibold tracking-tight tabular-nums transition-colors duration-700 md:text-6xl",
          bump && "text-emerald-600",
        )}
      >
        {data ? total.toLocaleString() : "-"}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span>
          오늘 <b className="font-semibold text-foreground tabular-nums">+{today.toLocaleString()}</b>
        </span>
        {data?.latestRecord && (
          <span>
            마지막 기록 {typeLabel[data.latestRecord.type] ?? data.latestRecord.type} · {ago(data.latestRecord.createdAt, now)}
          </span>
        )}
        <span className="tabular-nums">5초마다 갱신</span>
      </div>
    </Card>
  );
}
