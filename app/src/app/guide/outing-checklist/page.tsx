/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기 외출 체크리스트 - 상황별 필수 준비물 총정리",
  description:
    "아기와 외출 시 필수 준비물 체크리스트, 월령별 외출 팁, 계절별 주의사항, 카시트 안전 가이드를 안내합니다.",
  alternates: { canonical: "/guide/outing-checklist" },
};

export default function OutingChecklistGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기와 외출, 무엇을 챙겨야 할까요?</h2>
      <p>
        아기와의 외출은 꼼꼼한 준비가 핵심입니다. 처음에는 많은 짐이 부담스러울 수
        있지만, 체크리스트를 활용하면 빠트림 없이 준비할 수 있습니다. 외출 시간과 목적지에
        따라 필요한 물품을 조절하세요.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">기본 필수 준비물</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">수유 용품</h3>
      <p>
        모유수유 중이라면 수유 케이프, 모유 저장팩을 준비합니다. 분유수유 중이라면
        분유 소분 용기, 보온병(뜨거운 물), 젖병을 챙깁니다. 이유식 시기에는 이유식
        용기와 아기용 수저를 추가합니다. 외출 시간에 맞춰 필요한 수유 횟수만큼의 양을
        준비하되, 여유분 1회분을 추가로 챙깁니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">기저귀 용품</h3>
      <p>
        기저귀(외출 시간당 1~2개 + 여유분 2개), 물티슈, 기저귀 교체 매트, 기저귀 봉투
        (사용한 기저귀 담기용)를 준비합니다. 기저귀 발진이 있다면 기저귀 크림도
        챙깁니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">갈아입을 옷</h3>
      <p>
        토하거나 기저귀 새는 경우를 대비해 최소 1벌의 여벌 옷과 속옷을 챙깁니다.
        턱받이도 2~3개 준비하면 유용합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">기타 필수품</h3>
      <p>
        건강보험증 사본, 아기 수첩(예방접종 기록), 얇은 담요, 노리개 젖꼭지(사용하는
        경우), 가제 수건 2~3장, 비닐봉투를 준비합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">상황별 추가 준비물</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">병원 방문 시</h3>
      <p>
        건강보험증, 아기 수첩, 해열제(처방된 것), 체온계를 챙깁니다. 대기 시간이 길
        수 있으므로 아기가 좋아하는 장난감이나 그림책을 준비합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">나들이·공원</h3>
      <p>
        자외선 차단제(6개월 이상), 넓은 챙 모자, 유모차 선커버, 모기 기피제(6개월 이상),
        돗자리를 추가합니다. 여름에는 휴대용 선풍기, 겨울에는 방한 커버를 준비합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">장거리 이동·차량</h3>
      <p>
        카시트(필수), 차량 햇빛 가리개, 멀미 대비 여벌 옷과 비닐봉투, 간식(이유식
        이후), 아기 음악이나 동요를 준비합니다. 2시간마다 휴게소에 정차하여 기저귀 교체와
        스트레칭을 합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">월령별 외출 팁</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">0~3개월</h3>
      <p>
        면역력이 약한 시기이므로 사람이 많은 곳은 피합니다. 30분~1시간 이내의 짧은
        산책부터 시작하고, 직사광선은 피합니다. 아기띠나 유모차 중 편한 것을 선택합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">4~6개월</h3>
      <p>
        외출 범위를 넓힐 수 있습니다. 수유 시간을 고려하여 외출 시간을 계획하고,
        낮잠 시간에 이동하면 아기가 편안하게 잠들 수 있습니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">7개월 이후</h3>
      <p>
        이유식, 간식, 물컵 등 먹거리 준비물이 늘어납니다. 아기가 앉을 수 있으므로
        유아용 의자가 있는 식당을 미리 확인하면 편리합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">외출 시 수유실 찾기</h2>
      <p>
        <Link href="/nursing-room" className="text-primary-600 font-medium hover:underline">
          아기랑 수유실 찾기
        </Link>
        에서 현재 위치 근처의 수유실을 검색할 수 있습니다. 외출 전 목적지 주변 수유실을
        미리 확인해 두면 편리합니다.
      </p>
    </>
  );
}
