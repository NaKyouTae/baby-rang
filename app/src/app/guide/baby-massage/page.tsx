/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "아기 마사지 가이드 - 부위별 방법, 효과, 주의사항",
  description:
    "아기 마사지의 효과, 적정 시기, 부위별 마사지 방법(배, 다리, 등, 얼굴), 영아산통 완화 마사지, 마사지 오일 선택법을 안내합니다.",
  alternates: { canonical: "/guide/baby-massage" },
};

export default function BabyMassageGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 마사지의 효과</h2>
      <p>
        아기 마사지는 부모와 아기 사이의 유대감을 강화하는 대표적인 스킨십 활동입니다.
        연구에 따르면 규칙적인 마사지는 아기의 수면의 질을 높이고, 소화를 촉진하며,
        스트레스 호르몬(코르티솔)을 감소시킵니다. 또한 영아산통(콜릭)으로 인한 울음과
        불편함을 완화하는 데 도움이 됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">마사지 시작 시기</h2>
      <p>
        일반적으로 생후 2주~1개월부터 시작할 수 있습니다. 처음에는 5분 이내로 짧게
        시작하여, 아기가 편안해하면 점차 15~20분까지 늘려갑니다. 목욕 후 보습과 함께
        하거나, 자기 전 루틴으로 활용하면 수면 유도에도 효과적입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">마사지 준비</h2>
      <p>
        실내 온도를 24~26도로 따뜻하게 유지하고, 부드러운 담요나 타월 위에 아기를
        눕힙니다. 마사지 오일은 식물성 오일(호호바, 아몬드, 코코넛 오일)을 사용하며,
        미네랄 오일이나 향료가 든 제품은 피합니다. 손에 오일을 충분히 바르고 비벼 따뜻하게
        한 후 시작합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">부위별 마사지 방법</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">다리·발</h3>
      <p>
        허벅지를 양손으로 감싸 위에서 아래로 부드럽게 쓸어내립니다. 종아리도 같은 방향으로
        진행합니다. 발바닥을 엄지로 발뒤꿈치에서 발가락 방향으로 눌러주고, 발가락을
        하나씩 부드럽게 돌려줍니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">배</h3>
      <p>
        배꼽을 중심으로 시계 방향으로 원을 그리며 부드럽게 쓸어줍니다. 이 방향은 장의
        운동 방향과 같아 소화와 배변을 촉진합니다. 영아산통이 있는 아기에게 특히 효과적이며,
        &ldquo;I Love You&rdquo; 마사지(배 왼쪽을 위에서 아래로 I, 배 위쪽을 가로로 L,
        배 오른쪽에서 왼쪽 아래로 U 모양)도 도움이 됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">가슴·팔</h3>
      <p>
        가슴 중앙에서 양쪽으로 하트 모양을 그리듯 쓸어줍니다. 팔은 어깨에서 손목 방향으로
        부드럽게 쓸어내리고, 손바닥을 엄지로 펴주며, 손가락을 하나씩 부드럽게 돌려줍니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">등</h3>
      <p>
        아기를 엎드려 눕히고, 등 전체를 양손으로 위에서 아래로 길게 쓸어줍니다. 척추
        양옆을 엄지로 부드럽게 원을 그리며 눌러주되, 척추 위를 직접 누르지는 않습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">얼굴</h3>
      <p>
        이마 중앙에서 양쪽 관자놀이로 부드럽게 쓸어주고, 눈썹 위를 안쪽에서 바깥쪽으로
        쓸어줍니다. 코 양옆을 위에서 아래로, 볼은 원을 그리며 부드럽게 마사지합니다.
        턱은 중앙에서 귀 방향으로 쓸어올려줍니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">마사지 시 주의사항</h2>
      <p>
        아기가 울거나 불편해하면 즉시 중단합니다. 수유 직후에는 토할 수 있으므로 최소
        30분~1시간 후에 시작합니다. 예방접종 당일과 열이 있을 때, 피부에 발진이나 상처가
        있을 때는 마사지를 피합니다. 힘을 너무 주지 않고, 아기의 반응을 살피며 부드럽게
        진행하세요.
      </p>
    </>
  );
}
