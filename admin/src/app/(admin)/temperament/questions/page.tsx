import Link from "next/link";
import { adminFetch } from "@/lib/api";

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
    return <div className="text-gray-500">문항을 불러오지 못했습니다.</div>;
  }

  // dimension별로 그룹화
  const grouped = new Map<string, Question[]>();
  for (const q of data.questions) {
    const arr = grouped.get(q.dimension) ?? [];
    arr.push(q);
    grouped.set(q.dimension, arr);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">기질 검사 문항</h1>
        <Link
          href="/temperament/submissions"
          className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700"
        >
          결과 목록 →
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {data.ageGroups.map((g) => {
          const active = g.key === data!.ageGroup;
          return (
            <Link
              key={g.key}
              href={`/temperament/questions?ageGroup=${g.key}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              {g.label}
            </Link>
          );
        })}
      </div>

      {/* 메타 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 text-sm text-gray-700">
        <div className="font-semibold mb-2">{data.ageGroupLabel}</div>
        <div className="text-gray-500 text-xs mb-3">{data.notice}</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.scale.labels).map(([k, v]) => (
            <span
              key={k}
              className="px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600"
            >
              {k}. {v}
            </span>
          ))}
        </div>
      </div>

      {/* 차원별 문항 */}
      <div className="space-y-4">
        {data.dimensions.map((d) => {
          const items = grouped.get(d.key) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={d.key} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-gray-900">
                  {d.label}
                </span>
                <span className="text-xs text-gray-400">
                  {d.key} · {items.length}문항
                </span>
              </div>
              <ol className="space-y-2">
                {items.map((q) => (
                  <li
                    key={q.id}
                    className="flex gap-3 text-sm text-gray-800 border-t border-gray-100 pt-2 first:border-t-0 first:pt-0"
                  >
                    <span className="text-gray-400 w-8 shrink-0">
                      Q{q.questionNo}
                    </span>
                    <span className="flex-1">{q.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        총 {data.questions.length}문항
      </div>
    </div>
  );
}
