// 기질 검사 문항 데이터
// 6차원(activity/adaptability/emotional_intensity/sociability/persistence/sensitivity) × 5문항 = 30문항

import { AgeGroup } from '@prisma/client';

export const DIMENSIONS = [
  { key: 'activity', label: '활동성' },
  { key: 'adaptability', label: '적응성' },
  { key: 'emotional_intensity', label: '감정 표현 강도' },
  { key: 'sociability', label: '사회성' },
  { key: 'persistence', label: '집중 지속성' },
  { key: 'sensitivity', label: '민감성' },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]['key'];

export interface QuestionDef {
  id: string; // 안정 식별자
  questionNo: number; // 1-based 표시 순서
  dimension: DimensionKey;
  text: string;
}

export const SCALE = {
  min: 1,
  max: 5,
  labels: {
    '1': '전혀 그렇지 않다',
    '2': '그렇지 않다',
    '3': '보통이다',
    '4': '그렇다',
    '5': '매우 그렇다',
  } as Record<string, string>,
};

export const NOTICE =
  '정답은 없습니다. 평소 우리 아기의 모습에 가장 가까운 응답을 선택해 주세요.';

type RawQ = { dimension: DimensionKey; text: string };

const NEWBORN: RawQ[] = [
  { dimension: 'activity', text: '깨어 있을 때 손발을 자주 움직이는 편이다.' },
  {
    dimension: 'activity',
    text: '기저귀를 갈거나 목욕할 때 몸을 많이 움직인다.',
  },
  {
    dimension: 'activity',
    text: '수유 중에도 팔다리를 활발하게 움직이는 편이다.',
  },
  {
    dimension: 'activity',
    text: '잠들기 전 몸을 뒤척이거나 움직임이 많은 편이다.',
  },
  {
    dimension: 'activity',
    text: '누워 있을 때도 가만히 있기보다 몸을 움직이려 한다.',
  },
  {
    dimension: 'adaptability',
    text: '수유 시간이나 수면 패턴이 바뀌어도 비교적 잘 적응한다.',
  },
  {
    dimension: 'adaptability',
    text: '다른 사람이 안아도 비교적 편안해하는 편이다.',
  },
  { dimension: 'adaptability', text: '장소가 바뀌어도 잠을 잘 자는 편이다.' },
  {
    dimension: 'adaptability',
    text: '목욕이나 옷 갈아입기 등 일상 루틴을 잘 받아들인다.',
  },
  {
    dimension: 'adaptability',
    text: '새로운 소리나 환경 변화에 금방 안정을 찾는 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '울 때 소리가 크고 울음이 강한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '불편하면 온몸으로 강하게 표현하는 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '기분이 좋을 때 표정 변화가 뚜렷한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '배고프거나 졸릴 때 반응이 격렬한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '한번 울기 시작하면 달래는 데 시간이 걸리는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '사람의 얼굴을 보면 관심을 보이는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '말소리나 노래에 반응하며 집중하는 편이다.',
  },
  { dimension: 'sociability', text: '안아주면 몸을 기대며 편안해하는 편이다.' },
  { dimension: 'sociability', text: '눈을 마주치면 표정이 밝아지는 편이다.' },
  {
    dimension: 'sociability',
    text: '사람이 가까이 있을 때 더 안정적인 모습을 보인다.',
  },
  { dimension: 'persistence', text: '모빌이나 장난감을 오래 바라보는 편이다.' },
  {
    dimension: 'persistence',
    text: '소리가 나는 쪽을 향해 계속 관심을 보이는 편이다.',
  },
  { dimension: 'persistence', text: '손에 잡힌 물건을 오래 쥐고 있으려 한다.' },
  {
    dimension: 'persistence',
    text: '움직이는 물체를 눈으로 오래 따라가는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '관심 있는 대상에 한동안 시선을 고정하는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '작은 소리에도 쉽게 깨거나 놀라는 편이다.',
  },
  { dimension: 'sensitivity', text: '밝은 빛에 민감하게 반응하는 편이다.' },
  {
    dimension: 'sensitivity',
    text: '옷이나 이불의 재질에 따라 반응이 다른 편이다.',
  },
  { dimension: 'sensitivity', text: '온도 변화에 민감하게 반응하는 편이다.' },
  { dimension: 'sensitivity', text: '기저귀가 젖으면 바로 불편해하는 편이다.' },
];

