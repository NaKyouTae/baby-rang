import GoogleMobileAds
import OSLog
import SwiftUI
import UIKit

/// 배너 진단 로그. print 는 Console.app / 기기 로그에 남지 않아 os_log 를 쓴다.
/// Xcode 콘솔이나 Console.app 에서 subsystem 으로 필터링해 본다.
let adLogger = Logger(subsystem: "kr.spectrify.baby-rang", category: "AdMob")

/// AdMob 배너를 SwiftUI 에 올리는 래퍼.
///
/// 로드 성공/실패를 밖으로 알려준다. 노필(no fill)일 때 빈 띠가 그대로 남으면
/// WebView 높이만 깎여서 웹 하단 네비가 위로 밀리기 때문에,
/// 호출측에서 슬롯 자체를 접을 수 있어야 한다.
struct BannerAdView: UIViewRepresentable {
    let adUnitID: String
    /// 배너를 화면에서 감출지 여부.
    ///
    /// opacity 0 이나 height 0 으로만 숨기면 SDK 는 여전히 노출(impression)로
    /// 집계할 수 있다. 무효 노출은 정책 위반이므로 UIView 를 실제로 isHidden 처리한다.
    let isBannerHidden: Bool
    let onLoaded: () -> Void
    let onFailed: () -> Void

    /// 배너 규격(320x50).
    ///
    /// 앵커 적응형 배너는 SDK 13 에서 large 변형만 남고 나머지는 deprecated 됐는데,
    /// large 는 402pt 폭에서 높이 126pt 를 요구한다. 웹 하단 네비까지 있는 이 앱에서
    /// 126pt 는 콘텐츠를 너무 많이 잡아먹어 표준 고정 규격을 쓴다.
    static var height: CGFloat { AdSizeBanner.size.height }

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoaded: onLoaded, onFailed: onFailed)
    }

    func makeUIView(context: Context) -> BannerView {
        let banner = BannerView(adSize: AdSizeBanner)
        banner.adUnitID = adUnitID
        banner.delegate = context.coordinator
        banner.rootViewController = Self.rootViewController()
        adLogger.info("배너 요청: unit=\(adUnitID, privacy: .public) rootVC=\(Self.rootViewController() != nil, privacy: .public)")
        banner.load(Request())
        return banner
    }

    func updateUIView(_ banner: BannerView, context: Context) {
        banner.isHidden = isBannerHidden
        // makeUIView 시점에 키 윈도우가 아직 없을 수 있어 여기서 한 번 더 채운다.
        if banner.rootViewController == nil {
            banner.rootViewController = Self.rootViewController()
        }
    }

    /// 광고 클릭 후 전면 화면 표시에 쓰이는 루트 뷰 컨트롤러.
    private static func rootViewController() -> UIViewController? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }?
            .rootViewController
    }

    @MainActor
    final class Coordinator: NSObject, BannerViewDelegate {
        private let onLoaded: () -> Void
        private let onFailed: () -> Void

        init(onLoaded: @escaping () -> Void, onFailed: @escaping () -> Void) {
            self.onLoaded = onLoaded
            self.onFailed = onFailed
            super.init()
        }

        func bannerViewDidReceiveAd(_ bannerView: BannerView) {
            adLogger.info("✅ 배너 채움 \(bannerView.adSize.size.width, privacy: .public)x\(bannerView.adSize.size.height, privacy: .public)")
            onLoaded()
        }

        func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) {
            // 노필/네트워크/단위 ID 오류를 구분하려면 이 메시지가 필요하다.
            adLogger.error("❌ 배너 실패: \(error.localizedDescription, privacy: .public)")
            onFailed()
        }
    }
}
