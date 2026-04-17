/**
 * 2017 소아청소년 성장도표 백분위수 데이터
 *
 * 0-35개월: WHO Growth Standards
 * 36개월 이상: 2017 소아청소년 성장도표 (질병관리본부 + 대한소아과학회)
 *
 * 백분위수: 3rd, 15th, 50th, 85th, 97th
 * 출처: 질병관리본부 / WHO Child Growth Standards
 */

export type Percentiles = {
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
};

export type GrowthData = {
  /** 월령 */
  month: number;
  /** 백분위수별 값 */
  percentiles: Percentiles;
};

export type GrowthStandard = {
  label: string;
  unit: string;
  data: GrowthData[];
};

// ──────────────────────────────────────────────
// 남아 체중 (kg) — 연령별, 0-36개월
// ──────────────────────────────────────────────
const boysWeight: GrowthData[] = [
  { month: 0, percentiles: { p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.3 } },
  { month: 1, percentiles: { p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.7 } },
  { month: 2, percentiles: { p3: 4.4, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.0 } },
  { month: 3, percentiles: { p3: 5.1, p15: 5.6, p50: 6.4, p85: 7.2, p97: 7.9 } },
  { month: 4, percentiles: { p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.9, p97: 8.6 } },
  { month: 5, percentiles: { p3: 6.1, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.2 } },
  { month: 6, percentiles: { p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.9, p97: 9.7 } },
  { month: 7, percentiles: { p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.3, p97: 10.2 } },
  { month: 8, percentiles: { p3: 7.0, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.5 } },
  { month: 9, percentiles: { p3: 7.2, p15: 7.9, p50: 8.9, p85: 10.0, p97: 10.9 } },
  { month: 10, percentiles: { p3: 7.5, p15: 8.2, p50: 9.2, p85: 10.3, p97: 11.2 } },
  { month: 11, percentiles: { p3: 7.7, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.5 } },
  { month: 12, percentiles: { p3: 7.8, p15: 8.6, p50: 9.6, p85: 10.8, p97: 11.8 } },
  { month: 13, percentiles: { p3: 8.0, p15: 8.8, p50: 9.9, p85: 11.1, p97: 12.1 } },
  { month: 14, percentiles: { p3: 8.2, p15: 9.0, p50: 10.1, p85: 11.3, p97: 12.4 } },
  { month: 15, percentiles: { p3: 8.4, p15: 9.2, p50: 10.3, p85: 11.6, p97: 12.7 } },
  { month: 16, percentiles: { p3: 8.5, p15: 9.4, p50: 10.5, p85: 11.8, p97: 12.9 } },
  { month: 17, percentiles: { p3: 8.7, p15: 9.6, p50: 10.7, p85: 12.0, p97: 13.2 } },
  { month: 18, percentiles: { p3: 8.9, p15: 9.7, p50: 10.9, p85: 12.3, p97: 13.5 } },
  { month: 19, percentiles: { p3: 9.0, p15: 9.9, p50: 11.1, p85: 12.5, p97: 13.7 } },
  { month: 20, percentiles: { p3: 9.2, p15: 10.1, p50: 11.3, p85: 12.7, p97: 14.0 } },
  { month: 21, percentiles: { p3: 9.3, p15: 10.3, p50: 11.5, p85: 13.0, p97: 14.3 } },
  { month: 22, percentiles: { p3: 9.5, p15: 10.5, p50: 11.8, p85: 13.2, p97: 14.5 } },
  { month: 23, percentiles: { p3: 9.7, p15: 10.6, p50: 12.0, p85: 13.4, p97: 14.8 } },
  { month: 24, percentiles: { p3: 9.8, p15: 10.8, p50: 12.2, p85: 13.7, p97: 15.1 } },
  { month: 25, percentiles: { p3: 10.0, p15: 11.0, p50: 12.4, p85: 13.9, p97: 15.3 } },
  { month: 26, percentiles: { p3: 10.1, p15: 11.2, p50: 12.5, p85: 14.1, p97: 15.6 } },
  { month: 27, percentiles: { p3: 10.3, p15: 11.3, p50: 12.7, p85: 14.4, p97: 15.8 } },
  { month: 28, percentiles: { p3: 10.4, p15: 11.5, p50: 12.9, p85: 14.6, p97: 16.1 } },
  { month: 29, percentiles: { p3: 10.6, p15: 11.7, p50: 13.1, p85: 14.8, p97: 16.3 } },
  { month: 30, percentiles: { p3: 10.7, p15: 11.8, p50: 13.3, p85: 15.1, p97: 16.5 } },
  { month: 31, percentiles: { p3: 10.8, p15: 12.0, p50: 13.5, p85: 15.3, p97: 16.8 } },
  { month: 32, percentiles: { p3: 11.0, p15: 12.1, p50: 13.7, p85: 15.5, p97: 17.0 } },
  { month: 33, percentiles: { p3: 11.1, p15: 12.3, p50: 13.8, p85: 15.7, p97: 17.3 } },
  { month: 34, percentiles: { p3: 11.2, p15: 12.4, p50: 14.0, p85: 16.0, p97: 17.5 } },
  { month: 35, percentiles: { p3: 11.3, p15: 12.6, p50: 14.2, p85: 16.2, p97: 17.8 } },
  { month: 36, percentiles: { p3: 11.5, p15: 12.7, p50: 14.3, p85: 16.4, p97: 18.0 } },
];

