import { adminFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { LiveRecords, type LiveMetrics } from "./LiveRecords";

type Point = { day: string; n: number };
type Metrics = {
  users: { total: number; newToday: number; new7: number; new30: number; newPrev30: number; dau: number; wau: number; mau: number };
  children: number;
  groups: number;
  groupsWithChild: number;
  sharedGroups: number;
  revenue: { total: number; last30: number; prev30: number; paidCount: number; payers: number };
  coins: { adRewardsToday: number; issued30: number };
  recordsByType7d: { type: string; n: number }[];
  recordSeries: Point[];
  signupSeries: Point[];
};

const TYPE_LABEL: Record<string, string> = {
  BREASTFEEDING: "모유",
  FORMULA: "분유",
  BABY_FOOD: "이유식",
  SLEEP: "수면",
  PUMPED_FEEDING: "유축수유",
  PUMPING: "유축",
  BATH: "목욕",
  HOSPITAL: "병원",
  TEMPERATURE: "체온",
  MEDICATION: "투약",
  DIAPER: "기저귀",
  SNACK: "간식",
  MILK: "우유",
  WATER: "물",
  PLAY: "놀이",
  TUMMY_TIME: "터미타임",
  ETC: "기타",
};

const won = (n: number) => `${n.toLocaleString()}원`;

/** 활동 사용자 카드 아래 줄 — 전체 가입자 중 비율 */
const activeSub = (n: number, total: number) => `전체 가입의 ${total ? Math.round((n / total) * 100) : 0}%`;

/** 이전 기간 대비 증감. 이전이 0 이면 비교하지 않는다. */
function Delta({ now, prev, unit = "%" }: { now: number; prev: number; unit?: string }) {
  if (prev === 0) return <span className="text-xs text-muted-foreground">이전 30일 데이터 없음</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span className={cn("text-xs font-medium", up ? "text-emerald-600" : "text-rose-600")}>
      {up ? "▲" : "▼"} {Math.abs(pct)}
      {unit} <span className="font-normal text-muted-foreground">이전 30일 대비</span>
    </span>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col gap-1 p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </Card>
  );
}

/** 14일 막대. 오늘 막대만 진하게, 최댓값 기준으로 높이를 맞춘다. */
function Bars({ title, total, points, tone }: { title: string; total: string; points: Point[]; tone: string }) {
  const max = Math.max(1, ...points.map((p) => p.n));
  return (
    <Card className="min-w-0 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
      </div>
      <div className="mt-4 flex h-28 items-end gap-1.5" role="img" aria-label={`${title} 최근 14일`}>
        {points.map((p, i) => (
          <div key={p.day} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={cn("w-full rounded-sm", tone, i === points.length - 1 ? "opacity-100" : "opacity-40")}
              style={{ height: `${Math.max(p.n ? 4 : 1, (p.n / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
              {p.day.slice(5)} · {p.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>{points[0]?.day.slice(5)}</span>
        <span>오늘</span>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const [metrics, live] = await Promise.all([
    adminFetch<Metrics>("/admin/metrics").catch(() => null),
    adminFetch<LiveMetrics>("/admin/metrics/live").catch(() => null),
  ]);
  const m = metrics;
  const typeTotal = m?.recordsByType7d.reduce((s, r) => s + r.n, 0) ?? 0;
  const sum = (pts?: Point[]) => (pts ?? []).reduce((s, p) => s + p.n, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="대시보드" description="날짜는 한국 시간 기준이고, 활동 사용자는 앱을 쓴 시각(로그인 상태로 연 시각)과 기록·결제 중 가장 최근 시각으로 셉니다." />

      <LiveRecords initial={live} typeLabel={TYPE_LABEL} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">사용자</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            label="전체 가입"
            value={m?.users.total ?? "-"}
            sub={m && `신규 오늘 +${m.users.newToday} · 7일 +${m.users.new7} · 30일 +${m.users.new30}`}
          />
          <Kpi label="오늘 활동 (DAU)" value={m?.users.dau ?? "-"} sub={m && activeSub(m.users.dau, m.users.total)} />
          <Kpi label="최근 7일 활동 (WAU)" value={m?.users.wau ?? "-"} sub={m && activeSub(m.users.wau, m.users.total)} />
          <Kpi label="최근 30일 활동 (MAU)" value={m?.users.mau ?? "-"} sub={m && activeSub(m.users.mau, m.users.total)} />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="등록된 아기" value={m?.children ?? "-"} sub={m && `가족당 평균 ${m.groupsWithChild ? (m.children / m.groupsWithChild).toFixed(1) : 0}명`} />
          <Kpi
            label="아기 등록 가족"
            value={m?.groupsWithChild ?? "-"}
            sub={m && `전체 가족 ${m.groups}개 중 아기를 1명 이상 등록`}
          />
          <Kpi
            label="공동 육아 가족"
            value={m?.sharedGroups ?? "-"}
            sub={m && `2명 이상이 함께 기록 · ${m.groupsWithChild ? Math.round((m.sharedGroups / m.groupsWithChild) * 100) : 0}%`}
          />
          <Kpi
            label="아기 미등록 가족"
            value={m ? Math.max(0, m.groups - m.groupsWithChild) : "-"}
            sub="가입 후 아기를 등록하지 않은 가족"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">매출·보석</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="누적 매출" value={m ? won(m.revenue.total) : "-"} sub={m && `결제 ${m.revenue.paidCount}건`} />
          <Kpi
            label="최근 30일 매출"
            value={m ? won(m.revenue.last30) : "-"}
            sub={m && <Delta now={m.revenue.last30} prev={m.revenue.prev30} />}
          />
          <Kpi
            label="결제 전환"
            value={m && m.users.total ? `${((m.revenue.payers / m.users.total) * 100).toFixed(1)}%` : "-"}
            sub={m && `결제한 사용자 ${m.revenue.payers}명`}
          />
          <Kpi label="오늘 광고 보상" value={m?.coins.adRewardsToday ?? "-"} sub={m && `30일 지급 보석 ${m.coins.issued30.toLocaleString()}개`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Bars title="일별 기록" total={`14일 합계 ${sum(m?.recordSeries).toLocaleString()}건`} points={m?.recordSeries ?? []} tone="bg-primary" />
        <Bars title="일별 가입" total={`14일 합계 ${sum(m?.signupSeries).toLocaleString()}명`} points={m?.signupSeries ?? []} tone="bg-emerald-500" />
        <Card className="min-w-0 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">최근 7일 기록 종류</span>
            <span className="text-xs text-muted-foreground tabular-nums">{typeTotal.toLocaleString()}건</span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {(m?.recordsByType7d ?? []).slice(0, 6).map((r) => (
              <li key={r.type} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span>{TYPE_LABEL[r.type] ?? r.type}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {r.n.toLocaleString()} · {typeTotal ? Math.round((r.n / typeTotal) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${typeTotal ? (r.n / typeTotal) * 100 : 0}%` }} />
                </div>
              </li>
            ))}
            {m && m.recordsByType7d.length === 0 && <li className="text-sm text-muted-foreground">최근 7일 기록이 없습니다.</li>}
          </ul>
        </Card>
      </section>

      {!m && <p className="text-sm text-destructive">지표를 불러오지 못했습니다. 서버 연결을 확인하세요.</p>}
    </div>
  );
}
