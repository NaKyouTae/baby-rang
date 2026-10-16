'use client';
import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useAppOverlayLock } from '@/components/ads/appOverlay';
import { selectionFeedback } from '@/lib/selectionFeedback';

const ROW = 32;
const HEIGHT = ROW * 7;
type Option = { value: string; label: string };
type WheelHandle = { read: () => string };
const Wheel = forwardRef<WheelHandle, { label: string; options: Option[]; value: string }>(function Wheel({ label, options, value }, handle) {
  const initial = Math.max(0, options.findIndex(option => option.value === value));
  const [index, setIndex] = useState(initial);
  const last = useRef(initial);
  const scroll = useRef<HTMLDivElement>(null);
  const id = useId();
  const readIndex = () => Math.max(0, Math.min(options.length - 1, Math.round((scroll.current?.scrollTop ?? initial * ROW) / ROW)));
  useImperativeHandle(handle, () => ({ read: () => options[readIndex()].value }));
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = initial * ROW; }, [initial]);
  return <div ref={scroll} role="listbox" aria-label={label} tabIndex={0}
    aria-activedescendant={`${id}-${index}`} onContextMenu={e => e.preventDefault()}
    onScroll={() => {
      const next = readIndex();
      if (next !== last.current) { last.current = next; setIndex(next); selectionFeedback(); }
    }} onKeyDown={e => {
      const delta = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      if (scroll.current) scroll.current.scrollTop = Math.max(0, Math.min(options.length - 1, readIndex() + delta)) * ROW;
    }} className="relative min-w-0 overflow-y-auto scrollbar-hide select-none outline-none"
    style={{ height: HEIGHT, scrollSnapType: 'y mandatory', touchAction: 'pan-y', overscrollBehavior: 'contain', WebkitTouchCallout: 'none',
      maskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)',
      WebkitMaskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)' }}>
    <div style={{ paddingBlock: ROW * 3 }}>
      {options.map((option, i) => <div key={option.value} id={`${id}-${i}`} role="option" aria-selected={index === i}
        className="flex items-center justify-center whitespace-nowrap tabular-nums"
        style={{ height: ROW, scrollSnapAlign: 'center', color: i === index ? '#121212' : '#999999',
          fontSize: 20, transform: `scale(${Math.max(0.65, 1 - Math.abs(i - index) * 0.08)})` }}>{option.label}</div>)}
    </div>
  </div>;
});

const pad = (n: number) => String(n).padStart(2, '0');
export default function DateTimeWheelModal({ value, title, onClose, onConfirm, timeOnly = false }: {
  value: string; title: string; onClose: () => void; onConfirm: (value: string) => void; timeOnly?: boolean;
}) {
  useAppOverlayLock(true);
  const dateRef = useRef<WheelHandle>(null);
  const hourRef = useRef<WheelHandle>(null);
  const minuteRef = useRef<WheelHandle>(null);
  const dates = useMemo(() => {
    if (timeOnly) return [];
    const year = Number(value.slice(0, 4));
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const result: Option[] = [];
    // 날짜는 연말·연초에도 연속되며 선택된 연도 앞뒤 5년을 표시한다.
    for (let d = new Date(year - 5, 0, 1, 12); d.getFullYear() <= year + 5; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const label = key === todayKey ? '오늘' : `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}`;
      result.push({ value: key, label: d.getFullYear() === today.getFullYear() || key === todayKey ? label : `${d.getFullYear()}년 ${label}` });
    }
    return result;
  }, [value, timeOnly]);
  const hours = Array.from({ length: 24 }, (_, i) => ({ value: pad(i), label: pad(i) }));
  const minutes = Array.from({ length: 60 }, (_, i) => ({ value: pad(i), label: pad(i) }));
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/20"
    role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
    <div className="w-full max-w-[430px] px-[8px] flex flex-col gap-[8px]"
      style={{ paddingBottom: 'max(8px, var(--safe-area-bottom))', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
      onClick={e => e.stopPropagation()}>
      <div className="rounded-[14px] bg-[#F2F1EF] overflow-hidden">
        <div className="relative mx-[10px] my-[12px]">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-[8px] bg-[#E6E5E4] pointer-events-none" style={{ height: ROW }} />
          <div className={timeOnly ? "grid grid-cols-2" : "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)]"}>
            {!timeOnly && <Wheel ref={dateRef} label="날짜" options={dates} value={value.slice(0, 10)} />}
            <Wheel ref={hourRef} label="시" options={hours} value={value.slice(11, 13)} />
            <Wheel ref={minuteRef} label="분" options={minutes} value={value.slice(14, 16)} />
          </div>
        </div>
        <button type="button" className="w-full h-[56px] text-[20px] text-[#007AFF] font-medium active:bg-[#E6E5E4]"
          style={{ borderTop: '0.5px solid #D1D1D6' }} onClick={() => {
            onConfirm(`${dateRef.current?.read() ?? value.slice(0, 10)}T${hourRef.current?.read() ?? value.slice(11, 13)}:${minuteRef.current?.read() ?? value.slice(14, 16)}`);
            onClose();
          }}>선택완료</button>
      </div>
      <button type="button" className="h-[56px] rounded-[14px] bg-white text-[#007AFF] text-[20px] font-medium active:bg-[#F2F2F7]" onClick={onClose}>취소</button>
    </div>
  </div>;
}
