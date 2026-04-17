// 기질 검사 채점 / 유형 매핑 / 결과 콘텐츠
// everyting-my-child 프로젝트의 콘텐츠와 채점 로직을 이식했다.

import { DIMENSIONS, DimensionKey } from './data/questions';

export type Level = 'low' | 'medium' | 'high';

export interface DimensionScore {
  raw: number;
  score: number; // 0~100 환산
  level: Level;
  label: string;
}

export type Scores = Record<DimensionKey, DimensionScore>;

export interface AnswerInput {
  questionId: string;
  questionNo: number;
  dimension: DimensionKey;
  score: number;
}

export type PrimaryType =
  | 'explorer'
  | 'socializer'
  | 'observer'
  | 'concentrator'
  | 'balanced';

const PER_DIM = 5;
const SCALE_MIN = 1;
const SCALE_MAX = 5;

// 원점수(5~25) → 환산점수(0~100)
function convertScore(raw: number): number {
  const min = PER_DIM * SCALE_MIN; // 5
  const max = PER_DIM * SCALE_MAX; // 25
  return Math.round(((raw - min) / (max - min)) * 100 * 10) / 10;
}

function getLevel(score: number): Level {
  if (score <= 39) return 'low';
  if (score <= 69) return 'medium';
  return 'high';
}

export function computeScores(answers: AnswerInput[]): Scores {
  const acc: Record<string, number> = {};
  for (const a of answers) {
    acc[a.dimension] = (acc[a.dimension] ?? 0) + a.score;
  }
  const out = {} as Scores;
  for (const dim of DIMENSIONS) {
    const raw = acc[dim.key] ?? 0;
    const score = convertScore(raw);
    out[dim.key] = {
      raw,
      score,
      level: getLevel(score),
      label: dim.label,
    };
  }
  return out;
}

// 동점 시 우선순위 (결과가 더 선명한 축 순)
const TYPE_PRIORITY: {
  dimension: DimensionKey;
  type: PrimaryType;
  label: string;
}[] = [
  { dimension: 'persistence', type: 'concentrator', label: '집중가형' },
  { dimension: 'sociability', type: 'socializer', label: '사교가형' },
  { dimension: 'activity', type: 'explorer', label: '탐험가형' },
  { dimension: 'sensitivity', type: 'observer', label: '관찰자형' },
];

export function determineType(scores: Scores): {
  primaryType: PrimaryType;
  primaryTypeLabel: string;
  emotionModifier: boolean;
} {
  let maxScore = 0;
  for (const dim of DIMENSIONS) {
    if (scores[dim.key].score > maxScore) maxScore = scores[dim.key].score;
  }

  let primaryType: PrimaryType = 'balanced';
  let primaryTypeLabel = '균형성장형';

  for (const candidate of TYPE_PRIORITY) {
    const dimScore = scores[candidate.dimension].score;
    // 70점 이상이고 최고점과 5점 이내 차이
    if (dimScore >= 70 && maxScore - dimScore <= 5) {
      primaryType = candidate.type;
      primaryTypeLabel = candidate.label;
      break;
    }
  }

  return {
    primaryType,
    primaryTypeLabel,
    emotionModifier: scores.emotional_intensity.level === 'high',
  };
}

const RELIABILITY_MSG =
  '이번 결과는 아이의 현재 모습보다는 응답 패턴의 영향이 클 수 있어요. 며칠 뒤 다시 진행해 보시면 더 안정적인 결과를 볼 수 있습니다.';

export function checkReliability(answers: AnswerInput[]): {
  isReliable: boolean;
  reliabilityMsg: string | null;
} {
  if (answers.length === 0)
    return { isReliable: false, reliabilityMsg: '응답이 없습니다.' };

  // 균일 응답: 80% 이상 같은 점수
  const counts = new Map<number, number>();
  for (const a of answers) counts.set(a.score, (counts.get(a.score) ?? 0) + 1);
  const maxSame = Math.max(...counts.values());
  if (maxSame / answers.length >= 0.8) {
    return { isReliable: false, reliabilityMsg: RELIABILITY_MSG };
  }

  // 극단 응답: 중간(2,3,4) 응답이 10% 미만
  const middleCount = answers.filter(
    (a) => a.score >= 2 && a.score <= 4,
  ).length;
  if (middleCount / answers.length < 0.1) {
    return { isReliable: false, reliabilityMsg: RELIABILITY_MSG };
  }

  return { isReliable: true, reliabilityMsg: null };
}

