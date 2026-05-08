"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TestType = "TEMPERAMENT" | "DEVELOPMENT" | "UNICORN";

const TEST_TYPES: { value: TestType; label: string; hint: string }[] = [
  { value: "TEMPERAMENT", label: "기질 검사", hint: "신생아/돌 전/돌 후 연령대 선택 후 30문항 진행" },
  { value: "DEVELOPMENT", label: "발달 유형", hint: "발달 영역 기반 성장 유형 분석 (구현 예정)" },
  { value: "UNICORN", label: "유니콘 지수", hint: "수면·감정·일상 패턴 분석 (구현 예정)" },
];

const TEST_TYPE_LABEL: Record<TestType, string> = TEST_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<TestType, string>,
);

type Test = {
  id: string;
  type: TestType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  linkUrl: string;
  labels: string[];
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  questionCount: number | null;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  type: TestType;
  title: string;
  description: string;
  thumbnailUrl: string;
  linkUrl: string;
  labelsText: string;
  durationMinMinutes: string;
  durationMaxMinutes: string;
  questionCount: string;
  sortOrder: number;
  isActive: boolean;
};

const empty: FormState = {
  type: "TEMPERAMENT",
  title: "",
  description: "",
  thumbnailUrl: "",
  linkUrl: "",
  labelsText: "",
  durationMinMinutes: "",
  durationMaxMinutes: "",
  questionCount: "",
  sortOrder: 0,
  isActive: true,
};

const formatDuration = (
  min: number | null,
  max: number | null,
): string | null => {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}~${max}분`;
  return `${min ?? max}분`;
};

const toNullableInt = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
};

const parseLabels = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export default function TestsClient({ initial }: { initial: Test[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Test | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/tests/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, thumbnailUrl: data.url }));
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
  const startEdit = (t: Test) => {
    setForm({
      type: t.type,
      title: t.title,
      description: t.description ?? "",
      thumbnailUrl: t.thumbnailUrl ?? "",
      linkUrl: t.linkUrl,
      labelsText: t.labels.join(", "),
      durationMinMinutes:
        t.durationMinMinutes != null ? String(t.durationMinMinutes) : "",
      durationMaxMinutes:
        t.durationMaxMinutes != null ? String(t.durationMaxMinutes) : "",
      questionCount: t.questionCount != null ? String(t.questionCount) : "",
      sortOrder: t.sortOrder,
      isActive: t.isActive,
    });
    setEditing(t);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!form.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!form.linkUrl.trim()) {
      alert("테스트 링크를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        thumbnailUrl: form.thumbnailUrl || null,
        linkUrl: form.linkUrl.trim(),
        labels: parseLabels(form.labelsText),
        durationMinMinutes: toNullableInt(form.durationMinMinutes),
        durationMaxMinutes: toNullableInt(form.durationMaxMinutes),
        questionCount: toNullableInt(form.questionCount),
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editing) {
        await fetch(`/api/tests/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/tests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("테스트를 삭제할까요?")) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="테스트 관리"
        description="홈에 노출되는 심리/기질 테스트 카드를 등록하고 정렬합니다."
        actions={
          <Button onClick={startCreate} size="sm">
            <Plus className="h-4 w-4" />새 테스트
          </Button>
        }
      />

      <div className="space-y-3">
        {initial.map((t) => (
          <Card
            key={t.id}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 transition-shadow hover:shadow-md"
          >
            <div className="relative w-full sm:w-20 h-20 shrink-0 rounded-lg bg-muted overflow-hidden ring-1 ring-border">
              {t.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.thumbnailUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate">
                  {t.title}
                </p>
                <Badge
                  variant={t.isActive ? "success" : "secondary"}
                  className="text-[10px]"
                >
                  {t.isActive ? "활성" : "비활성"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {TEST_TYPE_LABEL[t.type] ?? t.type}
                </Badge>
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                  {t.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground/80 truncate mt-1 font-mono">
                → {t.linkUrl}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                <span>
                  소요 시간{" "}
                  <span className="text-foreground font-medium">
                    {formatDuration(t.durationMinMinutes, t.durationMaxMinutes) ??
                      "-"}
                  </span>
                </span>
                <span>
                  문항{" "}
                  <span className="text-foreground font-medium">
                    {t.questionCount != null ? `${t.questionCount}개` : "-"}
                  </span>
                </span>
              </div>
              {t.labels.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {t.labels.map((l) => (
                    <span
                      key={l}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center">
              <span className="text-xs text-muted-foreground tabular-nums">
                #{t.sortOrder}
              </span>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => startEdit(t)}>
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {initial.length === 0 && (
          <Card className="py-12 text-center text-muted-foreground text-sm">
            등록된 테스트가 없습니다
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>{editing ? "테스트 수정" : "새 테스트"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "테스트 정보를 수정합니다."
                : "새로운 테스트를 등록합니다."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>테스트 종류</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as TestType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="종류를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TEST_TYPES.find((t) => t.value === form.type)?.hint}
              </p>
            </div>
            <div>
              <Label>썸네일</Label>
              {form.thumbnailUrl ? (
                <div className="mt-1.5 relative rounded-lg overflow-hidden border w-32 h-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.thumbnailUrl}
                    alt="썸네일 미리보기"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute bottom-1 left-1 cursor-pointer">
                    <Button variant="secondary" size="sm" asChild>
                      <span>변경</span>
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
                    className="absolute top-1 right-1"
                    onClick={() => setForm({ ...form, thumbnailUrl: "" })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="mt-1.5 flex flex-col items-center justify-center gap-1 w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted hover:bg-accent cursor-pointer text-muted-foreground text-sm">
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
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="우리 아기 기질 테스트"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="타고난 반응 방식을 이해하고 양육 힌트를 얻어보세요."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>테스트 링크</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="/temperament"
              />
              <p className="text-xs text-muted-foreground">
                카드 클릭 시 이동할 테스트 시작 페이지 경로입니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label>라벨</Label>
              <Input
                value={form.labelsText}
                onChange={(e) =>
                  setForm({ ...form, labelsText: e.target.value })
                }
                placeholder="추천, 신규"
              />
              <p className="text-xs text-muted-foreground">
                쉼표(,)로 구분해 입력하세요. (소요 시간/문항 수는 아래 별도 항목)
              </p>
            </div>
            <div className="space-y-2">
              <Label>소요 시간(분)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.durationMinMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinMinutes: e.target.value })
                  }
                  placeholder="최소"
                />
                <span className="text-muted-foreground text-sm shrink-0">~</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.durationMaxMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMaxMinutes: e.target.value })
                  }
                  placeholder="최대"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                범위가 없으면 한쪽만 입력해도 됩니다. 둘 다 같으면 단일 값으로 표시됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label>문항 수</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.questionCount}
                onChange={(e) =>
                  setForm({ ...form, questionCount: e.target.value })
                }
                placeholder="30"
              />
            </div>
            <div className="space-y-2">
              <Label>정렬 순서</Label>
              <Input
                type="number"
                value={String(form.sortOrder)}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
                }
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
