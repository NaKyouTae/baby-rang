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

// MARK: - App Group 공유 저장소 (앱의 WidgetShared.swift와 키/그룹ID 동일하게 유지)

private enum WidgetStore {
    static let appGroupId = "group.kr.spectrify.baby-rang"
    private static var defaults: UserDefaults? { UserDefaults(suiteName: appGroupId) }
    static var token: String? { defaults?.string(forKey: "widget.token") }
    static var apiBase: String? { defaults?.string(forKey: "widget.apiBase") }
}

// MARK: - Model

struct BabySummary {
    var childName: String
    var birthDate: Date?
    var lastFeedingAt: Date?
    var lastSleepAt: Date?
    var lastDiaperAt: Date?
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

private struct SummaryDTO: Decodable {
    let childName: String
    let birthDate: String?      // YYYY-MM-DD
    let lastFeedingAt: String?
    let lastSleepAt: String?
    let lastDiaperAt: String?
}

private enum WidgetAPI {
    static func fetchSummary() async -> EntryState {
        guard let token = WidgetStore.token,
              let base = WidgetStore.apiBase,
              let url = URL(string: "\(base)/growth-records/widget-summary")
        else { return .loggedOut }

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
                return .noChild
            }
            let dto = try JSONDecoder().decode(SummaryDTO.self, from: data)
            return .summary(BabySummary(
                childName: dto.childName,
                birthDate: parseDate(dto.birthDate),
                lastFeedingAt: parseISO(dto.lastFeedingAt),
                lastSleepAt: parseISO(dto.lastSleepAt),
                lastDiaperAt: parseISO(dto.lastDiaperAt)
            ))
        } catch {
            return .loggedOut
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
            // 15분마다 갱신 요청(iOS가 예산 내에서 조정). "~전" 표시는 그 사이에도 기기에서 흘러감.
            let next = Calendar.current.date(byAdding: .minute, value: 15, to: now)!
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

// 잠금화면 등 좁은 공간용 — 가장 큰 단위 하나만("3시간", "1일", "45분")
private func agoShort(_ date: Date?, now: Date) -> String {
    guard let date else { return "–" }
    let s = max(0, Int(now.timeIntervalSince(date)))
    let days = s / 86400
    let hours = (s % 86400) / 3600
    let mins = (s % 3600) / 60
    if days > 0 { return "\(days)일" }
    if hours > 0 { return "\(hours)시간" }
    return "\(mins)분"
}

// MARK: - View

struct BabyRangWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    var entry: BabyEntry

    @ViewBuilder
    var body: some View {
        switch entry.state {
        case .loggedOut:
            statusText("로그인 필요")
        case .noChild:
            statusText("아이 등록 필요")
        case .summary(let s):
            switch family {
            case .accessoryInline:      inlineView(s)
            case .accessoryCircular:    circularView(s)
            case .accessoryRectangular: rectangularView(s)
            default:                    content(s)   // 홈 화면(systemSmall/Medium)
            }
        }
    }

    // 상태 메시지 — 홈/잠금화면 공통(계열에 따라 크기만 다름)
    @ViewBuilder
    private func statusText(_ text: String) -> some View {
        switch family {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            Text(text).font(.caption2)
        default:
            centered(text)
        }
    }

    // MARK: 잠금화면 — 가로 사각형(3줄): 이름/디데이 + 수유·수면·기저귀 한 줄
    private func rectangularView(_ s: BabySummary) -> some View {
        let now = entry.date
        return VStack(alignment: .leading, spacing: 2) {
            Text("\(s.childName) \(ddayText(s.birthDate, now: now))")
                .font(.caption.weight(.semibold)).lineLimit(1)
            Text("🍼\(agoShort(s.lastFeedingAt, now: now)) 😴\(agoShort(s.lastSleepAt, now: now)) 💩\(agoShort(s.lastDiaperAt, now: now))")
                .font(.caption2).lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // MARK: 잠금화면 — 원형: 마지막 수유 경과(가장 자주 보는 값)
    private func circularView(_ s: BabySummary) -> some View {
        let now = entry.date
        return VStack(spacing: 0) {
            Text("🍼").font(.caption2)
            Text(agoShort(s.lastFeedingAt, now: now)).font(.caption2.weight(.semibold))
        }
    }

    // MARK: 잠금화면 — 인라인(한 줄): 마지막 수유
    private func inlineView(_ s: BabySummary) -> some View {
        Text("🍼 \(agoShort(s.lastFeedingAt, now: entry.date)) 전")
    }

    private func centered(_ text: String) -> some View {
        VStack {
            Text("아기랑").font(.caption2).foregroundStyle(.secondary)
            Spacer()
            Text(text).font(.footnote).foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func content(_ s: BabySummary) -> some View {
        let now = entry.date
        return VStack(alignment: .leading, spacing: 8) {
            // 아이 이름 / 디데이
            HStack(spacing: 6) {
                Text(s.childName)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                Text(ddayText(s.birthDate, now: now))
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(Capsule().fill(Color.accentColor))
            }
            Divider()
            row("🍼", "수유", agoText(s.lastFeedingAt, now: now))
            row("😴", "수면", agoText(s.lastSleepAt, now: now))
            row("💩", "기저귀", agoText(s.lastDiaperAt, now: now))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func row(_ emoji: String, _ label: String, _ value: String) -> some View {
        HStack(spacing: 6) {
            Text(emoji).font(.footnote)
            Text(label).font(.footnote).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(.footnote.weight(.medium))
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
        .description("마지막 수유·수면·기저귀 시간을 보여줍니다.")
        .supportedFamilies([
            .systemSmall, .systemMedium,          // 홈 화면
            .accessoryRectangular,                // 잠금화면 — 가로 사각형(권장)
            .accessoryInline,                     // 잠금화면 — 시계 위 한 줄
            .accessoryCircular,                   // 잠금화면 — 원형
        ])
    }
}
