import Foundation
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser
import WebKit

/// 웹(WKWebView)과 카카오 로그인 SDK 사이의 다리.
///
/// 웹만으로는 카카오톡 앱을 열어 인증할 수 없다. 웹이 메시지 핸들러로 요청을 보내면
/// 여기서 카카오 SDK 를 호출하고, evaluateJavaScript 로 access token 을 돌려준다.
/// 웹 쪽 짝은 app/src/lib/kakaoNativeLogin.ts 다.
///
/// 처리하는 메시지:
///   · kakaoLogin { requestId } → { ok, accessToken } / { ok: false, cancelled } / { ok: false, message }
///
/// 로그인 뒤에는 이름·전화번호 동의 여부를 확인하고, 빠져 있으면 추가 동의를 한 번 더 받는다.
/// 카카오톡 앱 로그인은 "이미 연결된 앱"이면 동의 화면을 건너뛰기 때문에, 나중에 추가한
/// 동의항목은 이 단계가 없으면 영원히 받을 수 없다(서버는 이름·전화번호 없이는 가입을 막는다).
///
/// 돌려준 토큰은 웹이 서버(/auth/kakao/native)로 보내 우리 토큰으로 교환한다.
/// 여기서 우리 세션까지 만들지 않는 이유는, 세션 쿠키는 반드시 웹의 navigation
/// 응답으로 심어야 WKWebView 가 영속화하기 때문이다(session/route.ts 참고).
@MainActor
final class KakaoLoginBridge {
    /// 웹에 결과를 돌려줄 WebView. WebView 가 이 객체를 소유하므로 약한 참조로 잡는다.
    weak var webView: WKWebView?

    static let handlerName = "kakaoLogin"

    /// 다시 묻는 동의항목은 **필수 항목만**이다.
    ///
    /// 선택 항목(연령대)은 최초 동의 화면에서 한 번 묻고 끝낸다. 거절한 사용자에게
    /// 매 로그인마다 같은 화면을 띄우면, 선택이라고 해놓고 계속 조르는 꼴이 된다.
    /// 동의한 사용자의 값은 어차피 정상 수집되므로 재요청할 이유도 없다.
    ///
    /// ⚠️ 여기 적은 값은 카카오 콘솔의 동의항목과 반드시 일치해야 한다.
    ///    콘솔에서 '사용 안 함'인 항목을 scope 로 보내면 로그인 전체가 KOE205 로 막힌다.
    private static let requiredScopes = ["name", "phone_number", "gender"]

    func handle(_ message: WKScriptMessage) {
        let body = message.body as? [String: Any] ?? [:]
        // requestId 가 없으면 응답을 보낼 곳조차 없다. 웹은 타임아웃을 걸지 않으므로
        // 그 외의 모든 경로에서는 반드시 응답을 돌려줘야 Promise 가 풀린다.
        guard let requestId = body["requestId"] as? String else { return }
        Task { await login(requestId: requestId) }
    }

    private func login(requestId: String) async {
        do {
            // 카카오톡이 깔려 있으면 앱으로, 아니면 카카오계정 웹 로그인으로.
            // isKakaoTalkLoginAvailable 은 Info.plist 의 LSApplicationQueriesSchemes 에
            // kakaokompassauth 가 있어야 제대로 판정한다.
            var token: OAuthToken = try await UserApi.isKakaoTalkLoginAvailable()
                ? loginWithKakaoTalk()
                : loginWithKakaoAccount()

            // 아직 동의받지 못한 항목이 있으면 그 항목만 다시 묻는다.
            //
            // ⚠️ 여기서 실패해도 로그인을 깨뜨리면 안 된다. 본 로그인은 이미 끝났고
            //    이건 덤으로 더 받아보는 단계다. 카카오톡에서 막 돌아온 직후에
            //    또 다른 인증 세션을 띄우는 흐름이라 실패(.IllegalState 등)가 잦은데,
            //    그걸 로그인 실패로 올려보내면 사용자는 영문 SDK 오류만 보게 된다.
            //    (Android 쪽은 처음부터 이렇게 되어 있었다 — KakaoLoginManager 참고)
            let missing = await missingScopes()
            if !missing.isEmpty {
                do {
                    token = try await loginWithKakaoAccount(scopes: missing)
                } catch {
                    print("[kakao] 추가 동의 실패, 기존 토큰으로 진행: \(describe(error))")
                }
            }

            reply(requestId, ["ok": true, "accessToken": token.accessToken])
        } catch {
            if isCancelled(error) {
                reply(requestId, ["ok": false, "cancelled": true])
                return
            }
            reply(requestId, [
                "ok": false,
                "message": "로그인을 완료하지 못했습니다.",
                // localizedDescription 은 SdkError 에서 "error 0" 같은 숫자만 내놓아
                // 원인을 알 수 없다. 실제 reason 을 꺼내 로그로 넘긴다.
                "detail": describe(error),
            ])
        }
    }

