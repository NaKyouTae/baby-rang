"use client";

import Link from "next/link";

export default function HomeHeaderActions() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/settings" aria-label="마이페이지">
        <svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" stroke="black" strokeWidth="1.25"/>
          <path d="M14.975 16.6667C14.8417 14.2567 14.1042 12.5 9.99999 12.5C5.89583 12.5 5.15833 14.2567 5.02499 16.6667" stroke="black" strokeWidth="1.25" strokeLinecap="round"/>
          <path d="M5.83332 2.78167C7.09953 2.04894 8.53706 1.66426 9.99999 1.66667C14.6025 1.66667 18.3333 5.3975 18.3333 10C18.3333 14.6025 14.6025 18.3333 9.99999 18.3333C5.39749 18.3333 1.66666 14.6025 1.66666 10C1.66666 8.4825 2.07249 7.05833 2.78166 5.83333" stroke="black" strokeWidth="1.25" strokeLinecap="round"/>
        </svg>
      </Link>
      <button
        type="button"
        aria-label="메뉴"
        onClick={() => alert("기능 개발중입니다.")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hamburger-menu-linear.svg" alt="" width={24} height={24} />
      </button>
    </div>
  );
}
