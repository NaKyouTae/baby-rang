'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  formatAgreedAt,
  formatExpiresAt,
  useConsents,
  type ConsentKey,
  type OptionalConsentKey,
} from '@/hooks/useConsents';
import PageHeader from '@/components/PageHeader';
import ConfirmModal from '@/components/ConfirmModal';
import { palette } from '@/lib/colors';

const ITEMS: Array<{
  key: ConsentKey;
  label: string;
  href: string;
  required: boolean;
  description: string;
  revokeConfirm?: { title: string; description: string };
}> = [
  {
    key: 'terms',
    label: '이용약관',
    href: '/settings/terms',
    required: true,
    description: '서비스 이용을 위한 필수 약관입니다.',
  },
  {
    key: 'privacy',
    label: '개인정보 수집 및 이용',
    href: '/settings/privacy',
    required: true,
    description: '회원가입·서비스 제공을 위한 필수 동의입니다.',
  },
  {
    key: 'marketing',
    label: '마케팅 정보 수신',
    href: '/settings/marketing',
    required: false,
    description: '이벤트, 혜택 안내 등을 받아보실 수 있어요.',
    revokeConfirm: {
      title: '마케팅 정보 수신을 끄시겠어요?',
      description: '동의를 철회하면 출산·육아 혜택과\n신규 기능 안내를 받지 못해요.',
    },
  },
  {
    key: 'thirdParty',
    label: '개인정보 제3자 제공',
    href: '/settings/third-party',
    required: false,
    description: '제휴 서비스 연동 시 일부 정보가 공유될 수 있어요.',
    revokeConfirm: {
      title: '제3자 제공 동의를 철회하시겠어요?',
      description: '결제·소셜 로그인 등 일부 기능 이용에\n제한이 생길 수 있어요.',
    },
  },
];

export default function ConsentsSettingsPage() {
  const router = useRouter();
  const { isLoaded, isAuthenticated } = useAuth();
  const { consents, loading, updating, setConsent } = useConsents();
  const [toast, setToast] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<OptionalConsentKey | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) router.replace('/home');
  }, [isLoaded, isAuthenticated, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const applyChange = async (key: OptionalConsentKey, next: boolean) => {
    try {
      await setConsent(key, next);
      setToast(next ? '동의 처리되었어요.' : '동의가 철회되었어요.');
    } catch {
      setToast('변경에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setRevokeTarget(null);
    }
  };

  const handleToggle = async (key: OptionalConsentKey) => {
    if (!consents) return;
    if (consents[key].agreed) {
      setRevokeTarget(key);
    } else {
      await applyChange(key, true);
    }
  };

  const revokeItem = revokeTarget
    ? ITEMS.find((i) => i.key === revokeTarget)
    : null;

  return (
    <div className="flex flex-col bg-white min-h-dvh">
      <PageHeader title="동의 관리" variant="back" />

      <div className="pb-12">
        <p className="px-6 pt-2 pb-4 text-[12px] leading-[18px]" style={{ color: palette.gray500 }}>
          필수 항목은 서비스 이용에 꼭 필요해요. 철회를 원하시면 회원탈퇴를 진행해 주세요.
          선택 항목은 언제든지 변경할 수 있어요.
        </p>

        {loading ? (
          <p className="px-6 text-sm text-gray-400">불러오는 중...</p>
        ) : !consents ? (
          <p className="px-6 text-sm text-red-500">동의 정보를 불러오지 못했어요.</p>
        ) : (
          <ul className="flex flex-col">
            {ITEMS.map((item) => {
              const state = consents[item.key];
              const isOptional = !item.required;
              return (
                <li key={item.key} className="px-6 py-4 border-b" style={{ borderColor: palette.gray200 }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: item.required ? palette.teal : palette.gray200,
                            color: item.required ? '#fff' : palette.gray600,
                          }}
                        >
                          {item.required ? '필수' : '선택'}
                        </span>
                        <Link
                          href={item.href}
                          className="text-[14px] font-medium text-black flex items-center gap-1 active:opacity-70"
                        >
                          {item.label}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={palette.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </Link>
                      </div>
                      <p className="text-[12px] mt-1" style={{ color: palette.gray500 }}>
                        {item.description}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: palette.gray400 }}>
                        {formatAgreedAt(state.agreedAt)}
                        {item.key === 'marketing' &&
                          consents.marketing.expiresAt &&
                          ` · ${formatExpiresAt(consents.marketing.expiresAt)}`}
                      </p>
                    </div>

                    {isOptional ? (
                      <button
                        type="button"
                        disabled={updating === (item.key as OptionalConsentKey)}
                        onClick={() => void handleToggle(item.key as OptionalConsentKey)}
                        aria-label={`${item.label} ${state.agreed ? '동의 철회' : '동의'}`}
                        className="shrink-0"
                      >
                        <span
                          className="relative inline-flex h-[24px] w-[44px] items-center rounded-full transition-colors duration-200"
                          style={{ backgroundColor: state.agreed ? palette.teal : palette.gray300 }}
                        >
                          <span
                            className={`inline-block h-[20px] w-[20px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                              state.agreed ? 'translate-x-[22px]' : 'translate-x-[2px]'
                            }`}
                          />
                        </span>
                      </button>
                    ) : (
                      <span
                        className="shrink-0 text-[12px] font-medium px-2 py-1 rounded"
                        style={{ backgroundColor: palette.gray100, color: palette.gray500 }}
                      >
                        동의 완료
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {revokeItem?.revokeConfirm && (
        <ConfirmModal
          open={!!revokeTarget}
          title={revokeItem.revokeConfirm.title}
          description={revokeItem.revokeConfirm.description}
          confirmLabel="동의 철회"
          cancelLabel="취소"
          variant="danger"
          onConfirm={() => void applyChange(revokeTarget!, false)}
          onClose={() => setRevokeTarget(null)}
        />
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-10 z-50 px-4 py-2 rounded-full text-[13px] text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
