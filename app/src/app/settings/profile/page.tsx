'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/PageHeader';
import FormInput from '@/components/FormInput';
import {
  ageRangeLabel,
  formatPhone,
  genderLabel,
  optionalValue,
} from '@/lib/socialProfile';

// 내 정보 — 전부 읽기 전용이다.
//
// 네 항목 모두 카카오·네이버 동의항목으로만 들어온다. 앱에서 고치면 소셜 쪽과
// 어긋난 채 다음 로그인에 그대로 덮어써지므로(syncSocialProfile), 입력란을 두지 않는다.
// 바꾸려면 해당 소셜 서비스에서 바꾼 뒤 다시 로그인해야 한다.
//
// 동의항목 구성: 이름·전화번호·성별은 필수, 연령대는 선택.
// 네이버는 2026-10-06 이 구성으로 승인됐다. 카카오는 심사 중이라, 승인 전에 가입한
// 회원은 성별이 비어 '미제공'으로 뜰 수 있다.
// 받은 항목은 전부 이 화면에 보여준다 — 화면에 쓰지 않는 항목을 받으면
// 카카오·네이버 심사에서 "불필요한 개인정보 수집"으로 반려된다.
//
// 보호자 관계(parentRole)는 DB·API 에 그대로 두되 화면에서만 뺐다. 나중에 쓴다.
export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, isLoaded, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) router.replace('/home');
  }, [isLoaded, isAuthenticated, router]);

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-dvh">
        <p className="text-sm text-gray-400">불러오는 중</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white pb-[var(--bottom-nav-space)]">
      <PageHeader
        title="내 정보"
        variant="back"
        onAction={() => router.push('/settings')}
      />

      <main className="flex-1 px-6 pt-4 pb-10 space-y-[16px]">
        <Field label="이름" value={user?.name || '-'} />
        <Field label="연락처" value={formatPhone(user?.phone) || '-'} />
        <Field label="성별" value={optionalValue(genderLabel(user?.gender))} />
        <Field
          label="연령대"
          value={optionalValue(ageRangeLabel(user?.ageRange))}
        />
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <section>
      <p className="text-xs font-medium text-gray-500 mb-[8px]">{label}</p>
      <FormInput value={value} disabled readOnly />
    </section>
  );
}
