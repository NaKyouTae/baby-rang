'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useChildren, type Child } from '@/hooks/useChildren';
import { useConsents, type OptionalConsentKey } from '@/hooks/useConsents';
import { clearAuthCaches } from '@/hooks/appCache';
import { openLocationSettings, getLocationSettingsGuide } from '@/lib/openLocationSettings';
import SharingScreen from './SharingScreen';
import ImportScreen from './ImportScreen';
import NoticesScreen from './NoticesScreen';
import ChildSheet from './ChildSheet';
import ProfileSheet from './ProfileSheet';
import ConfirmModal from './ConfirmModal';

/** 디자인의 공통 상자 — 흰 바탕에 1px 검정 테두리, 모서리 4px. */
const BOX = 'bg-[#FDFDFE] border border-[#121212] rounded-[4px]';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 보석함 열기 — '고객 지원'의 보석함 줄. 로그인 전이면 부르는 쪽이 로그인 화면으로 보낸다. */
  onOpenGems?: () => void;
}

/**
 * 마이페이지 — 기존 /settings 의 기능을 픽셀 디자인으로 다시 깐 화면.
 *
 * 각 줄은 기존 /settings/* 페이지로 그대로 보낸다. 내용까지 옮기면
 * 두 벌을 따로 고쳐야 해서 한쪽이 반드시 뒤처진다.
 */