// ──────────────────────────────────────────────
// 여아 체중 (kg) — 연령별, 0-36개월
// ──────────────────────────────────────────────
const girlsWeight: GrowthData[] = [
  { month: 0, percentiles: { p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 } },
  { month: 1, percentiles: { p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.4 } },
  { month: 2, percentiles: { p3: 4.0, p15: 4.5, p50: 5.1, p85: 5.9, p97: 6.5 } },
  { month: 3, percentiles: { p3: 4.6, p15: 5.1, p50: 5.8, p85: 6.7, p97: 7.4 } },
  { month: 4, percentiles: { p3: 5.1, p15: 5.6, p50: 6.4, p85: 7.3, p97: 8.1 } },
  { month: 5, percentiles: { p3: 5.5, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.7 } },
  { month: 6, percentiles: { p3: 5.8, p15: 6.4, p50: 7.3, p85: 8.3, p97: 9.2 } },
  { month: 7, percentiles: { p3: 6.1, p15: 6.7, p50: 7.6, p85: 8.7, p97: 9.6 } },
  { month: 8, percentiles: { p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.0 } },
  { month: 9, percentiles: { p3: 6.6, p15: 7.2, p50: 8.2, p85: 9.3, p97: 10.4 } },
  { month: 10, percentiles: { p3: 6.8, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.7 } },
  { month: 11, percentiles: { p3: 7.0, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.0 } },
  { month: 12, percentiles: { p3: 7.1, p15: 7.9, p50: 8.9, p85: 10.2, p97: 11.3 } },
  { month: 13, percentiles: { p3: 7.3, p15: 8.1, p50: 9.2, p85: 10.4, p97: 11.6 } },
  { month: 14, percentiles: { p3: 7.5, p15: 8.3, p50: 9.4, p85: 10.7, p97: 11.9 } },
  { month: 15, percentiles: { p3: 7.7, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.2 } },
  { month: 16, percentiles: { p3: 7.8, p15: 8.7, p50: 9.8, p85: 11.2, p97: 12.5 } },
  { month: 17, percentiles: { p3: 8.0, p15: 8.9, p50: 10.0, p85: 11.4, p97: 12.7 } },
  { month: 18, percentiles: { p3: 8.2, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.0 } },
  { month: 19, percentiles: { p3: 8.3, p15: 9.2, p50: 10.4, p85: 11.9, p97: 13.3 } },
  { month: 20, percentiles: { p3: 8.5, p15: 9.4, p50: 10.6, p85: 12.1, p97: 13.5 } },
  { month: 21, percentiles: { p3: 8.7, p15: 9.6, p50: 10.9, p85: 12.3, p97: 13.8 } },
  { month: 22, percentiles: { p3: 8.8, p15: 9.8, p50: 11.1, p85: 12.6, p97: 14.1 } },
  { month: 23, percentiles: { p3: 9.0, p15: 10.0, p50: 11.3, p85: 12.8, p97: 14.3 } },
  { month: 24, percentiles: { p3: 9.2, p15: 10.2, p50: 11.5, p85: 13.1, p97: 14.6 } },
  { month: 25, percentiles: { p3: 9.3, p15: 10.3, p50: 11.7, p85: 13.3, p97: 14.8 } },
  { month: 26, percentiles: { p3: 9.5, p15: 10.5, p50: 11.9, p85: 13.5, p97: 15.1 } },
  { month: 27, percentiles: { p3: 9.6, p15: 10.7, p50: 12.1, p85: 13.8, p97: 15.3 } },
  { month: 28, percentiles: { p3: 9.8, p15: 10.8, p50: 12.3, p85: 14.0, p97: 15.6 } },
  { month: 29, percentiles: { p3: 9.9, p15: 11.0, p50: 12.5, p85: 14.2, p97: 15.8 } },
  { month: 30, percentiles: { p3: 10.1, p15: 11.2, p50: 12.7, p85: 14.5, p97: 16.1 } },
  { month: 31, percentiles: { p3: 10.2, p15: 11.3, p50: 12.9, p85: 14.7, p97: 16.3 } },
  { month: 32, percentiles: { p3: 10.3, p15: 11.5, p50: 13.1, p85: 14.9, p97: 16.6 } },
  { month: 33, percentiles: { p3: 10.5, p15: 11.6, p50: 13.3, p85: 15.2, p97: 16.8 } },
  { month: 34, percentiles: { p3: 10.6, p15: 11.8, p50: 13.5, p85: 15.4, p97: 17.1 } },
  { month: 35, percentiles: { p3: 10.8, p15: 12.0, p50: 13.7, p85: 15.6, p97: 17.3 } },
  { month: 36, percentiles: { p3: 10.9, p15: 12.1, p50: 13.9, p85: 15.9, p97: 17.6 } },
];

