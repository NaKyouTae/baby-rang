'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChildren } from '@/hooks/useChildren';
import { useConsents, type OptionalConsentKey } from '@/hooks/useConsents';
import { clearAuthCaches } from '@/hooks/appCache';
import { openLocationSettings, getLocationSettingsGuide } from '@/lib/openLocationSettings';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

type NativeBridgeWindow = Window & {
  webkit?: { messageHandlers?: { openSettings?: unknown } };
  Android?: { openLocationSettings?: unknown };
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** 보석함 열기. 디자인상 '고객 지원' 첫 줄이다. */
  onOpenGems: () => void;
}

/**
 * 마이페이지 — 기존 /settings 의 기능을 픽셀 디자인으로 다시 깐 화면.
 *
 * 각 줄은 기존 /settings/* 페이지로 그대로 보낸다. 내용까지 옮기면
 * 두 벌을 따로 고쳐야 해서 한쪽이 반드시 뒤처진다.
 */
export default function MyPage({ open, onClose, onOpenGems }: Props) {
  const router = useRouter();
  const { isAuthenticated, user, isLoaded: isAuthLoaded } = useAuth();
  const { children } = useChildren();
  const { consents, updating, setConsent } = useConsents();
  const [locationPerm, setLocationPerm] = useState<'granted' | 'denied' | 'prompt' | null>(null);

  useEffect(() => {
    if (!open || !navigator.permissions) return;
    let off: (() => void) | undefined;
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      setLocationPerm(status.state);
      const onChange = () => setLocationPerm(status.state);
      status.addEventListener('change', onChange);
      off = () => status.removeEventListener('change', onChange);
    });
    return () => off?.();
  }, [open]);

  const handleLocationToggle = useCallback(() => {
    const w = window as unknown as NativeBridgeWindow;
    const isNativeApp = !!(
      w.webkit?.messageHandlers?.openSettings || w.Android?.openLocationSettings
    );
    // 웹에서는 브라우저 설정을 코드로 열 수 없다 — 여는 방법만 알려 준다.
    if (!isNativeApp) {
      alert(getLocationSettingsGuide().description);
      return;
    }
    openLocationSettings({
      onGranted: () => setLocationPerm('granted'),
      onDenied: () => setLocationPerm('denied'),
    });
  }, []);

  const toggleConsent = useCallback(
    (key: OptionalConsentKey) => {
      if (!consents || updating === key) return;
      void setConsent(key, !consents[key].agreed).catch(() => {});
    },
    [consents, updating, setConsent],
  );

  const go = useCallback((href: string) => router.push(href), [router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuthCaches(); // 지속 캐시 비우기(재로그인 시 stale 방지)
    window.location.href = '/home';
  }, []);

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-20 bg-[#F7F8F9] overflow-y-auto overscroll-contain"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 20px)',
        // 광고 자리는 이 화면 위에 그대로 떠 있다. 그만큼 비워야 끝이 가리지 않는다.
        paddingBottom:
          'calc(var(--bottom-ad-banner-height) + max(var(--safe-area-bottom), 0px) + 20px)',
      }}
    >
      <div className="px-[20px] flex flex-col gap-[10px]">
        <div className={`${BOX} h-[50px] shrink-0 flex items-center justify-between px-[10px]`}>
          {/* 디자인의 왼쪽 화살표는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
          <span className="size-[24px]" />
          <p className="text-[#121212] text-[16px] leading-none">설정</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="size-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prototype/icons/close.svg" alt="" width={24} height={24} className="block" />
          </button>
        </div>

        {isAuthLoaded && (
          <button
            type="button"
            onClick={() => (isAuthenticated ? go('/settings/profile') : go('/login'))}
            className={`${BOX} w-full flex items-center justify-between p-[10px] text-left`}
          >
            <span className="flex flex-col gap-[4px] min-w-0">
              <span className="text-[#121212] text-[16px] leading-[1.4] truncate">
                {isAuthenticated ? `${user?.name ?? '아기랑 회원'} 님` : '로그인하기'}
              </span>
              <span className="text-[#808991] text-[14px] leading-[1.4] truncate">
                {isAuthenticated ? (user?.email ?? '') : '기록을 안전하게 보관하세요'}
              </span>
            </span>
            <Chevron />
          </button>
        )}

        <div className="flex gap-[10px] items-center overflow-x-auto">
          <button
            type="button"
            onClick={() => go('/settings/children/add')}
            aria-label="아이 추가"
            className={`${BOX} size-[50px] shrink-0 flex items-center justify-center`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/prototype/icons/plus.svg" alt="" width={24} height={24} className="block" />
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => go('/settings/children')}
              className={`${BOX} h-[50px] w-[110px] shrink-0 flex flex-col items-center justify-center`}
            >
              <span className="text-[#121212] text-[16px] leading-[1.4] truncate max-w-full px-[6px]">
                {c.name}
              </span>
              <span className="text-[#808991] text-[12px] leading-[1.4] tabular-nums">
                {c.birthDate?.slice(2).replace(/-/g, '.')}
              </span>
            </button>
          ))}
        </div>

        <Section title="권한 설정">
          <Row label="위치 권한">
            <Segmented
              agreed={locationPerm === 'granted'}
              onToggle={handleLocationToggle}
              labelledBy="위치 권한"
            />
          </Row>
        </Section>

        <Section title="활동 관리">
          <LinkRow label="기록 공유" onClick={() => go('/settings/sharing')} />
          <LinkRow label="데이터 가져오기" onClick={() => go('/settings/import-data')} />
        </Section>

        <Section title="고객 지원">
          <LinkRow label="보석함" onClick={onOpenGems} />
          <LinkRow label="결제 내역" onClick={() => go('/settings/payments')} />
          <LinkRow label="공지사항" onClick={() => go('/settings/notices')} />
          <LinkRow label="문의하기" onClick={() => go('/support')} />
        </Section>

        <Section title="약관 및 정책">
          <LinkRow label="이용약관" onClick={() => go('/settings/terms')} />
          <LinkRow label="개인정보처리방침" onClick={() => go('/settings/privacy')} />
          <LinkRow label="환불정책" onClick={() => go('/settings/refund')} />
          <Row label="개인정보 제3자 제공 동의">
            <Segmented
              agreed={consents?.thirdParty.agreed === true}
              onToggle={() => toggleConsent('thirdParty')}
              labelledBy="개인정보 제3자 제공 동의"
            />
          </Row>
          <Row label="마케팅 정보 수신 동의">
            <Segmented
              agreed={consents?.marketing.agreed === true}
              onToggle={() => toggleConsent('marketing')}
              labelledBy="마케팅 정보 수신 동의"
            />
          </Row>
        </Section>

        {isAuthLoaded && isAuthenticated && (
          <div className="flex gap-[10px] items-center justify-center py-[16px] text-[#808991] text-[14px] leading-[1.4]">
            <button type="button" onClick={logout}>
              로그아웃
            </button>
            <span>･</span>
            <button type="button" onClick={() => go('/account-deletion')}>
              탈퇴하기
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[16px] items-center justify-center pb-[16px]">
          <p className="text-[#121212] text-[14px] leading-none">ⒸSpectrum</p>
          <div className="flex flex-col gap-[10px] items-center text-[#808991] text-[12px] text-center">
            <p className="leading-none">대표자 나규태 ･ 사업자 등록 번호 224-20-02381</p>
            <p className="leading-none">고객센터 spectrum.mesh@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${BOX} flex flex-col gap-[16px] justify-center p-[10px]`}>
      <p className="text-[#808991] text-[14px] leading-[1.4]">{title}</p>
      <div className="flex flex-col gap-[10px]">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between w-full">
      <p className="text-[#121212] text-[16px] leading-[1.4]">{label}</p>
      {children}
    </div>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between w-full">
      <span className="text-[#121212] text-[16px] leading-[1.4]">{label}</span>
      <Chevron size={20} />
    </button>
  );
}

function Chevron({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/prototype/icons/chevron-right.svg"
      alt=""
      width={size}
      height={size}
      className="block shrink-0"
    />
  );
}

/** 동의 / 미동의 두 칸짜리 스위치. 누르면 반대쪽으로 넘어간다. */
function Segmented({
  agreed,
  onToggle,
  labelledBy,
}: {
  agreed: boolean;
  onToggle: () => void;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={agreed}
      aria-label={labelledBy}
      className="flex h-[22px] w-[100px] shrink-0"
    >
      <span
        className={`flex-1 flex items-center justify-center text-[12px] leading-[1.4] ${
          agreed ? 'bg-[#FFD200] text-[#121212]' : 'bg-[#EEF0F1] text-[#808991]'
        }`}
      >
        동의
      </span>
      <span
        className={`flex-1 flex items-center justify-center text-[12px] leading-[1.4] ${
          agreed ? 'bg-[#EEF0F1] text-[#808991]' : 'bg-[#2C2C2C] text-[#FDFDFE]'
        }`}
      >
        미동의
      </span>
    </button>
  );
}
