import AppTrackingTransparency
import Foundation
import OSLog
import UIKit

/// AdMob 식별자 모음.
///
/// DEBUG 빌드에서는 Google 이 제공하는 테스트 전용 단위를 쓴다.
/// 실제 광고 단위로 개발하면서 개발자가 직접 광고를 클릭하면
/// 무효 트래픽(invalid traffic)으로 계정이 정지될 수 있어서
/// 빌드 구성 단계에서 아예 분리해 둔다.
enum AdConfig {
    /// Info.plist 의 GADApplicationIdentifier 와 동일한 값(참고용).
    static let applicationID = "ca-app-pub-6008464533427245~7115583932"

    /// 홈 하단 앵커 배너.
    static var bottomBannerUnitID: String {
        #if DEBUG
        // Google 공식 테스트 배너 단위 — 항상 테스트 광고가 채워진다.
        "ca-app-pub-3940256099942544/2934735716"
        #else
        "ca-app-pub-6008464533427245/3855956234"
        #endif
    }
}

/// 광고 추적 동의(ATT) 처리.
enum AdConsent {
    /// 앱이 active 가 되기를 기다리는 최대 시간.
    private static let activationTimeout: Duration = .seconds(5)

    /// ATT 권한을 요청하고 응답을 받은 뒤 반환한다.
    ///
    /// ⚠️ 시스템 ATT 프롬프트는 앱이 `.active` 상태일 때만 표시된다.
    /// 실행 직후(스플래시가 떠 있고 씬이 아직 inactive 인 시점)에 호출하면
    /// 프롬프트가 뜨지 않고 즉시 반환되며 상태는 notDetermined 로 남는다.
    /// 그래서 active 가 된 것을 확인한 뒤에 요청해야 한다.
    /// (이 순서를 지키지 않아 심사에서 "ATT 프롬프트를 찾을 수 없음"으로 거절된 적이 있다.)
    @MainActor
    static func resolveTrackingAuthorization() async {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }

        await waitUntilActive()

        // active 를 못 본 채 타임아웃했다면 요청해도 프롬프트가 안 뜬다.
        // 다음 실행 때 다시 시도할 수 있도록 여기서 요청하지 않고 물러난다.
        guard UIApplication.shared.applicationState == .active else {
            adLogger.error("ATT: 앱이 active 가 되지 않아 요청을 건너뜀")
            return
        }

        let status = await ATTrackingManager.requestTrackingAuthorization()
        adLogger.info("ATT 응답: \(status.rawValue, privacy: .public)")
    }

    /// 앱이 foreground active 가 될 때까지 기다린다.
    @MainActor
    private static func waitUntilActive() async {
        let deadline = ContinuousClock.now.advanced(by: activationTimeout)
        while UIApplication.shared.applicationState != .active {
            if ContinuousClock.now >= deadline { return }
            try? await Task.sleep(for: .milliseconds(100))
        }
    }
}
