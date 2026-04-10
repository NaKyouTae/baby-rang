import SwiftUI

@main
struct BabyRangApp: App {
    var body: some Scene {
        WindowGroup {
            WebView(url: URL(string: "https://baby-rang.spectrify.kr")!)
                .ignoresSafeArea()
        }
    }
}
