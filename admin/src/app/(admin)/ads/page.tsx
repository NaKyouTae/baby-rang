import AdsClient, { type AdNetwork } from "./AdsClient";
import { adminFetch } from "@/lib/api";

export default async function AdsPage() {
  // 조회에 실패해도 화면은 열리게 서버 기본값(KAKAO)으로 둔다.
  let adNetwork: AdNetwork = "KAKAO";
  try {
    const data = await adminFetch<{ adNetwork: AdNetwork }>("/admin/app-settings");
    adNetwork = data.adNetwork;
  } catch {}
  return <AdsClient initial={adNetwork} />;
}