// ===== 콘텐츠 =====

interface FreeTypeContent {
  title: string;
  description: string;
  strengths: string[];
  tip: string;
}

const FREE_CONTENT: Record<PrimaryType, FreeTypeContent> = {
  explorer: {
    title: '우리 아이는 몸으로 배우는 탐험가형 기질이 강해요.',
    description:
      '에너지가 높고 새로운 활동에 흥미를 보일 가능성이 큽니다. 직접 해보고 움직이며 경험할 때 장점이 잘 살아날 수 있어요.',
    strengths: [
      '새로운 활동을 즐길 가능성이 커요',
      '몸으로 배우는 경험에서 강점이 보여요',
    ],
    tip: '짧고 활동적인 경험을 자주 제공해 주세요.',
  },
  socializer: {
    title: '우리 아이는 사람 속에서 힘을 얻는 사교가형 기질이 보여요.',
    description:
      '함께 놀고 이야기하는 상황에서 더 활발해질 수 있어요. 관계 속에서 즐거움과 동기를 얻는 아이일 가능성이 큽니다.',
    strengths: ['친화력이 좋은 편이에요', '관계를 형성하는 능력이 돋보여요'],
    tip: '혼자 하는 활동과 함께하는 활동의 균형을 잡아 주세요.',
  },
  observer: {
    title: '우리 아이는 작은 변화도 잘 느끼는 관찰자형 기질이 있어요.',
    description:
      '감각과 분위기에 민감하고 세심하게 반응하는 편일 수 있어요. 조용해 보여도 내면에서는 많은 정보를 받아들이고 있을 수 있습니다.',
    strengths: [
      '섬세함이 돋보이는 편이에요',
      '분위기를 잘 파악하는 능력이 있어요',
    ],
    tip: '자극이 많은 환경에서는 쉬는 시간을 충분히 주세요.',
  },
  concentrator: {
    title: '우리 아이는 하나에 깊게 몰입하는 집중가형 기질이 보여요.',
    description:
      '관심 있는 활동에는 오래 집중하고 꾸준히 이어갈 가능성이 큽니다. 자기만의 속도와 몰입의 흐름이 중요한 아이일 수 있어요.',
    strengths: ['몰입력이 뛰어난 편이에요', '끈기 있게 이어가는 힘이 보여요'],
    tip: '몰입을 방해하지 않도록 전환 전에 미리 예고해 주세요.',
  },
  balanced: {
    title: '우리 아이는 전반적으로 고르게 발달한 균형성장형 기질이 보여요.',
    description:
      '특정 한쪽으로 강하게 치우치기보다 상황에 따라 비교적 유연하게 반응할 가능성이 큽니다. 안정적이고 무난한 모습 속에도 고유한 특성이 숨어 있을 수 있어요.',
    strengths: ['유연하게 대처하는 힘이 있어요', '안정감 있는 반응이 돋보여요'],
    tip: '겉으로 무난해 보여도 아이만의 선호와 민감 포인트를 세심하게 관찰해 주세요.',
  },
};

const PAID_TYPE_DETAIL: Record<PrimaryType, string> = {
  explorer:
    '이 아이는 에너지와 호기심이 비교적 높은 편이며, 직접 움직이고 경험하는 과정에서 즐거움을 느낄 가능성이 큽니다. 머리로 오래 듣기보다 몸으로 해보는 과정에서 더 빠르게 익히고 흥미를 보일 수 있어요.',
  socializer:
    '사람과 함께 있을 때 더 밝아지고 살아나는 아이입니다. 대화, 협동, 상호작용에서 강점을 보이며, 관계 속에서 동기와 즐거움을 얻을 가능성이 큽니다.',
  observer:
    '작은 차이도 놓치지 않고 세심하게 받아들이는 아이입니다. 겉으로는 조용해 보여도 내면의 감각과 관찰은 매우 풍부할 수 있습니다. 안전하고 편안한 환경에서 이 강점이 더 잘 드러납니다.',
  concentrator:
    '자신이 관심 있는 것에 오래 몰입하며 차근차근 해내는 아이입니다. 꾸준함과 완성도가 강점이 될 수 있으며, 자기만의 리듬을 존중받을 때 더 안정적으로 성장합니다.',
  balanced:
    '한쪽으로 강하게 치우치기보다 전체적으로 고르게 발달한 아이입니다. 상황에 맞춰 조절하는 힘이 상대적으로 안정적일 수 있으며, 다양한 환경에 무난하게 적응할 가능성이 있습니다.',
};

