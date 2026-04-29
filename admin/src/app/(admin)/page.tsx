import { adminFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    { label: "전체 사용자", value: stats?.users ?? "-", icon: Users },
    { label: "등록된 아기", value: stats?.children ?? "-", icon: Baby },
    { label: "활성 배너", value: stats?.banners ?? "-", icon: Image },
    {
      label: "결제 완료",
      value: stats ? `${stats.payments.paid} / ${stats.payments.total}` : "-",
      icon: CreditCard,
    },
    {
      label: "총 매출 (KRW)",
      value: stats ? stats.revenue.toLocaleString() + "원" : "-",
      icon: Banknote,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">대시보드</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
