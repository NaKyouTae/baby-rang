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

const HomeHeroCard = dynamic(() => import("@/components/HomeHeroCard"));
const BannerCarousel = dynamic(() => import("@/components/BannerCarousel"), {
  loading: () => <div className="h-14 rounded-[4px]" />,
});
const HomeWeatherStrip = dynamic(() => import("@/components/HomeWeatherStrip"));
const NearbyNursingRoomsStrip = dynamic(() => import("@/components/NearbyNursingRoomsStrip"));

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <main
        className="flex-1 px-6"
        style={{
          paddingTop: 'calc(var(--safe-area-top) + 24px)',
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
