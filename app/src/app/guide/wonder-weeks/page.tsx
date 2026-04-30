/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "원더윅스(Wonder Weeks) 완벽 가이드 - 아기 정신 발달 도약기 총정리",
  description:
    "원더윅스란 무엇인지, 10번의 도약기 시기와 특징, 보채는 이유, 부모 대처법까지 상세히 안내합니다. 아기랑에서 우리 아기의 원더윅스를 자동으로 확인하세요.",
  alternates: { canonical: "/guide/wonder-weeks" },
  openGraph: {
    title: "원더윅스(Wonder Weeks) 완벽 가이드 - 아기 정신 발달 도약기 총정리 | 아기랑",
    description:
      "원더윅스란 무엇인지, 10번의 도약기 시기와 특징, 보채는 이유, 부모 대처법까지 상세히 안내합니다.",
    url: "https://baby-rang.spectrify.kr/guide/wonder-weeks",
  },
};

export default function WonderWeeksGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">원더윅스(Wonder Weeks)란?</h2>
      <p>
        원더윅스(Wonder Weeks)는 네덜란드의 발달심리학자 프란스 플로이(Frans Plooij)와
        헤티 판 더 레이트(Hetty van de Rijt) 부부가 수십 년간의 연구를 통해 밝혀낸
        영아기 정신 발달 도약 이론입니다. 아기는 생후 약 20개월 동안 총 10번의 정신적
        도약기(Mental Leap)를 겪게 됩니다. 이 시기에 아기의 뇌는 급격한 변화를 겪으며,
        새로운 인지 능력을 획득합니다.
      </p>
      <p>
        도약기에 접어든 아기는 갑자기 평소와 다른 행동을 보입니다. 더 많이 울고, 잠을
        잘 자지 못하고, 엄마에게 매달리거나, 먹는 양이 줄어들 수 있습니다. 부모 입장에서는
        아기가 아픈 건 아닌지 걱정되지만, 이것은 성장의 자연스러운 과정입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">10번의 도약기 시기와 특징</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">1차 도약 (약 5주) - 감각의 세계</h3>
      <p>
        아기가 처음으로 외부 자극을 더 선명하게 느끼기 시작합니다. 빛, 소리, 촉감에 더
        민감해지며, 눈을 맞추고 미소를 짓기 시작합니다. 이 시기에 아기는 갑자기 많이
        울 수 있는데, 세상이 갑자기 더 강렬하게 느껴지기 때문입니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">2차 도약 (약 8주) - 패턴 인식</h3>
      <p>
        반복되는 패턴을 인식하기 시작합니다. 자기 손을 발견하고, 물체를 눈으로 따라가며,
        단순한 소리 패턴에 반응합니다. 손을 입에 넣거나, 모빌을 오래 쳐다보는 행동이
        나타납니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">3차 도약 (약 12주) - 부드러운 전환</h3>
      <p>
        움직임이 부드러워집니다. 이전의 딱딱한 움직임에서 더 유연하고 자연스러운 동작으로
        변합니다. 목소리 톤의 변화를 인식하고, 옹알이가 다양해지기 시작합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">4차 도약 (약 19주) - 사건의 이해</h3>
      <p>
        원인과 결과를 이해하기 시작합니다. 장난감을 떨어뜨리면 소리가 난다는 것을 알게
        되고, 의도적으로 반복합니다. 낯가림이 시작될 수 있으며, 이유식에 관심을 보이기도
        합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">5차 도약 (약 26주) - 관계의 이해</h3>
      <p>
        물체 간의 거리, 공간적 관계를 이해합니다. 물건이 사라져도 존재한다는 것(대상
        영속성)을 깨닫기 시작하여 까꿍 놀이를 좋아합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">6차 도약 (약 37주) - 분류의 세계</h3>
      <p>
        사물을 범주로 나누기 시작합니다. &ldquo;음식&rdquo;과 &ldquo;장난감&rdquo;을
        구분하고, 동물과 사람을 다르게 인식합니다. 물건을 탐색하는 데 더 집중하며,
        그릇에 넣었다 빼는 행동을 반복합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">7차~10차 도약 (약 46~75주)</h3>
      <p>
        순서 이해(7차), 프로그램 개념(8차), 원칙 파악(9차), 체계적 사고(10차)로
        이어집니다. 걸음마를 시작하고, 간단한 지시를 이해하며, 자기 의사를 표현하는
        능력이 급격히 발달합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">도약기에 부모가 할 수 있는 것</h2>
      <p>
        도약기는 보통 1~5주 정도 지속됩니다. 이 시기에 가장 중요한 것은 아기에게
        안정감을 주는 것입니다. 스킨십을 늘리고, 아기가 원하면 안아주세요. 새로운 능력에
        맞는 놀이를 제공하면 발달을 자극할 수 있습니다. 다만 무리하게 자극을 주기보다
        아기의 페이스에 맞추는 것이 중요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 원더윅스 확인하기</h2>
      <p>
        <Link href="/wonder-weeks" className="text-teal-600 font-medium hover:underline">
          아기랑 원더윅스 기능
        </Link>
        에서는 아기의 생년월일을 입력하면 현재 몇 번째 도약기인지, 언제 시작되고 끝나는지를
        자동으로 계산해 줍니다. 도약기마다 어떤 변화가 나타나는지, 어떻게 대응하면 좋을지
        맞춤 안내를 받아보세요.
      </p>
    </>
  );
}
