//
//  BabyRangWidgetBundle.swift
//  BabyRangWidget
//
//  Created by 나규태 on 7/2/26.
//

import WidgetKit
import SwiftUI

@main
struct BabyRangWidgetBundle: WidgetBundle {
    var body: some Widget {
        BabyRangWidget()       // 홈 화면 (탭 페이징)
        BabyRangLockWidget()   // 잠금화면 (아이 선택 구성형)
    }
}
