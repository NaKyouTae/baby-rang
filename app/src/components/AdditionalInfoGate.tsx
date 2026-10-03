'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// 이름·전화번호 동의항목을 도입하기 전에 가입한 회원을 추가 정보 화면으로 보낸다.
//
// 두 값은 사용자가 입력할 수 있는 항목이 아니라 소셜 동의로만 들어오므로,
// 기존 회원은 "다시 로그인해서 동의"하는 길밖에 없다. 그래서 설정 화면 어딘가에
// 숨겨두지 않고 접속 시점에 한 번 막아 세운다.
//
// 필요 여부(needsAdditionalInfo)는 서버가 판단한다 — 애플 전용 회원처럼
// 전화번호를 받을 수 없는 예외가 있어 클라이언트에서 재현하면 어긋난다.

// 막지 않을 경로.
// 약관·정책 문서는 동의 여부를 떠나 언제든 열려야 하고(스토어 심사도 본다),
// 로그인/가입 흐름을 막으면 들어오지도 못한 채 서로를 가리키게 된다.
const EXEMPT_PREFIXES = [
  '/additional-info',
  '/auth',
  '/terms',
  '/refund',
  '/support',
  '/account-deletion',
  '/settings/terms',
  '/settings/privacy',
  '/settings/marketing',
  '/settings/third-party',
  '/settings/refund-guide',
];

export default function AdditionalInfoGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isAuthenticated) return;
    if (!user?.needsAdditionalInfo) return;
    if (
      EXEMPT_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      )
    ) {
      return;
    }
    router.replace('/additional-info');
  }, [isLoaded, isAuthenticated, user, pathname, router]);

  return null;
}
