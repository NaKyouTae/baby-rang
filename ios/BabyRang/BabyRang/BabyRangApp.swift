//
//  BabyRangApp.swift
//  BabyRang
//
//  Created by 나규태 on 4/10/26.
//

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
