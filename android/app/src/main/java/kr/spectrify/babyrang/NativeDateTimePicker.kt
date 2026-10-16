package kr.spectrify.babyrang

import android.app.AlertDialog
import android.view.ContextThemeWrapper
import android.view.HapticFeedbackConstants
import android.view.ViewGroup
import android.widget.DatePicker
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TimePicker
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/** 달력 대신 OS의 날짜/시간 스피너로 기록 일시를 선택한다. */
class NativeDateTimePicker(private val activity: MainActivity, private val evaluate: (String) -> Unit) {
    private var dialog: AlertDialog? = null
    private var requestId: String? = null

    @Suppress("DEPRECATION")
    fun handle(json: String) {
        val body = try { JSONObject(json) } catch (_: Exception) { return }
        val id = body.optString("requestId")
        if (id.isEmpty()) return
        if (body.optString("action") == "cancel") {
            if (requestId == id) finish(null)
            return
        }
        val raw = body.optString("value")
        val formatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US).apply { isLenient = false }
        val date = try { formatter.parse(raw) } catch (_: Exception) { null }
        if (requestId != null || date == null || formatter.format(date) != raw || activity.isFinishing || activity.isDestroyed) {
            reply(id, null, true)
            return
        }
        val mode = body.optString("mode", "dateTime")
        val timeOnly = mode == "time"
        val dateOnly = mode == "date"
        val calendar = Calendar.getInstance().apply { time = date }
        // 이 테마의 DatePicker/TimePicker는 달력·시계 대신 네이티브 스피너를 사용한다.
        val context = ContextThemeWrapper(activity, android.R.style.Theme_Holo_Light_Dialog_NoActionBar)
        val datePicker = DatePicker(context).apply {
            calendarViewShown = false
            spinnersShown = true
            if (dateOnly) maxDate = System.currentTimeMillis()
            descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
            init(calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)) { view, _, _, _ ->
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
            }
        }
        val timePicker = TimePicker(context).apply {
            setIs24HourView(true)
            hour = calendar.get(Calendar.HOUR_OF_DAY)
            minute = calendar.get(Calendar.MINUTE)
            descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
            setOnTimeChangedListener { view, _, _ -> view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK) }
        }
        val content = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (8 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            if (!timeOnly) addView(datePicker, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
            if (!dateOnly) addView(timePicker, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        val scroll = ScrollView(activity).apply { addView(content) }
        requestId = id
        dialog = AlertDialog.Builder(activity)
            .setTitle(body.optString("title", "일시 선택"))
            .setView(scroll)
            .setNegativeButton("취소") { _, _ -> finish(null) }
            .setPositiveButton("선택완료") { _, _ ->
                finish(String.format(Locale.US, "%04d-%02d-%02dT%02d:%02d", datePicker.year, datePicker.month + 1,
                    datePicker.dayOfMonth, if (dateOnly) 0 else timePicker.hour, if (dateOnly) 0 else timePicker.minute))
            }.create().also { picker ->
                picker.setOnDismissListener { if (requestId == id) finish(null) }
                picker.show()
            }
    }
    fun close() { finish(null) }
    private fun finish(value: String?) {
        val id = requestId ?: return
        requestId = null
        val current = dialog
        dialog = null
        current?.dismiss()
        reply(id, value)
    }
    private fun reply(id: String, value: String?, error: Boolean = false) {
        val payload = JSONObject().put("value", value ?: JSONObject.NULL).put("error", error)
        evaluate("window.__dateTimePickerBridge?.resolve(${JSONObject.quote(id)}, $payload)")
    }
}
