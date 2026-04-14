import { adminFetch } from "@/lib/api";
import { RefundButton } from "./RefundButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PaymentRow = {
  id: string;
  orderId: string;
  productName: string;
  productType: string;
  amount: number;
  status: string;
  provider: string;
  method: string | null;
  receiptUrl: string | null;
  createdAt: string;
  user: { id: string; nickname: string | null; email: string | null } | null;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary" | "purple"> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "destructive",
  CANCELLED: "secondary",
  REFUNDED: "purple",
  PARTIAL_REFUNDED: "purple",
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = sp.page ?? "1";
  const status = sp.status ?? "";
  let data = { items: [] as PaymentRow[], total: 0, page: 1, limit: 20 };
  try {
    data = await adminFetch(
      `/admin/payments?page=${page}&limit=20${status ? `&status=${status}` : ""}`,
    );
  } catch {}
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  const filters = ["", "PAID", "PENDING", "FAILED", "CANCELLED", "REFUNDED"];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">결제 내역</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <Button
            key={f || "all"}
            variant={status === f ? "default" : "outline"}
            size="sm"
            asChild
          >
            <a href={`/payments${f ? `?status=${f}` : ""}`}>{f || "전체"}</a>
          </Button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.items.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-medium truncate">{p.productName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.user?.nickname ?? p.user?.email ?? "-"}
                </div>
              </div>
              <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="text-[10px]">
                {p.status}
              </Badge>
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>{p.amount.toLocaleString()}원</span>
              <span>{new Date(p.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-3 flex gap-2">
              {p.receiptUrl && (
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                    영수증
                  </a>
                </Button>
              )}
              <RefundButton
                orderId={p.orderId}
                amount={p.amount}
                status={p.status}
                variant="card"
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>상품</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>결제수단</TableHead>
              <TableHead className="text-right">일시</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.productName}</div>
                  <div className="text-xs text-muted-foreground">{p.productType}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.user?.nickname ?? p.user?.email ?? "-"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {p.amount.toLocaleString()}원
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"} className="text-[10px]">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.method ?? p.provider}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {p.receiptUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                          영수증
                        </a>
                      </Button>
                    )}
                    <RefundButton
                      orderId={p.orderId}
                      amount={p.amount}
                      status={p.status}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
              <a href={`/payments?page=${pg}${status ? `&status=${status}` : ""}`}>{pg}</a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
