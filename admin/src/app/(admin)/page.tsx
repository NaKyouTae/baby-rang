import { adminFetch } from "@/lib/api";

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
    { label: "전체 사용자", value: stats?.users ?? "-" },
    { label: "등록된 아이", value: stats?.children ?? "-" },
    { label: "활성 배너", value: stats?.banners ?? "-" },
    {
      label: "결제 완료",
      value: stats ? `${stats.payments.paid} / ${stats.payments.total}` : "-",
    },
    {
      label: "총 매출 (KRW)",
      value: stats ? stats.revenue.toLocaleString() + "원" : "-",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="text-xs text-gray-500">{c.label}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
