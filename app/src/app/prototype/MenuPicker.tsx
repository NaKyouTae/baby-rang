'use client';

import { MENU_OPTIONS, MENU_SLOTS, type ActionId } from './RoomChrome';

interface Props {
  selected: ActionId[];
  onChange: (next: ActionId[]) => void;
}

/**
 * 방 좌우에 놓을 기록 버튼을 고르는 격자.
 *
 * 설정이 오른쪽 맨 아래를 고정으로 차지하고, 남은 일곱 자리를
 * 고른 순서대로 아래에서부터 왼쪽·오른쪽 번갈아 채운다.
 * 가득 찬 뒤에 고른 것은 눌러도 안 들어가므로, 왜 안 되는지 흐리게 보여준다.
 */
export default function MenuPicker({ selected, onChange }: Props) {
  const full = selected.length >= MENU_SLOTS;

  const toggle = (id: ActionId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
      return;
    }
    if (full) return;
    onChange([...selected, id]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-[10px] items-start content-start">
        {MENU_OPTIONS.map((opt) => {
          const on = selected.includes(opt.id);
          const order = selected.indexOf(opt.id);
          const blocked = !on && full;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              disabled={blocked}
              aria-pressed={on}
              className="relative flex flex-col gap-[4px] items-center justify-center disabled:opacity-40"
            >
              <span
                className="size-[50px] flex items-center justify-center rounded-[4px] border"
                style={{
                  background: on ? opt.bg : '#F7F8F9',
                  borderColor: on ? opt.border : '#808991',
                }}
              >
                {opt.icon}
              </span>
              <span
                className="text-[12px] leading-[1.4] text-center whitespace-nowrap"
                style={{ color: on ? '#121212' : '#DFE0E1' }}
              >
                {opt.label}
              </span>
              {on && (
                <span className="absolute left-[36px] top-[2px] text-[10px] text-[#121212] tabular-nums">
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[#808991] leading-[1.4]">
        {selected.length} / {MENU_SLOTS}개 선택 · 고른 순서대로 아래에서부터 왼쪽·오른쪽 번갈아 채워집니다
        {full && ' · 자리가 가득 찼습니다. 먼저 하나를 눌러 빼세요'}
      </p>
    </div>
  );
}
