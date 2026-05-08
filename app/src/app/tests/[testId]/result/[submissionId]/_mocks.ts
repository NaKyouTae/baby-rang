// 디자인 작업용 mock. 운영 배포 전 import와 함께 제거하세요.
import type { TestResult, PaidContent } from '@/lib/api';

type PrimaryType =
  | 'explorer'
  | 'socializer'
  | 'observer'
  | 'concentrator'
  | 'balanced';

const TYPE_LABELS: Record<PrimaryType, string> = {
  explorer: '탐험가형',
  socializer: '사교가형',
  observer: '관찰자형',
  concentrator: '집중가형',
  balanced: '균형성장형',
};

const TYPE_FOCUS: Record<PrimaryType, string | null> = {
  explorer: 'activity',
  socializer: 'sociability',
  observer: 'sensitivity',
  concentrator: 'persistence',
  balanced: null,
};

const TYPE_FREE: Record<
  PrimaryType,
  { title: string; description: string; strengths: string[]; tip: string }
> = {
  explorer: {
    title: '우리 아이는 몸으로 배우는\n탐험가형 기질이 강해요',
    description:
      '에너지가 높고 새로운 활동에 흥미를 보일 가능성이 큽니다. 직접 해보고 움직이며 경험할 때 장점이 잘 살아날 수 있어요.',
    strengths: [
      '새로운 활동을 즐길 가능성이 커요.',
      '몸으로 배우는 경험에서 강점이 보여요.',
      '호기심이 풍부하고 도전을 즐겨요.',
    ],
    tip: '짧고 활동적인 경험을 자주 제공해 주세요.',
  },
  socializer: {
    title: '우리 아기는 사람 속에서 힘을 얻는 사교가형 기질이 보여요.',
    description:
      '함께 놀고 이야기하는 상황에서 더 활발해질 수 있어요. 관계 속에서 즐거움과 동기를 얻는 아기일 가능성이 큽니다.',
    strengths: [
      '친화력이 좋은 편이에요.',
      '관계를 형성하는 능력이 돋보여요.',
      '감정 표현이 풍부해 교감이 활발해요.',
    ],
    tip: '혼자 하는 활동과 함께하는 활동의 균형을 잡아 주세요.',
  },
  observer: {
    title: '우리 아기는 작은 변화도 잘 느끼는 관찰자형 기질이 있어요.',
    description:
      '감각과 분위기에 민감하고 세심하게 반응하는 편일 수 있어요. 조용해 보여도 내면에서는 많은 정보를 받아들이고 있을 수 있습니다.',
    strengths: [
      '섬세함이 돋보이는 편이에요.',
      '분위기를 잘 파악하는 능력이 있어요.',
      '관찰력이 깊고 세밀해요.',
    ],
    tip: '자극이 많은 환경에서는 쉬는 시간을 충분히 주세요.',
  },
  concentrator: {
    title: '우리 아기는 하나에 깊게 몰입하는 집중가형 기질이 보여요.',
    description:
      '관심 있는 활동에는 오래 집중하고 꾸준히 이어갈 가능성이 큽니다. 자기만의 속도와 몰입의 흐름이 중요한 아기일 수 있어요.',
    strengths: [
      '몰입력이 뛰어난 편이에요.',
      '끈기 있게 이어가는 힘이 보여요.',
      '자기 주도적인 모습이 있어요.',
    ],
    tip: '몰입을 방해하지 않도록 전환 전에 미리 예고해 주세요.',
  },
  balanced: {
    title: '우리 아기는 전반적으로 고르게 발달한 균형성장형 기질이 보여요.',
    description:
      '특정 한쪽으로 강하게 치우치기보다 상황에 따라 비교적 유연하게 반응할 가능성이 큽니다. 안정적이고 무난한 모습 속에도 고유한 특성이 숨어 있을 수 있어요.',
    strengths: [
      '유연하게 대처하는 힘이 있어요.',
      '안정감 있는 반응이 돋보여요.',
      '다양한 환경에서 잘 적응해요.',
    ],
    tip: '겉으로 무난해 보여도 아기만의 선호와 민감 포인트를 세심하게 관찰해 주세요.',
  },
};

