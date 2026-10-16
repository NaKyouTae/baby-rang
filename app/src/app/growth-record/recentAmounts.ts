import type { GrowthType } from './types';

export interface RecentAmount { value: number; unit: string }
const LIMIT = 5;
const keyFor = (childId: string, type: GrowthType) => `baby-rang:recent-amounts:${childId}:${type}`;

/** 입력 순서를 유지하면서 중복을 제외한 최근 용량 5개. */
export function mergeRecentAmounts(...groups: RecentAmount[][]): RecentAmount[] {
  const seen = new Set<string>();
  const result: RecentAmount[] = [];
  for (const amount of groups.flat()) {
    if (!amount || !Number.isFinite(amount.value) || amount.value <= 0 ||
      !['ml', 'g'].includes(amount.unit)) continue;
    const key = `${amount.value}:${amount.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(amount);
    if (result.length === LIMIT) break;
  }
  return result;
}

export function loadRecentAmounts(childId: string, type: GrowthType): RecentAmount[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(keyFor(childId, type)) ?? '[]');
    return Array.isArray(parsed) ? mergeRecentAmounts(type === 'BABY_FOOD' ? parsed.filter(Boolean).map(a => ({ ...a, unit: 'ml' })) : parsed) : [];
  } catch { return []; }
}

export function storeRecentAmounts(childId: string, type: GrowthType, amounts: RecentAmount[]) {
  try { localStorage.setItem(keyFor(childId, type), JSON.stringify(mergeRecentAmounts(amounts))); }
  catch { /* 저장 공간이 없으면 현재 화면의 최근 값은 계속 사용한다. */ }
}
