/**
 * 관절 기반 픽셀 아기 — 행동 모델링 미리보기.
 *
 * 앱 홈의 pixelSprite 는 팔다리를 세운 타원 하나로 그려서 무릎·팔꿈치가 없다.
 * 그래서 기는 모습이 아기가 아니라 네 발 짐승처럼 읽혔다.
 * 여기서는 어깨→팔꿈치→손목, 엉덩이→무릎→발목 관절 좌표를 프레임마다 정하고
 * 그 사이를 굵기가 변하는 캡슐로 잇는다. 땅을 짚는 손발은 IK 로 관절을 푼다.
 *
 * 그림체는 스타듀밸리풍이다. 머리는 손으로 찍은 픽셀 그림(SD_HEADS)을 도장처럼 찍고,
 * 몸은 관절 엔진이 그린 캡슐을 방과 같은 굵은 픽셀·스타듀 팔레트(유색 외곽선, 색조를 비튼 명암)로 칠한다.
 * 다른 파일을 import 하지 않는다. node 로 바로 돌려 PNG 로 검수할 수 있게 하려는 것이다.
 *
 * 앱 홈(app/src/app/home/_components/babySprite.ts)과 같은 파일이다. 한쪽을 고치면 다른 쪽에도 그대로 복사한다.
 */

export type Gender = 'female' | 'male';
export type Facing = 'down' | 'up' | 'side';
/**
 * r 은 논리 픽셀 한 칸을 몇 칸으로 쪼개 그리는지(해상도 배율). 좌표·크기는 늘 논리 픽셀로 다루고
 * 칠할 때만 r 배 촘촘한 격자에 찍는다. 아기는 RES 로 그린다(지금은 1 — 방과 같은 굵은 픽셀).
 */
export type Buf = { data: Uint8ClampedArray; w: number; h: number; r?: number };

export const W = 48;
export const H = 44;
/** 스프라이트 안에서 아기 발밑 기준점. 방에 세울 때 (x - CX, y - G) 에 그린다. */
export const CX = 24;
export const G = 39;

// ───────────────────────── 행동 정의 ─────────────────────────

export type BehaviorId =
  | 'lying'
  | 'tummy'
  | 'sit'
  | 'crawl'
  | 'pullStand'
  | 'cruise'
  | 'toddle'
  | 'plop'
  | 'walk'
  | 'run'
  | 'jump'
  | 'ballRoll'
  | 'ballChase'
  | 'ballKick'
  | 'pushWalker'
  | 'toyPlay'
  | 'sleep'
  | 'jamjam'
  | 'manse'
  | 'doridori'
  | 'gonji'
  | 'merong'
  | 'chairSit'
  | 'slide';

/**
 * 아이템 쓰임새. 방에 놓인 아이템이 아기에게 무엇을 할 수 있게 해 주는지.
 *   hold   붙잡고 설 수 있다(서랍장·소파·아기침대)
 *   soft   푹신한 바닥(러그·놀이매트) — 누워 있기·엎드리기·앉기를 그 위에서 한다
 *   ball   공
 *   walker 밀고 걷는 보행기
 *   play   앉아서 갖고 노는 장난감(블록·오뚝이)
 *   bed    누워 잘 수 있는 침대(아기침대·범퍼침대)
 *   seat   올라앉을 수 있다(소파·의자)
 *   slide  사다리로 올라가 타고 내려오는 미끄럼틀
 */
export type Affordance = 'hold' | 'soft' | 'ball' | 'walker' | 'play' | 'bed' | 'seat' | 'slide';

export type Behavior = {
  id: BehaviorId;
  label: string;
  /** 행동이 나타나기 시작하는 개월 */
  from: number;
  /** 홈에서 이 행동을 그만 보여줘도 되는 개월. 24 는 그 뒤로도 계속된다는 뜻이다. */
  to: number;
  /** 가장 흔히 시작하는 개월(WHO 운동발달 중앙값 기준) */
  typical: number;
  facings: Facing[];
  frames: number;
  fps: number;
  /** 홈에서 방을 돌아다니는 행동인지 */
  roams: boolean;
  /**
   * 비율 곡선 [시작, 가장 흔해지는 개월, 줄기 시작하는 개월, 끝].
   * 새 행동은 처음엔 가끔 나오다 늘고, 다음 행동이 나오면 서서히 줄어든다.
   */
  curve: [number, number, number, number];
  /** 가장 흔한 구간에서의 상대 비중 */
  weight: number;
  /** 이 쓰임새의 아이템이 방에 있어야만 하는 행동 */
  needs?: Affordance;
  /** 이 쓰임새의 아이템이 있으면 더 자주, 그 위에서 하는 행동 */
  boost?: Affordance;
  note: string;
};

export const BEHAVIORS: Behavior[] = [
  { id: 'lying', label: '누워서 버둥', from: 0, to: 4, typical: 0, facings: ['down'], frames: 8, fps: 8, roams: false, curve: [0, 0, 2, 4], weight: 1, boost: 'soft',
    note: '팔은 W, 다리는 M 자로 굽힌 신생아 자세. 다리를 번갈아 차고 손을 흔든다.' },
  { id: 'tummy', label: '엎드려 고개 들기', from: 1, to: 5, typical: 3, facings: ['side'], frames: 8, fps: 6, roams: false, curve: [1, 2, 4, 5], weight: 0.8, boost: 'soft',
    note: '팔꿈치로 상체를 받치고 고개를 든다. 힘이 들어 고개가 오르내린다.' },
  { id: 'sit', label: '앉기', from: 5, to: 14, typical: 6, facings: ['down', 'side'], frames: 8, fps: 6, roams: false, curve: [5, 7, 9, 14], weight: 0.8, boost: 'soft',
    note: '다리를 V 자로 펴고 앉아 손뼉을 친다(짝짜꿍). 걷기 시작한 뒤에도 쉬는 자세로 남는다. WHO 혼자 앉기 3.8~9.2개월.' },
  { id: 'crawl', label: '네 발 기기', from: 6, to: 13, typical: 8, facings: ['side', 'down', 'up'], frames: 8, fps: 8, roams: true, curve: [6, 8, 10, 13], weight: 1.2,
    note: '손바닥과 무릎으로 짚고 정강이는 바닥에 눕힌다. 대각선(왼손·오른무릎)이 같이 나간다. WHO 5.2~13.5개월.' },
  { id: 'pullStand', label: '잡고 서기', from: 7, to: 12, typical: 8, facings: ['side', 'down', 'up'], frames: 8, fps: 6, roams: false, curve: [7, 8, 10, 12], weight: 0.7, needs: 'hold',
    note: '가구를 붙잡고 서서 무릎으로 콩콩 반동을 준다. WHO 4.8~11.4개월.' },
  { id: 'cruise', label: '잡고 걷기', from: 8, to: 14, typical: 9, facings: ['up', 'down', 'side'], frames: 8, fps: 6, roams: true, curve: [8, 9.5, 11.5, 14], weight: 0.7, needs: 'hold',
    note: '가구를 붙잡은 채 옆으로 게걸음. 홈에서는 가구 옆에서만 나온다. WHO 5.9~13.7개월.' },
  { id: 'toddle', label: '아장아장 걷기', from: 9, to: 19, typical: 12, facings: ['side', 'down', 'up'], frames: 8, fps: 8, roams: true, curve: [9, 13, 15, 19], weight: 1.2,
    note: '다리를 넓게 벌리고 무릎을 굽힌 채, 팔은 어깨 위로 들어 균형을 잡는다(하이가드). WHO 혼자 걷기 8.2~17.6개월.' },
  { id: 'plop', label: '털썩 앉기', from: 11, to: 20, typical: 12, facings: ['down', 'side'], frames: 12, fps: 8, roams: false, curve: [11, 12, 17, 20], weight: 0.35,
    note: '걷다가 균형을 잃고 엉덩이로 털썩 주저앉는다. 아장아장 시기 사이사이에 섞는다.' },
  { id: 'walk', label: '걷기', from: 14, to: 24, typical: 16, facings: ['side', 'down', 'up'], frames: 8, fps: 8, roams: true, curve: [14, 18, 24, 24], weight: 1.0,
    note: '보폭이 좁아지고 팔을 내려 다리와 반대로 흔든다.' },
  { id: 'run', label: '뛰기', from: 17, to: 24, typical: 20, facings: ['side', 'down', 'up'], frames: 8, fps: 12, roams: true, curve: [17, 21, 24, 24], weight: 0.6,
    note: '몸을 앞으로 기울이고 팔꿈치를 굽혀 크게 흔든다. 두 발이 잠깐 뜬다.' },
  { id: 'jump', label: '제자리 점프', from: 22, to: 24, typical: 24, facings: ['down', 'side'], frames: 12, fps: 10, roams: false, curve: [22, 24, 24, 24], weight: 0.3,
    note: '웅크렸다가 팔을 올리며 두 발로 뛴다. 24개월 무렵 나오는 대근육 발달 지표.' },
  { id: 'sleep', label: '침대에서 자기', from: 0, to: 24, typical: 0, facings: ['down'], frames: 16, fps: 4, roams: false, curve: [0, 0, 24, 24], weight: 0.5, needs: 'bed',
    note: '침대에 누워 이불을 덮고 새근새근 잔다. 가슴이 천천히 오르내리고 Z 가 떠오른다. 밤에는 더 자주 잔다.' },
  { id: 'toyPlay', label: '장난감 놀기', from: 6, to: 24, typical: 8, facings: ['side', 'down'], frames: 8, fps: 6, roams: false, curve: [6, 8, 24, 24], weight: 0.6, needs: 'play',
    note: '장난감 옆에 앉아 두 손으로 번갈아 두드리며 논다. 장난감이 있어야 나온다.' },
  { id: 'ballRoll', label: '공 굴리기', from: 8, to: 14, typical: 9, facings: ['down', 'side'], frames: 8, fps: 6, roams: false, curve: [8, 9, 12, 14], weight: 0.7, needs: 'ball',
    note: '앉아서 두 손으로 공을 앞으로 밀었다 당긴다. 공이 있어야 나온다.' },
  { id: 'ballChase', label: '공 쫓아가기', from: 11, to: 18, typical: 13, facings: ['side', 'down', 'up'], frames: 8, fps: 8, roams: false, curve: [11, 13, 16, 18], weight: 0.6, needs: 'ball',
    note: '굴러간 공까지 아장아장 가서 쪼그려 앉아 손으로 툭 민다. 공이 굴러가면 또 쫓아간다.' },
  { id: 'ballKick', label: '공 차기', from: 17, to: 24, typical: 20, facings: ['side', 'down', 'up'], frames: 8, fps: 10, roams: false, curve: [17, 20, 24, 24], weight: 0.6, needs: 'ball',
    note: '공 뒤로 다가가 한 발로 디디고 다른 발로 찬다. 18~24개월 대근육 발달 지표.' },
  { id: 'jamjam', label: '잼잼', from: 6, to: 15, typical: 8, facings: ['down', 'side'], frames: 8, fps: 6, roams: false, curve: [6, 8, 11, 15], weight: 0.35,
    note: '앉아서 두 손을 얼굴 앞에 들고 주먹을 쥐었다 폈다 한다. 어른 손짓을 따라 하는 놀이로 7~9개월에 가장 많이 한다.' },
  { id: 'manse', label: '만세', from: 8, to: 24, typical: 10, facings: ['down', 'side'], frames: 8, fps: 6, roams: false, curve: [8, 10, 18, 24], weight: 0.3,
    note: '두 팔을 머리 위로 번쩍 들었다 내린다. 걷기 전(12개월 전)에는 앉아서, 걷기 시작하면 서서 한다. 9~12개월에 "만세" 말을 알아듣고 따라 한다.' },
  { id: 'doridori', label: '도리도리', from: 5, to: 14, typical: 7, facings: ['down'], frames: 8, fps: 8, roams: false, curve: [5, 7, 10, 14], weight: 0.35,
    note: '앉아서 고개를 좌우로 도리도리 젓는다. 목을 가누고 앉기 시작할 무렵 가장 먼저 따라 하는 손유희다.' },
  { id: 'gonji', label: '곤지곤지', from: 7, to: 15, typical: 9, facings: ['down'], frames: 8, fps: 6, roams: false, curve: [7, 9, 12, 15], weight: 0.3,
    note: '앉아서 한 손을 펴고, 다른 손 검지로 손바닥을 콕콕 찍는다. 손가락을 따로 쓰기 시작하는 9개월 무렵부터 한다.' },
  { id: 'merong', label: '메롱', from: 10, to: 24, typical: 14, facings: ['down', 'side'], frames: 8, fps: 6, roams: false, curve: [10, 14, 24, 24], weight: 0.25,
    note: '쪽쪽이를 빼고 혀를 쏙 내밀며 장난스럽게 웃는다. 걷기 전에는 앉아서, 걷기 시작하면 서서 한다.' },
  { id: 'chairSit', label: '의자에 앉기', from: 12, to: 24, typical: 15, facings: ['down', 'side'], frames: 8, fps: 4, roams: false, curve: [12, 15, 24, 24], weight: 0.6, needs: 'seat',
    note: '의자·소파 앞까지 가서 기어올라 앉는다. 다리를 늘어뜨리고 발을 번갈아 달랑거린다. 혼자 의자에 기어오르기는 12~18개월.' },
  { id: 'slide', label: '미끄럼틀 타기', from: 15, to: 24, typical: 20, facings: ['side', 'up'], frames: 8, fps: 8, roams: false, curve: [15, 20, 24, 24], weight: 0.7, needs: 'slide',
    note: '사다리로 가서 뒷모습으로 오른 뒤, 꼭대기에 앉아 두 팔을 들고 미끄러져 내려온다. 내려오면 다시 사다리로 간다. 낮은 미끄럼틀은 18개월 무렵부터 혼자 탄다. (뒷모습=사다리 오르기, 옆모습=타고 내려오기)' },
  { id: 'pushWalker', label: '보행기 밀기', from: 9, to: 16, typical: 10, facings: ['side', 'down', 'up'], frames: 8, fps: 8, roams: true, curve: [9, 10, 13, 16], weight: 1.0, needs: 'walker',
    note: '카트형 보행기 손잡이를 잡고 밀며 걷는다. 혼자 걷기 직전에 가장 많이 쓴다.' },
];

/**
 * 개월수별 행동 비율(합 1). 사다리꼴 곡선 — 시작점에서 8% 로 시작해 가장 흔한 구간까지 늘고,
 * 줄기 시작하면 끝 개월에 8% 까지 내려간다. 끝이 24 인 행동은 줄지 않는다.
 * 똑같은 확률로 고르면 9개월 아기가 5번에 1번 혼자 걷게 되는데, 실제로는 5% 안팎이다.
 */
export function behaviorWeights(months: number): { id: BehaviorId; w: number }[] {
  const raw = BEHAVIORS.map((b) => {
    const [a, p0, p1, z] = b.curve;
    let f = 0;
    if (months >= a && months <= z) {
      if (months < p0) f = 0.08 + (0.92 * (months - a)) / (p0 - a);
      else if (months <= p1 || z === p1) f = 1;
      else f = 1 - (0.92 * (months - p1)) / (z - p1);
    }
    return { id: b.id, w: f * b.weight };
  }).filter((x) => x.w > 0);
  const sum = raw.reduce((t, x) => t + x.w, 0) || 1;
  return raw.map((x) => ({ id: x.id, w: x.w / sum }));
}

/** 가중치대로 하나 고른다. exclude 는 지금 할 수 없는 행동(예: 방에 가구가 없으면 잡고 서기). */
export function pickBehavior(months: number, rand = Math.random, exclude: BehaviorId[] = []): BehaviorId {
  let ws = behaviorWeights(months).filter((x) => !exclude.includes(x.id));
  if (ws.length === 0) ws = behaviorWeights(months);
  const sum = ws.reduce((t, x) => t + x.w, 0);
  ws = ws.map((x) => ({ id: x.id, w: x.w / sum }));
  let r = rand();
  for (const x of ws) {
    r -= x.w;
    if (r <= 0) return x.id;
  }
  return ws[ws.length - 1].id;
}

// ───────────────────────── 픽셀 프리미티브 ─────────────────────────

type P = [number, number];

/**
 * 아기 스프라이트의 해상도 배율. 스타듀풍은 방과 같은 굵은 픽셀이 그림체라 1 이다.
 * 아기만 더 촘촘하게 그리고 싶어지면 이 값을 올리면 된다(캔버스·위치 계산은 이미 이 값을 따른다).
 */
export const RES = 1;

/** w·h 는 논리 크기. 실제 버퍼는 r 배다. */
export function makeBuf(w = W, h = H, r = 1): Buf {
  return { data: new Uint8ClampedArray(w * r * h * r * 4), w: w * r, h: h * r, r };
}

/** 외곽선 두께(논리 픽셀). 촘촘하게 그릴 때는 가는 한 줄이 되도록 줄인다. */
const lineOf = (buf: Buf) => ((buf.r ?? 1) > 1 ? 0.45 : 0.9);

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    v = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    rgbCache.set(hex, v);
  }
  return v;
}

/** 논리 픽셀 하나 — 촘촘한 격자에서는 r×r 칸을 칠한다. */
function px(buf: Buf, x: number, y: number, hex: string, alpha = 255) {
  const r = buf.r ?? 1;
  const x0 = Math.round(x * r);
  const y0 = Math.round(y * r);
  for (let yy = 0; yy < r; yy++) for (let xx = 0; xx < r; xx++) dot(buf, x0 + xx, y0 + yy, hex, alpha);
}

/** 버퍼 픽셀 하나. 반투명은 아래 픽셀과 섞는다 — 덮어쓰면 그림자 자리에 구멍이 난다. */
function dot(buf: Buf, xi: number, yi: number, hex: string, alpha = 255) {
  if (xi < 0 || yi < 0 || xi >= buf.w || yi >= buf.h) return;
  const i = (yi * buf.w + xi) * 4;
  const [r, g, b] = rgb(hex);
  if (alpha >= 255) {
    buf.data[i] = r;
    buf.data[i + 1] = g;
    buf.data[i + 2] = b;
    buf.data[i + 3] = 255;
    return;
  }
  const sa = alpha / 255;
  const da = buf.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  const k = (da * (1 - sa)) / oa;
  const j = sa / oa;
  buf.data[i] = r * j + buf.data[i] * k;
  buf.data[i + 1] = g * j + buf.data[i + 1] * k;
  buf.data[i + 2] = b * j + buf.data[i + 2] * k;
  buf.data[i + 3] = oa * 255;
}

function rect(buf: Buf, x: number, y: number, w: number, h: number, hex: string) {
  const r = buf.r ?? 1;
  for (let yy = Math.round(y) * r; yy < Math.round(y + h) * r; yy++) {
    for (let xx = Math.round(x) * r; xx < Math.round(x + w) * r; xx++) dot(buf, xx, yy, hex);
  }
}

function ell(buf: Buf, cx: number, cy: number, rx: number, ry: number, hex: string, alpha = 255) {
  if (rx <= 0 || ry <= 0) return;
  const s = buf.r ?? 1;
  for (let y = Math.floor((cy - ry) * s); y <= Math.ceil((cy + ry) * s); y++) {
    for (let x = Math.floor((cx - rx) * s); x <= Math.ceil((cx + rx) * s); x++) {
      const dx = ((x + 0.5) / s - cx) / rx;
      const dy = ((y + 0.5) / s - cy) / ry;
      if (dx * dx + dy * dy <= 1) dot(buf, x, y, hex, alpha);
    }
  }
}

