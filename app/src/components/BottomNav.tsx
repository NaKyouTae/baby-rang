"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Reorder } from "framer-motion";
import { ALL_MENU_IDS, MENU_CATALOG, type MenuId } from "./menuCatalog";
import { useLoginPrompt } from "./LoginPromptProvider";

const DEFAULT_SLOTS: (MenuId | null)[] = ["nursing-room", "sleep-golden-time", null];
const LONG_PRESS_MS = 500;
const SLOT_COUNT = 3;

const HOME_HREF = "/home";
const SETTINGS_HREF = "/settings";

type Slot = { id: string; menu: MenuId | null };

let slotIdSeq = 0;
const newSlotId = () => `slot-${++slotIdSeq}`;

function toSlots(arr: (MenuId | null)[]): Slot[] {
  return arr.map((menu) => ({ id: newSlotId(), menu }));
}

function sanitize(arr: unknown): (MenuId | null)[] {
  if (!Array.isArray(arr) || arr.length !== SLOT_COUNT) return [...DEFAULT_SLOTS];
  return arr.map((v) => (typeof v === "string" && v in MENU_CATALOG ? (v as MenuId) : null));
}

export default function BottomNav({ initialSlots }: { initialSlots?: (MenuId | null)[] } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { openLoginPrompt } = useLoginPrompt();

  const [slots, setSlots] = useState<Slot[]>(() => toSlots(initialSlots ?? DEFAULT_SLOTS));
  // SSR로 initialSlots가 내려왔다면 이미 로그인 상태로 간주
  const [authenticated, setAuthenticated] = useState<boolean>(!!initialSlots);

  const longPressTimer = useRef<number | null>(null);

  // If parent provided initialSlots (SSR), skip client fetch entirely.
  useEffect(() => {
    if (initialSlots) return;
    let cancelled = false;
    (async () => {
      try {
        const [authRes, slotsRes] = await Promise.all([
          fetch("/api/auth/token", { cache: "no-store" }),
          fetch("/api/nav-slots", { cache: "no-store" }),
        ]);
        if (!authRes.ok) return;
        const { authenticated: isAuthed } = await authRes.json();
        if (!isAuthed) return;
        if (!cancelled) setAuthenticated(true);
        if (!slotsRes.ok) return;
        const data = await slotsRes.json();
        if (!cancelled) setSlots(toSlots(sanitize(data?.slots)));
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
  }, [initialSlots]);

  const persist = async (next: (MenuId | null)[]) => {
    try {
      await fetch("/api/nav-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: next }),
      });
    } catch {
      /* noop — UI already optimistic */
    }
  };

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editChecked, setEditChecked] = useState<MenuId[]>([]);

  const openEditSheet = useCallback(() => {
    setEditChecked(slots.filter((s) => s.menu !== null).map((s) => s.menu!));
    setEditSheetOpen(true);
  }, [slots]);

  const startLongPress = useCallback(() => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(20); } catch {}
      }
      openEditSheet();
    }, LONG_PRESS_MS);
  }, [openEditSheet]);

  const onNavPointerDown = () => {
    if (!authenticated) return;
    startLongPress();
  };

  const toggleEditCheck = (id: MenuId) => {
    setEditChecked((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= SLOT_COUNT) return prev;
      return [...prev, id];
    });
  };

  const confirmEditSheet = () => {
    const next: (MenuId | null)[] = Array(SLOT_COUNT).fill(null);
    editChecked.forEach((id, i) => { next[i] = id; });
    setSlots(toSlots(next));
    persist(next);
    setEditSheetOpen(false);
  };

  const handleSlotClick = (index: number) => (e: React.MouseEvent) => {
    const id = slots[index].menu;
    if (id === null) {
      e.preventDefault();
      if (!authenticated) {
        openLoginPrompt('메뉴를 추가하려면\n로그인이 필요해요.');
        return;
      }
      openEditSheet();
      return;
    }
    router.push(MENU_CATALOG[id].href);
  };

  // 슬롯에 등록된 메뉴의 경로를 미리 prefetch
  const slotHrefs = useMemo(
    () => slots.filter((s) => s.menu !== null).map((s) => MENU_CATALOG[s.menu!].href),
    [slots],
  );
  useEffect(() => {
    slotHrefs.forEach((href) => router.prefetch(href));
  }, [slotHrefs, router]);

  const isHomeActive = pathname === HOME_HREF || pathname === "/";
  const isSettingsActive = pathname?.startsWith("/settings");

  return (
    <>
      <nav
        data-bottom-nav-root
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 pointer-events-none"
      >
        <div className="mx-4 mb-[max(env(safe-area-inset-bottom),16px)] pointer-events-auto">
          <div
            className="flex items-center bg-white/90 backdrop-blur-xl rounded-3xl px-2 shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
            onPointerDown={onNavPointerDown}
            onPointerUp={clearLongPress}
            onPointerCancel={clearLongPress}
            onPointerLeave={clearLongPress}
          >
            {/* HOME */}
            <Link
              href={HOME_HREF}
              className="flex flex-col items-center justify-center gap-0.5 py-2 flex-1"
            >
              <HomeIcon active={isHomeActive} />
              <span className={`text-[10px] ${isHomeActive ? "text-primary-600 font-bold" : "text-gray-400 font-medium"}`}>홈</span>
            </Link>

            {/* MIDDLE 3 SLOTS */}
            <div className="flex flex-[3] items-center">
              {slots.map((slot, index) => {
                const menuId = slot.menu;
                const isActive = menuId !== null && pathname === MENU_CATALOG[menuId].href;
                return (
                  <div
                    key={slot.id}
                    className="relative flex-1"
                    onClick={handleSlotClick(index)}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer">
                      {menuId === null ? (
                        <>
                          <PlusIcon />
                          <span className="text-[10px] text-gray-400 font-medium">추가</span>
                        </>
                      ) : (
                        <>
                          {MENU_CATALOG[menuId].icon(isActive, "#FFC72C")}
                          <span className={`text-[10px] ${isActive ? "text-primary-600 font-bold" : "text-gray-400 font-medium"}`}>
                            {MENU_CATALOG[menuId].label}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SETTINGS */}
            <Link
              href={SETTINGS_HREF}
              className="flex flex-col items-center justify-center gap-0.5 py-2 flex-1"
            >
              <MyIcon active={!!isSettingsActive} />
              <span className={`text-[10px] ${isSettingsActive ? "text-primary-600 font-bold" : "text-gray-400 font-medium"}`}>마이</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* EDIT BOTTOM SHEET */}
      {editSheetOpen && (
        <EditMenuSheet
          editChecked={editChecked}
          onToggle={toggleEditCheck}
          onReorder={setEditChecked}
          onCancel={() => setEditSheetOpen(false)}
          onConfirm={confirmEditSheet}
        />
      )}
    </>
  );
}

/* ── 메뉴 편집 바텀시트 ── */
function EditMenuSheet({
  editChecked,
  onToggle,
  onReorder,
  onCancel,
  onConfirm,
}: {
  editChecked: MenuId[];
  onToggle: (id: MenuId) => void;
  onReorder: (next: MenuId[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const availableMenus = ALL_MENU_IDS.filter((id) => id !== "temperament");

  return (
    <div
      data-nav-picker
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-3xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">메뉴 편집</h3>
          <span className="text-xs text-gray-400">{editChecked.length}/{SLOT_COUNT}개 선택</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">메뉴를 선택하고, 순서를 드래그로 변경하세요.</p>

        {/* 선택된 메뉴 — 드래그로 순서 변경 */}
        {editChecked.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">선택된 메뉴 (드래그하여 순서 변경)</p>
            <Reorder.Group
              axis="y"
              values={editChecked}
              onReorder={onReorder}
              as="div"
              className="flex flex-col gap-1"
            >
              {editChecked.map((id) => {
                const item = MENU_CATALOG[id];
                return (
                  <Reorder.Item
                    key={id}
                    value={id}
                    as="div"
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-amber-50 cursor-grab active:cursor-grabbing select-none"
                    whileDrag={{ scale: 1.02, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
                  >
                    <DragHandleIcon />
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                      {item.icon(true, "#FFC72C")}
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex-1">{item.label}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggle(id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"
                      aria-label="제거"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <path d="M2 2 L8 8 M8 2 L2 8" stroke="#6b7280" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        )}

        {/* 전체 메뉴 목록 */}
        <p className="text-xs font-semibold text-gray-500 mb-2">전체 메뉴</p>
        <div className="flex flex-col gap-1">
          {availableMenus.map((id) => {
            const item = MENU_CATALOG[id];
            const checked = editChecked.includes(id);
            const disabled = !checked && editChecked.length >= SLOT_COUNT;
            return (
              <button
                key={id}
                type="button"
                onClick={() => !disabled && onToggle(id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                  checked ? "bg-amber-50" : disabled ? "opacity-40" : "bg-gray-50 active:bg-gray-100"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  checked ? "bg-amber-400 border-amber-400" : "border-gray-300 bg-white"
                }`}>
                  {checked && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
                  {item.icon(checked, "#FFC72C")}
                </div>
                <span className={`text-sm font-medium ${checked ? "text-gray-900" : "text-gray-500"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-sm font-semibold text-gray-700"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-gray-900 text-sm font-semibold text-white"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="4" r="1.2" fill="#9ca3af" />
      <circle cx="10" cy="4" r="1.2" fill="#9ca3af" />
      <circle cx="6" cy="8" r="1.2" fill="#9ca3af" />
      <circle cx="10" cy="8" r="1.2" fill="#9ca3af" />
      <circle cx="6" cy="12" r="1.2" fill="#9ca3af" />
      <circle cx="10" cy="12" r="1.2" fill="#9ca3af" />
    </svg>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? "#FFC72C" : "#9ca3af";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function MyIcon({ active }: { active: boolean }) {
  const c = active ? "#FFC72C" : "#9ca3af";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}
