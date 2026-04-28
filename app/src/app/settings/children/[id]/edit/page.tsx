'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useChildren } from '@/hooks/useChildren';
import PageHeader from '@/components/PageHeader';
import ChildForm from '@/components/ChildForm';

export default function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { children, isLoaded, updateChild } = useChildren();

  if (!isLoaded) return null;

  const child = children.find((c) => c.id === id);
  if (!child) {
    router.replace('/settings/children');
    return null;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <PageHeader title="아기 수정하기" variant="close" />
      <ChildForm
        initialName={child.name}
        initialGender={child.gender as 'male' | 'female'}
        initialBirthDate={child.birthDate}
        initialDueDate={child.dueDate ?? ''}
        onSubmit={async ({ name, gender, birthDate, dueDate }) => {
          await updateChild(id, name, gender, birthDate, undefined, dueDate);
          router.back();
        }}
      />
    </div>
  );
}