function ellO(buf: Buf, cx: number, cy: number, rx: number, ry: number, fill: string, line: string) {
  const o = lineOf(buf);
  ell(buf, cx, cy, rx + o, ry + o, line);
  ell(buf, cx, cy, rx, ry, fill);
}

/** a 에서 b 로 굵기가 ra→rb 로 변하는 캡슐. 허벅지처럼 위가 통통한 팔다리를 만든다. */
function taper(buf: Buf, a: P, b: P, ra: number, rb: number, hex: string) {
  if (ra <= 0 && rb <= 0) return;
  const r = Math.max(ra, rb);
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const ll = vx * vx + vy * vy || 1e-6;
  const s = buf.r ?? 1;
  for (let y = Math.floor((Math.min(a[1], b[1]) - r - 1) * s); y <= Math.ceil((Math.max(a[1], b[1]) + r + 1) * s); y++) {
    for (let x = Math.floor((Math.min(a[0], b[0]) - r - 1) * s); x <= Math.ceil((Math.max(a[0], b[0]) + r + 1) * s); x++) {
      const qx = (x + 0.5) / s - a[0];
      const qy = (y + 0.5) / s - a[1];
      const t = Math.min(1, Math.max(0, (qx * vx + qy * vy) / ll));
      const dx = qx - vx * t;
      const dy = qy - vy * t;
      const rr = ra + (rb - ra) * t;
      if (rr > 0 && dx * dx + dy * dy <= rr * rr) dot(buf, x, y, hex);
    }
  }
}

// ───────────────────────── 벡터 ─────────────────────────

/** y 가 아래로 커지는 화면 좌표의 각도(도). 0=오른쪽, 90=아래, -90=위. */
function pol(p: P, deg: number, len: number): P {
  const r = (deg * Math.PI) / 180;
  return [p[0] + Math.cos(r) * len, p[1] + Math.sin(r) * len];
}
const add = (p: P, x: number, y: number): P => [p[0] + x, p[1] + y];
const mix = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function dir(a: P, b: P): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/**
 * 2관절 IK. root 에서 target 까지 l1, l2 두 마디로 닿게 하고 [관절, 끝점] 을 돌려준다.
 * bend -1 은 진행 방향 기준 시계 반대쪽(오른쪽을 보는 다리면 무릎이 앞으로), +1 은 반대.
 */
function ik(root: P, target: P, l1: number, l2: number, bend: 1 | -1): [P, P] {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a + bend * A;
  const joint: P = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
  const u = dir(joint, target);
  return [joint, [joint[0] + u[0] * l2, joint[1] + u[1] * l2]];
}

// ───────────────────────── 색 ─────────────────────────

/**
 * 스타듀밸리풍 팔레트. 외곽선은 검정이 아니라 재질마다 가장 어두운 색,
 * 그늘은 붉은·보라 쪽, 빛은 노란 쪽으로 색조를 비틀었다.
 */
const C = {
  skin: '#F8C9A2',
  skinDark: '#E39B7B',
  skinLine: '#8E4B3A',
  white: '#FFFFFF',
  shadow: '#7A6246',
  wood: '#D6A878',
  woodDark: '#B4865A',
  woodTop: '#EBC79B',
  woodLine: '#6E4A2C',
} as const;

type Pal = { suit: string; suitDark: string; suitLine: string; belly: string };

/** 성별로 바뀌는 건 외형뿐이다. 발달 시기는 WHO 자료에서 성별 차이가 거의 없다. */
const PAL: Record<Gender, Pal> = {
  male: { suit: '#82B4E6', suitDark: '#5B7FC4', suitLine: '#2F3F7A', belly: '#B4DCF7' },
  female: { suit: '#F5A9C4', suitDark: '#D8799E', suitLine: '#7A2F55', belly: '#FCD3E2' },
};

type Tone = { light: string; dark: string; line: string };
const SKIN: Tone = { light: C.skin, dark: C.skinDark, line: C.skinLine };
const SKIN_FAR: Tone = { light: C.skinDark, dark: C.skinDark, line: C.skinLine };
/**
 * 기본 옷은 나시 바디슈트다 — 몸통만 옷이고 팔·다리·발은 맨살.
 * 옷을 따로 추가할 때는 이 두 톤(팔다리)과 suit(몸통)를 옷마다 바꾸면 된다.
 */
const LIMB = SKIN;
const LIMB_FAR = SKIN_FAR;
const suit = (p: Pal): Tone => ({ light: p.suit, dark: p.suitDark, line: p.suitLine });

// ───────────────────────── 체형 ─────────────────────────

type M = ReturnType<typeof metrics>;

/**
 * 개월수에 따라 몸통과 다리가 길어진다.
 * 머리는 손픽셀 그림(가로 16·세로 13) 한 장이라 크기가 고정이고, 몸·팔다리는 그 머리에 맞춰 짧게 둔다.
 */
function metrics(months: number) {
  const t = Math.min(Math.max(months / 24, 0), 1);
  const L = (a: number, b: number) => a + (b - a) * t;
  return {
    headR: 6.6,
    torso: L(4.1, 5.9),
    bodyR: L(4.6, 4.3),
    chestR: L(3.7, 3.4),
    thigh: L(2.6, 4.0),
    shin: L(2.3, 3.7),
    foot: L(1.6, 2.2),
    ua: L(2.4, 3.3),
    fa: L(2.0, 2.8),
    rTh: L(2.15, 1.95),
    rKn: L(1.6, 1.5),
    rAn: 1.3,
    rUa: 1.45,
    rWr: 1.2,
    neck: L(0.6, 1.6),
  };
}

// ───────────────────────── 부위 ─────────────────────────

type Ctx = {
  buf: Buf; m: M; pal: Pal; gender: Gender; months: number; blink: boolean;
  /** 앞/뒤 잡기 자세의 가구 좌우 x. 방 미리보기는 방에 놓인 가구 자리를 스프라이트 좌표로 바꿔 넘긴다. */
  cabX?: [number, number];
  /** 소품(가구)을 그리지 않는다. 홈은 사용자가 놓은 진짜 가구를 잡는다. */
  noProps?: boolean;
  /** 자는 Z 를 그리지 않는다 — 침대에서는 그림을 돌리므로 Z 는 돌린 뒤 따로 그린다 */
  noSnore?: boolean;
  /** 기록 반응용 표정(앞모습만). happy 는 웃는 눈(^^), sleepy 는 반쯤 감긴 눈. */
  face?: 'happy' | 'sleepy';
  /** 배불러 빵빵한 볼(앞모습만) */
  chubby?: boolean;
  /** 기록 반응용 입(앞모습만). 주지 않으면 쪽쪽이. 먹고 마실 때는 쪽쪽이를 뺀다. */
  mouth?: 'none' | 'open' | 'smile' | 'tongue' | 'merong';
  /** 도리도리 — 몸은 그대로 두고 머리만 돌린다. front 정면, back 뒤통수, left·right 옆얼굴. */
  headTurn?: 'front' | 'back' | 'left' | 'right';
  /** 눈물 한 방울(앞모습만) */
  tear?: boolean;
};

/** 여러 마디를 한 덩어리로 그린다. 외곽선→그늘→빛 순서로 마디 전체를 칠해야 관절에 금이 안 간다. */
/** 밝은 면을 안쪽으로 [밀기, 줄이기]. 픽셀이 굵어 그늘은 한 칸만 남긴다. */
const inset = (): [number, number] => [-0.3, -0.4];

function limb(buf: Buf, pts: P[], rads: number[], tone: Tone) {
  const o = lineOf(buf);
  const [sh, sr] = inset();
  for (let i = 0; i < pts.length - 1; i++) taper(buf, pts[i], pts[i + 1], rads[i] + o, rads[i + 1] + o, tone.line);
  for (let i = 0; i < pts.length - 1; i++) taper(buf, pts[i], pts[i + 1], rads[i], rads[i + 1], tone.dark);
  for (let i = 0; i < pts.length - 1; i++) {
    taper(buf, add(pts[i], sh, sh), add(pts[i + 1], sh, sh), rads[i] + sr, rads[i + 1] + sr, tone.light);
  }
}

function blob(buf: Buf, c: P, rx: number, ry: number, tone: Tone) {
  const [sh, sr] = inset();
  ellO(buf, c[0], c[1], rx, ry, tone.dark, tone.line);
  ell(buf, c[0] + sh, c[1] + sh, rx + sr, ry + sr, tone.light);
}

/** hand — open 은 손가락을 부채꼴로 편 손, fist 는 꼭 쥔 주먹(잼잼). 주지 않으면 보통 손. */
function arm(k: Ctx, sh: P, el: P, wr: P, far = false, hand?: 'open' | 'fist' | 'point', fingerDeg?: number) {
  limb(k.buf, [sh, el, wr], [k.m.rUa, k.m.rUa - 0.1, k.m.rWr], far ? LIMB_FAR : LIMB);
  const d = dir(el, wr);
  const tone = far ? SKIN_FAR : SKIN;
  if (hand === 'open') {
    // 픽셀이 굵어 손가락 다섯 개는 뭉개진다. 네 갈래를 부채꼴로 벌려 주먹보다 확실히 커 보이게 한다.
    const c = add(wr, d[0] * 1.2, d[1] * 1.2);
    const base = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    for (const deg of [-75, -25, 25, 75]) limb(k.buf, [c, pol(c, base + deg, 2.7)], [0.45, 0.35], tone);
    blob(k.buf, c, 1.8, 1.7, tone);
    return;
  }
  if (hand === 'point') {
    // 곤지곤지 — 주먹에서 검지 하나만 뻗는다
    const c = add(wr, d[0] * 0.5, d[1] * 0.5);
    const deg = fingerDeg ?? (Math.atan2(d[1], d[0]) * 180) / Math.PI;
    limb(k.buf, [c, pol(c, deg, 2.2)], [0.45, 0.35], tone);
    blob(k.buf, c, 1.05, 1.0, tone);
    return;
  }
  if (hand === 'fist') {
    blob(k.buf, add(wr, d[0] * 0.5, d[1] * 0.5), 0.95, 0.9, tone);
    return;
  }
  blob(k.buf, add(wr, d[0] * 0.9, d[1] * 0.9), 1.45, 1.35, tone);
}

/**
 * toe 를 주면 옆모습 발(캡슐), 없으면 앞/뒷모습 발(타원).
 * 앞모습은 발끝이 이쪽으로 나와 아래로 내려오고, 뒷모습은 발뒤꿈치와 발바닥 밑면이 보인다.
 */
function leg(k: Ctx, hip: P, knee: P, ankle: P, toe: P | null, far = false, facing: Facing = 'side') {
  limb(k.buf, [hip, knee, ankle], [k.m.rTh, k.m.rKn, k.m.rAn], far ? LIMB_FAR : LIMB);
  // 맨발
  const foot = far ? SKIN_FAR : SKIN;
  if (toe) {
    limb(k.buf, [ankle, toe], [1.4, 1.25], foot);
  } else if (facing === 'up') {
    blob(k.buf, add(ankle, 0, 0.2), 1.7, 1.2, foot);
    ell(k.buf, ankle[0], ankle[1] + 1.1, 1.3, 0.6, C.skinLine);
  } else {
    blob(k.buf, add(ankle, 0, 0.8), 1.9, 1.4, foot);
    ell(k.buf, ankle[0], ankle[1] - 0.2, 1.2, 0.5, C.skinDark);
  }
}

/** 정면 발바닥 — 앉은 다리, 뒤로 기는 다리처럼 발바닥이 이쪽을 볼 때. */
function sole(k: Ctx, at: P) {
  blob(k.buf, at, 1.4, 1.8, SKIN);
}

/** slim 은 옆모습 두께 비율. 엎드린 자세에서 배가 바닥까지 처지면 허벅지가 묻힌다. */
function torso(k: Ctx, hip: P, chest: P, facing: Facing, slim = 1) {
  const { buf, m, pal } = k;
  limb(buf, [hip, chest], [m.bodyR * slim, m.chestR * slim], suit(pal));
  if (facing === 'side') {
    // 옆모습은 기저귀 엉덩이가 등 쪽(왼쪽 위)으로 볼록하다
    const a = dir(hip, chest);
    const n: P = a[1] - a[0] < 0 ? [a[1], -a[0]] : [-a[1], a[0]];
    const r = m.bodyR * slim * 0.72;
    blob(buf, add(hip, n[0] * 1.3 - a[0] * 0.8, n[1] * 1.3 - a[1] * 0.8), r, r * 0.9, suit(pal));
    return;
  }
  if (facing === 'up') {
    // 뒷모습 — 통통한 기저귀 엉덩이 두 쪽, 가운데 골, 뒷목 깃은 어둡게
    for (const s of [-1, 1]) {
      ell(buf, hip[0] + s * 1.8, hip[1] + 1.6, 2.3, 1.9, pal.suitDark);
      ell(buf, hip[0] + s * 1.8 - 0.4, hip[1] + 1.1, 1.7, 1.3, pal.suit);
    }
    for (let d = 0; d < 3; d++) px(buf, hip[0], hip[1] + 0.6 + d, pal.suitLine);
    ell(buf, chest[0], chest[1] - m.chestR * 0.5, m.chestR * 0.6, 0.8, pal.suitDark);
    return;
  }
  // 앞모습 — 배 패치와 똑딱단추, 밝은 앞깃
  ell(buf, hip[0], hip[1] + m.bodyR * 0.45, m.bodyR * 0.75, 0.9, pal.suitDark);
  const belly = mix(hip, chest, 0.42);
  ell(buf, belly[0], belly[1], m.bodyR * 0.55, m.bodyR * 0.62, pal.belly);
  px(buf, chest[0], chest[1] + 0.6, pal.suitLine);
  ell(buf, chest[0], chest[1] - m.chestR * 0.45, m.chestR * 0.7, 1.0, C.white);
}

function neck(k: Ctx, chest: P, head: P) {
  const p = mix(chest, head, 0.42);
  ellO(k.buf, p[0], p[1], 1.8, 1.4 + k.m.neck * 0.5, C.skin, C.skinLine);
  ell(k.buf, p[0], p[1] + 0.5, 1.4, 0.6, C.skinDark);
}

function shadow(k: Ctx, x: number, rx: number, y = G) {
  ell(k.buf, x, y + 1.6, rx, 1.6, C.shadow, 60);
}

/** 서 있는 몸통 위에 머리를 얹을 자리 */
function headOn(k: Ctx, chest: P, leanDeg: number): P {
  return pol(chest, -90 + leanDeg, k.m.chestR * 0.55 + k.m.neck + k.m.headR * 0.82);
}

// ───────────────────────── 머리 ─────────────────────────

/**
 * 손픽셀 머리. 글자 하나가 픽셀 하나다(방 픽셀 기준).
 *   K h H L 머리카락(외곽·그늘·바탕·광택) · k s S 피부(외곽·그늘·바탕) · E 눈 · P 볼 · Y y w 쪽쪽이(바탕·테두리·광택)
 * 쪽쪽이는 노랑으로 고정이다(앞·옆모습). 턱 아래로 고리가 한 줄 내려온다.
 * 여아는 모든 개월에 분홍 머리띠(HEADBAND)를 하고, 옷 색(분홍)으로도 구분한다.
 * 외곽선은 검정이 아니라 재질마다 가장 어두운 색, 그늘은 붉은 쪽·빛은 노란 쪽으로 색조를 비틀었다.
 */
const SD_HEADS: Record<Facing, string[]> = {
  down: [
    '.....KKKKKK.....',
    '...KKHHLLHHKK...',
    '..KHHLLHHHHHhK..',
    '.KHHLHHHHHHHhhK.',
    '.KHHHHHHHHHHhhK.',
    '.KhHHhHHHhHHhhK.',
    '.KhShhSHhSShhhK.',
    '.kSSSSSSSSSSShk.',
    '.kSSESSSSSESSsk.',
    'ksSSESSSSSESSssk',
    '.kSPSSyyyySPSsk.',
    '..kSSyYwYYySsk..',
    '...kkyYYYYykk...',
    '......yyyy......',
  ],
  side: [
    '....KKKKKKK.....',
    '..KKHHLLLHHKK...',
    '.KHHLLHHHHHHhK..',
    '.KHLHHHHHHHHHhK.',
    'KHHHHHHHHHHHHhK.',
    'KHHHHHHHHhHHhhhK',
    'KhHHHHHhShhSShhK',
    'KhHHHkSSSSSSSSSk',
    'KhHHksSSSSSSESk.',
    'KhhHksSSSSSSESk.',
    '.KhhkkSSSSSPyyy.',
    '..KhhkSSSSSyYwYy',
    '...KKkksSSSyYYYy',
    '...........yyy..',
  ],
  up: [
    '.....KKKKKK.....',
    '...KKHHLLHHKK...',
    '..KHHLLHHHHHhK..',
    '.KHHLHHHHHHHhhK.',
    '.KHHHHHHHHHHhhK.',
    '.KHHHHhHHHHhhhK.',
    '.KHHhHHHHhHHhhK.',
    '.KhHHHhHHHHhhhK.',
    '.KhHhHHHhHHhhhK.',
    'ksKhhHHhHHhhhKsk',
    '.kKhhhhhhhhhhKk.',
    '..kKKhhhhhhKKk..',
    '...kkSSSSSSkk...',
  ],
};
const SD_COLOR: Record<string, string> = {
  K: '#3A1E17', h: '#5E3424', H: '#8A5634', L: '#B98250',
  k: '#8E4B3A', s: '#E39B7B', S: '#F8C9A2',
  E: '#2B1A1D', P: '#F28B86',
  Y: '#FFCF3A', y: '#E2881A', w: '#FFF4B8',
  O: '#FF8FB1', o: '#D9668C',
  T: '#7FC8F0',
};
/** 머리 그림에서 얼굴 가운데(엔진이 주는 머리 중심에 맞출 점) */
const SD_HEAD_C: Record<Facing, P> = { down: [7.5, 7], side: [8.5, 7], up: [7.5, 7] };

/**
 * 여아 머리띠 [x, y, 글자] — 머리 그림 위에 덮어 찍는다. 모든 개월에 단다.
 * 정수리를 가로지르는 분홍 띠(O)이고 오른쪽은 진한 분홍 그늘(o)이다. 옆모습은 정수리에서 귀 뒤로 내려온다.
 */
const HEADBAND: Record<Facing, [number, number, string][]> = {
  down: [[5, 2, 'O'], [6, 2, 'O'], [7, 2, 'O'], [8, 2, 'O'], [9, 2, 'O'], [10, 2, 'o'], [3, 3, 'O'], [4, 3, 'O'], [11, 3, 'o'], [12, 3, 'o'], [2, 4, 'O'], [13, 4, 'o'], [1, 5, 'O'], [14, 5, 'o']],
  side: [[8, 0, 'O'], [9, 0, 'O'], [8, 1, 'O'], [8, 2, 'O'], [7, 3, 'O'], [7, 4, 'O'], [6, 5, 'o'], [6, 6, 'o']],
  up: [[5, 2, 'O'], [6, 2, 'O'], [7, 2, 'O'], [8, 2, 'O'], [9, 2, 'O'], [10, 2, 'o'], [3, 3, 'O'], [4, 3, 'O'], [11, 3, 'o'], [12, 3, 'o'], [2, 4, 'O'], [13, 4, 'o'], [1, 5, 'O'], [14, 5, 'o']],
};

