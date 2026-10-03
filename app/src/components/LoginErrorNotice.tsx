'use client';

import { useEffect } from 'react';
import { useLoginPrompt } from './LoginPromptProvider';

// 소셜 로그인 콜백이 실패하면 서버가 /home?loginError=... 로 되돌린다.
// (server/src/auth/oauth-callback-error.filter.ts)
//
// 가입 화면이 없어진 뒤로 실패를 보여줄 화면이 따로 없어서, 로그인 안내를 다시 띄워
// 무엇이 잘못됐는지 알리고 바로 재시도할 수 있게 한다.
//
// useSearchParams 대신 location 을 직접 읽는다 — 레이아웃에 두는 컴포넌트라
// useSearchParams 를 쓰면 모든 페이지가 Suspense 경계를 요구하게 된다.
const MESSAGES: Record<string, string> = {
  social_consent:
    '이름과 전화번호 제공에 동의해야 로그인할 수 있어요. 동의 화면에서 두 항목을 모두 선택해 주세요.',
  login_failed: '로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

// 서버가 어떤 항목이 비었는지 알려주면 그 항목만 짚어 준다.
// "둘 다 선택하라"는 안내는 하나만 빠진 사용자에게는 무엇을 고쳐야 할지 알려주지 못한다.
const FIELD_LABELS: Record<string, string> = {
  name: '이름',
  phone: '전화번호',
};

function consentMessage(missing: string | null): string {
  const labels = (missing ?? '')
    .split(',')
    .map((f) => FIELD_LABELS[f.trim()])
    .filter(Boolean);

  if (labels.length === 0) return MESSAGES.social_consent;
  return `${labels.join('·')} 제공에 동의해야 로그인할 수 있어요. 동의 화면에서 해당 항목을 선택해 주세요.`;
}

export default function LoginErrorNotice() {
  const { openLoginPrompt } = useLoginPrompt();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('loginError');
    if (!code) return;

    openLoginPrompt(
      code === 'social_consent'
        ? consentMessage(params.get('missing'))
        : (MESSAGES[code] ?? MESSAGES.login_failed),
    );

    // 주소에서 지운다. 남겨두면 새로고침·뒤로가기마다 같은 안내가 다시 뜬다.
    params.delete('loginError');
    params.delete('missing');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, [openLoginPrompt]);

  return null;
}
