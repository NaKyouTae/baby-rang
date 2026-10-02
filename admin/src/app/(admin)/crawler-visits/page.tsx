import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { adminFetch } from "@/lib/api";

type Summary = {
  days: number;
  since: string;
  bots: { bot: string; total: number; lastSeenAt: string | null }[];
  paths: { path: string; total: number }[];
};

const EMPTY: Summary = { days: 30, since: "", bots: [], paths: [] };

export default async function CrawlerVisitsPage() {
  let data = EMPTY;
  try {
    data = await adminFetch<Summary>("/admin/crawler-visits?days=30");
  } catch {}

  const total = data.bots.reduce((sum, b) => sum + b.total, 0);

  return (
    <div>
      <PageHeader
        title="AI 크롤러 유입"
        description="최근 30일 동안 ChatGPT·Claude·Perplexity 등의 크롤러가 아기랑 웹을 읽어간 횟수입니다. robots.txt 로 허용만 해두면 실제로 오는지 알 수 없어 따로 셉니다."
      />

      <div className="space-y-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">30일 누적 방문</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {total.toLocaleString("ko-KR")}
          </p>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">크롤러별</h2>
          <div className="space-y-2">
            {data.bots.map((b) => (
              <Card
                key={b.bot}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.bot}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {b.lastSeenAt
                      ? `마지막 방문 ${new Date(b.lastSeenAt).toLocaleString("ko-KR")}`
                      : "방문 기록 없음"}
                  </p>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {b.total.toLocaleString("ko-KR")}회
                </Badge>
              </Card>
            ))}
            {data.bots.length === 0 && (
              <Card className="py-12 text-center text-sm text-muted-foreground">
                아직 수집된 방문이 없습니다. 크롤러가 오기까지 며칠 걸릴 수 있습니다
              </Card>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            많이 읽힌 페이지
          </h2>
          <div className="space-y-2">
            {data.paths.map((p) => (
              <Card
                key={p.path}
                className="flex items-center justify-between gap-4 p-4"
              >
                <p className="truncate text-sm">{p.path}</p>
                <Badge variant="secondary" className="tabular-nums">
                  {p.total.toLocaleString("ko-KR")}회
                </Badge>
              </Card>
            ))}
            {data.paths.length === 0 && (
              <Card className="py-12 text-center text-sm text-muted-foreground">
                아직 수집된 페이지가 없습니다
              </Card>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
