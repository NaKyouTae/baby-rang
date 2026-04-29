/**
 * ── 애드센스 승인용 임시 페이지 ──
 * ADSENSE_CONTENT_ENABLED = false 전환 후 guide/ 폴더 전체 삭제 가능
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "월령별 아기 수면 스케줄 가이드 - 낮잠 횟수, 밤잠 시간 총정리",
  description:
    "신생아부터 24개월까지 월령별 적정 수면 시간, 낮잠 횟수, 활동 시간(깨어 있는 시간)을 상세히 안내합니다. 아기 수면 골든타임을 지키는 방법을 알아보세요.",
  alternates: { canonical: "/guide/sleep-schedule" },
};

export default function SleepScheduleGuidePage() {
  return (
    <>
      <h2 className="text-lg font-bold text-gray-900">아기 수면, 왜 중요한가요?</h2>
      <p>
        수면은 아기의 성장과 발달에 가장 중요한 요소 중 하나입니다. 성장호르몬의 약 70%가
        깊은 수면 중에 분비되며, 뇌 발달과 기억력 형성에도 수면이 결정적인 역할을 합니다.
        충분하고 규칙적인 수면 습관은 아기의 정서 안정, 면역력 강화, 그리고 인지 발달에
        긍정적인 영향을 미칩니다.
      </p>
      <p>
        하지만 많은 부모님이 &ldquo;우리 아기는 얼마나 자야 하는 걸까?&rdquo;라는 질문에
        명확한 답을 찾기 어려워합니다. 월령에 따라 적정 수면 시간과 낮잠 횟수가 다르기
        때문입니다. 이 가이드에서는 월령별 수면 스케줄을 상세히 안내합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">월령별 수면 스케줄</h2>

      <h3 className="text-[15px] font-semibold text-gray-800">신생아 (0~2개월)</h3>
      <p>
        하루 총 수면 시간: 14~17시간. 신생아는 낮과 밤의 구분 없이 2~4시간 단위로 자고
        깨기를 반복합니다. 한 번에 긴 수면을 기대하기 어려우며, 수유 후 트림을 시킨 뒤
        바로 재우는 패턴이 일반적입니다. 이 시기에는 수면 훈련보다 충분한 수면을 취하도록
        환경을 조성하는 것이 중요합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">3~4개월</h3>
      <p>
        하루 총 수면 시간: 14~16시간. 낮잠 3~4회. 활동 시간(깨어 있는 시간)은 약
        1시간 15분~2시간입니다. 서서히 낮과 밤의 구분이 생기기 시작하며, 밤에 4~6시간
        연속 수면이 가능해지는 아기도 있습니다. 수면 퇴행(Sleep Regression)이 처음
        나타날 수 있는 시기이기도 합니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">5~6개월</h3>
      <p>
        하루 총 수면 시간: 13~15시간. 낮잠 2~3회. 활동 시간은 약 2~2.5시간입니다.
        대부분의 아기가 밤중 수유 없이 6~8시간 연속 수면이 가능해집니다. 낮잠 시간이
        규칙적으로 자리 잡기 시작하며, 오전/오후/저녁 낮잠 패턴이 형성됩니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">7~9개월</h3>
      <p>
        하루 총 수면 시간: 12~15시간. 낮잠 2회. 활동 시간은 약 2.5~3.5시간입니다.
        세 번째 낮잠(저녁 낮잠)이 사라지고 오전, 오후 2회 낮잠으로 전환됩니다.
        분리 불안이 시작되어 잠들기 전 보채는 아기가 많아집니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">10~12개월</h3>
      <p>
        하루 총 수면 시간: 12~14시간. 낮잠 2회(1~2시간씩). 활동 시간은 약 3~4시간입니다.
        밤잠이 10~12시간으로 안정되며, 일정한 취침 루틴(목욕 → 수유 → 책 읽기 → 취침)이
        효과적입니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">13~18개월</h3>
      <p>
        하루 총 수면 시간: 12~14시간. 낮잠 1~2회에서 점차 1회로 전환됩니다.
        활동 시간은 약 4~5.5시간. 오전 낮잠이 사라지고 점심 후 낮잠 1회로 통합되는
        과도기입니다. 이 전환 시기에 일시적으로 잠투정이 심해질 수 있습니다.
      </p>

      <h3 className="text-[15px] font-semibold text-gray-800">19~24개월</h3>
      <p>
        하루 총 수면 시간: 11~14시간. 낮잠 1회(1~3시간). 활동 시간은 약 5~6시간입니다.
        하루 한 번의 낮잠이 완전히 자리 잡으며, 밤잠 시간도 안정됩니다. 취침 거부가
        나타날 수 있으나, 일관된 루틴 유지가 핵심입니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">수면 골든타임이란?</h2>
      <p>
        수면 골든타임은 아기가 적절히 피곤하면서도 과도하게 피곤하지 않은 최적의 재우기
        시점을 말합니다. 이 타이밍을 놓치면 아기가 &ldquo;오버타이어드(overtired)&rdquo;
        상태가 되어 오히려 잠들기 더 어려워집니다. 하품, 눈 비비기, 귀 당기기 등의
        수면 신호를 포착하는 것이 중요합니다.
      </p>

      <h2 className="text-lg font-bold text-gray-900 pt-2">아기랑에서 수면 추천 받기</h2>
      <p>
        <Link href="/sleep-golden-time" className="text-teal-600 font-medium hover:underline">
          아기랑 수면추천 기능
        </Link>
        에서는 아기의 월령에 맞는 최적의 낮잠 횟수, 활동 시간, 밤잠 권장 시간을
        자동으로 계산해 줍니다. 수면 골든타임을 놓치지 않도록 알림을 설정해 보세요.
      </p>
    </>
  );
}