    /// SdkError 의 실제 원인을 문자열로 꺼낸다.
    ///
    /// SdkError 는 Swift enum 이라 NSError 로 bridge 되면서
    /// "The operation couldn't be completed. (KakaoSDKCommon.SdkError error 0.)" 처럼
    /// 쓸모없는 설명만 남는다. 어느 단계가 왜 실패했는지 알려면 직접 풀어야 한다.
    private func describe(_ error: Error) -> String {
        guard let sdkError = error as? SdkError else {
            return error.localizedDescription
        }
        switch sdkError {
        case .ClientFailed(let reason, let message):
            return "ClientFailed(\(reason)) \(message ?? "")"
        case .ApiFailed(let reason, let info):
            return "ApiFailed(\(reason)) \(info?.msg ?? "")"
        case .AuthFailed(let reason, let info):
            return "AuthFailed(\(reason)) \(info?.errorDescription ?? "")"
        @unknown default:
            // SDK 가 케이스를 늘려도 빌드가 깨지지 않게 둔다.
            return error.localizedDescription
        }
    }

    /// 사용자가 동의 화면을 닫은 경우인지.
    ///
    /// 취소를 에러로 다루면 웹이 "로그인 실패" 문구를 띄운다. 사용자가 스스로 닫은
    /// 것뿐이므로 조용히 원래 화면으로 돌아가야 한다.
    private func isCancelled(_ error: Error) -> Bool {
        if let sdkError = error as? SdkError, sdkError.isClientFailed {
            switch sdkError {
            case .ClientFailed(let reason, _): return reason == .Cancelled
            default: return false
            }
        }
        return false
    }

    /// 아직 동의받지 않은 동의항목 목록.
    ///
    /// 조회에 실패하면 빈 배열을 돌려준다 — 추가 동의 화면을 띄우는 것보다
    /// 일단 로그인을 진행시키고 서버 응답에 맡기는 편이 사용자에게 덜 번거롭다.
    private func missingScopes() async -> [String] {
        guard let account = try? await me()?.kakaoAccount else { return [] }

        var scopes: [String] = []
        if account.nameNeedsAgreement == true { scopes.append("name") }
        if account.phoneNumberNeedsAgreement == true { scopes.append("phone_number") }
        if account.genderNeedsAgreement == true { scopes.append("gender") }
        // 연령대(age_range)는 선택 항목이라 여기서 다시 묻지 않는다.
        return scopes.filter { Self.requiredScopes.contains($0) }
    }

    private func me() async throws -> User? {
        try await withCheckedThrowingContinuation { continuation in
            UserApi.shared.me { user, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }
                continuation.resume(returning: user)
            }
        }
    }

    // MARK: - SDK 콜백 → async

    private func loginWithKakaoTalk() async throws -> OAuthToken {
        try await withCheckedThrowingContinuation { continuation in
            UserApi.shared.loginWithKakaoTalk { token, error in
                Self.resume(continuation, token, error)
            }
        }
    }

    /// scopes 를 넘기면 그 항목만 다시 동의받는 화면이 뜬다(카카오 '추가 항목 동의 받기').
    private func loginWithKakaoAccount(scopes: [String]? = nil) async throws -> OAuthToken {
        try await withCheckedThrowingContinuation { continuation in
            if let scopes {
                UserApi.shared.loginWithKakaoAccount(scopes: scopes) { token, error in
                    Self.resume(continuation, token, error)
                }
                return
            }
            UserApi.shared.loginWithKakaoAccount { token, error in
                Self.resume(continuation, token, error)
            }
        }
    }

    /// 콜백을 continuation 으로 넘긴다.
    /// ⚠️ continuation 은 정확히 한 번만 resume 해야 한다(두 번이면 크래시).
    /// 토큰과 에러가 모두 nil 인 경우까지 막아 둔다.
    private static func resume(
        _ continuation: CheckedContinuation<OAuthToken, Error>,
        _ token: OAuthToken?,
        _ error: Error?,
    ) {
        if let error {
            continuation.resume(throwing: error)
            return
        }
        guard let token else {
            continuation.resume(
                throwing: SdkError(reason: .Unknown, message: "토큰을 받지 못했습니다."),
            )
            return
        }
        continuation.resume(returning: token)
    }

    // MARK: - 웹으로 응답

    private func reply(_ requestId: String, _ payload: [String: Any]) {
        guard let webView else { return }
        guard
            let idData = try? JSONSerialization.data(withJSONObject: [requestId]),
            let payloadData = try? JSONSerialization.data(withJSONObject: payload),
            let idJson = String(data: idData, encoding: .utf8),
            let payloadJson = String(data: payloadData, encoding: .utf8)
        else { return }

        // requestId 는 웹에서 온 값이라 그대로 코드에 넣으면 주입 통로가 된다.
        // 배열로 감싸 JSON 직렬화한 뒤 [0] 으로 꺼내 이스케이프를 JSONSerialization 에 맡긴다.
        let script =
            "window.__kakaoLoginBridge && window.__kakaoLoginBridge.resolve(\(idJson)[0], \(payloadJson))"
        webView.evaluateJavaScript(script)
    }
}
