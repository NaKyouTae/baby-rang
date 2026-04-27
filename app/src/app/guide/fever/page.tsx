/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아기 열 대처법 - 체온 기준, 해열제 용량, 병원 가야 할 때",
  description:
    "아기 발열 시 체온 측정법, 월령별 정상 체온 기준, 해열제 종류와 용량, 미온수 마사지, 즉시 병원에 가야 하는 위험 신호를 안내합니다.",
  alternates: { canonical: "/guide/fever" },
};

export default function FeverGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 정상 체온과 발열 기준</h2>
      <p>
        아기의 정상 체온은 측정 부위에 따라 다릅니다. 항문(직장) 체온 기준 38.0도 이상,
        겨드랑이 체온 기준 37.5도 이상, 귀(고막) 체온 기준 38.0도 이상이면 발열로
        판단합니다. 영아의 체온은 활동량, 주변 온도, 옷 두께에 따라 변동이 크므로 안정된
        상태에서 측정하는 것이 정확합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">체온 측정 방법</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">직장(항문) 체온</h3>
      <p>
        가장 정확한 측정법으로, 특히 3개월 미만 영아에게 권장됩니다. 체온계 끝에 바셀린을
        바르고 항문에 약 2cm 삽입하여 측정합니다. 아기를 엎드려 눕히거나 다리를 들어
        올린 상태에서 측정합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">겨드랑이 체온</h3>
      <p>
        비접촉 방식으로 간편하지만, 직장 체온보다 0.5~1도 낮게 측정됩니다. 체온계를
        겨드랑이 중앙에 밀착시키고, 팔을 몸에 붙인 상태에서 3~5분간 측정합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">귀(고막) 체온</h3>
      <p>
        빠르고 편리하지만, 6개월 미만 아기는 귀도가 좁아 정확도가 떨어질 수 있습니다.
        귓바퀴를 살짝 뒤로 당겨 귀도를 편 후 측정합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">가정에서의 열 관리</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">수분 보충</h3>
      <p>
        열이 나면 수분 손실이 많아지므로 모유나 분유를 자주 먹입니다. 6개월 이상 아기는
        끓여 식힌 물을 소량씩 추가로 제공할 수 있습니다. 탈수 징후(소변량 감소, 입술
        건조, 눈물 없는 울음)를 주의 깊게 관찰합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">미온수 마사지</h3>
      <p>
        30~33도의 미지근한 물에 적신 수건으로 목, 겨드랑이, 사타구니 등 큰 혈관이 지나는
        부위를 부드럽게 닦아줍니다. 찬물이나 알코올 마사지는 오히려 혈관을 수축시켜
        체온을 높일 수 있으므로 절대 사용하지 마세요.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">환경 조절</h3>
      <p>
        실내 온도를 22~24도로 유지하고, 옷은 얇게 한 겹만 입힙니다. 이불을 두껍게
        덮으면 열 배출이 어려워지므로 가볍게 덮어주세요.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">해열제 사용법</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">아세트아미노펜 (타이레놀)</h3>
      <p>
        생후 3개월 이상부터 사용 가능합니다. 체중 기준으로 10~15mg/kg을 4~6시간
        간격으로 투여하며, 하루 최대 5회를 넘기지 않습니다. 효과는 투여 후 30분~1시간에
        나타나며, 4~6시간 지속됩니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">이부프로펜 (부루펜)</h3>
      <p>
        생후 6개월 이상부터 사용 가능합니다. 체중 기준으로 5~10mg/kg을 6~8시간
        간격으로 투여합니다. 아세트아미노펜과 교대 투여가 가능하지만, 반드시 소아과
        의사의 지시에 따릅니다. 공복 투여 시 위장 장애가 있을 수 있으므로 수유 후
        투여합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">즉시 병원에 가야 하는 경우</h2>
      <p>
        3개월 미만 영아의 38도 이상 발열은 원인과 관계없이 즉시 소아과를 방문해야 합니다.
        그 외에도 40도 이상 고열, 열성 경련(열에 의한 경련), 12시간 이상 지속되는 고열,
        심한 보챔이나 축 처진 상태, 발진 동반, 호흡 곤란, 소변이 6시간 이상 나오지 않는
        경우에는 지체 없이 응급실을 방문하세요. 열성 경련이 발생하면 아기를 옆으로
        눕히고, 입에 아무것도 넣지 말고 즉시 119에 연락합니다.
      </p>
    </>
  );
}
