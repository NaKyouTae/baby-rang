import { cookies } from "next/headers";
import BottomNav from "./BottomNav";
import { MENU_CATALOG, type MenuId } from "./menuCatalog";

const SLOT_COUNT = 4;
const DEFAULT_SLOTS: (MenuId | null)[] = ["growth-record", "growth-pattern", "wonder-weeks", null];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";

function sanitize(arr: unknown): (MenuId | null)[] {
  if (!Array.isArray(arr)) return [...DEFAULT_SLOTS];
  const mapped = arr.map((v) => (typeof v === "string" && v in MENU_CATALOG ? (v as MenuId) : null));
  while (mapped.length < SLOT_COUNT) mapped.push(null);
  return mapped.slice(0, SLOT_COUNT);
}

export default async function BottomNavServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    // 비로그인 → 클라이언트의 DEFAULT_SLOTS / authenticated=false 분기 사용
    return <BottomNav />;
  }

  let initialSlots: (MenuId | null)[] = [...DEFAULT_SLOTS];
  try {
    const res = await fetch(`${API_URL}/nav-slots`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      // 토큰이 만료/무효 → 비로그인 분기
      return <BottomNav />;
    }
    if (res.ok) {
      const data = await res.json();
      initialSlots = sanitize(data?.slots);
    }
  } catch {
    /* fall back to defaults */
  }

  return <BottomNav initialSlots={initialSlots} />;
}
