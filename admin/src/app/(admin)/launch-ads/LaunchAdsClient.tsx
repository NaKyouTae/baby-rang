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
  linkUrl: string;
  startsAt: string;
  endsAt: string;
  durationSec: number;
  maxPerDay: number;
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
    linkUrl: "",
    startsAt: toInput(start.toISOString()),
    endsAt: toInput(end.toISOString()),
    durationSec: 3,
    maxPerDay: 1,
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

const ctr = (a: LaunchAd) => (a.impressions ? `${((a.clicks / a.impressions) * 100).toFixed(1)}%` : "-");

/** 앱 화면과 같은 모양의 미리보기. 점선 안쪽은 어떤 폰에서도 잘리지 않는 영역이다. */
function PhonePreview({ imageUrl, durationSec }: { imageUrl: string; durationSec: number }) {
  return (
    <div className="relative mx-auto aspect-[9/19.5] w-[240px] overflow-hidden rounded-[28px] border-[6px] border-foreground/90 bg-[#F1F2F4]">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">이미지를 올려 주세요</div>
      )}
      <div className="pointer-events-none absolute inset-x-[7%] inset-y-[9%] rounded-md border border-dashed border-white/80 mix-blend-difference" />
      <span className="absolute right-2.5 top-7 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">건너뛰기 {durationSec}</span>
      <span className="absolute bottom-4 left-2.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">오늘 하루 보지 않기</span>
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
      linkUrl: a.linkUrl ?? "",
      startsAt: toInput(a.startsAt),
      endsAt: toInput(a.endsAt),
      durationSec: a.durationSec,
      maxPerDay: a.maxPerDay,
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
    const link = form.linkUrl.trim();
    if (link && !link.startsWith("/") && !/^https?:\/\//.test(link)) {
      return alert("링크는 /로 시작하는 앱 화면 경로나 https:// 주소로 넣어 주세요.");
    }
    setBusy(true);
    try {
      const body = {
        ...form,
        title: form.title.trim(),
        linkUrl: link,
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
    if (!confirm(`'${a.title}' 런치 광고를 삭제할까요? 노출·클릭 기록도 함께 사라집니다.`)) return;
    await fetch(`/api/launch-ads/${a.id}`, { method: "DELETE" });
    router.refresh();
  };

  const columns: ColumnDef<LaunchAd>[] = [
    {
      id: "title",
      accessorFn: (a) => `${a.title} ${a.linkUrl ?? ""}`,
      header: ({ column }) => <SortHeader label="광고" column={column} />,
      sortingFn: (x, y) => x.original.title.localeCompare(y.original.title, "ko"),
      enableHiding: false,
      meta: { label: "광고" },
      cell: ({ row: { original: a } }) => (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.imageUrl} alt="" className="h-14 w-[26px] shrink-0 rounded object-cover ring-1 ring-border" />
          <div className="min-w-0">
            <div className="truncate font-medium">{a.title}</div>
            <div className="truncate text-xs text-muted-foreground">{a.linkUrl || "링크 없음"}</div>
          </div>
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
      id: "rule",
      accessorFn: (a) => a.maxPerDay,
      header: "노출 규칙",
      enableSorting: false,
      meta: { label: "노출 규칙", className: "text-muted-foreground" },
      cell: ({ row: { original: a } }) => `${a.durationSec}초 · 하루 ${a.maxPerDay}회`,
    },
    {
      id: "impressions",
      accessorFn: (a) => a.impressions,
      header: ({ column }) => <SortHeader label="노출" column={column} align="right" />,
      meta: { label: "노출", align: "right" },
      cell: ({ row: { original: a } }) => a.impressions.toLocaleString(),
    },
    {
      id: "clicks",
      accessorFn: (a) => a.clicks,
      header: ({ column }) => <SortHeader label="클릭" column={column} align="right" />,
      meta: { label: "클릭", align: "right" },
      cell: ({ row: { original: a } }) => (
        <span>
          {a.clicks.toLocaleString()} <span className="text-xs text-muted-foreground">({ctr(a)})</span>
        </span>
      ),
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
  const totalClk = initial.reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="런치 광고"
        description="앱을 켤 때 스플래시 다음에 잠깐 보여 주는 홍보 이미지입니다. 앱 배포 없이 바뀌고, 새로 올린 광고는 사용자가 앱을 한 번 더 열 때부터 보입니다."
        actions={
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4" />새 런치 광고
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: "지금 노출 중", value: live.length, hint: live[0]?.title },
          { label: "전체 광고", value: initial.length },
          { label: "누적 노출", value: totalImp.toLocaleString() },
          { label: "누적 클릭", value: totalClk.toLocaleString(), hint: totalImp ? `클릭률 ${((totalClk / totalImp) * 100).toFixed(1)}%` : undefined },
        ]}
      />

      <DataTable
        columns={columns}
        data={initial}
        searchPlaceholder="광고 이름, 링크 검색"
        emptyText="등록된 런치 광고가 없습니다. 비어 있으면 앱은 스플래시만 보여 줍니다."
        onRowClick={startEdit}
      />

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? "런치 광고 수정" : "새 런치 광고"}</DialogTitle>
            <DialogDescription>
              기간이 겹치면 시작이 가장 늦은 광고 하나만 보입니다. 하루 횟수는 기기마다 한국 시간 자정에 초기화됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 sm:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-2">
              <PhonePreview imageUrl={form.imageUrl} durationSec={form.durationSec} />
              <p className="text-center text-[11px] leading-4 text-muted-foreground">
                권장 1080×2340 (9:19.5). 기기 비율에 따라 위아래나 양옆이 잘리니 글자·로고는 점선 안에 두세요.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 11월 보석 할인 이벤트 (앱에는 보이지 않음)"
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
              <div className="space-y-2">
                <Label>누르면 갈 곳</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="/home 처럼 앱 화면 경로, 또는 https:// 주소"
                />
                <p className="text-xs text-muted-foreground">비우면 눌러도 닫히기만 합니다. 외부 주소는 iOS 에서 사파리로 열립니다.</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>보여 줄 시간(초)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.durationSec}
                    onChange={(e) => setForm({ ...form, durationSec: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>하루 최대 횟수</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={form.maxPerDay}
                    onChange={(e) => setForm({ ...form, maxPerDay: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>켜기</Label>
                <span className="text-xs text-muted-foreground">끄면 앱이 다음에 목록을 받는 즉시 내려갑니다.</span>
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
