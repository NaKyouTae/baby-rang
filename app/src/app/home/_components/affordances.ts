import { BEHAVIORS, type Affordance, type BehaviorId } from './babySprite';

/**
 * 아이템 쓰임새 — 아기가 이 아이템으로 무엇을 할 수 있는지.
 * 어드민에서 아이템마다 정한 값을 쓰고, 정하지 않은 아이템은 분류로 짐작한다.
 * 공·보행기는 분류로 알 수 없어 반드시 어드민에서 정해야 한다.
 * 방(PixelScreen)과 꾸미기 시트(아기 반응 미리보기)가 같은 판정을 쓴다.
 */
const CATEGORY_AFFORDANCE: Partial<Record<string, Affordance[]>> = {
  FURNITURE: ['hold'],
  BED: ['hold', 'bed'],
  RUG: ['soft'],
  TOY: ['play'],
};
const AFFORDANCE_OF: Record<string, Affordance> = {
  HOLD: 'hold',
  SOFT_FLOOR: 'soft',
  BALL: 'ball',
  PUSH_WALKER: 'walker',
  PLAY: 'play',
  SLEEP: 'bed',
  SEAT: 'seat',
  SLIDE: 'slide',
};

export function affordancesOf(item: { affordances?: string[]; category: string }): Affordance[] {
  if (item.affordances?.length) return item.affordances.map((a) => AFFORDANCE_OF[a]).filter(Boolean);
  return CATEGORY_AFFORDANCE[item.category] ?? [];
}

/** 꾸미기 시트 아이템 칸(50px) 아래에 붙이는 한 줄 — "놓으면 아기가 이렇게 놀아요". 칸에 들어가게 다섯 글자 이내. */
const LABEL: Record<Affordance, string> = {
  hold: '잡고 서요',
  soft: '뒹굴뒹굴',
  play: '두드려요',
  ball: '공놀이',
  walker: '밀며 걷기',
  bed: '쿨쿨 자요',
  seat: '앉아요',
  slide: '미끄럼',
};

/** 쓰임새마다 보여 줄 아기 행동 — 개월수에 맞는 것을 고른다(공은 굴리기 → 쫓아가기 → 차기처럼 자라며 바뀐다). */
function behaviorFor(aff: Affordance, months: number): BehaviorId {
  switch (aff) {
    case 'hold':
      return months >= 9 ? 'cruise' : 'pullStand';
    case 'soft':
      return months < 1 ? 'lying' : months < 5 ? 'tummy' : 'sit';
    case 'play':
      return 'toyPlay';
    case 'ball':
      return months < 11 ? 'ballRoll' : months < 17 ? 'ballChase' : 'ballKick';
    case 'walker':
      return 'pushWalker';
    case 'bed':
      return 'sleep';
    case 'seat':
      return 'chairSit';
    case 'slide':
      return 'slide';
  }
}

export type ItemPreview = {
  behavior: BehaviorId;
  label: string;
  /** 지금 개월수에 할 수 있는가. 아직이면 몇 개월부터인지 */
  ready: boolean;
  from: number;
};

/**
 * 아이템을 놓았을 때 아기가 보일 반응. 쓰임새가 없는 장식이면 null.
 * 쓰임새가 여럿이면(침대: 붙잡기·자기) 지금 할 수 있는 것을 먼저, 그다음 목록 뒤쪽(대표 쓰임새)을 고른다.
 */
export function itemPreview(item: { affordances?: string[]; category: string }, months: number): ItemPreview | null {
  const affs = affordancesOf(item);
  if (!affs.length) return null;
  const options = affs.map((aff) => {
    const behavior = behaviorFor(aff, months);
    const b = BEHAVIORS.find((x) => x.id === behavior)!;
    return { behavior, label: LABEL[aff], ready: months >= b.from, from: b.from };
  });
  const ready = options.filter((o) => o.ready);
  return (ready.length ? ready : options)[(ready.length ? ready : options).length - 1];
}
