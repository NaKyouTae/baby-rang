/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기 기질 검사 가이드 - 9가지 기질 차원과 양육 유형 이해하기",
  description:
    "토마스와 체스의 9가지 기질 차원 이론을 바탕으로 아기 기질 검사의 의미, 유형별 특징, 맞춤 양육법을 상세히 안내합니다.",
  alternates: { canonical: "/guide/temperament" },
};

export default function TemperamentGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 기질이란 무엇인가요?</h2>
      <p>
        기질(Temperament)이란 아기가 태어날 때부터 가지고 있는 고유한 행동·반응 성향을
        말합니다. 같은 자극에도 어떤 아기는 호기심을 보이고, 어떤 아기는 울음으로 반응합니다.
        이는 부모의 양육 방식 때문이 아니라 아기 고유의 특성입니다.
      </p>
      <p>
        미국의 아동정신과 의사 알렉산더 토마스(Alexander Thomas)와 스텔라 체스(Stella Chess)는
        1956년부터 시작한 뉴욕 종단 연구(New York Longitudinal Study)를 통해 아기의 기질을
        과학적으로 분류하는 체계를 만들었습니다. 이 연구는 133명의 영아를 성인기까지 추적
        관찰한 획기적인 연구로, 현재까지도 아동 발달 분야의 핵심 이론으로 활용됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">9가지 기질 차원</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">1. 활동성 (Activity Level)</h3>
      <p>
        아기의 신체 활동량과 움직임의 정도입니다. 활동성이 높은 아기는 끊임없이 움직이고,
        낮은 아기는 비교적 조용히 앉아 놀기를 좋아합니다. 활동성이 높다고 해서 산만한
        것은 아니며, 에너지를 발산할 수 있는 충분한 기회를 주는 것이 중요합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">2. 규칙성 (Rhythmicity)</h3>
      <p>
        수면, 식사, 배변 등 생체 리듬의 예측 가능성입니다. 규칙성이 높은 아기는 매일
        비슷한 시간에 자고, 먹고, 배변합니다. 불규칙한 아기의 경우 부모가 루틴을 만들어
        주면 서서히 패턴이 잡힙니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">3. 접근/회피 (Approach/Withdrawal)</h3>
      <p>
        새로운 사람, 장소, 음식 등에 대한 첫 반응입니다. 접근형 아기는 새로운 것에 호기심을
        보이고, 회피형 아기는 경계하거나 거부합니다. 회피형 아기에게는 천천히 새로운
        경험을 소개하는 것이 효과적입니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">4. 적응성 (Adaptability)</h3>
      <p>
        변화에 적응하는 속도입니다. 적응성이 높은 아기는 환경 변화에 빠르게 적응하지만,
        낮은 아기는 새로운 상황에 적응하는 데 더 많은 시간이 필요합니다. 전환이 필요할 때
        미리 예고하고 충분한 시간을 주는 것이 도움됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">5. 반응 강도 (Intensity of Reaction)</h3>
      <p>
        감정 표현의 세기입니다. 강도가 높은 아기는 기쁘거나 슬플 때 큰 소리로 표현하고,
        낮은 아기는 조용히 반응합니다. 강도가 높다고 문제가 있는 것이 아니라, 감정을
        적절히 표현하도록 도와주면 됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">6. 반응 역치 (Threshold of Responsiveness)</h3>
      <p>
        반응을 일으키는 데 필요한 자극의 최소량입니다. 역치가 낮은 아기는 작은 소리,
        옷의 태그, 약간의 온도 변화에도 민감하게 반응합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">7. 기분 (Quality of Mood)</h3>
      <p>
        일상에서 보이는 전반적인 기분 성향입니다. 긍정적 기분의 아기는 잘 웃고 즐거운
        표정이 많고, 부정적 기분의 아기는 심각하거나 울음이 많을 수 있습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">8. 주의 산만성 (Distractibility)</h3>
      <p>
        외부 자극에 의해 주의가 전환되는 정도입니다. 산만성이 높은 아기는 달래기가
        쉬운 반면 한 가지에 집중하기 어렵고, 낮은 아기는 집중력이 좋지만 주의 전환이
        어려울 수 있습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">9. 지속성 (Persistence)</h3>
      <p>
        어려운 과제에 대한 지속 시간입니다. 지속성이 높은 아기는 안 되는 것을 계속
        시도하고, 낮은 아기는 빨리 포기합니다. 두 유형 모두 장단점이 있으며, 아기의
        성향에 맞는 격려 방식이 필요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">3가지 기질 유형</h2>
      <p>
        토마스와 체스는 이 9가지 차원의 조합에 따라 아기를 크게 세 유형으로 분류했습니다.
        &ldquo;순한 아이(Easy Child)&rdquo;는 규칙적이고 적응이 빠르며 긍정적입니다.
        &ldquo;까다로운 아이(Difficult Child)&rdquo;는 불규칙하고 반응이 강하며 적응이
        느립니다. &ldquo;느린 아이(Slow-to-Warm-Up Child)&rdquo;는 처음에는 소극적이지만
        시간이 지나면 적응합니다. 중요한 것은 어떤 유형이 더 좋고 나쁜 것이 아니라,
        아이의 기질을 이해하고 그에 맞는 양육 방식을 찾는 것입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 기질 검사하기</h2>
      <p>
        <Link href="/temperament" className="text-teal-600 font-medium hover:underline">
          아기랑 기질 검사
        </Link>
        에서는 간단한 질문에 답하면 우리 아기의 9가지 기질 차원을 분석하고, 유형별 맞춤
        양육 가이드를 제공합니다. 아이의 타고난 특성을 이해하면 육아가 더 수월해집니다.
      </p>
    </>
  );
}
