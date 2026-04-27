/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아기 예방접종 스케줄 - 국가필수 접종 일정표와 주의사항",
  description:
    "신생아부터 만 6세까지 국가필수 예방접종 일정표, 접종 전후 주의사항, 이상반응 대처법을 상세히 안내합니다.",
  alternates: { canonical: "/guide/vaccination" },
};

export default function VaccinationGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">예방접종이 중요한 이유</h2>
      <p>
        예방접종은 감염병으로부터 아기를 보호하는 가장 효과적인 방법입니다. 신생아와
        영아는 면역 체계가 미성숙하여 감염에 취약하므로, 정해진 시기에 접종을 완료하는
        것이 매우 중요합니다. 국가필수예방접종은 무료로 지원되며, 질병관리청이 권장하는
        표준 일정에 따라 진행합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">출생~1개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">BCG (결핵)</h3>
      <p>
        생후 4주 이내에 접종합니다. 피내용 BCG가 권장되며, 접종 후 2~3개월 후에 작은
        흉터가 생기는 것은 정상적인 반응입니다. 접종 부위를 문지르거나 짜지 않도록
        주의합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">B형간염 1차</h3>
      <p>
        출생 직후(12시간 이내) 접종합니다. 산모가 B형간염 보균자인 경우 면역글로불린
        (HBIG)을 함께 투여합니다. 이후 1개월, 6개월에 2차·3차 접종을 진행합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">2~6개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">DTaP (디프테리아·파상풍·백일해)</h3>
      <p>
        생후 2개월, 4개월, 6개월에 기초 접종 3회를 진행합니다. 접종 후 접종 부위의
        발적, 부종, 미열이 나타날 수 있으며, 대부분 1~2일 내에 호전됩니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">IPV (소아마비)</h3>
      <p>
        생후 2개월, 4개월, 6~18개월에 접종합니다. 주사형 불활성화 백신으로, 경구용
        생백신보다 안전합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">Hib (b형 헤모필루스 인플루엔자)</h3>
      <p>
        생후 2개월, 4개월, 6개월에 기초 접종, 12~15개월에 추가 접종합니다. 세균성
        뇌막염과 폐렴을 예방합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">PCV (폐렴구균)</h3>
      <p>
        생후 2개월, 4개월, 6개월에 기초 접종, 12~15개월에 추가 접종합니다. 폐렴,
        중이염, 뇌막염 예방에 효과적입니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">로타바이러스</h3>
      <p>
        생후 2개월, 4개월(, 6개월)에 경구 투여합니다. 백신 종류에 따라 2회 또는 3회
        접종입니다. 영아 설사의 가장 흔한 원인인 로타바이러스 감염을 예방합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">12~15개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">MMR (홍역·볼거리·풍진)</h3>
      <p>
        12~15개월에 1차 접종, 만 4~6세에 2차 접종합니다. 접종 후 7~10일경 미열이나
        발진이 나타날 수 있으며, 이는 면역 반응으로 정상입니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">수두</h3>
      <p>
        12~15개월에 1회 접종합니다. 접종 후에도 가볍게 수두에 걸릴 수 있지만,
        미접종자에 비해 증상이 현저히 가벼워집니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">A형간염</h3>
      <p>
        12~23개월에 1차 접종, 6개월 후 2차 접종합니다. 총 2회 접종으로 장기 면역을
        획득합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">접종 전후 주의사항</h2>
      <p>
        접종 당일에는 아기의 건강 상태를 확인하고, 열이 나거나 심하게 아픈 경우 접종을
        연기합니다. 접종 후 20~30분간 의료기관에서 이상반응을 관찰한 뒤 귀가합니다.
        접종 부위는 청결하게 유지하되, 문지르거나 마사지하지 않습니다. 당일은 격한 활동을
        피하고, 목욕은 가볍게만 합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">이상반응 대처법</h2>
      <p>
        접종 부위의 발적·부종·통증, 38도 미만의 미열은 흔한 반응이며 1~2일 내 호전됩니다.
        38.5도 이상의 고열이 지속되거나, 경련, 심한 보챔, 접종 부위의 심한 부종이
        나타나면 즉시 소아과를 방문하세요. 이상반응 발생 시 질병관리청 예방접종 피해보상
        제도를 통해 지원받을 수 있습니다.
      </p>
    </>
  );
}
