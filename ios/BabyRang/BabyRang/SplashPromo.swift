import Foundation
import UIKit

/// 스플래시 홍보 이미지. 어드민 시스템 > 스플래시 에서 관리한다.
///
/// 앱을 켤 때 이미지를 받으면 실행이 느려지므로, 지난 실행에서 받아 둔 목록·이미지로 보여 주고
/// 새 목록은 뒤에서 받아 다음 실행을 위해 저장한다. 그래서 바꾼 이미지는 한 번 늦게 보인다.
/// 안드로이드 SplashPromo.kt 와 같은 규칙이다.
enum SplashPromo {
    private static let listURL = URL(string: "https://babyroom.spectrify.kr/api/launch-ads")!

    private struct Item: Decodable {
        let id: String
        let imageUrl: String
        let startsAt: Date
        let endsAt: Date
    }

    private struct List: Decodable {
        let items: [Item]
    }

    private static var dir: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let url = base.appendingPathComponent("SplashPromo", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private static var listFile: URL { dir.appendingPathComponent("list.json") }

    /// 업로드마다 주소가 달라지므로 주소의 파일 이름을 그대로 쓴다
    private static func file(for item: Item) -> URL {
        let name = URL(string: item.imageUrl)?.lastPathComponent ?? item.id
        return dir.appendingPathComponent(name.isEmpty ? item.id : name)
    }

    /// 서버가 주는 시각(Date.toJSON, 예: 2026-11-19T07:42:00.000Z)
    private static func decode(_ data: Data) -> List? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { d in
            let s = try d.singleValueContainer().decode(String.self)
            guard let date = formatter.date(from: s) else {
                throw DecodingError.dataCorrupted(.init(codingPath: d.codingPath, debugDescription: s))
            }
            return date
        }
        return try? decoder.decode(List.self, from: data)
    }

    /// 지금 보여 줄 홍보 이미지. 기간 안이고 이미지를 받아 둔 것 중 시작이 가장 늦은 것.
    /// 첫 화면에 바로 써야 해서 동기로 읽는다.
    static func current(now: Date = Date()) -> (id: String, image: UIImage)? {
        guard let data = try? Data(contentsOf: listFile), let list = decode(data) else { return nil }
        let live = list.items
            .filter { $0.startsAt <= now && $0.endsAt > now }
            .sorted { $0.startsAt > $1.startsAt }
        for item in live {
            if let image = UIImage(contentsOfFile: file(for: item).path) {
                return (item.id, image)
            }
        }
        return nil
    }

    /// 새 목록과 이미지를 받아 둔다. 다음 실행에 쓴다.
    static func refresh() async {
        guard let (data, response) = try? await URLSession.shared.data(from: listURL),
              (response as? HTTPURLResponse)?.statusCode == 200,
              let list = decode(data)
        else { return }

        var keep: Set<String> = ["list.json"]
        for item in list.items {
            let target = file(for: item)
            keep.insert(target.lastPathComponent)
            if FileManager.default.fileExists(atPath: target.path) { continue }
            guard let url = URL(string: item.imageUrl),
                  let (tmp, res) = try? await URLSession.shared.download(from: url),
                  (res as? HTTPURLResponse)?.statusCode == 200
            else { continue }
            try? FileManager.default.moveItem(at: tmp, to: target)
        }
        try? data.write(to: listFile, options: .atomic)

        // 내려간 광고의 이미지는 지운다
        let files = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        for name in files where !keep.contains(name) {
            try? FileManager.default.removeItem(at: dir.appendingPathComponent(name))
        }
    }

    /// 노출 집계. 실패해도 상관없다.
    static func reportImpression(id: String) {
        guard let url = URL(string: "https://babyroom.spectrify.kr/api/launch-ads/\(id)/events") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data(#"{"type":"impression"}"#.utf8)
        URLSession.shared.dataTask(with: req).resume()
    }
}
