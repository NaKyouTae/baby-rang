"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, SortHeader } from "@/components/data-table";
import { formatDateTime } from "@/lib/utils";
import { RefundButton } from "./RefundButton";
import { PAYMENT_STATUS } from "./status";

export type PaymentRow = {
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
  user: { id: string; name: string | null; email: string | null } | null;
};

const PROVIDER_LABEL: Record<string, string> = {
  TOSS: "토스",
  APP_STORE: "App Store",
  GOOGLE_PLAY: "Google Play",
};

const columns: ColumnDef<PaymentRow>[] = [
  {
    id: "product",
    accessorFn: (p) => `${p.productName} ${p.orderId}`,
    header: ({ column }) => <SortHeader label="상품" column={column} />,
    sortingFn: (a, b) => a.original.productName.localeCompare(b.original.productName, "ko"),
    enableHiding: false,
    meta: { label: "상품" },
    cell: ({ row: { original: p } }) => (
      <div>
        <div className="font-medium">{p.productName}</div>
        <div className="font-mono text-xs text-muted-foreground">{p.orderId}</div>
      </div>
    ),
  },
  {
    id: "user",
    accessorFn: (p) => `${p.user?.name ?? ""} ${p.user?.email ?? ""}`,
    header: "사용자",
    enableSorting: false,
    meta: { label: "사용자" },
    cell: ({ row: { original: p } }) => (
      <div>
        <div>{p.user?.name ?? "-"}</div>
        <div className="text-xs text-muted-foreground">{p.user?.email ?? ""}</div>
      </div>
    ),
  },
  {
    id: "amount",
    accessorFn: (p) => p.amount,
    header: ({ column }) => <SortHeader label="금액" column={column} align="right" />,
    meta: { label: "금액", align: "right" },
    cell: ({ row: { original: p } }) => <span className="font-medium">{p.amount.toLocaleString()}원</span>,
  },
  {
    id: "status",
    accessorFn: (p) => PAYMENT_STATUS[p.status]?.label ?? p.status,
    header: "상태",
    enableSorting: false,
    meta: { label: "상태" },
    cell: ({ row: { original: p } }) => {
      const s = PAYMENT_STATUS[p.status];
      return <Badge variant={s?.variant ?? "secondary"}>{s?.label ?? p.status}</Badge>;
    },
  },
  {
    id: "provider",
    accessorFn: (p) => p.method ?? PROVIDER_LABEL[p.provider] ?? p.provider,
    header: "결제수단",
    enableSorting: false,
    meta: { label: "결제수단", className: "text-muted-foreground" },
  },
  {
    id: "createdAt",
    accessorFn: (p) => new Date(p.createdAt).getTime(),
    header: ({ column }) => <SortHeader label="일시" column={column} align="right" />,
    meta: { label: "일시", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: p } }) => formatDateTime(p.createdAt),
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableHiding: false,
    meta: { align: "right" },
    cell: ({ row: { original: p } }) => (
      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
        {p.receiptUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
              영수증
            </a>
          </Button>
        )}
        <RefundButton orderId={p.orderId} amount={p.amount} status={p.status} provider={p.provider} />
      </div>
    ),
  },
];

export function PaymentsTable({ items, toolbar }: { items: PaymentRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      columns={columns}
      data={items}
      searchPlaceholder="상품, 주문번호, 사용자 검색"
      emptyText="결제 내역이 없습니다."
      toolbar={toolbar}
    />
  );
}
