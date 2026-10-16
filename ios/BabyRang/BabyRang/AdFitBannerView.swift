import AdFitSDK
import OSLog
import SwiftUI
import UIKit

/// 애드핏 배너 진단 로그. AdMob 과 같은 subsystem 에 카테고리만 나눠
/// Console.app 에서 두 네트워크를 함께 보거나 따로 걸러 볼 수 있게 한다.
let adFitLogger = Logger(subsystem: "kr.spectrify.baby-rang", category: "AdFit")

/// 카카오 애드핏 배너를 SwiftUI 에 올리는 래퍼.
///
/// BannerAdView(AdMob)와 같은 규칙을 따른다 — ATT 응답 전에는 요청하지 않고,
/// 숨길 때는 실제 isHidden 을 쓰고, 로드 성공/실패를 밖으로 알려 노필일 때
/// 호출측이 슬롯을 접을 수 있게 한다.
struct AdFitBannerView: UIViewRepresentable {
    let clientID: String
    /// ATT 응답을 받았는지(그리고 이 네트워크가 선택됐는지).
    ///
    /// 추적 동의 전에 광고를 요청하면 "동의 전 데이터 수집"이 되어 심사 기준에 걸리는 건
    /// AdMob 과 같다. 그래서 AdMob 과 같은 신호로 막는다.
    let canLoad: Bool
    /// 배너를 화면에서 감출지 여부.
    ///
    /// opacity 0 이나 height 0 으로만 숨기면 SDK 가 여전히 노출로 집계할 수 있다.
    /// 무효 노출은 정책 위반이므로 UIView 를 실제로 isHidden 처리한다.
    let isBannerHidden: Bool
    let onLoaded: () -> Void
    let onFailed: () -> Void

    /// 배너 규격(320x50).
    ///
    /// 애드핏 배너 뷰는 320x50pt 보다 작으면 광고를 띄우지 않고 실패(오류 4)한다.
    /// 슬롯을 접을 때 SwiftUI 가 높이를 0 으로 줄이는데, 그 크기가 그대로 배너 뷰에
    /// 전달되면 안 되므로 컨테이너 안에 고정 크기로 띄워 둔다.
    static let size = CGSize(width: 320, height: 50)
    static var height: CGFloat { size.height }

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoaded: onLoaded, onFailed: onFailed)
    }

    func makeUIView(context: Context) -> UIView {
        #if DEBUG
        // SDK 의 테스트 모드. 개발 중에 실제 단위로 노출·클릭이 쌓이면
        // 무효 트래픽으로 매체가 제재될 수 있어 DEBUG 에서만 켠다.
        AdFit.testMode = true
        #endif

        let container = UIView()
        container.backgroundColor = .clear

        let banner = AdFitBannerAdView(clientId: clientID, adUnitSize: AdConfig.adFitBannerSize)
        banner.delegate = context.coordinator
        banner.rootViewController = Self.rootViewController()
        banner.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(banner)
        NSLayoutConstraint.activate([
            banner.widthAnchor.constraint(equalToConstant: Self.size.width),
            banner.heightAnchor.constraint(equalToConstant: Self.size.height),
            banner.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            banner.topAnchor.constraint(equalTo: container.topAnchor),
        ])
        context.coordinator.banner = banner
        // 여기서 load 하지 않는다. ATT 응답 전에 요청이 나가면 안 된다.
        return container
    }

    func updateUIView(_ container: UIView, context: Context) {
        guard let banner = context.coordinator.banner else { return }
        // 컨테이너만 숨기면 SDK 가 배너 뷰 자체의 isHidden 만 보고 노출로 셀 수 있어 둘 다 건다.
        container.isHidden = isBannerHidden
        banner.isHidden = isBannerHidden
        // makeUIView 시점에 키 윈도우가 아직 없을 수 있어 여기서 한 번 더 채운다.
        if banner.rootViewController == nil {
            banner.rootViewController = Self.rootViewController()
        }

        // ATT 응답 이후에 딱 한 번만 요청한다. 이후 갱신은 SDK 가 플랫폼 설정(60초)대로 한다.
        // 다시 요청하면 30초 이내 재요청(오류 5)에 걸린다.
        guard canLoad, !context.coordinator.hasRequestedAd else { return }
        context.coordinator.hasRequestedAd = true
        adFitLogger.info("배너 요청: unit=\(clientID, privacy: .public) rootVC=\(banner.rootViewController != nil, privacy: .public)")
        banner.loadAd()
    }

    /// 광고 클릭 후 랜딩 화면 표시에 쓰이는 루트 뷰 컨트롤러.
    private static func rootViewController() -> UIViewController? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }?
            .rootViewController
    }

    @MainActor
    final class Coordinator: NSObject, AdFitBannerAdViewDelegate {
        /// 광고를 이미 요청했는지. updateUIView 가 여러 번 불려도 한 번만 요청한다.
        var hasRequestedAd = false
        /// 컨테이너 안의 실제 배너 뷰. delegate 가 약한 참조라 뷰 계층이 소유한다.
        weak var banner: AdFitBannerAdView?

        private let onLoaded: () -> Void
        private let onFailed: () -> Void

        init(onLoaded: @escaping () -> Void, onFailed: @escaping () -> Void) {
            self.onLoaded = onLoaded
            self.onFailed = onFailed
            super.init()
        }

        func adViewDidReceiveAd(_ bannerAdView: AdFitBannerAdView) {
            adFitLogger.info("✅ 배너 채움")
            onLoaded()
        }

        func adViewDidFailToReceiveAd(_ bannerAdView: AdFitBannerAdView, error: Error) {
            // 노필/크기 부족(4)/30초 내 재요청(5)을 구분하려면 이 메시지가 필요하다.
            adFitLogger.error("❌ 배너 실패: \(String(describing: error), privacy: .public)")
            onFailed()
        }

        func adViewDidClickAd(_ bannerAdView: AdFitBannerAdView) {
            adFitLogger.info("배너 클릭")
        }

        func adViewDidImpressAd(_ bannerAdView: AdFitBannerAdView) {
            adFitLogger.info("배너 노출")
        }
    }
}