const TYPE_PAID_DETAIL: Record<PrimaryType, string> = {
  explorer:
    '이 아기는 에너지와 호기심이 비교적 높은 편이며, 직접 움직이고 경험하는 과정에서 즐거움을 느낄 가능성이 큽니다. 머리로 오래 듣기보다 몸으로 해보는 과정에서 더 빠르게 익히고 흥미를 보일 수 있어요.',
  socializer:
    '사람과 함께 있을 때 더 밝아지고 살아나는 아기입니다. 대화, 협동, 상호작용에서 강점을 보이며, 관계 속에서 동기와 즐거움을 얻을 가능성이 큽니다.',
  observer:
    '작은 차이도 놓치지 않고 세심하게 받아들이는 아기입니다. 겉으로는 조용해 보여도 내면의 감각과 관찰은 매우 풍부할 수 있습니다.',
  concentrator:
    '자신이 관심 있는 것에 오래 몰입하며 차근차근 해내는 아기입니다. 꾸준함과 완성도가 강점이 될 수 있으며, 자기만의 리듬을 존중받을 때 더 안정적으로 성장합니다.',
  balanced:
    '한쪽으로 강하게 치우치기보다 전체적으로 고르게 발달한 아기입니다. 상황에 맞춰 조절하는 힘이 상대적으로 안정적일 수 있으며, 다양한 환경에 무난하게 적응할 가능성이 있습니다.',
};

const DIMENSION_LABEL: Record<string, string> = {
  activity: '활동성',
  adaptability: '적응성',
  emotional_intensity: '감정 표현 강도',
  sociability: '사회성',
  persistence: '집중 지속성',
  sensitivity: '민감성',
};

function buildScores(type: PrimaryType): TestResult['scores'] {
  const focus = TYPE_FOCUS[type];
  const result = {} as TestResult['scores'];
  for (const key of Object.keys(DIMENSION_LABEL)) {
    const isFocus = key === focus;
    const score = isFocus ? 85 : 55;
    result[key] = {
      raw: Math.round((score / 100) * 20) + 5,
      score,
      level: isFocus ? 'high' : 'medium',
      label: DIMENSION_LABEL[key],
    };
  }
  return result;
}