// ──────────────────────────────────────────────
// 남아 신장 (cm) — 연령별, 0-36개월 (누운 키)
// ──────────────────────────────────────────────
const boysHeight: GrowthData[] = [
  { month: 0, percentiles: { p3: 46.3, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.4 } },
  { month: 1, percentiles: { p3: 51.1, p15: 52.7, p50: 54.7, p85: 56.7, p97: 58.4 } },
  { month: 2, percentiles: { p3: 54.7, p15: 56.4, p50: 58.4, p85: 60.5, p97: 62.2 } },
  { month: 3, percentiles: { p3: 57.6, p15: 59.3, p50: 61.4, p85: 63.5, p97: 65.4 } },
  { month: 4, percentiles: { p3: 59.9, p15: 61.7, p50: 63.9, p85: 66.0, p97: 68.0 } },
  { month: 5, percentiles: { p3: 61.7, p15: 63.6, p50: 65.9, p85: 68.1, p97: 70.1 } },
  { month: 6, percentiles: { p3: 63.3, p15: 65.2, p50: 67.6, p85: 69.9, p97: 71.9 } },
  { month: 7, percentiles: { p3: 64.8, p15: 66.7, p50: 69.2, p85: 71.5, p97: 73.5 } },
  { month: 8, percentiles: { p3: 66.2, p15: 68.1, p50: 70.6, p85: 73.0, p97: 75.0 } },
  { month: 9, percentiles: { p3: 67.5, p15: 69.5, p50: 72.0, p85: 74.4, p97: 76.5 } },
  { month: 10, percentiles: { p3: 68.7, p15: 70.7, p50: 73.3, p85: 75.8, p97: 77.9 } },
  { month: 11, percentiles: { p3: 69.9, p15: 71.9, p50: 74.5, p85: 77.1, p97: 79.2 } },
  { month: 12, percentiles: { p3: 71.0, p15: 73.1, p50: 75.7, p85: 78.4, p97: 80.5 } },
  { month: 13, percentiles: { p3: 72.1, p15: 74.2, p50: 76.9, p85: 79.6, p97: 81.7 } },
  { month: 14, percentiles: { p3: 73.1, p15: 75.3, p50: 78.0, p85: 80.7, p97: 82.9 } },
  { month: 15, percentiles: { p3: 74.1, p15: 76.3, p50: 79.1, p85: 81.9, p97: 84.1 } },
  { month: 16, percentiles: { p3: 75.0, p15: 77.3, p50: 80.2, p85: 83.0, p97: 85.2 } },
  { month: 17, percentiles: { p3: 76.0, p15: 78.3, p50: 81.2, p85: 84.1, p97: 86.4 } },
  { month: 18, percentiles: { p3: 76.9, p15: 79.3, p50: 82.3, p85: 85.2, p97: 87.5 } },
  { month: 19, percentiles: { p3: 77.7, p15: 80.2, p50: 83.2, p85: 86.2, p97: 88.5 } },
  { month: 20, percentiles: { p3: 78.6, p15: 81.1, p50: 84.2, p85: 87.2, p97: 89.6 } },
  { month: 21, percentiles: { p3: 79.4, p15: 82.0, p50: 85.1, p85: 88.2, p97: 90.6 } },
  { month: 22, percentiles: { p3: 80.2, p15: 82.8, p50: 86.0, p85: 89.1, p97: 91.6 } },
  { month: 23, percentiles: { p3: 81.0, p15: 83.7, p50: 86.9, p85: 90.1, p97: 92.5 } },
  { month: 24, percentiles: { p3: 81.7, p15: 84.5, p50: 87.8, p85: 91.0, p97: 93.5 } },
  { month: 25, percentiles: { p3: 82.5, p15: 85.3, p50: 88.6, p85: 91.9, p97: 94.4 } },
  { month: 26, percentiles: { p3: 83.2, p15: 86.0, p50: 89.4, p85: 92.8, p97: 95.3 } },
  { month: 27, percentiles: { p3: 83.9, p15: 86.8, p50: 90.2, p85: 93.6, p97: 96.2 } },
  { month: 28, percentiles: { p3: 84.6, p15: 87.5, p50: 90.9, p85: 94.4, p97: 97.0 } },
  { month: 29, percentiles: { p3: 85.3, p15: 88.2, p50: 91.7, p85: 95.2, p97: 97.9 } },
  { month: 30, percentiles: { p3: 85.9, p15: 88.9, p50: 92.4, p85: 96.0, p97: 98.7 } },
  { month: 31, percentiles: { p3: 86.5, p15: 89.5, p50: 93.1, p85: 96.7, p97: 99.5 } },
  { month: 32, percentiles: { p3: 87.1, p15: 90.2, p50: 93.8, p85: 97.5, p97: 100.2 } },
  { month: 33, percentiles: { p3: 87.7, p15: 90.8, p50: 94.5, p85: 98.2, p97: 101.0 } },
  { month: 34, percentiles: { p3: 88.3, p15: 91.4, p50: 95.1, p85: 98.9, p97: 101.7 } },
  { month: 35, percentiles: { p3: 88.9, p15: 92.0, p50: 95.8, p85: 99.6, p97: 102.4 } },
  { month: 36, percentiles: { p3: 89.4, p15: 92.6, p50: 96.5, p85: 100.3, p97: 103.1 } },
];

