/**
 * ── 애드센스 승인용 임시 레이아웃 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import { redirect } from "next/navigation";
import { ADSENSE_CONTENT_ENABLED } from "@/lib/adsenseContent";
import BackButton from "@/components/BackButton";
import Link from "next/link";

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  if (!ADSENSE_CONTENT_ENABLED) redirect("/");

  return (
    <div className="flex flex-col min-h-dvh bg-white pb-24 px-6">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)] -mx-6">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          육아 가이드
        </h1>
      </header>
      <article className="py-6 text-[14px] leading-relaxed text-gray-700 space-y-6">
        {children}
      </article>
      <nav className="border-t border-gray-100 pt-4 mt-4">
        <p className="text-xs text-gray-400 mb-2">다른 가이드 보기</p>
        <ul className="flex flex-wrap gap-2">
          <li><Link href="/guide/wonder-weeks" className="text-xs text-teal-600 hover:underline">원더윅스</Link></li>
          <li><Link href="/guide/sleep-schedule" className="text-xs text-teal-600 hover:underline">수면 스케줄</Link></li>
          <li><Link href="/guide/temperament" className="text-xs text-teal-600 hover:underline">기질 검사</Link></li>
          <li><Link href="/guide/growth-chart" className="text-xs text-teal-600 hover:underline">성장 도표</Link></li>
          <li><Link href="/guide/nursing-room" className="text-xs text-teal-600 hover:underline">수유실</Link></li>
          <li><Link href="/guide/breastfeeding" className="text-xs text-teal-600 hover:underline">모유수유</Link></li>
          <li><Link href="/guide/baby-food" className="text-xs text-teal-600 hover:underline">이유식</Link></li>
          <li><Link href="/guide/development-milestones" className="text-xs text-teal-600 hover:underline">발달 이정표</Link></li>
          <li><Link href="/guide/vaccination" className="text-xs text-teal-600 hover:underline">예방접종</Link></li>
          <li><Link href="/guide/baby-bath" className="text-xs text-teal-600 hover:underline">신생아 목욕</Link></li>
          <li><Link href="/guide/fever" className="text-xs text-teal-600 hover:underline">아기 열 대처</Link></li>
          <li><Link href="/guide/formula-vs-breast" className="text-xs text-teal-600 hover:underline">모유 vs 분유</Link></li>
          <li><Link href="/guide/baby-massage" className="text-xs text-teal-600 hover:underline">아기 마사지</Link></li>
          <li><Link href="/guide/tummy-time" className="text-xs text-teal-600 hover:underline">터미타임</Link></li>
          <li><Link href="/guide/baby-teeth" className="text-xs text-teal-600 hover:underline">치아 관리</Link></li>
          <li><Link href="/guide/postpartum" className="text-xs text-teal-600 hover:underline">산후조리</Link></li>
          <li><Link href="/guide/baby-clothes-size" className="text-xs text-teal-600 hover:underline">옷 사이즈</Link></li>
          <li><Link href="/guide/outing-checklist" className="text-xs text-teal-600 hover:underline">외출 체크리스트</Link></li>
          <li><Link href="/guide/travel-with-baby" className="text-xs text-teal-600 hover:underline">아기와 여행</Link></li>
        </ul>
      </nav>
    </div>
  );
}
