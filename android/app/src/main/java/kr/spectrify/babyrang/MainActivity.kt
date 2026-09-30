package kr.spectrify.babyrang

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import android.widget.FrameLayout
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import android.os.SystemClock
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.kakao.sdk.common.KakaoSdk
import kr.spectrify.babyrang.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    /** 웹이 실행되는 주소. iOS 앱과 동일하게 프로덕션을 본다. */
    private val startUrl = "https://baby-rang.spectrify.kr/home"

    /** 서비스 도메인. 이 밖의 http(s) 링크는 외부 브라우저로 넘긴다. */
    private val serviceHost = "spectrify.kr"

    /**
     * 앱이 로드하는 주소의 호스트. 내부로 취급한다.
     *
     * 개발 중에는 로컬 dev 서버(10.0.2.2)를 보는데, 이 호스트를 내부로 인정하지 않으면
     * 앱 자신의 페이지 이동이 전부 외부 브라우저로 튕겨 나간다.
     */
    private val startHost: String? by lazy { Uri.parse(startUrl).host }

    private var geoOrigin: String? = null
    private var geoCallback: GeolocationPermissions.Callback? = null

    /** 결제. AndroidBridge 가 웹 요청을 여기로 넘긴다. */
    lateinit var billing: BillingManager
        private set

    /** 카카오 로그인. AndroidBridge 가 웹 요청을 여기로 넘긴다. */
    lateinit var kakaoLogin: KakaoLoginManager
        private set

    private var adView: AdView? = null
    /** 광고가 실제로 채워졌는지. 채워지기 전에는 자리를 차지하지 않는다. */
    private var adLoaded = false
    /** 웹이 마지막으로 알려준 슬롯. 아직 못 받았으면 null. */
    private var adSlot: AdSlot? = null

    @SuppressLint("SetJavaScriptEnabled")
    /** 스플래시를 이미 걷었는지(또는 걷기로 예약했는지). 중복 호출을 막는다. */
    private var splashHidden = false

    /** 스플래시가 화면에 뜬 시각. 최소 노출 시간을 재는 기준이다. */
    private val splashStartedAt = SystemClock.elapsedRealtime()

    /**
     * 스플래시 이미지를 걷는다.
     *
     * 웹의 SplashProvider 가 같은 이미지를 이어받으므로 그대로 사라져도 끊겨 보이지 않는다.
     * 짧게 페이드시키는 이유는, 웹 스플래시가 뜨기까지의 한 프레임을 덮기 위해서다.
     */
    private fun hideSplash() {
        if (splashHidden) return
        splashHidden = true

        // 웹이 캐시에서 바로 그려지면 onPageCommitVisible 이 수백 ms 안에 떨어져,
        // 스플래시가 몇 프레임 만에 사라진다. 사용자 눈에는 시스템 스플래시에서
        // 곧장 홈으로 튀는 것처럼 보인다. iOS 와 같이 최소 노출 시간을 보장한다.
        val shown = SystemClock.elapsedRealtime() - splashStartedAt
        val wait = (MIN_SPLASH_MS - shown).coerceAtLeast(0L)

        binding.splashView.postDelayed({
            binding.splashView.animate()
                .alpha(0f)
                .setDuration(200)
                .withEndAction { binding.splashView.visibility = android.view.View.GONE }
                .start()
        }, wait)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // ⚠️ super.onCreate 보다 먼저 불러야 한다.
        //    스플래시 테마(Theme.BabyRang.Starting)를 실제 앱 테마로 갈아끼우는 일을 하므로,
        //    순서가 바뀌면 스플래시 색이 적용되지 않는다.
        installSplashScreen()
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // onPageCommitVisible 이 오지 않는 경우(네트워크 오류 등) 대비.
        // 스플래시가 영원히 남아 앱이 멈춘 것처럼 보이는 것을 막는다.
        binding.root.postDelayed({ hideSplash() }, 5000)

        with(binding.webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            // 웹이 뷰포트를 직접 제어한다(ViewportHeightSetter). 자동 축소를 끈다.
            useWideViewPort = false
            loadWithOverviewMode = false
            builtInZoomControls = false
            displayZoomControls = false
            setSupportZoom(false)
            mediaPlaybackRequiresUserGesture = false
        }

        binding.webView.webViewClient = object : WebViewClient() {
            // 첫 픽셀이 그려지는 시점. onPageFinished 는 JS 번들·데이터까지 끝나야 해서
            // 몇 초씩 걸린다. iOS 의 didCommit 과 같은 자리다.
            override fun onPageCommitVisible(view: WebView, url: String) {
                hideSplash()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean {
                val url = request.url
                val scheme = url.scheme ?: return false

                // 카카오톡·카드사 앱카드 등 커스텀 스킴은 외부 앱으로 넘긴다.
                if (scheme != "http" && scheme != "https") {
                    return openExternal(url)
                }
                // 서비스 외 도메인은 외부 브라우저로 넘긴다.
                val host = url.host ?: return false
                val internal = host.endsWith(serviceHost) || host == startHost
                if (!internal) {
                    return openExternal(url)
                }
                return false
            }
        }

        binding.webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(
                msg: android.webkit.ConsoleMessage,
            ): Boolean {
                android.util.Log.i("BabyRangWeb", "${msg.messageLevel()}: ${msg.message()}")
                return true
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String,
                callback: GeolocationPermissions.Callback,
            ) {
                // 웹의 위치 요청은 앱 권한이 있어야 의미가 있다.
                // 앱 권한이 없으면 먼저 요청하고, 응답을 받은 뒤 웹에 전달한다.
                val granted = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED

                if (granted) {
                    callback.invoke(origin, true, false)
                    return
                }
                geoOrigin = origin
                geoCallback = callback
                ActivityCompat.requestPermissions(
                    this@MainActivity,
                    arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION),
                    REQ_LOCATION,
                )
            }
        }

        // 웹이 SPA 히스토리를 쓰므로 뒤로가기는 WebView 에 먼저 넘긴다.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    finish()
                }
            }
        })

        billing = BillingManager(this) { requestId, payload ->
            // 웹의 __playBridge 로 결과를 돌려준다. 문자열 리터럴로 안전하게 감싼다.
            val js = "window.__playBridge && window.__playBridge.resolve(" +
                org.json.JSONObject.quote(requestId) + "," + payload.toString() + ")"
            // ⚠️ Billing 콜백은 백그라운드 스레드에서 온다.
            //    evaluateJavascript 를 UI 스레드 밖에서 부르면 조용히 무시돼
            //    웹의 Promise 가 영원히 대기 상태로 남는다.
            runOnUiThread { binding.webView.evaluateJavascript(js, null) }
        }

        // ⚠️ 매니페스트의 리다이렉트 스킴(kakao<키>)과 반드시 같은 키를 써야 한다.
        //    어긋나면 카카오톡은 열리는데 앱으로 돌아오지 못한다.
        //    그래서 양쪽 모두 build.gradle 의 한 값에서 온다.
        KakaoSdk.init(this, BuildConfig.KAKAO_NATIVE_APP_KEY)

        kakaoLogin = KakaoLoginManager(this) { requestId, payload ->
            val js = "window.__kakaoLoginBridge && window.__kakaoLoginBridge.resolve(" +
                org.json.JSONObject.quote(requestId) + "," + payload.toString() + ")"
            // 카카오 콜백은 메인 스레드로 오지만, evaluateJavascript 를 UI 스레드 밖에서
            // 부르면 조용히 무시되므로 결제와 같은 방식으로 한 번 더 보장한다.
            runOnUiThread { binding.webView.evaluateJavascript(js, null) }
        }

        binding.webView.addJavascriptInterface(AndroidBridge(this), "Android")

        MobileAds.initialize(this)
        setUpBanner()

        if (savedInstanceState == null) {
            binding.webView.loadUrl(startUrl)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        binding.webView.restoreState(savedInstanceState)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQ_LOCATION) return
        val granted = grantResults.firstOrNull() == android.content.pm.PackageManager.PERMISSION_GRANTED
        geoCallback?.invoke(geoOrigin.orEmpty(), granted, false)
        geoOrigin = null
        geoCallback = null
    }

    /** 외부 앱/브라우저로 넘긴다. 처리할 앱이 없으면 WebView 안에 그대로 둔다. */
    private fun openExternal(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (e: android.content.ActivityNotFoundException) {
            false
        }
    }

    /** 고정 규격(320x50) 배너를 만들어 컨테이너에 붙이고 로드한다. */
    private fun setUpBanner() {
        val view = AdView(this).apply {
            setAdSize(AdSize.BANNER)
            adUnitId = AdConfig.bottomBannerUnitId
            adListener = object : AdListener() {
                override fun onAdLoaded() {
                    android.util.Log.i(TAG, "✅ 배너 채움")
                    adLoaded = true
                    layOutBanner()
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    // 노필/네트워크/단위 ID 오류를 구분하려면 이 메시지가 필요하다.
                    android.util.Log.e(TAG, "배너 실패: \${error.message}")
                    adLoaded = false
                    layOutBanner()
                }
            }
        }
        adView = view
        binding.adContainer.addView(view)
        layOutBanner()
        view.loadAd(AdRequest.Builder().build())
    }

    /**
     * 웹이 알려준 슬롯 위치에 배너를 맞춘다.
     *
     * 컨테이너(adContainer)를 슬롯 사각형에 맞추고, 배너는 그 안에서 가운데 정렬한다.
     * 배너 폭을 직접 읽어 가운데를 계산하면 아직 측정 전이라 0 이 나와 한쪽으로 쏠린다.
     * 정렬은 레이아웃 시스템에 맡기는 편이 정확하다.
     *
     * 웹은 CSS px 로 보내므로 화면 밀도를 곱해 픽셀로 바꾼다.
     * 슬롯이 없거나(visible=false) 광고가 아직 안 채워졌으면 숨긴다.
     * 높이 0 이나 투명도로만 숨기면 SDK 가 노출로 집계할 수 있어 View 를 실제로 GONE 처리한다.
     */
    fun layOutBanner() {
        val view = adView ?: return
        val slot = adSlot
        val show = slot?.visible == true && adLoaded

        if (!show) {
            view.visibility = android.view.View.GONE
            return
        }

        val density = resources.displayMetrics.density

        // 1) 컨테이너를 슬롯 사각형에 맞춘다.
        val containerParams = (binding.adContainer.layoutParams as FrameLayout.LayoutParams)
        containerParams.width = slot.width
            ?.let { (it * density).toInt() }
            ?: FrameLayout.LayoutParams.MATCH_PARENT
        containerParams.height = FrameLayout.LayoutParams.WRAP_CONTENT
        containerParams.gravity = android.view.Gravity.BOTTOM or android.view.Gravity.START
        containerParams.leftMargin = (slot.left * density).toInt()
        containerParams.bottomMargin = (slot.bottomInset * density).toInt()
        binding.adContainer.layoutParams = containerParams

        // 2) 배너는 컨테이너 안에서 가운데.
        val adParams = (view.layoutParams as? FrameLayout.LayoutParams)
            ?: FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
            )
        adParams.gravity = android.view.Gravity.CENTER_HORIZONTAL
        view.layoutParams = adParams

        view.visibility = android.view.View.VISIBLE
    }

    /** 웹이 보고한 슬롯을 반영한다. AndroidBridge 가 메인 스레드에서 호출한다. */
    fun applyAdSlot(slot: AdSlot) {
        android.util.Log.i(TAG, "슬롯 수신: $slot")
        adSlot = slot
        layOutBanner()
    }

    override fun onDestroy() {
        adView?.destroy()
        billing.destroy()
        super.onDestroy()
    }

    /** 앱 설정 화면을 연다. 웹의 openLocationSettings() 가 호출한다. */
    fun openAppSettings() {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.fromParts("package", packageName, null),
        )
        startActivity(intent)
    }

    private companion object {
        /** 스플래시 최소 노출 시간(ms). iOS 의 브랜드 노출 1초와 맞춘다. */
        const val MIN_SPLASH_MS = 1000L

        const val REQ_LOCATION = 1001
        const val TAG = "BabyRangAd"
    }
}
