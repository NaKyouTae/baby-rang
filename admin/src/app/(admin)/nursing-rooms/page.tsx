import NursingRoomsClient, { NursingRoom } from "./NursingRoomsClient";
import { adminFetch } from "@/lib/api";

export default async function NursingRoomsPage() {
  let items: NursingRoom[] = [];
  try {
    const data = await adminFetch<{ items: NursingRoom[] }>("/admin/nursing-rooms");
    items = data.items;
  } catch {}
  return <NursingRoomsClient initial={items} />;
}
