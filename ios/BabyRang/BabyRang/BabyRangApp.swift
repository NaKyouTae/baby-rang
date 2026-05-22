//
//  BabyRangApp.swift
//  BabyRang
//
//  Created by 나규태 on 4/10/26.
//

import SwiftUI

@main
struct BabyRangApp: App {
    @State private var isWebViewLoaded = false

    var body: some Scene {
        WindowGroup {
            ZStack {
                WebView(
                    url: URL(string: "https://baby-rang.spectrify.kr")!,
                    isLoaded: $isWebViewLoaded
                )
                .ignoresSafeArea()

                if !isWebViewLoaded {
                    SplashView()
                        .transition(.opacity)
                        .ignoresSafeArea()
                }
            }
            .animation(.easeOut(duration: 0.4), value: isWebViewLoaded)
        }
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Color(red: 241 / 255, green: 242 / 255, blue: 244 / 255)
                .ignoresSafeArea()
            Image("baby-rang launch screen_1")
                .resizable()
                .aspectRatio(contentMode: .fit)
        }
    }
}
