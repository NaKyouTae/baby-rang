//
//  BabyRangWidget.swift
//  BabyRangWidget
//
//  홈 화면 위젯 — 아이 이름/디데이 + 마지막 수유·수면·기저귀 경과시간.
//  App Group에 저장된 위젯 토큰으로 NestJS API를 직접 호출(최신성 우선).
//  절대 시각만 받아 "~전"은 기기에서 계산 → 새로고침 사이에도 경과시간이 흘러감.
//
//  ⚠️ 위젯 타깃 Signing & Capabilities > App Groups에 group.kr.spectrify.baby-rang 추가 필요.
//     (앱이 이 그룹에 widget.token / widget.apiBase 를 저장하고, 위젯이 읽는다)
//

import WidgetKit
import SwiftUI
import AppIntents

// MARK: - App Group 공유 저장소 (앱의 WidgetShared.swift와 키/그룹ID 동일하게 유지)

private enum WidgetStore {
    static let appGroupId = "group.kr.spectrify.baby-rang"
    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupId) }
    static var token: String? { defaults?.string(forKey: "widget.token") }
    static var apiBase: String? { defaults?.string(forKey: "widget.apiBase") }

    // 탭-페이징 상태: 현재 선택된 아이 + 전체 아이 순서(다음 아이 계산용)
    static var selectedChildId: String? {
        get { defaults?.string(forKey: "widget.selectedChildId") }
        set { defaults?.set(newValue, forKey: "widget.selectedChildId") }
    }
    static var childOrder: [String] {
        get { defaults?.stringArray(forKey: "widget.childOrder") ?? [] }
        set { defaults?.set(newValue, forKey: "widget.childOrder") }
    }
}

// MARK: - 탭 시 다음 아이로 넘기는 App Intent (iOS 17+)

struct NextChildIntent: AppIntent {
    static var title: LocalizedStringResource = "다음 아이 보기"
    func perform() async throws -> some IntentResult {
        let order = WidgetStore.childOrder
        guard order.count > 1 else { return .result() }
        let current = WidgetStore.selectedChildId ?? order.first
        let idx = current.flatMap { order.firstIndex(of: $0) } ?? 0
        WidgetStore.selectedChildId = order[(idx + 1) % order.count]
        return .result()   // perform 완료 후 WidgetKit이 타임라인을 자동 갱신
    }
}

// MARK: - Model

struct BabySummary {
    var childName: String
    var birthDate: Date?
    var lastFeedingAt: Date?
    var lastSleepAt: Date?
    var lastDiaperAt: Date?
    var pageIndex: Int = 0
    var pageCount: Int = 1
}

struct BabyEntry: TimelineEntry {
    let date: Date
    let state: EntryState
}

enum EntryState {
    case loggedOut          // 토큰 없음(미로그인)
    case noChild            // 로그인했지만 등록된 아이 없음
    case summary(BabySummary)
}

// MARK: - API

private struct ChildDTO: Decodable {
    let id: String
    let name: String
}

private struct SummaryDTO: Decodable {
    let childId: String
    let childName: String
    let birthDate: String?      // YYYY-MM-DD
    let lastFeedingAt: String?
    let lastSleepAt: String?
    let lastDiaperAt: String?
    let children: [ChildDTO]?   // 구버전 백엔드 호환 — 없으면 단일 아이로 동작
}

