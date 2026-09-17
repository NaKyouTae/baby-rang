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

    func update(bottomInset: CGFloat?, height: CGFloat) {
        self.bottomInset = bottomInset
        self.height = height
    }
}
