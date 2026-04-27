/**
 * ── 애드센스 승인용 임시 Footer ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 이 파일 삭제 가능
 *
 * 삭제 시 layout.tsx 내 import/사용 부분도 함께 제거하세요.
 */
import Link from "next/link";
import { ADSENSE_CONTENT_ENABLED } from "@/lib/adsenseContent";

export default function AdSenseFooter() {
  if (!ADSENSE_CONTENT_ENABLED) return null;

  return (
    <footer className="w-full border-t border-gray-100 bg-gray-50 py-6 px-4 text-center text-xs text-gray-400 space-y-3">
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/about" className="hover:text-gray-600">서비스 소개</Link>
        <Link href="/privacy" className="hover:text-gray-600">개인정보처리방침</Link>
        <Link href="/terms" className="hover:text-gray-600">이용약관</Link>
        <Link href="/refund" className="hover:text-gray-600">환불 정책</Link>
        <a href="mailto:help@spectrify.kr" className="hover:text-gray-600">문의하기</a>
      </nav>
      <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        <Link href="/guide/wonder-weeks" className="hover:text-gray-600">원더윅스</Link>
        <Link href="/guide/sleep-schedule" className="hover:text-gray-600">수면 가이드</Link>
        <Link href="/guide/temperament" className="hover:text-gray-600">기질 검사</Link>
        <Link href="/guide/growth-chart" className="hover:text-gray-600">성장 도표</Link>
        <Link href="/guide/nursing-room" className="hover:text-gray-600">수유실</Link>
        <Link href="/guide/breastfeeding" className="hover:text-gray-600">모유수유</Link>
        <Link href="/guide/baby-food" className="hover:text-gray-600">이유식</Link>
        <Link href="/guide/development-milestones" className="hover:text-gray-600">발달 이정표</Link>
        <Link href="/guide/vaccination" className="hover:text-gray-600">예방접종</Link>
        <Link href="/guide/baby-bath" className="hover:text-gray-600">신생아 목욕</Link>
        <Link href="/guide/fever" className="hover:text-gray-600">열 대처</Link>
        <Link href="/guide/formula-vs-breast" className="hover:text-gray-600">모유 vs 분유</Link>
        <Link href="/guide/baby-massage" className="hover:text-gray-600">아기 마사지</Link>
        <Link href="/guide/tummy-time" className="hover:text-gray-600">터미타임</Link>
        <Link href="/guide/baby-teeth" className="hover:text-gray-600">치아 관리</Link>
        <Link href="/guide/postpartum" className="hover:text-gray-600">산후조리</Link>
        <Link href="/guide/baby-clothes-size" className="hover:text-gray-600">옷 사이즈</Link>
        <Link href="/guide/outing-checklist" className="hover:text-gray-600">외출 준비</Link>
        <Link href="/guide/travel-with-baby" className="hover:text-gray-600">아기와 여행</Link>
      </nav>
      <p>&copy; {new Date().getFullYear()} Spectrify. All rights reserved.</p>
    </footer>
  );
}
