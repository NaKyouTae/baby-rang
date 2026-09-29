package kr.spectrify.babyrang

/**
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
}
