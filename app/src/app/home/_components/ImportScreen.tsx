'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelectedChild } from '@/hooks/useChildren';
import { TYPE_CONFIG, type GrowthType } from '@/app/growth-record/types';
import { parseFile, type ParsedRecord } from '@/lib/importRecords';
import { calcChildAge } from '@/lib/childAge';
import { reloadWidget } from '@/lib/widgetBridge';
import ChildSwitcher, { type KidGroup } from './ChildSwitcher';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  open: boolean;
  onBack: () => void;
}

/**
 * 데이터 가져오기 — /settings/import-data 의 기능을 픽셀 디자인으로 다시 깐 화면.
 *
 * 파일을 고르면 종류별 건수를 띄우고, 체크한 종류만 고른 아이의 기록으로 올린다.
 * 파일 해석은 기존 화면과 같은 parseFile 을 쓴다.
 */
export default function ImportScreen({ open, onBack }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const { children, selectedChild } = useSelectedChild();
  // 고르기 전에는 지금 방에 있는 아이로 올린다. 여기서 바꿔도 방의 아이는 그대로 둔다.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [checked, setChecked] = useState<Set<GrowthType>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const child = children.find((c) => c.id === pickedId) ?? selectedChild;
  const age = useMemo(() => (child ? calcChildAge(child.birthDate) : null), [child]);
  const groups: KidGroup[] = children.map((c) => ({
    key: c.id,
    kids: [{ name: c.name, gender: c.gender }],
  }));

  /** 종류별 건수. 파일에 나온 순서를 지킨다. */
  const counts = useMemo(() => {
    const m = new Map<GrowthType, number>();
    for (const r of records) m.set(r.type, (m.get(r.type) ?? 0) + 1);
    return [...m.entries()];
  }, [records]);

  const selected = records.filter((r) => checked.has(r.type));

  const reset = () => {
    setFileName('');
    setRecords([]);
    setChecked(new Set());
    setDone(false);
  };

  const back = () => {
    reset();
    setPickedId(null);
    onBack();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 오도록 비운다
    e.target.value = '';
    if (!file) return;
    const parsed = parseFile(await file.text());
    setFileName(file.name);
    setRecords(parsed);
    setChecked(new Set(parsed.map((r) => r.type)));
    setDone(false);
  };

  const toggle = (type: GrowthType) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleImport = async () => {
    if (!child || selected.length === 0 || uploading) return;
    setUploading(true);
    try {
      const res = await fetch('/api/growth-records/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: selected.map((r) => ({
            childId: child.id,
            type: r.type,
            startAt: r.startAt,
            endAt: r.endAt ?? null,
            data: Object.keys(r.data).length > 0 ? JSON.stringify(r.data) : null,
          })),
        }),
      });
      if (!res.ok) {
        alert('가져오기 중 오류가 발생했어요.');
        return;
      }
      setDone(true);
      reloadWidget();
    } catch {
      alert('가져오기 중 오류가 발생했어요.');
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 bg-[#F7F8F9] flex flex-col gap-[10px] px-[20px]"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 버튼이 가리지 않는다.
        paddingBottom:
          'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 20px)',
      }}
    >
      <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={back} aria-label="뒤로" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <p className="text-[#121212] text-[16px] leading-none">데이터 가져오기</p>
        {/* 디자인의 오른쪽 X 는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
        <span className="size-[24px]" />
      </div>

      {child && age && (
        <div className="shrink-0 flex">
          <ChildSwitcher
            current={{ key: child.id, kids: [{ name: child.name, gender: child.gender }] }}
            groups={groups}
            ageParts={[`D+${age.days}`, `${age.months}개월 ${age.extraDays}일`]}
            onSelect={(id) => {
              setPickedId(id);
              setDone(false);
            }}
          />
        </div>
      )}

      <div className="shrink-0 flex gap-[10px]">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,text/plain"
          onChange={handleFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={`${BOX} flex-1 min-w-0 h-[48px] flex items-center px-[10px] ${
            fileName ? 'justify-start' : 'justify-center'
          }`}
        >
          {fileName ? (
            <span className="w-full text-left text-[#121212] text-[16px] leading-none truncate">
              {fileName}
            </span>
          ) : (
            <span className="text-[#BBC0C5] text-[16px] leading-none">가져올 .txt 파일을 선택하세요.</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          // 버튼 안쪽보다 "찾기"가 넓다. 디자인처럼 한 줄로 두어야 두 줄로 꺾이지 않는다.
          className="w-[52px] h-[48px] shrink-0 flex items-center justify-center p-[10px] rounded-[4px] border border-[#121212] bg-[#EEF0F1] text-[#121212] text-[16px] leading-[1.4] whitespace-nowrap active:translate-y-px"
        >
          찾기
        </button>
      </div>

      {done || counts.length === 0 ? (
        <div className={`${BOX} flex-1 min-h-0 flex items-center justify-center p-[10px]`}>
          <p className="text-[#808991] text-[14px] leading-[1.4] text-center">
            {done
              ? '기록을 성공적으로 가져왔어요.'
              : fileName
                ? '가져올 수 있는 기록이 없습니다.'
                : '가져온 기록이 없습니다.'}
          </p>
        </div>
      ) : (
        <ul className={`${BOX} flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col`}>
          {counts.map(([type, count]) => {
            const on = checked.has(type);
            return (
              <li key={type} className="shrink-0 border-b border-[#121212]">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(type)}
                  className="w-full flex items-center justify-between p-[10px] text-left"
                >
                  <span className="flex flex-col gap-[4px] leading-[1.4]">
                    <span className="text-[#121212] text-[16px]">{TYPE_CONFIG[type].label}</span>
                    <span className="text-[#808991] text-[14px]">{count} 건</span>
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={on ? '/icons/check-on.svg' : '/icons/check-off.svg'}
                    alt=""
                    width={24}
                    height={24}
                    className="block shrink-0"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {done ? (
        <button
          type="button"
          onClick={() => router.push('/growth-record')}
          className="shrink-0 h-[52px] flex items-center justify-center px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px"
        >
          기록 바로가기
        </button>
      ) : (
        counts.length > 0 && (
          <button
            type="button"
            onClick={handleImport}
            disabled={!child || selected.length === 0 || uploading}
            className="shrink-0 h-[52px] flex items-center justify-center px-[20px] rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px disabled:opacity-40"
          >
            데이터 가져오기
          </button>
        )
      )}
    </div>
  );
}
