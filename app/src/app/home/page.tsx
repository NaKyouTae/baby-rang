import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { HOME_QUICK_MENUS, MENU_CATALOG } from "@/components/menuCatalog";
import { palette } from "@/lib/colors";

export const metadata: Metadata = {
  title: "홈",
  description:
    "아기랑 홈 - 기질 검사, 성장 기록, 원더윅스, 수면추천, 수유실 찾기 등 육아에 필요한 모든 기능을 한눈에 확인하세요.",
  alternates: { canonical: "/home" },
};

const HomeHeroCard = dynamic(() => import("@/components/HomeHeroCard"), {
  loading: () => (
    <div>
      <div><div className="h-[32px] flex items-center"><div className="w-48 h-5 rounded bg-gray-200 animate-pulse" /></div><div className="h-[32px] flex items-center"><div className="w-56 h-5 rounded bg-gray-200 animate-pulse" /></div></div>
      <div className="pt-4"><div className="h-[208px] rounded-lg border border-gray-200 bg-white animate-pulse" /></div>
    </div>
  ),
});
const BannerCarousel = dynamic(() => import("@/components/BannerCarousel"), {
  loading: () => <div style={{ height: 56 }} className="rounded-[4px] bg-gray-200 animate-pulse" />,
});
const HomeWeatherStrip = dynamic(() => import("@/components/HomeWeatherStrip"), {
  loading: () => (
    <div className="bg-white rounded-2xl border border-gray-200 px-4 py-5">
      <div className="flex items-center">
        <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" /><div className="space-y-1"><div className="w-10 h-4 rounded bg-gray-200 animate-pulse" /><div className="w-8 h-2.5 rounded bg-gray-200 animate-pulse" /></div></div>
        <div className="w-px h-12 bg-gray-200 mx-4" />
        <div className="flex-1 flex gap-4"><div className="flex-1 flex flex-col items-center gap-1"><div className="w-12 h-3 rounded bg-gray-200 animate-pulse" /><div className="w-8 h-3 rounded bg-gray-200 animate-pulse" /><div className="w-14 h-2.5 rounded bg-gray-200 animate-pulse" /></div><div className="flex-1 flex flex-col items-center gap-1"><div className="w-14 h-3 rounded bg-gray-200 animate-pulse" /><div className="w-8 h-3 rounded bg-gray-200 animate-pulse" /><div className="w-14 h-2.5 rounded bg-gray-200 animate-pulse" /></div></div>
      </div>
    </div>
  ),
});
const NearbyNursingRoomsStrip = dynamic(() => import("@/components/NearbyNursingRoomsStrip"), {
  loading: () => (
    <section>
      <div className="flex items-center justify-between mb-3"><div className="w-24 h-4 rounded bg-gray-200 animate-pulse" /><div className="w-12 h-3 rounded bg-gray-200 animate-pulse" /></div>
      <div className="flex flex-col gap-2">{[0,1,2].map(i => <div key={i} className="rounded-[8px] bg-white border border-gray-200 p-[10px] animate-pulse" style={{minHeight:56}}><div className="flex flex-col gap-[6px]"><div className="w-32 h-3 rounded bg-gray-200" /><div className="w-48 h-3 rounded bg-gray-200" /></div></div>)}</div>
    </section>
  ),
});

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* 홈 헤더 */}
      <header
        className="flex items-center justify-between px-6 shrink-0"
        style={{
          minHeight: 56,
          paddingTop: 'calc(var(--safe-area-top) + 12px)',
          paddingBottom: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-header.svg" alt="아기랑" width={72} height={20} />
        <Link href="/settings" aria-label="마이페이지">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" stroke="black" strokeWidth="1.25"/>
            <path d="M14.975 16.6667C14.8417 14.2567 14.1042 12.5 9.99999 12.5C5.89583 12.5 5.15833 14.2567 5.02499 16.6667" stroke="black" strokeWidth="1.25" strokeLinecap="round"/>
            <path d="M5.83332 2.78167C7.09953 2.04894 8.53706 1.66426 9.99999 1.66667C14.6025 1.66667 18.3333 5.3975 18.3333 10C18.3333 14.6025 14.6025 18.3333 9.99999 18.3333C5.39749 18.3333 1.66666 14.6025 1.66666 10C1.66666 8.4825 2.07249 7.05833 2.78166 5.83333" stroke="black" strokeWidth="1.25" strokeLinecap="round"/>
          </svg>
        </Link>
      </header>

      <main
        className="flex-1 px-6"
        style={{
          paddingTop: 24,
          paddingBottom: 'var(--bottom-nav-space)',
        }}
      >
        <HomeHeroCard />

        <div className="mt-6">
          {/* 퀵 메뉴 */}
          <section>
            <div className="flex justify-between">
              {HOME_QUICK_MENUS.map((id) => {
                const item = MENU_CATALOG[id];
                return (
                  <Link
                    key={id}
                    href={item.href}
                    className="flex flex-col items-center gap-2 active:opacity-70"
                    style={{ width: '56px' }}
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-gray-200">
                      {item.icon(true, palette.black)}
                    </div>
                    <span className="text-[12px] text-black font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="mt-6">
            <HomeWeatherStrip />
          </div>

          <div className="mt-6">
            <BannerCarousel />
          </div>

          <div className="mt-6">
            <NearbyNursingRoomsStrip />
          </div>
        </div>
      </main>
    </div>
  );
}
