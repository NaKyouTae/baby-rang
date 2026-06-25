"use client";

import { useEffect, useRef } from "react";

type Props = {
  /** 카카오 광고 unit ID (예: "DAN-go0noPJx8cIt6SU7") */
  unit: string;
  /** 광고 너비 강제값. 미지정 시 디바이스 너비(최대 430)에 맞춤 */
  width?: number;
  /** 광고 높이 (기본: 50) */
  height?: number;
  className?: string;
  /**
   * 광고 채움 여부 변경 콜백. 광고가 채워지면 true, 노출 실패(no-fill)/타임아웃이면 false.
   * 부모가 빈 광고 영역을 collapse 하는 데 사용한다.
   */
  onFilledChange?: (filled: boolean) => void;
};

const APP_MAX_WIDTH = 430;
const DEFAULT_WIDTH = 320;
// 카카오 광고 응답이 이 시간 내에 안 오면 no-fill 로 간주하고 영역을 접는다.
const FILL_TIMEOUT_MS = 4000;

const KAKAO_SDK_SRC = "//t1.kakaocdn.net/kas/static/ba.min.js";

// 진단용 로그. 디바이스/원격 콘솔에서 "[KakaoAd]" 로 필터링해 광고 누락 원인을 추적한다.
// 운영 안정화 후 제거 예정.
const adLog = (unit: string, msg: string, extra?: Record<string, unknown>) => {
  const t = typeof performance !== "undefined" ? Math.round(performance.now()) : 0;
  console.log(`[KakaoAd ${unit}] +${t}ms ${msg}`, extra ?? "");
};

type WindowWithCallbacks = Window & Record<string, (() => void) | undefined>;

/**
 * 카카오 디스플레이 배너.
 * width 미지정 시 디바이스 너비(앱 max-width 430까지)에 맞춰 data-ad-width를 설정한다.
 * 광고가 채워지지 않으면 onFilledChange(false)로 알려 빈 영역을 접게 한다.
 */
export default function KakaoAdBanner({
  unit,
  width: widthOverride,
  height = 50,
  className,
  onFilledChange,
}: Props) {
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!unit) return;
    if (typeof document === "undefined") return;

    const ins = insRef.current;
    if (!ins) return;

    const win = window as unknown as WindowWithCallbacks;
    let filled = false;
    const report = (next: boolean) => {
      if (filled === next) return;
      filled = next;
      adLog(unit, next ? "✅ FILLED (iframe 주입됨)" : "❌ NO-FILL → 영역 접힘");
      onFilledChange?.(next);
    };

    const w =
      widthOverride ??
      Math.min(window.innerWidth || DEFAULT_WIDTH, APP_MAX_WIDTH);
    ins.setAttribute("data-ad-width", String(w));

    // SPA 재마운트 진단: ba.min.js 가 이미 로드돼 있으면 새 <ins> 를 다시 스캔하지
    // 않아 광고가 안 채워지는 흔한 케이스. 스크립트 존재 여부/네트워크 상태를 함께 본다.
    const sdkAlready = !!document.querySelector(`script[src="${KAKAO_SDK_SRC}"]`);
    adLog(unit, "effect 시작", {
      width: w,
      online: typeof navigator !== "undefined" ? navigator.onLine : "n/a",
      sdkAlreadyLoaded: sdkAlready,
      visibility: typeof document !== "undefined" ? document.visibilityState : "n/a",
      insConnected: ins.isConnected,
    });

    // no-fill 콜백 등록 (카카오가 광고를 못 채우면 호출).
    const failName = `__kakaoAdFail_${unit.replace(/[^a-zA-Z0-9]/g, "")}`;
    win[failName] = () => {
      adLog(unit, "data-ad-onfail 콜백 호출됨 (카카오가 no-fill 응답)");
      report(false);
    };
    ins.setAttribute("data-ad-onfail", failName);

    // 채움 감지: ins 안에 iframe 이 주입되면 광고가 들어온 것.
    const observer = new MutationObserver(() => {
      if (ins.querySelector("iframe")) {
        report(true);
        observer.disconnect();
      }
    });
    observer.observe(ins, { childList: true, subtree: true });

    // 타임아웃 폴백: 아직 안 채워졌으면 접는다.
    const timer = window.setTimeout(() => {
      if (!filled) {
        adLog(unit, `⏱️ ${FILL_TIMEOUT_MS}ms 타임아웃 — 응답 없음(no-fail/no-fill)`, {
          hasIframe: !!ins.querySelector("iframe"),
          insHTMLLength: ins.innerHTML.length,
          insDisplay: ins.style.display,
        });
        report(false);
      }
    }, FILL_TIMEOUT_MS);

    const script = document.createElement("script");
    script.async = true;
    script.src = KAKAO_SDK_SRC;
    script.onload = () => adLog(unit, "SDK onload (ba.min.js 로드 완료)");
    script.onerror = () =>
      adLog(unit, "🚫 SDK onerror — ba.min.js 로드 실패(네트워크/차단)");
    document.body.appendChild(script);

    return () => {
      adLog(unit, "cleanup (언마운트/의존성 변경)", { filled });
      observer.disconnect();
      window.clearTimeout(timer);
      delete win[failName];
      try {
        document.body.removeChild(script);
      } catch {
        // 이미 제거됐거나 못 찾는 경우 무시
      }
    };
  }, [unit, widthOverride, onFilledChange]);

  if (!unit) return null;

  return (
    <ins
      ref={insRef}
      className={`kakao_ad_area ${className ?? ""}`.trim()}
      style={{ display: "none" }}
      data-ad-unit={unit}
      data-ad-width={String(widthOverride ?? DEFAULT_WIDTH)}
      data-ad-height={String(height)}
    />
  );
}
