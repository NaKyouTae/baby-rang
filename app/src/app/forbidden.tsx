import Link from "next/link";
import type { Metadata } from "next";
import { palette } from "@/lib/colors";

export const metadata: Metadata = {
  title: "이 페이지에 접근할 수 없어요",
  robots: { index: false, follow: false },
};

export default function Forbidden() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen-safe px-6 text-center"
      style={{
        paddingTop: "calc(var(--safe-area-top) + 24px)",
        paddingBottom: "calc(var(--safe-area-bottom) + 24px)",
      }}
    >
      <style>{`[data-bottom-nav-root]{display:none !important}`}</style>

      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          backgroundColor: palette.gray100,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 11.6668V15.0001M5 8.33348V6.66682C5 6.38293 5.02306 6.10515 5.06917 5.83348M15 8.33348V6.66682C15.0001 5.65118 14.6908 4.65961 14.1135 3.82406C13.5361 2.98851 12.7179 2.3486 11.7679 1.98949C10.8179 1.63038 9.78102 1.5691 8.79531 1.8138C7.8096 2.05851 6.92178 2.59759 6.25 3.35932"
            stroke={palette.black}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M9.16669 18.3335H6.66669C4.31002 18.3335 3.13085 18.3335 2.39919 17.601C1.66669 16.8693 1.66669 15.6902 1.66669 13.3335C1.66669 10.9768 1.66669 9.79766 2.39919 9.066C3.13085 8.3335 4.31002 8.3335 6.66669 8.3335H13.3334C15.69 8.3335 16.8692 8.3335 17.6009 9.066C18.3334 9.79766 18.3334 10.9768 18.3334 13.3335C18.3334 15.6902 18.3334 16.8693 17.6009 17.601C16.8692 18.3335 15.69 18.3335 13.3334 18.3335H12.5"
            stroke={palette.black}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h1
        className="font-medium"
        style={{
          marginTop: 10,
          fontSize: 14,
          lineHeight: "20px",
          color: palette.black,
        }}
      >
        이 페이지에 접근할 수 없어요.
      </h1>
      <p
        className="font-normal"
        style={{
          marginTop: 4,
          fontSize: 12,
          lineHeight: "18px",
          color: palette.gray500,
        }}
      >
        권한을 확인해 주세요.
      </p>

      <Link
        href="/home"
        className="inline-flex items-center justify-center text-white active:opacity-80 transition-opacity"
        style={{
          marginTop: 10,
          height: 24,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: palette.teal,
        }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
