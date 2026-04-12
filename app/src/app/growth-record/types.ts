export type GrowthType =
  | 'FORMULA'
  | 'BREASTFEEDING'
  | 'PUMPED_FEEDING'
  | 'PUMPING'
  | 'SLEEP'
  | 'BATH'
  | 'MEDICATION'
  | 'DIAPER'
  | 'BABY_FOOD'
  | 'MILK'
  | 'WATER'
  | 'HOSPITAL'
  | 'TEMPERATURE'
  | 'SNACK'
  | 'PLAY'
  | 'TUMMY_TIME'
  | 'ETC';

export interface GrowthRecord {
  id: string;
  childId: string;
  type: GrowthType;
  startAt: string;
  endAt?: string | null;
  memo?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  data?: Record<string, unknown> | null;
}

export type FieldKind =
  | 'number'
  | 'text'
  | 'select'
  | 'segmented';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface TypeConfig {
  label: string;
  emoji: string;
  color: string;
  hasEnd: boolean;
  fields: FieldDef[];
}

export const TYPE_CONFIG: Record<GrowthType, TypeConfig> = {
  FORMULA: {
    label: '분유수유',
    emoji: '🍼',
    color: 'bg-amber-50 text-amber-600',
    hasEnd: true,
    fields: [{ key: 'amountMl', label: '먹은 양', kind: 'number', unit: 'ml' }],
  },
  BREASTFEEDING: {
    label: '모유수유',
    emoji: '🤱',
    color: 'bg-pink-50 text-pink-600',
    hasEnd: true,
    fields: [
      { key: 'leftMin', label: '왼쪽', kind: 'number', unit: '분' },
      { key: 'rightMin', label: '오른쪽', kind: 'number', unit: '분' },
    ],
  },
  PUMPED_FEEDING: {
    label: '유축수유',
    emoji: '🤱',
    color: 'bg-rose-50 text-rose-600',
    hasEnd: true,
    fields: [{ key: 'amountMl', label: '먹은 양', kind: 'number', unit: 'ml' }],
  },
  PUMPING: {
    label: '유축',
    emoji: '🥛',
    color: 'bg-sky-50 text-sky-600',
    hasEnd: true,
    fields: [
      { key: 'leftMl', label: '왼쪽', kind: 'number', unit: 'ml' },
      { key: 'rightMl', label: '오른쪽', kind: 'number', unit: 'ml' },
    ],
  },
  SLEEP: {
    label: '수면',
    emoji: '😴',
    color: 'bg-indigo-50 text-indigo-600',
    hasEnd: true,
    fields: [
      {
        key: 'kind',
        label: '구분',
        kind: 'segmented',
        options: [
          { value: 'NAP', label: '낮잠' },
          { value: 'NIGHT', label: '밤잠' },
        ],
      },
    ],
  },
  BATH: {
    label: '목욕',
    emoji: '🛁',
    color: 'bg-cyan-50 text-cyan-600',
    hasEnd: false,
    fields: [],
  },
  MEDICATION: {
    label: '투약',
    emoji: '💊',
    color: 'bg-purple-50 text-purple-600',
    hasEnd: false,
    fields: [
      { key: 'name', label: '약 이름', kind: 'text' },
      { key: 'dose', label: '용량', kind: 'text', placeholder: '예) 5ml' },
    ],
  },
  DIAPER: {
    label: '기저귀',
    emoji: '🩲',
    color: 'bg-yellow-50 text-yellow-700',
    hasEnd: false,
    fields: [
      {
        key: 'kind',
        label: '종류',
        kind: 'segmented',
        options: [
          { value: 'PEE', label: '소변' },
          { value: 'POO', label: '대변' },
          { value: 'BOTH', label: '둘다' },
        ],
      },
    ],
  },
  BABY_FOOD: {
    label: '이유식',
    emoji: '🥣',
    color: 'bg-orange-50 text-orange-600',
    hasEnd: false,
    fields: [
      { key: 'menu', label: '메뉴', kind: 'text', placeholder: '예) 소고기죽' },
      { key: 'amountG', label: '먹은 양', kind: 'number', unit: 'g' },
    ],
  },
  MILK: {
    label: '우유',
    emoji: '🥛',
    color: 'bg-blue-50 text-blue-600',
    hasEnd: false,
    fields: [{ key: 'amountMl', label: '먹은 양', kind: 'number', unit: 'ml' }],
  },
  WATER: {
    label: '물',
    emoji: '💧',
    color: 'bg-sky-50 text-sky-600',
    hasEnd: false,
    fields: [{ key: 'amountMl', label: '먹은 양', kind: 'number', unit: 'ml' }],
  },
  HOSPITAL: {
    label: '병원',
    emoji: '🏥',
    color: 'bg-red-50 text-red-600',
    hasEnd: false,
    fields: [
      { key: 'place', label: '병원/과', kind: 'text' },
      { key: 'memo', label: '메모', kind: 'text' },
    ],
  },
  TEMPERATURE: {
    label: '체온',
    emoji: '🌡️',
    color: 'bg-rose-50 text-rose-600',
    hasEnd: false,
    fields: [{ key: 'tempC', label: '체온', kind: 'number', unit: '℃' }],
  },
  SNACK: {
    label: '간식',
    emoji: '🍪',
    color: 'bg-amber-50 text-amber-700',
    hasEnd: false,
    fields: [
      { key: 'menu', label: '메뉴', kind: 'text' },
      { key: 'amountG', label: '먹은 양', kind: 'number', unit: 'g' },
    ],
  },
  PLAY: {
    label: '놀이',
    emoji: '🧸',
    color: 'bg-emerald-50 text-emerald-600',
    hasEnd: true,
    fields: [],
  },
  TUMMY_TIME: {
    label: '터미타임',
    emoji: '🤸',
    color: 'bg-teal-50 text-teal-600',
    hasEnd: true,
    fields: [],
  },
  ETC: {
    label: '기타',
    emoji: '📝',
    color: 'bg-gray-100 text-gray-700',
    hasEnd: false,
    fields: [],
  },
};

