import { palette } from "@/lib/colors";

/** 환경부 통합대기환경지수 기준(㎍/m³). 수치는 고정값이라 서버에서 그대로 그린다. */
const GRADES: { grade: string; pm10: string; pm25: string; advice: string }[] = [
  { grade: "좋음", pm10: "0~30", pm25: "0~15", advice: "평소대로 외출해도 괜찮아요." },
  { grade: "보통", pm10: "31~80", pm25: "16~35", advice: "장시간 바깥 활동은 조금 줄이는 편이 좋아요." },
  { grade: "나쁨", pm10: "81~150", pm25: "36~75", advice: "외출을 줄이고, 나갈 때는 유모차 커버를 씌워주세요." },
  { grade: "매우 나쁨", pm10: "151 이상", pm25: "76 이상", advice: "외출을 피하고 창문을 닫은 채 실내 공기를 관리해 주세요." },
];

/**
 * 대기질 등급 기준과 외출 가이드.
 *
 * 화면 윗부분(AirQualityClient)은 위치 기반 실시간 수치라 서버에서 그릴 내용이 없다.
 * 그 탓에 이 페이지는 서버 렌더 본문이 29자뿐이었고, 구글이 색인 가치를 두지 않았다.
 * 등급 기준은 위치와 무관한 고정 정보이므로 서버에서 그려 본문을 갖춘다.
 */
export default function AirQualityGuide() {
  return (
    <section className="px-5 pb-8 pt-2" aria-label="미세먼지 등급 기준과 외출 가이드">
      <h2 className="text-[15px] font-bold" style={{ color: palette.black }}>
        미세먼지 등급은 어떻게 나뉘나요?
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: palette.gray600 }}>
        미세먼지(PM10)는 지름 10㎛ 이하, 초미세먼지(PM2.5)는 2.5㎛ 이하의 먼지입니다.
        입자가 작을수록 폐 깊숙이 들어가기 때문에 같은 농도라면 초미세먼지가 더
        해롭습니다. 아기는 어른보다 호흡수가 많고 기도가 좁아 영향을 더 크게 받습니다.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-[12px]" style={{ color: palette.gray600 }}>
          <thead>
            <tr style={{ color: palette.gray500 }}>
              <th className="py-2 pr-3 font-medium">등급</th>
              <th className="py-2 pr-3 font-medium">미세먼지</th>
              <th className="py-2 font-medium">초미세먼지</th>
            </tr>
          </thead>
          <tbody>
            {GRADES.map((g) => (
              <tr key={g.grade} className="border-t" style={{ borderColor: palette.gray200 }}>
                <td className="py-2 pr-3 font-semibold" style={{ color: palette.black }}>
                  {g.grade}
                </td>
                <td className="py-2 pr-3 tabular-nums">{g.pm10}</td>
                <td className="py-2 tabular-nums">{g.pm25}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: palette.gray500 }}>
        단위 ㎍/m³ · 환경부 통합대기환경지수 기준
      </p>

      <h2 className="mt-6 text-[15px] font-bold" style={{ color: palette.black }}>
        등급별로 아기와 어떻게 지내면 좋을까요?
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {GRADES.map((g) => (
          <li key={g.grade} className="text-[13px] leading-relaxed" style={{ color: palette.gray600 }}>
            <b style={{ color: palette.black }}>{g.grade}</b> — {g.advice}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 text-[15px] font-bold" style={{ color: palette.black }}>
        아기와 외출할 때 알아두면 좋은 것
      </h2>
      <ul className="mt-2 flex flex-col gap-2 text-[13px] leading-relaxed" style={{ color: palette.gray600 }}>
        <li>
          • 36개월 미만 아기에게는 <b style={{ color: palette.black }}>마스크를 권하지 않습니다.</b>{" "}
          호흡을 방해할 수 있어, 유모차 커버나 외출 시간 조절로 대응하는 편이 안전합니다.
        </li>
        <li>• 미세먼지가 높은 날은 아침·저녁 교통량이 많은 시간대를 피하면 노출을 줄일 수 있습니다.</li>
        <li>
          • 실내 환기는 미세먼지가 높은 날에도 필요합니다. 짧게(5~10분) 자주 하는 편이
          오래 닫아두는 것보다 낫습니다.
        </li>
        <li>• 외출 후에는 손과 얼굴을 씻기고 겉옷을 털어 실내로 들어오는 먼지를 줄여주세요.</li>
      </ul>
    </section>
  );
}
