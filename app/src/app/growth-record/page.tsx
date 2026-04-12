import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNavServer';

const GrowthRecordClient = dynamic(() => import('./GrowthRecordClient'), {
  ssr: false,
});

export default function GrowthRecordPage() {
  return (
    <>
      <GrowthRecordClient />
      <BottomNav />
    </>
  );
}
