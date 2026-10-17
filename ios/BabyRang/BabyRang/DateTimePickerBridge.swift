import UIKit
import WebKit

/// 기록 일시 선택을 실제 UIDatePicker의 wheels 스타일로 처리한다.
@MainActor
final class DateTimePickerBridge {
    weak var webView: WKWebView?
    private var active: NativeDateTimePickerController?
    private var activeRequestId: String?

    func handle(_ message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let requestId = body["requestId"] as? String else { return }
        if body["action"] as? String == "cancel" {
            if activeRequestId == requestId { active?.finish(nil) }
            return
        }
        guard active == nil,
              let value = body["value"] as? String,
              let date = recordDateFormatter().date(from: value),
              let root = webView?.window?.rootViewController else {
            reply(requestId, value: nil, error: true)
            return
        }
        var presenter = root
        while let presented = presenter.presentedViewController { presenter = presented }
        guard !presenter.isBeingDismissed else {
            reply(requestId, value: nil, error: true)
            return
        }
        let picker = NativeDateTimePickerController(
            date: date,
            title: body["title"] as? String ?? "일시 선택",
            mode: body["mode"] as? String ?? "dateTime"
        )
        picker.onResult = { [weak self] value in
            self?.active = nil
            self?.activeRequestId = nil
            self?.reply(requestId, value: value)
        }
        active = picker
        activeRequestId = requestId
        presenter.present(picker, animated: false)
    }

    private func reply(_ id: String, value: String?, error: Bool = false) {
        let payload: [String: Any] = ["value": value.map { $0 as Any } ?? NSNull(), "error": error]
        guard let idData = try? JSONSerialization.data(withJSONObject: [id]),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let idJSON = String(data: idData, encoding: .utf8),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.__dateTimePickerBridge?.resolve(\(idJSON)[0], \(json))")
    }
}

@MainActor
private final class NativeDateTimePickerController: UIViewController {
    private let initial: Date
    private let mode: String
    private let picker = UIDatePicker()
    private let feedback = UISelectionFeedbackGenerator()
    private var finished = false
    var onResult: ((String?) -> Void)?

    init(date: Date, title: String, mode: String) {
        initial = date
        self.mode = mode
        super.init(nibName: nil, bundle: nil)
        self.title = title
        modalPresentationStyle = .overFullScreen
        overrideUserInterfaceStyle = .light
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.2)
        let backdrop = UIButton(type: .custom)
        backdrop.translatesAutoresizingMaskIntoConstraints = false
        backdrop.accessibilityLabel = "선택 취소"
        backdrop.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        view.addSubview(backdrop)

        let card = UIView()
        card.translatesAutoresizingMaskIntoConstraints = false
        card.backgroundColor = UIColor(white: 0.95, alpha: 1)
        card.layer.cornerRadius = 14
        view.addSubview(card)
        picker.translatesAutoresizingMaskIntoConstraints = false
        switch mode {
        case "time": picker.datePickerMode = .time
        case "date": picker.datePickerMode = .date
        default: picker.datePickerMode = .dateAndTime
        }
        picker.preferredDatePickerStyle = .wheels
        picker.locale = Locale(identifier: "ko_KR")
        picker.calendar = Calendar(identifier: .gregorian)
        picker.timeZone = .autoupdatingCurrent
        picker.minuteInterval = 1
        picker.addTarget(self, action: #selector(selectionChanged), for: .valueChanged)
        picker.accessibilityLabel = title
        card.addSubview(picker)

        let confirm = UIButton(type: .system)
        confirm.translatesAutoresizingMaskIntoConstraints = false
        confirm.setTitle("선택완료", for: .normal)
        confirm.titleLabel?.font = .systemFont(ofSize: 20, weight: .medium)
        confirm.backgroundColor = .white
        confirm.layer.cornerRadius = 14
        confirm.addTarget(self, action: #selector(confirmSelection), for: .touchUpInside)
        card.addSubview(confirm)
        let cancelButton = UIButton(type: .system)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        cancelButton.setTitle("취소", for: .normal)
        cancelButton.titleLabel?.font = .systemFont(ofSize: 20, weight: .medium)
        cancelButton.backgroundColor = .white
        cancelButton.layer.cornerRadius = 14
        cancelButton.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        view.addSubview(cancelButton)
        let divider = UIView()
        divider.translatesAutoresizingMaskIntoConstraints = false
        divider.backgroundColor = .separator
        card.addSubview(divider)

        NSLayoutConstraint.activate([
            backdrop.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            backdrop.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            backdrop.topAnchor.constraint(equalTo: view.topAnchor),
            backdrop.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            cancelButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8),
            cancelButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8),
            cancelButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            cancelButton.heightAnchor.constraint(equalToConstant: 56),
            card.leadingAnchor.constraint(equalTo: cancelButton.leadingAnchor),
            card.trailingAnchor.constraint(equalTo: cancelButton.trailingAnchor),
            card.bottomAnchor.constraint(equalTo: cancelButton.topAnchor, constant: -8),
            card.heightAnchor.constraint(equalToConstant: 280),
            picker.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 8),
            picker.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -8),
            picker.topAnchor.constraint(equalTo: card.topAnchor),
            picker.heightAnchor.constraint(equalToConstant: 224),
            divider.topAnchor.constraint(equalTo: picker.bottomAnchor),
            divider.leadingAnchor.constraint(equalTo: card.leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: card.trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 0.5),
            confirm.topAnchor.constraint(equalTo: picker.bottomAnchor),
            confirm.leadingAnchor.constraint(equalTo: card.leadingAnchor),
            confirm.trailingAnchor.constraint(equalTo: card.trailingAnchor),
            confirm.bottomAnchor.constraint(equalTo: card.bottomAnchor),
        ])
        picker.setDate(initial, animated: false)
        feedback.prepare()
    }

    @objc private func selectionChanged() {
        feedback.selectionChanged()
        feedback.prepare()
    }

    @objc private func cancel() { finish(nil) }
    @objc private func confirmSelection() { finish(recordDateFormatter().string(from: picker.date)) }
    func finish(_ value: String?) {
        guard !finished else { return }
        finished = true
        let completion = onResult
        onResult = nil
        dismiss(animated: false) { completion?(value) }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if !finished { finished = true; onResult?(nil); onResult = nil }
    }
}

private func recordDateFormatter() -> DateFormatter {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.timeZone = .autoupdatingCurrent
    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
    formatter.isLenient = false
    return formatter
}