function head(k: Ctx, c: P, body: Facing) {
  // 도리도리는 머리 그림만 다른 방향 것으로 바꾼다. 왼쪽 옆얼굴은 오른쪽 것을 뒤집는다.
  const t = k.headTurn;
  const facing: Facing = !t ? body : t === 'front' ? 'down' : t === 'back' ? 'up' : 'side';
  const flip = t === 'left';
  const map = SD_HEADS[facing].map((row) => row.split(''));
  if (k.gender === 'female') for (const [x, y, ch] of HEADBAND[facing]) map[y][x] = ch;
  // 눈 감기 — 위 칸은 피부, 아래 칸은 감은 눈 선
  if (k.blink) {
    for (let y = 0; y < map.length - 1; y++) {
      for (let x = 0; x < 16; x++) {
        if (map[y][x] === 'E' && map[y + 1][x] === 'E') {
          map[y][x] = 'S';
          map[y + 1][x] = 'k';
        }
      }
    }
  }
  if (facing === 'down') faceDown(k, map);
  if (facing === 'side') faceSide(k, map);
  const last = map[0].length - 1;
  const cx = SD_HEAD_C[facing][0];
  const left = Math.round(c[0] - (flip ? last - cx : cx));
  const top = Math.round(c[1] - SD_HEAD_C[facing][1]);
  map.forEach((row, y) =>
    row.forEach((ch, x) => ch !== '.' && px(k.buf, left + (flip ? last - x : x), top + y, SD_COLOR[ch])),
  );
}

/** 옆모습 표정 — 졸린 눈, 쪽쪽이 뺀 입(옆얼굴 턱선을 새로 찍는다). 눈은 x 12 의 8~9줄. */
function faceSide(k: Ctx, map: string[][]) {
  if (k.face === 'sleepy') map[8][12] = 'S';
  if (!k.mouth) return;
  for (const y of [10, 11, 12]) for (let x = 11; x < 16; x++) map[y][x] = '.';
  map[13] = map[13].map(() => '.');
  map[10][11] = 'P';
  map[10][12] = 'S';
  map[10][13] = 'S';
  map[10][14] = 'k';
  map[11][11] = 'S';
  map[11][12] = 'S';
  map[11][13] = k.mouth === 'open' || k.mouth === 'merong' ? 'E' : 'k';
  if (k.mouth === 'merong') {
    // 벌린 입 앞으로 혀가 두 칸 나온다
    map[11][14] = 'O';
    map[11][15] = 'O';
    map[12][14] = 'O';
    map[12][15] = 'o';
  }
  map[12][11] = 'k';
  map[12][12] = 'k';
}

/** 앞모습 표정 — 웃는 눈, 쪽쪽이 뺀 입, 눈물. 눈은 x 4·10 의 8~9줄, 입은 x 7~8 의 11줄이다. */
function faceDown(k: Ctx, map: string[][]) {
  if (k.face === 'happy') {
    for (const ex of [4, 10]) {
      map[9][ex] = 'S';
      map[9][ex - 1] = 'E';
      map[9][ex + 1] = 'E';
    }
  }
  if (k.face === 'sleepy') {
    for (const ex of [4, 10]) map[8][ex] = 'S';
  }
  if (k.chubby) {
    // 볼이 양옆으로 한 칸씩 부풀고 볼터치가 커진다
    map[10][0] = 'k';
    map[10][1] = 'S';
    map[10][15] = 'k';
    map[10][14] = 'S';
    map[9][3] = 'P';
    map[9][12] = 'P';
  }
  if (k.mouth) {
    for (const y of [10, 11]) for (let x = 0; x < 16; x++) if ('yYw'.includes(map[y][x])) map[y][x] = 'S';
    for (let x = 0; x < 16; x++) if ('yYw'.includes(map[12][x])) map[12][x] = 'k';
    map[13] = map[13].map(() => '.');
    const dots: [number, number, string][] =
      k.mouth === 'open' ? [[7, 10, 'k'], [8, 10, 'k'], [7, 11, 'E'], [8, 11, 'E']]
        : k.mouth === 'smile' ? [[6, 10, 'k'], [7, 11, 'k'], [8, 11, 'k'], [9, 10, 'k']]
          : k.mouth === 'tongue' ? [[7, 11, 'k'], [8, 11, 'k'], [7, 12, 'O'], [8, 12, 'O']]
          : k.mouth === 'merong'
            ? [[6, 10, 'k'], [7, 10, 'E'], [8, 10, 'E'], [9, 10, 'k'], [6, 11, 'k'], [7, 11, 'O'], [8, 11, 'O'], [9, 11, 'k'],
              [6, 12, 'k'], [7, 12, 'O'], [8, 12, 'O'], [9, 12, 'k'], [7, 13, 'o'], [8, 13, 'o']]
          : [[7, 11, 'k'], [8, 11, 'k']];
    for (const [x, y, ch] of dots) map[y][x] = ch;
  }
  if (k.tear) {
    map[10][4] = 'T';
    map[11][4] = 'T';
  }
}

// ───────────────────────── 가구 소품 ─────────────────────────

function cabinet(buf: Buf, x0: number, x1: number, top: number, bottom: number) {
  rect(buf, x0 - 1, top - 1, x1 - x0 + 2, bottom - top + 2, C.woodLine);
  rect(buf, x0, top, x1 - x0, bottom - top, C.wood);
  rect(buf, x0, top, x1 - x0, 3, C.woodTop);
  rect(buf, x0, top + 3, x1 - x0, 1, C.woodDark);
  rect(buf, x1 - 2, top + 4, 2, bottom - top - 4, C.woodDark);
  // 서랍 손잡이
  const mid = Math.round((x0 + x1) / 2);
  rect(buf, mid - 1, top + Math.round((bottom - top) * 0.55), 3, 1, C.woodLine);
}

// ───────────────────────── 자세 ─────────────────────────

/** 신생아 — 톱다운으로 본 누운 아기. 팔은 W, 다리는 M(개구리 다리). */
/** sleeping 이면 침대에서 자는 모습 — 팔다리를 늘어뜨리고 이불을 덮고, 숨 쉴 때마다 가슴이 오르내린다. */
function lying(k: Ctx, ph: number, sleeping = false) {
  const { m } = k;
  const breath = sleeping ? Math.sin(ph) * 0.5 : 0;
  const chest: P = [CX, G - 18 + breath];
  const hip: P = [CX, G - 18 + m.torso + 1.5];
  // 침대 매트리스 위라 바닥 그림자는 없다
  if (!sleeping) ell(k.buf, CX, G - 14, 11, 9, C.shadow, 44);

  for (const s of [-1, 1]) {
    const kick = sleeping ? 0.6 : Math.max(0, Math.sin(ph + (s > 0 ? 0 : Math.PI)));
    const hj: P = [CX + s * 2.1, hip[1] + 1.4];
    const knee = add(hj, s * (3.4 - 1.6 * kick), 2.3 + 1.4 * kick);
    const ankle = add(knee, s * (-1.7 + 1.9 * kick), 2.6 + 1.0 * kick);
    leg(k, hj, knee, ankle, null);
  }
  torso(k, hip, chest, 'down');
  const hc: P = [CX, chest[1] - m.chestR * 0.5 - m.headR * 0.8];
  neck(k, chest, hc);
  head(k, hc, 'down');
  if (sleeping) blanket(k, chest[1] + 2.5, hip[1] + m.thigh + m.shin + 1);
  for (const s of [-1, 1]) {
    const sh: P = [CX + s * (m.chestR - 0.2), chest[1] + 0.6];
    if (sleeping) {
      // 자는 아기는 두 팔을 이불 위에 내려놓고 움직이지 않는다
      const el = add(sh, s * 2.2, 2.4);
      arm(k, sh, el, add(el, -s * 0.4, 2.6));
      continue;
    }
    const wave = Math.sin(ph * 2 + (s > 0 ? 0 : 1.7)) * 0.8;
    const el = add(sh, s * 3.0, 1.8);
    arm(k, sh, el, add(el, s * 0.6, -3.0 + wave));
  }
  if (sleeping && !k.noSnore) snore(k, ph, [CX + m.headR + 1, chest[1] - m.chestR * 0.5 - m.headR * 1.8 - 2]);
}

/** 이불 — 가슴 아래부터 발끝까지 덮는다. 아래 가장자리는 둥글게. */
function blanket(k: Ctx, top: number, bottom: number) {
  const { buf } = k;
  const half = 7.5;
  for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
    const edge = y > bottom - 2 ? 1 : 0;
    rect(buf, CX - half - 1 + edge, y, half * 2 + 2 - edge * 2, 1, '#C79C3E');
    if (y > top && y < bottom) rect(buf, CX - half + edge, y, half * 2 - edge * 2, 1, '#FFE7A3');
  }
  // 접힌 윗단과 체크 무늬
  rect(buf, CX - half, top + 1, half * 2, 2, '#FFF4D2');
  for (let y = top + 5; y < bottom - 2; y += 4) rect(buf, CX - half + 1, y, half * 2 - 2, 1, '#F4CF72');
}

/** 자는 Z — 머리 위로 천천히 떠오르며 흐려진다. 둘이 어긋나게 올라간다. */
function snore(k: Ctx, ph: number, at: P) {
  // 3×3 Z 글자. 작은 쪽은 더 옅게 그린다.
  const Z: P[] = [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]];
  const z = (x: number, y: number, a: number, big: boolean) => {
    for (const [dx, dy] of Z) px(k.buf, x + dx, y + dy, '#6E7FA8', big ? a : a * 0.6);
  };
  for (const [off, big] of [[0, true], [Math.PI, false]] as const) {
    const t = (((ph + off) / (Math.PI * 2)) % 1 + 1) % 1;
    z(at[0] + t * 3, at[1] - t * 6, Math.round(255 * (1 - t)), big);
  }
}

/** 엎드려 고개 들기 — 옆모습, 오른쪽을 본다. */
function tummy(k: Ctx, ph: number) {
  const { m } = k;
  const lift = 0.8 + 0.8 * Math.sin(ph);
  const hip: P = [CX - 7, G - 3.4];
  const chest: P = [hip[0] + m.torso + 3.2, G - 4.8 - lift * 0.4];
  shadow(k, CX - 2, 13);

  const legOf = (far: boolean, kick: number) => {
    const hj = add(hip, far ? 0.8 : 0, far ? -0.7 : 0);
    const knee: P = [hj[0] - m.thigh, G - 2.1 + (far ? -0.6 : 0)];
    const ankle = pol(knee, 180 + 45 * kick, m.shin);
    leg(k, hj, knee, ankle, pol(ankle, 200 + 50 * kick, m.foot * 0.8), far);
  };
  const armOf = (far: boolean) => {
    const sh = add(chest, far ? 0.8 : 0, far ? -0.6 : 0.4);
    const el: P = [sh[0] + 0.6, G - 1.5];
    arm(k, sh, el, [el[0] + m.fa + 0.4, G - 1.5], far);
  };

  armOf(true);
  legOf(true, Math.max(0, Math.sin(ph + Math.PI)));
  torso(k, hip, chest, 'side');
  legOf(false, Math.max(0, Math.sin(ph)));
  armOf(false);
  const hc: P = [chest[0] + m.headR * 0.55, chest[1] - m.headR * 0.7 - lift];
  neck(k, chest, hc);
  head(k, hc, 'side');
}

/**
 * 만세·잼잼 팔. 머리가 커서 원래 팔 길이로는 손이 머리 위로 못 나온다 — 이 두 동작만 팔을 늘려 그린다.
 * s 는 앞/뒷모습의 좌우(-1·1), 옆모습은 0. up 은 만세 팔 높이 0~1.
 */
function raisedArm(k: Ctx, sh: P, s: -1 | 0 | 1, kind: 'manse' | 'jamjam', up: number, grip: 'open' | 'fist', far = false) {
  const ua = k.m.ua * 1.3;
  const fa = k.m.fa * 1.35;
  const mirror = (deg: number) => (s < 0 ? 180 - deg : deg);
  let a: number;
  let b: number;
  if (s === 0) {
    // 옆 — 만세는 앞으로 내린 팔이 앞을 지나 위로, 잼잼은 손을 얼굴 앞에 세운다
    a = kind === 'manse' ? 65 - 145 * up : 20;
    b = kind === 'manse' ? a - 15 * up : -75;
  } else {
    // 앞/뒤 — 만세는 옆으로 내린 팔이 머리 옆 V 자로, 잼잼은 팔꿈치를 옆으로 빼고 손을 세운다
    a = kind === 'manse' ? 80 - 100 * up : -8;
    b = kind === 'manse' ? 85 - 150 * up : -78;
  }
  const el = pol(sh, mirror(a), ua);
  const wr = pol(el, mirror(b), fa);
  arm(k, sh, el, wr, far, kind === 'jamjam' ? grip : up > 0.6 ? 'open' : undefined);
}

/** 앉기 */
/** hands — clap 짝짜꿍, push 공을 앞으로 밀기, tap 장난감 두드리기, jamjam 주먹 쥐었다 펴기, manse 두 팔 번쩍 */
type SitHands = 'clap' | 'push' | 'tap' | 'jamjam' | 'manse' | 'rest' | 'gonji';
function sit(k: Ctx, ph: number, facing: Facing, bounce = 0, hands: SitHands = 'clap') {
  const { m } = k;
  // 잼잼 — 한 바퀴에 두 번 쥐었다 편다. 위상을 1/8 밀어 편 손·주먹이 두 프레임씩 번갈아 나온다.
  const grip: 'open' | 'fist' = Math.sin(ph * 2 + Math.PI / 4) >= 0 ? 'open' : 'fist';
  // 만세 — 0 내린 팔 → 1 머리 위. 꼭대기에서 잠깐 멈추게 곡선을 눌러 준다.
  const up = Math.min(1, (0.5 - 0.5 * Math.cos(ph)) * 1.25);
  if (hands === 'manse') bounce -= 0.6 * up;
  // 곤지곤지 — 한 바퀴에 두 번 콕콕. 0 이면 손바닥에 닿아 있다.
  const poke = Math.max(0, Math.sin(ph * 2));
  if (facing === 'side') {
    const lean = 12 + 3 * Math.sin(ph);
    const hip: P = [CX - 4, G - 1 - m.bodyR * 0.75 + bounce];
    const chest = pol(hip, -90 + lean, m.torso);
    shadow(k, CX, 10);
    const legOf = (far: boolean) => {
      const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0.4);
      const knee: P = [hj[0] + m.thigh + 0.4, G - 2.6 + (far ? -0.6 : 0)];
      const ankle: P = [knee[0] + m.shin * 0.95, G - 1.5 + (far ? -0.6 : 0)];
      leg(k, hj, knee, ankle, pol(ankle, -75, m.foot), far);
    };
    const armOf = (far: boolean) => {
      const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
      let target: P = [chest[0] + 3.6 + 0.8 * Math.sin(ph), chest[1] + 4.2 - Math.cos(ph)];
      if (hands === 'push') target = [chest[0] + 3.6 + 1.8 * (0.5 - 0.5 * Math.cos(ph)), G - 3];
      if (hands === 'tap') {
        const lift = 1.8 * Math.max(0, Math.sin(ph + (far ? Math.PI : 0)));
        target = [chest[0] + 4.4 + (far ? 0.8 : 0), G - 2.4 - lift];
      }
      if (hands === 'manse' || hands === 'jamjam') {
        raisedArm(k, sh, 0, hands, up, grip, far);
        return;
      }
      if (hands === 'rest') target = [chest[0] + 3.4 + (far ? 0.6 : 0), G - 2.6];
      if (hands === 'gonji') {
        // 먼 손은 손바닥을 위로 펴 들고, 가까운 손 검지가 위에서 내려와 찍는다
        const palm: P = [chest[0] + 4.6, chest[1] + 3.2];
        if (far) {
          const [el, wr] = ik(sh, add(palm, -0.6, 0.6), m.ua, m.fa, 1);
          arm(k, sh, el, wr, true, 'open', -90);
        } else {
          const [el, wr] = ik(sh, add(palm, -0.8, -3.0 - 1.8 * poke), m.ua, m.fa, 1);
          arm(k, sh, el, wr, false, 'point', 75);
        }
        return;
      }
      const [el, wr] = ik(sh, target, m.ua, m.fa, 1);
      arm(k, sh, el, wr, far);
    };
    const raised = hands === 'manse' || hands === 'jamjam';
    armOf(true);
    legOf(true);
    torso(k, hip, chest, 'side');
    legOf(false);
    if (!raised) armOf(false);
    const hc = headOn(k, chest, lean);
    neck(k, chest, hc);
    head(k, hc, 'side');
    // 든 손은 얼굴 앞에 온다 — 머리 위에 그린다
    if (raised) armOf(false);
    return;
  }

  // 정면 — 다리를 V 자로 펴서 이쪽으로 내민다
  const hip: P = [CX, G - 3.4 + bounce];
  const chest: P = [CX + 0.5 * Math.sin(ph), hip[1] - m.torso];
  shadow(k, CX, 10);
  torso(k, hip, chest, 'down');
  for (const s of [-1, 1]) {
    const hj: P = [CX + s * 2.0, G - 2.4 + bounce];
    const knee: P = [CX + s * 4.5, G - 0.4];
    const ankle: P = [CX + s * 6.4, G + 1.2];
    limb(k.buf, [hj, knee, ankle], [m.rTh, m.rKn, m.rAn], LIMB);
    sole(k, add(ankle, s * 0.6, 0.6));
  }
  const hc = headOn(k, chest, 0);
  // 만세·잼잼은 손이 얼굴 높이까지 올라오므로 머리를 먼저 그리고 팔을 그 위에 올린다
  if (hands === 'manse' || hands === 'jamjam') {
    neck(k, chest, hc);
    head(k, hc, 'down');
    for (const s of [-1, 1]) {
      const sh: P = [chest[0] + s * (m.chestR - 0.2), chest[1] + 0.9];
      raisedArm(k, sh, s as -1 | 1, hands, up, grip);
    }
    return;
  }
  if (hands === 'gonji') {
    // 손이 몸통 위에서 엇갈리면 뭉개진다 — 한 손은 잼잼처럼 볼 옆에 펴 들고,
    // 반대 손이 가슴 앞을 가로질러 와서 검지로 그 손바닥을 아래에서 찍는다. 팔은 잼잼처럼 늘려 그린다.
    const ua = m.ua * 1.3;
    const fa = m.fa * 1.35;
    neck(k, chest, hc);
    head(k, hc, 'down');
    const shL: P = [chest[0] + (m.chestR - 0.2), chest[1] + 0.9];
    const elL = pol(shL, -8, ua);
    const wrL = pol(elL, -78, fa);
    arm(k, shL, elL, wrL, false, 'open');
    const d = dir(elL, wrL);
    const palm = add(wrL, d[0] * 1.2, d[1] * 1.2);
    const shR: P = [chest[0] - (m.chestR - 0.2), chest[1] + 0.9];
    const [elR, wrR] = ik(shR, add(palm, -3.0 - 1.4 * poke, 2.4 + 0.6 * poke), ua, fa, -1);
    arm(k, shR, elR, wrR, false, 'point', -40);
    return;
  }
  const open = 0.5 + 0.5 * Math.cos(ph * 2);
  const push = 0.5 - 0.5 * Math.cos(ph);
  for (const s of [-1, 1]) {
    const sh: P = [chest[0] + s * (m.chestR - 0.2), chest[1] + 0.9];
    let wr: P = [chest[0] + s * (0.9 + 2.8 * open), chest[1] + m.chestR + 2.6];
    // 공은 다리 사이에 있다 — 두 손을 모아 이쪽(아래)으로 민다
    if (hands === 'push') wr = [chest[0] + s * 1.7, chest[1] + m.chestR + 2.8 + 1.8 * push];
    if (hands === 'tap') {
      const lift = 1.8 * Math.max(0, Math.sin(ph + (s > 0 ? 0 : Math.PI)));
      wr = [chest[0] + s * 2.8, chest[1] + m.chestR + 3.4 - lift];
    }
    // 무릎 위에 손을 얹고 쉰다
    if (hands === 'rest') wr = [chest[0] + s * 3.6, chest[1] + m.chestR + 3.2];
    const [el, w] = ik(sh, wr, m.ua, m.fa, s > 0 ? -1 : 1);
    arm(k, sh, el, w);
  }
  neck(k, chest, hc);
  head(k, hc, 'down');
}

