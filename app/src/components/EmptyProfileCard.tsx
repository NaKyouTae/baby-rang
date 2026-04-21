'use client';

import Link from 'next/link';

interface EmptyProfileCardProps {
  ctaLabel: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export default function EmptyProfileCard({
  ctaLabel,
  href,
  onClick,
  className = '',
}: EmptyProfileCardProps) {
  const content = (
    <>
      <div className="w-10 h-10 rounded-full border border-primary-500 bg-white flex items-center justify-center text-[22px] leading-none">
        <span aria-hidden>👶🏻</span>
      </div>
      <div className="mt-[10px] text-[12px] leading-[18px] font-normal text-[#222]">
        아기 정보를 입력하고
        <br />
        맞춤형 케어를 시작하세요.
      </div>
      <span className="mt-[10px] inline-flex items-center justify-center h-[32px] px-4 rounded-[4px] bg-primary-500 text-white text-[12px] font-semibold leading-none">
        {ctaLabel}
      </span>
    </>
  );

  const rootClassName = `w-full h-[208px] rounded-[8px] border border-dashed border-gray-300 bg-white px-5 py-5 flex flex-col items-center justify-center text-center active:opacity-90 ${className}`;

  if (href) {
    return (
      <Link href={href} className={rootClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rootClassName}>
      {content}
    </button>
  );
}