private enum WidgetAPI {
    // childIdOverride: 잠금화면(구성형)은 인텐트로 지정된 아이,
    // 없으면 홈(탭 페이징)의 저장된 선택 아이 사용.
    static func fetchSummary(childIdOverride: String? = nil) async -> EntryState {
        guard let token = WidgetStore.token,
              let base = WidgetStore.apiBase,
              var comps = URLComponents(string: "\(base)/growth-records/widget-summary")
        else { return .loggedOut }

        let cid = childIdOverride ?? WidgetStore.selectedChildId
        if let cid {
            comps.queryItems = [URLQueryItem(name: "childId", value: cid)]
        }
        guard let url = comps.url else { return .loggedOut }

        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 15

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            if let http = resp as? HTTPURLResponse, http.statusCode == 401 {
                return .loggedOut
            }
            // 아이가 없으면 백엔드가 null 반환 → 빈 body
            if data.isEmpty || (String(data: data, encoding: .utf8) == "null") {
                WidgetStore.childOrder = []
                return .noChild
            }
            let dto = try JSONDecoder().decode(SummaryDTO.self, from: data)
            // 다음-아이 계산을 위해 순서 저장, 현재 아이의 페이지 인덱스 계산
            let order = (dto.children ?? []).map { $0.id }
            WidgetStore.childOrder = order
            let idx = order.firstIndex(of: dto.childId) ?? 0
            return .summary(BabySummary(
                childName: dto.childName,
                birthDate: parseDate(dto.birthDate),
                lastFeedingAt: parseISO(dto.lastFeedingAt),
                lastSleepAt: parseISO(dto.lastSleepAt),
                lastDiaperAt: parseISO(dto.lastDiaperAt),
                pageIndex: idx,
                pageCount: max(order.count, 1)
            ))
        } catch {
            return .loggedOut
        }
    }

    // 아이 목록만 조회 (잠금화면 구성형 위젯의 아이 선택지용)
    static func fetchChildren() async -> [ChildDTO] {
        guard let token = WidgetStore.token,
              let base = WidgetStore.apiBase,
              let url = URL(string: "\(base)/growth-records/widget-summary")
        else { return [] }
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.cachePolicy = .reloadIgnoringLocalCacheData
        req.timeoutInterval = 15
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            if let http = resp as? HTTPURLResponse, http.statusCode != 200 { return [] }
            if data.isEmpty || String(data: data, encoding: .utf8) == "null" { return [] }
            return try JSONDecoder().decode(SummaryDTO.self, from: data).children ?? []
        } catch {
            return []
        }
    }

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let isoNoFrac = ISO8601DateFormatter()

    static func parseISO(_ s: String?) -> Date? {
        guard let s else { return nil }
        return iso.date(from: s) ?? isoNoFrac.date(from: s)
    }

    static func parseDate(_ s: String?) -> Date? {
        guard let s else { return nil }
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Asia/Seoul")
        return f.date(from: s)
    }
}

// MARK: - 아이 선택 (잠금화면 구성형 위젯용, App Intents)

struct ChildEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "아이"
    static var defaultQuery = ChildQuery()
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct ChildQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [ChildEntity] {
        let all = await WidgetAPI.fetchChildren()
        return all
            .filter { identifiers.contains($0.id) }
            .map { ChildEntity(id: $0.id, name: $0.name) }
    }
    func suggestedEntities() async throws -> [ChildEntity] {
        await WidgetAPI.fetchChildren().map { ChildEntity(id: $0.id, name: $0.name) }
    }
    func defaultResult() async -> ChildEntity? {
        try? await suggestedEntities().first
    }
}

struct SelectChildIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "아이 선택"
    static var description = IntentDescription("위젯에 표시할 아이를 선택합니다.")

    @Parameter(title: "아이")
    var child: ChildEntity?
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> BabyEntry {
        BabyEntry(date: Date(), state: .summary(BabySummary(
            childName: "우리 아기", birthDate: Date(),
            lastFeedingAt: Date().addingTimeInterval(-3600),
            lastSleepAt: Date().addingTimeInterval(-1800),
            lastDiaperAt: Date().addingTimeInterval(-7200))))
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyEntry) -> Void) {
        Task {
            let state = await WidgetAPI.fetchSummary()
            completion(BabyEntry(date: Date(), state: state))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyEntry>) -> Void) {
        Task {
            let state = await WidgetAPI.fetchSummary()
            let now = Date()
            // 5분마다 갱신 요청(iOS가 예산 내에서 조정 — 실제 간격은 더 길 수 있음).
            let next = Calendar.current.date(byAdding: .minute, value: 5, to: now)!
            let timeline = Timeline(entries: [BabyEntry(date: now, state: state)], policy: .after(next))
            completion(timeline)
        }
    }
}