/** 네 발 기기 */
function crawl(k: Ctx, ph: number, facing: Facing) {
  const { m } = k;
  const bob = 0.5 * Math.sin(ph * 2);

  if (facing === 'side') {
    const hip: P = [CX - 7, G - 2 - m.thigh + bob * 0.5];
    const shY = G - 1.4 - (m.ua + m.fa) * 0.97 + bob;
    const chest: P = [hip[0] + m.torso + 1.2, shY - 0.5];
    shadow(k, CX - 1, 11);

    const legOf = (far: boolean, p: number) => {
      const hj = add(hip, far ? 0.8 : 0, far ? -0.8 : 0);
      const lift = Math.max(0, Math.cos(p)) * 1.1;
      const knee = add(pol(hj, 90 - 16 * Math.sin(p), m.thigh), 0, -lift);
      const ankle: P = [knee[0] - m.shin, knee[1] + 0.2 - lift * 0.4];
      leg(k, hj, knee, ankle, pol(ankle, 205, m.foot * 0.9), far);
    };
    const armOf = (far: boolean, p: number) => {
      const sh = add(chest, far ? 0.8 : 0, far ? -0.6 : 0.5);
      const lift = Math.max(0, Math.cos(p)) * 1.3;
      const target: P = [sh[0] + 1.0 + 2.0 * Math.sin(p), G - 1.5 - lift + (far ? -0.6 : 0)];
      const [el, wr] = ik(sh, target, m.ua, m.fa, 1);
      arm(k, sh, el, wr, far);
    };
    // 대각선이 같이 움직인다 — 가까운 다리와 먼 팔이 같은 위상
    armOf(true, ph);
    legOf(true, ph + Math.PI);
    torso(k, hip, chest, 'side', 0.74);
    legOf(false, ph);
    armOf(false, ph + Math.PI);
    const hc: P = [chest[0] + m.headR * 0.78, chest[1] - m.headR * 0.95 + bob * 0.5];
    neck(k, chest, hc);
    head(k, hc, 'side');
    return;
  }

  // 앞/뒤 기기는 깊이 방향 움직임을 화면 위아래로 바꾸고, 엉덩이를 좌우로 씰룩여 체중 이동을 보여준다
  const sway = 1.1 * Math.sin(ph);
  const wiggle = -1.4 * Math.sin(ph);
  const bobFB = 0.9 * Math.sin(ph * 2);
  const r = m.headR;
  if (facing === 'down') {
    // 이쪽으로 기어온다 — 머리가 앞에 낮게, 엉덩이는 머리 뒤로 솟는다. 팔은 머리 양옆으로 내려와 바닥을 짚는다.
    const hc: P = [CX + sway * 0.5, G - 7.2 + bobFB];
    const chest: P = [CX + sway * 0.4, G - 9 + bobFB];
    const hip: P = [CX + wiggle, G - 15.5 + bobFB * 0.5];
    shadow(k, CX, 10);
    for (const s of [-1, 1]) {
      const p = ph + (s > 0 ? Math.PI : 0);
      // 앞으로 끌어온 무릎은 화면 아래(이쪽)로 내려온다
      const off = Math.sin(p) * 1.7;
      const hj: P = [hip[0] + s * 2.4, hip[1] + 1.2];
      const knee: P = [CX + s * (r + 0.6), G - 9.5 + off];
      const ankle: P = [CX + s * (r - 0.6), knee[1] - m.shin * 0.8];
      limb(k.buf, [hj, knee, ankle], [m.rTh, m.rKn, m.rAn], LIMB_FAR);
      blob(k.buf, add(ankle, 0, -0.8), 1.3, 1.1, SKIN_FAR);
    }
    torso(k, hip, chest, 'up');
    for (const s of [-1, 1]) {
      const p = ph + (s > 0 ? 0 : Math.PI);
      const lift = Math.max(0, Math.cos(p)) * 1.8;
      const sh: P = [chest[0] + s * (r - 1.6), chest[1] - 0.5];
      // 앞으로 뻗는 손은 들렸다가 화면 아래쪽에 짚는다
      const target: P = [CX + s * (r - 0.2) + sway * 0.3, G - 1.6 + Math.sin(p) * 1.7 - lift];
      const [el, wr] = ik(sh, target, m.ua, m.fa, s > 0 ? -1 : 1);
      arm(k, sh, el, wr);
    }
    head(k, hc, 'down');
    return;
  }

  // 멀어진다 — 기저귀 엉덩이와 발바닥이 이쪽, 등은 짧게 줄어들고 뒤통수가 위로 보인다
  const hip: P = [CX + wiggle, G - 6.5 + bobFB * 0.5];
  const chest: P = [CX - sway * 0.3, G - 10 + bobFB];
  shadow(k, CX, 10, G - 1);
  for (const s of [-1, 1]) {
    const p = ph + (s > 0 ? 0 : Math.PI);
    const lift = Math.max(0, Math.cos(p)) * 1.6;
    const sh: P = [chest[0] + s * (m.chestR - 0.4), chest[1] - 1];
    // 뒷모습에서 앞으로 뻗는 손은 화면 위(멀리)로 간다
    const target: P = [CX + s * (r + 0.4), G - 11 - Math.sin(p) * 1.6 - lift];
    const [el, wr] = ik(sh, target, m.ua, m.fa, s > 0 ? 1 : -1);
    arm(k, sh, el, wr, true);
  }
  head(k, [CX - sway * 0.4, G - 14.5 + bobFB], 'up');
  torso(k, hip, chest, 'up');
  for (const s of [-1, 1]) {
    const p = ph + (s > 0 ? Math.PI : 0);
    const off = Math.sin(p) * 1.7;
    const lift = Math.max(0, Math.cos(p)) * 1.4;
    const hj: P = [hip[0] + s * 2.4, hip[1] + 0.8];
    const knee: P = [CX + wiggle * 0.5 + s * 4.6, G - 3.2 - off];
    const ankle: P = [CX + wiggle * 0.3 + s * 3.6, G - 0.4 - off - lift];
    limb(k.buf, [hj, knee, ankle], [m.rTh, m.rKn, m.rAn], LIMB);
    sole(k, add(ankle, -s * 0.3, 0.6));
  }
}

type Gait = {
  A: number; K: number; base: number; lean: number;
  arm: 'guard' | 'swing' | 'push'; armA: number; elbow: number;
  flight: number; hipW: number; footW: number; sway: number; lift: number;
  /** 앞/뒷모습 위아래 출렁임(px) */
  bob: number;
  /** 앞/뒷모습에서 내디딘 발이 화면 위아래로 벌어지는 폭(px) — 깊이 방향 보폭 */
  depth: number;
};

const GAIT: Record<'toddle' | 'walk' | 'run' | 'push', Gait> = {
  toddle: { A: 16, K: 30, base: 18, lean: 6, arm: 'guard', armA: 0, elbow: 0, flight: 0, hipW: 2.6, footW: 4.0, sway: 1.7, lift: 1.8, bob: 1.1, depth: 1.6 },
  walk: { A: 24, K: 34, base: 4, lean: 3, arm: 'swing', armA: 24, elbow: 18, flight: 0, hipW: 2.2, footW: 2.4, sway: 0.9, lift: 1.6, bob: 0.9, depth: 2.2 },
  push: { A: 18, K: 30, base: 14, lean: 12, arm: 'push', armA: 0, elbow: 0, flight: 0, hipW: 2.4, footW: 3.2, sway: 1.0, lift: 1.6, bob: 0.8, depth: 1.8 },
  run: { A: 36, K: 72, base: 8, lean: 12, arm: 'swing', armA: 42, elbow: 80, flight: 1.5, hipW: 2.2, footW: 2.3, sway: 0.6, lift: 2.4, bob: 1.0, depth: 3.0 },
};

function gait(k: Ctx, ph: number, g: Gait, facing: Facing) {
  const { m } = k;
  // 몸이 내려갈 때 머리다발은 늦게 따라 내려온다

  if (facing === 'side') {
    const legs = [0, 1].map((i) => {
      const p = ph + i * Math.PI;
      const swing = Math.max(0, Math.cos(p));
      const tA = 90 - g.A * Math.sin(p);
      const kn = pol([0, 0], tA, m.thigh);
      const an = pol(kn, tA + g.base + g.K * swing, m.shin);
      return { kn, an, swing };
    });
    // 낮은 쪽 발이 바닥에 닿게 엉덩이 높이를 정한다 — 걸음마다 몸이 오르내리는 게 저절로 생긴다
    const ground = Math.max(legs[0].an[1], legs[1].an[1]);
    const hip: P = [CX - 1, G - 1.3 - ground - g.flight * Math.max(0, Math.sin(ph * 2))];
    const chest = pol(hip, -90 + g.lean, m.torso);
    shadow(k, CX, 7);

    const legOf = (i: number) => {
      const far = i === 1;
      const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0);
      const L = legs[i];
      const knee = add(hj, L.kn[0], L.kn[1]);
      const ankle = add(hj, L.an[0], L.an[1]);
      leg(k, hj, knee, ankle, pol(ankle, -6 - 16 * L.swing, m.foot), far);
    };
    const armOf = (far: boolean) => {
      const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
      // 팔은 같은 쪽 다리와 반대로 흔든다
      const p = ph + (far ? 0 : Math.PI);
      if (g.arm === 'push') {
        // 보행기 손잡이 — 두 팔을 앞으로 뻗어 가슴 높이에서 잡는다
        const el = pol(sh, 35, m.ua * 0.95);
        arm(k, sh, el, pol(el, -5, m.fa), far);
        return;
      }
      if (g.arm === 'guard') {
        // 하이가드 — 팔꿈치를 굽혀 손을 어깨 높이로 든다
        const wob = Math.sin(ph * 2 + (far ? 1 : 0)) * 6;
        const el = pol(sh, 30 + wob, m.ua * 0.9);
        arm(k, sh, el, pol(el, -55 + wob, m.fa * 0.9), far);
        return;
      }
      const uA = 90 - g.armA * Math.sin(p) + g.lean * 0.5;
      const el = pol(sh, uA, m.ua);
      arm(k, sh, el, pol(el, uA - g.elbow, m.fa), far);
    };
    armOf(true);
    legOf(1);
    torso(k, hip, chest, 'side');
    legOf(0);
    armOf(false);
    const hc = headOn(k, chest, g.lean);
    neck(k, chest, hc);
    head(k, hc, 'side');
    return;
  }

  // ── 앞/뒤 ──
  // 걸음은 깊이 방향 움직임이라 그대로 그리면 화면에서 0 이 된다.
  // 톱다운 쿼터뷰에서 "앞으로"는 앞모습이면 화면 아래, 뒷모습이면 화면 위다. 1px 미만 움직임은 반올림으로 사라지니 쓰지 않는다.
  const toward = facing === 'down' ? 1 : -1;
  // 디딘 다리 쪽으로 체중이 쏠린다(오른다리는 cos<0 일 때 디딤)
  const sway = -g.sway * Math.cos(ph);
  // 두 다리가 모이는 순간 가장 높고, 벌어져 디딜 때 가장 낮다
  const bob = g.bob * Math.cos(ph * 2);
  const flight = g.flight * Math.max(0, Math.sin(ph * 2));
  const hipY = G - 1.3 - (m.thigh + m.shin) * (1 - g.base * 0.006) - bob - flight;
  const hip: P = [CX + sway * 0.8, hipY - 0.3];
  const chest: P = [CX + sway * 1.1, hipY - m.torso];
  // 그림자는 디딘 발 쪽으로 따라간다
  shadow(k, CX + sway * 0.6, 7);

  const legs = [1, -1]
    .map((s) => {
      const p = s > 0 ? ph : ph + Math.PI;
      const fwd = Math.sin(p);
      const lift = g.lift * Math.max(0, Math.cos(p)) + flight;
      const hj: P = [CX + sway * 0.6 + s * g.hipW, hipY];
      const ankle: P = [CX + sway * 0.2 + s * g.footW, G - 1.3 + toward * fwd * g.depth - lift];
      const mid = mix(hj, ankle, 0.5);
      // 들어 올린 다리는 무릎이 바깥·앞으로 튀어나온다
      const knee: P = [mid[0] + s * (0.3 + lift * 0.5 + g.base * 0.03), mid[1] + toward * lift * 0.3];
      return { hj, knee, ankle, near: toward * fwd };
    })
    // 먼 다리부터 그려야 가까운 다리가 위로 겹친다
    .sort((a, b) => a.near - b.near);
  for (const L of legs) leg(k, L.hj, L.knee, L.ankle, null, L.near < -0.5, facing);

  const armList = [1, -1].map((s) => {
    // 팔은 같은 쪽 다리와 반대로 흔든다
    const f = Math.sin(s > 0 ? ph + Math.PI : ph);
    return { s, f, near: toward * f };
  });
  const drawArm = (a: { s: number; f: number; near: number }) => {
    const sh: P = [chest[0] + a.s * (m.chestR - 0.3), chest[1] + 0.8];
    if (g.arm === 'push') {
      // 손잡이는 아기 앞 — 앞모습은 화면 아래, 뒷모습은 몸 너머 위쪽
      const el: P = [sh[0] + a.s * 0.3, sh[1] + m.ua * (facing === 'down' ? 0.85 : 0.7)];
      const wr: P = [el[0] - a.s * 0.6, el[1] + (facing === 'down' ? m.fa * 0.5 + 1.6 : m.fa * 0.3 - 1.5)];
      arm(k, sh, el, wr, facing === 'up');
      return;
    }
    if (g.arm === 'guard') {
      const wob = Math.sin(ph * 2 + (a.s > 0 ? 0 : 1.5)) * 10;
      const el = pol(sh, a.s > 0 ? 18 + wob : 162 - wob, m.ua * 0.95);
      arm(k, sh, el, pol(el, a.s > 0 ? -72 + wob : 252 - wob, m.fa * 0.85), facing === 'up');
      return;
    }
    // 앞으로 흔든 팔은 손이 이쪽(앞모습이면 아래)으로 오며 몸 앞을 가로지르고, 뒤로 간 팔은 몸 뒤로 숨는다
    const short = 0.22 + g.elbow / 260;
    const el: P = [sh[0] + a.s * 0.9, sh[1] + m.ua * (1 - 0.15 * Math.abs(a.f))];
    const wr: P = [
      el[0] - a.s * Math.max(0, a.f) * 1.4 + a.s * 0.2,
      el[1] + m.fa * (1 - short * Math.abs(a.f)) + toward * a.f * 1.8,
    ];
    arm(k, sh, el, wr, a.near < -0.3);
  };
  const behind = (a: { near: number }) => (g.arm === 'swing' ? a.near < 0 : facing === 'up');
  armList.filter(behind).forEach(drawArm);
  torso(k, hip, chest, facing);
  armList.filter((a) => !behind(a)).forEach(drawArm);
  // 머리는 몸보다 덜 흔들린다 — 반대로 살짝 버텨 균형을 잡는다
  const hc = add(headOn(k, chest, 0), -sway * 0.35, 0);
  neck(k, chest, hc);
  head(k, hc, facing);
}

/**
 * 앞/뒷모습 몸통·팔·머리 순서.
 * 앞모습은 팔이 몸 위로 오고, 뒷모습은 팔이 몸 뒤로 들어가 안쪽이 가려진다 — 이게 앞뒤를 가르는 깊이 단서다.
 */
function frontBack(k: Ctx, facing: Facing, hip: P, chest: P, arms: () => void) {
  if (facing === 'up') arms();
  torso(k, hip, chest, facing);
  if (facing !== 'up') arms();
  const hc = headOn(k, chest, 0);
  neck(k, chest, hc);
  head(k, hc, facing);
}

/** reach — 쪼그려 앉아 바닥의 공을 손으로 미는 자세 */
type Stance = { c: number; lift: number; u: number; sway?: number; reach?: boolean; manse?: number };

/** 웅크리기·점프·서 있기를 한 함수로. c=웅크림 0~1, lift=공중 높이, u=팔 들기 -1(뒤)~1(위). */
function stance(k: Ctx, s0: Stance, facing: Facing) {
  const { m } = k;
  const { c, lift, u } = s0;
  const air = lift > 0 ? 1 : 0;

  if (facing === 'side') {
    const tA = 90 - 50 * c - 12 * air;
    const kn = pol([0, 0], tA, m.thigh);
    const an = pol(kn, 90 + 45 * c + 18 * air, m.shin);
    const lean = 5 + 32 * c;
    const hip: P = [CX - 2 - 2 * c, G - 1.3 - an[1] - lift];
    const chest = pol(hip, -90 + lean, m.torso);
    ell(k.buf, CX - 1, G + 1.6, 7 - lift * 0.5, 1.6, C.shadow, 60);
    const legOf = (far: boolean) => {
      const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0);
      const ankle = add(hj, an[0], an[1]);
      leg(k, hj, add(hj, kn[0], kn[1]), ankle, pol(ankle, air ? 30 : -6, m.foot), far);
    };
    const armOf = (far: boolean) => {
      const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
      if (s0.reach) {
        const [el, wr] = ik(sh, [hip[0] + 7 + c * 2, G - 2 + (far ? -0.6 : 0)], m.ua, m.fa, 1);
        arm(k, sh, el, wr, far);
        return;
      }
      if (s0.manse !== undefined) {
        raisedArm(k, sh, 0, 'manse', s0.manse, 'open', far);
        return;
      }
      const uA = 95 - 150 * Math.max(0, u) + 55 * Math.max(0, -u);
      const el = pol(sh, uA, m.ua);
      arm(k, sh, el, pol(el, uA - 20, m.fa), far);
    };
    const raised = s0.manse !== undefined;
    armOf(true);
    legOf(true);
    torso(k, hip, chest, 'side');
    legOf(false);
    if (!raised) armOf(false);
    const hc = headOn(k, chest, lean * 0.6);
    neck(k, chest, hc);
    head(k, hc, 'side');
    if (raised) armOf(false);
    return;
  }

  const sway = s0.sway ?? 0;
  const hipY = G - 1.3 - (m.thigh + m.shin) * (1 - 0.38 * c) - lift;
  const hip: P = [CX + sway, hipY - 0.3];
  const chest: P = [CX + sway * 1.3, hipY - m.torso * (1 - 0.12 * c)];
  ell(k.buf, CX, G + 1.6, 7 - lift * 0.5, 1.6, C.shadow, 60);
  for (const s of [-1, 1]) {
    const hj: P = [CX + sway + s * 2.4, hipY];
    const ankle: P = [CX + s * (2.8 + 0.6 * c), G - 1.3 - lift];
    const mid = mix(hj, ankle, 0.5);
    leg(k, hj, [mid[0] + s * (0.4 + 2.4 * c), mid[1]], ankle, null, false, facing);
  }
  if (s0.manse !== undefined && facing === 'down') {
    // 만세는 손이 머리 옆까지 올라오므로 머리를 먼저 그린다
    torso(k, hip, chest, facing);
    const hc = headOn(k, chest, 0);
    neck(k, chest, hc);
    head(k, hc, facing);
    for (const s of [-1, 1] as const) raisedArm(k, [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8], s, 'manse', s0.manse, 'open');
    return;
  }
  frontBack(k, facing, hip, chest, () => {
    for (const s of [-1, 1]) {
      const sh: P = [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8];
      if (s0.manse !== undefined) {
        raisedArm(k, sh, s as -1 | 1, 'manse', s0.manse, 'open', facing === 'up');
        continue;
      }
      if (s0.reach) {
        // 앞모습은 손이 이쪽(아래)으로, 뒷모습은 몸 너머(위)로 뻗는다
        const toward = facing === 'down' ? 1 : -1;
        const [el, wr] = ik(sh, [CX + s * 1.8, G - 2 + toward * (1 + c * 2)], m.ua, m.fa, s > 0 ? -1 : 1);
        arm(k, sh, el, wr, facing === 'up');
        continue;
      }
      const a = 84 - 135 * Math.max(0, u) - 18 * Math.max(0, -u);
      const ang = s > 0 ? a : 180 - a;
      const el = pol(sh, ang, m.ua);
      arm(k, sh, el, pol(el, s > 0 ? a - 8 * u : 180 - a + 8 * u, m.fa), facing === 'up');
    }
  });
}

