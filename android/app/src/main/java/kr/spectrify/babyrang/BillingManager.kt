package kr.spectrify.babyrang

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import org.json.JSONArray
import org.json.JSONObject

/**
 * Google Play 인앱결제.
 *
 * 웹(WebView)은 Play Billing 을 직접 부를 수 없으므로 여기서 대신 처리하고
 * 결과를 JS 로 돌려준다. iOS 의 StoreKitBridge 와 같은 구조다.
 *
 * ⚠️ 구매 확정(consume)은 **서버가** Play Developer API 로 처리한다
 *    (server/src/payments/google-play.service.ts). 클라이언트는 구매 토큰만 넘긴다.
 *    여기서 consume 을 같이 호출하면 서버 검증 전에 소비돼 버려 위험하다.
 */
class BillingManager(
    private val activity: Activity,
    /** 결과를 웹으로 돌려주는 창구. */
    private val reply: (requestId: String, payload: JSONObject) -> Unit,
) {
    private val client: BillingClient = BillingClient.newBuilder(activity)
        .setListener(::onPurchasesUpdated)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder().enableOneTimeProducts().build(),
        )
        .build()

    /** 결제 흐름을 시작한 요청 id. 결과 콜백이 비동기로 따로 오기 때문에 들고 있어야 한다. */
    private var purchaseRequestId: String? = null

    private var connected = false

    /** 연결이 끊기면 다음 호출에서 다시 연결한다. */
    private fun withConnection(onReady: (ok: Boolean) -> Unit) {
        if (connected && client.isReady) {
            onReady(true)
            return
        }
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                connected = result.responseCode == BillingClient.BillingResponseCode.OK
                if (!connected) {
                    Log.e(TAG, "연결 실패: ${result.responseCode} ${result.debugMessage}")
                }
                onReady(connected)
            }

            override fun onBillingServiceDisconnected() {
                connected = false
            }
        })
    }

    /** 상품 정보를 조회해 웹에 돌려준다. */
    fun queryProducts(requestId: String, productIds: List<String>) {
        withConnection { ok ->
            if (!ok) {
                reply(requestId, fail("결제를 사용할 수 없습니다."))
                return@withConnection
            }
            val products = productIds.map { id ->
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            }
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build()

            // 9.x 부터 콜백이 QueryProductDetailsResult 를 넘긴다(과거엔 List<ProductDetails>).
            client.queryProductDetailsAsync(params) { result, queryResult ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    reply(requestId, fail("상품 정보를 불러오지 못했습니다."))
                    return@queryProductDetailsAsync
                }
                val details = queryResult.productDetailsList
                cached = details.associateBy { it.productId }
                val arr = JSONArray()
                details.forEach { d ->
                    val offer = d.oneTimePurchaseOfferDetails
                    arr.put(
                        JSONObject()
                            .put("itemId", d.productId)
                            .put("title", d.title)
                            .put("currency", offer?.priceCurrencyCode ?: "")
                            // 웹은 소수 문자열(예: "990")을 기대한다.
                            .put("value", offer?.let { micros(it.priceAmountMicros) } ?: "0"),
                    )
                }
                reply(requestId, JSONObject().put("ok", true).put("products", arr))
            }
        }
    }

    /** 결제 시트를 띄운다. 결과는 onPurchasesUpdated 로 비동기로 돌아온다. */
    fun purchase(requestId: String, productId: String) {
        withConnection { ok ->
            if (!ok) {
                reply(requestId, fail("결제를 사용할 수 없습니다."))
                return@withConnection
            }
            val details = cached[productId]
            if (details == null) {
                reply(requestId, fail("상품 정보를 찾을 수 없습니다."))
                return@withConnection
            }
            val params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(
                    listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(details)
                            .build(),
                    ),
                )
                .build()

            purchaseRequestId = requestId
            val result = client.launchBillingFlow(activity, params)
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                purchaseRequestId = null
                reply(requestId, fail("결제창을 열지 못했습니다."))
            }
        }
    }

    /**
     * 아직 서버 승인이 끝나지 않은(=소비되지 않은) 구매를 돌려준다.
     *
     * 결제 직후 앱이 죽거나 네트워크가 끊기면 "돈은 나갔는데 리포트는 안 열린" 상태가 된다.
     * 서버가 consume 할 때까지 구매는 살아 있으므로, 앱을 다시 켤 때 이걸로 복구한다.
     */
    fun restore(requestId: String) {
        withConnection { ok ->
            if (!ok) {
                reply(requestId, fail("결제를 사용할 수 없습니다."))
                return@withConnection
            }
            val params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
            client.queryPurchasesAsync(params) { result, purchases ->
                if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                    reply(requestId, fail("구매 내역을 불러오지 못했습니다."))
                    return@queryPurchasesAsync
                }
                val arr = JSONArray()
                purchases
                    .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                    .forEach { p ->
                        arr.put(
                            JSONObject()
                                .put("productId", p.products.firstOrNull() ?: "")
                                .put("purchaseToken", p.purchaseToken),
                        )
                    }
                reply(requestId, JSONObject().put("ok", true).put("purchases", arr))
            }
        }
    }

    private fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        val requestId = purchaseRequestId ?: return
        purchaseRequestId = null

        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val purchased = purchases
                    ?.firstOrNull { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                if (purchased == null) {
                    // 결제 보류(PENDING) 상태. 승인되면 다음 실행에서 restore 로 잡힌다.
                    reply(requestId, fail("결제가 아직 완료되지 않았습니다."))
                    return
                }
                reply(
                    requestId,
                    JSONObject()
                        .put("ok", true)
                        .put("purchaseToken", purchased.purchaseToken),
                )
            }

            BillingClient.BillingResponseCode.USER_CANCELED ->
                reply(requestId, JSONObject().put("ok", false).put("cancelled", true))

            else -> {
                Log.e(TAG, "결제 실패: ${result.responseCode} ${result.debugMessage}")
                reply(requestId, fail("결제를 완료하지 못했습니다."))
            }
        }
    }

    fun destroy() {
        client.endConnection()
    }

    private var cached: Map<String, ProductDetails> = emptyMap()

    private fun fail(message: String) =
        JSONObject().put("ok", false).put("message", message)

    /** micros(1,000,000 = 1단위)를 웹이 쓰는 소수 문자열로 바꾼다. */
    private fun micros(v: Long): String {
        val whole = v / 1_000_000
        val frac = (v % 1_000_000) / 10_000
        return if (frac == 0L) whole.toString() else "$whole.%02d".format(frac)
    }

    private companion object {
        const val TAG = "BabyRangBilling"
    }
}
