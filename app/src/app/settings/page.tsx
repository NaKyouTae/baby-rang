"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChildren, type Child } from "@/hooks/useChildren";
import { calcChildAge } from "@/lib/childAge";
import { useAuth } from "@/hooks/useAuth";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { palette } from "@/lib/colors";
import { openLocationSettings, getLocationSettingsGuide } from "@/lib/openLocationSettings";
import PageHeader from "@/components/PageHeader";

interface NativeBridgeWindow {
  webkit?: { messageHandlers?: { openSettings?: { postMessage: (msg: string) => void } } };
  Android?: { openLocationSettings?: () => void };
}

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requireAuth?: boolean;
  showDot?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "활동 관리",
    items: [
      {
        label: "기록 공유",
        href: "/settings/sharing",
        requireAuth: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.00008 8.00001C6.00008 8.44204 5.82449 8.86596 5.51193 9.17852C5.19937 9.49108 4.77544 9.66668 4.33341 9.66668C3.89139 9.66668 3.46746 9.49108 3.1549 9.17852C2.84234 8.86596 2.66675 8.44204 2.66675 8.00001C2.66675 7.55798 2.84234 7.13406 3.1549 6.8215C3.46746 6.50894 3.89139 6.33334 4.33341 6.33334C4.77544 6.33334 5.19937 6.50894 5.51193 6.8215C5.82449 7.13406 6.00008 7.55798 6.00008 8.00001Z" stroke="black"/>
            <path d="M9.33333 4.33334L6 6.66668M9.33333 11.6667L6 9.33334" stroke="black" strokeLinecap="round"/>
            <path d="M12.6668 12.3333C12.6668 12.7754 12.4912 13.1993 12.1787 13.5118C11.8661 13.8244 11.4422 14 11.0002 14C10.5581 14 10.1342 13.8244 9.82165 13.5118C9.50909 13.1993 9.3335 12.7754 9.3335 12.3333C9.3335 11.8913 9.50909 11.4674 9.82165 11.1548C10.1342 10.8423 10.5581 10.6667 11.0002 10.6667C11.4422 10.6667 11.8661 10.8423 12.1787 11.1548C12.4912 11.4674 12.6668 11.8913 12.6668 12.3333ZM12.6668 3.66667C12.6668 4.10869 12.4912 4.53262 12.1787 4.84518C11.8661 5.15774 11.4422 5.33333 11.0002 5.33333C10.5581 5.33333 10.1342 5.15774 9.82165 4.84518C9.50909 4.53262 9.3335 4.10869 9.3335 3.66667C9.3335 3.22464 9.50909 2.80072 9.82165 2.48816C10.1342 2.17559 10.5581 2 11.0002 2C11.4422 2 11.8661 2.17559 12.1787 2.48816C12.4912 2.80072 12.6668 3.22464 12.6668 3.66667Z" stroke="black"/>
          </svg>
        ),
      },
      {
        label: "테스트 내역",
        href: "/settings/history",
        requireAuth: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <g clipPath="url(#clip_history)">
              <path d="M14.6666 8.00001C14.6666 11.682 11.6819 14.6667 7.99992 14.6667C4.31792 14.6667 1.33325 11.682 1.33325 8.00001C1.33325 4.31801 4.31792 1.33334 7.99992 1.33334C11.6819 1.33334 14.6666 4.31801 14.6666 8.00001Z" stroke="black" strokeLinecap="round" strokeDasharray="0.33 2.33"/>
              <path d="M14.6667 8.00001C14.6667 4.31801 11.682 1.33334 8 1.33334" stroke="black" strokeLinecap="round"/>
              <path d="M8 6V8.66667H10.6667" stroke="black" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
            <defs>
              <clipPath id="clip_history">
                <rect width="16" height="16" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        ),
      },
      {
        label: "데이터 가져오기",
        href: "/settings/import-data",
        requireAuth: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <g clipPath="url(#clip_download)">
              <path d="M7.99992 4.16666C8.13253 4.16666 8.2597 4.21933 8.35347 4.3131C8.44724 4.40687 8.49992 4.53405 8.49992 4.66666V8.12666L9.64659 6.97999C9.69236 6.93087 9.74756 6.89146 9.80889 6.86414C9.87023 6.83681 9.93644 6.82211 10.0036 6.82093C10.0707 6.81974 10.1374 6.83209 10.1997 6.85724C10.2619 6.88239 10.3185 6.91982 10.3659 6.9673C10.4134 7.01478 10.4509 7.07133 10.476 7.13359C10.5011 7.19585 10.5135 7.26254 10.5123 7.32967C10.5111 7.39681 10.4964 7.46302 10.4691 7.52435C10.4418 7.58568 10.4024 7.64088 10.3533 7.68666L8.35325 9.68666C8.2595 9.78029 8.13242 9.83288 7.99992 9.83288C7.86742 9.83288 7.74034 9.78029 7.64659 9.68666L5.64659 7.68666C5.59746 7.64088 5.55806 7.58568 5.53073 7.52435C5.5034 7.46302 5.48871 7.39681 5.48752 7.32967C5.48634 7.26254 5.49869 7.19585 5.52384 7.13359C5.54898 7.07133 5.58641 7.01478 5.63389 6.9673C5.68137 6.91982 5.73793 6.88239 5.80019 6.85724C5.86245 6.83209 5.92913 6.81974 5.99627 6.82093C6.0634 6.82211 6.12961 6.83681 6.19094 6.86414C6.25228 6.89146 6.30748 6.93087 6.35325 6.97999L7.49992 8.12666V4.66666C7.49992 4.53405 7.5526 4.40687 7.64637 4.3131C7.74013 4.21933 7.86731 4.16666 7.99992 4.16666ZM4.83325 11.3333C4.83325 11.2007 4.88593 11.0735 4.9797 10.9798C5.07347 10.886 5.20064 10.8333 5.33325 10.8333H10.6666C10.7992 10.8333 10.9264 10.886 11.0201 10.9798C11.1139 11.0735 11.1666 11.2007 11.1666 11.3333C11.1666 11.4659 11.1139 11.5931 11.0201 11.6869C10.9264 11.7806 10.7992 11.8333 10.6666 11.8333H5.33325C5.20064 11.8333 5.07347 11.7806 4.9797 11.6869C4.88593 11.5931 4.83325 11.4659 4.83325 11.3333Z" fill="black"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M7.96192 0.833344C6.42259 0.833344 5.21659 0.833344 4.27525 0.96001C3.31259 1.08934 2.55259 1.36001 1.95592 1.95601C1.35925 2.55268 1.08925 3.31268 0.959919 4.27601C0.833252 5.21668 0.833252 6.42268 0.833252 7.96201V8.03801C0.833252 9.57734 0.833252 10.7833 0.959919 11.7247C1.08925 12.6873 1.35992 13.4473 1.95592 14.044C2.55259 14.6407 3.31259 14.9107 4.27592 15.04C5.21659 15.1667 6.42259 15.1667 7.96192 15.1667H8.03792C9.57725 15.1667 10.7833 15.1667 11.7246 15.04C12.6873 14.9107 13.4473 14.64 14.0439 14.044C14.6406 13.4473 14.9106 12.6873 15.0399 11.724C15.1666 10.7833 15.1666 9.57734 15.1666 8.03801V7.96201C15.1666 6.42268 15.1666 5.21668 15.0399 4.27534C14.9106 3.31268 14.6399 2.55268 14.0439 1.95601C13.4473 1.35934 12.6873 1.08934 11.7239 0.96001C10.7833 0.833344 9.57725 0.833344 8.03792 0.833344H7.96192ZM2.66325 2.66334C3.04325 2.28334 3.55659 2.06534 4.40925 1.95068C5.27592 1.83468 6.41459 1.83334 7.99992 1.83334C9.58525 1.83334 10.7239 1.83468 11.5906 1.95068C12.4433 2.06534 12.9573 2.28401 13.3373 2.66334C13.7166 3.04334 13.9346 3.55668 14.0493 4.40934C14.1653 5.27601 14.1666 6.41468 14.1666 8.00001C14.1666 9.58534 14.1653 10.724 14.0493 11.5907C13.9346 12.4433 13.7159 12.9573 13.3366 13.3373C12.9566 13.7167 12.4433 13.9347 11.5906 14.0493C10.7239 14.1653 9.58525 14.1667 7.99992 14.1667C6.41459 14.1667 5.27592 14.1653 4.40925 14.0493C3.55659 13.9347 3.04259 13.716 2.66259 13.3367C2.28325 12.9567 2.06525 12.4433 1.95059 11.5907C1.83459 10.724 1.83325 9.58534 1.83325 8.00001C1.83325 6.41468 1.83459 5.27601 1.95059 4.40934C2.06525 3.55668 2.28392 3.04334 2.66325 2.66334Z" fill="black"/>
            </g>
            <defs>
              <clipPath id="clip_download">
                <rect width="16" height="16" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        ),
      },
    ],
  },
  {
    title: "결제/지원",
    items: [
      {
        label: "결제 내역",
        href: "/settings/payments",
        requireAuth: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6.66669H6.66667" stroke="black" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.8887 7.33337H12.154C10.964 7.33337 10 8.22871 10 9.33337C10 10.438 10.9647 11.3334 12.1533 11.3334H13.8887C13.9447 11.3334 13.972 11.3334 13.9953 11.332C14.3553 11.31 14.642 11.044 14.6653 10.71C14.6667 10.6887 14.6667 10.6627 14.6667 10.6114V8.05537C14.6667 8.00404 14.6667 7.97804 14.6653 7.95671C14.6413 7.62271 14.3553 7.35671 13.9953 7.33471C13.972 7.33337 13.9447 7.33337 13.8887 7.33337Z" stroke="black"/>
            <path d="M13.9766 7.33333C13.9246 6.08533 13.7579 5.32 13.2186 4.78133C12.4379 4 11.1806 4 8.66659 4H6.66659C4.15259 4 2.89525 4 2.11459 4.78133C1.33392 5.56267 1.33325 6.81933 1.33325 9.33333C1.33325 11.8473 1.33325 13.1047 2.11459 13.8853C2.89592 14.666 4.15259 14.6667 6.66659 14.6667H8.66659C11.1806 14.6667 12.4379 14.6667 13.2186 13.8853C13.7579 13.3467 13.9253 12.5813 13.9766 11.3333" stroke="black"/>
            <path d="M4 4.00003L6.49 2.34869C6.84026 2.12116 7.24899 2.00006 7.66667 2.00006C8.08435 2.00006 8.49307 2.12116 8.84333 2.34869L11.3333 4.00003" stroke="black" strokeLinecap="round"/>
            <path d="M11.9939 9.33337H12.0006" stroke="black" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
      {
        label: "공지사항",
        href: "/settings/notices",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <g clipPath="url(#clip_notice)">
              <path d="M14.6666 6.99998V7.99998C14.6666 11.1426 14.6666 12.714 13.6899 13.69C12.7146 14.6666 11.1426 14.6666 7.99992 14.6666C4.85725 14.6666 3.28592 14.6666 2.30925 13.69C1.33325 12.7146 1.33325 11.1426 1.33325 7.99998C1.33325 4.85731 1.33325 3.28598 2.30925 2.30931C3.28659 1.33331 4.85725 1.33331 7.99992 1.33331H8.99992" stroke="black" strokeLinecap="round"/>
              <path d="M12.6665 5.33331C13.7711 5.33331 14.6665 4.43788 14.6665 3.33331C14.6665 2.22874 13.7711 1.33331 12.6665 1.33331C11.5619 1.33331 10.6665 2.22874 10.6665 3.33331C10.6665 4.43788 11.5619 5.33331 12.6665 5.33331Z" stroke="black"/>
              <path d="M4.6665 9.33331H10.6665M4.6665 11.6666H8.6665" stroke="black" strokeLinecap="round"/>
            </g>
            <defs>
              <clipPath id="clip_notice">
                <rect width="16" height="16" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        ),
      },
    ],
  },
  {
    title: "약관/정책",
    items: [
      {
        label: "이용약관",
        href: "/settings/terms",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <g clipPath="url(#clip_terms)">
              <path d="M7.99992 14.6666C11.6819 14.6666 14.6666 11.682 14.6666 7.99998C14.6666 4.31798 11.6819 1.33331 7.99992 1.33331C4.31792 1.33331 1.33325 4.31798 1.33325 7.99998C1.33325 9.06665 1.58392 10.0746 2.02859 10.9686C2.14725 11.206 2.18659 11.4773 2.11792 11.734L1.72125 13.218C1.68197 13.3648 1.682 13.5195 1.72136 13.6663C1.76071 13.8131 1.838 13.947 1.94546 14.0546C2.05293 14.1621 2.18679 14.2395 2.3336 14.2789C2.48042 14.3184 2.63503 14.3185 2.78192 14.2793L4.26592 13.882C4.52351 13.8169 4.79601 13.8484 5.03192 13.9706C5.95389 14.4297 6.97 14.668 7.99992 14.6666Z" stroke="black"/>
              <path d="M5.33325 7H10.6666M5.33325 9.33333H8.99992" stroke="black" strokeLinecap="round"/>
            </g>
            <defs>
              <clipPath id="clip_terms">
                <rect width="16" height="16" fill="white"/>
              </clipPath>
            </defs>
          </svg>
        ),
      },
      {
        label: "개인정보처리방침",
        href: "/settings/privacy",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 6.94465C2 4.81265 2 3.74665 2.252 3.38798C2.50333 3.02998 3.50533 2.68665 5.51 2.00065L5.892 1.86998C6.93667 1.51198 7.45867 1.33331 8 1.33331C8.54133 1.33331 9.06333 1.51198 10.108 1.86998L10.49 2.00065C12.4947 2.68665 13.4967 3.02998 13.748 3.38798C14 3.74665 14 4.81331 14 6.94465V7.99398C14 11.7526 11.174 13.5773 9.40067 14.3513C8.92 14.5613 8.68 14.6666 8 14.6666C7.32 14.6666 7.08 14.5613 6.59933 14.3513C4.826 13.5766 2 11.7533 2 7.99398V6.94465Z" stroke="black"/>
            <path d="M6.33325 8.26663L7.28592 9.33329L9.66659 6.66663" stroke="black" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const { children, isLoaded } = useChildren();
  const { isAuthenticated, user, isLoaded: isAuthLoaded } = useAuth();
  const { requireLogin, openLoginPrompt } = useLoginPrompt();

  const [locationPerm, setLocationPerm] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  const [locationGuideOpen, setLocationGuideOpen] = useState(false);
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      setLocationPerm(status.state);
      status.addEventListener('change', () => setLocationPerm(status.state));
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/notices/has-unread')
      .then((r) => r.json())
      .then((d) => setHasUnreadNotice(d.hasUnread === true))
      .catch(() => {});
  }, [isAuthenticated]);

  const handleLocationToggle = () => {
    const w = window as unknown as NativeBridgeWindow;
    const isNativeApp = !!(w.webkit?.messageHandlers?.openSettings || w.Android?.openLocationSettings);

    if (!isNativeApp) {
      setLocationGuideOpen(true);
      return;
    }

    openLocationSettings({
      onGranted: () => setLocationPerm('granted'),
      onDenied: () => setLocationPerm('denied'),
    });
  };

  const locationGuide = locationGuideOpen ? getLocationSettingsGuide() : null;

  const renderMenuItem = (item: MenuItem) => {
    const className =
      "flex items-center gap-2 px-6 active:bg-gray-50 transition-colors";
    const inner = (
      <>
        <span className="flex shrink-0 items-center justify-center">
          {item.icon}
        </span>
        <span className="flex-1 text-left text-[16px] font-medium text-black">
          <span className="relative">
            {item.label}
            {item.showDot && (
              <img src="/dot.svg" alt="" width={4} height={4} className="absolute top-0 -right-2 pointer-events-none" />
            )}
          </span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  };

  return (
    <div className="flex flex-col min-h-dvh bg-white" style={{ paddingTop: 'var(--safe-area-top)' }}>
      {locationGuide && (
        <ConfirmModal
          open={locationGuideOpen}
          icon={
            <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
                <path d="M2.66675 6.76201C2.66675 3.76401 5.05475 1.33334 8.00008 1.33334C10.9454 1.33334 13.3334 3.76401 13.3334 6.76201C13.3334 9.73668 11.6314 13.2087 8.97542 14.4493C8.67014 14.5923 8.33717 14.6664 8.00008 14.6664C7.66299 14.6664 7.33003 14.5923 7.02475 14.4493C4.36875 13.208 2.66675 9.73734 2.66675 6.76268V6.76201Z" stroke="black"/>
                <path d="M8 8.66669C9.10457 8.66669 10 7.77126 10 6.66669C10 5.56212 9.10457 4.66669 8 4.66669C6.89543 4.66669 6 5.56212 6 6.66669C6 7.77126 6.89543 8.66669 8 8.66669Z" stroke="black"/>
              </svg>
            </div>
          }
          title="위치 권한 변경"
          description={"위치 권한을 변경해주세요.\n설정에서 위치 권한을 변경할 수 있어요."}
          confirmLabel="설정으로 이동"
          onConfirm={() => setLocationGuideOpen(false)}
          onClose={() => setLocationGuideOpen(false)}
        />
      )}

      {/* 헤더 */}
      <PageHeader title="마이페이지" variant="close" />

      <div className="flex-1 overflow-y-auto pb-36">
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
                  <img
                    src={user.profileImage}
                    alt={user.nickname ?? "프로필"}
                    className="rounded-[30px] object-cover"
                    style={{ width: 60, height: 60 }}
                  />
                ) : user?.parentRole === 'mom' ? (
                  <img src="/icon-mom.svg" alt="엄마" width={32} height={32} />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M12 21.3333C13.1333 22.1733 14.5133 22.6667 16 22.6667C17.4867 22.6667 18.8667 22.1733 20 21.3333" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20.0001 16C20.7365 16 21.3334 15.1046 21.3334 14C21.3334 12.8954 20.7365 12 20.0001 12C19.2637 12 18.6667 12.8954 18.6667 14C18.6667 15.1046 19.2637 16 20.0001 16Z" fill="black"/>
                    <path d="M12.0001 16C12.7365 16 13.3334 15.1046 13.3334 14C13.3334 12.8954 12.7365 12 12.0001 12C11.2637 12 10.6667 12.8954 10.6667 14C10.6667 15.1046 11.2637 16 12.0001 16Z" fill="black"/>
                    <path d="M2.93335 13.3333C3.45755 10.7717 4.72264 8.42042 6.57154 6.57152C8.42044 4.72262 10.7717 3.45753 13.3334 2.93333M2.93335 18.6667C3.45755 21.2283 4.72264 23.5796 6.57154 25.4285C8.42044 27.2774 10.7717 28.5425 13.3334 29.0667M29.0667 13.3333C28.5425 10.7717 27.2774 8.42042 25.4285 6.57152C23.5796 4.72262 21.2283 3.45753 18.6667 2.93333M29.0667 18.6667C28.5425 21.2283 27.2774 23.5796 25.4285 25.4285C23.5796 27.2774 21.2283 28.5425 18.6667 29.0667" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
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

        {/* 아기 정보 */}
        <ChildProfileSection
          children={children}
          isLoaded={isLoaded}
          requireLogin={requireLogin}
          router={router}
        />

        {/* 권한 설정 */}
        {locationPerm !== null && (
          <section>
            <h3 className="text-[12px] font-medium px-6 mb-[16px]" style={{ color: palette.gray500 }}>
              권한 설정
            </h3>
            <button
              type="button"
              onClick={handleLocationToggle}
              className="flex w-full items-center gap-2 px-6 active:bg-gray-50 transition-colors"
            >
              <span className="flex shrink-0 items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2.66675 6.76201C2.66675 3.76401 5.05475 1.33334 8.00008 1.33334C10.9454 1.33334 13.3334 3.76401 13.3334 6.76201C13.3334 9.73668 11.6314 13.2087 8.97542 14.4493C8.67014 14.5923 8.33717 14.6664 8.00008 14.6664C7.66299 14.6664 7.33003 14.5923 7.02475 14.4493C4.36875 13.208 2.66675 9.73734 2.66675 6.76268V6.76201Z" stroke="black"/>
                  <path d="M8 8.66669C9.10457 8.66669 10 7.77126 10 6.66669C10 5.56212 9.10457 4.66669 8 4.66669C6.89543 4.66669 6 5.56212 6 6.66669C6 7.77126 6.89543 8.66669 8 8.66669Z" stroke="black"/>
                </svg>
              </span>
              <span className="flex-1 text-left text-[16px] font-medium text-black">위치 권한</span>
              {/* 토글 스위치 */}
              <span
                className={`relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors duration-200`}
                style={{ backgroundColor: locationPerm === 'granted' ? palette.teal : palette.gray300 }}
              >
                <span
                  className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                    locationPerm === 'granted' ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </span>
            </button>
          </section>
        )}

        {/* 메뉴 섹션들 */}
        {MENU_SECTIONS.map((section) => (
          <section key={section.title} className="mt-[24px]">
            <h3 className="text-[12px] font-medium px-6 mb-[16px]" style={{ color: palette.gray500 }}>
              {section.title}
            </h3>
            <div className="flex flex-col gap-[16px]">
              {section.items.map((item) =>
                renderMenuItem(
                  item.href === '/settings/notices' && hasUnreadNotice
                    ? { ...item, showDot: true }
                    : item,
                ),
              )}
            </div>
          </section>
        ))}

        {/* 로그아웃 / 회원탈퇴 */}
        {isAuthLoaded && isAuthenticated && (
          <div className="mt-12 flex items-center justify-center gap-[24px] pb-4">
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/home";
              }}
              className="text-[12px] font-normal" style={{ color: palette.gray500 }}
            >
              로그아웃
            </button>
            <svg width="1" height="8" viewBox="0 0 1 8" fill="none">
              <line x1="0.5" x2="0.5" y2="8" stroke="#EEF0F1"/>
            </svg>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="text-[12px] font-normal" style={{ color: palette.gray500 }}
            >
              회원탈퇴
            </button>
          </div>
        )}
      </div>

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

