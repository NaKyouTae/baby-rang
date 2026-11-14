import { adminFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CoinRow = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
  payment: { productName: string; amount: number } | null;
  group: { id: string; coins: number; memberCount: number };
};

const REASONS: { value: string; label: string; variant: "success" | "warning" | "info" | "purple" | "secondary" }[] = [
  { value: "PURCHASE", label: "결제", variant: "success" },
  { value: "AD_REWARD", label: "광고", variant: "warning" },
  { value: "REWARD", label: "기록 보상", variant: "info" },
  { value: "SIGNUP", label: "가입", variant: "purple" },
];

const reasonOf = (value: string) =>
  REASONS.find((r) => r.value === value) ?? { value, label: value, variant: "secondary" as const };

const userLabel = (u: CoinRow["user"]) => u?.name ?? u?.email ?? "-";

export default async function CoinsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  const reason = sp.reason ?? "";
  let data = { items: [] as CoinRow[], total: 0, page: 1, limit: 20 };
  try {
    data = await adminFetch(
      `/admin/coin-ledgers?page=${page}&limit=20${reason ? `&reason=${reason}` : ""}`,
    );
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const filters = [{ value: "", label: "전체" }, ...REASONS];

  return (
    <div>
      <PageHeader
        title="보석함"
        description="결제·광고·기록 보상·가입으로 보석을 받은 내역입니다. 보석은 가족 단위라, 결제가 아니면 가족 대표를 사용자로 표시합니다."
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <Button
            key={f.value || "all"}
            variant={reason === f.value ? "default" : "outline"}
            size="sm"
            asChild
          >
            <a href={`/coins${f.value ? `?reason=${f.value}` : ""}`}>{f.label}</a>
          </Button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map((c) => {
          const r = reasonOf(c.reason);
          return (
            <Card key={c.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-medium truncate">{userLabel(c.user)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.payment
                      ? `${c.payment.productName} · ${c.payment.amount.toLocaleString()}원`
                      : `가족 ${c.group.memberCount}명`}
                  </div>
                </div>
                <Badge variant={r.variant} className="text-[10px]">
                  {r.label}
                </Badge>
              </div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">+{c.delta}개</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>사용자</TableHead>
              <TableHead>방법</TableHead>
              <TableHead className="text-right">보석</TableHead>
              <TableHead>상세</TableHead>
              <TableHead className="text-right">현재 잔액</TableHead>
              <TableHead className="text-right">일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((c) => {
              const r = reasonOf(c.reason);
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{userLabel(c.user)}</div>
                    {c.user?.name && c.user.email && (
                      <div className="text-xs text-muted-foreground">{c.user.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.variant} className="text-[10px]">
                      {r.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">+{c.delta}개</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.payment
                      ? `${c.payment.productName} · ${c.payment.amount.toLocaleString()}원`
                      : `가족 ${c.group.memberCount}명`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {c.group.coins.toLocaleString()}개
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <Button
              key={pg}
              variant={pg === data.page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <a href={`/coins?page=${pg}${reason ? `&reason=${reason}` : ""}`}>{pg}</a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