// ──────────────────────────────────────────────
// 여아 신장 (cm) — 연령별, 0-36개월 (누운 키)
// ──────────────────────────────────────────────
const girlsHeight: GrowthData[] = [
  { month: 0, percentiles: { p3: 45.6, p15: 47.1, p50: 49.1, p85: 51.1, p97: 52.7 } },
  { month: 1, percentiles: { p3: 50.0, p15: 51.5, p50: 53.7, p85: 55.8, p97: 57.4 } },
  { month: 2, percentiles: { p3: 53.2, p15: 54.8, p50: 57.1, p85: 59.3, p97: 59.9 } },
  { month: 3, percentiles: { p3: 55.8, p15: 57.5, p50: 59.8, p85: 62.1, p97: 63.8 } },
  { month: 4, percentiles: { p3: 57.8, p15: 59.6, p50: 62.1, p85: 64.5, p97: 66.2 } },
  { month: 5, percentiles: { p3: 59.5, p15: 61.4, p50: 63.9, p85: 66.3, p97: 68.1 } },
  { month: 6, percentiles: { p3: 61.0, p15: 62.9, p50: 65.5, p85: 68.0, p97: 69.8 } },
  { month: 7, percentiles: { p3: 62.2, p15: 64.3, p50: 66.9, p85: 69.5, p97: 71.4 } },
  { month: 8, percentiles: { p3: 63.5, p15: 65.5, p50: 68.3, p85: 70.9, p97: 72.8 } },
  { month: 9, percentiles: { p3: 64.7, p15: 66.7, p50: 69.5, p85: 72.3, p97: 74.2 } },
  { month: 10, percentiles: { p3: 65.8, p15: 67.9, p50: 70.7, p85: 73.5, p97: 75.5 } },
  { month: 11, percentiles: { p3: 66.8, p15: 69.0, p50: 71.9, p85: 74.8, p97: 76.7 } },
  { month: 12, percentiles: { p3: 67.8, p15: 70.0, p50: 73.0, p85: 75.9, p97: 77.9 } },
  { month: 13, percentiles: { p3: 68.8, p15: 71.0, p50: 74.0, p85: 77.1, p97: 79.1 } },
  { month: 14, percentiles: { p3: 69.7, p15: 72.0, p50: 75.1, p85: 78.2, p97: 80.2 } },
  { month: 15, percentiles: { p3: 70.6, p15: 73.0, p50: 76.1, p85: 79.3, p97: 81.3 } },
  { month: 16, percentiles: { p3: 71.5, p15: 73.9, p50: 77.1, p85: 80.3, p97: 82.4 } },
  { month: 17, percentiles: { p3: 72.4, p15: 74.8, p50: 78.1, p85: 81.4, p97: 83.5 } },
  { month: 18, percentiles: { p3: 73.2, p15: 75.7, p50: 79.1, p85: 82.4, p97: 84.5 } },
  { month: 19, percentiles: { p3: 74.0, p15: 76.6, p50: 80.0, p85: 83.4, p97: 85.6 } },
  { month: 20, percentiles: { p3: 74.8, p15: 77.4, p50: 80.9, p85: 84.4, p97: 86.6 } },
  { month: 21, percentiles: { p3: 75.6, p15: 78.3, p50: 81.8, p85: 85.3, p97: 87.6 } },
  { month: 22, percentiles: { p3: 76.4, p15: 79.1, p50: 82.7, p85: 86.2, p97: 88.6 } },
  { month: 23, percentiles: { p3: 77.1, p15: 79.9, p50: 83.5, p85: 87.2, p97: 89.5 } },
  { month: 24, percentiles: { p3: 77.8, p15: 80.7, p50: 84.3, p85: 88.0, p97: 90.5 } },
  { month: 25, percentiles: { p3: 78.6, p15: 81.4, p50: 85.1, p85: 88.9, p97: 91.4 } },
  { month: 26, percentiles: { p3: 79.3, p15: 82.2, p50: 85.9, p85: 89.7, p97: 92.2 } },
  { month: 27, percentiles: { p3: 79.9, p15: 82.9, p50: 86.7, p85: 90.5, p97: 93.1 } },
  { month: 28, percentiles: { p3: 80.6, p15: 83.6, p50: 87.4, p85: 91.3, p97: 93.9 } },
  { month: 29, percentiles: { p3: 81.2, p15: 84.3, p50: 88.2, p85: 92.1, p97: 94.8 } },
  { month: 30, percentiles: { p3: 81.9, p15: 85.0, p50: 88.9, p85: 92.9, p97: 95.6 } },
  { month: 31, percentiles: { p3: 82.5, p15: 85.6, p50: 89.6, p85: 93.7, p97: 96.4 } },
  { month: 32, percentiles: { p3: 83.1, p15: 86.3, p50: 90.3, p85: 94.4, p97: 97.1 } },
  { month: 33, percentiles: { p3: 83.7, p15: 86.9, p50: 91.0, p85: 95.1, p97: 97.9 } },
  { month: 34, percentiles: { p3: 84.3, p15: 87.5, p50: 91.7, p85: 95.9, p97: 98.6 } },
  { month: 35, percentiles: { p3: 84.8, p15: 88.1, p50: 92.3, p85: 96.6, p97: 99.4 } },
  { month: 36, percentiles: { p3: 85.4, p15: 88.7, p50: 93.0, p85: 97.3, p97: 100.1 } },
];

