'use client';

import { useRouter } from 'next/navigation';
import { useChildren } from '@/hooks/useChildren';
import PageHeader from '@/components/PageHeader';
import ChildForm from '@/components/ChildForm';
import KakaoAdBanner from '@/components/ads/KakaoAdBanner';

export default function AddChildPage() {
  const router = useRouter();
  const { addChild } = useChildren();

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="아기 추가하기" variant="close" />
      <section className="pt-6 flex justify-center">
        <KakaoAdBanner unit="DAN-JK9I9W9ilVyrtSj4" />
      </section>
      <ChildForm
        onSubmit={async ({ name, gender, birthDate, dueDate }) => {
          await addChild(name, gender, birthDate, undefined, dueDate);
          router.back();
        }}
      />
    </div>
  );
}
