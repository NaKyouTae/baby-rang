import Link from "next/link";
import { palette } from "@/lib/colors";

const APP_STORE_URL = "https://apps.apple.com/kr/app/id6761984903";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=kr.spectrify.baby_rang";

const FEATURES: { href: string; title: string; desc: string }[] = [
  {
    href: "/tests",
    title: "기질 검사",
    desc: "아기의 타고난 반응 방식을 활동성·규칙성·적응성 등 9가지 차원으로 분석해, 우리 아이에게 맞는 양육 방법을 알려줍니다.",
  },
  {
    href: "/growth-record",
    title: "성장 기록",
    desc: "수유, 수면, 배변, 투약을 기록하고 하루 패턴을 그래프로 확인합니다. 가족과 함께 기록할 수 있어 양육자가 여럿이어도 한곳에 모입니다.",
  },
  {
    href: "/physical-growth",
    title: "신체 성장",
    desc: "키·몸무게·머리둘레를 WHO 성장 곡선과 비교해 또래 중 어느 위치인지 백분위로 보여줍니다.",
  },
  {
    href: "/wonder-weeks",
    title: "원더윅스",
    desc: "아기가 부쩍 보채는 정신 발달 도약기를 생년월일 기준으로 계산합니다. 시기별 특징과 대처법을 함께 안내합니다.",
  },
  {
    href: "/sleep-golden-time",
    title: "수면추천",
    desc: "월령에 맞는 활동 시간(깨어 있는 시간), 낮잠 횟수, 권장 취침 시각을 계산합니다. 수면 퇴행기 시기도 함께 확인할 수 있습니다.",
  },
  {
    href: "/nursing-room",
    title: "수유실 찾기",
    desc: "전국 수유실을 지역별로 정리했습니다. 주소와 건물 내 상세 위치, 아빠 이용 가능 여부까지 확인하고 외출 전에 미리 찾아둘 수 있습니다.",
  },
];

/**
 * 홈 하단의 서비스 소개.
 *
 * 홈은 로그인한 사용자용 앱 셸이라, 서버가 그려내는 본문이 사실상 비어 있었다
 * (2026-10-03 측정 기준 187자). 구글이 "크롤링됨 · 색인 생성 안 됨"으로
 * 판정한 직접적인 이유이고, 메인 페이지는 사이트 전체 평가의 기준이 되므로
 * 로그인 여부와 무관하게 서버에서 그려지는 설명 본문을 둔다.
 *
 * 클라이언트 전용으로 감추지 않는다 — 비로그인 방문자가 보는 화면과
 * 크롤러가 보는 화면이 같아야 한다.
 */
export default function HomeIntro() {
  return (
    <section
      className="mt-2 border-t pt-6"
      style={{ borderColor: palette.gray200 }}
      aria-label="아기랑 서비스 소개"
    >
      <h2 className="text-[15px] font-bold" style={{ color: palette.black }}>
        아기랑은 이런 서비스예요
      </h2>

      <p
        className="mt-2 text-[13px] leading-relaxed"
        style={{ color: palette.gray600 }}
      >
        아기랑은 0~36개월 신생아·영유아를 키우는 부모를 위한 육아 앱입니다. 기질
        검사로 아이의 성향을 이해하고, 수유·수면·배변을 기록해 하루 패턴을
        확인하고, 원더윅스와 수면 시간처럼 월령마다 달라지는 기준을 자동으로
        계산해 줍니다. 외출할 때 필요한 전국 수유실 정보도 함께 제공합니다.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {FEATURES.map((f) => (
          <li key={f.href}>
            <Link href={f.href} className="active:opacity-70">
              <h3
                className="text-[13px] font-semibold"
                style={{ color: palette.black }}
              >
                {f.title}
              </h3>
              <p
                className="mt-0.5 text-[12px] leading-relaxed"
                style={{ color: palette.gray500 }}
              >
                {f.desc}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p
        className="mt-4 text-[12px] leading-relaxed"
        style={{ color: palette.gray500 }}
      >
        아기랑은 모바일 웹에서 바로 쓸 수 있고,{" "}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          App Store
        </a>
        와{" "}
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Google Play
        </a>
        에서 앱으로도 내려받을 수 있습니다. 설치는 무료이며, 기질 검사 상세
        리포트 등 일부 기능만 유료입니다.
      </p>
    </section>
  );
}
