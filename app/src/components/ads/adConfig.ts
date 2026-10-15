/**
 * 앱(WebView)에서 네이티브 AdMob 배너를 쓸지.
 *
 * false 면 앱에서도 웹과 똑같이 카카오 애드핏을 띄우고, 네이티브에는 늘 visible: false 를 보내
 * AdMob 배너 뷰를 숨긴다. 웹 배포만으로 바뀌므로 앱을 다시 내지 않아도 된다.
 *
 * 2026-10-15 AdMob 계정 30일 정지로 꺼 둔다. 정지가 풀리면 true 로 되돌린다.
 */
export const APP_ADMOB_ENABLED = false;
