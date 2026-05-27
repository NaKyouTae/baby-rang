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
    @State private var minimumElapsed = false

    private var shouldHideSplash: Bool {
        isWebViewLoaded && minimumElapsed
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                WebView(url: URL(string: "https://baby-rang.spectrify.kr/home")!) {
                    isWebViewLoaded = true
                }
                .ignoresSafeArea()

                SplashView()
                    .ignoresSafeArea()
                    .opacity(shouldHideSplash ? 0 : 1)
                    .allowsHitTesting(!shouldHideSplash)
                    .animation(.easeOut(duration: 0.3), value: shouldHideSplash)
                    .zIndex(10)
            }
            .onAppear {
                // 브랜드 노출 최소 1초 보장
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    minimumElapsed = true
                }
                // didCommit이 안 떨어지는 경우(네트워크 오류 등) 대비 2초 후 강제 dismiss
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                    if !isWebViewLoaded {
                        isWebViewLoaded = true
                    }
                }
            }
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
