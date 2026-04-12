import { SkeletonBox } from '@/components/Skeleton';

export default function Loading() {
  return (
    <main className="flex flex-col items-center justify-center text-center h-[calc(100dvh-4rem)] gradient-page">
      <SkeletonBox className="w-20 h-20 rounded-full mb-4" />
      <SkeletonBox className="h-8 w-48 mb-2" />
      <SkeletonBox className="h-4 w-56 mb-1" />
      <SkeletonBox className="h-4 w-44 mb-6" />
      <div className="w-full max-w-xs mb-5">
        <SkeletonBox className="h-3 w-32 mx-auto mb-3" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonBox key={i} className="flex-1 h-24 rounded-2xl" />
          ))}
        </div>
      </div>
      <SkeletonBox className="h-14 w-full max-w-xs rounded-2xl" />
    </main>
  );
}
