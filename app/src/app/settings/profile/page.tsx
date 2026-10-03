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

        <p className="text-[11px] text-gray-400 leading-relaxed">
          카카오·네이버에서 제공받은 정보예요. 바꾸려면 해당 서비스에서 수정한 뒤 다시
          로그인해 주세요. 성별·연령대는 선택 제공 항목이라 동의하지 않으면 미제공으로
          표시됩니다.
        </p>
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