interface DimensionDetail {
  description: string;
  parentTips: string[];
}

const DIMENSION_DETAILS: Record<
  DimensionKey,
  Record<Level, DimensionDetail>
> = {
  activity: {
    high: {
      description:
        '이 아이는 움직임 욕구가 비교적 큰 편입니다. 가만히 오래 앉아 있는 상황보다 몸을 쓰는 활동에서 더 편안함을 느낄 수 있어요. 활동성은 산만함과 같은 뜻이 아니라, 에너지를 발산하는 방식의 차이로 이해하는 것이 좋습니다.',
      parentTips: [
        '실내에서도 움직이고 싶어할 수 있어요',
        '규칙적인 신체 활동이 정서 안정에 도움이 될 수 있어요',
      ],
    },
    medium: {
      description:
        '상황에 따라 활발하기도 하고 차분하기도 한 편입니다. 에너지 수준이 극단적이지 않아 다양한 활동에 적응할 수 있어요.',
      parentTips: ['활동적인 놀이와 정적인 활동을 적절히 섞어 주세요'],
    },
    low: {
      description:
        '움직이는 것보다 조용한 활동을 더 편하게 느끼는 편일 수 있어요. 에너지가 낮다기보다 몸을 쓰는 방식 대신 다른 방식으로 탐색할 가능성이 있습니다.',
      parentTips: [
        '아이의 속도를 존중해 주세요',
        '흥미 있는 활동으로 자연스럽게 움직임을 유도해 보세요',
      ],
    },
  },
  adaptability: {
    high: {
      description:
        '새로운 환경이나 사람에 비교적 빠르게 적응하는 편입니다. 변화에 대한 저항이 적고 유연하게 반응할 가능성이 커요.',
      parentTips: ['다양한 경험을 시도하기 좋은 기질이에요'],
    },
    medium: {
      description:
        '어느 정도 적응 시간이 필요하지만 큰 어려움 없이 변화를 받아들이는 편입니다.',
      parentTips: ['새로운 상황 전에 미리 알려주면 더 편안해할 수 있어요'],
    },
    low: {
      description:
        '새로운 상황에 적응하는 데 시간이 더 필요한 편일 수 있어요. 익숙한 환경에서 안정감을 느끼고, 변화에 민감하게 반응할 수 있습니다.',
      parentTips: [
        '갑작스러운 변화보다 점진적 전환이 효과적이에요',
        '충분한 예고와 설명이 도움이 됩니다',
      ],
    },
  },
  emotional_intensity: {
    high: {
      description:
        '기쁨도 슬픔도 분명하게 표현하는 편입니다. 감정이 또렷하기 때문에 아이의 상태를 읽기 쉬운 장점이 있지만, 감정 조절에는 더 많은 연습이 필요할 수 있어요.',
      parentTips: [
        '감정을 멈추게 하기보다 이름 붙여 주세요',
        '진정 후에 대화하는 것이 효과적이에요',
      ],
    },
    medium: {
      description:
        '감정 표현이 적절한 수준인 편입니다. 상황에 맞게 감정을 표현하는 편이에요.',
      parentTips: ['감정 표현을 자연스럽게 격려해 주세요'],
    },
    low: {
      description:
        '감정을 겉으로 크게 표현하지 않는 편일 수 있어요. 내면에서는 느끼고 있지만 밖으로 드러나지 않을 수 있어 부모가 세심하게 관찰할 필요가 있습니다.',
      parentTips: [
        '표현이 적다고 괜찮은 것은 아닐 수 있어요',
        '"지금 기분이 어때?"라고 자주 물어봐 주세요',
      ],
    },
  },
  sociability: {
    high: {
      description:
        '사람들과 함께 있을 때 에너지를 얻는 편입니다. 친구와의 상호작용에서 즐거움을 느끼고, 관계를 적극적으로 맺어 나갈 가능성이 커요.',
      parentTips: [
        '다양한 또래 경험을 제공해 주세요',
        '관계 갈등 시 대화로 복기해 주세요',
      ],
    },
    medium: {
      description:
        '사회적 상황에 적절히 참여하는 편입니다. 혼자 있는 시간과 함께하는 시간 모두를 즐길 수 있어요.',
      parentTips: ['자연스러운 또래 상호작용 기회를 만들어 주세요'],
    },
    low: {
      description:
        '혼자 있는 시간을 더 편안하게 느끼는 편일 수 있어요. 소수의 깊은 관계를 선호할 가능성이 있으며, 사회성이 낮은 것이 아니라 에너지를 얻는 방식이 다른 것일 수 있습니다.',
      parentTips: [
        '소수 관계에서의 깊은 교류를 격려해 주세요',
        '큰 모임보다 소규모 상호작용이 편안할 수 있어요',
      ],
    },
  },
  persistence: {
    high: {
      description:
        '관심 있는 활동에 오래 몰입하고 끝까지 해내려는 힘이 있는 편입니다. 자기주도적 학습에 강점이 될 수 있어요.',
      parentTips: [
        '몰입 중 갑작스러운 전환을 피해 주세요',
        '전환 5분 전에 미리 알려주세요',
      ],
    },
    medium: {
      description:
        '상황에 따라 집중력을 발휘하는 편입니다. 적절한 동기와 환경이 주어지면 잘 집중할 수 있어요.',
      parentTips: ['흥미와 난이도를 맞춰주면 집중력이 올라갈 수 있어요'],
    },
    low: {
      description:
        '하나의 활동에 오래 집중하기보다 여러 활동을 전환하며 탐색하는 편일 수 있어요. 이것은 결함이 아니라 다양한 경험을 선호하는 특성일 수 있습니다.',
      parentTips: [
        '짧은 단위로 활동을 나눠 주세요',
        '작은 완성 경험을 자주 만들어 주세요',
      ],
    },
  },
  sensitivity: {
    high: {
      description:
        '소리, 빛, 촉감 등 감각 자극에 예민하게 반응하는 편입니다. 분위기 변화도 빠르게 감지할 수 있어요. 이 민감성은 공감력과 세심함의 바탕이 될 수 있습니다.',
      parentTips: [
        '자극이 강한 환경에서는 쉬는 시간을 주세요',
        '옷이나 음식 선호를 존중해 주세요',
      ],
    },
    medium: {
      description:
        '감각 자극에 적절히 반응하는 편입니다. 극단적인 자극에는 반응하지만 일상적인 변화에는 무난하게 적응해요.',
      parentTips: ['아이가 불편해하는 감각이 있다면 세심하게 관찰해 주세요'],
    },
    low: {
      description:
        '감각 자극에 대한 반응이 비교적 덜한 편일 수 있어요. 환경 변화에 크게 영향받지 않아 다양한 상황에서 안정적인 편입니다.',
      parentTips: [
        '불편함을 스스로 잘 표현하지 않을 수 있으니 상태를 자주 확인해 주세요',
      ],
    },
  },
};

