import Foundation
import StoreKit
import WebKit

/// 웹(WKWebView)과 StoreKit 사이의 다리.
///
/// WebView 안의 웹은 StoreKit 을 직접 부를 수 없다. 웹이 메시지 핸들러로 요청을 보내면
/// 여기서 StoreKit 을 호출하고, evaluateJavaScript 로 결과를 돌려준다.
/// 웹 쪽 짝은 app/src/lib/appStoreBilling.ts 다.
///
/// 처리하는 메시지:
///   · iapProducts { requestId, productIds } → { ok, products: [{ id, displayPrice, displayName }] }
///   · iapPurchase { requestId, productId }  → { ok, transactionId } / { ok: false, cancelled } / { ok: false, message }
///   · iapFinish   { transactionId }         → 응답 없음
///
/// 그리고 앱이 떠 있는 동안 Transaction.updates 를 계속 듣는다(startTransactionListener).
@MainActor
final class StoreKitBridge {
    /// 웹에 결과를 돌려줄 WebView. WebView 가 이 객체를 소유하므로 약한 참조로 잡는다.
    weak var webView: WKWebView?

    static let handlerNames = ["iapProducts", "iapPurchase", "iapFinish"]

    /// Transaction.updates 구독. 앱이 살아 있는 동안 계속 돈다.
    private var listener: Task<Void, Never>?

    deinit {
        listener?.cancel()
    }

