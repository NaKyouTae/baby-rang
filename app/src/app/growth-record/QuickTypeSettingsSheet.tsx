'use client';

import { useMemo, useState } from 'react';
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
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.72949 12.7468C2.02116 11.8268 1.66699 11.366 1.66699 10.0002C1.66699 8.6335 2.02116 8.17433 2.72949 7.2535C4.14366 5.41683 6.51533 3.3335 10.0003 3.3335C13.4853 3.3335 15.857 5.41683 17.2712 7.2535C17.9795 8.17516 18.3337 8.63433 18.3337 10.0002C18.3337 11.3668 17.9795 11.826 17.2712 12.7468C15.857 14.5835 13.4853 16.6668 10.0003 16.6668C6.51533 16.6668 4.14366 14.5835 2.72949 12.7468Z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12.5 10C12.5 10.663 12.2366 11.2989 11.7678 11.7678C11.2989 12.2366 10.663 12.5 10 12.5C9.33696 12.5 8.70107 12.2366 8.23223 11.7678C7.76339 11.2989 7.5 10.663 7.5 10C7.5 9.33696 7.76339 8.70107 8.23223 8.23223C8.70107 7.76339 9.33696 7.5 10 7.5C10.663 7.5 11.2989 7.76339 11.7678 8.23223C12.2366 8.70107 12.5 9.33696 12.5 10Z" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.24136 5.58752C2.17616 5.43502 2.05305 5.31467 1.89912 5.25294C1.74518 5.19121 1.57303 5.19316 1.42053 5.25835C1.26803 5.32355 1.14768 5.44666 1.08595 5.6006C1.02422 5.75454 1.02616 5.92669 1.09136 6.07919L2.24136 5.58752ZM7.53386 11.4484C7.58051 11.3796 7.61297 11.3022 7.62936 11.2208C7.64576 11.1393 7.64574 11.0554 7.62933 10.974C7.61291 10.8925 7.58042 10.8152 7.53375 10.7464C7.48709 10.6777 7.42718 10.6189 7.35754 10.5736C7.28791 10.5283 7.20993 10.4973 7.12818 10.4825C7.04643 10.4677 6.96254 10.4693 6.88143 10.4873C6.80031 10.5053 6.72359 10.5392 6.65576 10.5872C6.58792 10.6352 6.53034 10.6962 6.48636 10.7667L7.53386 11.4484ZM5.30886 12.5759C5.2641 12.6447 5.23334 12.7217 5.21833 12.8024C5.20332 12.8831 5.20436 12.966 5.22138 13.0463C5.25576 13.2085 5.35318 13.3505 5.4922 13.4409C5.63121 13.5312 5.80045 13.5627 5.96267 13.5283C6.04299 13.5113 6.11917 13.4786 6.18686 13.4322C6.25456 13.3857 6.31244 13.3264 6.3572 13.2575L5.30886 12.5759ZM18.908 6.07919C18.9662 5.92822 18.9636 5.76056 18.9007 5.61148C18.8378 5.46241 18.7196 5.34352 18.5709 5.27984C18.4221 5.21616 18.2545 5.21263 18.1032 5.27002C17.9519 5.3274 17.8288 5.44121 17.7597 5.58752L18.908 6.07919ZM16.6414 10.9667C16.6986 11.0281 16.7676 11.0773 16.8442 11.1115C16.9209 11.1457 17.0037 11.164 17.0876 11.1655C17.1715 11.167 17.2549 11.1516 17.3327 11.1201C17.4105 11.0887 17.4812 11.0419 17.5406 10.9826C17.5999 10.9232 17.6467 10.8525 17.6781 10.7747C17.7096 10.6969 17.725 10.6135 17.7235 10.5296C17.722 10.4457 17.7037 10.3629 17.6695 10.2862C17.6354 10.2096 17.5861 10.1406 17.5247 10.0834L16.6414 10.9667ZM9.3747 13.75C9.3747 13.9158 9.44054 14.0748 9.55775 14.192C9.67496 14.3092 9.83394 14.375 9.9997 14.375C10.1655 14.375 10.3244 14.3092 10.4416 14.192C10.5588 14.0748 10.6247 13.9158 10.6247 13.75H9.3747ZM13.6422 13.2575C13.7326 13.3965 13.8745 13.494 14.0367 13.5283C14.1989 13.5627 14.3682 13.5312 14.5072 13.4409C14.6462 13.3505 14.7436 13.2085 14.778 13.0463C14.8124 12.8841 14.7809 12.7149 14.6905 12.5759L13.6422 13.2575ZM4.60886 9.71586C4.71915 9.59727 4.77911 9.44051 4.7761 9.27859C4.77309 9.11668 4.70735 8.96225 4.59273 8.84785C4.47811 8.73344 4.32356 8.66799 4.16164 8.66529C3.99972 8.66259 3.84307 8.72284 3.7247 8.83336L4.60886 9.71586ZM2.4747 10.0825C2.3643 10.201 2.30419 10.3577 2.30705 10.5196C2.30991 10.6815 2.3755 10.836 2.49001 10.9505C2.60452 11.0651 2.75901 11.1306 2.92093 11.1335C3.08284 11.1364 3.23955 11.0763 3.35803 10.9659L2.4747 10.0825ZM9.9997 11.0417C7.31303 11.0417 5.38386 9.70419 4.10386 8.32502C3.56595 7.74302 3.09058 7.1062 2.68553 6.42502C2.53301 6.16868 2.39203 5.90564 2.26303 5.63669L2.2447 5.59586L2.24136 5.58752L2.24053 5.58669L1.66636 5.83336L1.09136 6.07919L1.0922 6.08002L1.09303 6.08252L1.09553 6.08752L1.12886 6.16086C1.15053 6.20974 1.18303 6.27724 1.22636 6.36336C1.3122 6.53502 1.4397 6.77669 1.61136 7.06419C1.95303 7.63919 2.47386 8.40586 3.1872 9.17502C4.61636 10.7125 6.85303 12.2917 9.9997 12.2917V11.0417ZM12.7605 10.5259C11.9522 10.845 11.0347 11.0417 9.9997 11.0417V12.2917C11.198 12.2917 12.2705 12.0617 13.218 11.6892L12.7605 10.5259ZM6.48636 10.7667L5.30886 12.5759L6.3572 13.2567L7.53386 11.4484L6.48636 10.7667ZM18.333 5.83336L17.758 5.58669H17.7589V5.58835L17.753 5.59919L17.7297 5.65086C17.5699 5.98322 17.3919 6.30649 17.1964 6.61919C16.6958 7.42596 16.0936 8.16507 15.4047 8.81836L16.2605 9.73002C17.3336 8.71225 18.2148 7.50977 18.8622 6.18002L18.8947 6.10919L18.903 6.08919L18.9064 6.08336V6.08086L18.9072 6.08002L18.333 5.83336ZM15.4047 8.81836C14.688 9.49002 13.8114 10.1117 12.7605 10.5259L13.218 11.6892C14.4455 11.2059 15.4555 10.4859 16.2605 9.73002L15.4047 8.81836ZM15.3914 9.71586L16.6414 10.9667L17.5247 10.0825L16.2747 8.83252L15.3914 9.71586ZM9.3747 11.6667V13.75H10.6247V11.6667H9.3747ZM12.4655 11.4484L13.6422 13.2575L14.6905 12.5759L13.513 10.7667L12.4655 11.4484ZM3.72386 8.83169L2.47386 10.0817L3.35803 10.9659L4.60803 9.71669L3.72386 8.83169Z" fill="currentColor" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16.6663 5.8335H3.33301M16.6663 10.0002H3.33301M16.6663 14.1668H3.33301" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function SortableRow({
  item,
  onToggle,
  isLast,
}: {
  item: Item;
  onToggle: (type: GrowthType) => void;
  isLast: boolean;
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
      className={`flex items-center gap-4 py-3 bg-white ${
        isLast ? '' : 'border-b border-dotted border-gray-200'
      } ${
        isDragging
          ? 'shadow-[0_8px_24px_rgba(0,0,0,0.15)] scale-[1.02] rounded-[8px]'
          : ''
      }`}
    >
      <div
        className="w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden shrink-0"
        style={{ borderColor: style.border, backgroundColor: style.bg }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={RECORD_ICONS[item.type]}
          alt=""
          width={24}
          height={24}
          aria-hidden="true"
          style={item.visible ? undefined : { filter: 'grayscale(1) opacity(0.5)' }}
        />
      </div>
      <span className="flex-1 text-sm font-medium text-app-black">
        {cfg.label}
      </span>
      <div className="flex items-center gap-[10px] text-gray-500">
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
    <BottomSheet open onClose={onClose} ariaLabel="설정">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-base font-medium text-app-black">설정</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 flex items-center justify-center text-gray-400 active:text-gray-600"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-4">
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
              {items.map((it, idx) => (
                <SortableRow
                  key={it.type}
                  item={it}
                  onToggle={toggleVisible}
                  isLast={idx === items.length - 1}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="px-4 pt-2 pb-3 flex gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-[4px] bg-gray-200 text-gray-600 text-sm font-semibold active:bg-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-12 rounded-[4px] bg-primary-500 text-white text-sm font-semibold active:bg-primary-600"
          >
            저장
          </button>
        </div>
    </BottomSheet>
  );
}
