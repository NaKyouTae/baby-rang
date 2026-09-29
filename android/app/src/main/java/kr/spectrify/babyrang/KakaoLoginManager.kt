package kr.spectrify.babyrang

import android.app.Activity
import android.util.Log
import com.kakao.sdk.auth.model.OAuthToken
import com.kakao.sdk.common.model.ClientError
import com.kakao.sdk.common.model.ClientErrorCause
import com.kakao.sdk.user.UserApiClient
import org.json.JSONObject

/**
 * 카카오 로그인.
 *
 * 웹(WebView)은 카카오 SDK 를 직접 부를 수 없으므로 여기서 대신 처리하고
 * access token 을 JS 로 돌려준다. iOS 의 KakaoLoginBridge 와 같은 구조다.
 *
 * ⚠️ 여기서 우리 세션까지 만들지 않는다. 돌려준 토큰을 웹이 서버(/auth/kakao/native)로
 *    보내 우리 토큰으로 교환한다. 세션 쿠키는 웹의 navigation 응답으로 심어야 한다.
 */
class KakaoLoginManager(
    private val activity: Activity,
    /** 결과를 웹으로 돌려주는 창구. */
    private val reply: (requestId: String, payload: JSONObject) -> Unit,
) {

    fun login(requestId: String) {
        // 카카오톡이 깔려 있으면 앱으로 넘겨 인증한다. 계정 입력이 필요 없어 훨씬 빠르다.
        if (UserApiClient.instance.isKakaoTalkLoginAvailable(activity)) {
            UserApiClient.instance.loginWithKakaoTalk(activity) { token, error ->
                if (error != null) {
                    // ⚠️ 사용자가 카카오톡 인증을 직접 취소한 경우에는 계정 로그인으로
                    //    넘기면 안 된다. 취소했는데 웹 로그인 화면이 다시 뜨면
                    //    빠져나갈 수 없는 것처럼 느껴진다.
                    if (error is ClientError && error.reason == ClientErrorCause.Cancelled) {
                        replyCancelled(requestId)
                        return@loginWithKakaoTalk
                    }
                    // 카카오톡은 있지만 로그인할 수 없는 상태(로그아웃·구버전 등).
                    // 이때는 계정 로그인으로 이어가는 것이 정상 흐름이다.
                    Log.w(TAG, "카카오톡 로그인 실패, 계정 로그인으로 전환: $error")
                    loginWithAccount(requestId)
                    return@loginWithKakaoTalk
                }
                finish(requestId, token)
            }
            return
        }

        loginWithAccount(requestId)
    }

    /** 카카오톡이 없거나 쓸 수 없을 때. 카카오계정 웹 로그인으로 처리한다. */
    private fun loginWithAccount(requestId: String) {
        UserApiClient.instance.loginWithKakaoAccount(activity) { token, error ->
            if (error != null) {
                if (error is ClientError && error.reason == ClientErrorCause.Cancelled) {
                    replyCancelled(requestId)
                    return@loginWithKakaoAccount
                }
                Log.e(TAG, "카카오계정 로그인 실패: $error")
                reply(
                    requestId,
                    JSONObject().put("ok", false).put("message", "로그인을 완료하지 못했습니다."),
                )
                return@loginWithKakaoAccount
            }
            finish(requestId, token)
        }
    }

    private fun finish(requestId: String, token: OAuthToken?) {
        val accessToken = token?.accessToken
        if (accessToken.isNullOrEmpty()) {
            // 에러도 토큰도 없는 경우는 없어야 하지만, 웹은 타임아웃을 걸지 않으므로
            // 모든 경로에서 반드시 응답을 돌려줘야 Promise 가 풀린다.
            reply(
                requestId,
                JSONObject().put("ok", false).put("message", "로그인 정보를 받지 못했습니다."),
            )
            return
        }
        reply(requestId, JSONObject().put("ok", true).put("accessToken", accessToken))
    }

    private fun replyCancelled(requestId: String) =
        reply(requestId, JSONObject().put("ok", false).put("cancelled", true))

    private companion object {
        const val TAG = "KakaoLoginManager"
    }
}
