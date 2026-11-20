"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, SortHeader } from "@/components/data-table";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "@/lib/utils";

export type RoomRow = {
  childId: string;
  childName: string;
  gender: string;
  birthDate: string;
  owner: { id: string; name: string | null; email: string | null } | null;
  memberCount: number;
  placements: number;
  wallpaper: string | null;
  flooring: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 방은 앱이 그린다. 개발 중에는 로컬 앱(13000)을 띄운다. */
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:13000" : "https://babyroom.spectrify.kr");

function monthsOf(birthDate: string) {
  const b = new Date(birthDate);
  const n = new Date();
  return Math.max(0, (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth() - (n.getDate() < b.getDate() ? 1 : 0));
}

const columns: ColumnDef<RoomRow>[] = [
  {
    id: "child",
    accessorFn: (r) => `${r.childName} ${r.owner?.name ?? ""} ${r.owner?.email ?? ""}`,
    header: ({ column }) => <SortHeader label="아기" column={column} />,
    sortingFn: (a, b) => a.original.childName.localeCompare(b.original.childName, "ko"),
    enableHiding: false,
    meta: { label: "아기" },
    cell: ({ row: { original: r } }) => (
      <div>
        <div className="font-medium">{r.childName}</div>
        <div className="text-xs text-muted-foreground">
          {r.gender === "female" ? "여아" : r.gender === "male" ? "남아" : "-"} · {monthsOf(r.birthDate)}개월
        </div>
      </div>
    ),
  },
  {
    id: "owner",
    accessorFn: (r) => r.owner?.name ?? r.owner?.email ?? "",
    header: ({ column }) => <SortHeader label="보호자" column={column} />,
    meta: { label: "보호자" },
    cell: ({ row: { original: r } }) => (
      <div>
        <div>{r.owner?.name ?? r.owner?.email ?? "-"}</div>
        {r.memberCount > 1 && <div className="text-xs text-muted-foreground">가족 {r.memberCount}명</div>}
      </div>
    ),
  },
  {
    id: "placements",
    accessorFn: (r) => r.placements,
    header: ({ column }) => <SortHeader label="놓은 가구" column={column} align="right" />,
    meta: { label: "놓은 가구", align: "right" },
    cell: ({ row: { original: r } }) => `${r.placements}개`,
  },
  {
    id: "surface",
    accessorFn: (r) => `${r.wallpaper ?? ""} ${r.flooring ?? ""}`,
    header: "벽지 · 바닥",
    enableSorting: false,
    meta: { label: "벽지 · 바닥", className: "text-muted-foreground" },
    cell: ({ row: { original: r } }) => `${r.wallpaper ?? "기본"} · ${r.flooring ?? "기본"}`,
  },
  {
    id: "createdAt",
    accessorFn: (r) => new Date(r.createdAt).getTime(),
    header: ({ column }) => <SortHeader label="처음 꾸민 날" column={column} align="right" />,
    meta: { label: "처음 꾸민 날", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: r } }) => formatDateTime(r.createdAt),
  },
  {
    id: "updatedAt",
    accessorFn: (r) => new Date(r.updatedAt).getTime(),
    header: ({ column }) => <SortHeader label="마지막 수정" column={column} align="right" />,
    meta: { label: "마지막 수정", align: "right", className: "text-muted-foreground" },
    cell: ({ row: { original: r } }) => formatDateTime(r.updatedAt),
  },
];

export function RoomsTable({ items }: { items: RoomRow[] }) {
  const [open, setOpen] = useState<RoomRow | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const show = useCallback(async (r: RoomRow) => {
    setOpen(r);
    setSrc(null);
    setFailed(false);
    try {
      const res = await fetch(`/api/room-view/${r.childId}/ticket`, { method: "POST" });
      if (!res.ok) throw new Error();
      const { ticket } = (await res.json()) as { ticket: string };
      setSrc(`${APP_URL}/room-view?childId=${encodeURIComponent(r.childId)}&ticket=${encodeURIComponent(ticket)}`);
    } catch {
      setFailed(true);
    }
  }, []);

  // 넓은 화면은 오른쪽 패널, 그보다 좁으면(폰·태블릿) 아래에서 올라오는 시트로 보인다
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // 넓은 화면은 들어오면 맨 위(최근 수정) 방을 바로 열어 둔다
  const first = items[0];
  useEffect(() => {
    if (wide && first) void show(first);
  }, [wide, first, show]);

  const head = open && (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate font-semibold">{open.childName}의 방</div>
        <div className="truncate text-xs text-muted-foreground">
          {open.owner?.name ?? "-"} · 가구 {open.placements}개 · {formatDateTime(open.updatedAt)}
        </div>
      </div>
      {src && (
        <Button variant="ghost" size="sm" asChild>
          <a href={src} target="_blank" rel="noreferrer" aria-label="새 창으로 열기">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
  const screen = src ? (
    <iframe key={src} src={src} title="아기방" className="h-full w-full border-0" />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {failed ? "방을 열지 못했습니다." : <Loader2 className="h-5 w-5 animate-spin" />}
    </div>
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <DataTable
        columns={columns}
        data={items}
        searchPlaceholder="아기, 보호자 검색"
        emptyText="아직 꾸민 방이 없습니다."
        onRowClick={show}
        initialHidden={{ createdAt: false }}
      />

      {wide ? (
        <Card className="sticky top-6 gap-3 p-4">
          {open ? (
            <>
              {head}
              <div className="relative mx-auto mt-3 h-[min(720px,calc(100vh-11rem))] w-full max-w-[368px] overflow-hidden rounded-[28px] border-8 border-foreground/90 bg-muted">
                {screen}
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">목록에서 아기를 고르면 방이 보입니다.</div>
          )}
        </Card>
      ) : (
        <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
          <SheetContent side="bottom" className="flex h-[92dvh] flex-col gap-3 rounded-t-2xl p-0 pt-4">
            <SheetTitle className="sr-only">{open?.childName}의 방</SheetTitle>
            <div className="px-4 pr-12">{head}</div>
            <div className="mx-auto w-full max-w-[420px] flex-1 overflow-hidden bg-muted">{screen}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
