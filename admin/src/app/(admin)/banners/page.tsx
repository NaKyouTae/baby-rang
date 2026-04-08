import BannersClient from "./BannersClient";
import { adminFetch } from "@/lib/api";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  bgColor: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export default async function BannersPage() {
  let items: Banner[] = [];
  try {
    const data = await adminFetch<{ items: Banner[] }>("/admin/banners");
    items = data.items;
  } catch {}
  return <BannersClient initial={items} />;
}
