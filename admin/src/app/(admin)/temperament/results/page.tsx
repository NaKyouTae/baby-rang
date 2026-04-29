import Link from "next/link";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Level = "low" | "medium" | "high";

type DimensionScore = {
  raw: number;
  score: number;
  level: Level;
  label: string;
};

type StrengthItem = { title: string; description: string };

type PaidContent = {
  typeDetail: string;
  dimensionDetails: Record<
    string,
    { score: number; level: Level; description: string; parentTips: string[] }
  >;
  strengths: StrengthItem[];
  cautions: StrengthItem[];
  emotionCoaching: {
    title: string;
    tips: { action: string; example: string }[];
  };
  learningStyle: { recommended: string[]; difficult: string[] };
  socialGuide: { patterns: string[]; parentTips: string[] };
  routineGuide: string[];
  combinationInsight: {
    dimensions: string[];
    label: string;
    description: string;
  } | null;
  parentAdvice: string[];
  closingMessage: string;
};

type TypeResult = {
  primaryType: string;
  primaryTypeLabel: string;
  scores: Record<string, DimensionScore>;
  summary: {
    primaryType: string;
    primaryTypeLabel: string;
    emotionModifier: boolean;
    title: string;
    description: string;
  };
  freeContent: { strengths: string[]; tip: string };
  paidContent: PaidContent;
};

type Resp = {
  emotionModifier: boolean;
  results: TypeResult[];
};

const TYPES = [
  { key: "explorer", label: "탐험가형" },
  { key: "socializer", label: "사교가형" },
  { key: "observer", label: "관찰자형" },
  { key: "concentrator", label: "집중가형" },
  { key: "balanced", label: "균형성장형" },
];

const LOCKED_SECTIONS = [
  "우리 아기의 숨은 강점 3가지",
  "감정이 흔들릴 때 필요한 부모 대응법",
  "아기에게 잘 맞는 학습 방식",
  "기질별 주의 포인트",
  "부모가 놓치기 쉬운 신호",
];

