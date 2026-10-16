'use client';

import { usePathname, useRouter } from 'next/navigation';
import { canGoBack } from '@/lib/navHistory';

/**
 * 약관·정책 문서 화면의 픽셀 디자인 틀.
 * 회색 바탕 위에 헤더 상자와 본문 상자를 하나씩 쌓는다. (결제 내역 화면과 같은 꼴)
 *
 * 화면 높이에 딱 맞추고 본문 상자 안에서만 스크롤한다. 페이지 전체가 스크롤되면
 * 헤더와 본문 테두리까지 같이 밀려 올라가서 문서가 아니라 긴 카드처럼 보인다.
 */

/** 픽셀 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

export default function PixelDocPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // 뒤로 갈 곳이 없으면(새로고침·딥링크) 들어온 자리로 보낸다.
  // /settings/* 는 마이페이지에서 들어오므로 마이페이지를 연 홈으로 간다.
  const fallback = pathname.startsWith('/settings/') ? '/home?my=1' : '/home';
  const goBack = () => (canGoBack() ? router.back() : router.replace(fallback));

  return (
    <div
      className="overflow-hidden flex flex-col gap-[10px] bg-[#F7F8F9] px-[20px]"
      style={{
        // h-full 은 안 된다 — /settings 레이아웃이 높이 없는 div 로 감싸서 100% 가 풀리지 않는다.
        // 앱 셸과 같은 높이를 직접 준다.
        height: 'var(--app-h, 100dvh)',
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        paddingBottom: 'calc(var(--bottom-nav-space) + 20px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />

      <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
        <button type="button" onClick={goBack} aria-label="뒤로가기" className="size-[24px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/chevron-left.svg" alt="" width={24} height={24} className="block" />
        </button>
        <h1 className="text-[#121212] text-[16px] leading-[1.4] font-normal">{title}</h1>
        {/* 오른쪽은 비워 둔다 — 뒤로가기 버튼과 같은 폭이라 제목이 가운데에 남는다 */}
        <span aria-hidden className="size-[24px]" />
      </div>

      <article
        // min-h-0 이 없으면 flex 자식이 내용 높이만큼 늘어나 스크롤이 생기지 않는다.
        // 자식은 줄어들면 안 된다 — 줄면 글이 겹친다.
        className={`${BOX} flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-[16px] p-[10px] text-[14px] leading-[1.4] text-[#808991] break-words [&>*]:shrink-0`}
      >
        {children}
      </article>
    </div>
  );
}

/** 오른쪽 정렬된 시행일자·부칙 한 줄. */
export function DocDate({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-right">{children}</p>;
}

/** 검정 글씨로 쓰는 본문 단락 — 서문과 맺음말. */
export function DocLead({ children }: { children: React.ReactNode }) {
  return <p className="text-[#121212]">{children}</p>;
}

/** 조항 하나. 제목은 검정, 내용은 회색. */
export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-[10px]">
      <h2 className="text-[#121212] font-normal">{title}</h2>
      {children}
    </section>
  );
}

/** 번호 목록. */
export function DocOl({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-[21px]">{children}</ol>;
}

/** 점 목록. nested 면 감싸는 번호 목록과 같은 들여쓰기에 놓는다. */
export function DocUl({ nested, children }: { nested?: boolean; children: React.ReactNode }) {
  return <ul className={`list-disc pl-[21px] ${nested ? '-ml-[21px]' : ''}`}>{children}</ul>;
}

/** 2열 표 — 회색 테두리, 머리 행은 회색 바탕. */
export function DocTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-[#EEF0F1] text-[12px] leading-[20px]">
      {[head, ...rows].map(([a, b], i) => (
        <div
          key={i}
          className={`flex items-start gap-[8px] px-[8px] py-[2px] ${i > 0 ? 'border-t border-[#EEF0F1]' : 'bg-[#F7F8F9]'}`}
        >
          <p className="w-[132px] shrink-0">{a}</p>
          <p className="flex-1 min-w-0">{b}</p>
        </div>
      ))}
    </div>
  );
}
