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
            if let url = navigationAction.request.url {
                // 카카오톡 등 커스텀 URL 스킴은 외부 앱으로 열기
                if let scheme = url.scheme,
                   !scheme.hasPrefix("http") && scheme != "about" && scheme != "blob" {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }

                if let host = url.host,
                   !host.contains("spectrify.kr") {
                    if navigationAction.navigationType == .linkActivated {
                        UIApplication.shared.open(url)
                        decisionHandler(.cancel)
                        return
                    }
                }
            }
            decisionHandler(.allow)
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
