package kr.spectrify.babyrang

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * 스플래시 홍보 이미지. 어드민 시스템 > 스플래시 에서 관리한다.
 *
 * 앱을 켤 때 이미지를 받으면 실행이 느려지므로, 지난 실행에서 받아 둔 목록·이미지로 보여 주고
 * 새 목록은 뒤에서 받아 다음 실행을 위해 저장한다. 그래서 바꾼 이미지는 한 번 늦게 보인다.
 * iOS 의 SplashPromo.swift 와 같은 규칙이다.
 */
object SplashPromo {
    private const val LIST_URL = "https://babyroom.spectrify.kr/api/launch-ads"
    private const val EVENT_URL = "https://babyroom.spectrify.kr/api/launch-ads/%s/events"

    private data class Item(val id: String, val imageUrl: String, val startsAt: Long, val endsAt: Long)

    private fun dir(context: Context) = File(context.filesDir, "splash-promo").apply { mkdirs() }
    private fun listFile(context: Context) = File(dir(context), "list.json")

    /** 업로드마다 주소가 달라지므로 주소의 파일 이름을 그대로 쓴다 */
    private fun fileOf(context: Context, item: Item) =
        File(dir(context), item.imageUrl.substringAfterLast('/').ifEmpty { item.id })

    /** 서버가 주는 시각(Date.toJSON, 예: 2026-11-19T07:42:00.000Z). minSdk 24 라 java.time 대신 쓴다. */
    private fun parseTime(s: String): Long =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            .apply { timeZone = TimeZone.getTimeZone("UTC") }
            .parse(s)?.time ?: 0L

    private fun parse(json: String): List<Item> {
        val arr: JSONArray = JSONObject(json).optJSONArray("items") ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            runCatching {
                Item(
                    id = o.getString("id"),
                    imageUrl = o.getString("imageUrl"),
                    startsAt = parseTime(o.getString("startsAt")),
                    endsAt = parseTime(o.getString("endsAt")),
                )
            }.getOrNull()
        }
    }

    /** 지금 보여 줄 홍보 이미지. 기간 안이고 이미지를 받아 둔 것 중 시작이 가장 늦은 것. */
    fun current(context: Context): Pair<String, Bitmap>? = runCatching {
        val file = listFile(context)
        if (!file.exists()) return null
        val now = System.currentTimeMillis()
        parse(file.readText())
            .filter { it.startsAt <= now && it.endsAt > now }
            .sortedByDescending { it.startsAt }
            .firstNotNullOfOrNull { item ->
                val img = fileOf(context, item)
                if (!img.exists()) null
                else decode(img)?.let { item.id to it }
            }
    }.getOrNull()

    /** 어드민이 큰 원본을 올려도 메모리를 넘기지 않게 화면 폭 정도로 줄여 읽는다 */
    private fun decode(file: File): Bitmap? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(file.absolutePath, bounds)
        var sample = 1
        while (bounds.outWidth / (sample * 2) >= 1080) sample *= 2
        return BitmapFactory.decodeFile(file.absolutePath, BitmapFactory.Options().apply { inSampleSize = sample })
    }

    /** 새 목록과 이미지를 받아 둔다. 다음 실행에 쓴다. 백그라운드 스레드에서 돈다. */
    fun refresh(context: Context) {
        val app = context.applicationContext
        Thread {
            runCatching {
                val json = get(LIST_URL) ?: return@runCatching
                val items = parse(json)
                val keep = mutableSetOf("list.json")
                for (item in items) {
                    val target = fileOf(app, item)
                    keep += target.name
                    if (target.exists()) continue
                    val tmp = File(dir(app), target.name + ".part")
                    if (download(item.imageUrl, tmp)) tmp.renameTo(target) else tmp.delete()
                }
                listFile(app).writeText(json)
                // 내려간 광고의 이미지는 지운다
                dir(app).listFiles()?.filter { it.name !in keep }?.forEach { it.delete() }
            }
        }.start()
    }

    /** 노출 집계. 실패해도 상관없다. */
    fun reportImpression(id: String) {
        Thread {
            runCatching {
                val conn = URL(EVENT_URL.format(id)).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write("""{"type":"impression"}""".toByteArray()) }
                conn.responseCode
                conn.disconnect()
            }
        }.start()
    }

    private fun get(url: String): String? {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 5000
        conn.readTimeout = 5000
        return try {
            if (conn.responseCode == 200) conn.inputStream.bufferedReader().use { it.readText() } else null
        } finally {
            conn.disconnect()
        }
    }

    private fun download(url: String, to: File): Boolean {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000
        conn.readTimeout = 20000
        return try {
            if (conn.responseCode != 200) return false
            conn.inputStream.use { input -> to.outputStream().use { input.copyTo(it) } }
            true
        } finally {
            conn.disconnect()
        }
    }
}
