
# ── 웹↔네이티브 브릿지 ──
#
# @JavascriptInterface 메서드는 웹이 '이름으로' 호출한다(window.Android.kakaoLogin 등).
# R8 은 자바 코드에서 호출되지 않는 이 메서드들을 쓰지 않는 것으로 보고 지우거나
# 이름을 바꾼다. 그러면 로그인·결제·광고 슬롯 보고가 한꺼번에 조용히 죽는다.
# 앱은 정상 실행되고 에러도 안 나서 원인을 찾기 매우 어렵다.
-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# WebView 에 붙이는 브릿지 클래스 자체도 유지한다.
-keep class kr.spectrify.babyrang.AndroidBridge { *; }

# ── 카카오 SDK ──
# 응답 모델을 리플렉션으로 역직렬화한다.
-keep class com.kakao.sdk.**.model.* { <fields>; }
-keep class * extends com.google.gson.TypeAdapter

# ── OkHttp 선택적 의존성 ──
#
# 카카오 SDK 가 쓰는 OkHttp 는 BouncyCastle·Conscrypt·OpenJSSE 가 있으면 쓰고
# 없으면 기본 TLS 로 동작한다. 우리는 넣지 않았으므로 경고만 끈다.
# (R8 이 app/build/outputs/mapping/*/missing_rules.txt 에 만들어 준 규칙)
-dontwarn org.bouncycastle.jsse.BCSSLParameters
-dontwarn org.bouncycastle.jsse.BCSSLSocket
-dontwarn org.bouncycastle.jsse.provider.BouncyCastleJsseProvider
-dontwarn org.conscrypt.Conscrypt$Version
-dontwarn org.conscrypt.Conscrypt
-dontwarn org.conscrypt.ConscryptHostnameVerifier
-dontwarn org.openjsse.javax.net.ssl.SSLParameters
-dontwarn org.openjsse.javax.net.ssl.SSLSocket
-dontwarn org.openjsse.net.ssl.OpenJSSE

# ── Retrofit / Gson (카카오 SDK 내부에서 사용) ──
#
# Retrofit 은 인터페이스의 '제네릭 반환 타입'을 런타임에 읽어 호출 어댑터를 만든다.
# R8 이 Signature 속성을 지우면 Call<T> 의 T 를 잃고
# "Unable to create call adapter for interface retrofit2.Call" 로 앱이 즉사한다.
# (AGP 8 의 R8 full mode 에서는 SDK 가 제공하는 consumer 규칙만으로는 부족하다)
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>

-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

-dontwarn javax.annotation.**
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
