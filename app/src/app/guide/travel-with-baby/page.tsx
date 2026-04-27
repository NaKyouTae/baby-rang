/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기와 여행 가이드 - 비행기, 차량 이동 팁과 준비물",
  description:
    "아기와 비행기 여행, 차량 장거리 이동 시 준비물, 시차 적응, 숙소 선택, 안전 수칙을 안내합니다.",
  alternates: { canonical: "/guide/travel-with-baby" },
};

export default function TravelWithBabyGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기와 여행, 언제부터 가능할까요?</h2>
      <p>
        대부분의 항공사는 생후 7일 이후부터 탑승을 허용하지만, 소아과 전문의들은
        생후 3개월 이후를 권장합니다. 이 시기에는 기본 예방접종이 어느 정도 진행되고,
        목을 가누기 시작하여 이동이 수월해집니다. 첫 여행은 가까운 곳에서 1박 2일로
        시작하여 아기의 반응을 살피는 것이 좋습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">비행기 여행</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">예약 및 좌석</h3>
      <p>
        만 2세 미만은 보호자 무릎에 앉히는 유아 요금(성인의 10%)으로 탑승 가능합니다.
        단, 별도 좌석을 구매하여 카시트를 장착하면 더 안전합니다. 항공사에 유아 탑승을
        사전 고지하고, 배시넷(아기 침대)이 장착 가능한 앞좌석(벌크헤드)을 요청합니다.
        배시넷은 보통 체중 10kg 미만까지 사용 가능합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">이착륙 시 귀 통증 예방</h3>
      <p>
        이착륙 시 기압 변화로 아기의 귀가 아플 수 있습니다. 이륙과 착륙 시 수유하거나
        노리개 젖꼭지를 물리면 삼키는 동작이 중이압을 조절하여 통증을 완화합니다.
        감기 증상이 있을 때는 비행기 탑승을 피하는 것이 좋습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">기내 필수 소지품</h3>
      <p>
        기저귀와 물티슈(넉넉히), 갈아입힐 옷 2벌, 수유 용품, 얇은 담요, 좋아하는
        장난감 2~3개, 간식(이유식 이후)을 기내 가방에 넣습니다. 위탁 수하물 분실에
        대비하여 1일분의 필수품은 기내에 소지합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">차량 장거리 이동</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">카시트 안전</h3>
      <p>
        카시트는 법적 필수 장비입니다. 신생아~만 2세까지는 뒤보기(rear-facing) 장착이
        안전하며, 앞좌석 에어백이 있는 좌석에는 절대 장착하지 않습니다. 두꺼운 패딩을
        입힌 채로 카시트에 태우면 벨트가 느슨해져 위험하므로, 옷은 얇게 입히고 담요를
        덮어줍니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">휴식과 스케줄</h3>
      <p>
        2시간마다 휴게소에 정차하여 기저귀를 교체하고, 아기를 카시트에서 내려 움직이게
        합니다. 낮잠 시간에 맞춰 출발하면 이동 중 아기가 편안하게 잠들 수 있습니다.
        차량 내 온도는 22~24도로 유지하고, 직사광선을 차단하는 햇빛 가리개를 장착합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">숙소 선택</h2>
      <p>
        아기용 침대(크립)를 제공하는 호텔이나, 바닥 생활이 가능한 한옥·펜션이 편리합니다.
        콘센트 안전 커버, 모서리 보호대 등 안전용품을 챙기고, 도착 후 위험 요소를
        점검합니다. 주방이 있는 숙소를 선택하면 이유식 준비에 용이합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">시차 적응 (해외여행)</h2>
      <p>
        아기의 시차 적응은 어른보다 1~2일 더 걸릴 수 있습니다. 도착 후 현지 시간에 맞춰
        낮에는 밝은 환경에서 활동하고, 밤에는 어둡고 조용한 환경을 만들어줍니다. 수유와
        이유식 시간도 현지 시간에 맞춰 점진적으로 조정합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">여행 중 응급 상황 대비</h2>
      <p>
        여행지의 소아과, 응급실 위치를 미리 파악합니다. 해열제, 체온계, 밴드, 소독약 등
        기본 상비약을 준비합니다. 해외여행 시에는 여행자 보험에 가입하고, 처방약이 있다면
        영문 처방전을 지참합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">여행지 수유실 찾기</h2>
      <p>
        <Link href="/nursing-room" className="text-primary-600 font-medium hover:underline">
          아기랑 수유실 찾기
        </Link>
        에서 여행지 주변 수유실 위치를 미리 확인해 보세요.
      </p>
    </>
  );
}
