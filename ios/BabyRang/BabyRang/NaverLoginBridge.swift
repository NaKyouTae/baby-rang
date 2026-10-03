import Foundation
import NaverThirdPartyLogin
import WebKit

/// 웹(WKWebView)과 네이버 로그인 SDK 사이의 다리.
///
/// 구조는 KakaoLoginBridge 와 같다. 웹이 메시지 핸들러로 요청을 보내면 SDK 를 호출하고,
/// evaluateJavaScript 로 토큰을 돌려준다. 웹 쪽 짝은 app/src/lib/naverNativeLogin.ts 다.
///
/// 처리하는 메시지:
///   · naverLogin { requestId } → { ok, accessToken, refreshToken }
///                              / { ok: false, cancelled } / { ok: false, message }
///
/// ⚠️ 카카오와 달리 refresh token 까지 돌려준다.
///    네이버에는 "이 토큰이 우리 앱 것인가"를 되묻는 API 가 없어서, 서버가 우리
///    client_id·secret 으로 refresh 를 시도해 보는 것으로 대신 확인한다.
///    (server/src/auth/naver.service.ts 의 verifyNativeTokens)
///    그래서 access token 만 올려보내면 서버가 로그인을 거부한다.
///
/// SDK 초기화(consumerKey 등)는 앱 시작 시 한 번만 한다 — BabyRangApp.swift 참고.
@MainActor
final class NaverLoginBridge: NSObject {
    /// 웹에 결과를 돌려줄 WebView. WebView 가 이 객체를 소유하므로 약한 참조로 잡는다.
    weak var webView: WKWebView?

    static let handlerName = "naverLogin"

    /// 응답을 기다리는 요청. SDK 델리게이트는 어떤 요청에 대한 콜백인지 알려주지 않아,
    /// 진행 중인 요청 하나만 들고 있는다(웹도 중복 호출을 막는다).
    private var pendingRequestId: String?

    func handle(_ message: WKScriptMessage) {
        let body = message.body as? [String: Any] ?? [:]
        // requestId 가 없으면 응답을 보낼 곳조차 없다. 그 외 모든 경로에서는
        // 반드시 응답을 돌려줘야 웹의 Promise 가 풀린다(웹은 타임아웃을 걸지 않는다).
        guard let requestId = body["requestId"] as? String else { return }

        // 앞선 요청이 아직 안 끝났으면 그 쪽을 먼저 닫아 준다.
        // 그대로 덮어쓰면 이전 요청의 Promise 가 영원히 풀리지 않는다.
        if let previous = pendingRequestId {
            reply(previous, ["ok": false, "cancelled": true])
        }
        pendingRequestId = requestId

        guard let connection = NaverThirdPartyLoginConnection.getSharedInstance() else {
            finish(["ok": false, "message": "네이버 로그인을 시작할 수 없습니다."])
            return
        }
        connection.delegate = self
        // 매번 새로 인증한다. 기존 토큰이 남아 있으면 동의 화면이 뜨지 않아,
        // 동의항목이 늘었을 때(이름·전화번호) 재동의를 받을 수 없다.
        connection.resetToken()
        connection.requestThirdPartyLogin()
    }

    // MARK: - 응답

    private func finish(_ payload: [String: Any]) {
        guard let requestId = pendingRequestId else { return }
        pendingRequestId = nil
        reply(requestId, payload)
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
            "window.__naverLoginBridge && window.__naverLoginBridge.resolve(\(idJson)[0], \(payloadJson))"
        webView.evaluateJavaScript(script)
    }
}

// MARK: - NaverThirdPartyLoginConnectionDelegate

extension NaverLoginBridge: NaverThirdPartyLoginConnectionDelegate {
    /// 로그인 성공(인증 코드 → 토큰 교환까지 완료).
    func oauth20ConnectionDidFinishRequestACTokenWithAuthCode() {
        let connection = NaverThirdPartyLoginConnection.getSharedInstance()
        guard
            let accessToken = connection?.accessToken,
            let refreshToken = connection?.refreshToken,
            !accessToken.isEmpty,
            !refreshToken.isEmpty
        else {
            // refresh token 이 없으면 서버가 토큰 출처를 확인할 수 없어 어차피 거부된다.
            // 여기서 실패로 끊어야 사용자가 원인 모를 거절을 겪지 않는다.
            finish(["ok": false, "message": "로그인 정보를 받지 못했습니다."])
            return
        }
        finish(["ok": true, "accessToken": accessToken, "refreshToken": refreshToken])
    }

    /// 기존 토큰 갱신. 우리는 매번 resetToken 후 새로 인증하므로 들어오지 않지만,
    /// 프로토콜 요구사항이라 같은 처리로 둔다.
    func oauth20ConnectionDidFinishRequestACTokenWithRefreshToken() {
        oauth20ConnectionDidFinishRequestACTokenWithAuthCode()
    }

    func oauth20ConnectionDidFinishDeleteToken() {}

    func oauth20Connection(
        _ oauthConnection: NaverThirdPartyLoginConnection!,
        didFailWithError error: Error!,
    ) {
        // 사용자가 동의 화면을 닫은 경우를 실패로 다루면 "로그인 실패" 문구가 뜬다.
        // 스스로 닫은 것뿐이므로 조용히 원래 화면으로 돌아가야 한다.
        if oauthConnection?.lastErrorCode == .cancelByUser {
            finish(["ok": false, "cancelled": true])
            return
        }
        finish([
            "ok": false,
            "message": "로그인을 완료하지 못했습니다.",
            // 웹은 이 실패를 화면에 표시만 한다. 원인은 콘솔 로그로만 남는다.
            "detail": error?.localizedDescription ?? "unknown",
        ])
    }
}
