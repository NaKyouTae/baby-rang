/**
 * 원더윅스(Wonder Weeks) 도약기 데이터 — 단일 출처.
 *
 * 캘린더(WonderWeeksCalendar)와 /wonder-weeks 페이지의 서버 렌더링 본문이
 * 같은 데이터를 참조한다. 한쪽만 고쳐 설명이 어긋나는 일을 막기 위함이다.
 */

// 원더윅스 폭풍(fussy) 기간 — 출생일 기준 주차 범위
// 참고: https://brunch.co.kr/@sleepinglion/18
export const WONDER_WEEKS_LEAPS = [
  {
    leap: 1, name: '감각의 변화', startWeek: 4, endWeek: 5,
    symptom: '아기 자신이 있는 곳이 엄마의 뱃속이 아니라는 것을 깨닫기 시작해 더 오래 깨어 있고 주변을 살피게 돼요. 또한 반사행동에 의해 온몸을 버둥거리고, 그 움직임에 놀라 울기도 합니다.',
    tip: '엄마의 목소리와 체취만이 아기가 이 낯선 세상에서 친숙하게 느끼는 모든 것이므로 아기를 안아주고 꼭 안아주면 아기가 진정될 수 있어요. 속싸개나 스와들업이 엄마를 그나마 편하게 해 줄 수 있습니다.',
  },
  {
    leap: 2, name: '패턴 생성', startWeek: 7, endWeek: 9,
    symptom: '밤낮 주기 구분이 시작되며 잠드는 것이 더 어려워집니다. 손을 만지작거리며 반복적인 패턴 행동을 보입니다.',
    tip: '규칙적인 낮밤 활동 패턴을 구성하고 수면 의식을 정립해 주세요.',
  },
  {
    leap: 3, name: '자연스러운 움직임', startWeek: 11, endWeek: 13,
    symptom: '고개를 가누고, 딸랑이를 흔들 수 있으며, 수면 및 활동 패턴이 유사해집니다.',
    tip: '신체 발달을 지원하는 놀이 시간을 충분히 제공해 주세요.',
  },
  {
    leap: 4, name: '이벤트', startWeek: 15, endWeek: 19,
    symptom: '주변의 변화를 감지하고 일상으로 여기기 시작합니다. 사물에 대한 호기심이 커집니다.',
    tip: '낯선 사람과 새로운 환경을 접할 기회를 자주 주는 것이 좋아요.',
  },
  {
    leap: 5, name: '관계 형성', startWeek: 23, endWeek: 26,
    symptom: '엄마의 목소리만으로도 존재를 인식합니다. 아랫니가 나면서 잠들기 어려워하고 분리불안이 시작됩니다.',
    tip: '안정적인 양육자와의 상호작용을 늘리고, 분리불안에 차분하게 대응해 주세요.',
  },
  {
    leap: 6, name: '분류 인지', startWeek: 34, endWeek: 37,
    symptom: '기기 시작과 함께 분리불안이 본격화됩니다. 사물, 동물, 사람을 분류할 수 있게 됩니다.',
    tip: '안전한 탐색 환경을 만들어 주고, 분리불안 완화를 위해 짧은 분리 연습을 해보세요.',
  },
  {
    leap: 7, name: '순서 인지', startWeek: 42, endWeek: 46,
    symptom: '순서와 원리를 이해하기 시작합니다. 일정한 수면 의식을 꼭 지켜주어야 하는 시기입니다.',
    tip: '일관된 수면 루틴을 유지하고, 예측 가능한 일과를 구성해 주세요.',
  },
  {
    leap: 8, name: '유아기 시작', startWeek: 51, endWeek: 54,
    symptom: '영아기가 끝나고 유아기가 시작됩니다. 분리불안이 다시 나타날 수 있습니다.',
    tip: '독립성 발달을 지원하면서도 안정감을 함께 제공해 주세요.',
  },
  {
    leap: 9, name: '원칙 인지', startWeek: 60, endWeek: 64,
    symptom: '부모의 행동을 모방하기 시작합니다. 자신의 행동이 결과를 초래한다는 것을 인식합니다.',
    tip: '모범적인 행동을 보여주고, 결과 기반 학습을 활용해 주세요.',
  },
  {
    leap: 10, name: '시스템', startWeek: 75, endWeek: 79,
    symptom: '환경을 적극적으로 탐색하고 문장을 이해하기 시작합니다. 떼를 쓰는 행동이 본격적으로 시작됩니다.',
    tip: '동네 주변으로 산책을 자주 나가고, 다양한 환경을 경험하게 해주세요.',
  },
];

export interface WonderWeekLeap {
  leap: number;
  name: string;
  startWeek: number;
  endWeek: number;
  symptom: string;
  tip: string;
}

/** 주차를 "생후 N개월 무렵" 표현으로 — 본문 가독성용. */
export function weekToMonthLabel(week: number): string {
  const months = Math.round((week / 4.345) * 10) / 10;
  return months < 1 ? "생후 1개월 미만" : `생후 약 ${months}개월`;
}
