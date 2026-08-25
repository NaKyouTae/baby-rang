"use client";

import { useEffect, useRef, useState } from "react";

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
  /**
   * 부모 컨테이너 가로폭을 꽉 채운다.
   *
   * AdFit 소재는 유닛 등록 시 정해진 규격(320x50 등)으로만 내려온다.
   * data-ad-width 에 디바이스 너비를 넣어도 소재가 그만큼 커지지 않고
   * 320px 로 렌더된 뒤 가운데 정렬되어 좌우 여백이 생긴다.
   * 그래서 요청은 규격대로(320) 보내고, 받은 소재를 CSS transform 으로 확대한다.
   */
  stretch?: boolean;
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
  stretch = false,
}: Props) {
  const insRef = useRef<HTMLModElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // AdFit 에 실제로 요청하는 소재 규격. stretch 여부와 무관하게 이 값으로 요청한다.
  const baseWidth = widthOverride ?? DEFAULT_WIDTH;

  // stretch 모드에서 컨테이너 폭을 재서 확대 배율을 구한다.
  // 회전·분할화면 등으로 폭이 바뀌면 ResizeObserver 가 다시 계산한다.
  useEffect(() => {
    if (!stretch) return;
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / baseWidth);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stretch, baseWidth]);

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

    // stretch 모드는 규격대로(320) 요청하고 확대는 CSS 가 담당한다.
    // 비-stretch 모드는 기존 동작(디바이스 너비 요청)을 유지한다.
    const w = stretch
      ? baseWidth
      : (widthOverride ??
        Math.min(window.innerWidth || DEFAULT_WIDTH, APP_MAX_WIDTH));
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
  }, [unit, widthOverride, onFilledChange, stretch, baseWidth]);

  if (!unit) return null;

  // style 은 AdFit SDK 가 채움 시점에 직접 건드린다(display 등).
  // 그래서 확대 transform 은 ins 가 아니라 바깥 래퍼에 건다.
  const ins = (
    <ins
      ref={insRef}
      className={`kakao_ad_area ${className ?? ""}`.trim()}
      style={{ display: "none" }}
      data-ad-unit={unit}
      data-ad-width={String(baseWidth)}
      data-ad-height={String(height)}
    />
  );

  if (!stretch) return ins;

  // scale = 컨테이너폭 / baseWidth 이므로, top-left 기준으로 확대하면
  // 확대된 소재의 폭이 컨테이너 폭과 정확히 일치한다(별도 중앙정렬 불필요).
  // 세로도 같은 배율로 커지므로 바깥 높이를 height * scale 로 잡아
  // 확대분이 아래 콘텐츠를 덮지 않게 한다.
  return (
    <div
      ref={wrapRef}
      className="w-full overflow-hidden"
      style={{ height: height * scale }}
    >
      <div
        style={{
          width: baseWidth,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {ins}
      </div>
    </div>
  );
}