export default async function TemperamentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ emotion?: string; paid?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const emotion = sp.emotion === "1";
  const paid = sp.paid === "1";
  const selected = sp.type ?? "";

  let data: Resp | null = null;
  try {
    data = await adminFetch<Resp>(
      `/admin/temperament/results?emotion=${emotion ? "1" : "0"}`,
    );
  } catch {}

  if (!data) {
    return <div className="text-muted-foreground">결과를 불러오지 못했습니다.</div>;
  }

  const filtered = selected
    ? data.results.filter((r) => r.primaryType === selected)
    : data.results;

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      type: selected || undefined,
      emotion: emotion ? "1" : undefined,
      paid: paid ? "1" : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/temperament/results${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight">기질 검사 결과지</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/temperament/questions">문항 보기 →</Link>
        </Button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <Button
          variant={!selected ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href={buildHref({ type: undefined })}>전체</Link>
        </Button>
        {TYPES.map((t) => (
          <Button
            key={t.key}
            variant={t.key === selected ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildHref({ type: t.key })}>{t.label}</Link>
          </Button>
        ))}
      </div>

      {/* Toggles */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className={paid ? "bg-purple-100 border-purple-200 text-purple-800 hover:bg-purple-200" : ""}
          asChild
        >
          <Link href={buildHref({ paid: paid ? undefined : "1" })}>
            {paid ? "✓ 결제 완료(유료 공개)" : "미결제 (잠금 화면)"}
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={emotion ? "bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200" : ""}
          asChild
        >
          <Link href={buildHref({ emotion: emotion ? undefined : "1" })}>
            {emotion ? "✓ 감정 강화 ON" : "감정 강화 OFF"}
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        실제 사용자가 보는 결과 화면 구조를 동일한 모바일 폭(390px)으로 재현합니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {filtered.map((r) => (
          <PhoneFrame key={r.primaryType} label={r.primaryTypeLabel}>
            <ResultView result={r} paid={paid} />
          </PhoneFrame>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-semibold mb-2">{label}</div>
      <div
        className="bg-black rounded-[2rem] p-1.5 shadow-xl"
        style={{ width: 322 }}
      >
        <div
          className="rounded-[1.6rem] bg-white overflow-y-auto"
          style={{ width: 310, height: 670 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const TYPE_STYLES: Record<
  string,
  { gradient: string; badge: string; emoji: string }
> = {
  explorer: {
    gradient: "from-orange-400 to-amber-300",
    badge: "bg-orange-100 text-orange-600",
    emoji: "🧭",
  },
  socializer: {
    gradient: "from-pink-400 to-rose-300",
    badge: "bg-pink-100 text-pink-600",
    emoji: "💬",
  },
  observer: {
    gradient: "from-indigo-400 to-violet-300",
    badge: "bg-indigo-100 text-indigo-600",
    emoji: "🔍",
  },
  concentrator: {
    gradient: "from-emerald-400 to-teal-300",
    badge: "bg-emerald-100 text-emerald-600",
    emoji: "🎯",
  },
  balanced: {
    gradient: "from-sky-400 to-cyan-300",
    badge: "bg-sky-100 text-sky-600",
    emoji: "⚖️",
  },
};

const DIMENSION_ORDER = [
  "activity", "adaptability", "emotional_intensity",
  "sociability", "persistence", "sensitivity",
];

const DIMENSION_LABELS: Record<string, string> = {
  activity: "활동성",
  adaptability: "적응성",
  emotional_intensity: "감정 표현 강도",
  sociability: "사회성",
  persistence: "집중 지속성",
  sensitivity: "민감성",
};

const LEVEL_BAR: Record<Level, string> = {
  low: "bg-gray-300",
  medium: "bg-slate-400",
  high: "bg-slate-700",
};

function ResultView({ result, paid }: { result: TypeResult; paid: boolean }) {
  return (
    <main className="min-h-full pb-8">
      <ResultCover
        primaryType={result.summary.primaryType}
        primaryTypeLabel={result.summary.primaryTypeLabel}
        title={result.summary.title}
        description={result.summary.description}
      />
      <DimensionBar scores={result.scores} />
      <div className="px-4 mt-2">
        <h3 className="text-base font-bold text-gray-900 mb-3">지금 보이는 강점</h3>
        {result.freeContent.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <span className="text-emerald-500 mt-0.5 text-sm">✓</span>
            <p className="text-sm text-gray-700">{s}</p>
          </div>
        ))}
      </div>
      <div className="px-4 mt-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-1">짧은 양육 팁</p>
          <p className="text-sm text-gray-700">{result.freeContent.tip}</p>
        </div>
      </div>
      {paid ? (
        <PaidResultSection content={result.paidContent} />
      ) : (
        <LockedSection sections={LOCKED_SECTIONS} />
      )}
      <div className="px-4 mt-6">
        <p className="text-[11px] text-gray-300 text-center leading-relaxed">
          이 검사는 아기의 기질 경향을 이해하기 위한 참고 자료이며, 의학적 진단이나 전문 심리 평가를 대신하지 않습니다.
        </p>
      </div>
    </main>
  );
}

function ResultCover({
  primaryType,
  primaryTypeLabel,
  title,
  description,
}: {
  primaryType: string;
  primaryTypeLabel: string;
  title: string;
  description: string;
}) {
  const style = TYPE_STYLES[primaryType] || TYPE_STYLES.balanced;
  return (
    <div className={`bg-gradient-to-br ${style.gradient} rounded-3xl p-6 mx-4 mt-4 shadow-lg`}>
      <div className="text-center">
        <span className="text-7xl block mx-auto mb-3">{style.emoji}</span>
        <span className={`inline-block ${style.badge} text-sm font-bold px-4 py-1.5 rounded-full mb-3`}>
          {primaryTypeLabel}
        </span>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-white/80 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function DimensionBar({ scores }: { scores: Record<string, DimensionScore> }) {
  return (
    <div className="px-4 py-4">
      <h3 className="text-base font-bold text-gray-900 mb-4">기질 한눈에 보기</h3>
      <div className="space-y-3">
        {DIMENSION_ORDER.map((key) => {
          const dim = scores[key];
          if (!dim) return null;
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">{dim.label}</span>
                <span className="text-sm font-semibold text-slate-600">{dim.score}</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${LEVEL_BAR[dim.level]}`}
                  style={{ width: `${dim.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockedSection({ sections }: { sections: string[] }) {
  return (
    <div className="mx-4 mt-6 rounded-3xl bg-slate-50 p-5 relative overflow-hidden border border-slate-200">
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative z-10">
        <div className="text-center mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-sm text-gray-500 text-center mb-4">
          무료 결과에서는 대표 기질만 확인할 수 있어요.
        </p>
        <ul className="space-y-2.5 mb-5">
          {sections.map((section) => (
            <li key={section} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-4 h-4 rounded border border-slate-200 flex-shrink-0" />
              {section}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-400 text-center mb-4">
          전체 결과를 열면 아기의 강점, 예민 포인트, 감정 코칭법, 학습 스타일까지 자세히 볼 수 있어요.
        </p>
        <button
          type="button"
          className="w-full py-3.5 gradient-btn text-white font-semibold rounded-xl shadow-lg"
        >
          전체 결과 보기
        </button>
      </div>
    </div>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function PaidResultSection({ content }: { content: PaidContent }) {
  return (
    <div className="pb-8">
      <ResultCard title="대표 유형 상세 설명">
        <p className="text-sm text-gray-600 leading-relaxed">{content.typeDetail}</p>
      </ResultCard>

      <ResultCard title="6개 기질 상세 분석">
        <div className="space-y-5">
          {Object.entries(content.dimensionDetails).map(([key, detail]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-semibold text-gray-800">
                  {DIMENSION_LABELS[key] || key}
                </span>
                <span className="text-xs text-slate-500 font-medium">{detail.score}점</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">{detail.description}</p>
              {detail.parentTips.map((tip, i) => (
                <p key={i} className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2 mb-1">
                  {tip}
                </p>
              ))}
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="우리 아기의 핵심 강점">
        <div className="space-y-3">
          {content.strengths.map((s, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-800">{s.title}</p>
              <p className="text-sm text-gray-500">{s.description}</p>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="부모가 놓치기 쉬운 주의 포인트">
        <div className="space-y-3">
          {content.cautions.map((c, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-800">{c.title}</p>
              <p className="text-sm text-gray-500">{c.description}</p>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title={content.emotionCoaching.title}>
        <div className="space-y-3">
          {content.emotionCoaching.tips.map((tip, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-800 mb-1">{tip.action}</p>
              <p className="text-xs text-gray-500 italic">예: &quot;{tip.example}&quot;</p>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="학습 스타일 제안">
        <div className="mb-3">
          <p className="text-xs font-semibold text-emerald-600 mb-2">잘 맞을 수 있는 방식</p>
          <ul className="space-y-1">
            {content.learningStyle.recommended.map((r, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-red-400 mb-2">힘들 수 있는 방식</p>
          <ul className="space-y-1">
            {content.learningStyle.difficult.map((d, i) => (
              <li key={i} className="text-sm text-gray-500 flex items-start gap-1.5">
                <span className="text-red-300 mt-0.5">✕</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      </ResultCard>

      <ResultCard title="친구 관계 가이드">
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">관계에서 보일 수 있는 모습</p>
          <ul className="space-y-1">
            {content.socialGuide.patterns.map((p, i) => (
              <li key={i} className="text-sm text-gray-600">• {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">부모 도움 팁</p>
          {content.socialGuide.parentTips.map((t, i) => (
            <p key={i} className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2 mb-1">
              {t}
            </p>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="생활 루틴 가이드">
        <ul className="space-y-1.5">
          {content.routineGuide.map((r, i) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
              <span className="text-slate-400 mt-0.5">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </ResultCard>

      {content.combinationInsight && (
        <ResultCard title="기질 조합 해석">
          <div className="bg-gradient-to-br from-slate-50 to-pink-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {content.combinationInsight.label}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {content.combinationInsight.description}
            </p>
          </div>
        </ResultCard>
      )}

      <ResultCard title="부모를 위한 한 줄 제안">
        <div className="space-y-2">
          {content.parentAdvice.map((a, i) => (
            <p key={i} className="text-sm text-gray-700 bg-amber-50 rounded-xl px-4 py-3">
              {a}
            </p>
          ))}
        </div>
      </ResultCard>

      <div className="mx-4 mt-8">
        <div className="bg-gradient-to-br from-slate-50 to-amber-50 rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-gray-800 leading-relaxed">
            &quot;{content.closingMessage}&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
