'use client';

import DateTimeWheelModal from './DateTimeWheelModal';

/** 이전 호출 경로도 동일한 기본 스타일 휠을 사용하도록 유지한다. */
interface Props {
  open: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  onConfirm: (month: number, day: number, hour: number, minute: number, year?: number) => void;
  onClose: () => void;
}

export default function TimePickerModal({ open, year, month, day, hour, minute, onConfirm, onClose }: Props) {
  if (!open) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  return <DateTimeWheelModal title="일시 선택" value={`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`}
    onClose={onClose} onConfirm={value => {
      const [date, time] = value.split('T');
      const [nextYear, nextMonth, nextDay] = date.split('-').map(Number);
      const [nextHour, nextMinute] = time.split(':').map(Number);
      onConfirm(nextMonth, nextDay, nextHour, nextMinute, nextYear);
    }} />;
}
