"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, SortHeader, StatStrip } from "@/components/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

export type LaunchAd = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  startsAt: string;
  endsAt: string;
  durationSec: number;
  maxPerDay: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
};

type Form = {
  title: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

/** datetime-local 값(한국 시간) ↔ ISO */
const toInput = (iso: string) => formatDateTime(iso).replace(" ", "T");
const fromInput = (v: string) => new Date(`${v}:00+09:00`).toISOString();

function emptyForm(): Form {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return {
    title: "",
    imageUrl: "",
    startsAt: toInput(start.toISOString()),
    endsAt: toInput(end.toISOString()),
    isActive: true,
  };
}

type Status = { label: string; variant: "success" | "info" | "secondary" | "warning" };
function statusOf(a: Pick<LaunchAd, "isActive" | "startsAt" | "endsAt">, now = Date.now()): Status {
  if (!a.isActive) return { label: "꺼짐", variant: "secondary" };
  if (new Date(a.endsAt).getTime() <= now) return { label: "종료", variant: "secondary" };
  if (new Date(a.startsAt).getTime() > now) return { label: "예정", variant: "info" };
  return { label: "노출 중", variant: "success" };
}

/** 앱 화면과 같은 모양의 미리보기. 점선 안쪽은 어떤 폰에서도 잘리지 않는 영역이다. */
function PhonePreview({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="relative mx-auto aspect-[9/19.5] w-[240px] overflow-hidden rounded-[28px] border-[6px] border-foreground/90 bg-[#F1F2F4]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">이미지를 올려 주세요</div>
      )}
      <div className="pointer-events-none absolute inset-x-[7%] inset-y-[9%] rounded-md border border-dashed border-white/80 mix-blend-difference" />
    </div>
  );
}

export default function LaunchAdsClient({ initial }: { initial: LaunchAd[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<LaunchAd | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const open = creating || !!editing;
  const close = () => {
    setEditing(null);
    setCreating(false);
  };
  const startCreate = () => {
    setForm(emptyForm());
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (a: LaunchAd) => {
    setForm({
      title: a.title,
      imageUrl: a.imageUrl,
      startsAt: toInput(a.startsAt),
      endsAt: toInput(a.endsAt),
      isActive: a.isActive,
    });
    setCreating(false);
    setEditing(a);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/launch-ads/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      const { url } = (await res.json()) as { url: string };
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.imageUrl) return alert("이름과 이미지를 넣어 주세요.");
    if (!form.startsAt || !form.endsAt || form.startsAt >= form.endsAt) return alert("노출 기간을 확인해 주세요.");
    setBusy(true);
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        startsAt: fromInput(form.startsAt),
        endsAt: fromInput(form.endsAt),
      };
      const res = await fetch(editing ? `/api/launch-ads/${editing.id}` : "/api/launch-ads", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      close();
      router.refresh();
    } catch {
      alert("저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (a: LaunchAd, isActive: boolean) => {
    await fetch(`/api/launch-ads/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    router.refresh();
  };

  const remove = async (a: LaunchAd) => {
    if (!confirm(`'${a.title}' 스플래시를 삭제할까요? 노출 기록도 함께 사라집니다.`)) return;
    await fetch(`/api/launch-ads/${a.id}`, { method: "DELETE" });
    router.refresh();
  };

  const columns: ColumnDef<LaunchAd>[] = [
    {
      id: "title",
      accessorFn: (a) => a.title,
      header: ({ column }) => <SortHeader label="이미지" column={column} />,
      sortingFn: (x, y) => x.original.title.localeCompare(y.original.title, "ko"),
      enableHiding: false,
      meta: { label: "이미지" },
      cell: ({ row: { original: a } }) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.imageUrl} alt="" className="h-14 w-[26px] shrink-0 rounded object-cover ring-1 ring-border" />
          <div className="min-w-0 truncate font-medium">{a.title}</div>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (a) => statusOf(a).label,
      header: ({ column }) => <SortHeader label="상태" column={column} />,
      meta: { label: "상태" },
      cell: ({ row: { original: a } }) => {
        const s = statusOf(a);
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "period",
      accessorFn: (a) => new Date(a.startsAt).getTime(),
      header: ({ column }) => <SortHeader label="노출 기간" column={column} />,
      meta: { label: "노출 기간", className: "text-muted-foreground" },
      cell: ({ row: { original: a } }) => (
        <div className="text-xs leading-5">
          <div>{formatDateTime(a.startsAt)}</div>
          <div>~ {formatDateTime(a.endsAt)}</div>
        </div>
      ),
    },
    {
      id: "impressions",
      accessorFn: (a) => a.impressions,
      header: ({ column }) => <SortHeader label="노출" column={column} align="right" />,
      meta: { label: "노출", align: "right" },
      cell: ({ row: { original: a } }) => `${a.impressions.toLocaleString()}회`,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "right" },
      cell: ({ row: { original: a } }) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Switch checked={a.isActive} onCheckedChange={(v) => toggle(a, v)} aria-label="켜기" />
          <Button variant="ghost" size="sm" onClick={() => startEdit(a)} aria-label="수정">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(a)}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const live = initial.filter((a) => statusOf(a).label === "노출 중");
  const totalImp = initial.reduce((s, a) => s + a.impressions, 0);
  const upcoming = initial.filter((a) => statusOf(a).label === "예정").length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="스플래시"
        description="앱을 켤 때 기본 스플래시 대신 보여 주는 홍보 이미지입니다. 앱이 미리 받아 두었다가 다음 실행 때 보여 주므로, 새 이미지는 사용자가 앱을 한 번 더 열 때부터 보입니다. 걸린 이미지가 없으면 기본 스플래시가 나옵니다."
        actions={
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4" />새 스플래시
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "지금 노출 중", value: live.length, hint: live[0]?.title },
          { label: "예정", value: upcoming },
          { label: "전체", value: initial.length },
          { label: "누적 노출", value: totalImp.toLocaleString() },
        ]}
      />

      <DataTable
        columns={columns}
        data={initial}
        searchPlaceholder="이름 검색"
        emptyText="등록된 스플래시 이미지가 없습니다. 비어 있으면 앱은 기본 스플래시를 보여 줍니다."
        onRowClick={startEdit}
      />

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "스플래시 수정" : "새 스플래시"}</DialogTitle>
            <DialogDescription>
              기간이 겹치면 시작이 가장 늦은 이미지 하나만 보입니다. 앱이 미리 받아 두도록 시작 하루 전쯤 등록해 두세요.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-2">
              <PhonePreview imageUrl={form.imageUrl} />
              <p className="text-center text-[11px] leading-4 text-muted-foreground">
                권장 1080×2340 (9:19.5). 화면을 꽉 채우고 넘치는 부분은 잘리니 글자·로고는 점선 안에 두세요. 누를 수 없고 2초쯤 보입니다.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 11월 새 가구 홍보 (앱에는 보이지 않음)"
                />
              </div>
              <div className="space-y-2">
                <Label>이미지</Label>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {uploading ? "올리는 중..." : form.imageUrl ? "이미지 바꾸기" : "이미지 올리기"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>시작</Label>
                  <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>종료</Label>
                  <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>켜기</Label>
                <span className="text-xs text-muted-foreground">끄면 앱이 다음에 목록을 받은 뒤부터 나오지 않습니다.</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close}>
              취소
            </Button>
            <Button onClick={save} disabled={busy || uploading}>
              {busy ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
