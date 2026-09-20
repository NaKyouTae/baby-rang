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
    /// ATT 권한을 요청하고 응답을 받은 뒤 반환한다.
    ///
    /// ⚠️ 시스템 ATT 프롬프트는 앱이 `.active` 상태일 때만 표시된다.
    /// 실행 직후(스플래시가 떠 있고 씬이 아직 inactive 인 시점)에 호출하면
    /// 프롬프트가 뜨지 않고 즉시 반환되며 상태는 notDetermined 로 남는다.
    /// (이 순서를 지키지 않아 심사에서 "ATT 프롬프트를 찾을 수 없음"으로 거절된 적이 있다.)
    ///
    /// 그래서 호출은 scenePhase 가 .active 가 된 뒤에 한 번만 이뤄져야 한다.
    /// 여기서는 혹시 모를 지연에 대비해 applicationState 가 active 가 될 때까지만 잠깐 기다린다.
    @MainActor
    static func resolveTrackingAuthorization() async {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }

        await waitUntilActive()

        let status = await ATTrackingManager.requestTrackingAuthorization()
        adLogger.info("ATT 응답: \(status.rawValue, privacy: .public)")
    }

    /// applicationState 가 active 가 될 때까지 기다린다.
    ///
    /// scenePhase 가 .active 여도 UIApplication 쪽 반영이 한 틱 늦을 수 있다.
    /// 취소되지 않는 한 계속 기다린다 — 도중에 포기하면 그 실행에서는
    /// 프롬프트를 영영 못 띄우게 된다.
    @MainActor
    private static func waitUntilActive() async {
        while UIApplication.shared.applicationState != .active {
            if Task.isCancelled { return }
            try? await Task.sleep(for: .milliseconds(100))
        }
    }
}
