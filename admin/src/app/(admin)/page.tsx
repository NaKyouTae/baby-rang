import { adminFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Users, Baby, Image, CreditCard, Banknote } from "lucide-react";

type Stats = {
  users: number;
  children: number;
  banners: number;
  payments: { paid: number; total: number };
  revenue: number;
};

export default async function DashboardPage() {
  let stats: Stats | null = null;
  try {
    stats = await adminFetch<Stats>("/admin/stats");
  } catch {}

  const cards = [
    {
      label: "전체 사용자",
      value: stats?.users ?? "-",
      icon: Users,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "등록된 아기",
      value: stats?.children ?? "-",
      icon: Baby,
      tone: "bg-pink-50 text-pink-600",
    },
    {
      label: "활성 배너",
      value: stats?.banners ?? "-",
      icon: Image,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "결제 완료",
      value: stats ? `${stats.payments.paid} / ${stats.payments.total}` : "-",
      icon: CreditCard,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "총 매출 (KRW)",
      value: stats ? stats.revenue.toLocaleString() + "원" : "-",
      icon: Banknote,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="아기랑 서비스의 핵심 지표를 한눈에 확인하세요."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card
              key={c.label}
              className="p-5 transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {c.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">
                {c.value}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
