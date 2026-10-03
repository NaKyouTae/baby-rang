import RoomItemsClient, { type RoomItem } from "./RoomItemsClient";
import { adminFetch } from "@/lib/api";

export default async function RoomItemsPage() {
  let items: RoomItem[] = [];
  try {
    const data = await adminFetch<{ items: RoomItem[] }>("/admin/room-items");
    items = data.items;
  } catch {}
  return <RoomItemsClient initial={items} />;
}
