"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Reorder, motion } from "framer-motion";
import { ALL_MENU_IDS, MENU_CATALOG, type MenuId } from "./menuCatalog";
import { useLoginPrompt } from "./LoginPromptProvider";
import { HomeNavIcon, MyNavIcon, AddNavIcon } from "./nav-icons";
import { palette } from "@/lib/colors";

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

function fromSlots(slots: Slot[]): (MenuId | null)[] {
  return slots.map((s) => s.menu);
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
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<number | null>(null);
  // SSR로 initialSlots가 내려왔다면 이미 로그인 상태로 간주
  const [authenticated, setAuthenticated] = useState<boolean>(!!initialSlots);

  const dragStartedRef = useRef(false);
  const longPressTimer = useRef<number | null>(null);

  // If parent provided initialSlots (SSR), skip client fetch entirely.
  useEffect(() => {
    if (initialSlots) return;
    let cancelled = false;
    (async () => {
      try {
        // auth와 nav-slots를 병렬로 호출
        const [authRes, slotsRes] = await Promise.all([
          fetch("/api/auth/token", { cache: "no-store" }),
          fetch("/api/nav-slots", { cache: "no-store" }),
        ]);
        if (!authRes.ok) return;
        const { authenticated: isAuthed } = await authRes.json();
        if (!isAuthed) return; // 비로그인 → 기본 슬롯 유지
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

  // tap outside to exit edit mode
  useEffect(() => {
    if (!editMode) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-bottom-nav-root]") && !target.closest("[data-nav-picker]")) {
        setEditMode(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [editMode]);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = () => {
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      setEditMode(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(20); } catch {}
      }
    }, LONG_PRESS_MS);
  };

  const onSlotPointerDown = () => {
    if (!authenticated) return; // 비로그인 → 꾹 눌러 편집 모드 진입 금지
    if (!editMode) startLongPress();
  };

  const handleReorder = (next: Slot[]) => {
    setSlots(next);
    persist(fromSlots(next));
  };

  const handleSlotClick = (index: number) => (e: React.MouseEvent) => {
    if (dragStartedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (editMode) {
      e.preventDefault();
      if (slots[index].menu === null) setPickerOpen(index);
      return;
    }
    const id = slots[index].menu;
    if (id === null) {
      e.preventDefault();
      if (!authenticated) {
        openLoginPrompt('메뉴를 추가하려면\n로그인이 필요해요.');
        return;
      }
      setPickerOpen(index);
      return;
    }
    router.push(MENU_CATALOG[id].href);
  };

  const removeSlot = (index: number) => {
    const next = slots.map((s, i) => (i === index ? { ...s, menu: null } : s));
    setSlots(next);
    persist(fromSlots(next));
  };

  const addToSlot = (index: number, id: MenuId) => {
    const next = slots.map((s) => (s.menu === id ? { ...s, menu: null } : s));
    next[index] = { ...next[index], menu: id };
    setSlots(next);
    persist(fromSlots(next));
    setPickerOpen(null);
  };

  const currentMenus = slots.map((s) => s.menu);
  const availableForPicker = ALL_MENU_IDS.filter(
    (id) => !currentMenus.includes(id),
  );

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

  // 마이페이지 하위 메뉴에서는 하단 네비게이션 숨김
  const isSettingsSubPage = pathname !== "/settings" && pathname?.startsWith("/settings/");
  if (isSettingsSubPage) return null;

  return (
    <>
      <nav
        data-bottom-nav-root
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 pointer-events-none"
      >
        <div className="mx-6 mb-6 pointer-events-auto">
          {editMode && (
            <div className="flex justify-center" style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-4 rounded-[4px] bg-gray-900 text-white text-[12px] font-semibold"
                style={{ height: 24 }}
              >
                저장
              </button>
            </div>
          )}

          <div className="flex items-center justify-center h-[56px] bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_0_20px_rgba(0,0,0,0.04)] overflow-visible">
            {/* HOME */}
            <Link
              href={HOME_HREF}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-[56px]"
              onClick={(e) => { if (editMode) { e.preventDefault(); setEditMode(false); } }}
            >
              <HomeNavIcon active={isHomeActive} />
              <span className={`text-[10px] ${isHomeActive ? "text-primary-500 font-bold" : "text-black font-medium"}`}>홈</span>
            </Link>

            {/* MIDDLE 3 SLOTS — framer-motion Reorder */}
            <Reorder.Group
              axis="x"
              values={slots}
              onReorder={handleReorder}
              as="div"
              className="flex items-center flex-[3]"
            >
              {slots.map((slot, index) => (
                <ReorderSlot
                  key={slot.id}
                  slot={slot}
                  editMode={editMode}
                  pathname={pathname}
                  onPointerDown={onSlotPointerDown}
                  onPointerCancel={clearLongPress}
                  onClickSlot={handleSlotClick(index)}
                  onRemove={() => removeSlot(index)}
                  onDragStart={() => { dragStartedRef.current = true; }}
                  onDragEnd={() => { setTimeout(() => { dragStartedRef.current = false; }, 0); }}
                />
              ))}
            </Reorder.Group>

            {/* SETTINGS */}
            <Link
              href={SETTINGS_HREF}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-[56px]"
              onClick={(e) => { if (editMode) { e.preventDefault(); setEditMode(false); } }}
            >
              <MyNavIcon active={!!isSettingsActive} />
              <span className={`text-[10px] ${isSettingsActive ? "text-primary-500 font-bold" : "text-black font-medium"}`}>마이</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* PICKER — positioned above the nav bar */}
      {pickerOpen !== null && (
        <div
          data-nav-picker
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-[51] pointer-events-none"
        >
          <div className="mx-6 mb-[calc(max(min(var(--safe-area-bottom),34px),24px)+66px)] pointer-events-auto">
            <div
              className="bg-white rounded-lg p-[10px] shadow-[0_0_20px_rgba(0,0,0,0.08)]"
              onClick={(e) => e.stopPropagation()}
            >
              {availableForPicker.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">추가할 수 있는 메뉴가 없어요.</p>
              ) : (
                <div className="grid grid-cols-5 gap-[10px]">
                  {availableForPicker.map((id) => {
                    const item = MENU_CATALOG[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => addToSlot(pickerOpen, id)}
                        className="flex flex-col items-center justify-center gap-1 h-[56px] rounded-lg bg-gray-100 border border-gray-200 active:bg-gray-200"
                      >
                        {item.icon(false, palette.black)}
                        <span className="text-[10px] text-gray-700 font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(null)}
                className="mt-[10px] w-full rounded-[4px] bg-gray-400 text-[12px] font-semibold text-white"
                style={{ height: 28 }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ReorderSlot({
  slot,
  editMode,
  pathname,
  onPointerDown,
  onPointerCancel,
  onClickSlot,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  slot: Slot;
  editMode: boolean;
  pathname: string | null;
  onPointerDown: () => void;
  onPointerCancel: () => void;
  onClickSlot: (e: React.MouseEvent) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const menuId = slot.menu;
  const dragEnabled = editMode && menuId !== null;
  const isActive = menuId !== null && pathname === MENU_CATALOG[menuId].href;

  return (
    <Reorder.Item
      value={slot}
      drag={dragEnabled ? "x" : false}
      dragListener={dragEnabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      as="div"
      className="relative flex-1"
      style={{ touchAction: editMode ? "none" : "auto" }}
      whileDrag={{ scale: 1.1, zIndex: 10 }}
      onPointerDown={onPointerDown}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      onClick={onClickSlot}
    >
      <motion.div
        className={`flex flex-col items-center justify-center gap-1 h-[56px] cursor-pointer`}
        animate={
          editMode && menuId !== null
            ? { rotate: [0, -2, 2, -2, 0], transition: { duration: 0.4, repeat: Infinity, repeatDelay: 0.1 } }
            : { rotate: 0 }
        }
      >
        {menuId === null ? (
          <>
            <AddNavIcon />
            <span className="text-[10px] text-gray-400 font-medium">추가</span>
          </>
        ) : (
          <>
            {MENU_CATALOG[menuId].icon(isActive, isActive ? palette.teal : palette.black)}
            <span className={`text-[10px] ${isActive ? "text-primary-500 font-bold" : "text-black font-medium"}`}>
              {MENU_CATALOG[menuId].label}
            </span>
          </>
        )}
      </motion.div>
      {editMode && menuId !== null && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute -top-1 -right-0 w-[16px] h-[16px] flex items-center justify-center"
          aria-label="삭제"
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M13.3333 6.66667C13.3333 10.3487 10.3487 13.3333 6.66667 13.3333C2.98467 13.3333 0 10.3487 0 6.66667C0 2.98467 2.98467 0 6.66667 0C10.3487 0 13.3333 2.98467 13.3333 6.66667ZM4.64667 4.64667C4.74042 4.55303 4.8675 4.50044 5 4.50044C5.1325 4.50044 5.25958 4.55303 5.35333 4.64667L6.66667 5.96L7.98 4.64667C8.07478 4.55835 8.20015 4.51026 8.32968 4.51255C8.45922 4.51484 8.58281 4.56731 8.67441 4.65892C8.76602 4.75053 8.8185 4.87412 8.82078 5.00365C8.82307 5.13319 8.77499 5.25855 8.68667 5.35333L7.37333 6.66667L8.68667 7.98C8.77499 8.07478 8.82307 8.20015 8.82078 8.32968C8.8185 8.45922 8.76602 8.58281 8.67441 8.67441C8.58281 8.76602 8.45922 8.8185 8.32968 8.82078C8.20015 8.82307 8.07478 8.77499 7.98 8.68667L6.66667 7.37333L5.35333 8.68667C5.25855 8.77499 5.13319 8.82307 5.00365 8.82078C4.87412 8.8185 4.75053 8.76602 4.65892 8.67441C4.56731 8.58281 4.51484 8.45922 4.51255 8.32968C4.51026 8.20015 4.55835 8.07478 4.64667 7.98L5.96 6.66667L4.64667 5.35333C4.55303 5.25958 4.50044 5.1325 4.50044 5C4.50044 4.8675 4.55303 4.74042 4.64667 4.64667Z" fill="black"/>
          </svg>
        </button>
      )}
    </Reorder.Item>
  );
}
