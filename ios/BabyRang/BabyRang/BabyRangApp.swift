//
//  BabyRangApp.swift
//  BabyRang
//
//  Created by 나규태 on 4/10/26.
//

import GoogleMobileAds
import SwiftUI

@main
struct BabyRangApp: App {
    @State private var isWebViewLoaded = false
    @State private var minimumElapsed = false
    /// 웹이 알려주는 배너 슬롯 위치.
    @StateObject private var adSlot = AdSlotModel()

    private var shouldHideSplash: Bool {
        isWebViewLoaded && minimumElapsed
    }

    var body: some Scene {
        WindowGroup {
            ZStack {
                // safe area 밖(상태바/홈 인디케이터 영역)은 흰색으로 채운다.
                Color.white.ignoresSafeArea()

                // WebView 는 safe area 에 맞춘다(.ignoresSafeArea 제거).
                // .ignoresSafeArea() 가 있으면 WebView 가 시스템 UI 영역까지 늘어나
                // 뷰포트(innerHeight)가 실제 보이는 화면보다 커지고, 그 결과
                // fixed bottom:0 하단 네비가 화면 아래로 밀려나 안 보였다.
                // safe area 에 맞추면 WebView 뷰포트 = 실제 보이는 영역이 되어 네비가 보인다.
                WebView(url: URL(string: "https://baby-rang.spectrify.kr/home")!, adSlot: adSlot) {
                    isWebViewLoaded = true
                }

                // 배너는 웹 하단바가 비워 둔 광고 슬롯 위에 겹쳐 놓는다.
                // WebView 아래에 쌓으면 하단 네비보다 더 아래에 깔려서 보기 나쁘다.
                // 정확한 좌표는 웹이 재서 알려준다(AdSlotModel).
                BottomBannerSlot(slot: adSlot)

                SplashView()
                    .ignoresSafeArea()
                    .opacity(shouldHideSplash ? 0 : 1)
                    .allowsHitTesting(!shouldHideSplash)
                    .animation(.easeOut(duration: 0.3), value: shouldHideSplash)
                    .zIndex(10)
            }
            // ATT 요청과 SDK 초기화는 조건부로 사라지지 않는 루트에 붙인다.
            // 배너 쪽에 붙였을 때는 슬롯이 EmptyView 로 접히면서 task 가 아예 실행되지 않았다.
            // SDK 는 start 이전에 들어온 광고 요청을 큐에 담으므로 순서는 안전하다.
            .task {
                await AdConsent.resolveTrackingAuthorization()
                _ = await MobileAds.shared.start()
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

/// WebView 아래에 붙는 하단 배너 슬롯.
///
/// 광고가 실제로 채워지기 전이나 노필일 때는 높이 0 으로 접는다.
/// 빈 띠를 남겨두면 WebView 뷰포트만 줄어들어 레이아웃이 어색해진다.
private struct BottomBannerSlot: View {
    @ObservedObject var slot: AdSlotModel

    @State private var isLoaded = false

    /// 웹이 이 화면에 배너 자리를 보고했고, 광고도 채워진 상태인지.
    private var isVisible: Bool {
        slot.bottomInset != nil && isLoaded
    }

    var body: some View {
        // 배너는 항상 마운트한다. 조건부로 감싸면 EmptyView 로 접히는 순간
        // 붙여둔 modifier 들이 함께 사라져 광고 요청 자체가 일어나지 않는다.
        BannerAdView(
            adUnitID: AdConfig.bottomBannerUnitID,
            isBannerHidden: !isVisible,
            onLoaded: { isLoaded = true },
            onFailed: { isLoaded = false }
        )
        .frame(height: BannerAdView.height)
        .frame(height: isVisible ? BannerAdView.height : 0)
        .clipped()
        // 웹 콘텐츠 셸이 화면보다 좁을 수 있다(iPad). 배너를 화면 전체 폭으로 두면
        // 기둥 밖으로 튀어나오므로, 웹이 알려준 슬롯 폭·좌측 위치에 맞춘다.
        .modifier(SlotGeometry(slot: slot))
        .allowsHitTesting(isVisible)
    }
}

/// 웹이 보고한 슬롯의 가로 폭·좌우 위치·하단 오프셋에 배너를 정렬한다.
private struct SlotGeometry: ViewModifier {
    @ObservedObject var slot: AdSlotModel

    func body(content: Content) -> some View {
        GeometryReader { proxy in
            content
                .frame(width: slot.width ?? proxy.size.width)
                .padding(.bottom, slot.bottomInset ?? 0)
                // 웹 뷰포트 기준 left 를 그대로 쓴다. WebView 가 safe area 안에
                // 놓여 있어 두 좌표계의 원점이 같다.
                .offset(x: slot.left)
                // 아래(bottom)·왼쪽(leading) 기준 정렬.
                // topLeading 으로 두면 배너가 화면 맨 위로 올라가 상태바를 덮는다.
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
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