export interface StrengthItem {
  title: string;
  description: string;
}

const PAID_STRENGTHS: Record<PrimaryType, StrengthItem[]> = {
  explorer: [
    {
      title: '행동으로 배우는 힘',
      description: '직접 해보는 과정에서 빠르게 이해할 가능성이 있습니다.',
    },
    {
      title: '새로운 자극에 대한 호기심',
      description: '익숙한 것보다 새롭고 재미있는 것에 반응이 잘 올 수 있어요.',
    },
    {
      title: '표현의 생동감',
      description:
        '감정과 관심이 또렷하게 드러나기 때문에 아이의 상태를 읽기 쉬운 편입니다.',
    },
  ],
  socializer: [
    {
      title: '관계를 이끄는 힘',
      description: '친구나 어른과의 상호작용에서 주도적으로 다가갈 수 있어요.',
    },
    {
      title: '협동하며 배우는 능력',
      description:
        '함께 하는 활동에서 자연스럽게 역할을 찾고 참여할 가능성이 큽니다.',
    },
    {
      title: '감정을 나누는 표현력',
      description:
        '자신의 기분이나 생각을 말로 표현하는 데 비교적 능숙할 수 있어요.',
    },
  ],
  observer: [
    {
      title: '세심한 감각',
      description: '작은 변화나 차이를 빠르게 알아채는 능력이 있을 수 있어요.',
    },
    {
      title: '깊은 공감력',
      description: '다른 사람의 기분이나 상태를 민감하게 느낄 가능성이 큽니다.',
    },
    {
      title: '신중한 판단력',
      description: '행동 전에 관찰하고 생각하는 시간을 갖는 편일 수 있어요.',
    },
  ],
  concentrator: [
    {
      title: '깊은 몰입력',
      description: '좋아하는 활동에 오래 집중할 수 있는 힘이 있습니다.',
    },
    {
      title: '꾸준한 끈기',
      description: '어려워도 포기하지 않고 이어가려는 성향이 보일 수 있어요.',
    },
    {
      title: '자기주도적 완성',
      description:
        '스스로 시작한 것을 끝까지 해내려는 모습이 강점이 될 수 있습니다.',
    },
  ],
  balanced: [
    {
      title: '유연한 적응력',
      description: '상황에 따라 행동을 조절하는 힘이 비교적 안정적입니다.',
    },
    {
      title: '고른 발달의 안정감',
      description:
        '특정 영역에 치우치지 않아 다양한 경험에 무난하게 적응할 수 있어요.',
    },
    {
      title: '숨겨진 잠재력',
      description:
        '겉으로 드러나는 특성이 크지 않지만, 적절한 자극에서 강점이 나타날 수 있습니다.',
    },
  ],
};