/**
 * 가구 잡고 서기(콩콩 반동) / 잡고 걷기(게걸음). 세 방향 모두 같은 함수.
 *   옆 — 가구가 오른쪽, 아기가 몸을 기울여 짚는다.
 *   앞 — 가구가 아기 앞(화면 아래)에 있어 하체를 가리고, 손이 가구 윗면에 올라온다.
 *   뒤 — 벽 쪽 가구를 마주 본다. 손을 들어 윗면을 짚고 엉덩이와 발뒤꿈치가 보인다.
 */
/** 앞/뒤 잡기 자세의 가구 위·아래 y. 발밑(G) 기준 상대값이라 방 미리보기에서도 같은 자리에 가구를 놓을 수 있다. */
export function holdingCabinet(months: number, facing: Facing): { top: number; bottom: number } | null {
  if (facing === 'side') return null;
  if (facing === 'up') return { top: -21, bottom: -6 };
  const m = metrics(months);
  return { top: Math.round(G - 1.3 - (m.thigh + m.shin) * 0.95 - 1) - G, bottom: 3 };
}

/**
 * 앞/뒤 가구 반폭. 옆모습 상자(13px)와 비슷한 크기로 맞춘다.
 * 잡고 서기는 두 손이 겨우 올라가는 작은 상자, 잡고 걷기는 게걸음 폭만큼만 더 길다.
 */
export function holdingHalfWidth(id: BehaviorId, facing: Facing) {
  // 뒷모습은 아기 몸이 가구 앞을 가리므로 양옆으로 몇 px 더 보이게 넓힌다
  const back = facing === 'up' ? 2 : 0;
  return (id === 'cruise' ? 11 : 8) + back;
}

function holding(k: Ctx, ph: number, facing: Facing, cruising: boolean) {
  const { m } = k;
  const legLen = m.thigh + m.shin;
  // 잡고 서기는 무릎 반동 0~1, 잡고 걷기는 좌우 이동
  const bounce = cruising ? 0 : 0.5 + 0.5 * Math.sin(ph);
  const shift = cruising ? 2.0 * Math.sin(ph) : 0;

  if (facing === 'side') {
    const boxX = CX + 3;
    const top = G - 12;
    if (!k.noProps) cabinet(k.buf, boxX, boxX + 13, top, G + 1);
    // 잡고 걷기 옆모습은 깊이 방향으로 옮기는 걸음이라, 발을 번갈아 들어 디딘다
    const legs = [0, 1].map((i) => {
      const lift = cruising ? Math.max(0, Math.sin(ph + i * Math.PI)) : 0;
      const flex = cruising ? 14 + 34 * lift : 12 + 22 * bounce;
      const kn = pol([0, 0], 90 - flex * 0.55, m.thigh);
      return { kn, an: pol(kn, 90 + flex * 0.5, m.shin) };
    });
    const ground = Math.max(legs[0].an[1], legs[1].an[1]);
    const hip: P = [CX - 6 + shift * 0.3, G - 1.3 - ground];
    const lean = 24;
    const chest = pol(hip, -90 + lean, m.torso);
    shadow(k, CX - 4, 6);
    const legOf = (i: number) => {
      const far = i === 1;
      const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0);
      const ankle = add(hj, legs[i].an[0], legs[i].an[1]);
      leg(k, hj, add(hj, legs[i].kn[0], legs[i].kn[1]), ankle, pol(ankle, -6, m.foot), far);
    };
    const armOf = (far: boolean) => {
      const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
      const slide = cruising ? Math.sin(ph + (far ? Math.PI : 0)) * 0.8 : 0;
      const [el, wr] = ik(sh, [boxX + 1.5 + (far ? 1.2 : 0) + slide, top - 1.2], m.ua, m.fa, 1);
      arm(k, sh, el, wr, far);
    };
    armOf(true);
    legOf(1);
    torso(k, hip, chest, 'side');
    legOf(0);
    armOf(false);
    const hc = headOn(k, chest, lean * 0.5);
    neck(k, chest, hc);
    head(k, hc, 'side');
    return;
  }

  const cx = CX + shift;
  const sink = bounce * 1.8;
  const hipY = G - 1.3 - legLen * 0.95 + sink;
  const hip: P = [cx, hipY - 0.3];
  const chest: P = [cx, hipY - m.torso];
  // 잡고 걷기는 오른발이 먼저 벌어지고 왼발이 따라붙는다
  const feet = [
    { s: 1, x: CX + 2.6 + (cruising ? 2.2 * Math.sin(ph) : 0), lift: cruising ? Math.max(0, Math.cos(ph)) * 1.8 : 0 },
    { s: -1, x: CX - 2.6 + (cruising ? 2.2 * Math.sin(ph - 1.2) : 0), lift: cruising ? Math.max(0, -Math.cos(ph - 1.2)) * 1.8 : 0 },
  ];
  const legs = () => {
    for (const f of feet) {
      const hj: P = [cx + f.s * 2.3, hipY];
      const ankle: P = [f.x, G - 1.3 - f.lift];
      const mid = mix(hj, ankle, 0.5);
      leg(k, hj, [mid[0] + f.s * (0.5 + f.lift * 0.3 + sink * 0.9), mid[1]], ankle, null, false, facing);
    }
  };

  const cab = holdingCabinet(k.months, facing)!;
  const half = holdingHalfWidth(cruising ? 'cruise' : 'pullStand', facing);
  const [cx0, cx1] = k.cabX ?? [CX - half, CX + half];
  if (facing === 'up') {
    if (!k.noProps) cabinet(k.buf, cx0, cx1, G + cab.top, G + cab.bottom);
    shadow(k, cx, 7);
    legs();
    frontBack(k, 'up', hip, chest, () => {
      for (const s of [-1, 1]) {
        const sh: P = [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8];
        const [el, wr] = ik(sh, [cx + s * 5.2, G - 19.5], m.ua, m.fa, s > 0 ? 1 : -1);
        arm(k, sh, el, wr, true);
      }
    });
    return;
  }

  // 앞 — 가구 윗면은 허리 높이에 고정, 아기가 그 뒤에서 오르내린다
  const top = G + cab.top;
  shadow(k, cx, 7);
  legs();
  torso(k, hip, chest, 'down');
  if (!k.noProps) cabinet(k.buf, cx0, cx1, top, G + cab.bottom);
  for (const s of [-1, 1]) {
    const sh: P = [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8];
    // 걷는 쪽 손이 먼저 나가고 반대 손이 따라온다
    const lead = cruising ? Math.sin(ph + (s > 0 ? 0 : -1.2)) * 1.0 : 0;
    const [el, wr] = ik(sh, [CX + s * 5.4 + shift * 0.6 + lead, top + 1.2], m.ua, m.fa, s > 0 ? -1 : 1);
    arm(k, sh, el, wr);
  }
  const hc = headOn(k, chest, 0);
  neck(k, chest, hc);
  head(k, hc, 'down');
}

/** 공 쫓아가기 — 쪼그려 앉으며 손으로 바닥의 공을 툭 민다 */
function ballChase(k: Ctx, ph: number, facing: Facing) {
  const c = 0.25 + 0.6 * (0.5 - 0.5 * Math.cos(ph));
  stance(k, { c, lift: 0, u: 0, reach: true }, facing);
}

// 공 차기 8프레임 — 차는 다리가 뒤로 젖혔다(준비) 앞으로 휘두르고(임팩트 4~5) 돌아온다
const KICK_THIGH = [96, 116, 128, 108, 66, 42, 62, 86];
const KICK_KNEE = [8, 40, 62, 30, 6, 0, 12, 10];
const KICK_FWD = [0, -0.6, -1, -0.4, 0.8, 1, 0.5, 0];
const KICK_LIFT = [0, 1, 1.5, 1, 1.5, 2, 1, 0];

/** 공 차기. 한 발로 디디고 다른 발로 찬다. 팔은 균형을 잡으려고 반대로 흔든다. */
function ballKick(k: Ctx, i: number, facing: Facing) {
  const { m } = k;
  if (facing === 'side') {
    const plantKn = pol([0, 0], 88, m.thigh);
    const plantAn = pol(plantKn, 96, m.shin);
    const tA = KICK_THIGH[i];
    const kickKn = pol([0, 0], tA, m.thigh);
    const kickAn = pol(kickKn, tA + KICK_KNEE[i], m.shin);
    const hip: P = [CX - 3, G - 1.3 - plantAn[1]];
    const lean = 4 - 8 * Math.max(0, KICK_FWD[i]);
    const chest = pol(hip, -90 + lean, m.torso);
    shadow(k, CX - 2, 7);
    // 디딤발은 먼 쪽, 차는 발은 가까운 쪽
    const far = add(hip, 0.8, -0.6);
    const fa = add(far, plantAn[0], plantAn[1]);
    const swing = KICK_FWD[i];
    const armOf = (isFar: boolean) => {
      const sh = add(chest, isFar ? 0.8 : 0, isFar ? 0.2 : 1.0);
      const uA = 90 + (isFar ? -1 : 1) * 35 * swing;
      const el = pol(sh, uA, m.ua);
      arm(k, sh, el, pol(el, uA - 25, m.fa), isFar);
    };
    armOf(true);
    leg(k, far, add(far, plantKn[0], plantKn[1]), fa, pol(fa, -6, m.foot), true);
    torso(k, hip, chest, 'side');
    const ka = add(hip, kickAn[0], kickAn[1]);
    leg(k, hip, add(hip, kickKn[0], kickKn[1]), ka, pol(ka, tA < 80 ? -20 : 10, m.foot));
    armOf(false);
    const hc = headOn(k, chest, lean);
    neck(k, chest, hc);
    head(k, hc, 'side');
    return;
  }

  const toward = facing === 'down' ? 1 : -1;
  const hipY = G - 1.3 - (m.thigh + m.shin) * 0.94;
  const hip: P = [CX - 0.6, hipY - 0.3];
  const chest: P = [CX - 0.8, hipY - m.torso];
  shadow(k, CX, 7);
  const kick = { s: 1, fwd: KICK_FWD[i], lift: KICK_LIFT[i] };
  const legs = [
    { s: -1, ankle: [CX - 2.8, G - 1.3] as P, near: 0, far: false },
    { s: 1, ankle: [CX + 2.4, G - 1.3 + toward * kick.fwd * 2.6 - kick.lift] as P, near: toward * kick.fwd, far: toward * kick.fwd < -0.5 },
  ].sort((a, b) => a.near - b.near);
  for (const L of legs) {
    const hj: P = [CX - 0.6 + L.s * 2.3, hipY];
    const mid = mix(hj, L.ankle, 0.5);
    const lifted = L.s > 0 ? kick.lift : 0;
    leg(k, hj, [mid[0] + L.s * (0.4 + lifted * 0.5), mid[1] + toward * lifted * 0.3], L.ankle, null, L.far, facing);
  }
  frontBack(k, facing, hip, chest, () => {
    for (const s of [-1, 1]) {
      // 균형 — 두 팔을 옆으로 벌리고, 차는 순간 반대 팔이 앞으로 나온다
      const sh: P = [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8];
      const el = pol(sh, s > 0 ? 40 : 140, m.ua);
      const wr = add(pol(el, s > 0 ? 70 : 110, m.fa), 0, s < 0 ? toward * kick.fwd * 1.4 : 0);
      arm(k, sh, el, wr, facing === 'up');
    }
  });
}

const JUMP: Stance[] = [
  { c: 0, lift: 0, u: 0 },
  { c: 0.35, lift: 0, u: -0.4 },
  { c: 0.75, lift: 0, u: -0.8 },
  { c: 1, lift: 0, u: -1 },
  { c: 0.3, lift: 1.5, u: 0.8 },
  { c: 0.1, lift: 3.5, u: 1 },
  { c: 0.15, lift: 4, u: 1 },
  { c: 0.2, lift: 2.5, u: 0.7 },
  { c: 0.85, lift: 0, u: -0.2 },
  { c: 0.55, lift: 0, u: 0 },
  { c: 0.2, lift: 0, u: 0 },
  { c: 0, lift: 0, u: 0 },
];

/** 털썩 앉기 프레임. 서서 비틀 → 무릎이 꺾이고 → 엉덩이로 착지(살짝 튕김) → 앉아 있다가 → 다시 일어선다. */
function plop(k: Ctx, i: number, facing: Facing) {
  const ph = (i / 12) * Math.PI * 2;
  const stand = (sway: number) => stance(k, { c: 0.15, lift: 0, u: 0.3, sway }, facing);
  switch (i) {
    case 0: return stand(0);
    case 1: return stand(1);
    case 2: return stand(-1.2);
    case 3: return stance(k, { c: 0.6, lift: 0, u: 0.2, sway: 0.6 }, facing);
    case 4: return stance(k, { c: 1, lift: 0, u: 0.3 }, facing);
    case 5: return sit(k, ph, facing, -1.2);
    case 6: return sit(k, ph, facing, 0.4);
    case 10: return stance(k, { c: 1, lift: 0, u: -0.2 }, facing);
    case 11: return stance(k, { c: 0.55, lift: 0, u: 0.2 }, facing);
    default: return sit(k, Math.PI / 2, facing);
  }
}

/**
 * 의자에 걸터앉았을 때 발밑(G)에서 엉덩이까지의 높이. 홈은 이만큼 내려서 엉덩이를 의자 앉는 면에 맞춘다.
 */
export function seatDrop(months: number) {
  const m = metrics(months);
  return m.thigh * 0.35 + m.shin + 1.6;
}

/** 의자에 앉기 — 앞모습. 무릎이 이쪽으로 나와 허벅지는 짧게 보이고, 정강이를 늘어뜨려 번갈아 달랑거린다. */
function chairSit(k: Ctx, ph: number) {
  const { m } = k;
  const hipY = G - seatDrop(k.months);
  const hip: P = [CX, hipY];
  const chest: P = [CX + 0.4 * Math.sin(ph), hipY - m.torso];
  torso(k, hip, chest, 'down');
  for (const s of [-1, 1]) {
    const hj: P = [CX + s * 2.1, hipY + 0.6];
    const knee: P = [CX + s * 2.5, hipY + m.thigh * 0.35 + 0.6];
    const swing = Math.max(0, Math.sin(ph + (s > 0 ? 0 : Math.PI)));
    const ankle: P = [CX + s * 2.6, knee[1] + m.shin - 1.2 * swing];
    limb(k.buf, [hj, knee, ankle], [m.rTh, m.rKn, m.rAn], LIMB);
    sole(k, add(ankle, s * 0.3, 0.5));
  }
  // 두 손은 엉덩이 옆 앉는 면을 짚는다
  for (const s of [-1, 1]) {
    const sh: P = [chest[0] + s * (m.chestR - 0.2), chest[1] + 0.9];
    const [el, wr] = ik(sh, [CX + s * 5.2, hipY + 0.4], m.ua, m.fa, s > 0 ? -1 : 1);
    arm(k, sh, el, wr);
  }
  const hc = headOn(k, chest, 0);
  neck(k, chest, hc);
  head(k, hc, 'down');
}

/**
 * 의자에 앉기 — 옆모습(오른쪽을 본다). 옆으로 돌려 놓은 소파·의자에 앉을 때.
 * 허벅지는 앉는 면을 따라 앞으로 뻗고, 정강이는 의자 앞으로 늘어뜨려 번갈아 달랑거린다. 두 손은 엉덩이 옆을 짚는다.
 */
function chairSitSide(k: Ctx, ph: number) {
  const { m } = k;
  const hipY = G - seatDrop(k.months);
  const hip: P = [CX - 2, hipY];
  const chest = pol(hip, -90 + 4 + Math.sin(ph) * 2, m.torso);
  const legOf = (far: boolean) => {
    const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0.4);
    const knee: P = [hj[0] + m.thigh + 0.6, hj[1] + 0.4];
    const swing = Math.max(0, Math.sin(ph + (far ? Math.PI : 0)));
    const ankle = pol(knee, 90 - 28 * swing, m.shin);
    leg(k, hj, knee, ankle, pol(ankle, -10 - 20 * swing, m.foot), far);
  };
  const armOf = (far: boolean) => {
    const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
    const [el, wr] = ik(sh, [hip[0] + 2.4 + (far ? 0.8 : 0), hipY + 0.6], m.ua, m.fa, 1);
    arm(k, sh, el, wr, far);
  };
  armOf(true);
  legOf(true);
  torso(k, hip, chest, 'side');
  legOf(false);
  armOf(false);
  const hc = headOn(k, chest, 2);
  neck(k, chest, hc);
  head(k, hc, 'side');
}

/**
 * 미끄럼틀 사다리 오르기 — 뒷모습. 한 손이 위 칸을 잡을 때 반대쪽 무릎을 올린다.
 * 사다리는 아이템 그림에 있으므로 그리지 않는다. 손이 머리에 가리지 않게 머리 다음에 팔을 그린다.
 */
function climb(k: Ctx, ph: number) {
  const { m } = k;
  const hipY = G - 1.3 - (m.thigh + m.shin) * 0.92;
  const hip: P = [CX, hipY];
  const chest: P = [CX, hipY - m.torso];
  for (const s of [-1, 1]) {
    const lift = Math.max(0, s > 0 ? Math.sin(ph) : -Math.sin(ph));
    const hj: P = [CX + s * 2.2, hipY];
    const ankle: P = [CX + s * 2.6, G - 1.3 - 3.2 * lift];
    const mid = mix(hj, ankle, 0.5);
    leg(k, hj, [mid[0] + s * 0.5, mid[1] - 0.8 * lift], ankle, null, false, 'up');
  }
  torso(k, hip, chest, 'up');
  const hc = headOn(k, chest, 0);
  neck(k, chest, hc);
  head(k, hc, 'up');
  for (const s of [-1, 1]) {
    const reach = s > 0 ? 0.5 + 0.5 * Math.cos(ph) : 0.5 - 0.5 * Math.cos(ph);
    const sh: P = [chest[0] + s * (m.chestR - 0.3), chest[1] + 0.8];
    const [el, wr] = ik(sh, [chest[0] + s * 6.2, chest[1] - 5 - 4 * reach], m.ua * 1.3, m.fa * 1.35, s > 0 ? 1 : -1);
    arm(k, sh, el, wr, true);
  }
}