// MARK: - Relative time (KO)

private func agoText(_ date: Date?, now: Date) -> String {
    guard let date else { return "기록 없음" }
    let s = max(0, Int(now.timeIntervalSince(date)))
    let days = s / 86400
    let hours = (s % 86400) / 3600
    let mins = (s % 3600) / 60
    if days > 0 { return "\(days)일 \(hours)시간 전" }
    if hours > 0 { return "\(hours)시간 \(mins)분 전" }
    return "\(mins)분 전"
}

private func ddayText(_ birth: Date?, now: Date) -> String {
    guard let birth else { return "" }
    let cal = Calendar(identifier: .gregorian)
    let b = cal.startOfDay(for: birth)
    let n = cal.startOfDay(for: now)
    let days = (cal.dateComponents([.day], from: b, to: n).day ?? 0)
    return "D+\(days)"
}

// MARK: - View

// 아기랑 브랜드 팔레트 (globals.css / colors.ts 기준)
private extension Color {
    static let brand = Color(red: 48 / 255, green: 120 / 255, blue: 201 / 255)   // #3078C9
    static let ink   = Color(red: 18 / 255, green: 18 / 255, blue: 18 / 255)     // #121212
    static let sub   = Color(red: 128 / 255, green: 137 / 255, blue: 145 / 255)  // #808991
}

