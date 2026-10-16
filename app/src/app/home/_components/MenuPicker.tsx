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
 * 고른 순서대로 아래 줄부터 왼쪽 → 오른쪽으로 채운다(RoomChrome 의 SLOT_ORDER).
 * 고른 것은 흰 바탕·검정 테두리에 고른 순서(1부터)를 왼쪽 위에 달고, 안 고른 것은 회색으로 흐리게 둔다.
 * 하나를 빼면 뒤의 번호가 하나씩 당겨진다 — 번호가 곧 버튼이 놓이는 순서다.
 * 가득 찬 뒤에 고른 것은 눌러도 안 들어가므로 그때만 이유를 알려 준다.
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
      <div className="grid grid-cols-[repeat(6,50px)] justify-between gap-y-[10px]">
        {MENU_OPTIONS.map((opt) => {
          const order = selected.indexOf(opt.id) + 1;
          const on = order > 0;
          const blocked = !on && full;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              disabled={blocked}
              aria-pressed={on}
              aria-label={on ? `${opt.label}, ${order}번째` : opt.label}
              className="relative flex flex-col gap-[4px] items-center justify-center"
            >
              <span
                className="relative size-[50px] flex items-center justify-center rounded-[4px] border"
                style={
                  on
                    ? { background: '#FDFDFE', borderColor: '#121212' }
                    : { background: '#F7F8F9', borderColor: '#BBC0C5' }
                }
              >
                <span className="block" style={{ opacity: on ? 1 : 0.4 }}>
                  {opt.icon}
                </span>
                {on && (
                  <span
                    aria-hidden
                    className="absolute left-[2px] top-[2px] min-w-[14px] h-[14px] px-[2px] flex items-center justify-center rounded-[2px] bg-[#121212] text-[#FDFDFE] text-[10px] leading-none tabular-nums"
                  >
                    {order}
                  </span>
                )}
              </span>
              <span
                className="text-[12px] leading-[1.4] text-center whitespace-nowrap"
                style={{ color: on ? '#121212' : '#DFE0E1' }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      {full && (
        <p className="mt-3 text-[12px] text-[#808991] leading-[1.4]">
          {MENU_SLOTS}개가 모두 찼습니다. 하나를 빼고 고르세요.
        </p>
      )}
    </div>
  );
}
