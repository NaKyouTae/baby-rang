import Link from 'next/link';

/**
 * 404 / 403 / 500 공통 픽셀 화면.
 * 로봇 얼굴과 두 줄 문구를 가운데에 두고, '메인으로 돌아가기' 버튼을 바닥에 붙인다.
 * 훅을 쓰지 않아 서버 컴포넌트(not-found, forbidden)와 클라이언트 컴포넌트(error) 양쪽에서 쓴다.
 */
export default function PixelErrorScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      className="relative min-h-[100dvh] flex flex-col gap-[10px] items-center justify-center bg-[#F7F8F9] px-[20px] text-center"
      style={{
        fontFamily: 'Galmuri11Fig, Galmuri11, monospace',
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 바닥 버튼(52px) + 아래 여백(20px)만큼 비워 두고 남은 높이의 가운데에 문구를 둔다. (Figma pb 72)
        paddingBottom: 'calc(var(--safe-area-bottom) + 72px)',
      }}
    >
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 홈과 같은 링크다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <style>{`[data-bottom-nav-root]{display:none !important}`}</style>

      {/* 40px 칸 안에서 얼굴(37×33)은 위 2.5px · 좌우 1.5px 자리에 놓인다 — 아래가 더 비어 있는 게 디자인이다. */}
      <span aria-hidden className="relative block size-[40px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/robot.svg"
          alt=""
          width={37}
          height={33}
          className="absolute left-[1.5px] top-[2.5px] block h-[33px] w-[37px]"
        />
      </span>
      <h1 className="text-[#121212] text-[16px] leading-[1.4] font-normal">{title}</h1>
      <p className="text-[#808991] text-[14px] leading-[1.4]">{description}</p>

      <Link
        href="/home"
        className="absolute left-[20px] right-[20px] h-[52px] flex items-center justify-center rounded-[4px] border border-[#121212] bg-[#3078C9] text-[#FDFDFE] text-[16px] leading-none active:translate-y-px"
        style={{ bottom: 'calc(var(--safe-area-bottom) + 20px)' }}
      >
        메인으로 돌아가기
      </Link>
    </div>
  );
}
