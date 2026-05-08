"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type Notice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

const empty = {
  title: "",
  content: "",
  isPinned: false,
  isPublished: true,
};

export default function NoticesClient({ initial }: { initial: Notice[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (n: Notice) => {
    setForm({
      title: n.title,
      content: n.content,
      isPinned: n.isPinned,
      isPublished: n.isPublished,
    });
    setEditing(n);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/notices/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/notices`, {
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
    if (!confirm("공지사항을 삭제할까요?")) return;
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="공지사항 관리"
        description="앱 내 공지사항을 작성하고 노출 여부를 관리합니다."
        actions={
          <Button onClick={startCreate} size="sm">
            <Plus className="h-4 w-4" />
            새 공지
          </Button>
        }
      />

      <div className="space-y-3">
        {initial.map((n) => (
          <Card
            key={n.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 transition-shadow hover:shadow-md"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {n.isPinned && (
                  <Badge variant="warning" className="text-[10px]">고정</Badge>
                )}
                <p className="font-semibold text-sm text-foreground truncate">
                  {n.title}
                </p>
                <Badge
                  variant={n.isPublished ? "success" : "secondary"}
                  className="text-[10px]"
                >
                  {n.isPublished ? "공개" : "비공개"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1 tabular-nums">
                {new Date(n.publishedAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex gap-1.5 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={() => startEdit(n)}>
                <Pencil className="h-3 w-3" />
                수정
              </Button>
              <Button variant="destructive" size="sm" onClick={() => remove(n.id)}>
                <Trash2 className="h-3 w-3" />
                삭제
              </Button>
            </div>
          </Card>
        ))}
        {initial.length === 0 && (
          <Card className="py-12 text-center text-muted-foreground text-sm">
            등록된 공지사항이 없습니다
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>{editing ? "공지 수정" : "새 공지"}</DialogTitle>
            <DialogDescription>
              {editing ? "공지사항을 수정합니다." : "새로운 공지사항을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isPinned}
                onCheckedChange={(v) => setForm({ ...form, isPinned: v })}
              />
              <Label>상단 고정</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isPublished}
                onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
              />
              <Label>공개</Label>
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
