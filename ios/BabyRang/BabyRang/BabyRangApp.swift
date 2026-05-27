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
                WebView(url: URL(string: "https://baby-rang.spectrify.kr/home")!) {
                    isWebViewLoaded = true
                }
                .ignoresSafeArea()

                SplashView()
                    .ignoresSafeArea()
                    .opacity(isWebViewLoaded ? 0 : 1)
                    .allowsHitTesting(!isWebViewLoaded)
                    .animation(.easeOut(duration: 0.4), value: isWebViewLoaded)
                    .zIndex(10)
            }
            .onAppear {
                // didFinish가 안 떨어지는 경우(네트워크 오류 등) 대비 6초 후 강제 dismiss
                DispatchQueue.main.asyncAfter(deadline: .now() + 6) {
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
