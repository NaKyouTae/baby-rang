'use client';

// 네이티브 앱에서 AdMob 보상형 광고를 띄운다.
//
// 웹(WebView)은 AdMob SDK 를 부를 수 없어 네이티브에 맡긴다.
// (ios/.../RewardedAdBridge.swift, android/.../RewardedAdManager.kt 와 짝)
//
// ⚠️ 보석은 여기 결과로 주지 않는다. 광고를 끝까지 보면 AdMob 이 서버로 서명된
//    콜백(SSV)을 보내고, 서버가 그걸 확인해 준다(server/src/ad-rewards).
//    여기서 받는 earned 는 "지급을 기다려 볼 만하다"는 신호일 뿐이다.

interface BridgeWindow extends Window {
  webkit?: {
    messageHandlers?: Record<string, { postMessage: (body: unknown) => void }>;
  };
  Android?: { showRewardedAd?: (json: string) => void };
  __rewardedAdBridge?: {
    resolve: (requestId: string, payload: BridgeResponse) => void;
  };
}

type BridgeResponse =
  | { ok: true; earned: boolean }
  | { ok: false; message?: string };

type Request = {
  requestId: string;
  /** 서버가 만든 시청 건 id. 광고의 custom_data 로 실려 콜백에 돌아온다. */
  rewardId: string;
  userId: string;
};

function bridge(): ((req: Request) => void) | null {
  if (typeof window === 'undefined') return null;
  const w = window as BridgeWindow;

  const ios = w.webkit?.messageHandlers?.rewardedAd;
  if (ios) return (req) => ios.postMessage(req);

  const android = w.Android?.showRewardedAd;
  // ⚠️ @JavascriptInterface 는 JS 객체를 못 받는다. JSON 문자열로 넘긴다.
  if (typeof android === 'function') {
    return (req) => w.Android?.showRewardedAd?.(JSON.stringify(req));
  }

  return null;
}

/**
 * 보상형 광고를 띄울 수 있는 빌드인지.
 * 웹 브라우저·TWA·브리지가 들어가기 전 앱 빌드에서는 false 다.
 */
export function isRewardedAdAvailable(): boolean {
  return bridge() !== null;
}

let seq = 0;
const pending = new Map<string, (payload: BridgeResponse) => void>();

/**
 * 광고를 띄우고, 끝까지 봤는지 돌려준다. 중간에 닫으면 false.
 *
 * ⚠️ 타임아웃을 걸지 않는다. 광고는 30초를 넘기기도 하고, 네이티브는 모든 경로에서
 * 반드시 응답을 돌려준다.
 */
export function showRewardedAd(rewardId: string, userId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const send = bridge();
    if (!send) {
      reject(new Error('광고를 볼 수 없는 환경입니다.'));
      return;
    }

    const w = window as BridgeWindow;
    if (!w.__rewardedAdBridge) {
      w.__rewardedAdBridge = {
        resolve(requestId, payload) {
          const fn = pending.get(requestId);
          if (!fn) return;
          pending.delete(requestId);
          fn(payload);
        },
      };
    }

    const requestId = `ad-${++seq}-${Date.now()}`;
    pending.set(requestId, (payload) => {
      if (payload.ok) resolve(payload.earned);
      else reject(new Error(payload.message || '광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'));
    });
    send({ requestId, rewardId, userId });
  });
}
