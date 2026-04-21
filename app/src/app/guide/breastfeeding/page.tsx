/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "모유수유 완벽 가이드 - 자세, 시간, 보관법, 트러블 대처까지",
  description:
    "초보 맘을 위한 모유수유 가이드. 올바른 수유 자세, 적정 수유 간격과 시간, 모유 보관법, 젖몸살·유두 통증 등 흔한 트러블 대처법을 상세히 안내합니다.",
  alternates: { canonical: "/guide/breastfeeding" },
};

export default function BreastfeedingGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">모유수유, 왜 중요한가요?</h2>
      <p>
        세계보건기구(WHO)와 대한소아과학회는 생후 6개월까지 완전 모유수유를, 이후 최소
        2년까지 보충식과 함께 모유수유를 지속할 것을 권장합니다. 모유에는 아기의 면역력을
        높이는 면역글로불린(IgA), 라크토페린, 백혈구 등이 포함되어 있어 감염 질환의 위험을
        낮춥니다. 또한 모유의 성분은 아기의 월령과 필요에 따라 자동으로 변화하는 놀라운
        특성을 가지고 있습니다.
      </p>
      <p>
        모유수유는 아기뿐 아니라 엄마에게도 이로운데, 자궁 수축을 촉진하여 산후 회복을
        돕고, 유방암과 난소암의 위험을 낮추며, 산후우울증 예방에도 도움이 됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">올바른 수유 자세</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">요람 안기(Cradle Hold)</h3>
      <p>
        가장 기본적인 자세입니다. 아기의 머리를 팔꿈치 안쪽에 올리고, 같은 팔로 아기의
        등을 받칩니다. 아기의 배와 엄마의 배가 마주 보도록 하고, 아기의 입이 유두 높이에
        오도록 합니다. 수유 쿠션을 사용하면 팔의 부담을 줄일 수 있습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">교차 요람 안기(Cross-Cradle Hold)</h3>
      <p>
        수유하는 쪽 반대편 손으로 아기 머리를 받치는 자세입니다. 아기의 목과 머리를
        더 정밀하게 조절할 수 있어 초보맘이나 젖을 잘 물리기 어려운 경우에 추천됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">축구 안기(Football Hold)</h3>
      <p>
        아기를 옆구리에 끼고 안는 자세입니다. 제왕절개 후 배에 압력을 피할 수 있고,
        쌍둥이를 동시에 수유할 때도 유용합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">누워서 수유(Side-Lying)</h3>
      <p>
        엄마와 아기가 마주 보고 누운 상태에서 수유하는 자세입니다. 밤중 수유나 산후
        회복기에 체력 부담을 줄일 수 있습니다. 다만 잠든 상태에서의 수유는 질식 위험이
        있으므로 주의가 필요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">수유 간격과 시간</h2>
      <p>
        신생아는 하루 8~12회, 약 2~3시간 간격으로 수유합니다. 한쪽 유방당 10~20분 정도
        수유하며, 양쪽을 번갈아 가며 수유합니다. 아기가 성장하면서 수유 간격이 서서히
        늘어나며, 3~4개월이 되면 3~4시간 간격, 6개월 이후에는 이유식과 병행하게 됩니다.
      </p>
      <p>
        &ldquo;요구 수유(on-demand feeding)&rdquo;가 권장되며, 아기가 배고픔 신호(입을
        벌리기, 손 빨기, 고개 돌리기)를 보일 때 수유하는 것이 좋습니다. 울음은 배고픔의
        마지막 신호이므로, 가능하면 울기 전에 수유를 시작하세요.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">모유 보관법</h2>
      <p>
        유축한 모유는 적절한 온도에서 보관해야 영양 성분과 면역 물질이 유지됩니다.
        실온(25도 이하)에서는 최대 4시간, 냉장(4도 이하)에서는 최대 4일, 냉동(-18도
        이하)에서는 최대 6개월까지 보관 가능합니다. 해동은 냉장고에서 천천히 하거나
        미지근한 물에 담가서 합니다. 전자레인지 사용은 영양소 파괴와 화상 위험이 있어
        피해야 합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">흔한 트러블과 대처법</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">젖몸살(유방 울혈)</h3>
      <p>
        출산 후 3~5일째에 모유가 급격히 늘면서 유방이 딱딱하고 아프게 됩니다. 자주
        수유하거나 유축하여 젖을 비워주고, 따뜻한 수건을 대면 완화됩니다. 방치하면
        유선염으로 이어질 수 있으므로 조기 대응이 중요합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">유두 통증·갈라짐</h3>
      <p>
        대부분 잘못된 젖 물림이 원인입니다. 아기가 유두만 물지 않고 유륜까지 깊이
        물도록 해야 합니다. 라놀린 크림을 수유 후 바르면 갈라짐 예방에 도움이 됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">모유량 부족 걱정</h3>
      <p>
        아기의 소변 횟수(하루 6회 이상), 체중 증가 추세가 정상이면 모유량은 충분합니다.
        수분을 충분히 섭취하고, 자주 수유하여 유방을 자극하면 모유 생성이 촉진됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 수유 기록하기</h2>
      <p>
        <Link href="/growth-record" className="text-teal-600 font-medium hover:underline">
          아기랑 성장 기록
        </Link>
        에서 수유 시간, 횟수를 간편하게 기록하고 패턴을 파악해 보세요.
        규칙적인 기록은 소아과 방문 시에도 유용한 자료가 됩니다.
      </p>
    </>
  );
}