function ChildProfileCard({ child }: { child: Child }) {
  const { days, months, extraDays } = calcChildAge(child.birthDate);
  return (
    <Link
      href="/settings/children"
      className="flex flex-col items-center shrink-0"
      style={{ borderRadius: '8px', backgroundColor: palette.gray100, border: `1px solid ${palette.gray200}`, paddingTop: '12px', paddingBottom: '12px' }}
    >
      <div
        className="flex shrink-0 items-center justify-center overflow-hidden bg-white"
        style={{ width: 40, height: 40, borderRadius: '50%', border: `1px solid ${palette.teal}` }}
      >
        {child.profileImage ? (
          <img
            src={child.profileImage}
            alt={child.name}
            className="object-cover"
            style={{ width: 40, height: 40, borderRadius: '50%' }}
          />
        ) : (
          <img src={child.gender === 'female' ? '/icon-girl.svg' : '/icon-boy.svg'} alt={child.gender === 'female' ? '여아' : '남아'} width={24} height={24} />
        )}
      </div>
      <p className="text-[16px] font-medium text-black truncate max-w-full text-center px-2" style={{ marginTop: '10px' }}>
        {child.name}
      </p>
      <div className="flex items-center" style={{ marginTop: '6px', gap: '4px' }}>
        <span
          className="text-[12px] font-medium text-white leading-none"
          style={{ backgroundColor: palette.teal, borderRadius: '2px', padding: '2px 4px', height: '16px', display: 'inline-flex', alignItems: 'center' }}
        >
          D+{days}
        </span>
        <span className="text-[12px] font-normal text-black">
          {months}개월 {extraDays}일
        </span>
      </div>
    </Link>
  );
}

