package kr.spectrify.babyrang

import android.app.AlertDialog
import android.view.HapticFeedbackConstants
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.NumberPicker
import org.json.JSONObject

/** 웹 수치 입력을 실제 Android NumberPicker로 표시한다. 메인 스레드에서만 호출한다. */
class NativeNumberPicker(
    private val activity: MainActivity,
    private val evaluate: (String) -> Unit,
) {
    private var dialog: AlertDialog? = null
    private var requestId: String? = null

    fun handle(json: String) {
        val body = try { JSONObject(json) } catch (_: Exception) { return }
        val id = body.optString("requestId")
        if (id.isEmpty()) return
        if (body.optString("action") == "cancel") {
            if (requestId == id) finish(null)
            return
        }
        val labels = body.optJSONArray("labels")
        val selected = body.optInt("selectedIndex", -1)
        if (requestId != null || labels == null || labels.length() !in 1..2001 ||
            selected !in 0 until labels.length() || activity.isFinishing || activity.isDestroyed) {
            reply(id, null, true)
            return
        }
        val texts = Array(labels.length()) { labels.optString(it) }
        if (texts.any { it.length > 100 }) { reply(id, null, true); return }
        val wheel = NumberPicker(activity).apply {
            minValue = 0
            maxValue = texts.lastIndex
            displayedValues = texts
            value = selected
            wrapSelectorWheel = false
            // 길게 눌러 숫자 키보드로 바뀌지 않도록 한다.
            descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
            setOnValueChangedListener { view, _, _ ->
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            }
        }
        val container = FrameLayout(activity).apply {
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            addView(wheel, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        requestId = id
        dialog = AlertDialog.Builder(activity)
            .setTitle(body.optString("title", "값 선택"))
            .setView(container)
            .setNegativeButton("취소") { _, _ -> finish(null) }
            .setPositiveButton("확인") { _, _ -> finish(wheel.value) }
            .create().also { pickerDialog ->
                pickerDialog.setOnDismissListener { if (requestId == id) finish(null) }
                pickerDialog.show()
            }
    }

    fun close() { finish(null) }

    private fun finish(index: Int?) {
        val id = requestId ?: return
        requestId = null
        val current = dialog
        dialog = null
        current?.dismiss()
        reply(id, index)
    }

    private fun reply(id: String, index: Int?, error: Boolean = false) {
        val payload = JSONObject().put("index", index ?: JSONObject.NULL).put("error", error)
        evaluate("window.__numberPickerBridge?.resolve(${JSONObject.quote(id)}, $payload)")
    }
}
