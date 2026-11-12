package kr.spectrify.babyrang

import android.app.Activity
import android.util.Log
import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions
import org.json.JSONObject

/**
 * 보석함의 보상형 광고. 웹의 app/src/lib/rewardedAd.ts 와 짝이다(iOS 는 RewardedAdBridge).
 *
 * 다음 광고를 미리 받아 둔다 — 버튼을 누른 뒤에 받기 시작하면 몇 초씩 빈 화면을 보게 된다.
 *
 * ⚠️ 보석은 여기서 주지 않는다. 시청 건 id(rewardId)를 SSV custom_data 로 실어 보내면
 *    AdMob 이 서버로 서명된 콜백을 보내고, 서버가 그걸 확인해 준다.
 *    웹에 돌려주는 earned 는 지급을 기다려 볼지 정하는 데만 쓴다.
 *
 * 모든 경로에서 reply 를 정확히 한 번 부른다 — 웹은 타임아웃 없이 기다린다.
 */
class RewardedAdManager(
    private val activity: Activity,
    /** 결과를 웹으로 돌려주는 창구. */
    private val reply: (requestId: String, payload: JSONObject) -> Unit,
) {
    private var ad: RewardedAd? = null
    private var loading = false
    /** 광고를 받는 중에 들어온 요청. 받는 즉시 띄운다. */
    private var waiting: Request? = null
    /** 광고를 띄우고 있는 요청. 닫히기 전까지 다른 요청은 거절한다. */
    private var showing: String? = null

    private data class Request(val requestId: String, val rewardId: String, val userId: String)

    fun preload() {
        if (ad != null || loading) return
        loading = true
        RewardedAd.load(
            activity,
            AdConfig.rewardedUnitId,
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(loaded: RewardedAd) {
                    loading = false
                    ad = loaded
                    waiting?.let {
                        waiting = null
                        show(it)
                    }
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    loading = false
                    Log.w(TAG, "보상형 광고 로드 실패: ${error.code} ${error.message}")
                    waiting?.let {
                        waiting = null
                        replyFailed(it.requestId)
                    }
                }
            },
        )
    }

    /** 메인 스레드에서 부른다(AndroidBridge). */
    fun request(requestId: String, rewardId: String, userId: String) {
        if (showing != null || waiting != null) {
            reply(requestId, JSONObject().put("ok", false).put("message", "광고를 이미 보고 있어요."))
            return
        }
        val req = Request(requestId, rewardId, userId)
        if (ad != null) {
            show(req)
        } else {
            waiting = req
            preload()
        }
    }

    private fun show(req: Request) {
        val current = ad ?: return replyFailed(req.requestId)
        ad = null
        showing = req.requestId
        var earned = false

        current.setServerSideVerificationOptions(
            ServerSideVerificationOptions.Builder()
                .setCustomData(req.rewardId)
                .setUserId(req.userId)
                .build(),
        )
        current.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                showing = null
                reply(req.requestId, JSONObject().put("ok", true).put("earned", earned))
                preload()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                showing = null
                Log.w(TAG, "보상형 광고 표시 실패: ${error.code} ${error.message}")
                replyFailed(req.requestId)
                preload()
            }
        }
        current.show(activity) { earned = true }
    }

    private fun replyFailed(requestId: String) {
        reply(
            requestId,
            JSONObject()
                .put("ok", false)
                .put("message", "광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."),
        )
    }

    private companion object {
        const val TAG = "RewardedAd"
    }
}