// ──────────────────────────────────────────────
// 남아 머리둘레 (cm) — 연령별, 0-36개월
// ──────────────────────────────────────────────
const boysHead: GrowthData[] = [
  { month: 0, percentiles: { p3: 32.1, p15: 33.1, p50: 34.5, p85: 35.8, p97: 36.9 } },
  { month: 1, percentiles: { p3: 34.9, p15: 35.9, p50: 37.3, p85: 38.6, p97: 39.6 } },
  { month: 2, percentiles: { p3: 36.9, p15: 37.8, p50: 39.1, p85: 40.4, p97: 41.3 } },
  { month: 3, percentiles: { p3: 38.3, p15: 39.2, p50: 40.5, p85: 41.8, p97: 42.7 } },
  { month: 4, percentiles: { p3: 39.4, p15: 40.3, p50: 41.6, p85: 42.9, p97: 43.8 } },
  { month: 5, percentiles: { p3: 40.3, p15: 41.2, p50: 42.6, p85: 43.8, p97: 44.7 } },
  { month: 6, percentiles: { p3: 41.0, p15: 41.9, p50: 43.3, p85: 44.6, p97: 45.6 } },
  { month: 7, percentiles: { p3: 41.7, p15: 42.5, p50: 43.9, p85: 45.3, p97: 46.3 } },
  { month: 8, percentiles: { p3: 42.2, p15: 43.1, p50: 44.5, p85: 45.8, p97: 46.8 } },
  { month: 9, percentiles: { p3: 42.6, p15: 43.5, p50: 44.9, p85: 46.3, p97: 47.4 } },
  { month: 10, percentiles: { p3: 43.0, p15: 43.9, p50: 45.3, p85: 46.7, p97: 47.8 } },
  { month: 11, percentiles: { p3: 43.4, p15: 44.3, p50: 45.6, p85: 47.0, p97: 48.1 } },
  { month: 12, percentiles: { p3: 43.6, p15: 44.5, p50: 45.9, p85: 47.4, p97: 48.5 } },
  { month: 13, percentiles: { p3: 43.9, p15: 44.8, p50: 46.2, p85: 47.6, p97: 48.7 } },
  { month: 14, percentiles: { p3: 44.1, p15: 45.0, p50: 46.4, p85: 47.9, p97: 49.0 } },
  { month: 15, percentiles: { p3: 44.3, p15: 45.2, p50: 46.7, p85: 48.1, p97: 49.2 } },
  { month: 16, percentiles: { p3: 44.5, p15: 45.4, p50: 46.9, p85: 48.3, p97: 49.4 } },
  { month: 17, percentiles: { p3: 44.7, p15: 45.6, p50: 47.1, p85: 48.5, p97: 49.6 } },
  { month: 18, percentiles: { p3: 44.9, p15: 45.8, p50: 47.2, p85: 48.7, p97: 49.8 } },
  { month: 19, percentiles: { p3: 45.0, p15: 45.9, p50: 47.4, p85: 48.9, p97: 50.0 } },
  { month: 20, percentiles: { p3: 45.2, p15: 46.1, p50: 47.5, p85: 49.0, p97: 50.1 } },
  { month: 21, percentiles: { p3: 45.3, p15: 46.2, p50: 47.7, p85: 49.2, p97: 50.3 } },
  { month: 22, percentiles: { p3: 45.4, p15: 46.3, p50: 47.8, p85: 49.3, p97: 50.4 } },
  { month: 23, percentiles: { p3: 45.6, p15: 46.5, p50: 48.0, p85: 49.5, p97: 50.6 } },
  { month: 24, percentiles: { p3: 45.7, p15: 46.6, p50: 48.1, p85: 49.6, p97: 50.7 } },
  { month: 25, percentiles: { p3: 45.8, p15: 46.7, p50: 48.2, p85: 49.7, p97: 50.8 } },
  { month: 26, percentiles: { p3: 45.9, p15: 46.8, p50: 48.3, p85: 49.9, p97: 51.0 } },
  { month: 27, percentiles: { p3: 46.0, p15: 46.9, p50: 48.4, p85: 50.0, p97: 51.1 } },
  { month: 28, percentiles: { p3: 46.1, p15: 47.0, p50: 48.5, p85: 50.1, p97: 51.2 } },
  { month: 29, percentiles: { p3: 46.2, p15: 47.1, p50: 48.6, p85: 50.2, p97: 51.3 } },
  { month: 30, percentiles: { p3: 46.3, p15: 47.2, p50: 48.7, p85: 50.3, p97: 51.4 } },
  { month: 31, percentiles: { p3: 46.3, p15: 47.3, p50: 48.8, p85: 50.3, p97: 51.5 } },
  { month: 32, percentiles: { p3: 46.4, p15: 47.3, p50: 48.9, p85: 50.4, p97: 51.5 } },
  { month: 33, percentiles: { p3: 46.5, p15: 47.4, p50: 48.9, p85: 50.5, p97: 51.6 } },
  { month: 34, percentiles: { p3: 46.5, p15: 47.5, p50: 49.0, p85: 50.6, p97: 51.7 } },
  { month: 35, percentiles: { p3: 46.6, p15: 47.5, p50: 49.1, p85: 50.6, p97: 51.7 } },
  { month: 36, percentiles: { p3: 46.6, p15: 47.6, p50: 49.1, p85: 50.7, p97: 51.8 } },
];

