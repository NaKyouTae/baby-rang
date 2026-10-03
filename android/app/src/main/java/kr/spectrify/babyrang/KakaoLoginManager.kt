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
 * 로그인 뒤에는 이름·전화번호 동의 여부를 확인하고 빠져 있으면 추가 동의를 한 번 더 받는다.
 * 이미 연결된 앱이면 동의 화면을 건너뛰기 때문에, 나중에 추가한 동의항목은 이 단계가
 * 없으면 영원히 받을 수 없다(서버는 이름·전화번호 없이는 가입을 막는다).
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
        val talkAvailable = UserApiClient.instance.isKakaoTalkLoginAvailable(activity)
        // 카카오톡이 깔려 있는데도 false 로 나오면 거의 매니페스트의 <queries> 누락이다.
        // (Android 11+ 는 선언 없이는 다른 앱의 설치 여부를 볼 수 없다)
        Log.i(TAG, "로그인 시작: 카카오톡로그인가능=$talkAvailable")

        // 카카오톡이 깔려 있으면 앱으로 넘겨 인증한다. 계정 입력이 필요 없어 훨씬 빠르다.
        if (talkAvailable) {
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
                    //
                    // ⚠️ 콘솔 설정이 틀려도 여기로 떨어진다(패키지명·키 해시 미등록 →
                    //    KakaoTalk 이 인증을 거부). 그 경우 계정 로그인도 같은 이유로
                    //    실패하므로, 원인을 알려면 이 로그의 에러 본문을 봐야 한다.
                    Log.w(TAG, "카카오톡 로그인 실패, 계정 로그인으로 전환: $error", error)
                    loginWithAccount(requestId, talkError = error)
                    return@loginWithKakaoTalk
                }
                finish(requestId, token)
            }
            return
        }

        loginWithAccount(requestId)
    }

    /**
     * 카카오톡이 없거나 쓸 수 없을 때. 카카오계정 로그인으로 처리한다.
     *
     * 이쪽도 카카오 SDK 가 띄우는 창이라 인증이 끝나면 `kakao{앱키}://oauth` 로
     * 앱에 돌아온다. 우리 웹 OAuth(`/auth/kakao`)와 달리 앱을 벗어나지 않는다.
     *
     * @param talkError 카카오톡 로그인이 먼저 실패해서 넘어온 경우 그 원인.
     *   둘 다 실패하면 보통 같은 이유(콘솔의 패키지명·키 해시 미등록)이고,
     *   계정 로그인 쪽 에러만 보면 원인을 알 수 없어 함께 올려보낸다.
     */
    private fun loginWithAccount(requestId: String, talkError: Throwable? = null) {
        UserApiClient.instance.loginWithKakaoAccount(activity) { token, error ->
            if (error != null) {
                if (error is ClientError && error.reason == ClientErrorCause.Cancelled) {
                    replyCancelled(requestId)
                    return@loginWithKakaoAccount
                }
                Log.e(TAG, "카카오계정 로그인 실패: $error", error)
                reply(
                    requestId,
                    JSONObject()
                        .put("ok", false)
                        .put("message", "로그인을 완료하지 못했습니다.")
                        // 웹은 이 실패를 화면에 표시만 하고 웹 OAuth 로 넘어가지 않는다.
                        // 원인은 콘솔로만 남으므로, 카카오톡 쪽 실패까지 함께 올려보낸다.
                        // (logcat 에서 `BabyRangWeb` 태그로 볼 수 있다)
                        .put(
                            "detail",
                            if (talkError != null) {
                                "카카오계정=$error / 카카오톡=$talkError"
                            } else {
                                error.toString()
                            },
                        ),
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
        agreeMissingScopesThenReply(requestId, accessToken)
    }

    /**
     * 아직 동의받지 못한 항목이 있으면 그 항목만 다시 묻고, 끝나면 토큰을 돌려준다.
     *
     * 조회나 추가 동의가 실패해도 로그인은 그대로 진행한다 — 여기서 막는 것보다
     * 서버 응답("이름과 전화번호 제공에 동의해야…")으로 안내하는 편이 덜 번거롭다.
     */
    private fun agreeMissingScopesThenReply(requestId: String, accessToken: String) {
        UserApiClient.instance.me { user, error ->
            if (error != null || user == null) {
                Log.w(TAG, "동의항목 조회 실패, 그대로 진행: $error")
                replyToken(requestId, accessToken)
                return@me
            }

            val account = user.kakaoAccount
            val scopes = mutableListOf<String>()
            if (account?.nameNeedsAgreement == true) scopes.add("name")
            if (account?.phoneNumberNeedsAgreement == true) scopes.add("phone_number")
            if (account?.genderNeedsAgreement == true) scopes.add("gender")
            if (account?.ageRangeNeedsAgreement == true) scopes.add("age_range")

            if (scopes.isEmpty()) {
                replyToken(requestId, accessToken)
                return@me
            }

            UserApiClient.instance.loginWithNewScopes(activity, scopes) { newToken, scopeError ->
                if (scopeError != null) {
                    Log.w(TAG, "추가 동의 실패, 기존 토큰으로 진행: $scopeError")
                    replyToken(requestId, accessToken)
                    return@loginWithNewScopes
                }
                replyToken(requestId, newToken?.accessToken ?: accessToken)
            }
        }
    }

    private fun replyToken(requestId: String, accessToken: String) =
        reply(requestId, JSONObject().put("ok", true).put("accessToken", accessToken))

    private fun replyCancelled(requestId: String) =
        reply(requestId, JSONObject().put("ok", false).put("cancelled", true))

    private companion object {
        const val TAG = "KakaoLoginManager"
    }
}