    /// 앱 밖에서 확정된 거래를 받아 웹에 알린다.
    ///
    /// StoreKit 은 결제 시트를 거치지 않고 거래가 확정되는 경로를 여럿 가진다 —
    /// 가족 공유 '구입 요청'을 보호자가 나중에 승인하거나, 결제 중 앱이 죽었다가
    /// 나중에 처리가 끝나는 경우다. 이 경로들은 purchase() 의 반환값으로 오지 않고
    /// 오직 Transaction.updates 로만 전달된다.
    ///
    /// 듣지 않으면 그 거래는 미완료로 남아, **사용자가 결제 버튼을 다시 눌러야만**
    /// 복구된다(purchase 안의 unfinishedTransaction 경로). 실제 청구가 끝난 상태라
    /// "돈은 나갔는데 리포트가 안 열리는" 구간이 그만큼 길어진다.
    ///
    /// ⚠️ 여기서 finish() 를 부르지 않는다. 서버 승인이 끝나야 완료할 수 있고,
    /// 승인에 필요한 정보(어떤 검사 결과에 대한 결제인지)는 웹만 알고 있다.
    /// 웹이 승인까지 마친 뒤 iapFinish 로 돌려준다.
    func startTransactionListener() {
        guard listener == nil else { return }
        listener = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                let tx: StoreKit.Transaction
                switch result {
                case .verified(let value): tx = value
                case .unverified(let value, _): tx = value
                }
                // 취소·환불된 거래는 열어줄 것이 없다.
                guard tx.revocationDate == nil else { continue }
                await self?.notifyWeb(tx)
            }
        }
    }

    private func notifyWeb(_ tx: StoreKit.Transaction) {
        guard let webView else { return }
        let payload: [String: Any] = [
            "transactionId": String(tx.id),
            "productId": tx.productID,
        ]
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload),
            let json = String(data: data, encoding: .utf8)
        else { return }

        // 웹이 아직 브릿지를 만들기 전일 수 있다. 그때는 조용히 넘어가고,
        // 거래는 미완료로 남아 기존 복구 경로(결제 버튼 재시도)가 처리한다.
        let script =
            "window.__iapBridge && window.__iapBridge.onTransaction && window.__iapBridge.onTransaction(\(json))"
        webView.evaluateJavaScript(script)
    }

    func handle(_ message: WKScriptMessage) {
        let body = message.body as? [String: Any] ?? [:]

        // finish 는 응답을 기다리지 않는 단방향 요청이라 requestId 가 없다.
        if message.name == "iapFinish" {
            guard let transactionId = body["transactionId"] as? String else { return }
            Task { await finish(transactionId: transactionId) }
            return
        }

        // ⚠️ 여기서 그냥 return 하면 웹의 Promise 가 영원히 걸린다(타임아웃이 없다).
        // requestId 가 없으면 응답을 보낼 곳조차 없으므로 그때만 조용히 버린다.
        guard let requestId = body["requestId"] as? String else { return }

        switch message.name {
        case "iapProducts":
            let ids = body["productIds"] as? [String] ?? []
            Task { await sendProducts(requestId: requestId, productIds: ids) }
        case "iapPurchase":
            guard let productId = body["productId"] as? String else {
                reply(requestId, ["ok": false, "message": "상품 정보가 올바르지 않습니다."])
                return
            }
            Task { await purchase(requestId: requestId, productId: productId) }
        default:
            reply(requestId, ["ok": false, "message": "알 수 없는 요청입니다."])
        }
    }

    // MARK: - StoreKit

    private func sendProducts(requestId: String, productIds: [String]) async {
        do {
            let products = try await Product.products(for: productIds)
            let payload = products.map {
                ["id": $0.id, "displayPrice": $0.displayPrice, "displayName": $0.displayName]
            }
            reply(requestId, ["ok": true, "products": payload])
        } catch {
            // 상품 조회 실패는 대부분 아직 심사 전이거나 판매 국가가 맞지 않는 경우다.
            // 웹은 이 응답을 받으면 결제 UI를 아예 숨긴다.
            reply(requestId, ["ok": false, "message": error.localizedDescription])
        }
    }

    private func purchase(requestId: String, productId: String) async {
        // ⚠️ 새로 결제하기 전에 완료되지 않은 거래부터 찾는다.
        //
        // 서버 승인이 실패하면 웹은 finish 를 부르지 않으므로 거래가 미완료로 남는다.
        // 그 상태에서 사용자가 버튼을 다시 누르면 같은 상품을 한 번 더 결제하게 되는데,
        // 소모품이라 StoreKit 이 막아주지 않는다 — 실제로 두 번 청구된다.
        // 미완료 거래를 그대로 돌려주면 추가 청구 없이 서버 승인만 다시 시도된다.
        if let pending = await unfinishedTransaction(productId: productId) {
            reply(requestId, ["ok": true, "transactionId": String(pending.id)])
            return
        }

        do {
            guard let product = try await Product.products(for: [productId]).first else {
                reply(requestId, ["ok": false, "message": "상품을 찾을 수 없습니다."])
                return
            }

            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                // 로컬 서명 검증 결과로 거르지 않는다. 서버가 트랜잭션 ID로 Apple 에
                // 직접 되물어 확정하므로(app-store.service.ts), 여기서 unverified 를
                // 막아봐야 판정이 두 번 일어날 뿐이고 정상 사용자만 놓칠 수 있다.
                let transaction: StoreKit.Transaction
                switch verification {
                case .verified(let tx): transaction = tx
                case .unverified(let tx, _): transaction = tx
                }
                // ⚠️ 여기서 finish() 를 부르면 안 된다.
                // 서버 승인이 끝난 뒤 웹이 iapFinish 로 요청한다. 먼저 완료해 버리면
                // 서버 저장이 실패했을 때 복구할 방법이 사라진다(돈만 빠져나간다).
                reply(requestId, ["ok": true, "transactionId": String(transaction.id)])

            case .userCancelled:
                reply(requestId, ["ok": false, "cancelled": true])

            case .pending:
                // 가족 공유의 '구입 요청' 등 보호자 승인이 필요한 경우.
                // 승인되면 미완료 거래로 남으므로, 다시 눌렀을 때 위의 복구 경로가 처리한다.
                reply(requestId, [
                    "ok": false,
                    "message": "승인이 필요한 결제입니다. 승인 후 다시 시도해 주세요.",
                ])

            @unknown default:
                reply(requestId, ["ok": false, "message": "결제를 완료하지 못했습니다."])
            }
        } catch {
            reply(requestId, ["ok": false, "message": error.localizedDescription])
        }
    }

    private func unfinishedTransaction(productId: String) async -> StoreKit.Transaction? {
        for await result in StoreKit.Transaction.unfinished {
            let tx: StoreKit.Transaction
            switch result {
            case .verified(let value): tx = value
            case .unverified(let value, _): tx = value
            }
            if tx.productID == productId { return tx }
        }
        return nil
    }

    private func finish(transactionId: String) async {
        for await result in StoreKit.Transaction.unfinished {
            let tx: StoreKit.Transaction
            switch result {
            case .verified(let value): tx = value
            case .unverified(let value, _): tx = value
            }
            if String(tx.id) == transactionId {
                await tx.finish()
                return
            }
        }
    }

    // MARK: - 웹으로 응답

    private func reply(_ requestId: String, _ payload: [String: Any]) {
        guard let webView else { return }
        guard
            let idData = try? JSONSerialization.data(withJSONObject: [requestId]),
            let payloadData = try? JSONSerialization.data(withJSONObject: payload),
            let idJson = String(data: idData, encoding: .utf8),
            let payloadJson = String(data: payloadData, encoding: .utf8)
        else { return }

        // requestId 는 웹에서 온 값이라 그대로 코드에 넣으면 주입 통로가 된다.
        // 배열로 감싸 JSON 직렬화한 뒤 [0] 으로 꺼내 이스케이프를 JSONSerialization 에 맡긴다.
        let script = "window.__iapBridge && window.__iapBridge.resolve(\(idJson)[0], \(payloadJson))"
        webView.evaluateJavaScript(script)
    }
}
