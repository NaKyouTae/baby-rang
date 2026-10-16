import Combine
import Foundation

/// 웹이 알려준 "이 화면에서 앱 배너를 놓을 자리".
///
/// 앱 배너(AdMob)는 네이티브 뷰라서 WebView 안에 넣을 수 없다.
/// 그렇다고 좌표를 네이티브에 하드코딩하면 하단바 CSS 치수나 기기 safe area 가
/// 바뀔 때마다 어긋나고, 하단 네비를 숨기는 화면(테스트·결제·메뉴·온보딩·약관)에서는
/// 배너가 엉뚱한 위치에 떠버린다.
/// 그래서 웹이 실제 슬롯을 재서 보내주고 네이티브는 그 값만 따른다.
@MainActor
final class AdSlotModel: ObservableObject {
    /// 뷰포트 하단에서 슬롯 하단까지의 거리(pt).
    /// nil 이면 이 화면에는 배너 자리가 없다는 뜻이므로 배너를 숨긴다.
    @Published var bottomInset: CGFloat?

    /// 슬롯 높이(pt). 웹이 잡아 둔 자리에 맞춰 배너를 그린다.
    @Published var height: CGFloat = 0

    /// 슬롯 가로 폭(pt). iPad 처럼 화면이 콘텐츠 셸보다 넓을 때,
    /// 배너가 화면 전체로 퍼져 콘텐츠 기둥 밖으로 튀어나오는 것을 막는다.
    @Published var width: CGFloat?

    /// 뷰포트 왼쪽에서 슬롯 왼쪽까지의 거리(pt).
    @Published var left: CGFloat = 0

    /// 이 슬롯에 띄울 광고 네트워크. "admob" 또는 "adfit".
    ///
    /// 어떤 네트워크를 쓸지는 웹이 정한다(운영 중 앱 업데이트 없이 전환하려고).
    /// 기본값이 admob 인 이유: network 필드가 생기기 전 웹은 이 값을 보내지 않는데,
    /// 그때까지의 배너는 전부 AdMob 이었다.
    @Published var network: String = AdSlotModel.admob

    static let admob = "admob"
    static let adfit = "adfit"

    /// - Parameter network: visible 슬롯 보고에 실려 온 값.
    ///   nil 이면 기존 네트워크를 유지한다(visible:false 는 보통 network 를 생략하므로,
    ///   여기서 admob 으로 되돌리면 다음 화면에서 네트워크가 깜빡 바뀐다).
    func update(bottomInset: CGFloat?, height: CGFloat, width: CGFloat?, left: CGFloat, network: String? = nil) {
        self.bottomInset = bottomInset
        self.height = height
        self.width = width
        self.left = left
        if let network {
            // 모르는 값은 admob 으로 본다. 웹이 이 빌드가 모르는 네트워크를 보내도
            // 배너가 아예 사라지는 것보다는 기존 동작을 유지하는 편이 낫다.
            let normalized = network == Self.adfit ? Self.adfit : Self.admob
            if self.network != normalized {
                self.network = normalized
            }
        }
    }
}
