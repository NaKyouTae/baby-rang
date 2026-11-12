import Foundation
import GoogleMobileAds
import OSLog
import UIKit
import WebKit

/// 웹(WKWebView)과 AdMob 보상형 광고 사이의 다리. 보석함의 '광고 보고 보석 받기'.
///
/// 웹 쪽 짝은 app/src/lib/rewardedAd.ts, Android 는 RewardedAdManager.kt 다.
///
/// 처리하는 메시지:
///   · rewardedAd { requestId, rewardId, userId } → { ok: true, earned } / { ok: false, message }
///
/// ⚠️ 보석은 여기서 주지 않는다. rewardId 를 SSV custom_data 로 실어 보내면 AdMob 이
///    서버로 서명된 콜백을 보내고, 서버가 그걸 확인해 준다(server/src/ad-rewards).
///
/// ⚠️ 광고 SDK 는 ATT 응답 뒤에 시작한다(BabyRangApp). 그래서 앱 시작 때 미리 받지 않고,
///    처음 요청 때 받은 뒤부터 다음 광고를 미리 받아 둔다.
@MainActor
final class RewardedAdBridge: NSObject, FullScreenContentDelegate {
    /// 웹에 결과를 돌려줄 WebView. WebView 가 이 객체를 소유하므로 약한 참조로 잡는다.
    weak var webView: WKWebView?

    static let handlerName = "rewardedAd"

    private var ad: RewardedAd?
    private var loading = false
    /// 광고를 받는 중에 들어온 요청. 받는 즉시 띄운다.
    private var waiting: AdRequest?
    /// 띄우고 있는 요청과, 끝까지 봤는지.
    private var showing: (requestId: String, earned: Bool)?

    /// 웹이 보낸 요청. (SDK 의 Request 와 이름이 겹치지 않게 따로 부른다)
    private struct AdRequest {
        let requestId: String
        let rewardId: String
        let userId: String
    }

    func handle(_ message: WKScriptMessage) {
        let body = message.body as? [String: Any] ?? [:]
        // requestId 가 없으면 응답을 보낼 곳조차 없다. 그 외 모든 경로에서는
        // 반드시 응답을 돌려줘야 웹의 Promise 가 풀린다(웹은 타임아웃을 걸지 않는다).
        guard let requestId = body["requestId"] as? String else { return }
        guard showing == nil, waiting == nil else {
            reply(requestId, ["ok": false, "message": "광고를 이미 보고 있어요."])
            return
        }
        let request = AdRequest(
            requestId: requestId,
            rewardId: body["rewardId"] as? String ?? "",
            userId: body["userId"] as? String ?? "",
        )
        if ad != nil {
            show(request)
        } else {
            waiting = request
            preload()
        }
    }

    private func preload() {
        guard ad == nil, !loading else { return }
        loading = true
        Task {
            do {
                let loaded = try await RewardedAd.load(with: AdConfig.rewardedUnitID, request: Request())
                loading = false
                ad = loaded
                if let request = waiting {
                    waiting = nil
                    show(request)
                }
            } catch {
                loading = false
                adLogger.error("보상형 광고 로드 실패: \(error.localizedDescription, privacy: .public)")
                if let request = waiting {
                    waiting = nil
                    replyFailed(request.requestId)
                }
            }
        }
    }

    private func show(_ request: AdRequest) {
        guard let current = ad, let root = Self.topViewController() else {
            replyFailed(request.requestId)
            return
        }
        ad = nil

        let options = ServerSideVerificationOptions()
        options.customRewardText = request.rewardId
        options.userIdentifier = request.userId
        current.serverSideVerificationOptions = options
        current.fullScreenContentDelegate = self

        showing = (request.requestId, false)
        current.present(from: root) { [weak self] in
            self?.showing?.earned = true
        }
    }

    // MARK: - FullScreenContentDelegate

    nonisolated func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        MainActor.assumeIsolated {
            guard let showing else { return }
            self.showing = nil
            reply(showing.requestId, ["ok": true, "earned": showing.earned])
            preload()
        }
    }

    nonisolated func ad(_ ad: FullScreenPresentingAd,
                        didFailToPresentFullScreenContentWithError error: Error) {
        MainActor.assumeIsolated {
            adLogger.error("보상형 광고 표시 실패: \(error.localizedDescription, privacy: .public)")
            guard let showing else { return }
            self.showing = nil
            replyFailed(showing.requestId)
            preload()
        }
    }

    // MARK: - 응답

    private func replyFailed(_ requestId: String) {
        reply(requestId, ["ok": false, "message": "광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."])
    }

    private func reply(_ requestId: String, _ payload: [String: Any]) {
        guard let webView else { return }
        guard
            let idData = try? JSONSerialization.data(withJSONObject: [requestId]),
            let payloadData = try? JSONSerialization.data(withJSONObject: payload),
            let idJson = String(data: idData, encoding: .utf8),
            let payloadJson = String(data: payloadData, encoding: .utf8)
        else { return }

        // requestId 는 웹에서 온 값이라 그대로 코드에 넣으면 주입 통로가 된다.
        // 배열로 감싸 JSON 직렬화한 뒤 [0] 으로 꺼내 이스케이프를 맡긴다.
        let script =
            "window.__rewardedAdBridge && window.__rewardedAdBridge.resolve(\(idJson)[0], \(payloadJson))"
        webView.evaluateJavaScript(script)
    }

    /// 전면 광고를 띄울 화면. 이미 다른 화면이 모달로 떠 있으면 그 위에 띄워야 한다.
    private static func topViewController() -> UIViewController? {
        var top = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first { $0.isKeyWindow }?
            .rootViewController
        while let presented = top?.presentedViewController {
            top = presented
        }
        return top
    }
}
