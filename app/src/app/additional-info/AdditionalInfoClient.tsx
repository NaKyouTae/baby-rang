'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { palette } from '@/lib/colors';
import { isNativeApp } from '@/lib/isNativeApp';
import {
  isKakaoNativeLoginAvailable,
  runKakaoNativeLogin,
} from '@/lib/kakaoNativeLogin';
import {
  isNaverNativeLoginAvailable,
  runNaverNativeLogin,
} from '@/lib/naverNativeLogin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

// 재인증을 시도했는지 표시해 두는 키.
// 인증이 끝나면 페이지가 통째로 다시 열리므로(세션 쿠키를 navigation 으로 심는다)
// 메모리 상태로는 "방금 시도했다"를 알 수 없다.
const ATTEMPT_KEY = 'additional-info-attempted';

function readAttempted(): boolean {
  try {
    return sessionStorage.getItem(ATTEMPT_KEY) === '1';
  } catch {
    // 사생활 보호 모드 등에서 접근이 막힐 수 있다. 안내 문구가 안 뜰 뿐이다.
    return false;
  }
}

// 값이 바뀌는 시점은 우리가 직접 navigation 하는 때뿐이라 구독할 것이 없다.
function subscribeNoop() {
  return () => {};
}

function markAttempted() {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, '1');
  } catch {
    /* 저장 못 해도 흐름에는 지장이 없다 */
  }
}

// 이름·전화번호 동의항목을 도입하기 전에 가입한 회원에게 재동의를 받는 화면.
//
// 입력란이 없는 이유: 두 값은 카카오·네이버 동의항목으로만 받는다(사용자가 직접
// 적은 값은 소셜 쪽과 어긋난 채 다음 로그인에 덮어써진다). 그래서 할 수 있는 일은
// "동의 화면을 다시 띄우는 것" 하나뿐이고, 버튼도 로그인 버튼과 같은 흐름을 탄다.

type Provider = 'KAKAO' | 'NAVER';

export default function AdditionalInfoClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoaded } = useAuth();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 한 번 인증하고 돌아왔는데도 값이 비어 있으면 동의 화면에서 항목을 건너뛴 것이다.
  // 같은 화면이 아무 설명 없이 다시 뜨면 무엇이 잘못됐는지 알 수 없다.
  //
  // sessionStorage 는 서버에 없으므로 서버 스냅샷은 항상 false 다.
  // useSyncExternalStore 를 쓰면 하이드레이션 불일치 없이 클라이언트 값으로 맞춰진다.
  const retried = useSyncExternalStore(subscribeNoop, readAttempted, () => false);

  // 이 화면에 머물 이유가 없어지면(이미 채워졌거나 로그아웃) 즉시 비켜준다.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isAuthenticated) {
      router.replace('/home');
      return;
    }
    if (user && !user.needsAdditionalInfo) {
      router.replace('/home');
    }
  }, [isLoaded, isAuthenticated, user, router]);

  const missing = [
    ...(user?.name ? [] : ['이름']),
    ...(user?.phone ? [] : ['전화번호']),
  ];

  const start = (provider: Provider) => {
    setError(null);

    const native =
      provider === 'KAKAO'
        ? isKakaoNativeLoginAvailable()
        : isNaverNativeLoginAvailable();

    if (native) {
      setLoading(provider);
      markAttempted();
      const run = provider === 'KAKAO' ? runKakaoNativeLogin : runNaverNativeLogin;
      void run()
        .then((done) => {
          // done=false 는 사용자가 동의 화면을 닫은 경우. 이 화면에 그대로 둔다.
          if (!done) setLoading(null);
        })
        .catch((e) => {
          console.error('[additional-info] 재인증 실패:', e);
          setError('인증을 완료하지 못했어요. 다시 시도해 주세요.');
          setLoading(null);
        });
      return;
    }

    // 앱인데 브릿지가 없으면 로그인이 빠진 구 빌드다. 웹 OAuth 로 보내면
    // 인증은 되지만 앱으로 돌아오지 못한다.
    if (isNativeApp()) {
      setError('앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.');
      return;
    }

    // 네이버는 이미 연동된 사용자에게 기본적으로 동의 화면을 띄우지 않는다.
    // reconsent=1 로 한 번 더 묻게 해야 전화번호를 받을 수 있다.
    // (카카오는 아직 동의하지 않은 항목이 있으면 알아서 동의 화면을 띄운다)
    markAttempted();
    window.location.href =
      provider === 'KAKAO'
        ? `${API_URL}/auth/kakao`
        : `${API_URL}/auth/naver?reconsent=1`;
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.replace('/home');
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-dvh">
        <p className="text-sm text-gray-400">불러오는 중</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-white min-h-dvh px-6"
      style={{
        paddingTop: 'calc(var(--safe-area-top) + 40px)',
        paddingBottom: 'calc(var(--safe-area-bottom) + 24px)',
      }}
    >
      <h1 className="text-[18px] font-medium text-black leading-relaxed">
        회원 정보 확인이 필요해요
      </h1>
      <p className="mt-3 text-[13px] leading-relaxed" style={{ color: palette.gray500 }}>
        서비스 운영에 필요한 정보가 추가되었어요. 아래 버튼으로 한 번만 다시 인증하면
        {missing.length > 0 ? ` ${missing.join('·')}가 ` : ' 회원 정보가 '}
        자동으로 채워져요.
      </p>

      <ul className="mt-5 rounded-[8px] border border-gray-200 overflow-hidden">
        <InfoRow label="이름" value={user?.name} required />
        <InfoRow label="전화번호" value={user?.phone} required />
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        동의 화면에서 이름과 전화번호 항목을 모두 선택해야 저장돼요. 선택 항목(성별)은
        동의하지 않아도 이용에 지장이 없어요.
      </p>

      {retried && (
        <div
          className="mt-4 rounded-[8px] px-4 py-3"
          style={{ backgroundColor: '#FFF8E6' }}
        >
          <p className="text-[12px] leading-relaxed text-gray-600">
            인증했는데도 이 화면이 계속 보인다면, 동의 화면에서 이름·전화번호 항목이
            선택되지 않았을 수 있어요. 카카오는 <b>설정 &gt; 카카오계정 &gt; 연결된 서비스</b>,
            네이버는 <b>내정보 &gt; 외부 사이트 연결</b>에서 아기랑 연결을 끊은 뒤 다시
            인증하면 동의 화면이 처음부터 다시 떠요.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 text-center text-[12px] font-medium"
          style={{ color: palette.red }}
        >
          {error}
        </p>
      )}

      <div className="mt-auto flex flex-col" style={{ gap: 8, paddingTop: 24 }}>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => start('KAKAO')}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] font-semibold active:opacity-80 disabled:opacity-60"
          style={{ height: 44, fontSize: 14, backgroundColor: '#FEE500', color: '#191919' }}
        >
          {loading === 'KAKAO' ? '카카오톡으로 이동 중' : '카카오로 인증하기'}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => start('NAVER')}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] font-semibold active:opacity-80 disabled:opacity-60"
          style={{ height: 44, fontSize: 14, backgroundColor: '#03C75A', color: '#FFFFFF' }}
        >
          {loading === 'NAVER' ? '네이버로 이동 중' : '네이버로 인증하기'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-[12px] font-medium text-gray-400 underline"
          style={{ height: 36 }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  required,
}: {
  label: string;
  value?: string | null;
  required?: boolean;
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-[13px] text-gray-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      <span
        className="text-[13px] font-medium"
        style={{ color: value ? palette.black : palette.gray400 }}
      >
        {value ? '확인됨' : '필요함'}
      </span>
    </li>
  );
}
