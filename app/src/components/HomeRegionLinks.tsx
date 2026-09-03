import Link from "next/link";
import { getSidoSummaries } from "@/lib/nursingRoomRegions";

/**
 * 홈에서 지역별 수유실 페이지로 들어가는 진입점.
 *
 * 지도 화면(/nursing-room)은 전체화면이라 지역 목록을 띄울 자리가 없어,
 * 242개 지역 페이지로 가는 유일한 "눈에 보이는" 경로가 없었다.
 * 데이터는 빌드 시점에 굳으므로(force-cache) 홈 렌더에 부담을 주지 않는다.
 */
export default async function HomeRegionLinks() {
  const sidos = await getSidoSummaries();
  if (sidos.length === 0) return null;

  const total = sidos.reduce((sum, s) => sum + s.count, 0);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-app-black">
          지역별 수유실 찾기
        </h2>
        <span className="text-[12px] text-gray-500">
          전국 {total.toLocaleString()}곳
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {sidos.map((s) => (
          <li key={s.sido}>
            <Link
              href={`/nursing-room/${s.slug}`}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-app-black active:opacity-70"
            >
              {s.sido}
              <span className="text-gray-500">{s.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
