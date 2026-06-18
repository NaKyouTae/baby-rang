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
                // safe area 밖(상태바/홈 인디케이터 영역)은 흰색으로 채운다.
                Color.white.ignoresSafeArea()

                // WebView 는 safe area 에 맞춘다(.ignoresSafeArea 제거).
                // iPad 호환 모드에서 WebView 가 시스템 UI 영역까지 늘어나
                // 상단 헤더·하단 네비가 화면 밖으로 잘리던 문제를 해결한다.
                WebView(url: URL(string: "https://baby-rang.spectrify.kr/home")!) {
                    isWebViewLoaded = true
                }

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
        // Launch Screen storyboard와 동일한 렌더링(scaleAspectFill + clip)을 유지해야
        // 시스템 런치 → SwiftUI splash 전환 시 이미지 크기가 점프하지 않음.
        Image("baby-rang launch screen_1")
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .clipped()
            .background(Color(red: 241 / 255, green: 242 / 255, blue: 244 / 255))
    }
}