const PAID_CAUTIONS: Record<PrimaryType, StrengthItem[]> = {
  explorer: [
    {
      title: '지시가 길면 반응이 줄어들 수 있어요',
      description: '설명은 짧고 분명하게 주는 것이 더 효과적일 수 있습니다.',
    },
    {
      title: '에너지 과잉처럼 보일 수 있지만 발산 기회가 부족한 것일 수 있어요',
      description: '충분히 움직인 뒤에는 오히려 안정되는 아이도 많습니다.',
    },
    {
      title: '감정이 큰 날은 훈육보다 진정이 먼저예요',
      description: '흥분 상태에서는 설명보다 안정이 우선입니다.',
    },
  ],
  socializer: [
    {
      title: '타인의 반응에 영향을 많이 받을 수 있어요',
      description: '친구의 거절이나 무시에 민감하게 반응할 수 있습니다.',
    },
    {
      title: '혼자 있는 시간을 불안해할 수 있어요',
      description: '혼자 놀기 연습을 자연스럽게 시작해 보세요.',
    },
    {
      title: '인정받고 싶은 욕구가 클 수 있어요',
      description: '결과보다 과정을 칭찬해 주는 것이 효과적입니다.',
    },
  ],
  observer: [
    {
      title: '자극이 많은 환경에서 쉽게 피로할 수 있어요',
      description:
        '시끄럽거나 복잡한 환경 후에는 충분한 회복 시간이 필요합니다.',
    },
    {
      title: '새로운 것에 도전하기까지 시간이 걸릴 수 있어요',
      description: '강요보다 관찰 기회를 먼저 주는 것이 효과적입니다.',
    },
    {
      title: '내면의 감정을 겉으로 표현하지 않을 수 있어요',
      description: '조용하다고 괜찮은 것이 아닐 수 있으니 자주 확인해 주세요.',
    },
  ],
  concentrator: [
    {
      title: '관심 없는 활동에는 반응이 매우 낮을 수 있어요',
      description: '관심사를 연결해 동기를 부여하는 것이 효과적입니다.',
    },
    {
      title: '자기 리듬이 깨지면 예민해질 수 있어요',
      description: '갑작스러운 전환보다 충분한 예고가 필요합니다.',
    },
    {
      title: '완벽주의 성향이 보일 수 있어요',
      description: '"잘 못해도 괜찮아"라는 메시지를 자주 전해 주세요.',
    },
  ],
  balanced: [
    {
      title: '두드러진 강점이 잘 보이지 않을 수 있어요',
      description:
        '다양한 활동을 시도하며 아이가 더 반짝이는 영역을 찾아 주세요.',
    },
    {
      title: '부모가 "무난하다"로만 볼 수 있어요',
      description: '고르게 발달한 것도 장점이라는 관점을 유지해 주세요.',
    },
    {
      title: '스스로 선택하는 기회가 부족할 수 있어요',
      description: '아이에게 선택권을 자주 주면 선호가 더 잘 드러납니다.',
    },
  ],
};

export interface EmotionTip {
  action: string;
  example: string;
}

const EMOTION_COACHING: Record<
  PrimaryType,
  { title: string; tips: EmotionTip[] }
