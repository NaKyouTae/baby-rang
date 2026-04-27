/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "모유 vs 분유 비교 가이드 - 장단점, 혼합수유 팁까지",
  description:
    "모유수유와 분유수유의 영양, 면역, 편의성 비교, 혼합수유 방법, 분유 선택 기준, 수유량 계산법을 상세히 안내합니다.",
  alternates: { canonical: "/guide/formula-vs-breast" },
};

export default function FormulaVsBreastGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">모유와 분유, 무엇이 다를까요?</h2>
      <p>
        모유와 분유 모두 아기에게 필요한 영양을 제공할 수 있습니다. 모유는 면역 물질과
        아기 맞춤형 영양 성분이라는 강점이 있고, 분유는 수유의 편의성과 아빠의 참여가
        용이하다는 장점이 있습니다. 어떤 선택이든 아기에게 충분한 영양을 제공하고 있다면
        부모로서 잘하고 있는 것입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">모유수유의 장점</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">아기에게 주는 이점</h3>
      <p>
        모유에는 면역글로불린(IgA), 라크토페린, 백혈구 등 면역 물질이 풍부하여 감염성
        질환(중이염, 호흡기 감염, 장염)의 위험을 낮춥니다. 소화 흡수율이 높아 변비와
        소화 장애가 적으며, 아기의 월령과 필요에 따라 성분이 자동으로 변화합니다.
        장기적으로 알레르기, 비만, 당뇨의 위험을 줄이는 효과가 보고되고 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">엄마에게 주는 이점</h3>
      <p>
        자궁 수축을 촉진하여 산후 회복을 돕고, 유방암과 난소암 위험을 낮춥니다.
        분유 구매 비용이 들지 않아 경제적이며, 밤중 수유 시 별도의 준비가 필요 없어
        편리합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">분유수유의 장점</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">편의성과 유연성</h3>
      <p>
        아빠나 다른 양육자가 수유에 참여할 수 있어 엄마의 부담을 분산합니다. 수유량을
        정확히 파악할 수 있고, 외출이나 복직 시에도 수유 계획을 세우기 쉽습니다.
        모유가 부족하거나 의학적 이유로 모유수유가 어려운 경우에도 아기에게 충분한
        영양을 제공합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">영양 보장</h3>
      <p>
        시판 분유는 모유의 영양 성분을 모방하여 제조되며, 철분, DHA, 프로바이오틱스 등이
        강화되어 있습니다. 엄마의 식단이나 건강 상태에 영향을 받지 않고 일정한 영양을
        제공합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">혼합수유 방법</h2>
      <p>
        모유수유와 분유수유를 병행하는 혼합수유는 많은 부모가 선택하는 현실적인 방법입니다.
        모유수유를 우선하되, 부족한 양을 분유로 보충하거나, 특정 시간대(밤중, 외출 시)에만
        분유를 사용할 수 있습니다.
      </p>
      <p>
        혼합수유를 시작할 때는 모유 수유량이 줄어들지 않도록 유축을 병행하는 것이
        좋습니다. 젖병 유두 혼동을 방지하기 위해 느린 흐름(slow flow) 젖꼭지를 사용하고,
        아기가 모유를 거부하지 않는지 관찰합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">분유 선택 기준</h2>
      <p>
        표준 분유는 대부분의 아기에게 적합합니다. 우유 알레르기가 있는 경우 가수분해
        분유(HA 분유)를, 유당불내증이 있는 경우 유당 분해 분유를 선택합니다. 분유
        교체 시에는 1주일에 걸쳐 서서히 비율을 바꿔가며, 소화 상태와 알레르기 반응을
        관찰합니다. 분유 선택에 어려움이 있다면 소아과 전문의와 상담하세요.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">월령별 수유량 가이드</h2>
      <p>
        신생아(0~1개월)는 1회 60~90ml, 하루 8~12회입니다. 1~3개월은 1회 120~150ml,
        하루 6~8회, 4~6개월은 1회 150~180ml, 하루 5~6회가 일반적입니다. 이유식 시작
        후에는 수유량이 줄어들며, 돌 이후에는 생우유로 전환할 수 있습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 수유 기록하기</h2>
      <p>
        <Link href="/growth-record" className="text-primary-600 font-medium hover:underline">
          아기랑 성장 기록
        </Link>
        에서 수유 패턴과 아기의 체중 변화를 함께 기록해 보세요.
      </p>
    </>
  );
}
