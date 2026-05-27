import HomePage from "./home/page";

export { metadata } from "./home/page";

// 루트 경로는 /home 과 동일한 화면을 직접 렌더링한다.
// (redirect 를 두면 WebView 가 / → 307 → /home 으로 한 번 더 왕복하면서
//  초기 흰 화면이 길어진다)
export default HomePage;
