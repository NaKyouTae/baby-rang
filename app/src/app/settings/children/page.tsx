'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useChildren } from '@/hooks/useChildren';
import { calcChildAge } from '@/lib/childAge';
import PageHeader from '@/components/PageHeader';
import { palette } from '@/lib/colors';
import ConfirmModal from '@/components/ConfirmModal';

export default function ChildrenSettingsPage() {
  const router = useRouter();
  const { children, isLoaded, removeChild } = useChildren();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader
        title="아기 추가하기"
        variant="back"
        onAction={() => router.push('/settings')}
      />

      {/* 등록된 아이 목록 */}
      <section className="mt-6 space-y-[10px] px-6">
        {children.length === 0 && (
          <div className="rounded-[8px] border border-dashed border-gray-200 h-[190px] flex flex-col items-center justify-center">
            <div className="w-[40px] h-[40px] rounded-[24px] bg-white flex items-center justify-center mb-4 border" style={{ borderColor: palette.teal }}>
              <img src="/icon-boy.svg" alt="아기" width={24} height={24} />
            </div>
            <p className="text-[14px] font-medium text-black">등록된 아기가 없어요.</p>
            <p className="text-[12px] font-normal text-gray-500 mt-1">아기 정보를 입력하고 맞춤형 케어를 시작하세요.</p>
          </div>
        )}

        {children.map((child) => {
          const { days } = calcChildAge(child.birthDate);
          return (
            <div key={child.id} className="rounded-[8px] bg-gray-100 border border-gray-200 px-4 h-[64px] flex items-center gap-3">
              {/* 프로필 아이콘 */}
              <div className="relative w-[40px] h-[40px] shrink-0 rounded-[24px] overflow-hidden flex items-center justify-center bg-white border" style={{ borderColor: palette.teal }}>
                {child.profileImage ? (
                  <Image src={child.profileImage} alt={child.name} fill className="object-cover" />
                ) : (
                  <img
                    src={child.gender === 'female' ? '/icon-girl.svg' : '/icon-boy.svg'}
                    alt={child.gender === 'female' ? '여아' : '남아'}
                    width={24}
                    height={24}
                  />
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-medium text-black">{child.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] font-medium text-white px-1.5 h-[16px] flex items-center rounded" style={{ backgroundColor: palette.teal }}>
                    D+{days}
                  </span>
                  <span className="text-[12px] font-normal text-black">
                    {child.birthDate.replace(/-/g, '. ')}.
                  </span>
                </div>
              </div>

              {/* 수정/삭제 버튼 */}
              <div className="flex items-center gap-[10px]">
                <button
                  onClick={() => router.push(`/settings/children/${child.id}/edit`)}
                  className="p-1"
                  aria-label="수정"
                >
                  <img src="/icon-edit.svg" alt="" width={16} height={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: child.id, name: child.name })}
                  className="p-1"
                  aria-label="삭제"
                >
                  <img src="/icon-trash.svg" alt="" width={16} height={16} />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* 우측 하단 + 플로팅 버튼 — 하단 네비 위 24px */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 pointer-events-none"
        style={{ paddingBottom: 'calc(var(--safe-area-bottom) + 64px + 24px + 24px)' }}
      >
        <div className="flex justify-end px-6 pointer-events-auto">
          <button
            onClick={() => router.push('/settings/children/add')}
            className="w-[40px] h-[40px] rounded-full bg-primary-500 text-white shadow-lg flex items-center justify-center active:opacity-80 transition-opacity"
            aria-label="아기 추가"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={!!deleteTarget}
        icon={
          <div className="w-[60px] h-[60px] rounded-full bg-gray-100 flex items-center justify-center">
            <img src="/icon-trash.svg" alt="" width={32} height={32} />
          </div>
        }
        title="아이 정보 삭제하기"
        description={
          deleteTarget
            ? <><span className="font-medium text-black">{deleteTarget.name}</span> 의 정보를 삭제할까요?{'\n'}삭제하면 다시 되돌릴 수 없어요.</>
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={() => {
          if (deleteTarget) {
            removeChild(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
