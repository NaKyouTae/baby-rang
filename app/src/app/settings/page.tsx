"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChildren } from "@/hooks/useChildren";
import { calcChildAge } from "@/lib/childAge";
import { useAuth } from "@/hooks/useAuth";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import ConfirmModal from "@/components/ConfirmModal";

const MENU_ITEMS: Array<{ label: string; href: string; icon: React.ReactNode; requireAuth?: boolean }> = [
  {
    label: "검사 이력",
    href: "/settings/history",
    requireAuth: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "결제 내역",
    href: "/settings/payments",
    requireAuth: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    label: "공지사항",
    href: "/settings/notices",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "이용약관",
    href: "/settings/terms",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: "환불정책",
    href: "/settings/refund",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <polyline points="3 4 3 10 9 10" />
      </svg>
    ),
  },
  {
    label: "개인정보처리방침",
    href: "/settings/privacy",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#404040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [bizOpen, setBizOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const { children, isLoaded } = useChildren();
  const { isAuthenticated, user, isLoaded: isAuthLoaded } = useAuth();
  const { requireLogin, openLoginPrompt } = useLoginPrompt();

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* 사용자 정보 섹션 */}
      <section className="mx-4 mt-[calc(env(safe-area-inset-top,24px)+16px)] rounded-2xl bg-white p-5 shadow-sm">
        {!isAuthLoaded ? (
          <div className="h-14" />
        ) : isAuthenticated ? (
          <Link
            href="/settings/profile"
            className="flex w-full items-center gap-4 text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 overflow-hidden">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.nickname ?? "프로필"}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 truncate">
                {user?.nickname ?? "아기랑 회원"}님
              </p>
              {user?.email && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{user.email}</p>
              )}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openLoginPrompt('아기랑 서비스를 이용하려면\n로그인이 필요해요.')}
            className="flex w-full items-center gap-4 text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 truncate">로그인이 필요해요</p>
              <p className="text-xs text-gray-400 mt-0.5">로그인하고 아기랑을 시작해 보세요</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </section>

      {/* 우리아이 섹션 */}
      <section className="mx-4 mt-3 rounded-2xl bg-white p-5 shadow-sm">
        {isLoaded && children.length > 0 ? (
          <>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">
              {children.length === 1 ? "내 아이" : "내 아이들"}
            </h2>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide">
            {children.map((child) => (
              <Link
                key={child.id}
                href="/settings/children"
                className="flex flex-col items-center shrink-0"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 overflow-hidden">
                  {child.profileImage ? (
                    <img
                      src={child.profileImage}
                      alt={child.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-700 font-medium truncate max-w-[64px] text-center">
                  {child.name}
                </p>
                {(() => {
                  const { days, months, extraDays } = calcChildAge(child.birthDate);
                  return (
                    <>
                      <p className="mt-0.5 text-[10px] text-gray-500 text-center">D+{days}</p>
                      <p className="text-[10px] text-gray-400 text-center">{months}개월 {extraDays}일</p>
                    </>
                  );
                })()}
              </Link>
            ))}
            <Link
              href="/settings/children"
              className="flex flex-col items-center shrink-0"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gray-300">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <p className="mt-2 text-xs text-gray-400 truncate max-w-[64px] text-center">추가</p>
            </Link>
          </div>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              if (!requireLogin('우리 아이를 등록하려면\n로그인이 필요해요.')) {
                e.preventDefault();
              } else {
                router.push("/settings/children");
              }
            }}
            className="flex w-full items-center gap-4 text-left"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900 truncate">우리 아이 등록하러 가기</p>
              <p className="text-sm text-gray-400 mt-0.5">아이를 등록하고 기질 검사를 시작해 보세요</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </section>

      {/* 메뉴 리스트 */}
      <section className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
        {MENU_ITEMS.map((item, idx) => {
          const className = `flex items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors ${
            idx < MENU_ITEMS.length - 1 ? "border-b border-gray-100" : ""
          }`;
          const inner = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50">
                {item.icon}
              </span>
              <span className="flex-1 text-left text-[15px] text-gray-800">{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4d4d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          );
          if (item.requireAuth) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  if (!requireLogin(`${item.label}을(를) 확인하려면\n로그인이 필요해요.`)) return;
                  router.push(item.href);
                }}
                className={`w-full ${className}`}
              >
                {inner}
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={className}>
              {inner}
            </Link>
          );
        })}
      </section>

      {/* 로그아웃 (로그인 상태일 때만) */}
      {isAuthLoaded && isAuthenticated && (
        <section className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/home";
            }}
            className="flex w-full items-center gap-4 px-5 py-4 active:bg-gray-50 transition-colors"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            <span className="flex-1 text-left text-[15px] text-red-500">로그아웃</span>
          </button>
        </section>
      )}

      {/* 탈퇴하기 (로그인 상태일 때만) */}
      {isAuthLoaded && isAuthenticated && (
        <div className="mx-4 mt-3 flex justify-center px-2">
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            탈퇴하기
          </button>
        </div>
      )}

      {/* 사업자 정보 */}
      <section className="mx-4 mt-6">
        <button
          type="button"
          onClick={() => setBizOpen((v) => !v)}
          className="flex w-full items-center gap-1 px-4 py-2"
        >
          <span className="text-xs text-gray-400">스펙트럼 사업자 정보</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${bizOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {bizOpen && (
          <div className="space-y-1 px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed">
            <p>대표자 : 나규태</p>
            <p>사업자명 : 스펙트럼</p>
            <p>사업자번호 : 244-20-02381</p>
            <p>고객센터 이메일 : spectrum.mesh@gmail.com</p>
          </div>
        )}
      </section>

      <ConfirmModal
        open={withdrawOpen}
        emoji="⚠️"
        variant="danger"
        title={"정말 탈퇴하시겠어요?"}
        description={
          "탈퇴 시 우리 아이 정보, 검사 이력,\n결제 내역 등 모든 데이터가 삭제됩니다.\n삭제된 데이터는 복구할 수 없습니다."
        }
        confirmLabel={withdrawing ? "처리 중..." : "탈퇴하기"}
        cancelLabel="취소"
        onClose={() => {
          if (!withdrawing) setWithdrawOpen(false);
        }}
        onConfirm={async () => {
          if (withdrawing) return;
          setWithdrawing(true);
          try {
            const res = await fetch("/api/auth/withdraw", { method: "POST" });
            if (res.ok) {
              window.location.href = "/home";
            } else {
              alert("탈퇴 처리 중 오류가 발생했어요.\n잠시 후 다시 시도해주세요.");
              setWithdrawing(false);
            }
          } catch {
            alert("탈퇴 처리 중 오류가 발생했어요.\n잠시 후 다시 시도해주세요.");
            setWithdrawing(false);
          }
        }}
      />
    </div>
  );
}
