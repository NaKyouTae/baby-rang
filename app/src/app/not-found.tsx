import Link from "next/link";
import type { Metadata } from "next";
import { palette } from "@/lib/colors";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen-safe px-6 text-center"
      style={{
        paddingTop: "calc(var(--safe-area-top) + 24px)",
        paddingBottom: "calc(var(--safe-area-bottom) + 24px)",
      }}
    >
      <style>{`[data-bottom-nav-root]{display:none !important}`}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/header-logo.png"
        alt="아기랑"
        width={88}
        height={88}
        className="mb-8"
      />

      <h1 className="text-[20px] font-bold text-app-black">
        페이지를 찾을 수 없어요
      </h1>
      <p className="mt-2 text-[14px] leading-[20px] text-gray-500">
        요청하신 페이지가 존재하지 않거나
        <br />
        이동되었을 수 있어요.
      </p>

      <Link
        href="/home"
        className="mt-8 inline-flex items-center justify-center h-[48px] px-6 rounded-[8px] text-white text-sm font-bold active:opacity-80 transition-opacity"
        style={{ backgroundColor: palette.teal }}
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
