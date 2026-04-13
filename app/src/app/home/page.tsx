import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import BottomNav from "@/components/BottomNavServer";
import { HOME_QUICK_MENUS, MENU_CATALOG } from "@/components/menuCatalog";

export const metadata: Metadata = {
  title: "홈",
  description:
    "아기랑 홈 - 기질 검사, 성장 기록, 원더윅스, 수면추천, 수유실 찾기 등 육아에 필요한 모든 기능을 한눈에 확인하세요.",
  alternates: { canonical: "/home" },
};

const HomeHeroCard = dynamic(() => import("@/components/HomeHeroCard"));
const BannerCarousel = dynamic(() => import("@/components/BannerCarousel"));
const NearbyNursingRoomsStrip = dynamic(() => import("@/components/NearbyNursingRoomsStrip"));

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <main className="flex-1 pb-24" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <HomeHeroCard />

        <div className="px-5 pt-5 space-y-6">
          <section>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 8px" }}>
              {HOME_QUICK_MENUS.map((id) => {
                const item = MENU_CATALOG[id];
                return (
                  <Link
                    key={id}
                    href={item.href}
                    className="flex flex-col items-center gap-1.5 active:opacity-70"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-gray-100">
                      {item.icon(true)}
                    </div>
                    <span className="text-[11px] text-gray-700 font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <BannerCarousel />

            <NearbyNursingRoomsStrip />
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