> = {
  explorer: {
    title: '감정이 올라올 때 이렇게 도와주세요',
    tips: [
      {
        action: '먼저 감정을 멈추게 하기보다 이름 붙여 주세요.',
        example: '지금 너무 속상했구나.',
      },
      {
        action: '긴 설명보다 짧은 공감이 먼저예요.',
        example: '원하던 대로 안 돼서 화가 났구나.',
      },
      {
        action: '진정 후에 규칙을 설명해 주세요.',
        example:
          '감정이 큰 순간에는 배우기보다 버티기에 가까운 상태일 수 있습니다.',
      },
    ],
  },
  socializer: {
    title: '관계 속 감정이 올라올 때 이렇게 도와주세요',
    tips: [
      {
        action: '관계 속 감정을 먼저 인정해 주세요.',
        example: '친구가 그렇게 말해서 속상했구나.',
      },
      {
        action: '상대방의 입장도 함께 생각해 보게 도와주세요.',
        example: '그 친구는 어떤 마음이었을까?',
      },
      {
        action: '갈등 해결 문장을 연습시켜 주세요.',
        example: '"나는 ~해서 슬펐어"라고 말해보는 연습',
      },
    ],
  },
  observer: {
    title: '감정이 올라올 때 이렇게 도와주세요',
    tips: [
      {
        action: '조용한 공간에서 1:1로 이야기해 주세요.',
        example: '여러 사람 앞에서 감정을 꺼내기 어려울 수 있어요.',
      },
      {
        action: '감정을 직접 물어보기보다 상황을 묘사해 주세요.',
        example: '아까 그게 좀 불편했을 수도 있겠다.',
      },
      {
        action: '표현의 시간을 충분히 주세요.',
        example: '바로 대답하지 못해도 기다려 주세요.',
      },
    ],
  },
  concentrator: {
    title: '감정이 올라올 때 이렇게 도와주세요',
    tips: [
      {
        action: '몰입이 끊겼을 때의 좌절감을 인정해 주세요.',
        example: '하던 걸 중단해야 해서 속상했구나.',
      },
      {
        action: '왜 전환이 필요한지 짧게 설명해 주세요.',
        example: '밥 먹고 다시 해도 괜찮아.',
      },
      {
        action: '감정 일기나 그림으로 표현하게 도와주세요.',
        example: '말보다 다른 방식이 편할 수 있어요.',
      },
    ],
  },
  balanced: {
    title: '감정이 올라올 때 이렇게 도와주세요',
    tips: [
      { action: '감정을 직접 물어봐 주세요.', example: '지금 기분이 어때?' },
      {
        action: '무난해 보여도 내면의 감정을 확인해 주세요.',
        example: '괜찮다고 말했지만, 혹시 좀 속상한 건 아닐까?',
      },
      {
        action: '감정 표현을 격려해 주세요.',
        example: '어떤 기분이든 말해도 괜찮아.',
      },
    ],
  },
};

export interface LearningStyle {
  recommended: string[];
  difficult: string[];
}

const LEARNING_STYLES: Record<PrimaryType, LearningStyle> = {
  explorer: {
    recommended: [
      '직접 만지고 해보는 체험형 학습',
      '짧은 단위로 끊어 진행하는 활동',
      '움직인 뒤 앉아서 정리하는 흐름',
      '시각 자료와 실습을 함께 쓰는 방식',
    ],
    difficult: [
      '너무 오래 듣기만 하는 설명',
      '실패 경험이 반복되는 딱딱한 과제',
      '전환 없이 오래 유지되는 정적 활동',
    ],
  },
  socializer: {
    recommended: ['모둠 활동', '토론/발표', '역할극', '친구와 함께 공부'],
    difficult: ['혼자 오래 하는 과제', '경쟁이 강한 개인 과제'],
  },
  observer: {
    recommended: [
      '조용한 환경의 개별 학습',
      '관찰→실습 순서',
      '충분한 준비 시간',
    ],
    difficult: ['갑작스러운 발표', '자극 과다 환경', '빠른 전환'],
  },
  concentrator: {
    recommended: ['깊이 파고드는 프로젝트', '자기 속도 학습', '단계별 과제'],
    difficult: ['주제가 자주 바뀌는 활동', '흥미 없는 반복 과제'],
  },
  balanced: {
    recommended: ['다양한 방식 혼합', '적당한 난이도', '선택형 과제'],
    difficult: ['한 가지 방식만 고집하는 환경'],
  },
};

const SOCIAL_GUIDES: Record<
  PrimaryType,
  { patterns: string[]; parentTips: string[] }
