import BottomNav from "./BottomNav";

// Root layout 진입 시 백엔드 fetch로 SSR을 블로킹하지 않도록
// 클라이언트가 마운트 직후 /api/nav-slots 를 호출해 슬롯을 채운다.
// (Cloudtype 콜드 스타트 시 흰 화면 시간을 줄이기 위함)
export default function BottomNavServer() {
  return <BottomNav />;
}
