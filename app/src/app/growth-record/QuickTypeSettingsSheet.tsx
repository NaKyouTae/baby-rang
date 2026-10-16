'use client';

import { useMemo, useState } from 'react';
import { RECORD_EMOJI } from './pixelUi';
import BottomSheet from '@/components/BottomSheet';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  Modifier,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MENU_TYPES,
  GrowthType,
  TYPE_CONFIG,
  RECORD_ICONS,
  CATEGORY_STYLE,
} from './types';

interface Props {
  current: GrowthType[];
  onClose: () => void;
  onSave: (next: GrowthType[]) => void;
}

type Item = { type: GrowthType; visible: boolean };

const ORDER_KEY = 'baby-rang:growth-record-type-order';

const HIDDEN_STYLE = {
  border: '#BBC0C5',
  bg: 'rgba(187, 192, 197, 0.05)',
};

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

function loadStoredOrder(): GrowthType[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((t): t is GrowthType =>
      (MENU_TYPES as string[]).includes(t),
    );
  } catch {
    return null;
  }
}

function saveStoredOrder(order: GrowthType[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* noop */
  }
}

function EyeOpenIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 4h6v2H7zM4 6h3v2H4zM2 8h2v4H2zM4 12h3v2H4zM7 14h6v2H7zM13 12h3v2h-3zM16 8h2v4h-2zM13 6h3v2h-3zM8 8h4v4H8z" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <span className="relative block size-[20px]">
      <EyeOpenIcon />
      <svg className="absolute inset-0" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M3 2L18 17" stroke="#FDFDFE" strokeWidth="5" />
        <path d="M2 2h2v2H2zM4 4h2v2H4zM6 6h2v2H6zM8 8h2v2H8zM10 10h2v2h-2zM12 12h2v2h-2zM14 14h2v2h-2zM16 16h2v2h-2z" fill="currentColor" />
      </svg>
    </span>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 4h16v2H2zM2 9h16v2H2zM2 14h16v2H2z" />
    </svg>
  );
}

function SortableRow({
  item,
  onToggle,
}: {
  item: Item;
  onToggle: (type: GrowthType) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.type });

  const cfg = TYPE_CONFIG[item.type];
  const style = item.visible ? CATEGORY_STYLE[item.type] : HIDDEN_STYLE;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
      className={`shrink-0 flex items-center gap-[10px] min-h-[64px] p-[10px] bg-[#FDFDFE] border-b border-[#121212] ${
        isDragging
          ? 'shadow-[0_8px_24px_rgba(0,0,0,0.15)] scale-[1.02] rounded-[4px]'
          : ''
      }`}
    >
      {/* 기록 화면 버튼과 같은 네모 칩·이모지. 숨긴 항목은 회색으로 흐리게 */}
      <div
        className="size-[44px] rounded-[4px] border flex items-center justify-center shrink-0"
        style={{
          borderColor: item.visible ? style.border : '#BBC0C5',
          background: item.visible ? `linear-gradient(${style.bg}, ${style.bg}), #FDFDFE` : '#F7F8F9',
        }}
      >
        <span
          className="flex items-center justify-center"
          style={item.visible ? undefined : { filter: 'grayscale(1) opacity(0.5)' }}
        >
          {RECORD_EMOJI[item.type] ?? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={RECORD_ICONS[item.type]} alt="" width={32} height={32} aria-hidden="true" className="block" />
          )}
        </span>
      </div>
      <span className="flex-1 min-w-0 text-[16px] leading-[1.4] font-normal text-[#121212]">
        {item.type === 'FORMULA' ? '분유수유' : item.type === 'BREASTFEEDING' ? '모유수유' : cfg.label}
      </span>
      <div className="flex items-center gap-[10px] text-[#121212]">
        <button
          type="button"
          onClick={() => onToggle(item.type)}
          aria-label={item.visible ? '숨기기' : '표시'}
          className="w-5 h-5 flex items-center justify-center active:opacity-70"
        >
          {item.visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
        </button>
        <button
          type="button"
          aria-label="순서 변경"
          {...attributes}
          {...listeners}
          className="w-5 h-5 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        >
          <HamburgerIcon />
        </button>
      </div>
    </div>
  );
}

export default function QuickTypeSettingsSheet({ current, onClose, onSave }: Props) {
  const initialItems = useMemo<Item[]>(() => {
    const stored = loadStoredOrder();
    let baseOrder: GrowthType[];
    if (stored && stored.length > 0) {
      const set = new Set(stored);
      baseOrder = [...stored, ...MENU_TYPES.filter((t) => !set.has(t))];
    } else {
      const visibleSet = new Set(current);
      baseOrder = [
        ...current.filter((t) => (MENU_TYPES as string[]).includes(t)),
        ...MENU_TYPES.filter((t) => !visibleSet.has(t)),
      ];
    }
    return baseOrder.map((type) => ({ type, visible: current.includes(type) }));
  }, [current]);

  const [items, setItems] = useState<Item[]>(initialItems);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function toggleVisible(type: GrowthType) {
    setItems((prev) =>
      prev.map((it) =>
        it.type === type ? { ...it, visible: !it.visible } : it,
      ),
    );
  }

  function handleSave() {
    const fullOrder = items.map((it) => it.type);
    saveStoredOrder(fullOrder);
    const next = items.filter((it) => it.visible).map((it) => it.type);
    onSave(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.type === active.id);
    const newIndex = items.findIndex((i) => i.type === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <BottomSheet pixel open onClose={onClose} variant="sheet" ariaLabel="설정">
        <div className="shrink-0 flex justify-center pt-[8px]">
          <span aria-hidden className="w-[36px] h-[4px] rounded-full bg-[#121212]" />
        </div>
        <h2 className="shrink-0 text-center text-[16px] leading-[1.4] font-normal text-[#121212] pt-[16px] pb-[16px]">설정</h2>

        <div className="mx-[20px] border border-[#121212] rounded-[4px] shrink min-h-0 flex flex-col" style={{ height: 'min(500px, calc(90svh - 156px))' }}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="min-h-full flex flex-col">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.type)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((it) => (
                <SortableRow
                  key={it.type}
                  item={it}
                  onToggle={toggleVisible}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div aria-hidden className="min-h-[50px] flex-1" />
          </div>
          </div>
        </div>

        <div className="shrink-0 px-[20px] pt-[16px] pb-[max(16px,var(--safe-area-bottom))] flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[52px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-none active:translate-y-px"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-[52px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px disabled:opacity-60"
          >
            저장하기
          </button>
        </div>
    </BottomSheet>
  );
}
