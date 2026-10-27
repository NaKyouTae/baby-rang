/**
 * 하단 탭(기록·패턴·성장) 화면이 처음 여는 데이터 주소와 미리 받기.
 *
 * 탭 화면과 미리 받기가 같은 주소를 써야 캐시(appCache 의 peekCached·fetchAndCache)가 맞물린다.
 * 그래서 주소는 여기서만 만든다.
 */

import { prefetchCached } from '@/hooks/appCache';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function shiftDateStr(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 기록 탭 첫 페이지(오늘부터 30일) — 빠른 기록 버튼·가장 이른 날짜까지 한 번에 받는다 */
export const RECORD_PAGE_DAYS = 30;
export function recordPageInitUrl(childId: string, start: string) {
  const from = shiftDateStr(start, -(RECORD_PAGE_DAYS - 1));
  return `/api/growth-records/page-init?childId=${childId}&from=${from}&to=${start}`;
}

/**
 * 패턴 탭 범위. 좌측 컬럼의 새벽에 자정을 넘긴 전날 기록이 보이도록 하루 더 앞,
 * 스와이프로 들어오는 옆 페이지(일=1일, 주=7일)까지 받는다.
 */
export function patternRangeUrl(childId: string, selectedDate: string, viewMode: 'day' | 'week') {
  const step = viewMode === 'day' ? 1 : 7;
  const from = shiftDateStr(selectedDate, -7 - step);
  const to = shiftDateStr(selectedDate, step);
  return `/api/growth-records/range?childId=${childId}&from=${from}&to=${to}`;
}
/** 패턴 탭이 마지막으로 본 일/주 — GrowthPatternClient 와 같은 키 */
export const PATTERN_VIEW_MODE_KEY = 'growth-pattern:viewMode';
function storedPatternViewMode(): 'day' | 'week' {
  try {
    return localStorage.getItem(PATTERN_VIEW_MODE_KEY) === 'week' ? 'week' : 'day';
  } catch {
    return 'day';
  }
}

export function physicalGrowthUrl(childId: string) {
  return `/api/physical-growth?childId=${childId}`;
}

export type TabId = 'record' | 'pattern' | 'growth';

/** 그 탭이 처음 열 때 받는 주소들 */
export function tabUrls(tab: TabId, childId: string): string[] {
  const today = toDateStr(new Date());
  if (tab === 'record') return [recordPageInitUrl(childId, today)];
  if (tab === 'pattern') return [patternRangeUrl(childId, today, storedPatternViewMode())];
  return [physicalGrowthUrl(childId)];
}

/** 탭 데이터를 미리 받아 둔다. 처음 여는 탭도 빈 화면 없이 바로 그려진다. */
export function prefetchTabs(childId: string, tabs: TabId[] = ['record', 'pattern', 'growth']) {
  prefetchCached(tabs.flatMap((t) => tabUrls(t, childId)));
}