function ChildProfileSection({
  children,
  isLoaded,
  requireLogin,
  router,
}: {
  children: Child[];
  isLoaded: boolean;
  requireLogin: (msg: string) => boolean;
  router: ReturnType<typeof useRouter>;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstSlide = el.firstElementChild as HTMLElement | null;
    if (!firstSlide) return;
    // Each "page" shows 2 cards; calculate page width based on scroll position
    const pageW = el.clientWidth;
    const idx = Math.round(el.scrollLeft / (pageW * 0.85));
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  if (!isLoaded || children.length === 0) {
    return (
      <section className="px-6 mb-[24px]">
        <div className="flex flex-col items-center justify-center border border-dashed border-gray-300 px-4" style={{ height: 112, borderRadius: 8, paddingTop: 21, paddingBottom: 21 }}>
          <p className="text-center font-normal text-black" style={{ fontSize: 12, lineHeight: '18px' }}>
            아기 정보를 입력하고
            <br />
            맞춤형 케어를 시작하세요.
          </p>
          <button
            type="button"
            onClick={() => {
              if (!requireLogin('우리 아이를 등록하려면\n로그인이 필요해요.')) return;
              router.push("/settings/children");
            }}
            className="font-semibold text-white"
            style={{ padding: '4px 8px', borderRadius: 4, fontSize: 12, backgroundColor: palette.teal, marginTop: 10 }}
          >
            아기 추가하기
          </button>
        </div>
      </section>
    );
  }

  // 1명: 2열 그리드 (아이 + 빈 프로필)
  if (children.length === 1) {
    return (
      <section className="px-6 mb-[24px]">
        <div className="grid grid-cols-2 gap-3">
          <ChildProfileCard child={children[0]} />
          <Link
            href="/settings/children/add"
            className="flex flex-col items-center justify-center border border-dashed border-gray-300"
            style={{ borderRadius: '8px', minHeight: 100 }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          <span className="rounded-full w-[12px] h-[4px] bg-gray-600" />
          <span className="rounded-full w-[4px] h-[4px] bg-gray-300" />
        </div>
      </section>
    );
  }

  // 2명 이상: 캐러셀 — 2개 꽉 차게 보이고 빈 프로필이 우측에 살짝 보임
  const totalPages = Math.ceil((children.length + 1) / 2); // +1 for add card
  return (
    <section className="px-6 mb-[24px]">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-6 px-6"
        style={{ scrollbarWidth: 'none', scrollPaddingLeft: 24 }}
      >
        {children.map((child) => (
          <div
            key={child.id}
            className="snap-start shrink-0"
            style={{ width: 'calc((100% - 12px) / 2)' }}
          >
            <ChildProfileCard child={child} />
          </div>
        ))}
        {/* 추가 카드 */}
        <div
          className="snap-start shrink-0"
          style={{ width: 'calc((100% - 12px) / 2)' }}
        >
          <Link
            href="/settings/children/add"
            className="flex flex-col items-center justify-center border border-dashed border-gray-300 h-full"
            style={{ borderRadius: '8px', minHeight: 100 }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Link>
        </div>
      </div>
      {/* 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {Array.from({ length: totalPages }).map((_, i) => (
          <span
            key={i}
            className={`rounded-full transition-all ${
              i === activeIdx ? 'w-[12px] h-[4px] bg-gray-600' : 'w-[4px] h-[4px] bg-gray-300'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
