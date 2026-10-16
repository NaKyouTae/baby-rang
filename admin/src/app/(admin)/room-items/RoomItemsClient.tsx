"use client";

import { useMemo, useState } from "react";
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
import RoomItemPreview from "./RoomItemPreview";

export type RoomItem = {
  id: string;
  spriteKey: string;
  name: string;
  category: string;
  surface: string;
  tileW: number;
  tileH: number;
  /** 아기가 이 아이템으로 할 수 있는 것. 비우면 앱이 분류로 짐작한다. */
  affordances?: string[];
  dynamicSlot: string | null;
  imageUrl: string | null;
  priceCoins: number;
  isActive: boolean;
};

/** 분류 필터의 '전체'. 실제 분류값과 겹치지 않는 값이어야 한다. */
const ALL = "__ALL__";

const CATEGORY: Record<string, string> = {
  BED: "침대",
  FURNITURE: "가구",
  DECOR: "소품",
  RUG: "러그",
  WINDOW: "창문",
  TOY: "장난감",
  WALLPAPER: "벽지",
  FLOORING: "바닥재",
};

const SURFACE: Record<string, string> = {
  FLOOR: "바닥",
  WALL: "벽",
  ON_TOP: "가구 위",
};

/** 쓰임새 — 홈 아기가 방에 놓인 아이템에 맞춰 행동을 고르는 데 쓴다 */
const AFFORDANCE: Record<string, string> = {
  HOLD: "붙잡고 서기",
  SOFT_FLOOR: "푹신한 바닥",
  PLAY: "앉아서 놀기",
  BALL: "공",
  PUSH_WALKER: "보행기",
  SLEEP: "침대에서 자기",
  SEAT: "앉기(의자·소파)",
  SLIDE: "미끄럼틀 타기",
};
/** 비워 뒀을 때 앱이 분류로 짐작하는 쓰임새 — 폼에 안내로 보여준다 */
const DEFAULT_AFFORDANCE: Record<string, string[]> = {
  FURNITURE: ["HOLD"],
  BED: ["HOLD", "SLEEP"],
  RUG: ["SOFT_FLOOR"],
  TOY: ["PLAY"],
};

const DYNAMIC: Record<string, string> = {
  WEATHER: "날씨(창문)",
};

/**
 * 올린 파일 이름에서 스프라이트 키를 만든다.
 * 코드가 그림을 찾는 이름이라 영문·숫자·밑줄만 남긴다. (crib_wood.png → crib_wood)
 */
function keyFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** 그림 없이 등록하는 경우(코드로 그리는 가구)에 쓸 키. */
function fallbackKey(category: string) {
  return `${category.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
}

const empty = {
  spriteKey: "",
  name: "",
  category: "FURNITURE",
  surface: "FLOOR",
  tileW: 1,
  tileH: 1,
  affordances: [] as string[],
  dynamicSlot: "",
  imageUrl: "",
  priceCoins: 0,
  isActive: true,
};

type Form = typeof empty;

export default function RoomItemsClient({ initial }: { initial: RoomItem[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoomItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  // 쓰임새가 생기기 전에 열어 둔 폼(핫 리로드로 남은 상태)이나 예전 서버 응답에는 이 값이 없다
  const affordances = form.affordances ?? [];
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState<string>(ALL);

  // 스프라이트 PNG 업로드. 배너와 같은 저장소(Supabase Storage)를 쓰고
  // 돌려받은 주소를 imageUrl 에 넣는다 — 바이너리는 DB 에 넣지 않는다.
  const uploadSprite = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/room-items/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      const derived = keyFromFileName(file.name);
      setForm((prev) => ({
        ...prev,
        imageUrl: data.url,
        // 키는 등록 시점에만 정한다. 수정 중에 바뀌면 이미 배치된 방이 그림을 못 찾는다.
        spriteKey: editing ? prev.spriteKey : derived || prev.spriteKey || fallbackKey(prev.category),
      }));
    } catch {
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };

  const startEdit = (item: RoomItem) => {
    setForm({
      spriteKey: item.spriteKey,
      name: item.name,
      category: item.category,
      surface: item.surface,
      tileW: item.tileW,
      tileH: item.tileH,
      affordances: item.affordances ?? [],
      dynamicSlot: item.dynamicSlot ?? "",
      imageUrl: item.imageUrl ?? "",
      priceCoins: item.priceCoins,
      isActive: item.isActive,
    });
    setCreating(false);
    setEditing(item);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...form,
        dynamicSlot: form.dynamicSlot || null,
        // 그림 없이 등록하면(코드로 그리는 가구) 키를 만들어 준다
        spriteKey: form.spriteKey || fallbackKey(form.category),
      };
      const res = editing
        ? await fetch(`/api/room-items/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/room-items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "저장에 실패했습니다.");
        return;
      }
      close();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  // 누군가 쓰고 있는 아이템은 서버가 삭제를 거부한다. 숨기는 쪽을 먼저 안내한다.
  const remove = async (item: RoomItem) => {
    if (
      !confirm(
        `'${item.name}' 을 삭제할까요?\n\n방에 놓였거나 구매된 아이템은 삭제할 수 없습니다. 노출만 막으려면 삭제 대신 '노출'을 끄세요.`,
      )
    )
      return;
    const res = await fetch(`/api/room-items/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "삭제에 실패했습니다.");
      return;
    }
    router.refresh();
  };

  // 분류별 개수. 아이템이 하나도 없는 분류는 칩으로 띄우지 않는다 —
  // 눌러도 빈 목록만 나와서 고장처럼 보인다.
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of initial) map.set(i.category, (map.get(i.category) ?? 0) + 1);
    return map;
  }, [initial]);

  const chips = useMemo(
    () => [
      { id: ALL, label: "전체", count: initial.length },
      ...Object.entries(CATEGORY)
        .filter(([id]) => counts.has(id))
        .map(([id, label]) => ({ id, label, count: counts.get(id) ?? 0 })),
    ],
    [counts, initial.length],
  );

  // 고른 분류의 아이템이 전부 지워졌으면 '전체'로 되돌린다
  const activeFilter = chips.some((c) => c.id === filter) ? filter : ALL;
  const visible = activeFilter === ALL ? initial : initial.filter((i) => i.category === activeFilter);

  const dialogOpen = creating || !!editing;

  return (
    <div>
      <PageHeader
        title="방 꾸미기 아이템"
        description="아이 방에 놓을 수 있는 가구·소품을 등록합니다. 좌표가 아니라 '그게 무엇인가'만 다룹니다."
        actions={
          <Button onClick={startCreate} size="sm">
            <Plus className="h-4 w-4" />새 아이템
          </Button>
        }
      />

      {initial.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          등록된 아이템이 없습니다. 오른쪽 위에서 추가하세요.
        </Card>
      )}

      {initial.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const on = c.id === activeFilter;
            return (
              <Button
                key={c.id}
                type="button"
                size="sm"
                variant={on ? "default" : "outline"}
                onClick={() => setFilter(c.id)}
              >
                {c.label}
                <span className={on ? "opacity-70" : "text-muted-foreground"}>{c.count}</span>
              </Button>
            );
          })}
        </div>
      )}

      {initial.length > 0 && visible.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          이 분류에 아이템이 없습니다.
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((item) => (
          <Card
            key={item.id}
            className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 transition-shadow hover:shadow-md"
          >
            <div className="relative w-full sm:w-20 h-16 shrink-0 rounded-lg overflow-hidden ring-1 ring-border bg-[hsl(212_25%_96%)] flex items-center justify-center">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="max-w-full max-h-full"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span className="text-[10px] text-muted-foreground">코드 생성</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                <Badge variant="secondary" className="text-[10px]">
                  {CATEGORY[item.category] ?? item.category}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {SURFACE[item.surface] ?? item.surface}
                </Badge>
                {item.dynamicSlot && (
                  <Badge variant="secondary" className="text-[10px]">
                    {DYNAMIC[item.dynamicSlot] ?? item.dynamicSlot}
                  </Badge>
                )}
                {item.affordances?.map((a) => (
                  <Badge key={a} variant="outline" className="text-[10px]">
                    {AFFORDANCE[a] ?? a}
                  </Badge>
                ))}
                <Badge variant={item.isActive ? "success" : "secondary"} className="text-[10px]">
                  {item.isActive ? "노출" : "숨김"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground/80 truncate mt-1 font-mono">
                {item.spriteKey} · {item.tileW}×{item.tileH}칸
                {" · "}
                {item.priceCoins > 0 ? `${item.priceCoins}코인` : "무료"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-center">
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => startEdit(item)}>
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
                <Button variant="outline" size="sm" onClick={() => remove(item)}>
                  <Trash2 className="h-3 w-3" />
                  삭제
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && close()}>
        {/* 본문만 스크롤하고 머리·버튼은 고정한다. 폼이 길어 저장하려고 끝까지 내리지 않게. */}
        <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0 sm:max-w-3xl">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{editing ? "아이템 수정" : "새 아이템"}</DialogTitle>
            <DialogDescription>
              칸 수는 픽셀이 아니라 타일 기준입니다. 저장된 방이 기기마다 달라지지 않도록
              좌표는 전부 타일로 다룹니다.
            </DialogDescription>
          </DialogHeader>

          {/* 왼쪽 폼만 스크롤하고 오른쪽 미리보기는 고정한다 */}
          <div className="flex min-h-0 overflow-hidden px-6">
            <div className="flex min-h-0 flex-1 gap-6">
              <div className="min-w-0 flex-1 space-y-4 overflow-y-auto pt-1 pb-6 pr-1">
                <div className="space-y-2">
                  <Label>스프라이트 이미지</Label>
                  <div className="flex items-start gap-3">
                    <div className="relative w-20 h-20 shrink-0 rounded-lg ring-1 ring-border bg-[hsl(212_25%_96%)] flex items-center justify-center overflow-hidden">
                      {form.imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={form.imageUrl}
                            alt=""
                            className="max-w-full max-h-full"
                            style={{ imageRendering: "pixelated" }}
                          />
                          <button
                            type="button"
                            onClick={() => set("imageUrl", "")}
                            className="absolute top-0.5 right-0.5 rounded bg-black/55 p-0.5 text-white"
                            aria-label="이미지 지우기"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">코드 생성</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent">
                          <Upload className="h-3.5 w-3.5" />
                          {uploading ? "업로드 중" : "PNG 올리기"}
                          <input
                            type="file"
                            accept="image/png,image/webp"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) uploadSprite(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="isActive"
                            checked={form.isActive}
                            onCheckedChange={(v: boolean) => set("isActive", v)}
                          />
                          <Label htmlFor="isActive">노출</Label>
                        </div>
                      </div>
                      <Input
                        value={form.imageUrl}
                        onChange={(e) => set("imageUrl", e.target.value)}
                        placeholder="비우면 코드로 그립니다"
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    배경이 투명한 PNG 를 올리세요. 크기는 타일 16px 기준으로 (가로 칸 × 16) ×
                    (세로 칸 × 16) 입니다. 예: 3×3칸이면 48×48.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="아기침대"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spriteKey">스프라이트 키</Label>
                    <Input
                      id="spriteKey"
                      value={form.spriteKey}
                      readOnly
                      placeholder="이미지를 올리면 자동으로 채워집니다"
                      className="font-mono bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-muted-foreground">
                  {editing
                    ? "스프라이트 키는 코드가 그림을 찾는 이름이라 바꿀 수 없습니다. 다른 그림으로 교체해도 키는 그대로 유지됩니다."
                    : "올린 파일 이름에서 자동으로 만들어집니다. (crib_wood.png → crib_wood) 파일 이름이 한글이면 알아볼 수 없는 키가 생기니 영문으로 지어주세요."}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">분류</Label>
                    <select
                      id="category"
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {Object.entries(CATEGORY).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="surface">생성 위치</Label>
                    <select
                      id="surface"
                      value={form.surface}
                      onChange={(e) => set("surface", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {Object.entries(SURFACE).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="tileW">가로 칸</Label>
                    <Input
                      id="tileW"
                      type="number"
                      min={1}
                      value={form.tileW}
                      onChange={(e) => set("tileW", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tileH">세로 칸</Label>
                    <Input
                      id="tileH"
                      type="number"
                      min={1}
                      value={form.tileH}
                      onChange={(e) => set("tileH", Number(e.target.value))}
                    />
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-muted-foreground">
                  가로·세로 칸은 그림 크기이자, 아기가 이 아이템을 쓸 때 다가가는 자리입니다.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="priceCoins">가격(코인) · 0이면 무료</Label>
                    <Input
                      id="priceCoins"
                      type="number"
                      min={0}
                      value={form.priceCoins}
                      onChange={(e) => set("priceCoins", Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dynamicSlot">실시간 슬롯</Label>
                    <select
                      id="dynamicSlot"
                      value={form.dynamicSlot}
                      onChange={(e) => set("dynamicSlot", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="">없음</option>
                      {Object.entries(DYNAMIC).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-muted-foreground">
                  실시간 슬롯은 그림이 데이터에 따라 바뀌는 자리입니다. 날씨는 창문 하늘을
                  현재 날씨·시간대에 맞춰 바꾸려는 것으로, 앱에는 아직 연결되지 않았습니다.
                </p>

                <div className="space-y-2">
                  <Label>아기 쓰임새</Label>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="아기 쓰임새">
                    {Object.entries(AFFORDANCE).map(([v, label]) => {
                      const on = affordances.includes(v);
                      return (
                        <Button
                          key={v}
                          type="button"
                          size="sm"
                          variant={on ? "default" : "outline"}
                          onClick={() =>
                            set(
                              "affordances",
                              on ? affordances.filter((a) => a !== v) : [...affordances, v],
                            )
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    홈의 아기가 이 아이템으로 할 수 있는 행동을 정합니다. 공·보행기는 꼭 골라야 아기가 가지고 놉니다.
                    {affordances.length === 0 &&
                      (DEFAULT_AFFORDANCE[form.category]
                        ? ` 비워 두면 분류에 따라 '${DEFAULT_AFFORDANCE[form.category].map((a) => AFFORDANCE[a]).join("·")}'(으)로 씁니다.`
                        : " 비워 두면 아기가 쓰지 않는 장식으로 둡니다.")}
                  </p>
                </div>
              </div>
              <div className="shrink-0 overflow-hidden pt-1 pb-6">
                <RoomItemPreview
                  category={form.category}
                  surface={form.surface}
                  tileW={form.tileW}
                  tileH={form.tileH}
                  imageUrl={form.imageUrl}
                  affordances={affordances}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="items-center border-t px-6 py-4">
            {!form.name && (
              <p className="mr-auto text-[11px] text-muted-foreground">
                이름을 입력해야 저장할 수 있습니다.
              </p>
            )}
            <Button variant="outline" onClick={close} disabled={busy}>
              취소
            </Button>
            <Button onClick={save} disabled={busy || !form.name}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
