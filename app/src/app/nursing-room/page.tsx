import type { Metadata } from 'next';
import NursingRoomClient from './NursingRoomClient';

export const metadata: Metadata = {
  title: '수유실 찾기',
  description:
    '내 주변 수유실을 지도에서 찾아보세요. 위치, 편의시설, 운영시간 정보를 제공하고, 새로운 수유실을 제보할 수도 있어요.',
  alternates: { canonical: '/nursing-room' },
};

export default function NursingRoomPage() {
  return <NursingRoomClient />;
}
