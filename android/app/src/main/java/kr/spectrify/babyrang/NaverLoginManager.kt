package kr.spectrify.babyrang

import android.app.Activity
import android.util.Log
import com.navercorp.nid.NaverIdLoginSDK
import com.navercorp.nid.oauth.OAuthLoginCallback
import com.navercorp.nid.oauth.NidOAuthErrorCode
import org.json.JSONObject

/**
 * 네이버 로그인.
 *
 * 구조는 KakaoLoginManager 와 같다. 웹(WebView)은 네이버 SDK 를 직접 부를 수 없으므로
 * 여기서 대신 처리하고 토큰을 JS 로 돌려준다. iOS 의 NaverLoginBridge 와 짝이다.
 *
 * ⚠️ 카카오와 달리 refresh token 까지 돌려준다.
 *    네이버에는 "이 토큰이 우리 앱 것인가"를 되묻는 API 가 없어서, 서버가 우리
 *    client_id·secret 으로 갱신해 보는 것으로 대신 확인한다.
 *    (server/src/auth/naver.service.ts 의 verifyNativeTokens)
 *    access token 만 올려보내면 서버가 로그인을 거부한다.
 *
 * ⚠️ 여기서 우리 세션까지 만들지 않는다. 세션 쿠키는 웹의 navigation 응답으로 심어야 한다.
 */
class NaverLoginManager(
    private val activity: Activity,
    /** 결과를 웹으로 돌려주는 창구. */
    private val reply: (requestId: String, payload: JSONObject) -> Unit,
) {

    fun login(requestId: String) {
        // 남아 있는 토큰을 지우고 매번 새로 인증한다.
        // 그러지 않으면 이미 연동된 사용자는 동의 화면을 건너뛰어, 나중에 추가한
        // 동의항목(이름·전화번호)을 영원히 받을 수 없다.
        runCatching { NaverIdLoginSDK.logout() }

        NaverIdLoginSDK.authenticate(
            activity,
            object : OAuthLoginCallback {
                override fun onSuccess() {
                    finish(requestId)
                }

                override fun onFailure(httpStatus: Int, message: String) {
                    // 사용자가 동의 화면을 닫은 경우. 실패 문구를 띄우면 안 된다.
                    if (NaverIdLoginSDK.getLastErrorCode() ==
                        NidOAuthErrorCode.CLIENT_USER_CANCEL
                    ) {
                        replyCancelled(requestId)
                        return
                    }
                    Log.e(TAG, "네이버 로그인 실패: $httpStatus $message")
                    reply(
                        requestId,
                        JSONObject()
                            .put("ok", false)
                            .put("message", "로그인을 완료하지 못했습니다.")
                            // 웹은 실패를 화면에 표시만 한다. 원인은 로그로만 남는다.
                            // (logcat 에서 이 태그로 볼 수 있다)
                            .put("detail", "$httpStatus / $message"),
                    )
                }

                override fun onError(errorCode: Int, message: String) {
                    onFailure(errorCode, message)
                }
            },
        )
    }

    private fun finish(requestId: String) {
        val accessToken = NaverIdLoginSDK.getAccessToken()
        val refreshToken = NaverIdLoginSDK.getRefreshToken()
        // refresh token 이 없으면 서버가 토큰 출처를 확인할 수 없어 어차피 거부된다.
        // 여기서 끊어야 사용자가 원인 모를 거절을 겪지 않는다.
        if (accessToken.isNullOrEmpty() || refreshToken.isNullOrEmpty()) {
            reply(
                requestId,
                JSONObject().put("ok", false).put("message", "로그인 정보를 받지 못했습니다."),
            )
            return
        }
        reply(
            requestId,
            JSONObject()
                .put("ok", true)
                .put("accessToken", accessToken)
                .put("refreshToken", refreshToken),
        )
    }

    private fun replyCancelled(requestId: String) =
        reply(requestId, JSONObject().put("ok", false).put("cancelled", true))

    private companion object {
        const val TAG = "NaverLoginManager"
    }
}
