import Link from "next/link";
import BottomNav from "@/components/BottomNavServer";
import BannerCarousel from "@/components/BannerCarousel";
import NearbyNursingRoomsStrip from "@/components/NearbyNursingRoomsStrip";
import WonderWeeksStrip from "@/components/WonderWeeksStrip";
import { HOME_QUICK_MENUS, MENU_CATALOG } from "@/components/menuCatalog";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-28" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <BannerCarousel />

        <div className="px-5 pt-5 space-y-5">
          <section>
            <div className="grid grid-cols-5 gap-2">
              {HOME_QUICK_MENUS.map((id) => {
                const item = MENU_CATALOG[id];
                return (
                  <Link
                    key={id}
                    href={item.href}
                    className="flex flex-col items-center gap-1.5 active:opacity-70"
                  >
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                      {item.icon(true)}
                    </div>
                    <span className="text-[10px] text-gray-700 font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 mb-2">기질 검사</h2>
              <Link
                href="/temperament"
                className="relative block h-12 rounded-[4px] overflow-hidden bg-white border border-gray-200"
              >
                <div className="relative h-full flex items-center justify-between px-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-gray-900 truncate">우리 아이 기질 검사</div>
                    <div className="text-[10px] text-gray-500 truncate">간단한 질문으로 알아보는 우리 아이 성향</div>
                  </div>
                  <div className="ml-2 text-[10px] text-gray-500 shrink-0">검사하기 ›</div>
                </div>
              </Link>
            </div>

            <NearbyNursingRoomsStrip />

            <WonderWeeksStrip />
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
