package kr.spectrify.babyrang

import android.webkit.JavascriptInterface
import org.json.JSONObject

/**
 * 웹에 노출되는 네이티브 브리지. `window.Android` 로 접근한다.
 *
 * 웹은 `window.Android.openLocationSettings` 의 존재로 네이티브 앱인지 판별한다
 * (app/src/lib/isNativeApp.ts). 그래서 이 메서드가 있어야 앱으로 인식된다.
 *
 * ⚠️ @JavascriptInterface 가 붙은 메서드만 웹에서 보인다.
 *    호출은 WebView 의 백그라운드 스레드에서 들어오므로 UI 작업은 메인으로 넘긴다.
 */
class AndroidBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun openLocationSettings() {
        activity.runOnUiThread { activity.openAppSettings() }
    }

    /** 상품 정보 조회. 결과는 window.__playBridge.resolve 로 돌아간다. */
    @JavascriptInterface
    fun billingProducts(json: String) {
        val o = JSONObject(json)
        val requestId = o.optString("requestId")
        val ids = o.optJSONArray("productIds")?.let { arr ->
            (0 until arr.length()).map { arr.optString(it) }
        } ?: emptyList()
        activity.runOnUiThread { activity.billing.queryProducts(requestId, ids) }
    }

    /** 결제 시트를 띄운다. */
    @JavascriptInterface
    fun billingPurchase(json: String) {
        val o = JSONObject(json)
        val requestId = o.optString("requestId")
        val productId = o.optString("productId")
        activity.runOnUiThread { activity.billing.purchase(requestId, productId) }
    }

    /** 서버 승인이 끝나지 않은 구매를 조회한다(결제 후 앱이 죽은 경우 복구용). */
    @JavascriptInterface
    fun billingRestore(json: String) {
        val requestId = JSONObject(json).optString("requestId")
        activity.runOnUiThread { activity.billing.restore(requestId) }
    }

    /**
     * 배너 슬롯 위치 보고. 웹의 AppAdSlotReporter 가 호출한다.
     *
     * @JavascriptInterface 는 JS 객체를 그대로 못 받아서 JSON 문자열로 주고받는다.
     */
    @JavascriptInterface
    fun reportAdSlot(json: String) {
        val slot = try {
            val o = JSONObject(json)
            AdSlot(
                visible = o.optBoolean("visible", false),
                bottomInset = o.optDouble("bottomInset", 0.0).toFloat(),
                height = o.optDouble("height", 0.0).toFloat(),
                width = if (o.has("width") && !o.isNull("width")) {
                    o.optDouble("width").toFloat()
                } else {
                    null
                },
                left = o.optDouble("left", 0.0).toFloat(),
            )
        } catch (e: org.json.JSONException) {
            // 웹이 보낸 형식이 깨졌으면 배너를 숨기는 쪽이 안전하다.
            AdSlot(visible = false)
        }
        activity.runOnUiThread { activity.applyAdSlot(slot) }
    }
}
