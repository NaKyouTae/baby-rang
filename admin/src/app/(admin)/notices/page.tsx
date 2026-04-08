import NoticesClient from "./NoticesClient";
import { adminFetch } from "@/lib/api";

type Notice = {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export default async function NoticesPage() {
  let items: Notice[] = [];
  try {
    const data = await adminFetch<{ items: Notice[] }>("/admin/notices");
    items = data.items;
  } catch {}
  return <NoticesClient initial={items} />;
}
