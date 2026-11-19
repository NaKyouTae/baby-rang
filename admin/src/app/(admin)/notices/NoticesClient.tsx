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
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

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

  const columns: ColumnDef<Notice>[] = [
    {
      id: "title",
      accessorFn: (n) => `${n.title} ${n.content}`,
      header: ({ column }) => <SortHeader label="제목" column={column} />,
      sortingFn: (a, b) => a.original.title.localeCompare(b.original.title, "ko"),
      enableHiding: false,
      meta: { label: "제목" },
      cell: ({ row: { original: n } }) => (
        <div className="flex min-w-0 items-center gap-2">
          {n.isPinned && <Badge variant="warning">고정</Badge>}
          <span className="truncate font-medium">{n.title}</span>
        </div>
      ),
    },
    {
      id: "isPublished",
      accessorFn: (n) => (n.isPublished ? "공개" : "비공개"),
      header: ({ column }) => <SortHeader label="상태" column={column} />,
      meta: { label: "상태" },
      cell: ({ row: { original: n } }) => (
        <Badge variant={n.isPublished ? "success" : "secondary"}>{n.isPublished ? "공개" : "비공개"}</Badge>
      ),
    },
    {
      id: "publishedAt",
      accessorFn: (n) => new Date(n.publishedAt).getTime(),
      header: ({ column }) => <SortHeader label="게시일" column={column} align="right" />,
      meta: { label: "게시일", align: "right", className: "text-muted-foreground" },
      cell: ({ row: { original: n } }) => formatDateTime(n.publishedAt),
    },
    {
      id: "updatedAt",
      accessorFn: (n) => new Date(n.updatedAt).getTime(),
      header: ({ column }) => <SortHeader label="수정일" column={column} align="right" />,
      meta: { label: "수정일", align: "right", className: "text-muted-foreground" },
      cell: ({ row: { original: n } }) => formatDateTime(n.updatedAt),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableHiding: false,
      meta: { align: "right" },
      cell: ({ row: { original: n } }) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => startEdit(n)} aria-label="수정">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => remove(n.id)}
            aria-label="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

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

      <DataTable
        columns={columns}
        data={initial}
        searchPlaceholder="제목, 내용 검색"
        emptyText="등록된 공지사항이 없습니다."
        onRowClick={startEdit}
      />

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