// ───────────────────────── 프레임 굽기 ─────────────────────────

/** 도리도리 고개 방향(프레임별). 끝에서 한 프레임 더 머물러야 고개를 '젓는' 느낌이 난다. */
type Turn = NonNullable<Ctx['headTurn']>;
const DORI_FRONT: Turn[] = ['front', 'right', 'right', 'front', 'left', 'left', 'front', 'front'];
const DORI_SIDE: Turn[] = ['right', 'front', 'front', 'right', 'back', 'back', 'right', 'right'];
/** 메롱 — 혀를 내밀었다(true) 넣었다 한다 */
const MERONG = [false, true, true, true, false, true, true, false];

/** (행동, 개월수, 성별, 방향) 한 벌의 프레임을 픽셀 버퍼로 굽는다. */
export function buildFrames(
  id: BehaviorId,
  months: number,
  gender: Gender,
  facing: Facing,
  opts: { cabX?: [number, number]; noProps?: boolean; noSnore?: boolean } = {},
): Buf[] {
  const b = BEHAVIORS.find((x) => x.id === id)!;
  const f = b.facings.includes(facing) ? facing : b.facings[0];
  const m = metrics(months);
  const pal = PAL[gender];

  return Array.from({ length: b.frames }, (_, i) => {
    const buf = makeBuf(W, H, RES);
    const ph = (i / b.frames) * Math.PI * 2;
    const idle = !b.roams && !['jump', 'plop', 'ballKick', 'ballChase', 'sleep'].includes(id);
    const k: Ctx = { buf, m, pal, gender, months, blink: idle && i === b.frames - 3, cabX: opts.cabX, noProps: opts.noProps, noSnore: opts.noSnore };

    switch (id) {
      case 'lying': lying(k, ph); break;
      case 'tummy': tummy(k, ph); break;
      case 'sit': sit(k, ph, f); break;
      case 'crawl': crawl(k, ph, f); break;
      case 'pullStand': holding(k, ph, f, false); break;
      case 'cruise': holding(k, ph, f, true); break;
      case 'toddle': gait(k, ph, GAIT.toddle, f); break;
      case 'walk': gait(k, ph, GAIT.walk, f); break;
      case 'run': gait(k, ph, GAIT.run, f); break;
      case 'jump': stance(k, JUMP[i], f); break;
      case 'plop': plop(k, i, f); break;
      case 'toyPlay': sit(k, ph, f, 0, 'tap'); break;
      case 'sleep': k.blink = true; lying(k, ph, true); break;
      case 'ballRoll': sit(k, ph, f, 0, 'push'); break;
      case 'ballChase': ballChase(k, ph, f); break;
      case 'ballKick': ballKick(k, i, f); break;
      case 'pushWalker': gait(k, ph, GAIT.push, f); break;
      case 'jamjam': sit(k, ph, f, 0, 'jamjam'); break;
      case 'doridori':
        // 정면 몸은 오른쪽·왼쪽 옆얼굴로, 옆 몸은 정면·뒤통수로 고개를 돌린다
        k.headTurn = f === 'down' ? DORI_FRONT[i] : DORI_SIDE[i];
        sit(k, Math.PI / 2, f, 0, 'rest');
        break;
      case 'gonji': sit(k, ph, f, 0, 'gonji'); break;
      case 'chairSit': if (f === 'side') chairSitSide(k, ph); else chairSit(k, ph); break;
      case 'slide':
        // 뒷모습은 사다리 오르기, 옆모습은 두 팔을 들고 타고 내려오기
        if (f === 'up') climb(k, ph);
        else sit(k, Math.PI + 0.3 * Math.sin(ph), 'side', 0, 'manse');
        break;
      case 'merong': {
        // 혀를 내밀 때는 눈웃음, 넣을 때는 빙긋 웃는다
        const out = MERONG[i];
        k.mouth = out ? 'merong' : 'smile';
        k.face = 'happy';
        k.blink = false;
        if (months < 12) sit(k, Math.PI / 2, f, 0, 'rest');
        else stance(k, { c: 0.1, lift: 0, u: 0, sway: out ? 0.6 : 0 }, f);
        break;
      }
      case 'manse':
        // 걷기 전에는 앉아서, 걷기 시작하면 서서 한다
        if (months < 12) sit(k, ph, f, 0, 'manse');
        else {
          const up = Math.min(1, (0.5 - 0.5 * Math.cos(ph)) * 1.25);
          // 팔을 올릴 때 무릎을 살짝 굽혔다 펴며 들썩인다
          stance(k, { c: 0.2 - 0.15 * up, lift: 0, u: 0, manse: up }, f);
        }
        break;
    }
    return buf;
  });
}

// ───────────────────────── 방 ─────────────────────────

const ROOM = {
  wall: '#F4E6D2',
  wallLine: '#D9C2A3',
  base: '#B98E64',
  floor: '#EBD5B5',
  plank: '#DDC29C',
  seam: '#D2B48B',
} as const;

/**
 * 미리보기용 작은 방 — 위쪽 벽, 아래쪽 마루. 마루 판자 결이 있어야 아기가 움직이는 게 눈에 읽힌다.
 * cabinet 을 주면 그 자리에 가구를 놓는다(잡고 서기·잡고 걷기).
 */
export function buildRoom(
  w: number,
  h: number,
  wall: number,
  cab?: { x0: number; x1: number; top: number; bottom: number },
  extras: {
    rug?: { x0: number; x1: number; y0: number; y1: number };
    toy?: { x: number; y: number };
    bed?: { x0: number; x1: number; y0: number; y1: number };
  } = {},
): Buf {
  const buf = makeBuf(w, h);
  rect(buf, 0, 0, w, wall, ROOM.wall);
  for (let x = 3; x < w; x += 8) rect(buf, x, 2, 1, wall - 5, ROOM.wallLine);
  rect(buf, 0, wall - 2, w, 2, ROOM.base);
  rect(buf, 0, wall, w, h - wall, ROOM.floor);
  // 판자: 가로로 긴 줄 + 엇갈린 이음매
  for (let y = wall + 5, row = 0; y < h; y += 6, row++) {
    rect(buf, 0, y, w, 1, ROOM.plank);
    for (let x = (row % 2) * 12 + 5; x < w; x += 24) rect(buf, x, y - 5, 1, 5, ROOM.seam);
  }
  if (extras.rug) {
    const r = extras.rug;
    rect(buf, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, '#C98FA8');
    rect(buf, r.x0 + 1, r.y0 + 1, r.x1 - r.x0 - 2, r.y1 - r.y0 - 2, '#F2C6D6');
    for (let y = r.y0 + 3; y < r.y1 - 2; y += 4) rect(buf, r.x0 + 3, y, r.x1 - r.x0 - 6, 1, '#E8AFC4');
  }
  if (cab) cabinet(buf, cab.x0, cab.x1, cab.top, cab.bottom);
  if (extras.toy) toyBlocks(buf, extras.toy.x, extras.toy.y);
  if (extras.bed) crib(buf, extras.bed);
  return buf;
}

/** 아기침대 — 나무 틀과 하얀 매트리스, 왼쪽 머리판과 베개, 앞 난간. 미리보기용. */
function crib(buf: Buf, r: { x0: number; x1: number; y0: number; y1: number }) {
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  ell(buf, (r.x0 + r.x1) / 2, r.y1 + 1, w / 2 + 1, 1.6, C.shadow, 60);
  // 뒤 판과 왼쪽 머리판
  rect(buf, r.x0 - 1, r.y0 - 5, w + 2, h + 4, C.woodLine);
  rect(buf, r.x0, r.y0 - 4, w, 4, C.woodTop);
  rect(buf, r.x0, r.y0 - 4, 4, h, C.woodTop);
  // 매트리스
  rect(buf, r.x0 + 4, r.y0, w - 5, h - 2, '#F7F9FC');
  rect(buf, r.x0 + 4, r.y1 - 3, w - 5, 1, '#DCE3EC');
  // 베개 — 머리판 쪽
  rect(buf, r.x0 + 5, (r.y0 + r.y1) / 2 - 6, 6, 10, '#DCE3EC');
  rect(buf, r.x0 + 5, (r.y0 + r.y1) / 2 - 6, 5, 9, '#FFFFFF');
  cribFrontRail(buf, r);
}

/** 침대 앞 난간 — 아기가 누우면 이것만 아기 위에 한 번 더 그려 몸이 침대 안에 들어가 보이게 한다. */
function cribFrontRail(buf: Buf, r: { x0: number; x1: number; y0: number; y1: number }) {
  const top = Math.round(r.y0 + (r.y1 - r.y0) * 0.72);
  rect(buf, r.x0 - 1, top - 1, r.x1 - r.x0 + 2, r.y1 - top + 2, C.woodLine);
  rect(buf, r.x0, top, r.x1 - r.x0, r.y1 - top, C.wood);
  rect(buf, r.x0, top, r.x1 - r.x0, 1, C.woodTop);
  for (let x = r.x0 + 6; x < r.x1 - 3; x += 6) rect(buf, x, top + 1, 1, r.y1 - top - 1, C.woodDark);
  rect(buf, r.x0 - 1, r.y1, 2, 2, C.woodLine);
  rect(buf, r.x1 - 1, r.y1, 2, 2, C.woodLine);
}

/** 앞 난간만 그린 투명한 겹 — 어드민 미리보기에서 자는 아기 위에 올린다. */
export function cribFront(w: number, h: number, r: { x0: number; x1: number; y0: number; y1: number }): Buf {
  const buf = makeBuf(w, h);
  cribFrontRail(buf, r);
  return buf;
}

/** 쌓기 블록 — 장난감 놀기 미리보기용. (x, y) 는 바닥에 닿는 아래 가운데. */
function toyBlocks(buf: Buf, x: number, y: number) {
  ell(buf, x, y + 0.5, 5, 1.2, C.shadow, 60);
  const block = (bx: number, by: number, c: string, d: string) => {
    rect(buf, bx - 1, by - 1, 5, 5, C.woodLine);
    rect(buf, bx, by, 3, 3, c);
    rect(buf, bx, by + 2, 3, 1, d);
  };
  block(x - 4, y - 3, '#E25D5D', '#A83E3E');
  block(x + 1, y - 3, '#5DB0E2', '#3B7FAA');
  block(x - 1.5, y - 7, '#F6C445', '#C0952A');
}

// ───────────────────────── 움직이는 장난감 ─────────────────────────

/** 공 스프라이트 한 변. 발밑 기준점은 (BALL / 2, BALL - 1). */
export const BALL = 9;

/**
 * 축구공. rot 0~3 은 90° 씩 돈 모습 — 회전을 그림을 돌려서 하면 픽셀이 뭉개지므로
 * 무늬 위치만 90° 단위로 돌린다.
 */
export function ballSprite(rot: number): Buf {
  const buf = makeBuf(BALL, BALL + 2);
  ell(buf, 4.5, BALL + 0.4, 3.6, 1.2, C.shadow, 70);
  ellO(buf, 4.5, 4.5, 3.2, 3.2, '#FFFFFF', '#5A6472');
  ell(buf, 3.9, 3.9, 1.6, 1.4, '#FFFFFF');
  ell(buf, 5.4, 5.4, 2.2, 2.2, '#DDE3EA', 200);
  // 검은 오각형 무늬 — 가운데 하나와 바깥 하나가 돌아간다
  const r = ((rot % 4) + 4) % 4;
  const off: P[] = [[0, -2.4], [2.4, 0], [0, 2.4], [-2.4, 0]];
  px(buf, 4.5, 4.5, '#2B2F36');
  px(buf, 4.5 + 0.6, 4.5, '#2B2F36');
  px(buf, 4.5, 4.5 + 0.6, '#2B2F36');
  const o = off[r];
  px(buf, 4.5 + o[0], 4.5 + o[1], '#2B2F36');
  const o2 = off[(r + 2) % 4];
  px(buf, 4.5 + o2[0] * 0.8, 4.5 + o2[1] * 0.8, '#5A6472');
  return buf;
}

/** 보행기 스프라이트 크기. 발밑 기준점은 아래 가운데. */
export const WALKER_W = 18;
export const WALKER_H = 16;

/**
 * 카트형 보행기 — 나무 틀, 알록달록 블록 칸, 바퀴 넷, 아기 쪽 손잡이.
 * side 는 오른쪽으로 미는 모습(손잡이가 왼쪽), down 은 이쪽으로 오는 모습(손잡이가 먼 쪽 = 위),
 * up 은 멀어지는 모습(손잡이가 가까운 쪽 = 아래).
 */
export function walkerSprite(facing: Facing): Buf {
  const buf = makeBuf(WALKER_W, WALKER_H);
  const wood = C.wood;
  const woodD = C.woodDark;
  const line = C.woodLine;
  const wheel = (x: number, y: number) => ellO(buf, x, y, 1.4, 1.4, '#E25D5D', '#7A2E2E');
  ell(buf, WALKER_W / 2, WALKER_H - 1, 8, 1.4, C.shadow, 60);
  if (facing === 'side') {
    // 수레 몸통
    rect(buf, 4, 8, 13, 5, line);
    rect(buf, 5, 9, 11, 3, wood);
    rect(buf, 5, 11, 11, 1, woodD);
    // 블록 칸
    rect(buf, 6, 6, 3, 3, '#F6C445');
    rect(buf, 9, 6, 3, 3, '#5DB0E2');
    rect(buf, 12, 6, 3, 3, '#E25D5D');
    // 손잡이 기둥과 가로대
    rect(buf, 3, 2, 2, 10, line);
    rect(buf, 2, 1, 4, 2, line);
    rect(buf, 3, 3, 1, 8, wood);
    wheel(6.5, 13.5);
    wheel(14.5, 13.5);
    return buf;
  }
  const handleTop = facing === 'down';
  const bodyY = handleTop ? 7 : 3;
  rect(buf, 2, bodyY, 14, 6, line);
  rect(buf, 3, bodyY + 1, 12, 4, wood);
  rect(buf, 3, bodyY + 4, 12, 1, woodD);
  rect(buf, 4, bodyY - 2, 3, 3, '#F6C445');
  rect(buf, 7.5, bodyY - 2, 3, 3, '#5DB0E2');
  rect(buf, 11, bodyY - 2, 3, 3, '#E25D5D');
  // 손잡이 가로대 — 아기 쪽
  const hy = handleTop ? 2 : 11;
  rect(buf, 2, hy, 14, 2, line);
  rect(buf, 3, hy, 12, 1, wood);
  rect(buf, 2, Math.min(hy, bodyY), 2, Math.abs(hy - bodyY) + 2, line);
  rect(buf, 14, Math.min(hy, bodyY), 2, Math.abs(hy - bodyY) + 2, line);
  wheel(3.5, WALKER_H - 2);
  wheel(14.5, WALKER_H - 2);
  return buf;
}

// ───────────────────────── 기록 반응 ─────────────────────────

/** 홈 기록 버튼과 같은 id. 기록을 저장하면 아기가 이 행동을 한 번 보여 준다. */
export type RecordId =
  | 'formula' | 'breast' | 'pumped' | 'pumping' | 'babyfood' | 'sleep' | 'diaper' | 'bath'
  | 'temperature' | 'medication' | 'water' | 'milk' | 'snack' | 'play' | 'hospital' | 'etc';

/** 기저귀 기록의 종류 — 앱 기록의 소변(PEE)·대변(POO)·둘 다(BOTH) */
export type DiaperVariant = 'PEE' | 'POO' | 'BOTH';

export type RecordReaction = { key: string; id: RecordId; variant?: DiaperVariant; label: string; note: string };

export const RECORD_REACTIONS: RecordReaction[] = [
  { key: 'formula', id: 'formula', label: '분유수유', note: '두 손으로 분홍 뚜껑 젖병을 잡고 쪽쪽 빤다. 분유가 줄어든다.' },
  { key: 'breast', id: 'breast', label: '모유수유', note: '초승달 수유 쿠션에 기대 누워(옆모습) 졸린 눈으로 오물오물. 다 먹으면 일으켜 앉아 엄마 손이 토닥토닥, 꺼억 트림하고 볼이 빵빵해진다.' },
  { key: 'pumped', id: 'pumped', label: '유축수유', note: '노란 뚜껑 젖병의 모유(살짝 노르스름)를 빤다.' },
  { key: 'pumping', id: 'pumping', label: '유축', note: '옆에 놓인 깔때기 유축병에 모유가 방울방울 차오른다. 아기는 손뼉으로 응원한다.' },
  { key: 'babyfood', id: 'babyfood', label: '이유식', note: '무릎의 그릇에서 숟가락으로 떠서 아 하고 먹는다.' },
  { key: 'sleep', id: 'sleep', label: '수면', note: '이불을 덮고 새근새근 잔다. 자는 중이라 기뻐하는 동작은 없다.' },
  { key: 'diaper-pee', id: 'diaper', variant: 'PEE', label: '기저귀 · 소변', note: '노랗게 젖은 기저귀에 노란 방울이 뜨다가, 하얀 새 기저귀로 바뀌고 반짝인다.' },
  { key: 'diaper-poo', id: 'diaper', variant: 'POO', label: '기저귀 · 대변', note: '갈색으로 더러워진 기저귀에 똥과 냄새선이 뜨다가, 새 기저귀로 바뀌고 반짝인다.' },
  { key: 'diaper-both', id: 'diaper', variant: 'BOTH', label: '기저귀 · 둘 다', note: '노란 방울과 똥이 번갈아 뜨다가 새 기저귀로 바뀐다.' },
  { key: 'bath', id: 'bath', label: '목욕', note: '욕조에 앉아 물을 첨벙첨벙. 거품과 오리 인형이 떠 있다.' },
  { key: 'temperature', id: 'temperature', label: '체온', note: '귀에 귀체온계를 대면 머리 위 체온계 눈금이 오르고, 다 재면 화면이 초록으로 반짝인다.' },
  { key: 'medication', id: 'medication', label: '투약', note: '옆에 갈색 약병. 주사기로 물약을 먹고 써서 혀를 빼물고 부르르 떤다.' },
  { key: 'water', id: 'water', label: '물', note: '빨대컵(파랑)으로 물을 홀짝인다.' },
  { key: 'milk', id: 'milk', label: '우유', note: '빨대컵(하양)으로 우유를 홀짝인다.' },
  { key: 'snack', id: 'snack', label: '간식', note: '쿠키를 입에 가져가 오물오물. 부스러기가 떨어진다.' },
  { key: 'play', id: 'play', label: '놀이', note: '딸랑이를 흔들며 논다. 음표가 떠오른다.' },
  { key: 'hospital', id: 'hospital', label: '병원', note: '이마에 X 반창고, 팔에도 반창고. 십자 표시 아래 울다가 씩씩하게 만세(반창고는 그대로).' },
  { key: 'etc', id: 'etc', label: '기타', note: '손을 흔들어 인사한다.' },
];

/** 행동 12장 + 기뻐하기 4장. 6fps 로 약 2.7초 — 홈 저장 토스트(2.5초)와 맞춘다. */
export const RECORD_FRAMES = 16;
export const RECORD_FPS = 6;
const ACT_FRAMES = 12;

type Side = -1 | 1;
type RecordBody = { hc: P; hip: P; chest: P; mouth: [number, number]; sh: (s: Side) => P; lie: boolean };

