/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기 성장 도표 보는 법 - WHO 표준 성장 곡선 완벽 가이드",
  description:
    "WHO 표준 성장 도표의 의미, 백분위수 해석법, 키·몸무게·머리둘레 측정법, 성장 곡선 추세 파악법을 상세히 안내합니다.",
  alternates: { canonical: "/guide/growth-chart" },
};

export default function GrowthChartGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">성장 도표란 무엇인가요?</h2>
      <p>
        성장 도표(Growth Chart)는 같은 성별, 같은 연령의 아이들과 비교하여 우리 아이의
        성장 상태를 확인할 수 있는 그래프입니다. 세계보건기구(WHO)가 전 세계 건강한
        영유아를 대상으로 수집한 데이터를 기반으로 제작되었으며, 대한민국에서도 WHO
        성장 기준을 공식적으로 사용하고 있습니다.
      </p>
      <p>
        성장 도표는 단순히 아이가 크고 작은지를 보는 것이 아니라, 아이만의 성장 추세가
        일정하게 유지되고 있는지를 확인하는 도구입니다. 한 번의 측정보다 여러 번의
        측정을 통한 추세 관찰이 훨씬 중요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">측정 항목</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">키(신장)</h3>
      <p>
        24개월 미만은 누워서 측정하는 신장(length)을, 24개월 이상은 서서 측정하는
        키(height)를 사용합니다. 누운 자세 측정이 보통 0.5~1cm 더 길게 나옵니다.
        병원 검진 시 정확한 장비로 측정하는 것이 가장 좋으며, 집에서는 아기를 평평한
        곳에 눕힌 뒤 머리 끝과 발 끝까지의 거리를 재면 됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">몸무게</h3>
      <p>
        영아용 체중계를 사용하는 것이 가장 정확합니다. 기저귀만 입힌 상태에서 측정하며,
        수유 직전 같은 조건에서 측정하면 일관된 결과를 얻을 수 있습니다. 하루 중에도
        수백 그램의 차이가 날 수 있으므로, 같은 시간대에 측정하는 것이 좋습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">머리둘레</h3>
      <p>
        머리둘레는 뇌 발달의 간접적인 지표입니다. 눈썹 위, 귀 위, 뒤통수의 가장 튀어나온
        부분을 지나도록 줄자를 감아 측정합니다. 생후 첫 2년간 머리둘레가 급격히 증가하며,
        이 시기의 뇌 성장이 매우 활발합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">백분위수 해석하기</h2>
      <p>
        성장 도표의 곡선은 3, 15, 50, 85, 97 백분위수를 나타냅니다. 50 백분위수는
        중앙값으로, 같은 성별·연령 아이 100명 중 정확히 50번째라는 뜻입니다.
        50 백분위수가 &ldquo;정상&rdquo;이고 나머지가 &ldquo;비정상&rdquo;인 것이 아닙니다.
        3~97 백분위수 사이에 있으면 정상 범위입니다.
      </p>
      <p>
        더 중요한 것은 추세입니다. 아기가 꾸준히 25 백분위수를 유지한다면 아무 문제가
        없습니다. 하지만 75 백분위수에서 갑자기 15 백분위수로 떨어지거나, 97 백분위수를
        넘어서 급격히 증가한다면 소아과 상담이 필요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">성장 곡선을 볼 때 주의할 점</h2>
      <p>
        미숙아는 교정 연령(출산 예정일 기준 나이)을 사용해야 합니다. 모유 수유아와 분유
        수유아의 성장 패턴은 차이가 있을 수 있으며, WHO 성장 기준은 모유 수유아를 기준으로
        합니다. 이유식 시작, 감기 등 일시적 요인으로 1~2주 성장이 둔화될 수 있으나
        이는 정상적인 현상입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 성장 기록하기</h2>
      <p>
        <Link href="/growth-record" className="text-teal-600 font-medium hover:underline">
          아기랑 성장 기록
        </Link>
        에서 키, 몸무게, 머리둘레를 입력하면 WHO 성장 도표 위에 우리 아기의 위치를
        자동으로 표시해 줍니다.{" "}
        <Link href="/growth-pattern" className="text-teal-600 font-medium hover:underline">
          성장 패턴 분석
        </Link>
        기능으로 시간에 따른 성장 추세도 한눈에 확인할 수 있습니다.
      </p>
    </>
  );
}
