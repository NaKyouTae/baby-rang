package kr.spectrify.babyrang

/**
 * 하단 배너 광고 식별자. AdMob·카카오 애드핏 중 무엇을 띄울지는 웹이 정한다(어드민 광고 설정).
 *
 * AdMob 식별자.
 *
 * 디버그 빌드에서는 Google 이 제공하는 테스트 전용 단위를 쓴다.
 * 실제 광고 단위로 개발하면서 개발자가 직접 광고를 클릭하면
 * 무효 트래픽(invalid traffic)으로 계정이 정지될 수 있어서
 * 빌드 타입 단계에서 아예 분리해 둔다. (앱 ID 는 strings.xml 소스셋으로 분리)
 */
object AdConfig {
    /** 홈 하단 배너. */
    val bottomBannerUnitId: String
        get() = if (BuildConfig.DEBUG) {
            // Google 공식 테스트 배너 단위 — 항상 테스트 광고가 채워진다.
            "ca-app-pub-3940256099942544/6300978111"
        } else {
            "ca-app-pub-6008464533427245/5442054978"
        }

    /** 애드핏 하단 배너(320x50). 매체: 아기랑 AOS(kr.spectrify.baby_rang). */
    const val adfitBottomBannerUnitId = "DAN-hxjZ4ij9pP2RuddW"

    /**
     * 애드핏 테스트 모드. 테스트 요청은 과금·노출 지표에서 빠진다.
     * AdMob 테스트 단위와 같은 이유로 디버그 빌드에서만 켠다.
     */
    val adfitTestMode: Boolean
        get() = BuildConfig.DEBUG
}
