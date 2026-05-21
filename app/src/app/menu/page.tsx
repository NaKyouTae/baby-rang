"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import { palette } from "@/lib/colors";
import KakaoAdBanner from "@/components/ads/KakaoAdBanner";
import { MENU_CATALOG, type MenuId } from "@/components/menuCatalog";

const ROLE_ICONS: Record<string, string> = {
  mom: '/icon-mom.svg',
  dad: '/icon-dad.svg',
  grandmother: '/icon-grandmother.svg',
  grandfather: '/icon-grandfather.svg',
  caregiver: '/icon-caregiver.svg',
  other: '/icon-other.svg',
};

const ROLE_LABELS: Record<string, string> = {
  mom: '엄마',
  dad: '아빠',
  grandmother: '할머니',
  grandfather: '할아버지',
  caregiver: '돌보미',
  other: '기타',
};

type MenuSection = {
  title: string;
  items: MenuId[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "성장일기",
    items: ["growth-record", "growth-pattern", "physical-growth"],
  },
  {
    title: "육아정보",
    items: ["wonder-weeks", "sleep-golden-time", "air-quality"],
  },
  {
    title: "편의도구",
    items: ["nursing-room", "temperament"],
  },
];

export default function MenuPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoaded: isAuthLoaded } = useAuth();
  const { openLoginPrompt } = useLoginPrompt();

  return (
    <div className="flex flex-col bg-white">
      {/* 헤더 — 홈 헤더와 동일 레이아웃, 우측은 프로필 + X */}
      <header
        className="sticky top-0 z-30 bg-white flex items-center justify-between px-6 shrink-0"
        style={{
          minHeight: 56,
          paddingTop: 'calc(var(--safe-area-top) + 12px)',
          paddingBottom: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/header-logo.png" alt="아기랑" width={32} height={32} />
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
            onClick={() => router.push('/home')}
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <div style={{ paddingBottom: 32 }}>
        {/* 사용자 프로필 */}
        <section className="px-6 pt-5 pb-[24px]">
          {!isAuthLoaded ? (
            <div className="h-14" />
          ) : isAuthenticated ? (
            <Link
              href="/settings/profile"
              className="flex w-full items-center gap-4 text-left"
            >
              <div className="flex shrink-0 items-center justify-center rounded-[30px] bg-gray-100 overflow-hidden" style={{ width: 60, height: 60 }}>
                {user?.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImage}
                    alt={user.nickname ?? "프로필"}
                    className="rounded-[30px] object-cover"
                    style={{ width: 60, height: 60 }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ROLE_ICONS[user?.parentRole ?? ''] ?? ROLE_ICONS.other}
                    alt={ROLE_LABELS[user?.parentRole ?? ''] ?? '프로필'}
                    width={32}
                    height={32}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[16px] font-medium text-app-black truncate">
                    {user?.nickname ?? "아기랑 회원"} 님
                  </p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                {user?.email && (
                  <p className="text-[12px] font-normal mt-2 truncate" style={{ color: palette.gray500 }}>{user.email}</p>
                )}
              </div>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLoginPrompt('아기랑 서비스를 이용하려면\n로그인이 필요해요.')}
              className="flex w-full items-center gap-4 text-left"
            >
              <div className="flex shrink-0 items-center justify-center rounded-[30px] bg-gray-100 overflow-hidden" style={{ width: 60, height: 60 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-boy.svg" alt="아기" width={32} height={32} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center" style={{ gap: 8 }}>
                  <p className="text-[16px] font-medium text-black truncate">로그인이 필요해요</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={palette.black} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <p className="text-[12px] font-normal mt-0.5 truncate" style={{ color: palette.gray500 }}>로그인하고 육아 동반자 아기랑과 함께해요.</p>
              </div>
            </button>
          )}
        </section>

        {/* 카카오 배너 */}
        <section className="mb-[8px] flex justify-center">
          <KakaoAdBanner unit="DAN-mFffxN7OmFUS6FZt" />
        </section>

        {/* 메뉴 섹션들 */}
        {MENU_SECTIONS.map((section, idx) => (
          <div key={section.title}>
            {idx > 0 && (
              <div
                className="mx-6 border-t border-dotted"
                style={{ borderColor: palette.gray200, marginTop: 24, marginBottom: 24 }}
              />
            )}
            <section className={idx === 0 ? "mt-[24px]" : undefined}>
              <h3 className="text-[12px] font-medium px-6 mb-[16px]" style={{ color: palette.gray500 }}>
                {section.title}
              </h3>
              <div className="flex flex-col gap-[16px]">
                {section.items.map((id) => {
                  const item = MENU_CATALOG[id];
                  return (
                    <Link
                      key={id}
                      href={item.href}
                      className="flex items-center px-6 active:opacity-70 transition-opacity"
                    >
                      <span className="flex-1 text-left text-[16px] font-medium text-black">
                        {item.label}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        ))}
      </div>
    </div>
  );
}
