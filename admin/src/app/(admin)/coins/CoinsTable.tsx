"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable, SortHeader } from "@/components/data-table";
import { formatDateTime } from "@/lib/utils";
import { reasonOf } from "./reasons";

export type CoinRow = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
  payment: { productName: string; amount: number } | null;
  group: { id: string; coins: number; memberCount: number };
};

const columns: ColumnDef<CoinRow>[] = [
  {
    id: "user",
    accessorFn: (c) => `${c.user?.name ?? ""} ${c.user?.email ?? ""}`,
    header: ({ column }) => <SortHeader label="사용자" column={column} />,
    sortingFn: (a, b) => (a.original.user?.name ?? "").localeCompare(b.original.user?.name ?? "", "ko"),
    enableHiding: false,
    meta: { label: "사용자" },
    cell: ({ row: { original: c } }) => (
      <div>
        <div className="font-medium">{c.user?.name ?? c.user?.email ?? "-"}</div>
        {c.user?.name && c.user.email && <div className="text-xs text-muted-foreground">{c.user.email}</div>}
      </div>
    ),
  },
  {
    id: "reason",
    accessorFn: (c) => reasonOf(c.reason).label,
    header: "방법",
    enableSorting: false,
    meta: { label: "방법" },
    cell: ({ row: { original: c } }) => {
      const r = reasonOf(c.reason);
      return <Badge variant={r.variant}>{r.label}</Badge>;
    },
  },
  {
    id: "delta",
    accessorFn: (c) => c.delta,
    header: ({ column }) => <SortHeader label="보석" column={column} align="right" />,
    meta: { label: "보석", align: "right" },
    cell: ({ row: { original: c } }) => <span className="font-medium">+{c.delta}개</span>,
  },
  {
    id: "detail",
    accessorFn: (c) => (c.payment ? `${c.payment.productName}` : `가족 ${c.group.memberCount}명`),
    header: "상세",
    enableSorting: false,
    meta: { label: "상세", className: "text-muted-foreground" },
    cell: ({ row: { original: c } }) =>
      c.payment
        ? `${c.payment.productName} · ${c.payment.amount.toLocaleString()}원`
        : `가족 ${c.group.memberCount}명`,
  },
  {
    id: "balance",
    accessorFn: (c) => c.group.coins,
    header: ({ column }) => <SortHeader label="현재 잔액" column={column} align="right" />,
    meta: { label: "현재 잔액", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: c } }) => `${c.group.coins.toLocaleString()}개`,
  },
  {
    id: "createdAt",
    accessorFn: (c) => new Date(c.createdAt).getTime(),
    header: ({ column }) => <SortHeader label="일시" column={column} align="right" />,
    meta: { label: "일시", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: c } }) => formatDateTime(c.createdAt),
  },
];

export function CoinsTable({ items, toolbar }: { items: CoinRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      columns={columns}
      data={items}
      searchPlaceholder="사용자, 상품 검색"
      emptyText="보석을 받은 내역이 없습니다."
      toolbar={toolbar}
    />
  );
}
