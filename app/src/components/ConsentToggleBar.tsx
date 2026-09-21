'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ConfirmModal';
import { palette } from '@/lib/colors';
import {
  formatAgreedAt,
  formatExpiresAt,
  useConsents,
  type ConsentKey,
  type OptionalConsentKey,
} from '@/hooks/useConsents';

interface RequiredConfig {
  required: true;
  label: string;
}

interface OptionalConfig {
  required: false;
  label: string;
  /** 해제 시 보여줄 확인 문구 */
  revokeConfirm: { title: string; description: string };
}

type Config = RequiredConfig | OptionalConfig;

const CONFIG: Record<ConsentKey, Config> = {
  terms: {
    required: true,
    label: '이용약관',
  },
  privacy: {
    required: true,
    label: '개인정보 수집·이용',
  },
  marketing: {
    required: false,
    label: '마케팅 정보 수신',
    revokeConfirm: {
      title: '마케팅 정보 수신을 끄시겠어요?',
      description:
        '동의를 철회하면 출산·육아 혜택과\n신규 기능 안내를 받지 못해요.',
    },
  },
  thirdParty: {
    required: false,
    label: '개인정보 제3자 제공',
    revokeConfirm: {
      title: '제3자 제공 동의를 철회하시겠어요?',
      description:
        '결제·소셜 로그인 등 일부 기능 이용에\n제한이 생길 수 있어요.',
    },
  },
};

/**
 * 약관 페이지 하단에 sticky로 붙는 동의 상태 + 토글 바.
 * - 필수(terms/privacy): 동의 시각만 표시, 토글 없음
 * - 선택(marketing/thirdParty): 토글 + 해제 시 ConfirmModal
 */
export default function ConsentToggleBar({ consentKey }: { consentKey: ConsentKey }) {
  const { consents, loading, updating, setConsent } = useConsents();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const config = CONFIG[consentKey];
  const state = consents?.[consentKey];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading || !state) {
    return (
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t"
        style={{
          borderColor: palette.gray200,
          paddingBottom: 'calc(var(--safe-area-bottom) + 12px)',
          paddingTop: 12,
        }}
      >
        <div className="px-5 h-[48px] flex items-center">
          <p className="text-[12px]" style={{ color: palette.gray400 }}>
            동의 상태 확인 중...
          </p>
        </div>
      </div>
    );
  }

  const handleToggleClick = async () => {
    if (config.required) return;
    if (state.agreed) {
      // 해제는 confirm 필수
      setConfirmOpen(true);
    } else {
      // 재동의는 즉시
      await applyChange(true);
    }
  };

  const applyChange = async (next: boolean) => {
    try {
      await setConsent(consentKey as OptionalConsentKey, next);
      setToast(next ? '동의 처리되었어요.' : '동의가 철회되었어요.');
    } catch {
      setToast('변경에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t"
        style={{
          borderColor: palette.gray200,
          paddingBottom: 'calc(var(--safe-area-bottom) + 12px)',
          paddingTop: 12,
        }}
      >
        <div className="px-5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: config.required ? palette.teal : palette.gray200,
                  color: config.required ? '#fff' : palette.gray600,
                }}
              >
                {config.required ? '필수' : '선택'}
              </span>
              <span className="text-[14px] font-medium text-black truncate">
                {config.label}
              </span>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: palette.gray500 }}>
              {formatAgreedAt(state.agreedAt)}
            </p>
            {consentKey === 'marketing' && consents?.marketing.expiresAt && (
              <p className="text-[11px] mt-0.5" style={{ color: palette.gray400 }}>
                {formatExpiresAt(consents.marketing.expiresAt)}
              </p>
            )}
          </div>

          {config.required ? (
            <span
              className="shrink-0 text-[12px] font-medium px-3 py-1.5 rounded"
              style={{ backgroundColor: palette.gray100, color: palette.gray500 }}
            >
              동의 완료
            </span>
          ) : (
            <button
              type="button"
              disabled={updating === (consentKey as OptionalConsentKey)}
              onClick={handleToggleClick}
              aria-label={`${config.label} ${state.agreed ? '동의 철회' : '동의'}`}
              className="shrink-0"
            >
              <span
                className="relative inline-flex h-[28px] w-[52px] items-center rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: state.agreed ? palette.teal : palette.gray300,
                }}
              >
                <span
                  className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow transition-transform duration-200 ${
                    state.agreed ? 'translate-x-[26px]' : 'translate-x-[2px]'
                  }`}
                />
              </span>
            </button>
          )}
        </div>
      </div>

      {!config.required && (
        <ConfirmModal
          open={confirmOpen}
          title={config.revokeConfirm.title}
          description={config.revokeConfirm.description}
          confirmLabel="동의 철회"
          cancelLabel="취소"
          variant="danger"
          onConfirm={() => void applyChange(false)}
          onClose={() => setConfirmOpen(false)}
        />
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-full text-[13px] text-white"
          style={{
            backgroundColor: 'rgba(0,0,0,0.8)',
            bottom: 'calc(var(--safe-area-bottom) + 92px)',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
