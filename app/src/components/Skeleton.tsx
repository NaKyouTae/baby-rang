/**
 * 공통 스켈레톤 UI 컴포넌트
 */

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded-xl ${className}`} />;
}

/** 홈 페이지 스켈레톤 */
export function HomeSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <main className="flex-1 pb-24" style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}>
        {/* 인사말 */}
        <div className="px-5">
          <SkeletonBox className="h-6 w-48 mb-1" />
          <SkeletonBox className="h-4 w-32 mt-1" />
        </div>

        {/* 히어로 카드 */}
        <div className="px-5 pt-3">
          <SkeletonBox className="h-48 w-full rounded-2xl" />
        </div>

        <div className="px-5 pt-5 space-y-6">
          {/* 퀵 메뉴 */}
          <div className="flex justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <SkeletonBox className="w-12 h-12 rounded-full" />
                <SkeletonBox className="h-3 w-8" />
              </div>
            ))}
          </div>

          {/* 배너 */}
          <SkeletonBox className="h-14 w-full rounded-[4px]" />

          {/* 수유실 */}
          <div>
            <SkeletonBox className="h-4 w-24 mb-2" />
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <SkeletonBox key={i} className="h-14 w-full rounded-[8px]" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** 설정 페이지 스켈레톤 */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <section className="mx-4 mt-[calc(env(safe-area-inset-top,24px)+16px)] rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <SkeletonBox className="h-14 w-14 rounded-full" />
          <div className="flex-1">
            <SkeletonBox className="h-5 w-32 mb-1" />
            <SkeletonBox className="h-3 w-48" />
          </div>
        </div>
      </section>
      <section className="mx-4 mt-3 rounded-2xl bg-white p-5 shadow-sm">
        <SkeletonBox className="h-4 w-16 mb-3" />
        <div className="flex gap-5">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <SkeletonBox className="h-16 w-16 rounded-full" />
              <SkeletonBox className="h-3 w-10 mt-2" />
            </div>
          ))}
        </div>
      </section>
      <section className="mx-4 mt-3 rounded-2xl bg-white shadow-sm overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-b-0">
            <SkeletonBox className="h-9 w-9 rounded-full" />
            <SkeletonBox className="h-4 w-24 flex-1" />
          </div>
        ))}
      </section>
    </div>
  );
}

/** 성장 기록 스켈레톤 */
export function GrowthRecordSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-3">
        <SkeletonBox className="h-8 w-32" />
      </div>
      <div className="px-4 space-y-3">
        <SkeletonBox className="h-12 w-full rounded-2xl" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonBox key={i} className="h-14 flex-1 rounded-2xl" />
          ))}
        </div>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBox key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** 원더윅스 스켈레톤 */
export function WonderWeeksSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-3">
        <SkeletonBox className="h-8 w-32" />
      </div>
      <div className="px-4 space-y-4">
        <SkeletonBox className="h-16 w-full rounded-2xl" />
        <SkeletonBox className="h-[400px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** 수면 골든타임 스켈레톤 */
export function SleepGoldenTimeSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[max(env(safe-area-inset-top),24px)] pb-3">
        <SkeletonBox className="h-8 w-24" />
      </div>
      <div className="px-4 space-y-4">
        <SkeletonBox className="h-16 w-full rounded-2xl" />
        <SkeletonBox className="h-32 w-full rounded-2xl" />
        <SkeletonBox className="h-48 w-full rounded-2xl" />
        <SkeletonBox className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** 수유실 찾기 스켈레톤 */
export function NursingRoomSkeleton() {
  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">지도 로딩중...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 성장 패턴 스켈레톤 */
export function GrowthPatternSkeleton() {
  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="sticky top-0 z-20 bg-gray-50 px-5 pt-[calc(env(safe-area-inset-top,24px)+16px)] pb-3">
        <SkeletonBox className="h-8 w-32" />
      </div>
      <div className="px-4 space-y-3">
        <SkeletonBox className="h-10 w-full rounded-2xl" />
        <SkeletonBox className="h-[300px] w-full rounded-2xl" />
        <SkeletonBox className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