export default function MyPage({ open, onClose, onOpenGems }: Props) {
  const router = useRouter();
  const { consents, updating, setConsent } = useConsents();
  const { isAuthenticated, user, isLoaded: isAuthLoaded } = useAuth();
  const { children } = useChildren();
  const [sharingOpen, setSharingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  // 아기 정보 시트. null 이면 닫힘, child 가 null 이면 새로 등록.
  const [childSheet, setChildSheet] = useState<{ child: Child | null } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [locationPerm, setLocationPerm] = useState<'granted' | 'denied' | 'prompt' | null>(null);
  // 위치 권한 팝업(디자인 그대로). 설정으로 이동은 앱이면 설정 화면, 웹이면 권한 요청으로 이어진다.
  const [locationModal, setLocationModal] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  // 안 읽은 공지가 있으면 '공지사항' 옆에 빨간 점. 열 때와 공지 화면에서 돌아올 때 다시 확인한다.
  const [hasUnreadNotice, setHasUnreadNotice] = useState(false);
  useEffect(() => {
    if (!open || noticesOpen || !isAuthenticated) return;
    let alive = true;
    fetch('/api/notices/has-unread', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setHasUnreadNotice(!!d.hasUnread))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, noticesOpen, isAuthenticated]);

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

  // 권한은 앱이 직접 바꿀 수 없다. 누르면 먼저 팝업으로 설정에서 바꿔야 한다고 알린다.
  const handleLocationToggle = useCallback(() => setLocationModal(true), []);

  // 웹에서 이미 차단된 권한은 코드로 설정을 열 수 없다 — 그때만 브라우저별 바꾸는 방법을 보여준다.
  const [locationGuide, setLocationGuide] = useState<string | null>(null);

  const confirmLocation = useCallback(() => {
    setLocationModal(false);
    // 앱은 설정 화면을 열고, 웹은 아직 안 물었으면 권한 팝업을 띄운다.
    openLocationSettings({
      onGranted: () => setLocationPerm('granted'),
      onDenied: () => setLocationPerm('denied'),
      onBrowserDenied: () => setLocationGuide(getLocationSettingsGuide().description),
    });
  }, []);

  const withdraw = useCallback(async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const res = await fetch('/api/auth/withdraw', { method: 'POST' });
      if (res.ok) {
        clearAuthCaches(); // 지속 캐시 비우기
        window.location.href = '/home';
        return;
      }
    } catch {
      /* 아래에서 함께 알린다 */
    }
    alert('탈퇴 처리 중 오류가 발생했어요.\n잠시 후 다시 시도해주세요.');
    setWithdrawing(false);
  }, [withdrawing]);

  const toggleConsent = useCallback(
    (key: OptionalConsentKey) => {
      if (!consents || updating === key) return;
      void setConsent(key, !consents[key].agreed).catch(() => {});
    },
    [consents, updating, setConsent],
  );

  const go = useCallback((href: string) => router.push(href), [router]);

  // 아기 등록은 로그인한 회원만 할 수 있다. 모달로 한 번 더 묻지 않고 프로필 상자처럼 로그인 화면으로 보낸다.
  const addChild = useCallback(() => {
    if (!isAuthenticated) return go('/login');
    setChildSheet({ child: null });
  }, [isAuthenticated, go]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuthCaches(); // 지속 캐시 비우기(재로그인 시 stale 방지)
    window.location.href = '/home';
  }, []);

  if (!open) return null;

  return (
    <>
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
        <div className={`${BOX} h-[48px] shrink-0 flex items-center justify-between px-[10px]`}>
          {/* 디자인의 왼쪽 화살표는 투명하다 — 제목을 가운데로 미는 자리일 뿐이다 */}
          <span className="size-[24px]" />
          <p className="text-[#121212] text-[16px] leading-none">설정</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="size-[24px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/close.svg" alt="" width={24} height={24} className="block" />
          </button>
        </div>

        {isAuthLoaded && (
          <button
            type="button"
            onClick={() => (isAuthenticated ? setProfileOpen(true) : go('/login'))}
            className={`${BOX} w-full h-[48px] shrink-0 flex items-center justify-between px-[10px] text-left`}
          >
            <span className="flex flex-col gap-[4px] min-w-0">
              <span className="text-[#121212] text-[16px] leading-[1.4] truncate">
                {isAuthenticated ? `${user?.name ?? '아기랑 회원'} 님` : '로그인하기'}
              </span>
              {!isAuthenticated ? (
                <span className="text-[#808991] text-[14px] leading-[1.4] truncate">기록을 안전하게 보관하세요</span>
              ) : (
                user?.email && (
                  <span className="text-[#808991] text-[14px] leading-[1.4] truncate">{user.email}</span>
                )
              )}
            </span>
            <Chevron />
          </button>
        )}

        <div className="flex gap-[10px] items-center overflow-x-auto">
          <button
            type="button"
            onClick={addChild}
            aria-label="아이 추가"
            className={`${BOX} size-[50px] shrink-0 flex items-center justify-center`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/plus.svg" alt="" width={24} height={24} className="block" />
          </button>
          {children.length === 0 && (
            // 아기가 없을 때 — 누르면 + 와 같이 등록으로 간다
            <button
              type="button"
              onClick={addChild}
              className={`${BOX} h-[50px] flex-1 min-w-0 flex flex-col items-center justify-center text-center leading-[1.4]`}
            >
              <span className="text-[#121212] text-[16px]">등록된 아기가 없습니다.</span>
              <span className="text-[#808991] text-[12px]">아기를 등록하고 성장 퀘스트를 시작하세요.</span>
            </button>
          )}
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChildSheet({ child: c })}
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

        {/* 디자인상 권한 설정 상자만 제목과 줄 사이가 10px 이다 */}
        <Section title="권한 설정" gap={10}>
          <Row label="위치 권한">
            <Segmented
              agreed={locationPerm === 'granted'}
              onToggle={handleLocationToggle}
              labelledBy="위치 권한"
            />
          </Row>
        </Section>

        <Section title="활동 관리">
          <LinkRow label="기록 공유" onClick={() => setSharingOpen(true)} />
          <LinkRow label="데이터 가져오기" onClick={() => setImportOpen(true)} />
        </Section>

        <Section title="고객 지원">
          {onOpenGems && <LinkRow label="보석함" onClick={onOpenGems} />}
          <LinkRow label="결제 내역" onClick={() => go('/settings/payments')} />
          <LinkRow label="공지사항" onClick={() => setNoticesOpen(true)} dot={hasUnreadNotice} />
          <LinkRow label="문의하기" onClick={() => go('/support')} />
        </Section>

        <Section title="약관 및 정책">
          <LinkRow label="이용약관" onClick={() => go('/settings/terms')} />
          <LinkRow label="개인정보처리방침" onClick={() => go('/settings/privacy')} />
          <LinkRow label="환불정책" onClick={() => go('/settings/refund')} />
          <Row label="개인정보 제3자 제공 동의" onClick={() => go('/settings/third-party')}>
            <Segmented
              agreed={consents?.thirdParty.agreed === true}
              onToggle={() => toggleConsent('thirdParty')}
              labelledBy="개인정보 제3자 제공 동의"
            />
          </Row>
          <Row label="마케팅 정보 수신 동의" onClick={() => go('/settings/marketing')}>
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
            <button type="button" onClick={() => setWithdrawOpen(true)}>
              탈퇴하기
            </button>
          </div>
        )}

        <div className="flex flex-col gap-[16px] items-center justify-center pb-[16px]">
          <p className="text-[#121212] text-[14px] leading-none">ⒸSpectrum</p>
          <div className="flex flex-col gap-[10px] items-center text-[#808991] text-[12px] text-center">
            <div className="flex gap-[10px] items-start justify-center">
              <p className="leading-none">대표자 나규태</p>
              <p className="leading-none">･</p>
              <p className="leading-none">사업자 등록 번호 224-20-02381</p>
            </div>
            <p className="leading-none">고객센터 spectrum.mesh@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
    {/* 스크롤되는 설정 화면 밖에 둬야 스크롤 위치와 상관없이 화면을 꽉 채운다 */}
    <SharingScreen open={sharingOpen} onBack={() => setSharingOpen(false)} />
    <ImportScreen open={importOpen} onBack={() => setImportOpen(false)} />
    <NoticesScreen open={noticesOpen} onBack={() => setNoticesOpen(false)} />
    <ChildSheet
      open={childSheet !== null}
      child={childSheet?.child ?? null}
      onClose={() => setChildSheet(null)}
    />
    <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
    <ConfirmModal
      open={locationModal}
      showThumbnail={false}
      title="위치 권한 설정"
      description={
        <>
          위치 권한을 변경해 주세요.
          <br />
          설정에서 위치 권한을 변경할 수 있어요.
        </>
      }
      confirmLabel="설정으로 이동"
      onCancel={() => setLocationModal(false)}
      onConfirm={confirmLocation}
    />
    <ConfirmModal
      open={locationGuide !== null}
      showThumbnail={false}
      title="위치 권한 설정"
      description={locationGuide}
      confirmLabel="확인"
      onCancel={() => setLocationGuide(null)}
      onConfirm={() => setLocationGuide(null)}
    />
    <ConfirmModal
      open={withdrawOpen}
      showThumbnail={false}
      title="정말 탈퇴하시겠어요?"
      description={
        <>
          쌓아온 육아 기록이 모두 사라져요.
          <br />
          삭제된 기록은 다시 복구할 수 없어요.
        </>
      }
      confirmLabel="탈퇴하기"
      busy={withdrawing}
      onCancel={() => {
        if (!withdrawing) setWithdrawOpen(false);
      }}
      onConfirm={() => void withdraw()}
    />
    </>
  );
}

