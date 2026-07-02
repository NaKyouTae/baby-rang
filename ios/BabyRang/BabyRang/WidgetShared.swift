//
//  WidgetShared.swift
//  BabyRang + BabyRangWidget (두 타깃 모두에 Target Membership 체크)
//
//  앱과 위젯 익스텐션이 공유하는 App Group 저장소.
//  위젯은 앱과 별개 프로세스라 httpOnly 쿠키/Keychain(앱 전용)에 접근하기 어렵다.
//  앱(웹뷰)이 로그인 상태에서 위젯 토큰 + API base를 여기에 저장해두면,
//  위젯이 백그라운드에서 그 값으로 직접 API를 호출한다.
//

import Foundation

enum WidgetShared {
    // ⚠️ 앱 타깃과 위젯 타깃 양쪽 Signing & Capabilities > App Groups에 동일하게 추가할 것.
    static let appGroupId = "group.kr.spectrify.baby-rang"

    static var defaults: UserDefaults {
        UserDefaults(suiteName: appGroupId) ?? .standard
    }

    private static let kToken = "widget.token"
    private static let kApiBase = "widget.apiBase"

    static var token: String? {
        get { defaults.string(forKey: kToken) }
        set { defaults.set(newValue, forKey: kToken) }
    }

    static var apiBase: String? {
        get { defaults.string(forKey: kApiBase) }
        set { defaults.set(newValue, forKey: kApiBase) }
    }

    /// 웹 브릿지가 넘겨준 설정 저장 후 위젯 타임라인 갱신 요청.
    static func save(token: String, apiBase: String) {
        self.token = token
        self.apiBase = apiBase
    }

    /// 로그아웃 시 위젯 데이터 제거.
    static func clear() {
        defaults.removeObject(forKey: kToken)
        defaults.removeObject(forKey: kApiBase)
    }
}
