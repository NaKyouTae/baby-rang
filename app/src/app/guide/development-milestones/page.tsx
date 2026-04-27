/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개월별 아기 발달 이정표 - 0~24개월 운동·언어·인지 발달 총정리",
  description:
    "0~24개월 아기의 개월별 발달 이정표를 운동, 언어, 인지, 사회성 영역별로 정리했습니다. 우리 아기의 발달이 정상 범위인지 확인해 보세요.",
  alternates: { canonical: "/guide/development-milestones" },
};

export default function DevelopmentMilestonesPage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 발달 이정표란?</h2>
      <p>
        발달 이정표(developmental milestone)란 대부분의 아기가 특정 월령에 도달하는
        신체적·인지적·사회적 능력을 말합니다. 모든 아기는 고유한 속도로 발달하므로
        이정표는 참고 기준이지 절대적인 기준이 아닙니다. 다만 특정 월령까지 해당 발달이
        나타나지 않으면 소아과 전문의와 상담하는 것이 좋습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">0~3개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">대근육 운동</h3>
      <p>
        엎드린 자세에서 머리를 잠깐 들 수 있습니다. 2개월경에는 45도, 3개월경에는
        90도까지 머리를 들어 올립니다. 팔다리를 활발하게 움직이며, 손을 쥐었다 펴는
        동작을 반복합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">언어·소통</h3>
      <p>
        울음으로 의사를 표현하며, 2개월경부터 &ldquo;아~&rdquo; &ldquo;우~&rdquo; 같은
        쿠잉(cooing) 소리를 냅니다. 엄마의 목소리에 반응하여 고개를 돌리고, 눈을
        맞추며 미소를 짓기 시작합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">인지·감각</h3>
      <p>
        20~30cm 거리의 사물에 초점을 맞출 수 있으며, 움직이는 물체를 눈으로 따라갑니다.
        큰 소리에 놀라는 반사(모로 반사)가 있으며, 엄마의 냄새와 목소리를 구별합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">4~6개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">대근육 운동</h3>
      <p>
        목을 완전히 가누고, 도움 없이 앉는 연습을 시작합니다. 엎드린 상태에서 팔로
        상체를 밀어 올리며, 뒤집기를 시도합니다. 5~6개월경에는 양방향 뒤집기가
        가능해집니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">소근육 운동</h3>
      <p>
        손을 뻗어 물건을 잡으려 하고, 양손으로 물건을 쥡니다. 입으로 물건을 탐색하는
        행동이 활발해지며, 딸랑이를 흔들 수 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">언어·사회성</h3>
      <p>
        옹알이(babbling)가 시작되어 &ldquo;바바&rdquo; &ldquo;마마&rdquo; 같은 반복
        음절을 냅니다. 거울 속 자신에게 관심을 보이고, 낯가림이 시작될 수 있습니다.
        까꿍 놀이에 반응하며 웃습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">7~9개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">대근육 운동</h3>
      <p>
        혼자 앉기가 안정되고, 배밀이나 기기를 시작합니다. 가구를 잡고 일어서려는
        시도를 하며, 8~9개월경에는 잡고 서기가 가능합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">인지·소통</h3>
      <p>
        대상 영속성(물건이 사라져도 존재한다는 것)을 이해하기 시작합니다. 간단한 제스처
        (손 흔들기, 박수)를 모방하고, &ldquo;안 돼&rdquo;라는 말에 반응합니다. 엄지와
        검지로 작은 물건을 집는 집게 잡기(pincer grasp)가 발달합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">10~12개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">대근육 운동</h3>
      <p>
        가구를 잡고 옆으로 이동하며(크루징), 일부 아기는 첫 걸음을 뗍니다. 앉은 상태에서
        장난감을 집고 놀 수 있으며, 서 있는 자세가 안정됩니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">언어</h3>
      <p>
        &ldquo;엄마&rdquo; &ldquo;아빠&rdquo; 등 의미 있는 첫 단어를 말하기 시작합니다.
        간단한 지시(&ldquo;이리 와&rdquo;, &ldquo;줘&rdquo;)를 이해하고, 손가락으로
        원하는 것을 가리킵니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">13~18개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">운동 발달</h3>
      <p>
        독립 보행이 안정되고, 계단을 기어 오릅니다. 공을 차거나 던지려는 시도를 하며,
        크레용으로 낙서를 합니다. 숟가락을 잡고 스스로 먹으려 하지만 아직 서투릅니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">언어·인지</h3>
      <p>
        어휘가 5~20개로 늘어나며, 신체 부위를 가리킬 수 있습니다. 간단한 퍼즐을 맞추고,
        블록을 2~3개 쌓을 수 있습니다. 상징 놀이(전화기 흉내)가 시작됩니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">19~24개월</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">운동 발달</h3>
      <p>
        뛰기 시작하고, 계단을 잡고 오르내립니다. 공을 앞으로 차고, 블록을 4~6개 쌓을 수
        있습니다. 옷을 벗으려는 시도를 하며, 손잡이가 있는 컵으로 물을 마십니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">언어·사회성</h3>
      <p>
        두 단어 조합(&ldquo;엄마 물&rdquo;, &ldquo;더 줘&rdquo;)이 가능해지며, 어휘가
        50개 이상으로 급격히 늘어나는 어휘 폭발기를 겪습니다. 또래에게 관심을 보이지만
        아직 병렬 놀이(같은 공간에서 각자 놀기) 단계입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">발달이 느린 것 같다면</h2>
      <p>
        각 이정표에서 2~3개월 이상 지연이 관찰되거나, 이전에 할 수 있던 것을 더 이상
        하지 못하는 경우(발달 퇴행) 소아과 전문의와 상담하세요. 조기 발견과 조기 중재는
        발달 지연의 예후를 크게 개선합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 발달 확인하기</h2>
      <p>
        <Link href="/growth-record" className="text-primary-600 font-medium hover:underline">
          아기랑 성장 기록
        </Link>
        에서 우리 아기의 성장 데이터를 기록하고,{" "}
        <Link href="/guide/wonder-weeks" className="text-primary-600 font-medium hover:underline">
          원더윅스 가이드
        </Link>
        에서 정신 발달 도약기를 확인해 보세요.
      </p>
    </>
  );
}
