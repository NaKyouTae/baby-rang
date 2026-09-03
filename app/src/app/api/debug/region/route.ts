import { NextResponse } from "next/server";
import {
  getSidoDetail,
  getSigunguRooms,
  sortRooms,
} from "@/lib/nursingRoomRegions";

/**
 * 수유실 지역 페이지가 프로덕션에서만 500 이 나는 원인을 좁히기 위한 임시 진단용.
 * 데이터 조회 단계에서 나는 예외를 그대로 돌려준다. 원인 확인 후 삭제할 것.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const sido = sp.get("sido") ?? "울산";
  const sigungu = sp.get("sigungu");

  const step: Record<string, unknown> = {
    hasApiKey: Boolean(process.env.SOOYUSIL_API_KEY),
    nodeVersion: process.version,
    sido,
    sigungu,
  };

  try {
    const detail = await getSidoDetail(sido);
    step.sidoRooms = detail?.rooms.length ?? 0;
    step.sigunguCount = detail?.sigungus.length ?? 0;

    if (sigungu) {
      const rooms = await getSigunguRooms(sido, sigungu);
      step.sigunguRooms = rooms?.length ?? 0;
    }

    // 렌더 직전에 쓰는 정렬(localeCompare)까지 여기서 재현해 본다.
    if (detail) {
      const sorted = sortRooms(detail.rooms);
      step.sortedFirst = sorted[0]?.name ?? null;
    }

    step.ok = true;
  } catch (e) {
    step.ok = false;
    step.errorName = e instanceof Error ? e.name : typeof e;
    step.errorMessage = e instanceof Error ? e.message : String(e);
    step.errorStack = e instanceof Error ? e.stack?.split("\n").slice(0, 6) : null;
  }

  return NextResponse.json(step, { status: 200 });
}