/**
 * 기록 반응의 몸 — 팔을 뺀 정면 자세를 그리고 관절 자리를 돌려준다. 팔은 소품을 그린 뒤 위에 얹는다.
 *   sit 앉기(다리 V 자) · lie 위에서 본 누운 아기(앉지 못하는 개월, 기저귀)
 * tub 이면 몸 아래쪽을 욕조로 가린다.
 */
function recordBody(
  k: Ctx,
  lie: boolean,
  o: {
    bounce?: number;
    sway?: number;
    kick?: (s: Side) => number;
    tub?: boolean;
    behind?: (b: RecordBody) => void;
    /** 몸보다 먼저(아래에) 그릴 것 — 누운 아기 밑의 수유 쿠션 */
    under?: () => void;
  } = {},
): RecordBody {
  const { m } = k;
  o.under?.();
  let hip: P;
  let chest: P;
  let hc: P;
  if (lie) {
    chest = [CX, G - 18];
    hip = [CX, G - 18 + m.torso + 1.5];
    ell(k.buf, CX, G - 14, 11, 9, C.shadow, 44);
    for (const s of [-1, 1] as Side[]) {
      const kick = o.kick?.(s) ?? 0.3;
      const hj: P = [CX + s * 2.1, hip[1] + 1.4];
      const knee = add(hj, s * (3.4 - 1.6 * kick), 2.3 + 1.4 * kick);
      leg(k, hj, knee, add(knee, s * (-1.7 + 1.9 * kick), 2.6 + 1.0 * kick), null);
    }
    torso(k, hip, chest, 'down');
    hc = [CX, chest[1] - m.chestR * 0.5 - m.headR * 0.8];
  } else {
    const bounce = o.bounce ?? 0;
    hip = [CX, G - 3.4 + bounce];
    chest = [CX + (o.sway ?? 0), hip[1] - m.torso];
    shadow(k, CX, o.tub ? 12 : 10);
    torso(k, hip, chest, 'down');
    for (const s of [-1, 1]) {
      const hj: P = [CX + s * 2.0, G - 2.4 + bounce];
      const knee: P = [CX + s * 4.5, G - 0.4];
      const ankle: P = [CX + s * 6.4, G + 1.2];
      limb(k.buf, [hj, knee, ankle], [m.rTh, m.rKn, m.rAn], LIMB);
      sole(k, add(ankle, s * 0.6, 0.6));
    }
    hc = headOn(k, chest, 0);
  }
  if (o.tub) bathtub(k, hip);
  const mouth: [number, number] = [Math.round(hc[0] - SD_HEAD_C.down[0]) + 7, Math.round(hc[1] - SD_HEAD_C.down[1]) + 11];
  const sh = (s: Side): P =>
    lie ? [CX + s * (m.chestR - 0.2), chest[1] + 0.6] : [chest[0] + s * (m.chestR - 0.2), chest[1] + 0.9];
  const b = { hc, hip, chest, mouth, sh, lie };
  // 머리 뒤로 가야 하는 것(번쩍 든 팔)은 머리보다 먼저 그린다 — 얼굴을 가리지 않게
  o.behind?.(b);
  neck(k, chest, hc);
  head(k, hc, 'down');
  return b;
}

/** 손목을 target 쪽으로 뻗는다. 닿지 않으면 닿는 만큼만. 실제 손목 자리를 돌려준다. */
function reach(k: Ctx, b: RecordBody, s: Side, target: P): { el: P; wr: P } {
  const sh = b.sh(s);
  const [el, wr] = ik(sh, target, k.m.ua, k.m.fa, s > 0 ? -1 : 1);
  arm(k, sh, el, wr);
  return { el, wr };
}

/** 쉬는 손 — 앉으면 무릎 위, 누우면 몸 옆으로 내려놓는다. */
function restHand(k: Ctx, b: RecordBody, s: Side) {
  if (b.lie) return reach(k, b, s, add(b.sh(s), s * 3, 3));
  return reach(k, b, s, [b.chest[0] + s * 2.2, b.chest[1] + k.m.chestR + 2.8]);
}

/** 감정·효과 아이콘. 글자 하나가 픽셀 하나. */
function icon(buf: Buf, rows: string[], colors: Record<string, string>, x: number, y: number, alpha = 255) {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  rows.forEach((row, yy) => {
    for (let xx = 0; xx < row.length; xx++) {
      const ch = row[xx];
      if (ch !== '.') px(buf, x0 + xx, y0 + yy, colors[ch], alpha);
    }
  });
}

const ICON = {
  heart: { rows: ['.KK.KK.', 'KRRKRRK', 'KRWRRRK', '.KRRRK.', '..KRK..', '...K...'], c: { K: '#9E2B3E', R: '#F2617A', W: '#FFFFFF' } },
  sparkle: { rows: ['..Y..', '..Y..', 'YYWYY', '..Y..', '..Y..'], c: { Y: '#FFC93A', W: '#FFFFFF' } },
  note: { rows: ['..KK', '..KW', '..K.', 'KKK.', 'KKK.'], c: { K: '#5A4A7A', W: '#5A4A7A' } },
  drop: { rows: ['.B.', 'BWB', 'BBB', '.B.'], c: { B: '#59BFD6', W: '#DDF5FB' } },
  milkDrop: { rows: ['.L.', 'LWL', 'LWL', '.L.'], c: { L: '#A9AEB4', W: '#FFFFFF' } },
  sweat: { rows: ['.B', 'BB', 'BB'], c: { B: '#7FC8F0' } },
  pee: { rows: ['.Y.', 'YWY', 'YYY', '.Y.'], c: { Y: '#F2C230', W: '#FFF4B8' } },
  poo: {
    rows: ['...K....', '..KBK...', '.KBBBK..', '.KBBBBK.', 'KBWBBBBK', 'KBBBBBBK', '.KKKKKK.'],
    c: { K: '#5A3418', B: '#A0643A', W: '#D9A57A' },
  },
  cross: { rows: ['KKKKK', 'KWRWK', 'KRRRK', 'KWRWK', 'KKKKK'], c: { K: '#9AA6B4', W: '#FFFFFF', R: '#E25D5D' } },
} as const;

/** 아이콘을 띄울 자리 — 앉으면 머리 오른쪽 위, 누우면(위에서 본 모습) 머리 오른쪽 옆. */
function emoteAt(b: RecordBody): P {
  return b.lie ? [b.hc[0] + 8, b.hc[1] - 6] : [b.hc[0] + 5, b.hc[1] - 14];
}

function emote(k: Ctx, b: RecordBody, kind: keyof typeof ICON, rise = 0, alpha = 255) {
  const at = emoteAt(b);
  icon(k.buf, ICON[kind].rows as unknown as string[], ICON[kind].c, at[0], Math.max(0, at[1] - rise), alpha);
}

/** 젖병 — 젖꼭지를 입에 물고 몸 앞으로 세운다. level 은 남은 양 0~1. */
function bottle(k: Ctx, mouth: [number, number], level: number, milk: string, cap: string, capDark: string) {
  const { buf } = k;
  const [mx, my] = mouth;
  rect(buf, mx - 2, my + 3, 6, 7, '#7D8FA6');
  rect(buf, mx - 1, my + 3, 4, 6, '#EAF2FA');
  const lvl = Math.max(1, Math.round(6 * level));
  rect(buf, mx - 1, my + 9 - lvl, 4, lvl, milk);
  rect(buf, mx + 2, my + 4, 1, 4, '#C7D3E0');
  px(buf, mx - 1, my + 4, '#FFFFFF');
  rect(buf, mx - 2, my + 1, 6, 2, cap);
  rect(buf, mx - 2, my + 2, 6, 1, capDark);
  rect(buf, mx, my - 1, 2, 2, '#F0C27B');
  px(buf, mx, my - 1, '#FFE2A8');
}

/** 빨대컵 — 빨대 끝을 입에 물고 손잡이 둘을 잡는다. */
function sippyCup(k: Ctx, mouth: [number, number], dy: number, body: string, liquid: string, cap: string) {
  const { buf } = k;
  const mx = mouth[0];
  const my = mouth[1] + dy;
  rect(buf, mx, my - 1, 2, 2, cap);
  rect(buf, mx - 3, my + 1, 8, 2, '#4A5A70');
  rect(buf, mx - 2, my + 1, 6, 1, cap);
  rect(buf, mx - 3, my + 3, 8, 6, '#7D8FA6');
  rect(buf, mx - 2, my + 3, 6, 5, body);
  rect(buf, mx - 2, my + 5, 6, 3, liquid);
  px(buf, mx - 2, my + 4, '#FFFFFF');
  rect(buf, mx - 4, my + 4, 1, 3, '#7D8FA6');
  rect(buf, mx + 5, my + 4, 1, 3, '#7D8FA6');
}

/** 욕조 — 아기 엉덩이 높이부터 바닥까지 앞을 가린다. 테두리에 거품. */
function bathtub(k: Ctx, hip: P) {
  const { buf } = k;
  const top = Math.round(hip[1] - 1);
  rect(buf, CX - 12, top - 1, 24, G + 3 - top, '#2F5F80');
  rect(buf, CX - 11, top, 22, G + 1 - top, '#7CC3E8');
  rect(buf, CX - 11, top, 22, 1, '#CDEBFA');
  rect(buf, CX - 11, G, 22, 1, '#5FA0C8');
}

function tubTop(b: RecordBody) {
  return Math.round(b.hip[1] - 1);
}

function bubbles(k: Ctx, top: number, ph: number) {
  for (const [dx, r, off] of [[-9, 1.6, 0], [-6, 1.2, 1.3], [5, 1.4, 2.1], [8, 1.1, 0.7]] as const) {
    const y = top - 0.6 + 0.4 * Math.sin(ph + off);
    ellO(k.buf, CX + dx, y, r, r, '#FFFFFF', '#A9D3EA');
  }
}

function duck(k: Ctx, top: number, ph: number) {
  const x = CX + 9;
  const y = top - 2 + Math.round(0.5 + 0.5 * Math.sin(ph));
  ellO(k.buf, x, y + 1, 2.4, 1.5, '#FFD54A', '#B9852A');
  ellO(k.buf, x + 1.5, y - 1, 1.3, 1.3, '#FFD54A', '#B9852A');
  px(k.buf, x + 3, y - 1, '#F08A2E');
  px(k.buf, x + 1.5, y - 1.5, '#2B1A1D');
}

/** 트림 수건 — 오른 어깨에 걸친다. 하늘색 줄무늬. */
function burpCloth(k: Ctx, b: RecordBody) {
  const sh = b.sh(1);
  rect(k.buf, sh[0] - 2, sh[1] - 2, 5, 7, '#5C7FA6');
  rect(k.buf, sh[0] - 1, sh[1] - 1, 3, 5, '#FFFFFF');
  rect(k.buf, sh[0] - 1, sh[1], 3, 1, '#7FB8E6');
  rect(k.buf, sh[0] - 1, sh[1] + 2, 3, 1, '#7FB8E6');
}

const CUSHION = { fill: '#A8DCC8', light: '#CDEEE1', line: '#4F8F78' };

/** 수유 쿠션(앉은 아기) — 허리를 감싸는 도넛형 쿠션의 앞쪽 둘레. 흰 물방울무늬. */
function cushionFront(k: Ctx, b: RecordBody) {
  const { buf } = k;
  const [hx, hy] = b.hip;
  ellO(buf, hx, hy + 1.5, 10, 3.2, CUSHION.fill, CUSHION.line);
  ell(buf, hx - 1, hy + 0.8, 8, 1.4, CUSHION.light);
  for (const dx of [-7, -3, 2, 6]) px(buf, hx + dx, hy + 2 + (dx % 2 ? 0 : 1), '#FFFFFF');
}

/** 수유 쿠션(누운 아기) — 위에서 본 쿠션. 아기 몸 밑에 깔린다. */
function cushionUnder(k: Ctx) {
  const { buf } = k;
  const cy = G - 12;
  ellO(buf, CX, cy, 12, 9, CUSHION.fill, CUSHION.line);
  ell(buf, CX, cy - 1, 8, 6, CUSHION.light);
  for (const [dx, dy] of [[-10, 0], [-7, 6], [7, 6], [10, -1], [0, 8]]) px(buf, CX + dx, cy + dy, '#FFFFFF');
}

/**
 * 수유 쿠션에 기대 누운 아기(옆모습, 오른쪽을 본다). 등 뒤로 초승달 쿠션이 받치고
 * 다리는 앞으로 뻗고, 두 손은 배 위에서 꼼지락거린다. 머리와 입 자리를 돌려준다.
 */
function reclineNurse(k: Ctx, ph: number): { hc: P; mouth: [number, number] } {
  const { m, buf } = k;
  const back = 40;
  const hip: P = [CX - 2, G - 1 - m.bodyR * 0.7];
  const chest = pol(hip, -90 - back, m.torso);
  const hc = headOn(k, chest, -back * 0.45);
  shadow(k, CX - 1, 13);

  // 쿠션 — 등과 머리 뒤를 따라 놓인 캡슐. 몸보다 먼저 그린다.
  const d = dir(hip, chest);
  const n: P = [d[1], -d[0]];
  const cush: Tone = { light: CUSHION.light, dark: CUSHION.fill, line: CUSHION.line };
  const p0 = add(hip, n[0] * 3.4 + 1.5, Math.min(n[1] * 3.4 - 0.5, G - 4 - hip[1]));
  const p1 = add(mix(hip, chest, 0.6), n[0] * 3.8, n[1] * 3.8);
  const p2 = add(hc, n[0] * 5 + 0.5, n[1] * 5 + 1.5);
  limb(buf, [p0, p1, p2], [3.6, 4.4, 4.2], cush);
  for (const p of [mix(p0, p1, 0.5), p1, mix(p1, p2, 0.6)]) px(buf, p[0] - 1, p[1] - 1, '#FFFFFF');

  const legOf = (far: boolean) => {
    const hj = add(hip, far ? 0.8 : 0, far ? -0.6 : 0.4);
    const knee: P = [hj[0] + m.thigh + 0.4, G - 2.6 + (far ? -0.6 : 0)];
    const ankle: P = [knee[0] + m.shin * 0.95, G - 1.5 + (far ? -0.6 : 0)];
    leg(k, hj, knee, ankle, pol(ankle, -75, m.foot), far);
  };
  const belly = mix(hip, chest, 0.45);
  const armOf = (far: boolean) => {
    const sh = add(chest, far ? 0.8 : 0, far ? 0.2 : 1.0);
    const wiggle = Math.sin(ph * 2 + (far ? 1.5 : 0)) * 0.7;
    const target: P = far ? [chest[0] + 3.2, chest[1] + 1.2 + wiggle] : [belly[0] + 3.4, belly[1] + 0.6 + wiggle];
    const [el, wr] = ik(sh, target, m.ua, m.fa, 1);
    arm(k, sh, el, wr, far);
  };
  armOf(true);
  legOf(true);
  torso(k, hip, chest, 'side');
  legOf(false);
  neck(k, chest, hc);
  head(k, hc, 'side');
  armOf(false);
  const left = Math.round(hc[0] - SD_HEAD_C.side[0]);
  const top = Math.round(hc[1] - SD_HEAD_C.side[1]);
  return { hc, mouth: [left + 13, top + 11] };
}

/** 엄마 손 — 화면 오른쪽에서 소매째 들어와 아기 등(어깨)을 토닥인다. pat 0~1 은 손을 든 높이. */
function momHand(k: Ctx, b: RecordBody, pat: number) {
  const { buf } = k;
  const sh = b.sh(1);
  // 손은 어깨 위에 얹히고, 팔은 오른쪽 위(아기를 안은 엄마 쪽)에서 비스듬히 내려온다
  const hand: P = [sh[0] + 1.5, sh[1] - 2.5 - pat * 2];
  const wrist: P = [hand[0] + 3, hand[1] - 2.5];
  const elbow: P = [hand[0] + 10, hand[1] - 11];
  taper(buf, elbow, wrist, 2.7, 2.1, '#6E5898');
  taper(buf, elbow, wrist, 2.0, 1.4, '#B9A6DE');
  ell(buf, wrist[0], wrist[1], 1.9, 1.6, '#E9E1F7');
  // 손등과 손가락 — 손끝이 아기 쪽(왼쪽 아래)을 향한다
  ellO(buf, hand[0], hand[1], 2.8, 2.1, C.skin, C.skinLine);
  for (let f = 0; f < 3; f++) px(buf, hand[0] - 2.5 + f, hand[1] + 1.5, C.skinDark);
  px(buf, hand[0] + 0.5, hand[1] - 1, '#FFE3CC');
  if (pat < 0.3) {
    // 토닥 — 손 양옆으로 짧은 선
    for (const [dx, dy] of [[-4.5, -1], [-5, 1], [4, 1.5]]) px(buf, hand[0] + dx, hand[1] + dy, '#9AA6B4');
  }
}

/** 깔때기 유축병 — 아기 오른쪽 바닥. 깔때기 목에서 모유가 한 방울씩 떨어져 차오른다. level 0~1. */
function pumpBottle(k: Ctx, level: number, i: number) {
  const { buf } = k;
  const x = CX + 13;
  const base = G + 1;
  ell(buf, x + 0.5, base + 0.5, 4, 1, C.shadow, 60);
  rect(buf, x - 3, base - 8, 7, 8, '#6F87A3');
  rect(buf, x - 2, base - 8, 5, 7, '#EAF2FA');
  const lvl = Math.round(1 + 5 * level);
  rect(buf, x - 2, base - 1 - lvl, 5, lvl, '#FFF1CF');
  px(buf, x - 2, base - 7, '#FFFFFF');
  rect(buf, x - 3, base - 10, 7, 2, '#FFC951');
  rect(buf, x - 3, base - 9, 7, 1, '#D9A23A');
  // 깔때기 — 위로 갈수록 넓어진다
  for (let r = 0; r < 4; r++) {
    const w = 3 + r * 2;
    const y = base - 11 - r;
    rect(buf, x - Math.floor(w / 2) - 1, y, w + 2, 1, '#6F87A3');
    if (r < 3) rect(buf, x - Math.floor(w / 2), y, w, 1, '#DDEAF5');
  }
  // 유축기로 이어지는 관
  taper(buf, [x + 3, base - 15], [x + 5, base - 26], 0.5, 0.5, '#BFD3E6');
  if (level < 1) px(buf, x, base - 8 + (i % 3) * 2, '#E9C27A');
}

/** 기저귀 — 누운 아기 엉덩이를 덮는다. 더러운 쪽은 색이 바래고 얼룩이 있다. */
function diaperOn(k: Ctx, b: RecordBody, state: DiaperVariant | 'clean') {
  const { buf } = k;
  const [hx, hy] = b.hip;
  const fill = state === 'PEE' ? '#FFEFA8' : state === 'POO' ? '#E8CFAE' : state === 'BOTH' ? '#F0DCA6' : '#FFFFFF';
  ellO(buf, hx, hy + 0.8, 4.4, 3.0, fill, '#8A96A6');
  rect(buf, hx - 4.5, hy - 1.5, 2, 2, '#7FB8E6');
  rect(buf, hx + 2.5, hy - 1.5, 2, 2, '#7FB8E6');
  if (state === 'PEE' || state === 'BOTH') ell(buf, hx - 1, hy + 1.5, 1.5, 1, '#EBC13C');
  if (state === 'POO' || state === 'BOTH') ell(buf, hx + 1, hy + 1.2, 1.2, 1, '#A0643A');
  if (state === 'clean') px(buf, hx, hy + 0.5, '#BFD9F2');
}

