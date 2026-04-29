/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 about/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ADSENSE_CONTENT_ENABLED } from "@/lib/adsenseContent";
import BackButton from "@/components/BackButton";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기랑 소개 - 서비스 안내 및 운영자 정보",
  description:
    "아기랑은 0~36개월 아기를 키우는 부모를 위한 통합 육아 서비스입니다. 서비스 소개, 주요 기능, 운영자 정보, 연락처를 안내합니다.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  if (!ADSENSE_CONTENT_ENABLED) redirect("/");

  return (
    <div className="flex flex-col min-h-dvh bg-white pb-24 px-6">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 relative flex items-center h-14 px-2 pt-[var(--safe-area-top)] -mx-6">
        <BackButton />
        <h1 className="pointer-events-none absolute left-0 right-0 text-center text-[15px] font-semibold text-gray-900">
          아기랑 소개
        </h1>
      </header>

      <article className="py-6 text-[14px] leading-relaxed text-gray-700 space-y-6">
        <h2 className="text-lg font-bold text-gray-900">아기랑이란?</h2>
        <p>
          아기랑은 0~36개월 영유아를 키우는 부모님을 위한 통합 육아 서비스입니다.
          아기의 성장과 발달을 기록하고, 과학적인 정보를 바탕으로 더 나은 육아를
          할 수 있도록 돕는 것을 목표로 합니다. 복잡하고 흩어져 있는 육아 정보를
          한 곳에서 쉽고 빠르게 확인할 수 있습니다.
        </p>

        <h2 className="text-lg font-bold text-gray-900">주요 기능</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>아기 기질 검사</strong> — 토마스와 체스의 9가지 기질 차원 이론을
            기반으로 아기의 타고난 성향을 분석하고 맞춤 양육 가이드를 제공합니다.
          </li>
          <li>
            <strong>성장 기록 및 성장 패턴</strong> — 키, 몸무게, 머리둘레를 기록하면
            WHO 성장 도표 위에 아기의 위치를 표시하고 성장 추세를 분석합니다.
          </li>
          <li>
            <strong>원더윅스(Wonder Weeks)</strong> — 아기의 생년월일을 기반으로
            정신 발달 도약기를 자동 계산하고, 각 시기의 특징과 대처법을 안내합니다.
          </li>
          <li>
            <strong>수면추천</strong> — 월령에 맞는 최적의 낮잠 횟수, 활동 시간,
            밤잠 권장 시간을 계산하여 수면 골든타임을 지킬 수 있도록 돕습니다.
          </li>
          <li>
            <strong>수유실 찾기</strong> — 현재 위치를 기반으로 가장 가까운 수유실을
            지도에서 바로 확인할 수 있습니다. 공공데이터를 활용하여 전국 수유실 정보를
            제공합니다.
          </li>
          <li>
            <strong>대기질 정보</strong> — 아기와 외출 전 실시간 대기질(미세먼지,
            초미세먼지)을 확인할 수 있습니다.
          </li>
        </ul>

        <h2 className="text-lg font-bold text-gray-900">이용 방법</h2>
        <p>
          아기랑은 모바일 웹 브라우저에서 바로 이용할 수 있습니다. 별도의 앱 설치 없이{" "}
          <Link href="/" className="text-teal-600 font-medium hover:underline">
            baby-rang.spectrify.kr
          </Link>
          에 접속하면 됩니다. 홈 화면에 추가하면 앱처럼 사용할 수 있으며, 추후
          iOS/Android 네이티브 앱으로도 출시될 예정입니다.
        </p>

        <h2 className="text-lg font-bold text-gray-900">운영 정보</h2>
        <dl className="space-y-2">
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-800 shrink-0">서비스명</dt>
            <dd>아기랑</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-800 shrink-0">운영</dt>
            <dd>Spectrify</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-800 shrink-0">문의</dt>
            <dd>
              <a href="mailto:help@spectrify.kr" className="text-teal-600 hover:underline">
                help@spectrify.kr
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-semibold text-gray-800 shrink-0">웹사이트</dt>
            <dd>
              <a
                href="https://spectrify.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                spectrify.kr
              </a>
            </dd>
          </div>
        </dl>

        <h2 className="text-lg font-bold text-gray-900">관련 정책</h2>
        <ul className="space-y-1">
          <li>
            <Link href="/privacy" className="text-teal-600 hover:underline">
              개인정보처리방침
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-teal-600 hover:underline">
              이용약관
            </Link>
          </li>
          <li>
            <Link href="/refund" className="text-teal-600 hover:underline">
              환불 정책
            </Link>
          </li>
        </ul>
      </article>
    </div>
  );
}