// ──────────────────────────────────────────────
// 여아 머리둘레 (cm) — 연령별, 0-36개월
// ──────────────────────────────────────────────
const girlsHead: GrowthData[] = [
  { month: 0, percentiles: { p3: 31.7, p15: 32.5, p50: 33.9, p85: 35.1, p97: 36.1 } },
  { month: 1, percentiles: { p3: 34.3, p15: 35.2, p50: 36.5, p85: 37.8, p97: 38.8 } },
  { month: 2, percentiles: { p3: 35.9, p15: 36.9, p50: 38.3, p85: 39.6, p97: 40.5 } },
  { month: 3, percentiles: { p3: 37.1, p15: 38.1, p50: 39.5, p85: 40.9, p97: 41.9 } },
  { month: 4, percentiles: { p3: 38.1, p15: 39.1, p50: 40.6, p85: 41.9, p97: 42.9 } },
  { month: 5, percentiles: { p3: 38.9, p15: 39.9, p50: 41.5, p85: 42.8, p97: 43.8 } },
  { month: 6, percentiles: { p3: 39.6, p15: 40.6, p50: 42.2, p85: 43.5, p97: 44.5 } },
  { month: 7, percentiles: { p3: 40.2, p15: 41.2, p50: 42.8, p85: 44.2, p97: 45.2 } },
  { month: 8, percentiles: { p3: 40.7, p15: 41.7, p50: 43.4, p85: 44.7, p97: 45.8 } },
  { month: 9, percentiles: { p3: 41.2, p15: 42.2, p50: 43.8, p85: 45.2, p97: 46.3 } },
  { month: 10, percentiles: { p3: 41.5, p15: 42.6, p50: 44.2, p85: 45.6, p97: 46.7 } },
  { month: 11, percentiles: { p3: 41.9, p15: 42.9, p50: 44.6, p85: 46.0, p97: 47.1 } },
  { month: 12, percentiles: { p3: 42.2, p15: 43.2, p50: 44.9, p85: 46.3, p97: 47.5 } },
  { month: 13, percentiles: { p3: 42.4, p15: 43.5, p50: 45.2, p85: 46.6, p97: 47.7 } },
  { month: 14, percentiles: { p3: 42.7, p15: 43.7, p50: 45.4, p85: 46.9, p97: 48.0 } },
  { month: 15, percentiles: { p3: 42.9, p15: 43.9, p50: 45.6, p85: 47.1, p97: 48.2 } },
  { month: 16, percentiles: { p3: 43.1, p15: 44.1, p50: 45.8, p85: 47.3, p97: 48.5 } },
  { month: 17, percentiles: { p3: 43.3, p15: 44.3, p50: 46.0, p85: 47.5, p97: 48.7 } },
  { month: 18, percentiles: { p3: 43.5, p15: 44.5, p50: 46.2, p85: 47.7, p97: 48.8 } },
  { month: 19, percentiles: { p3: 43.6, p15: 44.6, p50: 46.3, p85: 47.9, p97: 49.0 } },
  { month: 20, percentiles: { p3: 43.8, p15: 44.8, p50: 46.5, p85: 48.0, p97: 49.2 } },
  { month: 21, percentiles: { p3: 43.9, p15: 44.9, p50: 46.7, p85: 48.2, p97: 49.3 } },
  { month: 22, percentiles: { p3: 44.1, p15: 45.1, p50: 46.8, p85: 48.3, p97: 49.5 } },
  { month: 23, percentiles: { p3: 44.2, p15: 45.2, p50: 46.9, p85: 48.5, p97: 49.6 } },
  { month: 24, percentiles: { p3: 44.3, p15: 45.3, p50: 47.1, p85: 48.6, p97: 49.7 } },
  { month: 25, percentiles: { p3: 44.4, p15: 45.4, p50: 47.2, p85: 48.7, p97: 49.8 } },
  { month: 26, percentiles: { p3: 44.5, p15: 45.5, p50: 47.3, p85: 48.8, p97: 49.9 } },
  { month: 27, percentiles: { p3: 44.6, p15: 45.6, p50: 47.4, p85: 48.9, p97: 50.1 } },
  { month: 28, percentiles: { p3: 44.7, p15: 45.7, p50: 47.5, p85: 49.0, p97: 50.2 } },
  { month: 29, percentiles: { p3: 44.8, p15: 45.8, p50: 47.6, p85: 49.1, p97: 50.3 } },
  { month: 30, percentiles: { p3: 44.8, p15: 45.9, p50: 47.7, p85: 49.2, p97: 50.4 } },
  { month: 31, percentiles: { p3: 44.9, p15: 45.9, p50: 47.7, p85: 49.3, p97: 50.4 } },
  { month: 32, percentiles: { p3: 45.0, p15: 46.0, p50: 47.8, p85: 49.4, p97: 50.5 } },
  { month: 33, percentiles: { p3: 45.0, p15: 46.1, p50: 47.9, p85: 49.4, p97: 50.6 } },
  { month: 34, percentiles: { p3: 45.1, p15: 46.1, p50: 47.9, p85: 49.5, p97: 50.6 } },
  { month: 35, percentiles: { p3: 45.1, p15: 46.2, p50: 48.0, p85: 49.6, p97: 50.7 } },
  { month: 36, percentiles: { p3: 45.2, p15: 46.2, p50: 48.1, p85: 49.6, p97: 50.8 } },
];

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