function Section({
  title,
  gap = 10,
  children,
}: {
  title: string;
  /** 제목과 줄 묶음 사이 간격(px) */
  gap?: 10 | 16;
  children: React.ReactNode;
}) {
  return (
    <div className={`${BOX} flex flex-col ${gap === 10 ? 'gap-[10px]' : 'gap-[16px]'} justify-center p-[10px]`}>
      <p className="text-[#808991] text-[12px] leading-[1.4]">{title}</p>
      <div className="flex flex-col gap-[10px]">{children}</div>
    </div>
  );
}

/**
 * 이름 + 오른쪽 컨트롤 한 줄. onClick 이 있으면 이름을 눌러 해당 문서로 간다 —
 * 스위치는 따로 눌러야 해서 줄 전체를 버튼으로 감싸지 않는다.
 */
function Row({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-[8px] w-full">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="flex-1 min-w-0 text-left text-[#121212] text-[16px] leading-[1.4]"
        >
          {label}
        </button>
      ) : (
        <p className="text-[#121212] text-[16px] leading-[1.4]">{label}</p>
      )}
      {children}
    </div>
  );
}

/** dot — 글자 오른쪽 위 4px 빨간 점(안 읽은 공지 등 새 소식) */
function LinkRow({ label, onClick, dot = false }: { label: string; onClick: () => void; dot?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between w-full">
      <span className="flex gap-[4px] items-start">
        <span className="text-[#121212] text-[16px] leading-[1.4]">{label}</span>
        {dot && <span aria-label="새 소식" className="size-[4px] shrink-0 rounded-full bg-[#FF4040]" />}
      </span>
      <Chevron size={20} />
    </button>
  );
}

function Chevron({ size = 24 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/chevron-right.svg"
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
