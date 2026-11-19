import type { Metadata } from 'next';
import { Suspense } from 'react';
import RoomViewClient from './RoomViewClient';

export const metadata: Metadata = {
  title: '방 보기',
  robots: { index: false, follow: false },
};

/** 어드민의 '아기방' 메뉴가 띄우는 읽기 전용 방. 홈과 같은 코드로 그린다. */
export default function RoomViewPage() {
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" />
      <Suspense>
        <RoomViewClient />
      </Suspense>
    </>
  );
}
