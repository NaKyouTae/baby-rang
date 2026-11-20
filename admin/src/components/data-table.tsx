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
  /** 폰 카드에서 뺄 덜 중요한 열 */
  mobileHidden?: boolean;
};

/**
 * 어드민 공통 표. 검색·정렬·열 보기·페이지를 브라우저에서 처리한다(한 번에 받은 행 기준).
 * 위쪽 toolbar 자리에 화면마다 필터 버튼을 넣는다.
 * 폰(md 미만)에서는 표 대신 행마다 카드로 그린다. 첫 열이 제목, id 가 "actions" 인 열은 오른쪽 위 버튼이 된다.
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
  const sortable = table.getAllLeafColumns().filter((c) => c.getCanSort() && c.getIsVisible() && c.id !== "actions");

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
        {sortable.length > 0 && (
          <select
            value={sorting[0] ? `${sorting[0].id}:${sorting[0].desc ? "desc" : "asc"}` : ""}
            onChange={(e) => {
              const [sid, dir] = e.target.value.split(":");
              setSorting(sid ? [{ id: sid, desc: dir === "desc" }] : []);
            }}
            className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm md:hidden"
            aria-label="정렬"
          >
            <option value="">기본 순서</option>
            {sortable.flatMap((c) => {
              const label = (c.columnDef.meta as ColumnMeta | undefined)?.label ?? c.id;
              return [
                <option key={`${c.id}:desc`} value={`${c.id}:desc`}>{label} ↓</option>,
                <option key={`${c.id}:asc`} value={`${c.id}:asc`}>{label} ↑</option>,
              ];
            })}
          </select>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9" aria-label="열 보기">
              <Settings2 />
              <span className="hidden sm:inline">열 보기</span>
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

      {/* 폰: 행마다 카드 */}
      <ul className="divide-y md:hidden">
        {table.getRowModel().rows.map((row) => {
          const cells = row.getVisibleCells();
          const [head, ...rest] = cells;
          const actions = rest.find((c) => c.column.id === "actions");
          const fields = rest.filter((c) => c !== actions && !(c.column.columnDef.meta as ColumnMeta | undefined)?.mobileHidden);
          return (
            <li
              key={row.id}
              className={cn("px-4 py-3", onRowClick && "cursor-pointer active:bg-muted/50")}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm">{head && flexRender(head.column.columnDef.cell, head.getContext())}</div>
                {actions && (
                  <div className="-mt-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {flexRender(actions.column.columnDef.cell, actions.getContext())}
                  </div>
                )}
              </div>
              {fields.length > 0 && (
                <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                  {fields.map((c) => {
                    const meta = c.column.columnDef.meta as ColumnMeta | undefined;
                    return (
                      <React.Fragment key={c.id}>
                        <dt className="text-xs leading-5 text-muted-foreground">{meta?.label ?? c.column.id}</dt>
                        <dd className={cn("min-w-0 break-words text-right", meta?.className)}>
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </dd>
                      </React.Fragment>
                    );
                  })}
                </dl>
              )}
            </li>
          );
        })}
        {filtered === 0 && <li className="py-10 text-center text-sm text-muted-foreground">{emptyText}</li>}
      </ul>

      <Table className="max-md:hidden">
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
