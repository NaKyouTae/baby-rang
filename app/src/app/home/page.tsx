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
          height: 56,
          paddingTop: 'var(--safe-area-top)',
        }}
      >
        <svg width="86" height="20" viewBox="0 0 86 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M71.5774 23.352C68.8574 23.352 66.6734 23.2 65.0254 22.896C63.3774 22.608 62.1614 22.128 61.3774 21.456C60.5934 20.784 60.2014 19.888 60.2014 18.768C60.2014 17.648 60.5854 16.768 61.3534 16.128C62.1374 15.472 63.3454 15.008 64.9774 14.736C66.6254 14.448 68.8254 14.304 71.5774 14.304C74.3294 14.304 76.5214 14.448 78.1534 14.736C79.8014 15.008 81.0094 15.472 81.7774 16.128C82.5614 16.768 82.9534 17.648 82.9534 18.768C82.9534 19.888 82.5614 20.784 81.7774 21.456C80.9934 22.128 79.7774 22.608 78.1294 22.896C76.4814 23.2 74.2974 23.352 71.5774 23.352ZM71.5774 19.464C72.6814 19.464 73.4974 19.448 74.0254 19.416C74.5694 19.384 74.9534 19.32 75.1774 19.224C75.4014 19.128 75.5134 18.976 75.5134 18.768C75.5134 18.576 75.4014 18.432 75.1774 18.336C74.9534 18.24 74.5694 18.176 74.0254 18.144C73.4814 18.096 72.6654 18.072 71.5774 18.072C70.4894 18.072 69.6734 18.096 69.1294 18.144C68.5854 18.176 68.2014 18.24 67.9774 18.336C67.7534 18.432 67.6414 18.576 67.6414 18.768C67.6414 18.976 67.7534 19.128 67.9774 19.224C68.2014 19.32 68.5774 19.384 69.1054 19.416C69.6494 19.448 70.4734 19.464 71.5774 19.464ZM63.2974 13.848C61.5854 13.752 60.3054 13.432 59.4574 12.888C58.6094 12.344 58.1854 11.656 58.1854 10.824C58.1854 10.2 58.4014 9.552 58.8334 8.88H57.4894V5.64H67.3774C67.5374 5.448 67.6174 5.296 67.6174 5.184C67.6174 4.928 67.2894 4.728 66.6334 4.584C65.8814 4.424 64.8094 4.344 63.4174 4.344C61.6574 4.344 59.9614 4.456 58.3294 4.68L58.2094 0.648C59.0574 0.504 60.0734 0.392 61.2574 0.312C62.4414 0.232 63.6414 0.192 64.8574 0.192C66.4574 0.192 67.8894 0.272 69.1534 0.432C72.2254 0.832001 73.7614 1.744 73.7614 3.168C73.7614 3.872 73.3854 4.696 72.6334 5.64H73.9294V8.88H65.0254C64.9614 8.992 64.9294 9.096 64.9294 9.192C64.9294 9.384 65.0414 9.544 65.2654 9.672C65.5054 9.8 65.8574 9.872 66.3214 9.888C66.6894 9.92 67.3614 9.936 68.3374 9.936C70.4974 9.936 72.2174 9.816 73.4974 9.576L74.1934 13.44C72.7214 13.792 70.4174 13.968 67.2814 13.968C65.6814 13.968 64.3534 13.928 63.2974 13.848ZM75.3934 13.728C75.0414 11.312 74.8654 8.672 74.8654 5.808C74.8654 3.584 74.9694 1.648 75.1774 0H82.6654C82.7614 1.168 82.8094 2.464 82.8094 3.888V4.728H85.2094V10.008H82.5694C82.4094 11.496 82.2334 12.736 82.0414 13.728H75.3934Z" fill="#30B0C7"/>
          <path d="M29.3327 15.648C31.8927 15.008 33.8127 14.136 35.0927 13.032C36.3887 11.912 37.0367 10.672 37.0367 9.312C37.0367 9.008 36.9967 8.672 36.9167 8.304C36.7567 7.648 36.4367 7.152 35.9567 6.816C35.4927 6.464 34.8927 6.288 34.1567 6.288C32.9887 6.288 31.6287 6.712 30.0767 7.56L29.4287 2.736C30.5967 1.92 31.8127 1.304 33.0767 0.888C34.3407 0.472001 35.5807 0.264001 36.7967 0.264001C38.1407 0.264001 39.3727 0.512001 40.4927 1.008C41.6287 1.504 42.5647 2.248 43.3007 3.24C44.0367 4.216 44.5007 5.4 44.6927 6.792C44.7887 7.512 44.8367 8.208 44.8367 8.88C44.8367 11.424 44.1967 13.624 42.9167 15.48C41.6367 17.336 39.9407 18.792 37.8287 19.848C35.7327 20.904 33.4527 21.568 30.9887 21.84L29.3327 15.648ZM47.2127 22.8C46.9087 18.896 46.7567 14.888 46.7567 10.776C46.7567 7.32 46.8687 3.728 47.0927 0H54.5807C54.6767 2.16 54.7247 4.312 54.7247 6.456C54.7247 11.896 54.4367 17.344 53.8607 22.8H47.2127Z" fill="#30B0C7"/>
          <path d="M8.28 21.72C5.608 21.72 3.56 20.832 2.136 19.056C0.712 17.28 0 14.648 0 11.16C0 7.672 0.712 5.04 2.136 3.264C3.56 1.488 5.608 0.600001 8.28 0.600001C10.952 0.600001 13 1.488 14.424 3.264C15.848 5.04 16.56 7.672 16.56 11.16C16.56 14.648 15.848 17.28 14.424 19.056C13 20.832 10.952 21.72 8.28 21.72ZM8.28 16.464C8.744 16.464 9.12 16.312 9.408 16.008C9.712 15.688 9.936 15.144 10.08 14.376C10.24 13.608 10.32 12.536 10.32 11.16C10.32 9.784 10.24 8.712 10.08 7.944C9.936 7.176 9.712 6.64 9.408 6.336C9.12 6.016 8.744 5.856 8.28 5.856C7.816 5.856 7.432 6.016 7.128 6.336C6.84 6.64 6.616 7.176 6.456 7.944C6.312 8.712 6.24 9.784 6.24 11.16C6.24 12.536 6.312 13.608 6.456 14.376C6.616 15.144 6.84 15.688 7.128 16.008C7.432 16.312 7.816 16.464 8.28 16.464ZM18.264 22.8C17.912 18.64 17.736 14.392 17.736 10.056C17.736 6.584 17.84 3.232 18.048 0H24.984C25.112 2.512 25.176 4.864 25.176 7.056V8.088H27.6V13.368H25.032C24.92 16.392 24.688 19.536 24.336 22.8H18.264Z" fill="#30B0C7"/>
        </svg>
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

          <div className="mt-4">
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