> = {
  explorer: {
    patterns: [
      '먼저 다가가는 편일 수 있어요',
      '흥미가 맞는 친구와 빠르게 가까워질 수 있어요',
      '감정이 큰 날에는 관계 갈등도 크게 느낄 수 있어요',
    ],
    parentTips: [
      '짧은 사회적 연습을 제공해 주세요',
      '갈등 상황을 복기 대화로 정리해 주세요',
    ],
  },
  socializer: {
    patterns: [
      '넓은 친구 관계를 가질 수 있어요',
      '인기가 많을 수 있어요',
      '거절에 민감할 수 있어요',
    ],
    parentTips: ['소수 깊은 관계도 격려해 주세요', '거절 상황 연습을 해보세요'],
  },
  observer: {
    patterns: [
      '소수 깊은 관계를 선호할 수 있어요',
      '관찰 후 참여하는 편이에요',
      '큰 집단에서 위축될 수 있어요',
    ],
    parentTips: ['소규모 만남 기회를 제공해 주세요', '참여를 강요하지 마세요'],
  },
  concentrator: {
    patterns: [
      '같은 관심사 친구와 잘 맞을 수 있어요',
      '관심 없는 놀이는 빠질 수 있어요',
      '자기 방식을 고집할 수 있어요',
    ],
    parentTips: [
      '관심사 기반 모임을 찾아 주세요',
      '타협하는 연습을 도와주세요',
    ],
  },
  balanced: {
    patterns: [
      '대체로 무난한 관계를 맺어요',
      '특별히 갈등이 적은 편이에요',
      '주도보다 조율 역할을 할 수 있어요',
    ],
    parentTips: ['주도적 경험도 시도해 보게 격려해 주세요'],
  },
};

const ROUTINE_GUIDES: Record<PrimaryType, string[]> = {
  explorer: [
    '큰 활동 전에 미리 예고해 주기',
    '전환 5분 전 안내하기',
    '실내에서도 움직일 수 있는 짧은 루틴 넣기',
    '배고픔/피곤 신호 빨리 챙기기',
  ],
  socializer: [
    '사회적 활동 후 쉬는 시간 갖기',
    '혼자 놀기 시간 별도 배정하기',
    '감정 대화 시간 만들기',
  ],
  observer: [
    '자극을 줄인 환경 만들기',
    '예측 가능한 일정 유지하기',
    '감각 불편 최소화하기',
    '새로운 상황 사전 안내하기',
  ],
  concentrator: [
    '몰입 시간 보장하기',
    '전환 사전 예고하기',
    '완료 경험 쌓기',
    '관심사 시간 확보하기',
  ],
  balanced: [
    '일관된 생활 리듬 유지하기',
    '다양한 활동 경험하기',
    '아이 선택 기회 확대하기',
  ],
};

const PARENT_ADVICE: Record<PrimaryType, string[]> = {
  explorer: [
    "이 아이는 '통제'보다 '리듬'이 중요할 수 있어요.",
    '먼저 진정시키고, 그다음 가르쳐 주세요.',
    '장점을 문제처럼 보지 않도록 해석의 방향을 바꿔보세요.',
  ],
  socializer: [
    '관계 속에서 배우는 아이예요. 함께하는 시간을 충분히 주세요.',
    '거절당했을 때 감정을 먼저 받아주세요.',
    '혼자 있는 시간도 편안하게 느낄 수 있도록 도와주세요.',
  ],
  observer: [
    '이 아이에게는 안전감이 가장 큰 자양분이에요.',
    '표현이 적다고 괜찮은 게 아닐 수 있어요.',
    '아이의 속도를 존중하면 용기가 자랍니다.',
  ],
  concentrator: [
    '몰입의 흐름을 존중해 주세요. 그게 이 아이의 강점이에요.',
    '관심 없는 것에도 흥미를 찾을 수 있게 연결해 주세요.',
    '완벽하지 않아도 괜찮다는 경험이 필요합니다.',
  ],
  balanced: [
    '무난한 게 이 아이의 강점이에요.',
    '다양한 경험 속에서 반짝이는 순간을 관찰해 주세요.',
    '선택할 기회를 자주 주면 선호가 더 잘 드러나요.',
  ],
};

interface CombinationInsight {
  dimensions: [DimensionKey, DimensionKey];
  label: string;
  description: string;
}

