"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortHeader } from "@/components/data-table";
import { formatDateTime } from "@/lib/utils";

export type BotRow = { bot: string; total: number; lastSeenAt: string | null };
export type PathRow = { path: string; total: number };

const share = (n: number, total: number) => (total ? `${Math.round((n / total) * 100)}%` : "-");

export function BotsTable({ items }: { items: BotRow[] }) {
  const total = items.reduce((s, b) => s + b.total, 0);
  const columns: ColumnDef<BotRow>[] = [
    {
      id: "bot",
      accessorFn: (b) => b.bot,
      header: ({ column }) => <SortHeader label="크롤러" column={column} />,
      enableHiding: false,
      meta: { label: "크롤러" },
      cell: ({ row: { original: b } }) => <span className="font-medium">{b.bot}</span>,
    },
    {
      id: "total",
      accessorFn: (b) => b.total,
      header: ({ column }) => <SortHeader label="방문" column={column} align="right" />,
      meta: { label: "방문", align: "right" },
      cell: ({ row: { original: b } }) => `${b.total.toLocaleString()}회`,
    },
    {
      id: "share",
      accessorFn: (b) => b.total,
      header: "비중",
      enableSorting: false,
      meta: { label: "비중", align: "right", className: "text-muted-foreground" },
      cell: ({ row: { original: b } }) => share(b.total, total),
    },
    {
      id: "lastSeenAt",
      accessorFn: (b) => (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0),
      header: ({ column }) => <SortHeader label="마지막 방문" column={column} align="right" />,
      meta: { label: "마지막 방문", align: "right", className: "text-muted-foreground" },
      cell: ({ row: { original: b } }) => (b.lastSeenAt ? formatDateTime(b.lastSeenAt) : "-"),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={items}
      searchPlaceholder="크롤러 검색"
      emptyText="아직 수집된 방문이 없습니다. 크롤러가 오기까지 며칠 걸릴 수 있습니다."
      initialSorting={[{ id: "total", desc: true }]}
    />
  );
}

export function PathsTable({ items }: { items: PathRow[] }) {
  const total = items.reduce((s, p) => s + p.total, 0);
  const columns: ColumnDef<PathRow>[] = [
    {
      id: "path",
      accessorFn: (p) => p.path,
      header: ({ column }) => <SortHeader label="페이지" column={column} />,
      enableHiding: false,
      meta: { label: "페이지", className: "font-mono text-xs" },
    },
    {
      id: "total",
      accessorFn: (p) => p.total,
      header: ({ column }) => <SortHeader label="읽힌 횟수" column={column} align="right" />,
      meta: { label: "읽힌 횟수", align: "right" },
      cell: ({ row: { original: p } }) => `${p.total.toLocaleString()}회`,
    },
    {
      id: "share",
      accessorFn: (p) => p.total,
      header: "비중",
      enableSorting: false,
      meta: { label: "비중", align: "right", className: "text-muted-foreground" },
      cell: ({ row: { original: p } }) => share(p.total, total),
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={items}
      searchPlaceholder="경로 검색"
      emptyText="아직 수집된 페이지가 없습니다."
      initialSorting={[{ id: "total", desc: true }]}
    />
  );
}