export type MetricType = 'weight' | 'height' | 'head';
export type Gender = 'male' | 'female';

const standards: Record<Gender, Record<MetricType, GrowthStandard>> = {
  male: {
    weight: { label: '체중', unit: 'kg', data: boysWeight },
    height: { label: '키', unit: 'cm', data: boysHeight },
    head: { label: '머리둘레', unit: 'cm', data: boysHead },
  },
  female: {
    weight: { label: '체중', unit: 'kg', data: girlsWeight },
    height: { label: '키', unit: 'cm', data: girlsHeight },
    head: { label: '머리둘레', unit: 'cm', data: girlsHead },
  },
};

export function getGrowthStandard(
  gender: Gender,
  metric: MetricType,
): GrowthStandard {
  return standards[gender][metric];
}

/**
 * 만나이 월령 계산 (이용지침서 공식 기반)
 * 소수점 버림 처리
 */
export function calcAgeMonths(birthDate: string, measureDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [my, mm, md] = measureDate.split('-').map(Number);
  const months = (my - by) * 12 + (mm - bm) + (md - bd) / 30.4;
  return Math.floor(months);
}

/**
 * 측정값의 대략적인 백분위수 추정 (선형보간)
 */
export function estimatePercentile(
  gender: Gender,
  metric: MetricType,
  ageMonths: number,
  value: number,
): number | null {
  const standard = getGrowthStandard(gender, metric);
  const entry = standard.data.find((d) => d.month === ageMonths);
  if (!entry) return null;

  const { p3, p15, p50, p85, p97 } = entry.percentiles;

  // 백분위수 구간별 선형보간
  const points: [number, number][] = [
    [p3, 3],
    [p15, 15],
    [p50, 50],
    [p85, 85],
    [p97, 97],
  ];

  if (value <= p3) return Math.max(1, Math.round((value / p3) * 3));
  if (value >= p97) return Math.min(99, Math.round(97 + ((value - p97) / (p97 - p85)) * 2));

  for (let i = 0; i < points.length - 1; i++) {
    const [v1, pct1] = points[i];
    const [v2, pct2] = points[i + 1];
    if (value >= v1 && value <= v2) {
      const ratio = (value - v1) / (v2 - v1);
      return Math.round(pct1 + ratio * (pct2 - pct1));
    }
  }

  return 50;
}
