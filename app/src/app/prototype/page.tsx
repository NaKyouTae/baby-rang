import type { Metadata } from 'next';
import PrototypeClient from './PrototypeClient';

// 개발용 실험 화면. 검색엔진·AI 크롤러에 노출되면 안 된다. (robots.ts 에도 disallow 추가)
export const metadata: Metadata = {
  title: '캐릭터 프로토타입',
  robots: { index: false, follow: false },
};

export default function PrototypePage() {
  return (
    <>
      {/* 픽셀 폰트 — React 19 가 head 로 끌어올린다. 이 링크가 없으면
          fontFamily: Galmuri11 이 전부 monospace 로 떨어진다. */}
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <PrototypeClient />
    </>
  );
}
