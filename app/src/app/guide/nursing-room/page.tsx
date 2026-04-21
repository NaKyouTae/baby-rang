/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "수유실 찾기 가이드 - 외출 시 수유실 이용 팁과 준비물 총정리",
  description:
    "외출할 때 수유실을 빠르게 찾는 방법, 공공 수유실과 민간 수유실 차이, 수유실 이용 에티켓, 필수 준비물을 상세히 안내합니다.",
  alternates: { canonical: "/guide/nursing-room" },
};

export default function NursingRoomGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">외출할 때 수유실, 왜 중요한가요?</h2>
      <p>
        영유아를 키우는 부모에게 외출은 작은 모험입니다. 특히 모유수유 중이거나 아직 기저귀를
        사용하는 아기와 함께라면, 수유실(모유수유실·육아휴게실)의 위치를 미리 파악하는 것이
        외출의 성패를 좌우할 만큼 중요합니다. 영유아보육법에 따라 일정 규모 이상의 시설에는
        수유실 설치가 의무화되어 있지만, 실제로 어디에 있는지 찾기 어려운 경우가 많습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">공공 수유실과 민간 수유실</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">공공 수유실</h3>
      <p>
        지하철역, 기차역, 공항, 관공서, 도서관, 공원 등 공공시설에 설치된 수유실입니다.
        무료로 이용 가능하며, 대부분 기저귀 교환대, 수유 의자, 세면대, 전자레인지 등
        기본 시설을 갖추고 있습니다. 서울시의 경우 지하철 주요 역사에 수유실을 운영하고
        있으며, 정부 공공데이터포털에서 전국 수유실 정보를 제공합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">민간 수유실</h3>
      <p>
        백화점, 대형마트, 쇼핑몰, 키즈카페 등 민간 시설에서 운영하는 수유실입니다.
        시설 수준이 높은 곳이 많으며, 정수기, 분유 포트, 수유 커튼, 아기 체중계 등
        추가 편의시설을 갖춘 곳도 있습니다. 다만 영업시간에만 이용 가능하고, 위치가
        건물 내 안쪽에 있어 찾기 어려울 수 있습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">수유실 이용 에티켓</h2>
      <p>
        수유실은 수유와 기저귀 교환이 필요한 부모님들이 함께 사용하는 공간입니다.
        사용 후 깨끗이 정리하고, 장시간 점유하지 않도록 합니다. 수유실 내에서의 음식
        섭취는 자제하고, 다른 이용자가 대기 중이라면 양보하는 배려가 필요합니다.
        남성(아빠) 이용이 가능한 수유실도 늘어나고 있으니, 입구 안내를 확인하세요.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">외출 시 수유 준비물 체크리스트</h2>
      <p>
        모유수유 중이라면 수유 케이프, 모유 저장팩, 보냉 파우치가 필요합니다.
        분유수유라면 분유 소분 용기, 보온병(뜨거운 물), 젖병, 젖병 세척 브러시를
        챙기세요. 공통으로 기저귀 5장 이상, 물티슈, 기저귀 처리 봉투, 여벌 옷,
        방수 패드를 준비하면 대부분의 상황에 대응할 수 있습니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">수유실을 빠르게 찾는 방법</h2>
      <p>
        네이버 지도나 카카오맵에서 &ldquo;수유실&rdquo;을 검색하면 주변 수유실을 찾을 수
        있지만, 정보가 최신이 아닌 경우도 있습니다. 공공데이터포털의 수유실 정보는
        정기적으로 업데이트되어 비교적 정확합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 수유실 찾기</h2>
      <p>
        <Link href="/nursing-room" className="text-teal-600 font-medium hover:underline">
          아기랑 수유실 찾기
        </Link>
        에서는 현재 위치를 기반으로 가장 가까운 수유실을 지도에서 바로 확인할 수 있습니다.
        공공데이터를 기반으로 전국 수유실 정보를 제공하며, 시설 정보와 운영 시간도
        함께 안내합니다.
      </p>
    </>
  );
}
