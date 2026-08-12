import SwiftUI
import WebKit
import CoreLocation
import WidgetKit

struct WebView: UIViewRepresentable {
    let url: URL
    let onLoad: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onLoad: onLoad)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true

        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = preferences

        // openSettings 메시지 핸들러 등록
        let contentController = configuration.userContentController
        contentController.add(context.coordinator, name: "openSettings")
        // 홈 화면 위젯용 토큰/설정 저장 핸들러
        contentController.add(context.coordinator, name: "saveWidgetData")
        contentController.add(context.coordinator, name: "clearWidgetData")
        // 기록 저장/삭제 직후 위젯 즉시 갱신 요청
        contentController.add(context.coordinator, name: "reloadWidget")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .white

        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false

        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
        private let locationManager = CLLocationManager()
        private var permissionCompletion: ((Bool) -> Void)?
        private let onLoad: () -> Void
        private var hasNotifiedLoad = false

        init(onLoad: @escaping () -> Void) {
            self.onLoad = onLoad
            super.init()
            locationManager.delegate = self

            // 앱 시작 시 위치 권한이 아직 결정되지 않았으면 요청
            // → iOS 설정에 앱 항목이 생성되어 openSettingsURLString이 앱 설정으로 이동함
            if locationManager.authorizationStatus == .notDetermined {
                locationManager.requestWhenInUseAuthorization()
            }
        }

        // MARK: - WKScriptMessageHandler

        func userContentController(_ userContentController: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            if message.name == "openSettings" {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    DispatchQueue.main.async {
                        UIApplication.shared.open(url)
                    }
                }
            } else if message.name == "saveWidgetData" {
                // 웹이 { widgetToken, apiBaseUrl }을 넘겨줌 → App Group 저장 후 위젯 갱신
                guard let body = message.body as? [String: Any],
                      let token = body["widgetToken"] as? String,
                      let apiBase = body["apiBaseUrl"] as? String else { return }
                WidgetShared.save(token: token, apiBase: apiBase)
                WidgetCenter.shared.reloadAllTimelines()
            } else if message.name == "clearWidgetData" {
                // 로그아웃 시 위젯 데이터 제거
                WidgetShared.clear()
                WidgetCenter.shared.reloadAllTimelines()
            } else if message.name == "reloadWidget" {
                // 기록 저장/삭제 직후 웹이 요청 → 위젯 타임라인 즉시 갱신
                WidgetCenter.shared.reloadAllTimelines()
            }
        }

        // MARK: - WKNavigationDelegate

        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
            // HTML 응답이 수신되어 렌더링이 시작되는 시점에 스플래시 페이드아웃을 트리거.
            // didFinish(전체 로드 완료)를 기다리면 JS 번들/데이터 페치까지 끝나야 해서 5초 이상 걸림.
            // didCommit 시점엔 이미 SSR HTML이 그려지고, 웹의 SplashProvider가 동일 splash 이미지로
            // 이어받기 때문에 끊김 없이 전환됨.
            // 중복 호출 방지 (Next.js SPA 내비 시 재호출 가능)
            guard !hasNotifiedLoad else { return }
            hasNotifiedLoad = true
            onLoad()
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = navigationAction.request.url,
               let scheme = url.scheme,
               !scheme.hasPrefix("http"), scheme != "about", scheme != "blob" {
                // 카카오톡·카드사 앱카드 등 커스텀 URL 스킴은 외부 앱으로 열기
                openExternalApp(url, from: webView)
                decisionHandler(.cancel)
                return
            }

            // http(s) 내비게이션은 모두 WebView 안에서 처리한다.
            // 예전에는 spectrify.kr 이 아닌 호스트의 linkActivated 를 사파리로 넘겼는데,
            // 카드사 인증 페이지의 <a> 기반 버튼까지 사파리로 튕겨나가면서
            // 세션이 끊겨 "비정상적인 시도" 오류가 났다.
            // 새 창(target="_blank")으로 여는 외부 링크는 createWebViewWith 에서 처리한다.
            decisionHandler(.allow)
        }

        /// 외부 앱 스킴을 연다. 해당 앱이 설치돼 있지 않으면 WebView 안에서 사용자에게 알린다.
        /// canOpenURL 대신 open(completionHandler:) 를 쓰는 이유: canOpenURL 은 Info.plist 의
        /// LSApplicationQueriesSchemes 에 등록된 스킴만 true 를 돌려주는데,
        /// 카드사 앱 스킴은 카드사마다 다르고 수시로 바뀌어 전부 등록해 둘 수 없다.
        private func openExternalApp(_ url: URL, from webView: WKWebView) {
            UIApplication.shared.open(url, options: [:]) { [weak webView] success in
                guard !success, let webView else { return }
                let message = "결제에 필요한 앱이 설치되어 있지 않습니다. "
                    + "앱스토어에서 설치한 뒤 다시 시도해 주세요."
                let escaped = message.replacingOccurrences(of: "'", with: "\\'")
                webView.evaluateJavaScript("alert('\(escaped)')")
            }
        }

        // MARK: - WKUIDelegate (popup / window.open)

        /// 카드사 인증 페이지 일부는 window.open 으로 창을 띄운다.
        /// 이 델리게이트를 구현하지 않으면 WKWebView 가 해당 내비게이션을 조용히 버려서
        /// 인증 화면이 아예 뜨지 않는다.
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            guard let url = navigationAction.request.url else { return nil }

            if let scheme = url.scheme,
               !scheme.hasPrefix("http"), scheme != "about", scheme != "blob" {
                openExternalApp(url, from: webView)
                return nil
            }

            if let host = url.host, !host.contains("spectrify.kr"),
               navigationAction.navigationType == .linkActivated {
                // 서비스 외부 사이트를 새 창으로 여는 링크는 사파리로 넘긴다.
                UIApplication.shared.open(url)
                return nil
            }

            // 그 외 새 창 요청(결제/인증 팝업 포함)은 현재 WebView 에서 이어서 연다.
            webView.load(navigationAction.request)
            return nil
        }

        /// 팝업이 window.close() 를 호출하면 원래 화면으로 되돌린다.
        /// createWebViewWith 에서 같은 WebView 에 로드했기 때문에 닫기 = 뒤로 가기다.
        func webViewDidClose(_ webView: WKWebView) {
            if webView.canGoBack {
                webView.goBack()
            }
        }

        // MARK: - WKUIDelegate (Geolocation permission)

        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }

        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestGeolocationPermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            let status = locationManager.authorizationStatus
            switch status {
            case .notDetermined:
                permissionCompletion = { granted in
                    decisionHandler(granted ? .grant : .deny)
                }
                locationManager.requestWhenInUseAuthorization()
            case .authorizedWhenInUse, .authorizedAlways:
                decisionHandler(.grant)
            default:
                decisionHandler(.deny)
            }
        }

        // MARK: - CLLocationManagerDelegate

        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
            let status = manager.authorizationStatus
            if status != .notDetermined {
                let granted = (status == .authorizedWhenInUse || status == .authorizedAlways)
                permissionCompletion?(granted)
                permissionCompletion = nil
            }
        }
    }
}
