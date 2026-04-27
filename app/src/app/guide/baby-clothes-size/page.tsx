/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "아기 옷 사이즈 가이드 - 개월별 사이즈표, 계절별 옷 입히기",
  description:
    "아기 옷 사이즈 선택법, 개월별 표준 사이즈표, 계절별 옷 입히기 요령, 옷 소재 선택 팁을 안내합니다.",
  alternates: { canonical: "/guide/baby-clothes-size" },
};

export default function BabyClothesSizeGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 옷 사이즈 선택법</h2>
      <p>
        아기 옷 사이즈는 브랜드마다 차이가 있어 실제 체형과 다를 수 있습니다. 월령보다는
        아기의 키와 몸무게를 기준으로 선택하는 것이 정확합니다. 특히 성장이 빠른 시기에는
        약간 넉넉한 사이즈를 선택하는 것이 실용적입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">개월별 표준 사이즈표</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">신생아~3개월 (50~60호)</h3>
      <p>
        키 50~60cm, 몸무게 3~6kg. 배냇저고리, 우주복(바디슈트), 슬리퍼백이 주요
        아이템입니다. 신생아 옷은 앞트임이나 옆트임 형태가 입히기 편합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">3~6개월 (60~70호)</h3>
      <p>
        키 60~70cm, 몸무게 6~8kg. 뒤집기를 시작하므로 움직임에 방해되지 않는 편안한
        옷을 선택합니다. 똑딱이 단추가 있는 바디슈트가 기저귀 교체 시 편리합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">6~12개월 (70~80호)</h3>
      <p>
        키 70~80cm, 몸무게 8~10kg. 기기와 잡고 서기를 하므로 무릎이 보호되는 긴 바지가
        좋습니다. 발이 미끄러지지 않는 미끄럼방지 양말이나 걸음마 신발이 필요합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">12~24개월 (80~90호)</h3>
      <p>
        키 80~90cm, 몸무게 10~13kg. 걷기와 뛰기가 활발해지므로 활동성 있는 옷을
        선택합니다. 이 시기부터 아이가 스스로 옷을 벗으려 하므로, 간단한 구조의 옷이
        자립심 발달에 도움이 됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">24~36개월 (90~100호)</h3>
      <p>
        키 90~100cm, 몸무게 13~15kg. 배변 훈련 시기이므로 올리고 내리기 쉬운 바지를
        선택합니다. 허리 밴드가 편안한 바지, 원피스 등이 적합합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">계절별 옷 입히기</h2>
      <h3 className="text-[15px] font-semibold text-gray-800">봄·가을</h3>
      <p>
        일교차가 크므로 레이어링(겹쳐 입기)이 핵심입니다. 면 소재 내의 위에 가디건이나
        조끼를 걸치고, 얇은 겉옷을 준비합니다. 어른보다 한 겹 더 입히는 것이 일반적이며,
        아기의 등에 땀이 차면 한 겹 줄여줍니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">여름</h3>
      <p>
        통기성 좋은 면이나 거즈 소재를 선택합니다. 민소매보다는 반팔이 자외선 차단과
        에어컨 환경에 적합합니다. 외출 시에는 넓은 챙의 모자와 가벼운 긴팔 겉옷을
        준비합니다.
      </p>
      <h3 className="text-[15px] font-semibold text-gray-800">겨울</h3>
      <p>
        보온성이 좋은 플리스, 기모 소재의 옷 위에 방한 외투를 입힙니다. 카시트 이용 시
        두꺼운 패딩은 안전벨트의 밀착을 방해하므로, 실내에서는 벗기고 담요를 덮어줍니다.
        모자, 장갑, 목도리로 머리와 말단을 보호합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">옷 소재 선택 팁</h2>
      <p>
        아기 피부에 닿는 옷은 순면 100% 소재를 기본으로 합니다. 합성 섬유(폴리에스터)는
        통기성이 떨어져 땀띠와 피부 자극을 유발할 수 있습니다. 새 옷은 반드시 세탁 후
        입히며, 유아용 세제를 사용합니다. 태그나 장식이 피부에 닿아 자극을 줄 수 있으므로
        안쪽에 태그가 없거나 떼어낼 수 있는 제품을 선택합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 성장 확인하기</h2>
      <p>
        <Link href="/growth-record" className="text-primary-600 font-medium hover:underline">
          아기랑 성장 기록
        </Link>
        에서 우리 아기의 키와 몸무게를 기록하고, 옷 사이즈 선택에 참고해 보세요.
      </p>
    </>
  );
}
