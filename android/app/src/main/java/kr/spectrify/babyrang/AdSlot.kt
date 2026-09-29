package kr.spectrify.babyrang

/**
 * 웹이 알려준 "이 화면에서 앱 배너를 놓을 자리".
 *
 * 앱 배너는 WebView 위에 얹힌 네이티브 뷰라 웹에서 z-index 로 제어할 수 없다.
 * 좌표를 앱에 하드코딩하면 화면 크기·하단바 CSS 가 바뀔 때마다 어긋나므로,
 * 웹이 실제 슬롯을 재서 보내고 앱은 그 값만 따른다.
 *
 * 값은 모두 CSS px 이며, WebView 의 밀도를 곱해 픽셀로 환산해 쓴다.
 *
 * @param visible false 면 이 화면엔 배너 자리가 없다(하단 네비가 없거나 시트가 열림).
 * @param bottomInset 뷰포트 하단에서 슬롯 하단까지의 거리.
 * @param height 슬롯 높이.
 * @param width 슬롯 가로 폭. 화면이 콘텐츠 셸보다 넓을 때 배너가 밖으로 퍼지는 것을 막는다.
 * @param left 뷰포트 왼쪽에서 슬롯 왼쪽까지의 거리.
 */
data class AdSlot(
    val visible: Boolean,
    val bottomInset: Float = 0f,
    val height: Float = 0f,
    val width: Float? = null,
    val left: Float = 0f,
)
