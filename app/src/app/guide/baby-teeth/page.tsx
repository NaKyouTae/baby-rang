/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아기 치아 관리 가이드 - 유치 순서, 이앓이, 구강 관리법",
  description:
    "아기 유치 나는 순서, 이앓이 증상과 대처법, 월령별 구강 관리 방법, 첫 치과 방문 시기, 충치 예방법을 안내합니다.",
  alternates: { canonical: "/guide/baby-teeth" },
};

export default function BabyTeethGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">유치는 언제 나나요?</h2>
      <p>
        대부분의 아기는 생후 6~8개월경에 첫 유치가 나기 시작합니다. 일부 아기는 4개월에
        일찍 나기도 하고, 12개월이 지나서야 나는 경우도 있으며 모두 정상 범위입니다.
        유치는 총 20개로, 보통 만 2세 반~3세 사이에 모두 나옵니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">유치 나는 순서</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">6~10개월: 아래 앞니</h3>
      <p>
        가장 먼저 아래쪽 중앙 앞니(하악 중절치) 2개가 나옵니다. 이어서 위쪽 중앙 앞니
        (상악 중절치) 2개가 나옵니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">8~12개월: 위 앞니</h3>
      <p>
        위쪽 앞니 옆의 측절치가 나오고, 이후 아래쪽 측절치가 나옵니다. 이 시기에
        앞니 4~8개가 완성됩니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">12~18개월: 첫 번째 어금니</h3>
      <p>
        위아래 첫 번째 어금니(제1유구치)가 나옵니다. 어금니가 나올 때는 앞니보다
        통증이 심할 수 있어 보챔이 심해질 수 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">18~24개월: 송곳니</h3>
      <p>
        위아래 송곳니(유견치)가 나옵니다. 뾰족한 모양 때문에 잇몸을 뚫고 나올 때
        불편함이 클 수 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">24~36개월: 두 번째 어금니</h3>
      <p>
        가장 뒤쪽의 두 번째 어금니(제2유구치)가 나오며, 유치 20개가 모두 완성됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">이앓이 증상과 대처법</h2>
      <p>
        유치가 나올 때 잇몸이 붓고 빨갛게 되며, 침을 많이 흘리고, 무엇이든 물어뜯으려
        합니다. 보채거나 수면 패턴이 불규칙해질 수 있고, 미열이 동반되기도 합니다.
        다만 38도 이상의 고열이나 설사는 이앓이가 아닌 다른 원인이므로 소아과를
        방문하세요.
      </p>
      <p>
        차갑게 식힌 치발기를 물려주면 잇몸의 통증을 완화할 수 있습니다. 깨끗한 가제
        수건을 물에 적셔 냉장고에 넣었다가 잇몸을 부드럽게 닦아주는 것도 효과적입니다.
        시중의 이앓이 젤(구강 도포제)은 성분을 확인하고, 리도카인이 포함된 제품은 영아에게
        사용하지 않습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">월령별 구강 관리</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">치아 나기 전 (0~6개월)</h3>
      <p>
        수유 후 깨끗한 가제 수건이나 구강 티슈로 잇몸을 부드럽게 닦아줍니다. 수유 후
        잔여 우유가 입안에 남아 있으면 구강 카디다(아구창)의 원인이 될 수 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">첫 치아 후 (6~12개월)</h3>
      <p>
        실리콘 핑거 칫솔이나 부드러운 유아용 칫솔로 치아 앞뒤면을 닦아줍니다. 치약은
        쌀알 크기만큼의 소량의 불소 치약을 사용하거나, 무불소 치약을 선택합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">12개월 이후</h3>
      <p>
        식후와 자기 전 양치를 습관화합니다. 완두콩 크기의 불소 치약을 사용하며, 아기가
        뱉는 것을 배울 때까지는 삼키지 않도록 주의합니다. 젖병을 물고 자는 습관은
        젖병 충치(우유병 충치)의 원인이므로 반드시 교정합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">첫 치과 방문</h2>
      <p>
        대한소아치과학회는 첫 유치가 나온 후 6개월 이내, 늦어도 돌 전에 첫 치과 검진을
        받을 것을 권장합니다. 조기 방문을 통해 구강 발달 상태를 확인하고, 불소 도포,
        충치 예방 상담을 받을 수 있습니다.
      </p>
    </>
  );
}