const BEFORE_FIRST: RawQ[] = [
  {
    dimension: 'activity',
    text: '깨어 있을 때 끊임없이 움직이려 하는 편이다.',
  },
  {
    dimension: 'activity',
    text: '뒤집기, 기기 등 몸을 움직이는 놀이를 좋아한다.',
  },
  {
    dimension: 'activity',
    text: '카시트나 유모차에 오래 앉아 있는 것을 힘들어한다.',
  },
  {
    dimension: 'activity',
    text: '바닥에 내려놓으면 여기저기 이동하려 하는 편이다.',
  },
  { dimension: 'activity', text: '놀이 시간에 에너지가 넘치는 편이다.' },
  {
    dimension: 'adaptability',
    text: '새로운 이유식이나 음식을 비교적 잘 시도한다.',
  },
  {
    dimension: 'adaptability',
    text: '낯선 장소에 가도 시간이 지나면 편안해하는 편이다.',
  },
  {
    dimension: 'adaptability',
    text: '일과가 바뀌어도 크게 힘들어하지 않는 편이다.',
  },
  {
    dimension: 'adaptability',
    text: '새로운 장난감이나 놀이에 거부감이 적은 편이다.',
  },
  {
    dimension: 'adaptability',
    text: '처음 보는 사람에게도 시간이 지나면 다가가는 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '좋아하는 것을 보면 온몸으로 기쁨을 표현하는 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '원하는 것을 못 가지면 울음이 크고 격렬한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '까꿍 놀이 등에 웃음 반응이 큰 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '싫은 음식이나 상황에 거부 반응이 분명한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '감정 변화가 표정이나 몸짓에 바로 드러나는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '다른 아기나 아기들을 보면 관심을 보이는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '가족 외의 사람에게도 미소를 잘 짓는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '사람들이 많은 곳에서도 위축되지 않는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '누군가 말을 걸면 옹알이로 반응하려 하는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '혼자 있기보다 사람 곁에 있으려 하는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '관심 있는 장난감을 오래 가지고 노는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '손이 닿지 않는 물건을 계속 잡으려 시도하는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '그림책을 보여주면 한동안 집중해서 보는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '놀이에 빠지면 다른 것에 쉽게 주의가 분산되지 않는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '어려운 동작(앉기, 서기 등)을 반복해서 시도하는 편이다.',
  },
  { dimension: 'sensitivity', text: '갑작스러운 소리에 크게 놀라는 편이다.' },
  {
    dimension: 'sensitivity',
    text: '이유식의 맛이나 식감 변화에 민감하게 반응하는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '낯선 냄새나 환경 변화를 빠르게 감지하는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '옷 태그나 재질에 불편함을 보이는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '주변이 시끄러우면 쉽게 보채거나 울음을 보이는 편이다.',
  },
];

