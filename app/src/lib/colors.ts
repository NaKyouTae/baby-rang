/**
 * 아기랑 앱 컬러 팔레트
 * - Tailwind 클래스: globals.css @theme에서 정의 (bg-gray-200, text-app-black 등)
 * - 인라인 스타일: 이 상수를 import하여 사용
 */
export const palette = {
  black: '#121212',
  white: '#FDFDFE',
  teal: '#30B0C7',
  gray100: '#F7F8F9',
  gray200: '#EEF0F1',
  gray300: '#DFE0E1',
  gray400: '#BBC0C5',
  gray500: '#808991',
  gray600: '#515C66',
  red: '#FF3B30',
} as const;
