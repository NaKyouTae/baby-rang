"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  bgColor: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const empty = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  sortOrder: 0,
  isActive: true,
};

export default function BannersClient({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/banners/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      setForm((prev: any) => ({ ...prev, imageUrl: data.url }));
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (b: Banner) => {
    setForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      imageUrl: b.imageUrl ?? "",
      linkUrl: b.linkUrl,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    });
    setEditing(b);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/banners/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/banners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("배너를 삭제할까요?")) return;
    await fetch(`/api/banners/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="배너 관리"
        description="홈 상단 슬라이드 배너를 등록·정렬합니다."
        actions={
          <Button onClick={startCreate} size="sm">
            <Plus className="h-4 w-4" />
            새 배너
          </Button>
        }
      />

      <div className="space-y-3">
        {initial.map((b) => (
          <Card
            key={b.id}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 transition-shadow hover:shadow-md"
          >
            <div
              className="relative w-full sm:w-28 h-16 shrink-0 rounded-lg overflow-hidden ring-1 ring-border"
              style={{
                background: b.bgColor
                  ? `linear-gradient(135deg, ${b.bgColor}, #FF7E5F)`
                  : "linear-gradient(135deg, hsl(212 35% 90%), hsl(212 35% 80%))",
              }}
            >
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate">{b.title}</p>
                <Badge variant={b.isActive ? "success" : "secondary"} className="text-[10px]">
                  {b.isActive ? "활성" : "비활성"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground/80 truncate mt-1 font-mono">
                → {b.linkUrl}
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center">
              <span className="text-xs text-muted-foreground tabular-nums">
                #{b.sortOrder}
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => startEdit(b)}>
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(b.id)}>
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {initial.length === 0 && (
          <Card className="py-12 text-center text-muted-foreground text-sm">
            등록된 배너가 없습니다
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>{editing ? "배너 수정" : "새 배너"}</DialogTitle>
            <DialogDescription>
              {editing ? "배너 정보를 수정합니다." : "새로운 배너를 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div>
              <Label>이미지</Label>
              {form.imageUrl ? (
                <div className="mt-1.5 relative rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="배너 이미지 미리보기"
                    className="w-full aspect-[16/7] object-cover"
                  />
                  <label className="absolute bottom-2 right-2 cursor-pointer">
                    <Button variant="secondary" size="sm" asChild>
                      <span>이미지 변경</span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadImage(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setForm({ ...form, imageUrl: "" })}
                  >
                    <X className="h-3 w-3" />
                    제거
                  </Button>
                </div>
              ) : (
                <label className="mt-1.5 flex flex-col items-center justify-center gap-1 w-full aspect-[16/7] rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted hover:bg-accent cursor-pointer text-muted-foreground text-sm">
                  {uploading ? (
                    <span>업로드 중...</span>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>이미지 선택</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>부제목</Label>
              <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>이동 링크</Label>
              <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={String(form.sortOrder)}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label>활성화</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              취소
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
