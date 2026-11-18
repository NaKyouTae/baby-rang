import Link from "next/link";
import { adminFetch } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { StatStrip } from "@/components/data-table";
import { cn } from "@/lib/utils";
import { CoinsTable, type CoinRow } from "./CoinsTable";
import { REASONS } from "./reasons";

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  const reason = sp.reason ?? "";
  let data = { items: [] as CoinRow[], total: 0, page: 1, limit: 100 };
  try {
    data = await adminFetch(
      `/admin/coin-ledgers?page=${page}&limit=100${reason ? `&reason=${reason}` : ""}`,
    );
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const sum = (r: string) => data.items.filter((c) => c.reason === r).reduce((s, c) => s + c.delta, 0);
  const filters = [{ value: "", label: "전체" }, ...REASONS];

  return (
    <div className="space-y-4">
      <PageHeader
        title="보석함"
        description="결제·광고·기록 보상·가입으로 보석을 받은 내역입니다. 사용자는 기록·광고·결제를 한 사람이고, 보석은 그 가족이 함께 씁니다."
      />

      <StatStrip
        items={[
          { label: "받은 건수", value: data.total },
          { label: "결제로 받은 보석", value: `${sum("PURCHASE").toLocaleString()}개` },
          { label: "광고로 받은 보석", value: `${sum("AD_REWARD").toLocaleString()}개` },
          { label: "기록 보상", value: `${sum("REWARD").toLocaleString()}개` },
        ]}
      />

      <CoinsTable
        items={data.items}
        toolbar={
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {filters.map((f) => (
              <Link
                key={f.value || "all"}
                href={`/coins${f.value ? `?reason=${f.value}` : ""}`}
                className={cn(
                  "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
                  reason === f.value && "bg-background text-foreground shadow-xs",
                )}
              >
                {f.label}
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
              href={`/coins?page=${pg}${reason ? `&reason=${reason}` : ""}`}
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