export const ALL_TYPES: GrowthType[] = Object.keys(TYPE_CONFIG) as GrowthType[];

export function summarizeRecord(r: GrowthRecord): string {
  const cfg = TYPE_CONFIG[r.type];
  const data = (r.data ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  switch (r.type) {
    case 'BREASTFEEDING': {
      if (data.leftMin) parts.push(`좌 ${data.leftMin}분`);
      if (data.rightMin) parts.push(`우 ${data.rightMin}분`);
      break;
    }
    case 'FORMULA':
    case 'PUMPED_FEEDING':
    case 'MILK':
    case 'WATER':
      if (data.amountMl) parts.push(`${data.amountMl}ml`);
      break;
    case 'BABY_FOOD':
      if (data.menu) parts.push(String(data.menu));
      if (data.amountG) parts.push(`${data.amountG}g`);
      break;
    case 'SLEEP':
      parts.push(data.kind === 'NIGHT' ? '밤잠' : '낮잠');
      break;
    case 'PUMPING':
      if (data.leftMl) parts.push(`좌 ${data.leftMl}ml`);
      if (data.rightMl) parts.push(`우 ${data.rightMl}ml`);
      break;
    case 'MEDICATION':
      if (data.name) parts.push(String(data.name));
      if (data.dose) parts.push(String(data.dose));
      break;
    case 'DIAPER':
      parts.push(
        data.kind === 'POO' ? '대변' : data.kind === 'BOTH' ? '소+대' : '소변',
      );
      break;
  }
  if (cfg.hasEnd && r.endAt) {
    const mins = Math.round(
      (new Date(r.endAt).getTime() - new Date(r.startAt).getTime()) / 60000,
    );
    if (mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h === 0) parts.push(`${m}분`);
      else if (m === 0) parts.push(`${h}시간`);
      else parts.push(`${h}시간 ${m}분`);
    }
  }
  return parts.join(' · ');
}