/** 귀체온계 — 오른쪽 귀에 대고 머리 옆을 따라 손잡이가 내려온다. 손잡이 아래 끝을 돌려준다. */
function earThermo(k: Ctx, b: RecordBody, screen: string): P {
  const { buf } = k;
  const x = Math.round(b.hc[0] + 8);
  const y = Math.round(b.hc[1] + 1);
  rect(buf, x - 1, y - 1, 2, 2, '#7D8FA6');
  px(buf, x - 1, y - 1, '#E8ECF1');
  rect(buf, x, y - 2, 4, 10, '#7D8FA6');
  rect(buf, x + 1, y - 1, 2, 8, '#F4F6F8');
  rect(buf, x + 1, y, 2, 2, screen);
  return [x + 1.5, y + 8];
}

/** 머리 위 체온계 — 빨간 눈금이 level(0~1)까지 오른다. */
function thermoIcon(k: Ctx, b: RecordBody, level: number) {
  const { buf } = k;
  const [ex, ey] = emoteAt(b);
  const x = Math.round(ex);
  const x0 = x + 2;
  const y = Math.max(0, Math.round(ey - 5));
  thermoAt(buf, x0, y, level);
}

function thermoAt(buf: Buf, x: number, y: number, level: number) {
  rect(buf, x, y, 3, 8, '#7D8FA6');
  rect(buf, x + 1, y + 1, 1, 6, '#FFFFFF');
  const h = Math.round(6 * level);
  if (h > 0) rect(buf, x + 1, y + 7 - h, 1, h, '#E25D5D');
  ellO(buf, x + 1.5, y + 8.5, 1.4, 1.4, '#E25D5D', '#9E2B3E');
  for (let d = 2; d < 7; d += 2) px(buf, x + 3, y + d, '#7D8FA6');
}

/** 갈색 약병 — 흰 라벨에 빨간 십자. (x, base) 는 바닥에 닿는 아래 가운데. */
function medicineBottle(k: Ctx, x: number, base: number) {
  const { buf } = k;
  ell(buf, x + 0.5, base + 0.5, 4, 1, C.shadow, 60);
  rect(buf, x - 3, base - 9, 7, 9, '#6E3A1A');
  rect(buf, x - 2, base - 8, 5, 7, '#C0773A');
  rect(buf, x - 2, base - 6, 5, 3, '#FFFFFF');
  rect(buf, x, base - 6, 1, 3, '#E25D5D');
  rect(buf, x - 1, base - 5, 3, 1, '#E25D5D');
  rect(buf, x - 2, base - 12, 5, 3, '#7D8FA6');
  rect(buf, x - 1, base - 11, 3, 1, '#FFFFFF');
}

/** 이마 X 반창고 — 머리 오른쪽 위에 엇갈려 붙인다. */
function foreheadAid(k: Ctx, b: RecordBody) {
  const left = Math.round(b.hc[0] - SD_HEAD_C.down[0]);
  const top = Math.round(b.hc[1] - SD_HEAD_C.down[1]);
  icon(
    k.buf,
    ['KK...KK', 'KBK.KBK', '.KBKBK.', '..KPK..', '.KBKBK.', 'KBK.KBK', 'KK...KK'],
    { K: '#7A4A24', B: '#FBE2BE', P: '#E0A46A' },
    left + 8,
    top,
  );
}

/** 기뻐하기 — 웃는 눈으로 두 팔을 번쩍 들고 콩콩, 머리 위로 하트가 떠오른다. */
function cheer(k: Ctx, id: RecordId, lie: boolean, j: number) {
  const up = j % 2 === 0;
  k.face = 'happy';
  // 모유수유는 배불러 빵빵한 볼 그대로 기뻐한다
  k.chubby = id === 'breast';
  const len = k.m.ua + k.m.fa;
  const b = recordBody(k, lie, {
    under: id === 'breast' && lie ? () => cushionUnder(k) : undefined,
    bounce: up ? -0.8 : 0,
    kick: (s) => (up === (s > 0) ? 0.7 : 0.2),
    tub: id === 'bath',
    // 만세 — 팔을 양옆 위로 벌린다. 머리 뒤에 그려 손이 얼굴을 덮지 않는다.
    behind: (bb) => {
      for (const s of [-1, 1] as Side[]) {
        const sh = bb.sh(s);
        reach(k, bb, s, [sh[0] + s * len * 0.9, sh[1] - len * (up ? 0.6 : 0.3)]);
      }
    },
  });
  if (id === 'bath') {
    bubbles(k, tubTop(b), j);
    duck(k, tubTop(b), j);
  }
  // 그 기록이 무엇이었는지 알 수 있게 소품은 기뻐하는 동안에도 남긴다
  if (id === 'diaper') diaperOn(k, b, 'clean');
  if (id === 'breast' && !lie) cushionFront(k, b);
  if (id === 'pumping') pumpBottle(k, 1, j);
  if (id === 'medication') medicineBottle(k, CX - 13, G + 1);
  if (id === 'hospital') foreheadAid(k, b);
  emote(k, b, 'heart', j, j === 3 ? 150 : 255);
}

function recordFrame(k: Ctx, id: RecordId, i: number, variant: DiaperVariant) {
  const { m } = k;
  if (id === 'sleep') {
    k.blink = true;
    lying(k, (i / RECORD_FRAMES) * Math.PI * 2, true);
    return;
  }
  // 앉지 못하는 개월은 누워서 한다. 목욕은 받쳐 앉히고, 기저귀는 늘 누워서 간다.
  const lie = id === 'diaper' || (k.months < 5 && id !== 'bath');
  if (i >= ACT_FRAMES) return cheer(k, id, lie, i - ACT_FRAMES);
  const t = i / ACT_FRAMES;
  const ph = t * Math.PI * 4; // 행동을 두 번 되풀이한다
  const wave = 0.5 - 0.5 * Math.cos(ph);

  switch (id) {
    case 'formula':
    case 'pumped': {
      k.mouth = 'none';
      const b = recordBody(k, lie);
      const suck = i % 2;
      const mouth: [number, number] = [b.mouth[0], b.mouth[1] + suck];
      // 손이 젖병 양옆을 감싼다. 팔을 먼저 그리고 젖병을 위에 얹어야 젖병이 보인다.
      for (const s of [-1, 1] as Side[]) reach(k, b, s, [mouth[0] + (s < 0 ? -3.6 : 4.6), mouth[1] + 6]);
      if (id === 'formula') bottle(k, mouth, 1 - t * 0.75, '#FFFFFF', '#F59AB0', '#D8799E');
      else bottle(k, mouth, 1 - t * 0.75, '#FFF1CF', '#FFC951', '#D9A23A');
      return;
    }
    case 'breast': {
      // 수유(0~5) → 엄마가 토닥토닥(6~9) → 꺼억 트림(10~11)
      const stage = i < 6 ? 'nurse' : i < 10 ? 'pat' : 'burp';
      k.face = stage === 'nurse' ? 'sleepy' : undefined;
      k.mouth = stage === 'burp' ? 'open' : stage === 'nurse' && i % 2 ? 'open' : 'none';
      k.chubby = stage === 'burp';
      if (stage === 'nurse') {
        // 쿠션에 기대 누워 먹는다 — 옆모습이라야 뒤로 기댄 게 보인다
        const r = reclineNurse(k, ph);
        px(k.buf, r.mouth[0] + 1, r.mouth[1] + 1, '#FFFFFF');
        const at: P = [r.hc[0] + 5, r.hc[1] - 14];
        const ic = i % 4 < 2 ? ICON.milkDrop : ICON.heart;
        icon(k.buf, ic.rows as unknown as string[], ic.c, at[0], Math.max(0, at[1] - (i % 2)), i % 4 < 2 ? 255 : 170);
        return;
      }
      const b = recordBody(k, lie, { under: lie ? () => cushionUnder(k) : undefined });
      if (!lie) cushionFront(k, b);
      // 다 먹으면 일으켜 앉힌다. 손은 쿠션 위에.
      for (const s of [-1, 1] as Side[]) {
        reach(k, b, s, lie ? add(b.sh(s), s * 3, 2) : [b.hip[0] + s * 4.5, b.hip[1] - 1.5]);
      }
      const my = b.mouth[1];
      if (stage === 'pat') {
        burpCloth(k, b);
        momHand(k, b, i % 2 ? 1 : 0);
      } else {
        // 꺼억 — 입 옆으로 공기방울이 커지며 올라간다
        const n = i - 10;
        ellO(k.buf, b.hc[0] + 9 + n, my - 2 - n * 2, 1.6 + n * 0.6, 1.6 + n * 0.6, '#FFFFFF', '#A9AEB4');
        px(k.buf, b.hc[0] + 8.5 + n, my - 2.5 - n * 2, '#E6F3FB');
      }
      return;
    }
    case 'pumping': {
      const b = recordBody(k, lie);
      const open = 0.5 + 0.5 * Math.cos(ph * 1.5);
      for (const s of [-1, 1] as Side[]) {
        reach(k, b, s, [b.chest[0] + s * (0.9 + 2.8 * open), b.chest[1] + m.chestR + (lie ? 0 : 1.2)]);
      }
      pumpBottle(k, t, i);
      return;
    }
    case 'babyfood': {
      const bowl: P = lie ? [CX + 9, G - 10] : [CX, G - 1.5];
      const pre = b0(k, lie);
      const toMouth: P = [pre.mouth[0] + 1, pre.mouth[1] + 0.5];
      k.mouth = wave > 0.6 ? 'open' : 'none';
      const b = recordBody(k, lie);
      ellO(k.buf, bowl[0], bowl[1], 4.5, 2.2, '#F7B267', '#9C5A2A');
      ell(k.buf, bowl[0], bowl[1] - 0.8, 3.3, 1.0, '#FBE38E');
      ell(k.buf, bowl[0], bowl[1] + 1, 3.6, 0.8, '#D98A45');
      reach(k, b, -1, [bowl[0] - 4, bowl[1]]);
      const spoon = mix([bowl[0] + 1, bowl[1] - 1], toMouth, wave);
      const wr = add(spoon, 2, 2.4);
      reach(k, b, 1, wr);
      taper(k.buf, spoon, wr, 0.45, 0.45, '#9AA6B4');
      ellO(k.buf, spoon[0], spoon[1], 1.2, 0.9, '#DDE3EA', '#7D8FA6');
      if (wave < 0.85) px(k.buf, spoon[0], spoon[1] - 0.5, '#F2B33D');
      return;
    }
    case 'diaper': {
      const clean = t >= 0.5;
      k.mouth = clean ? 'smile' : 'open';
      const b = recordBody(k, true, { kick: (s) => Math.max(0, Math.sin(ph * 1.5 + (s > 0 ? 0 : Math.PI))) });
      diaperOn(k, b, clean ? 'clean' : variant);
      for (const s of [-1, 1] as Side[]) {
        const sh = b.sh(s);
        reach(k, b, s, [sh[0] + s * 3.6, sh[1] - 2 + Math.sin(ph * 2 + (s > 0 ? 0 : 1.7)) * 1.2]);
      }
      if (!clean) {
        // 둘 다면 방울과 똥을 번갈아 띄운다
        const show = variant === 'BOTH' ? (Math.floor(i / 3) % 2 ? 'poo' : 'pee') : variant === 'POO' ? 'poo' : 'pee';
        emote(k, b, show, i % 2);
        if (show === 'poo') {
          // 냄새선 — 엉덩이 양옆에서 꼬불꼬불 올라간다
          for (const s of [-1, 1]) {
            for (let d = 0; d < 4; d++) px(k.buf, b.hip[0] + s * 7 + ((d + i) % 2), b.hip[1] + 1 - d, '#8DBF6A');
          }
        }
      } else {
        const sp = ICON.sparkle;
        if (i % 2) icon(k.buf, sp.rows as unknown as string[], sp.c, b.hip[0] + 5, b.hip[1] - 1);
        else icon(k.buf, sp.rows as unknown as string[], sp.c, b.hip[0] - 9, b.hip[1] + 1);
      }
      return;
    }
    case 'bath': {
      const b = recordBody(k, lie, { tub: true });
      const top = tubTop(b);
      bubbles(k, top, ph);
      for (const s of [-1, 1] as Side[]) {
        const hit = Math.max(0, Math.sin(ph * 1.5 + (s > 0 ? 0 : Math.PI)));
        const { wr } = reach(k, b, s, [CX + s * 5, top - 3 + hit * 3]);
        if (hit > 0.8) {
          // 첨벙 — 손 둘레로 물방울이 튄다
          for (const [dx, dy] of [[-2, -2], [0, -3], [2, -2]]) px(k.buf, wr[0] + dx, top + dy - 1, '#59BFD6');
        }
      }
      duck(k, top, ph);
      return;
    }
    case 'temperature': {
      const done = t >= 0.7;
      const b = recordBody(k, lie);
      restHand(k, b, -1);
      // 손이 손잡이 끝을 받친다. 팔을 먼저 그려야 체온계가 손 위로 보인다.
      const grip: P = [b.hc[0] + 9.5, b.hc[1] + 9];
      reach(k, b, 1, grip);
      earThermo(k, b, done ? (i % 2 ? '#9FE0C8' : '#5FC79A') : '#4A5A70');
      thermoIcon(k, b, 0.15 + 0.5 * Math.min(1, t / 0.7));
      if (done) {
        const sp = ICON.sparkle;
        icon(k.buf, sp.rows as unknown as string[], sp.c, b.hc[0] + 12, b.hc[1] - 4);
      }
      return;
    }
    case 'medication': {
      const bitter = t >= 0.5;
      k.mouth = bitter ? 'tongue' : 'open';
      k.blink = bitter;
      const b = recordBody(k, lie, { sway: bitter ? (i % 2 ? 0.6 : -0.6) : 0 });
      medicineBottle(k, CX - 13, G + 1);
      restHand(k, b, -1);
      if (!bitter) {
        const [mx, my] = b.mouth;
        const off = (1 - Math.min(1, t / 0.3)) * 4;
        const tip: P = [mx + 1.5 + off, my + 0.5];
        const tail: P = [tip[0] + 6, tip[1] + 2];
        taper(k.buf, tip, tail, 1.3, 1.3, '#7D8FA6');
        taper(k.buf, tip, tail, 0.8, 0.8, t < 0.35 ? '#F7A8C8' : '#FBE0EC');
        reach(k, b, 1, add(tail, 0.5, 1.2));
      } else {
        restHand(k, b, 1);
        // 부르르 — 머리 양옆 떨림선
        for (const s of [-1, 1]) {
          for (let d = 0; d < 3; d++) px(k.buf, b.hc[0] + s * 10 + (i % 2) * s, b.hc[1] - 2 + d * 2, '#9AA6B4');
        }
        emote(k, b, 'sweat', i % 2);
      }
      return;
    }
    case 'water':
    case 'milk': {
      k.mouth = 'none';
      const b = recordBody(k, lie);
      const dy = i % 3 === 0 ? 1 : 0;
      for (const s of [-1, 1] as Side[]) reach(k, b, s, [b.mouth[0] + (s < 0 ? -4.6 : 5.6), b.mouth[1] + dy + 5.5]);
      if (id === 'water') sippyCup(k, b.mouth, dy, '#DDF2F8', '#9BD8EA', '#59BFD6');
      else sippyCup(k, b.mouth, dy, '#FFFFFF', '#F4F6F8', '#6A92EA');
      if (t > 0.5) emote(k, b, id === 'water' ? 'drop' : 'milkDrop', Math.round(wave));
      return;
    }
    case 'snack': {
      const pre = b0(k, lie);
      const lap: P = lie ? add(pre.sh(1), 3, 3) : [CX + 3, G - 4];
      const toMouth: P = [pre.mouth[0] + 1.5, pre.mouth[1] + 1];
      k.mouth = wave > 0.7 ? 'open' : i % 2 ? 'none' : 'open';
      const b = recordBody(k, lie);
      restHand(k, b, -1);
      const cookie = mix(lap, toMouth, wave);
      reach(k, b, 1, add(cookie, 1.4, 1.6));
      ellO(k.buf, cookie[0], cookie[1], 1.9, 1.9, '#D9A066', '#7A4A24');
      px(k.buf, cookie[0] - 0.6, cookie[1] - 0.6, '#6B3E26');
      px(k.buf, cookie[0] + 0.8, cookie[1] + 0.4, '#6B3E26');
      if (wave > 0.6) {
        // 부스러기
        for (const [dx, dy] of [[-1, 3], [1, 5], [0, 7]]) px(k.buf, toMouth[0] + dx, toMouth[1] + dy * (1 - wave) + 2, '#D9A066');
      }
      return;
    }
    case 'play': {
      k.mouth = 'smile';
      const b = recordBody(k, lie, { bounce: i % 2 ? -0.4 : 0 });
      const sh = b.sh(1);
      const wr: P = [sh[0] + 2.5 + Math.sin(ph * 2) * 1.6, sh[1] - 3];
      reach(k, b, 1, wr);
      const head2 = add(wr, 0.6, -3.4);
      taper(k.buf, wr, head2, 0.5, 0.5, '#F2C14E');
      ellO(k.buf, head2[0], head2[1] - 1, 2, 2, '#FF8FB1', '#B0466E');
      px(k.buf, head2[0] - 0.6, head2[1] - 1.8, '#FFFFFF');
      const sh2 = b.sh(-1);
      reach(k, b, -1, [sh2[0] - 2.2, sh2[1] - 2 + Math.sin(ph * 2 + 1.5)]);
      emote(k, b, 'note', Math.round(wave * 2));
      return;
    }
    case 'hospital': {
      const crying = t < 0.75;
      k.tear = crying;
      k.mouth = crying ? 'open' : 'none';
      const b = recordBody(k, lie);
      foreheadAid(k, b);
      const { el } = restHand(k, b, -1);
      const aid = mix(b.sh(-1), el, 0.6);
      // 반대 손으로 문지른다. 반창고는 손 위에 그려야 가려지지 않는다.
      reach(k, b, 1, add(aid, 1.6 + wave * 0.8, 1.2));
      rect(k.buf, aid[0] - 2, aid[1] - 1, 4, 2, '#7A4A24');
      rect(k.buf, aid[0] - 1.5, aid[1] - 1, 3, 2, '#F2C38B');
      px(k.buf, aid[0] - 0.5, aid[1] - 1, '#E0A46A');
      if (crying) emote(k, b, 'cross', i % 2);
      return;
    }
    case 'etc': {
      k.mouth = 'smile';
      const b = recordBody(k, lie);
      restHand(k, b, -1);
      const sh = b.sh(1);
      reach(k, b, 1, [sh[0] + 2.4 + Math.sin(ph * 1.5) * 1.8, sh[1] - (m.ua + m.fa) * 0.85]);
      if (i % 4 < 2) emote(k, b, 'sparkle');
      return;
    }
  }
}

/** 그리지 않고 자세 좌표만 — 소품 자리를 몸을 그리기 전에 알아야 할 때. */
function b0(k: Ctx, lie: boolean): RecordBody {
  return recordBody({ ...k, buf: makeBuf(W, H, RES) }, lie);
}

/** 기록 하나의 반응 프레임(RECORD_FRAMES 장)을 굽는다. 기록 반응은 앞모습만 있다. */
export function buildRecordFrames(id: RecordId, months: number, gender: Gender, variant: DiaperVariant = 'PEE'): Buf[] {
  const m = metrics(months);
  const pal = PAL[gender];
  return Array.from({ length: RECORD_FRAMES }, (_, i) => {
    const buf = makeBuf(W, H, RES);
    recordFrame({ buf, m, pal, gender, months, blink: false }, id, i, variant);
    return buf;
  });
}
