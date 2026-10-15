// 최근 로그인 수단 기억.
//
// 로그인 화면에서 "최근 로그인" 말풍선을 띄우려면 로그아웃 상태에서도 알 수 있어야
// 해서 서버가 아니라 기기에 남긴다.
//
// 버튼을 누른 순간 바로 확정하지 않고 pending 으로 두었다가 실제로 로그인이 끝난 뒤
// (isAuthenticated 가 true 가 된 뒤) 확정한다. 카카오를 눌렀다가 취소하고 네이버로
// 들어온 사람에게 카카오를 "최근 로그인"으로 보여주면 틀린 안내가 된다.
// 웹 OAuth 는 페이지를 떠났다 돌아오므로 pending 도 메모리가 아니라 저장소에 둔다.

export type LoginProvider = 'kakao' | 'naver' | 'apple';

const LAST_KEY = 'baby-rang.lastLoginProvider';
const PENDING_KEY = 'baby-rang.pendingLoginProvider';

function isProvider(v: string | null): v is LoginProvider {
  return v === 'kakao' || v === 'naver' || v === 'apple';
}

export function getLastLoginProvider(): LoginProvider | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return isProvider(v) ? v : null;
  } catch {
    return null;
  }
}

export function markPendingLoginProvider(provider: LoginProvider) {
  try {
    localStorage.setItem(PENDING_KEY, provider);
  } catch {
    // 저장소를 못 쓰는 환경이면 말풍선만 안 뜬다. 로그인 자체는 막지 않는다.
  }
}

export function commitPendingLoginProvider() {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    if (!isProvider(v)) return;
    localStorage.setItem(LAST_KEY, v);
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // 위와 같다.
  }
}