function buildPaidContent(type: PrimaryType): PaidContent {
  return {
    typeDetail: TYPE_PAID_DETAIL[type],
    dimensionDetails: {
      activity: {
        score: 65,
        level: 'medium',
        description:
          '하루 동안 적당한 활동량을 보이며, 놀이와 휴식의 균형을 잘 잡아요.',
        parentTips: [
          '실외 산책을 하루 1회 이상 함께해 주세요.',
          '자유 놀이 시간을 충분히 보장해 주세요.',
        ],
      },
      adaptability: {
        score: 45,
        level: 'medium',
        description: '새로운 상황에 천천히 적응하는 편이에요.',
        parentTips: ['변화 전 미리 알려 주세요.', '익숙한 물건을 함께 가져가요.'],
      },
      emotional_intensity: {
        score: 80,
        level: 'high',
        description: '감정 표현이 풍부하고 강도가 큰 편이에요.',
        parentTips: ['감정을 말로 읽어 주세요.', '진정 루틴을 만들어 주세요.'],
      },
      sociability: {
        score: 85,
        level: 'high',
        description: '사람과 어울리는 걸 좋아하고 표정으로 마음을 잘 전해요.',
        parentTips: ['또래와 만나는 기회를 자주 만들어 주세요.', '아기의 페이스를 존중해 주세요.'],
      },
      persistence: {
        score: 35,
        level: 'low',
        description: '한 가지에 오래 집중하기보다는 여러 자극을 탐색해요.',
        parentTips: ['짧은 활동을 자주 바꿔 주세요.', '성공 경험을 작게 자주 만들어 주세요.'],
      },
      sensitivity: {
        score: 55,
        level: 'medium',
        description: '환경 자극에 보통 정도로 반응해요.',
        parentTips: ['수면 환경을 일정하게 유지해 주세요.', '갑작스런 큰 소리를 줄여 주세요.'],
      },
    },
    strengths: [
      { title: '사회적 신호 읽기', description: '표정과 목소리 톤을 빠르게 알아차려요.' },
      { title: '빠른 회복력', description: '울음에서 진정으로 비교적 빠르게 전환할 수 있어요.' },
    ],
    cautions: [
      { title: '과흥분 주의', description: '자극이 많을 때 진정 시간이 길어질 수 있어요.' },
      { title: '집중력 분산', description: '여러 자극이 동시에 있을 때 산만해질 수 있어요.' },
    ],
    emotionCoaching: {
      title: '감정 코칭이 필요한 순간',
      tips: [
        { action: '감정 라벨링', example: '"속상했구나"라고 짧게 읽어 주세요.' },
        { action: '진정 루틴', example: '안기 → 부드러운 토닥임 → 익숙한 노래' },
      ],
    },
    learningStyle: {
      recommended: ['사람과 함께하는 놀이', '소리·노래 자극', '간단한 모방 놀이'],
      difficult: ['혼자 오래 집중해야 하는 활동', '강한 시각 자극이 많은 환경'],
    },
    socialGuide: {
      patterns: ['먼저 다가가는 경향', '눈맞춤이 길고 미소가 풍부함'],
      parentTips: [
        '처음 만나는 사람과는 부모 옆에서 안전감을 확보한 후 상호작용해 주세요.',
        '아기의 거절 표현도 존중해 주세요.',
      ],
    },
    routineGuide: [
      '아침 루틴: 햇볕 산책 10분',
      '오후 루틴: 짧은 또래 만남',
      '저녁 루틴: 조용한 책 읽기로 자극 강도 낮추기',
    ],
    combinationInsight: {
      dimensions: ['sociability', 'emotional_intensity'],
      label: '풍부한 사회·정서 조합',
      description:
        '사람과의 교감에서 큰 만족을 얻지만, 감정의 진폭이 커서 정서 안정 루틴이 특히 중요해요.',
    },
    parentAdvice: [
      '아기의 강점을 인정해 주세요.',
      '하루 자극의 총량을 의식적으로 조절해 주세요.',
    ],
    closingMessage: '오늘도 아기와 함께 하루를 잘 보내고 계신 부모님을 응원합니다.',
  };
}

function buildMock(
  type: PrimaryType,
  opts: { paid?: boolean; reliable?: boolean } = {},
): TestResult {
  const { paid = false, reliable = true } = opts;
  const free = TYPE_FREE[type];
  return {
    resultId: `mock-${type}-${paid ? 'paid' : 'free'}${reliable ? '' : '-unreliable'}`,
    isPaid: paid,
    isReliable: reliable,
    reliabilityMsg: reliable
      ? null
      : '응답이 한쪽으로 치우쳐 있어 결과 신뢰도가 낮을 수 있어요. 시간이 지난 후 다시 검사해 보시는 걸 추천드려요.',
    summary: {
      primaryType: type,
      primaryTypeLabel: TYPE_LABELS[type],
      emotionModifier: false,
      title: free.title,
      description: free.description,
    },
    scores: buildScores(type),
    freeContent: {
      strengths: free.strengths,
      tip: free.tip,
    },
    lockedSections: [
      '상세한 기질 유형 분석',
      '6가지 차원별 깊이 있는 해석',
      '강점을 길러 주는 양육 가이드',
      '감정 코칭 체크리스트',
    ],
    ...(paid ? { paidContent: buildPaidContent(type) } : {}),
  };
}

export function getMockResult(key: string | null): TestResult | null {
  if (!key) return null;

  // 신뢰도 낮음(어떤 타입이든 unreliable 플래그만 켜기) — 기본은 socializer
  if (key === 'unreliable') {
    return buildMock('socializer', { paid: false, reliable: false });
  }

  // <type>-<state> 형태: explorer-free, socializer-paid 등
  const [type, state] = key.split('-') as [PrimaryType, 'free' | 'paid' | undefined];
  if (type in TYPE_LABELS) {
    if (state === 'paid') return buildMock(type, { paid: true });
    return buildMock(type, { paid: false }); // free 또는 미지정
  }

  // 하위 호환: free / paid 만 입력 시 socializer 기준
  if (key === 'free') return buildMock('socializer', { paid: false });
  if (key === 'paid') return buildMock('socializer', { paid: true });

  return null;
}
