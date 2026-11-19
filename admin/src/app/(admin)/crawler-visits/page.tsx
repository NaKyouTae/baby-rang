import { PageHeader } from "@/components/PageHeader";
import { StatStrip } from "@/components/data-table";
import { adminFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { BotsTable, PathsTable, type BotRow, type PathRow } from "./CrawlerTables";

type Summary = {
  days: number;
  since: string;
  bots: BotRow[];
  paths: PathRow[];
};

const EMPTY: Summary = { days: 30, since: "", bots: [], paths: [] };

export default async function CrawlerVisitsPage() {
  let data = EMPTY;
  try {
    data = await adminFetch<Summary>("/admin/crawler-visits?days=30");
  } catch {}

  const total = data.bots.reduce((sum, b) => sum + b.total, 0);
  const top = [...data.bots].sort((a, b) => b.total - a.total)[0];
  const last = data.bots
    .map((b) => b.lastSeenAt)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI 크롤러 유입"
        description="최근 30일 동안 ChatGPT·Claude·Perplexity 등의 크롤러가 베이비룸 웹을 읽어간 횟수입니다. robots.txt 로 허용만 해두면 실제로 오는지 알 수 없어 따로 셉니다."
      />

      <StatStrip
        items={[
          { label: "30일 누적 방문", value: total.toLocaleString() },
          { label: "찾아온 크롤러", value: data.bots.length },
          { label: "가장 많이 온 크롤러", value: <span className="block truncate">{top?.bot ?? "-"}</span>, hint: top ? `${top.total.toLocaleString()}회` : undefined },
          { label: "마지막 방문", value: <span className="block truncate text-lg">{last ? formatDateTime(last) : "-"}</span> },
        ]}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">크롤러별</h2>
        <BotsTable items={data.bots} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">많이 읽힌 페이지</h2>
        <PathsTable items={data.paths} />
      </section>
    </div>
  );
}
