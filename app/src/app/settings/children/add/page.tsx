'use client';

import { useRouter } from 'next/navigation';
import { useChildren } from '@/hooks/useChildren';
import PageHeader from '@/components/PageHeader';
import ChildForm from '@/components/ChildForm';

export default function AddChildPage() {
  const router = useRouter();
  const { addChild } = useChildren();

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="아기 추가하기" variant="close" />
      <ChildForm
        onSubmit={async ({ name, gender, birthDate, dueDate }) => {
          await addChild(name, gender, birthDate, undefined, dueDate);
          router.back();
        }}
      />
    </div>
  );
}