const AFTER_FIRST: RawQ[] = [
  {
    dimension: 'activity',
    text: '우리 아기는 가만히 있기보다 몸을 움직이며 노는 것을 좋아한다.',
  },
  {
    dimension: 'activity',
    text: '실내에서도 자주 움직이거나 활동하려는 편이다.',
  },
  {
    dimension: 'activity',
    text: '활동적인 놀이를 시작하면 쉽게 지치지 않는다.',
  },
  {
    dimension: 'activity',
    text: '앉아서 오래 하는 활동보다 뛰거나 움직이는 활동을 더 좋아한다.',
  },
  { dimension: 'activity', text: '에너지가 넘쳐 보인다는 말을 자주 듣는다.' },
  {
    dimension: 'adaptability',
    text: '새로운 장소에 가도 비교적 금방 익숙해진다.',
  },
  {
    dimension: 'adaptability',
    text: '갑작스러운 일정 변화가 있어도 크게 힘들어하지 않는다.',
  },
  {
    dimension: 'adaptability',
    text: '처음 보는 사람과도 시간이 지나면 편안해지는 편이다.',
  },
  {
    dimension: 'adaptability',
    text: '새로운 놀이, 음식, 활동을 비교적 잘 시도한다.',
  },
  {
    dimension: 'adaptability',
    text: '낯선 상황에서도 적응하는 속도가 빠른 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '기쁘거나 속상할 때 감정 표현이 분명한 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '마음에 들지 않는 일이 생기면 반응이 크게 나타난다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '즐거울 때 웃음이나 흥분을 크게 표현한다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '감정이 얼굴이나 행동에 바로 드러나는 편이다.',
  },
  {
    dimension: 'emotional_intensity',
    text: '작은 일에도 감정 반응이 또렷하게 보인다.',
  },
  { dimension: 'sociability', text: '다른 아기들과 함께 노는 것을 좋아한다.' },
  {
    dimension: 'sociability',
    text: '혼자 놀기보다 누군가와 함께하는 활동을 선호하는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '새로운 친구를 사귀는 데 비교적 적극적이다.',
  },
  {
    dimension: 'sociability',
    text: '가족 외의 사람들과도 잘 어울리는 편이다.',
  },
  {
    dimension: 'sociability',
    text: '사람들과 함께 있으면 더 활발해지는 모습이 있다.',
  },
  {
    dimension: 'persistence',
    text: '관심 있는 놀이나 활동을 오래 지속하는 편이다.',
  },
  { dimension: 'persistence', text: '하던 일을 중간에 쉽게 포기하지 않는다.' },
  {
    dimension: 'persistence',
    text: '한 번 꽂힌 활동은 끝까지 해보려는 편이다.',
  },
  {
    dimension: 'persistence',
    text: '주변에 다른 자극이 있어도 하던 일에 다시 집중할 수 있다.',
  },
  {
    dimension: 'persistence',
    text: '원하는 목표가 있으면 꾸준히 해내려는 모습이 있다.',
  },
  {
    dimension: 'sensitivity',
    text: '소리, 빛, 냄새, 촉감 등에 예민하게 반응하는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '옷의 재질이나 음식의 식감처럼 작은 감각 차이를 잘 느낀다.',
  },
  {
    dimension: 'sensitivity',
    text: '주변 분위기 변화에 빠르게 반응하는 편이다.',
  },
  {
    dimension: 'sensitivity',
    text: '피곤함, 배고픔, 불편함을 비교적 빨리 알아차리고 표현한다.',
  },
  {
    dimension: 'sensitivity',
    text: '사소한 자극에도 불편함이나 예민함을 보일 때가 있다.',
  },
];

function build(age: AgeGroup, raws: RawQ[]): QuestionDef[] {
  const counters: Record<string, number> = {};
  return raws.map((q, idx) => {
    counters[q.dimension] = (counters[q.dimension] ?? 0) + 1;
    return {
      id: `${age}_${q.dimension}_${counters[q.dimension]}`,
      questionNo: idx + 1,
      dimension: q.dimension,
      text: q.text,
    };
  });
}

export const QUESTIONS: Record<AgeGroup, QuestionDef[]> = {
  newborn: build('newborn', NEWBORN),
  before_first: build('before_first', BEFORE_FIRST),
  after_first: build('after_first', AFTER_FIRST),
};

export function getQuestions(ageGroup: AgeGroup): QuestionDef[] {
  return QUESTIONS[ageGroup];
}

export function getQuestionMap(ageGroup: AgeGroup): Map<string, QuestionDef> {
  return new Map(QUESTIONS[ageGroup].map((q) => [q.id, q]));
}