struct BabyRangWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: BabyEntry

    // 홈 위젯 값/라벨 폰트 — 작은 위젯은 긴 값("11시간 54분 전")도 잘리지 않게 작게,
    // 미디엄은 넓으니 크게. 세 행은 항상 같은 크기.
    private var homeFontSize: CGFloat { family == .systemMedium ? 15 : 12 }

    @ViewBuilder
    var body: some View {
        switch entry.state {
        case .loggedOut:
            statusText("로그인 필요")
        case .noChild:
            statusText("아이 등록 필요")
        case .summary(let s):
            if family == .accessoryRectangular {
                rectangularView(s)   // 잠금화면
            } else {
                content(s)           // 홈 화면(systemSmall/Medium)
            }
        }
    }

    @ViewBuilder
    private func statusText(_ text: String) -> some View {
        if family == .accessoryRectangular {
            Text(text).font(.caption2)
        } else {
            centered(text)
        }
    }

    // MARK: 잠금화면 — 가로 사각형: 헤더(이름·디데이) + 수유/수면/기저귀 세로 나열
    private func rectangularView(_ s: BabySummary) -> some View {
        let now = entry.date
        return VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Text(s.childName)
                    .font(.caption2.weight(.bold))
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text(ddayText(s.birthDate, now: now))
                    .font(.caption2.weight(.semibold))
            }
            lockRow("수유", agoText(s.lastFeedingAt, now: now))
            lockRow("수면", agoText(s.lastSleepAt, now: now))
            lockRow("대변", agoText(s.lastDiaperAt, now: now))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // 잠금화면은 단색 렌더링 — 색 지정 없이 시스템 틴트에 맡긴다.
    private func lockRow(_ label: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Text(label).font(.caption2)
            Spacer(minLength: 4)
            Text(value)
                .font(.caption2.weight(.semibold))
                .monospacedDigit()
                .lineLimit(1)
        }
    }

    private func centered(_ text: String) -> some View {
        VStack {
            Text("아기랑").font(.caption2).foregroundStyle(Color.sub)
            Spacer()
            Text(text).font(.footnote).foregroundStyle(Color.sub)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: 홈 화면 — 심플 & 브랜드 컬러, 정중앙 로고 워터마크
    private func content(_ s: BabySummary) -> some View {
        let now = entry.date
        return ZStack {
            // 정중앙 로고 워터마크 (아주 옅게 — 텍스트 가독성 유지)
            Image("WidgetLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 116, height: 116)
                .opacity(0.20)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

            VStack(alignment: .leading, spacing: 0) {
                // 헤더: 이름 + 디데이 (세로 중앙 정렬)
                HStack(alignment: .center, spacing: 6) {
                    Text(s.childName)
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Spacer(minLength: 4)
                    Text(ddayText(s.birthDate, now: now))
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color.brand)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Capsule().fill(Color.brand.opacity(0.12)))
                }
                Spacer(minLength: 10)
                // 값 텍스트는 모두 동일 고정 크기(자동축소 없음)
                VStack(spacing: 10) {
                    row("수유", agoText(s.lastFeedingAt, now: now))
                    row("수면", agoText(s.lastSleepAt, now: now))
                    row("대변", agoText(s.lastDiaperAt, now: now))
                }
                // 아이가 여러 명이면 하단에 페이지 점 + 다음 버튼(탭)
                if s.pageCount > 1 {
                    Spacer(minLength: 6)
                    pageFooter(s)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }

    // 여러 아이 페이징 — 점 인디케이터 + 탭하면 다음 아이(App Intent)
    private func pageFooter(_ s: BabySummary) -> some View {
        HStack(spacing: 6) {
            HStack(spacing: 4) {
                ForEach(0..<s.pageCount, id: \.self) { i in
                    Circle()
                        .fill(i == s.pageIndex ? Color.brand : Color.brand.opacity(0.25))
                        .frame(width: 5, height: 5)
                }
            }
            Spacer()
            Button(intent: NextChildIntent()) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Color.brand)
                    .padding(5)
                    .background(Circle().fill(Color.brand.opacity(0.12)))
            }
            .buttonStyle(.plain)
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(spacing: 4) {
            Text(label)
                .font(.system(size: homeFontSize))
                .foregroundStyle(Color.sub)
            Spacer(minLength: 2)
            Text(value)
                .font(.system(size: homeFontSize, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(Color.ink)
                .lineLimit(1)
        }
    }
}

// MARK: - Widget

struct BabyRangWidget: Widget {
    let kind = "BabyRangWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                BabyRangWidgetEntryView(entry: entry)
                    .containerBackground(.background, for: .widget)
            } else {
                BabyRangWidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("아기랑 요약")
        .description("마지막 수유·수면·대변 시간을 보여줍니다. (아이 여러 명이면 탭으로 전환)")
        .supportedFamilies([.systemSmall, .systemMedium])   // 홈 화면 (탭 페이징)
    }
}

// MARK: - 잠금화면 위젯 (구성형 — 인스턴스마다 아이 선택, 여러 개 등록 가능)

struct LockProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> BabyEntry {
        BabyEntry(date: Date(), state: .summary(BabySummary(
            childName: "우리 아기", birthDate: Date(),
            lastFeedingAt: Date().addingTimeInterval(-3600),
            lastSleepAt: Date().addingTimeInterval(-1800),
            lastDiaperAt: Date().addingTimeInterval(-7200))))
    }

    func snapshot(for configuration: SelectChildIntent, in context: Context) async -> BabyEntry {
        let state = await WidgetAPI.fetchSummary(childIdOverride: configuration.child?.id)
        return BabyEntry(date: Date(), state: state)
    }

    func timeline(for configuration: SelectChildIntent, in context: Context) async -> Timeline<BabyEntry> {
        let state = await WidgetAPI.fetchSummary(childIdOverride: configuration.child?.id)
        let now = Date()
        let next = Calendar.current.date(byAdding: .minute, value: 5, to: now)!
        return Timeline(entries: [BabyEntry(date: now, state: state)], policy: .after(next))
    }
}

struct BabyRangLockWidget: Widget {
    let kind = "BabyRangLockWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectChildIntent.self, provider: LockProvider()) { entry in
            if #available(iOS 17.0, *) {
                BabyRangWidgetEntryView(entry: entry)
                    .containerBackground(.background, for: .widget)
            } else {
                BabyRangWidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("아기랑 (잠금화면)")
        .description("아이별 마지막 수유·수면·대변 시간. 위젯을 길게 눌러 아이를 선택하세요.")
        .supportedFamilies([.accessoryRectangular])
    }
}
