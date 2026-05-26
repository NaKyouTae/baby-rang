"use client";

import Link from "next/link";
import { useEffect } from "react";
import { palette } from "@/lib/colors";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
            d="M6.27416 13.7261C2.15833 9.61107 0.490826 4.60607 2.54833 2.54857C4.20666 0.889404 7.78166 1.6519 11.2608 4.1669M13.7258 6.2744C17.8417 10.3902 19.5092 15.3944 17.4517 17.4519C15.7942 19.1094 12.2267 18.3502 8.74999 15.8419M17.4517 2.54857C19.51 4.60607 17.8417 9.61024 13.7267 13.7261C9.60999 17.8419 4.60583 19.5094 2.54833 17.4519C0.88916 15.7936 1.65166 12.2186 4.16666 8.7394C4.80269 7.86315 5.50741 7.03889 6.27416 6.2744C10.39 2.15857 15.3942 0.491071 17.4517 2.54857Z"
            stroke={palette.black}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M12.0834 10.0003C12.0834 10.5529 11.8639 11.0828 11.4732 11.4735C11.0825 11.8642 10.5526 12.0837 10 12.0837C9.44749 12.0837 8.91758 11.8642 8.52688 11.4735C8.13618 11.0828 7.91669 10.5529 7.91669 10.0003C7.91669 9.44779 8.13618 8.91789 8.52688 8.52719C8.91758 8.13649 9.44749 7.91699 10 7.91699C10.5526 7.91699 11.0825 8.13649 11.4732 8.52719C11.8639 8.91789 12.0834 9.44779 12.0834 10.0003Z"
            stroke={palette.black}
            strokeWidth="1.25"
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
        예기치 못한 문제가 생겼어요.
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
        잠시 후 다시 이용해 주세요.
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
