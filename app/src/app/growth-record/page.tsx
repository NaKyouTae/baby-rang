import dynamic from 'next/dynamic';
import BottomNav from '@/components/BottomNavServer';
import { GrowthRecordSkeleton } from '@/components/Skeleton';

const GrowthRecordClient = dynamic(() => import('./GrowthRecordClient'), {
  loading: () => <GrowthRecordSkeleton />,
});

export default function GrowthRecordPage() {
  return (
    <>
      <GrowthRecordClient />
      <BottomNav />
    </>
  );
}
