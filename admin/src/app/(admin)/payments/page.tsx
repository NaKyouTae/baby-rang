import Link from "next/link";
import { adminFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatStrip } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { PaymentsTable, type PaymentRow } from "./PaymentsTable";
import { PAYMENT_STATUS } from "./status";

const FILTERS = ["", "PAID", "PENDING", "FAILED", "CANCELLED", "REFUNDED"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  const status = sp.status ?? "";
  let data = { items: [] as PaymentRow[], total: 0, page: 1, limit: 100 };
  try {
    // 표에서 바로 검색·정렬하도록 100건씩 받는다
    data = await adminFetch(
      `/admin/payments?page=${page}&limit=100${status ? `&status=${status}` : ""}`,
    );
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const paid = data.items.filter((p) => p.status === "PAID");
  const revenue = paid.reduce((s, p) => s + p.amount, 0);
  const payers = new Set(paid.map((p) => p.user?.id).filter(Boolean)).size;
  const refunded = data.items.filter((p) => p.status === "REFUNDED" || p.status === "PARTIAL_REFUNDED").length;

  return (
    <div className="space-y-4">
      <PageHeader title="결제 내역" description="결제·환불 내역을 확인하고 토스 결제는 여기서 환불합니다." />

      <StatStrip
        items={[
          { label: "결제 건수", value: data.total, hint: status ? PAYMENT_STATUS[status]?.label : "전체 상태" },
          { label: "결제완료 금액", value: `${revenue.toLocaleString()}원`, hint: "이 화면에 받은 건 기준" },
          { label: "결제한 사용자", value: payers },
          { label: "환불", value: refunded },
        ]}
      />

      <PaymentsTable
        items={data.items}
        toolbar={
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {FILTERS.map((f) => (
              <Link
                key={f || "all"}
                href={`/payments${f ? `?status=${f}` : ""}`}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                  status === f && "bg-background text-foreground shadow-xs",
                )}
              >
                {f ? PAYMENT_STATUS[f]?.label ?? f : "전체"}
              </Link>
            ))}
          </div>
        }
      />

      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <Link
              key={pg}
              href={`/payments?page=${pg}${status ? `&status=${status}` : ""}`}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm",
                pg === data.page ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
              )}
            >
              {pg}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
