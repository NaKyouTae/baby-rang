import Link from "next/link";
import { normalizeTel, type NursingRoom } from "@/lib/nursingRoomRegions";

/**
 * 지역 페이지에서 쓰는 수유실 목록 (서버 컴포넌트).
 *
 * 지도 화면과 달리 여기서는 "크롤러가 읽을 수 있는 텍스트"가 목적이므로
 * 이름·주소·상세위치·전화번호를 모두 HTML 로 렌더링한다.
 */
export function RegionRoomList({ rooms }: { rooms: NursingRoom[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rooms.map((room) => {
        const tel = normalizeTel(room.tel);
        return (
        <li
          key={room.id}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-app-black">
              {room.name}
            </h3>
            {room.dadAvailable ? (
              <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600">
                아빠 이용 가능
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[13px] leading-relaxed text-gray-600">
            {room.address}
          </p>

          <dl className="mt-2 flex flex-col gap-1 text-[12px] text-gray-500">
            <div className="flex gap-1.5">
              <dt className="shrink-0 font-medium">유형</dt>
              <dd>{room.type}</dd>
            </div>
            {room.detailLocation ? (
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-medium">위치</dt>
                <dd>{room.detailLocation}</dd>
              </div>
            ) : null}
            {tel ? (
              <div className="flex gap-1.5">
                <dt className="shrink-0 font-medium">전화</dt>
                <dd>
                  <a href={`tel:${tel.href}`} className="underline">
                    {tel.display}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </li>
        );
      })}
    </ul>
  );
}

/** 지역 페이지 공통 FAQ (details/summary — JS 없이 펼쳐지고 크롤러가 읽는다). */
export function RegionFaq({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[16px] font-bold text-app-black">
        자주 묻는 질문
      </h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <details
            key={item.q}
            className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3"
          >
            <summary className="cursor-pointer text-[14px] font-medium text-app-black">
              {item.q}
            </summary>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** 지역 페이지 하단 — 지도 화면으로 유도. */
export function MapCta() {
  return (
    <Link
      href="/nursing-room"
      className="mt-8 flex w-full items-center justify-center rounded-xl bg-primary-500 px-4 py-3.5 text-[15px] font-semibold text-white"
    >
      지도에서 내 주변 수유실 찾기
    </Link>
  );
}
