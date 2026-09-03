/**
 * 월령별 수면 기준 데이터 — 단일 출처.
 *
 * 수면추천 계산기(SleepGoldenTimeClient)와 /sleep-golden-time 페이지의
 * 서버 렌더링 본문이 같은 데이터를 참조한다.
 */

export type WakeWindow = {
  label: string;
  minMonths: number;
  maxMonths: number;
  wakeMin: number; // minutes (wake window 최소)
  wakeMax: number; // minutes (wake window 최대)
  bedtimeMin: string; // HH:MM
  bedtimeMax: string;
  napCount: number; // 권장 낮잠 횟수
  napDurMin: number; // 낮잠 길이 최소 (분)
  napDurMax: number; // 낮잠 길이 최대 (분)
  tip: string;
};

export const WAKE_WINDOWS: WakeWindow[] = [
  { label: '0–2개월', minMonths: 0, maxMonths: 2, wakeMin: 45, wakeMax: 60, bedtimeMin: '18:00', bedtimeMax: '19:00', napCount: 5, napDurMin: 30, napDurMax: 120, tip: '신생아는 5회 이상 짧은 낮잠이 일반적이에요. 깨어있는 시간이 1시간을 넘지 않도록 주의하세요.' },
  { label: '3–4개월', minMonths: 3, maxMonths: 4, wakeMin: 75, wakeMax: 105, bedtimeMin: '18:00', bedtimeMax: '19:00', napCount: 4, napDurMin: 45, napDurMax: 90, tip: '4개월 수면 퇴행기일 수 있어요. 4회 낮잠으로 일관된 루틴을 유지하세요.' },
  { label: '5–6개월', minMonths: 5, maxMonths: 6, wakeMin: 105, wakeMax: 135, bedtimeMin: '18:00', bedtimeMax: '19:30', napCount: 3, napDurMin: 60, napDurMax: 90, tip: '3회 낮잠으로 안정화되는 시기예요.' },
  { label: '7–9개월', minMonths: 7, maxMonths: 9, wakeMin: 135, wakeMax: 180, bedtimeMin: '18:30', bedtimeMax: '19:30', napCount: 3, napDurMin: 60, napDurMax: 90, tip: '3회 낮잠 전환기입니다. 마지막 낮잠은 짧은 \'cat nap\'으로 충분합니다.' },
  { label: '10–14개월', minMonths: 10, maxMonths: 14, wakeMin: 180, wakeMax: 240, bedtimeMin: '19:00', bedtimeMax: '20:00', napCount: 2, napDurMin: 60, napDurMax: 90, tip: '오전·오후 2회 낮잠이 안정화되는 시기예요.' },
  { label: '15–17개월', minMonths: 15, maxMonths: 17, wakeMin: 240, wakeMax: 300, bedtimeMin: '19:00', bedtimeMax: '20:00', napCount: 2, napDurMin: 60, napDurMax: 120, tip: '2회에서 1회 낮잠으로 넘어가는 전환기예요. 컨디션에 따라 유연하게 조절하세요.' },
  { label: '18–36개월', minMonths: 18, maxMonths: 36, wakeMin: 300, wakeMax: 360, bedtimeMin: '19:30', bedtimeMax: '20:30', napCount: 1, napDurMin: 60, napDurMax: 120, tip: '점심 후 1회 낮잠이 적당합니다. 너무 늦게 자면 밤잠에 영향을 줄 수 있어요.' },
];

// 월령별 세부 팁 (개월 → 팁)
export const MONTH_TIPS: Record<number, string> = {
  0: '신생아는 낮밤 구분이 없어요. 밤에는 조명을 어둡게, 낮에는 자연광을 쐬어주세요.',
  1: '수유 텀이 짧아요. 졸음 신호(눈 비비기·하품·먼 곳 응시)를 놓치지 마세요.',
  2: '낮밤 구분이 시작되는 시기예요. 일관된 취침 루틴을 만들기 좋아요.',
  3: '수면 패턴이 점차 안정돼요. 같은 시간 잠자리에 들이는 연습을 시작해보세요.',
  4: '4개월은 수면 퇴행기예요. 수면 사이클이 성인과 비슷해지며 자주 깰 수 있어요. 4회 낮잠으로 일관된 루틴을 유지해 주세요.',
  5: '뒤집기가 시작되며 자다 깰 수 있어요. 안전한 수면 환경(빈 침대, 단단한 매트리스)을 점검하세요.',
  6: '이유식이 시작되고 밤중 수유를 줄일 수 있는 시기예요. 패턴이 일시적으로 흔들릴 수 있어요.',
  7: '분리불안이 시작돼요. 잠들기 전 충분한 안정감과 일관된 루틴을 주세요.',
  8: '8개월 수면 퇴행기예요. 분리불안 + 발달 폭발(기기·서기)로 자주 깰 수 있어요.',
  9: '기어다니기·서기 연습으로 잠자리에서 움직임이 많아져요. 안전한 잠자리를 유지하세요.',
  10: '발달 도약기예요. 잠자리에서 일어서는 연습을 할 수 있는데, 차분히 다시 눕혀주세요.',
  11: '첫 낮잠을 거부할 수 있어요. 아직 2회 낮잠 유지가 좋습니다. 너무 빨리 1회로 줄이지 마세요.',
  12: '12개월 수면 퇴행기예요. 첫 걸음마와 함께 일시적으로 흐트러질 수 있어요.',
  13: '낮잠 전환을 서두르지 마세요. 아직 2회 낮잠이 필요할 수 있어요.',
  14: '2→1회 낮잠 전환 신호(낮잠 거부, 늦게 잠들기)가 나타나는지 관찰하세요.',
  15: '1회 낮잠 전환 시기예요. 충분히 졸려할 때 시도하고, 점심 직후가 적당합니다.',
  16: '낮잠 1회로 안정화되는 시기예요. 12:30–14:30 사이 시작이 이상적입니다.',
  17: '1회 낮잠이 짧다면 일시적으로 2회로 돌아가도 괜찮아요. 컨디션에 맞춰 유연하게 조절하세요.',
  18: '18개월 수면 퇴행기예요. 자아가 강해지며 수면 거부·취침 시간 협상이 나타날 수 있어요. 일관성을 유지하세요.',
  19: '1회 낮잠 안정기예요. 너무 늦은 낮잠(15시 이후)은 밤잠을 방해할 수 있어요.',
  24: '24개월(2세) 수면 퇴행기예요. 악몽·분리불안·상상력 발달로 잠자리 거부가 있을 수 있어요. 야간등을 준비해주세요.',
  30: '낮잠을 거부하기 시작할 수 있어요. 아직 1회 낮잠이 필요한 시기이니 \'조용한 시간(quiet time)\'으로 유도해보세요.',
  36: '낮잠을 졸업하는 아기들이 늘어나는 시기예요. 낮잠을 안 자는 날은 밤잠을 30분 일찍 시작하세요.',
};

/** 분 단위를 "1시간 30분" 같은 한국어 표기로. */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
