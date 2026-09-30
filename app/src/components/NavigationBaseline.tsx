'use client';

import { useEffect } from 'react';
import { captureHistoryBaseline } from '@/lib/navHistory';

/**
 * 앱이 뜬 시점의 히스토리 길이를 기록한다.
 *
 * 어떤 경로로 들어오든 가장 먼저 잡혀야 해서 루트 레이아웃에 둔다.
 * 화면에는 아무것도 그리지 않는다. (navHistory.ts 참고)
 */
export default function NavigationBaseline() {
  useEffect(() => {
    captureHistoryBaseline();
  }, []);
  return null;
}
