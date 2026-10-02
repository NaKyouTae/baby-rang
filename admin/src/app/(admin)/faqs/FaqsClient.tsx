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

type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

const empty = {
  category: "일반",
  question: "",
  answer: "",
  order: 0,
  isPublished: true,
};

export default function FaqsClient({ initial }: { initial: Faq[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Faq | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [busy, setBusy] = useState(false);

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const startEdit = (f: Faq) => {
    setForm({
      category: f.category,
      question: f.question,
      answer: f.answer,
      order: f.order,
      isPublished: f.isPublished,
    });
    setEditing(f);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      alert("질문과 답변을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await fetch(`/api/faqs/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`/api/faqs`, {
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
    if (!confirm("이 질문을 삭제할까요?")) return;
    await fetch(`/api/faqs/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="자주 묻는 질문"
        description="앱의 마이페이지 > 이용 안내 > 자주 묻는 질문에 노출됩니다. 검색엔진과 AI 답변이 읽는 구조화 데이터도 이 내용으로 만들어집니다."
        actions={
          <Button onClick={startCreate} size="sm">
            <Plus className="h-4 w-4" />새 질문
          </Button>
        }
      />

      <div className="space-y-3">
        {initial.map((f) => (
          <Card
            key={f.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 transition-shadow hover:shadow-md"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">
                  {f.category}
                </Badge>
                <p className="font-semibold text-sm text-foreground truncate">
                  {f.question}
                </p>
                <Badge
                  variant={f.isPublished ? "success" : "secondary"}
                  className="text-[10px]"
                >
                  {f.isPublished ? "공개" : "비공개"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
                순서 {f.order} · {f.answer}
              </p>
            </div>
            <div className="flex gap-1.5 self-end sm:self-auto">
              <Button variant="outline" size="sm" onClick={() => startEdit(f)}>
                <Pencil className="h-3 w-3" />
                수정
              </Button>
              <Button variant="destructive" size="sm" onClick={() => remove(f.id)}>
                <Trash2 className="h-3 w-3" />
                삭제
              </Button>
            </div>
          </Card>
        ))}
        {initial.length === 0 && (
          <Card className="py-12 text-center text-muted-foreground text-sm">
            등록된 질문이 없습니다
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>{editing ? "질문 수정" : "새 질문"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "자주 묻는 질문을 수정합니다."
                : "새로운 질문과 답변을 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>분류</Label>
              <Input
                value={form.category}
                placeholder="예: 기질 검사, 결제/환불, 계정"
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                같은 분류끼리 묶여서 보입니다. 분류는 가나다순으로 정렬됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label>질문</Label>
              <Input
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>답변</Label>
              <Textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                AI 답변 엔진이 이 문장을 그대로 인용합니다. 한 문장만 읽어도
                뜻이 통하도록 써주세요.
              </p>
            </div>
            <div className="space-y-2">
              <Label>순서</Label>
              <Input
                type="number"
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: Number(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                같은 분류 안에서 작을수록 위에 보입니다.
              </p>
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
              {busy ? "저장 중" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
