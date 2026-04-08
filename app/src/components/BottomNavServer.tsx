import { cookies } from "next/headers";
import BottomNav from "./BottomNav";
import { MENU_CATALOG, type MenuId } from "./menuCatalog";

const SLOT_COUNT = 3;
const DEFAULT_SLOTS: (MenuId | null)[] = ["growth-record", "growth-pattern", "wonder-weeks"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";

function sanitize(arr: unknown): (MenuId | null)[] {
  if (!Array.isArray(arr) || arr.length !== SLOT_COUNT) return [...DEFAULT_SLOTS];
  return arr.map((v) => (typeof v === "string" && v in MENU_CATALOG ? (v as MenuId) : null));
}

export default async function BottomNavServer() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  let initialSlots: (MenuId | null)[] = [...DEFAULT_SLOTS];
  if (token) {
    try {
      const res = await fetch(`${API_URL}/nav-slots`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        initialSlots = sanitize(data?.slots);
      }
    } catch {
      /* fall back to defaults */
    }
  }

  return <BottomNav initialSlots={initialSlots} />;
}
