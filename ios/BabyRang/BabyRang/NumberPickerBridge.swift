import UIKit
import WebKit

/// 기록 수치 선택을 웹 스크롤 대신 실제 UIPickerView로 처리한다.
@MainActor
final class NumberPickerBridge {
    weak var webView: WKWebView?
    private var active: NativeNumberPickerController?
    private var activeRequestId: String?

    func handle(_ message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let requestId = body["requestId"] as? String else { return }
        if body["action"] as? String == "cancel" {
            if activeRequestId == requestId { active?.finish(nil) }
            return
        }
        guard active == nil,
              let labels = body["labels"] as? [String], !labels.isEmpty, labels.count <= 2001,
              labels.allSatisfy({ $0.count <= 100 }),
              let selected = body["selectedIndex"] as? Int, labels.indices.contains(selected),
              let root = webView?.window?.rootViewController else {
            reply(requestId, index: nil, error: true)
            return
        }
        var presenter = root
        while let presented = presenter.presentedViewController { presenter = presented }
        guard !presenter.isBeingDismissed else {
            reply(requestId, index: nil, error: true)
            return
        }
        let picker = NativeNumberPickerController(labels: labels, selected: selected,
            title: body["title"] as? String ?? "값 선택")
        picker.onResult = { [weak self] index in
            self?.active = nil
            self?.activeRequestId = nil
            self?.reply(requestId, index: index)
        }
        active = picker
        activeRequestId = requestId
        presenter.present(picker, animated: false)
    }

    private func reply(_ id: String, index: Int?, error: Bool = false) {
        let payload: [String: Any] = ["index": index.map { $0 as Any } ?? NSNull(), "error": error]
        guard let idData = try? JSONSerialization.data(withJSONObject: [id]),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let idJSON = String(data: idData, encoding: .utf8),
              let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.__numberPickerBridge?.resolve(\(idJSON)[0], \(json))")
    }
}

@MainActor
private final class NativeNumberPickerController: UIViewController, UIPickerViewDataSource, UIPickerViewDelegate {
    private let labels: [String]
    private let initial: Int
    private let picker = UIPickerView()
    private let feedback = UIImpactFeedbackGenerator(style: .light)
    private var lastSelection: Int
    private var finished = false
    var onResult: ((Int?) -> Void)?

    init(labels: [String], selected: Int, title: String) {
        self.labels = labels
        initial = selected
        lastSelection = selected
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
        picker.dataSource = self
        picker.delegate = self
        picker.accessibilityLabel = title
        card.addSubview(picker)

        let confirm = UIButton(type: .system)
        confirm.translatesAutoresizingMaskIntoConstraints = false
        confirm.setTitle("확인", for: .normal)
        confirm.titleLabel?.font = .systemFont(ofSize: 20, weight: .medium)
        confirm.backgroundColor = .white
        confirm.layer.cornerRadius = 14
        confirm.addTarget(self, action: #selector(confirmSelection), for: .touchUpInside)
        view.addSubview(confirm)

        NSLayoutConstraint.activate([
            backdrop.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            backdrop.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            backdrop.topAnchor.constraint(equalTo: view.topAnchor),
            backdrop.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            confirm.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 8),
            confirm.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -8),
            confirm.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
            confirm.heightAnchor.constraint(equalToConstant: 56),
            card.leadingAnchor.constraint(equalTo: confirm.leadingAnchor),
            card.trailingAnchor.constraint(equalTo: confirm.trailingAnchor),
            card.bottomAnchor.constraint(equalTo: confirm.topAnchor, constant: -8),
            card.heightAnchor.constraint(equalToConstant: 224),
            picker.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            picker.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            picker.topAnchor.constraint(equalTo: card.topAnchor),
            picker.bottomAnchor.constraint(equalTo: card.bottomAnchor),
        ])
        picker.selectRow(initial, inComponent: 0, animated: false)
        feedback.prepare()
    }

    func numberOfComponents(in pickerView: UIPickerView) -> Int { 1 }
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int { labels.count }
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? { labels[row] }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        guard row != lastSelection else { return }
        lastSelection = row
        feedback.impactOccurred(intensity: 0.65)
        feedback.prepare()
    }

    @objc private func cancel() { finish(nil) }
    @objc private func confirmSelection() { finish(picker.selectedRow(inComponent: 0)) }
    func finish(_ index: Int?) {
        guard !finished else { return }
        finished = true
        let completion = onResult
        onResult = nil
        dismiss(animated: false) { completion?(index) }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if !finished { finished = true; onResult?(nil); onResult = nil }
    }
}
