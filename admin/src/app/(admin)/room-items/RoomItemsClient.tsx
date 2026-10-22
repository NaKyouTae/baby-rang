"use client";

import { useEffect, useMemo, useState } from "react";
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
  /** 옆모습(오른쪽을 보는 모습). 있으면 앱 꾸미기에서 정면 ↔ 옆으로 돌려 놓을 수 있다. */
  sideImageUrl?: string | null;
  sideTileW?: number | null;
  sideTileH?: number | null;
  /** 뒷모습(벽 쪽을 보는 모습). 있으면 앱 꾸미기에서 뒤로 돌려 놓을 수 있다. 칸 수는 정면과 같다. */
  backImageUrl?: string | null;
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
  sideImageUrl: "",
  /** 0 이면 정하지 않음 — 앱이 정면 칸 수를 가로·세로 바꿔 쓴다 */
  sideTileW: 0,
  sideTileH: 0,
  backImageUrl: "",
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
  // view 가 side·back 이면 옆모습·뒷모습 그림으로 올린다(스프라이트 키는 정면 그림으로만 정한다)
  const uploadSprite = async (file: File, view: "front" | "side" | "back" = "front") => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/room-items/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      if (view !== "front") {
        setForm((prev) => ({ ...prev, [view === "side" ? "sideImageUrl" : "backImageUrl"]: data.url }));
        return;
      }
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
      sideImageUrl: item.sideImageUrl ?? "",
      sideTileW: item.sideTileW ?? 0,
      sideTileH: item.sideTileH ?? 0,
      backImageUrl: item.backImageUrl ?? "",
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
        sideImageUrl: form.sideImageUrl || null,
        sideTileW: form.sideImageUrl && form.sideTileW > 0 ? form.sideTileW : null,
        sideTileH: form.sideImageUrl && form.sideTileH > 0 ? form.sideTileH : null,
        backImageUrl: form.backImageUrl || null,
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

  // 액션(쓰임새)만 보고 고치는 모달. 카드의 액션 뱃지를 누르면 열린다.
  const [actionItem, setActionItem] = useState<RoomItem | null>(null);
  const [actionDraft, setActionDraft] = useState<string[]>([]);
  const [actionBusy, setActionBusy] = useState(false);

  const openActions = (item: RoomItem) => {
    setActionItem(item);
    setActionDraft(item.affordances ?? []);
  };

  const toggleAction = (value: string) =>
    setActionDraft((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));

  // 액션만 보낸다. 다른 값은 서버가 그대로 둔다.
  const saveActions = async () => {
    if (!actionItem) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/room-items/${actionItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affordances: actionDraft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "저장에 실패했습니다.");
        return;
      }
      setActionItem(null);
      router.refresh();
    } finally {
      setActionBusy(false);
    }
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

      {/* 그림을 보고 고르는 화면이라 바둑판으로 늘어놓는다. 모바일은 3열 고정, 넓은 화면은 폭에 맞춰 늘거나 준다. */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-3">
        {visible.map((item) => (
          <Card
            key={item.id}
            className={`flex flex-col overflow-hidden transition-shadow hover:shadow-md ${item.isActive ? "" : "opacity-60"}`}
          >
            <button
              type="button"
              onClick={() => startEdit(item)}
              aria-label={`${item.name} 수정`}
              className="relative aspect-square w-full bg-[hsl(212_25%_96%)] border-b flex items-center justify-center"
            >
              {item.imageUrl ? (
                // 칸 크기는 aspect-square 가 정한다. 그림은 그 안을 꽉 채운 상자에 contain 으로 넣어
                // 세로로 긴 그림이 칸을 늘리지 않게 한다(max-h-full 은 비율로 정한 높이를 기준으로 못 쓴다).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="absolute inset-0 size-full object-contain p-2 sm:p-4"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span className="text-[11px] text-muted-foreground">코드 생성</span>
              )}
              <Badge
                variant={item.isActive ? "success" : "secondary"}
                className="absolute right-1 top-1 px-1.5 text-[10px] sm:right-2 sm:top-2"
              >
                {item.isActive ? "노출" : "숨김"}
              </Badge>
            </button>

            <div className="flex flex-1 flex-col gap-1.5 p-2 sm:gap-2 sm:p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{item.name}</p>
                <span className="shrink-0 text-[11px] sm:text-xs text-muted-foreground">
                  {item.priceCoins > 0 ? `${item.priceCoins}코인` : "무료"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
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
              </div>
              {/* 액션 — 누르면 미리보기와 함께 액션만 고치는 모달이 열린다 */}
              <button
                type="button"
                onClick={() => openActions(item)}
                aria-label={`${item.name} 액션 보기`}
                className="flex flex-wrap gap-1 rounded-md text-left outline-offset-2 hover:opacity-80"
              >
                {item.affordances?.length ? (
                  item.affordances.map((a) => (
                    <Badge key={a} variant="outline" className="text-[10px]">
                      {AFFORDANCE[a] ?? a}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="border-dashed text-[10px] text-muted-foreground">
                    <Plus className="h-3 w-3" />
                    액션 설정
                  </Badge>
                )}
              </button>
              {/* 모바일 3열에서는 칸이 좁아 키는 숨긴다(수정 창에서 볼 수 있다) */}
              <p className="hidden sm:block text-[11px] text-muted-foreground/80 truncate font-mono">
                {item.spriteKey} · {item.tileW}×{item.tileH}칸
                {item.sideImageUrl && ` · 옆 ${item.sideTileW ?? item.tileH}×${item.sideTileH ?? item.tileW}칸`}
                {item.backImageUrl && " · 뒤"}
              </p>
              {/* 모바일은 아이콘만 보인다 */}
              <div className="mt-auto flex gap-1 pt-1 sm:gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 px-0 sm:px-3"
                  aria-label="수정"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="h-3 w-3" />
                  <span className="hidden sm:inline">수정</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-1 px-0 sm:px-3"
                  aria-label="삭제"
                  onClick={() => remove(item)}
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">삭제</span>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!actionItem} onOpenChange={(v) => !v && !actionBusy && setActionItem(null)}>
        <DialogContent className="max-h-[90vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>{actionItem?.name} 액션</DialogTitle>
            <DialogDescription>
              눌러서 켜고 끕니다. 켠 액션은 아래 미리보기의 아기가 바로 따라 합니다.
            </DialogDescription>
          </DialogHeader>
          {actionItem && (
            <div className="min-h-0 overflow-y-auto px-6 pb-4 space-y-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="액션">
                {Object.entries(AFFORDANCE).map(([v, label]) => {
                  const on = actionDraft.includes(v);
                  return (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() => toggleAction(v)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              {actionDraft.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {DEFAULT_AFFORDANCE[actionItem.category]
                    ? `비워 두면 분류에 따라 '${DEFAULT_AFFORDANCE[actionItem.category].map((a) => AFFORDANCE[a]).join("·")}'(으)로 씁니다.`
                    : "비워 두면 아기가 쓰지 않는 장식으로 둡니다."}
                </p>
              )}
              <RoomItemPreview
                category={actionItem.category}
                surface={actionItem.surface}
                tileW={actionItem.tileW}
                tileH={actionItem.tileH}
                imageUrl={actionItem.imageUrl ?? ""}
                affordances={actionDraft}
              />
            </div>
          )}
          <DialogFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-4 sm:space-x-0">
            <Button variant="outline" onClick={() => setActionItem(null)} disabled={actionBusy}>
              취소
            </Button>
            <Button onClick={saveActions} disabled={actionBusy}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

          {/* 넓은 화면은 왼쪽 폼만 스크롤하고 오른쪽 미리보기는 고정한다. 좁은 화면은 미리보기를 위에 두고 함께 스크롤한다. */}
          <div className="min-h-0 overflow-y-auto px-6 sm:flex sm:overflow-hidden">
            <div className="flex flex-col gap-4 sm:min-h-0 sm:flex-1 sm:flex-row sm:gap-6">
              <div className="min-w-0 space-y-4 pb-6 sm:flex-1 sm:overflow-y-auto sm:pt-1 sm:pr-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>그림 · 칸 수</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="isActive"
                        checked={form.isActive}
                        onCheckedChange={(v: boolean) => set("isActive", v)}
                      />
                      <Label htmlFor="isActive">노출</Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ViewSlot
                      label="정면"
                      url={form.imageUrl}
                      empty="코드 생성"
                      uploading={uploading}
                      onUpload={(f) => uploadSprite(f)}
                      onClear={() => set("imageUrl", "")}
                      w={form.tileW}
                      h={form.tileH}
                      onW={(v) => set("tileW", v)}
                      onH={(v) => set("tileH", v)}
                    />
                    <ViewSlot
                      label="옆 (오른쪽)"
                      url={form.sideImageUrl}
                      empty="없음"
                      uploading={uploading}
                      onUpload={(f) => uploadSprite(f, "side")}
                      onClear={() => set("sideImageUrl", "")}
                      // 0 이면 비워 두고, 정면 칸 수를 가로·세로 바꾼 값을 흐리게 보여 준다
                      w={form.sideTileW || ""}
                      h={form.sideTileH || ""}
                      placeholderW={form.tileH}
                      placeholderH={form.tileW}
                      // 비우면 0 — 정면 칸 수를 가로·세로 바꿔 쓴다
                      allowEmpty
                      onW={(v) => set("sideTileW", v)}
                      onH={(v) => set("sideTileH", v)}
                    />
                    <ViewSlot
                      label="뒤"
                      url={form.backImageUrl}
                      empty="없음"
                      uploading={uploading}
                      onUpload={(f) => uploadSprite(f, "back")}
                      onClear={() => set("backImageUrl", "")}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    한 칸은 16px 입니다.
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
                {!editing && (
                  <p className="-mt-2 text-[11px] text-muted-foreground">
                    올린 파일 이름에서 자동으로 만들어집니다. (crib_wood.png → crib_wood) 파일 이름이 한글이면 알아볼 수 없는 키가 생기니 영문으로 지어주세요.
                  </p>
                )}

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
              </div>
              {/* 오른쪽 열 — 아기 쓰임새를 고르면 바로 아래 미리보기에서 아기가 어떻게 쓰는지 본다 */}
              <div className="order-first space-y-4 pt-1 sm:order-none sm:w-[240px] sm:shrink-0 sm:overflow-y-auto sm:pb-6">
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
                  {affordances.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {DEFAULT_AFFORDANCE[form.category]
                        ? `비워 두면 분류에 따라 '${DEFAULT_AFFORDANCE[form.category].map((a) => AFFORDANCE[a]).join("·")}'(으)로 씁니다.`
                        : "비워 두면 아기가 쓰지 않는 장식으로 둡니다."}
                    </p>
                  )}
                </div>
                <RoomItemPreview
                  category={form.category}
                  surface={form.surface}
                  tileW={form.tileW}
                  tileH={form.tileH}
                  imageUrl={form.imageUrl}
                  sideImageUrl={form.sideImageUrl}
                  sideTileW={form.sideTileW}
                  sideTileH={form.sideTileH}
                  backImageUrl={form.backImageUrl}
                  affordances={affordances}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t px-6 py-4 sm:space-x-0">
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

/**
 * 아이템 한 방향(정면·옆·뒤)의 그림과 칸 수. 사각형을 누르면 PNG 를 올리고, 아래에 가로·세로 칸을 둔다.
 * onW·onH 가 없으면 칸 수 입력 대신 '정면과 동일'을 보여 준다(뒷모습은 정면과 칸 수가 같다).
 */
function ViewSlot({
  label,
  url,
  empty,
  uploading,
  onUpload,
  onClear,
  w,
  h,
  placeholderW,
  placeholderH,
  allowEmpty = false,
  onW,
  onH,
}: {
  label: string;
  url: string | null | undefined;
  empty: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
  w?: number | "";
  h?: number | "";
  placeholderW?: number;
  placeholderH?: number;
  /** 비워 둘 수 있는 칸(비우면 0 을 넘긴다). 아니면 비운 채 나가면 원래 값으로 돌아간다. */
  allowEmpty?: boolean;
  onW?: (v: number) => void;
  onH?: (v: number) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium">{label}</p>
      <div className="relative aspect-square w-full">
        <label
          className={`flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg ring-1 ring-border bg-[hsl(212_25%_96%)] hover:ring-primary ${uploading ? "pointer-events-none opacity-60" : ""}`}
          aria-label={`${label} 그림 올리기`}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="max-h-full max-w-full" style={{ imageRendering: "pixelated" }} />
          ) : (
            <span className="flex flex-col items-center gap-1 text-[10px] text-muted-foreground">
              <Upload className="h-4 w-4" />
              {uploading ? "업로드 중" : empty}
            </span>
          )}
          <input
            type="file"
            accept="image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1 right-1 rounded bg-black/55 p-0.5 text-white"
            aria-label={`${label} 그림 지우기`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {!onW || !onH ? (
        // 칸 수를 따로 두지 않는 방향(뒷모습) — 입력 대신 안내만
        <p className="flex h-8 items-center justify-center text-xs text-muted-foreground">칸 수 정면과 동일</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <TileInput
            value={w}
            placeholder={placeholderW}
            allowEmpty={allowEmpty}
            onChange={onW}
            aria-label={`${label} 가로 칸`}
          />
          <TileInput
            value={h}
            placeholder={placeholderH}
            allowEmpty={allowEmpty}
            onChange={onH}
            aria-label={`${label} 세로 칸`}
          />
        </div>
      )}
      {onW && onH && <p className="text-center text-[10px] text-muted-foreground">가로 × 세로 칸</p>}
    </div>
  );
}

/**
 * 칸 수 입력. 1 이상의 정수만 받는다(0·음수는 입력되지 않는다).
 * 입력 중에는 칸을 다 지울 수 있다 — allowEmpty 면 비운 값을 0 으로 넘기고, 아니면 비운 채 나가면 원래 값으로 돌아간다.
 */
function TileInput({
  value,
  placeholder,
  allowEmpty,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number | "" | undefined;
  placeholder?: number;
  allowEmpty: boolean;
  onChange: (v: number) => void;
  "aria-label": string;
}) {
  const [text, setText] = useState(value ? String(value) : "");
  // 바깥 값이 바뀌면(다른 아이템을 열거나 저장 후) 따라간다
  useEffect(() => {
    setText(value ? String(value) : "");
  }, [value]);
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={text}
      placeholder={placeholder !== undefined ? String(placeholder) : undefined}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9]/g, "");
        if (t === "") {
          setText("");
          if (allowEmpty) onChange(0);
          return;
        }
        const n = Number(t);
        if (n < 1) return;
        setText(String(n));
        onChange(n);
      }}
      onBlur={() => {
        if (!text && !allowEmpty) setText(value ? String(value) : "");
      }}
      aria-label={ariaLabel}
      className="h-8 px-2 text-center text-sm"
    />
  );
}
