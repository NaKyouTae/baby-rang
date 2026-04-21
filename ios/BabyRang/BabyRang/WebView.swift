import SwiftUI
import WebKit
import CoreLocation

struct WebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
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

        override init() {
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
            }
        }

        // MARK: - WKNavigationDelegate

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
