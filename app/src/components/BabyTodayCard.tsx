"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useChildren, type Child } from "@/hooks/useChildren";
import { calcChildAge } from "@/lib/childAge";

function tipFor(months: number) {
  if (months < 1) return "신생아 시기예요. 수유 간격과 수면 패턴에 집중해주세요.";
  if (months < 3) return "목 가누기 연습이 시작돼요. 짧은 텀미타임을 시도해보세요.";
  if (months < 5) return "옹알이가 활발해져요. 눈을 마주치며 자주 말 걸어주세요.";
  if (months < 7) return "이맘때는 뒤집기를 시작해요. 주변에 위험한 물건이 없는지 확인해주세요.";
  if (months < 9) return "이유식을 시작/확장할 시기예요. 새로운 식재료를 천천히 시도해보세요.";
  if (months < 12) return "잡고 서기를 시도해요. 모서리 보호와 미끄럼 방지를 점검해주세요.";
  if (months < 18) return "첫걸음과 첫 단어가 나오는 시기예요. 많이 칭찬해주세요.";
  if (months < 24) return "자기주장이 강해져요. 선택지를 주는 대화를 시도해보세요.";
  return "상상놀이가 풍부해지는 시기예요. 함께 역할놀이를 해보세요.";
}

function EmptyCard() {
  return (
    <Link
      href="/settings/children"
      className="block rounded-2xl bg-white p-4 shadow-sm active:opacity-80"
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-2xl">
          👶
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900">우리 아이를 등록해주세요</div>
          <div className="text-xs text-gray-500 mt-0.5">탭하여 아이 정보 추가하기</div>
        </div>
      </div>
    </Link>
  );
}

function ChildSlide({ child }: { child: Child }) {
  const { days, months, extraDays } = calcChildAge(child.birthDate);
  const tip = tipFor(months);

  return (
    <div className="snap-center shrink-0 w-full px-0.5">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-2xl shrink-0">
            {child.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={child.profileImage}
                alt={child.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={child.gender === 'female' ? '/icon-female.svg' : '/icon-male.svg'} alt={child.gender === 'female' ? '여아' : '남아'} width={20} height={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-gray-900 truncate">
                {child.name}
              </span>
              <span className="text-xs text-gray-500">D+{days}</span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              {months}개월 {extraDays}일
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 leading-relaxed">
          💡 {tip}
        </div>
      </div>
    </div>
  );
}

export default function BabyTodayCard() {
  const { children, isLoaded } = useChildren();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (!isLoaded) return null;
  if (children.length === 0) return <EmptyCard />;

  if (children.length === 1) {
    return <ChildSlide child={children[0]} />;
  }

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-0.5 py-1"
      >
        {children.map((c) => (
          <ChildSlide key={c.id} child={c} />
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {children.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-4 bg-gray-900" : "w-1.5 bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
