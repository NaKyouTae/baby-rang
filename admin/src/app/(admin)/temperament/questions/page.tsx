import Link from "next/link";
import { adminFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AgeGroupKey = "newborn" | "before_first" | "after_first";

type Question = {
  id: string;
  questionNo: number;
  dimension: string;
  dimensionLabel: string;
  text: string;
};

type QuestionsResp = {
  ageGroups: { key: AgeGroupKey; label: string }[];
  ageGroup: AgeGroupKey;
  ageGroupLabel: string;
  dimensions: { key: string; label: string }[];
  scale: { min: number; max: number; labels: Record<string, string> };
  notice: string;
  questions: Question[];
};

export default async function TemperamentQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ ageGroup?: string }>;
}) {
  const sp = await searchParams;
  const ageGroup = (sp.ageGroup as AgeGroupKey) || "after_first";

  let data: QuestionsResp | null = null;
  try {
    data = await adminFetch<QuestionsResp>(
      `/admin/temperament/questions?ageGroup=${ageGroup}`,
    );
  } catch {}

  if (!data) {
    return <div className="text-muted-foreground">문항을 불러오지 못했습니다.</div>;
  }

  const grouped = new Map<string, Question[]>();
  for (const q of data.questions) {
    const arr = grouped.get(q.dimension) ?? [];
    arr.push(q);
    grouped.set(q.dimension, arr);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">기질 검사 문항</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/temperament/submissions">결과 목록 →</Link>
        </Button>
      </div>

      {/* Age group tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {data.ageGroups.map((g) => (
          <Button
            key={g.key}
            variant={g.key === data!.ageGroup ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/temperament/questions?ageGroup=${g.key}`}>{g.label}</Link>
          </Button>
        ))}
      </div>

      {/* Meta info */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{data.ageGroupLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{data.notice}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.scale.labels).map(([k, v]) => (
              <Badge key={k} variant="secondary">
                {k}. {v}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions by dimension */}
      <div className="space-y-4">
        {data.dimensions.map((d) => {
          const items = grouped.get(d.key) ?? [];
          if (items.length === 0) return null;
          return (
            <Card key={d.key}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{d.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {d.key} · {items.length}문항
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {items.map((q) => (
                    <li
                      key={q.id}
                      className="flex gap-3 text-sm border-t pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="text-muted-foreground w-8 shrink-0">
                        Q{q.questionNo}
                      </span>
                      <span className="flex-1">{q.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        총 {data.questions.length}문항
      </div>
    </div>
  );
}