const COMBINATION_INSIGHTS: CombinationInsight[] = [
  {
    dimensions: ['activity', 'persistence'],
    label: '활동성 높음 + 집중 낮음',
    description:
      '에너지는 높지만 활동 전환이 잦을 수 있음. 짧은 단위의 다양한 활동이 효과적.',
  },
  {
    dimensions: ['sensitivity', 'emotional_intensity'],
    label: '민감성 높음 + 감정 강도 높음',
    description:
      '작은 자극에도 감정 반응이 크게 나타날 수 있음. 안정적 환경과 충분한 공감 필요.',
  },
  {
    dimensions: ['sociability', 'adaptability'],
    label: '사회성 높음 + 적응성 높음',
    description:
      '새로운 관계와 환경에 비교적 유연한 편. 다양한 경험 제공이 효과적.',
  },
  {
    dimensions: ['persistence', 'sociability'],
    label: '집중 높음 + 사회성 낮음',
    description:
      '혼자 몰입하는 활동에서 강점이 큼. 자기만의 공간과 시간 보장 필요.',
  },
  {
    dimensions: ['activity', 'emotional_intensity'],
    label: '활동성 높음 + 감정 강도 높음',
    description: '즐거움도 속상함도 크게 표현. 충분한 움직임과 짧은 공감 필요.',
  },
  {
    dimensions: ['sensitivity', 'persistence'],
    label: '민감성 높음 + 집중 높음',
    description:
      '세심하게 관찰하고 깊게 몰입. 조용하고 안정적인 환경에서 강점 발휘.',
  },
];

function findCombinationInsight(scores: Scores) {
  for (const insight of COMBINATION_INSIGHTS) {
    const [d1, d2] = insight.dimensions;
    const l1 = scores[d1].level;
    const l2 = scores[d2].level;
    const matched =
      (l1 === 'high' && l2 === 'low') ||
      (l1 === 'high' && l2 === 'high') ||
      (l1 === 'low' && l2 === 'high');
    if (matched) {
      return {
        dimensions: insight.dimensions as string[],
        label: insight.label,
        description: insight.description,
      };
    }
  }
  return null;
}

const CLOSING_MESSAGE =
  '기질에는 좋은 것도 나쁜 것도 없어요. 중요한 것은 아이를 바꾸는 것이 아니라, 아이에게 맞는 방식으로 이해하고 도와주는 것입니다.';

export function buildSummary(
  primaryType: PrimaryType,
  primaryTypeLabel: string,
  emotionModifier: boolean,
) {
  const free = FREE_CONTENT[primaryType];
  return {
    primaryType,
    primaryTypeLabel,
    emotionModifier,
    title: free.title,
    description: free.description,
  };
}

export function buildFreeContent(_scores: Scores) {
  // 무료 영역은 대표 유형 기준 고정 콘텐츠를 사용한다.
  // 호출부에서 primaryType을 알기 어려우므로 service에서 summary와 함께 매핑하는 것이 더 깔끔하지만,
  // 기존 시그니처 유지를 위해 service가 summary를 통해 접근하도록 구조를 유지한다.
  return {
    strengths: [] as string[],
    tip: '',
  };
}

export function buildFreeContentByType(primaryType: PrimaryType) {
  const free = FREE_CONTENT[primaryType];
  return {
    strengths: free.strengths,
    tip: free.tip,
  };
}

export function buildPaidContent(scores: Scores, primaryType: PrimaryType) {
  const dimensionDetails: Record<
    string,
    {
      score: number;
      level: Level;
      description: string;
      parentTips: string[];
    }
  > = {};
  for (const dim of DIMENSIONS) {
    const s = scores[dim.key];
    const detail = DIMENSION_DETAILS[dim.key][s.level];
    dimensionDetails[dim.key] = {
      score: s.score,
      level: s.level,
      description: detail.description,
      parentTips: detail.parentTips,
    };
  }

  return {
    typeDetail: PAID_TYPE_DETAIL[primaryType],
    dimensionDetails,
    strengths: PAID_STRENGTHS[primaryType],
    cautions: PAID_CAUTIONS[primaryType],
    emotionCoaching: EMOTION_COACHING[primaryType],
    learningStyle: LEARNING_STYLES[primaryType],
    socialGuide: SOCIAL_GUIDES[primaryType],
    routineGuide: ROUTINE_GUIDES[primaryType],
    combinationInsight: findCombinationInsight(scores),
    parentAdvice: PARENT_ADVICE[primaryType],
    closingMessage: CLOSING_MESSAGE,
  };
}

export const LOCKED_SECTIONS = [
  '우리 아이의 숨은 강점 3가지',
  '감정이 흔들릴 때 필요한 부모 대응법',
  '아이에게 잘 맞는 학습 방식',
  '기질별 주의 포인트',
  '부모가 놓치기 쉬운 신호',
];
