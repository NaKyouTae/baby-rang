"use client";

import * as React from "react";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** 열 머리글. meta.label 이 있으면 그 이름을, 정렬 가능한 열이면 정렬 버튼을 그린다. */
export function SortHeader({
  label,
  column,
  align = "left",
}: {
  label: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void; getCanSort: () => boolean };
  align?: "left" | "right";
}) {
  if (!column.getCanSort()) return <span>{label}</span>;
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-mx-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 hover:bg-accent hover:text-foreground",
        align === "right" && "flex-row-reverse",
        sorted && "text-foreground",
      )}
    >
      {label}
      <Icon className={cn("h-3.5 w-3.5", !sorted && "opacity-40")} />
    </button>
  );
}

export type ColumnMeta = {
  /** 열 보기 메뉴에 쓰는 이름 */
  label?: string;
  align?: "left" | "right";
  className?: string;
};

/**
 * 어드민 공통 표. 검색·정렬·열 보기·페이지를 브라우저에서 처리한다(한 번에 받은 행 기준).
 * 위쪽 toolbar 자리에 화면마다 필터 버튼을 넣는다.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "검색",
  toolbar,
  pageSize = 20,
  onRowClick,
  emptyText = "결과가 없습니다.",
  initialSorting = [],
  initialHidden = {},
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  emptyText?: string;
  initialSorting?: SortingState;
  initialHidden?: VisibilityState;
}) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialHidden);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const filtered = table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const from = filtered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(filtered, (pageIndex + 1) * pageSize);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
        {toolbar}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9">
              <Settings2 />열 보기
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>보일 열</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {(c.columnDef.meta as ColumnMeta | undefined)?.label ?? c.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Table>
        <TableHeader className="bg-muted/40">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id} className="hover:bg-transparent">
              {hg.headers.map((h) => {
                const meta = h.column.columnDef.meta as ColumnMeta | undefined;
                return (
                  <TableHead
                    key={h.id}
                    className={cn("whitespace-nowrap text-xs", meta?.align === "right" && "text-right", meta?.className)}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(onRowClick && "cursor-pointer")}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                return (
                  <TableCell
                    key={cell.id}
                    className={cn("whitespace-nowrap", meta?.align === "right" && "text-right", meta?.className)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {filtered === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-28 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-sm text-muted-foreground">
        <span className="tabular-nums">
          {filtered}건 중 {from}–{to}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="이전 페이지"
          >
            <ChevronLeft />
          </Button>
          <span className="px-2 tabular-nums">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="다음 페이지"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 표 위 요약 숫자 한 줄 */
export function StatStrip({ items }: { items: { label: string; value: React.ReactNode; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-xs md:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            "min-w-0 p-4",
            i % 2 === 0 && "border-r md:border-r",
            i < 2 && "border-b md:border-b-0",
            i % 4 !== 3 && "md:border-r",
          )}
        >
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{it.value}</div>
          {it.hint && <div className="mt-0.5 text-xs text-muted-foreground">{it.hint}</div>}
        </div>
      ))}
    </div>
  );
}
