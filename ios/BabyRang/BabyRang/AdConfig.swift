import AppTrackingTransparency
import Foundation

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
    /// 아직 묻지 않았다면 ATT 권한을 요청하고 응답을 받은 뒤 반환한다.
    ///
    /// 첫 광고 요청 전에 호출해야 한다. 응답 전에 광고를 요청하면
    /// 그 요청은 비맞춤 광고로 처리되어 단가가 낮아진다.
    /// ATT 응답을 기다리는 최대 시간. 이 시간을 넘기면 광고를 먼저 띄운다.
    private static let timeout: Duration = .seconds(3)

    @MainActor
    static func resolveTrackingAuthorization() async {
        guard ATTrackingManager.trackingAuthorizationStatus == .notDetermined else { return }

        // 시스템 프롬프트는 앱이 active 상태가 아니면 응답 없이 묶일 수 있다.
        // 여기서 무한정 기다리면 배너가 영구히 생성되지 않으므로 타임아웃을 둔다.
        // (맞춤 광고 여부만 늦게 반영되고, 광고 노출 자체는 막히지 않는다.)
        await withTaskGroup(of: Void.self) { group in
            group.addTask { _ = await ATTrackingManager.requestTrackingAuthorization() }
            group.addTask { try? await Task.sleep(for: timeout) }
            await group.next()
            group.cancelAll()
        }
    }
}
